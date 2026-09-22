require('dotenv').config();
const mongoose = require('mongoose');
const Company = require('./src/core/models/Company');
const User = require('./src/core/models/User');
const Role = require('./src/core/models/Role');
const Branch = require('./src/core/models/Branch');
const Register = require('./src/core/models/Register');
const POSSession = require('./src/core/models/POSSession');

async function runTests() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const company = await Company.findOne();
    if (!company) throw new Error('Company not found');

    const branch = await Branch.findOne({ tenantId: company._id });
    if (!branch) throw new Error('Branch not found');

    const register = await Register.findOne({ tenantId: company._id, branchId: branch._id });
    if (!register) throw new Error('Register not found');
    register.status = 'ACTIVE';
    await register.save();

    let cashierA = await User.findOne({ email: 'cashier1@erp.com' });
    let cashierB = await User.findOne({ email: 'cashier2@erp.com' });

    if (!cashierA || !cashierB) {
      const users = await User.find({ tenantId: company._id }).limit(2);
      if (users.length < 2) throw new Error('Not enough users in DB to test');
      cashierA = users[0];
      cashierB = users[1];
    }

    console.log(`Using Cashier A: ${cashierA.email}, Cashier B: ${cashierB.email}`);

    const reqA = { user: cashierA, body: {} };
    const reqB = { user: cashierB, body: {} };

    await POSSession.deleteMany({ registerId: register._id });

    const posSessionController = require('./src/modules/sales/posSessionController');

    // SCENARIO 1: SINGLE_CASHIER Policy
    console.log('\n--- SCENARIO 1: SINGLE_CASHIER Policy ---');
    company.settings = company.settings || {};
    company.settings.posCashierPolicy = 'SINGLE_CASHIER';
    await company.save();

    reqA.body = { branchId: branch._id, registerId: register._id, openingCash: 100 };
    let resA = mockRes();
    await posSessionController.openSession(reqA, resA);
    console.log('Cashier A Open Session:', resA.statusCode === 201 ? 'PASS' : 'FAIL');
    let sessionA = resA.data;

    reqB.body = { branchId: branch._id, registerId: register._id, openingCash: 100 };
    let resB = mockRes();
    await posSessionController.openSession(reqB, resB);
    console.log('Cashier B Open Session (Blocked):', resB.statusCode === 400 ? 'PASS' : 'FAIL', '-', resB.data?.message);

    let reqB_active = { user: cashierB, query: { registerId: register._id } };
    try {
      await posSessionController.getPOSSessionForCashier(reqB_active, { registerId: register._id });
      console.log('Cashier B Access Session (Blocked): FAIL (Exception not thrown)');
    } catch (e) {
      console.log('Cashier B Access Session (Blocked): PASS -', e.message);
    }

    reqA.params = { id: sessionA._id };
    reqA.body = { closingCash: 100 };
    let resCloseA = mockRes();
    await posSessionController.closeSession(reqA, resCloseA);
    console.log('Cashier A Close Session:', resCloseA.statusCode === 200 ? 'PASS' : 'FAIL');

    // SCENARIO 2: MULTIPLE_CASHIERS Policy
    console.log('\n--- SCENARIO 2: MULTIPLE_CASHIERS Policy ---');
    company.settings.posCashierPolicy = 'MULTIPLE_CASHIERS';
    await company.save();

    reqA.body = { branchId: branch._id, registerId: register._id, openingCash: 150 };
    resA = mockRes();
    await posSessionController.openSession(reqA, resA);
    console.log('Cashier A Open Session:', resA.statusCode === 201 ? 'PASS' : 'FAIL');
    sessionA = resA.data;

    reqB.body = { branchId: branch._id, registerId: register._id, openingCash: 150 };
    resB = mockRes();
    await posSessionController.openSession(reqB, resB);
    console.log('Cashier B Join Session:', resB.statusCode === 200 && resB.data?.joined ? 'PASS' : 'FAIL');

    try {
      const foundSession = await posSessionController.getPOSSessionForCashier(reqB_active, { registerId: register._id });
      console.log('Cashier B Access Session (Allowed):', foundSession ? 'PASS' : 'FAIL');
    } catch (e) {
      console.log('Cashier B Access Session (Allowed): FAIL -', e.message);
    }

    reqB.params = { id: sessionA._id };
    reqB.body = { closingCash: 150 };
    let resCloseB = mockRes();
    await posSessionController.closeSession(reqB, resCloseB);
    console.log('Cashier B Close Session (Blocked):', resCloseB.statusCode === 403 ? 'PASS' : 'FAIL', '-', resCloseB.data?.message);

    reqA.params = { id: sessionA._id };
    reqA.body = { closingCash: 150 };
    resCloseA = mockRes();
    await posSessionController.closeSession(reqA, resCloseA);
    console.log('Cashier A Close Session:', resCloseA.statusCode === 200 ? 'PASS' : 'FAIL');

    console.log('\nTests completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

function mockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.data = data;
      return this;
    }
  };
  return res;
}

runTests();
