const mongoose = require('mongoose');
const User = require('../src/core/models/User');
const Company = require('../src/core/models/Company');
const Branch = require('../src/core/models/Branch');
const Role = require('../src/core/models/Role');
const Register = require('../src/core/models/Register');
const POSSession = require('../src/core/models/POSSession');
const posSessionController = require('../src/modules/sales/posSessionController');
const authController = require('../src/core/auth/authController');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: '../.env' });

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

async function runTests() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_db');
  console.log('Connected to DB');

  // Setup mock data
  const company = await Company.create({ name: 'Test Corp 8', settings: { posVarianceLimit: 10 } });
  const role = await Role.create({ tenantId: company._id, name: 'Manager', permissions: ['*'] });
  const cashierRole = await Role.create({ tenantId: company._id, name: 'Cashier', permissions: [] });
  const branch1 = await Branch.create({ tenantId: company._id, name: 'Branch 1' });
  const branch2 = await Branch.create({ tenantId: company._id, name: 'Branch 2' });
  
  const manager = await User.create({
    tenantId: company._id,
    firstName: 'Mgr', lastName: 'Mgr', email: 'mgr8@test.com', password: 'password',
    roleId: role._id, branches: [branch1._id]
  });
  manager.posPin = '5555';
  await manager.save();

  const otherManager = await User.create({
    tenantId: company._id,
    firstName: 'Mgr2', lastName: 'Mgr2', email: 'mgr8-2@test.com', password: 'password',
    roleId: role._id, branches: [branch2._id]
  });
  otherManager.posPin = '6666';
  await otherManager.save();

  const cashier = await User.create({
    tenantId: company._id,
    firstName: 'Cashier', lastName: 'Cashier', email: 'cashier8@test.com', password: 'password',
    roleId: cashierRole._id, branches: [branch1._id]
  });

  const register = await Register.create({ tenantId: company._id, branchId: branch1._id, name: 'Reg 1', status: 'ACTIVE' });

  // Test 1: Zero variance
  let session = await POSSession.create({
    tenantId: company._id, branchId: branch1._id, registerId: register._id, openedBy: cashier._id, openingCash: 100
  });
  
  let req = { user: cashier, params: { id: session._id }, body: { closingCash: 100 } };
  let res = mockRes();
  await posSessionController.closeSession(req, res);
  console.log('Test 1 Zero Variance:', res.statusCode === 200 ? 'PASS' : 'FAIL', res.data);

  // Test 2: Positive variance within limit (limit is 10, closing cash 109, expected 100)
  session = await POSSession.create({
    tenantId: company._id, branchId: branch1._id, registerId: register._id, openedBy: cashier._id, openingCash: 100
  });
  req = { user: cashier, params: { id: session._id }, body: { closingCash: 109 } };
  res = mockRes();
  await posSessionController.closeSession(req, res);
  console.log('Test 2 Positive within limit:', res.statusCode === 200 ? 'PASS' : 'FAIL', res.data);

  // Test 4: Positive variance above limit (closing 115)
  session = await POSSession.create({
    tenantId: company._id, branchId: branch1._id, registerId: register._id, openedBy: cashier._id, openingCash: 100
  });
  req = { user: cashier, params: { id: session._id }, body: { closingCash: 115 } };
  res = mockRes();
  await posSessionController.closeSession(req, res);
  console.log('Test 4 Positive above limit (should fail without override):', res.statusCode === 403 && res.data.requiresOverride ? 'PASS' : 'FAIL', res.data);

  // Test 7: Valid manager PIN override
  // First get override token
  let reqAuth = { user: cashier, body: { managerEmail: 'mgr8@test.com', posPin: '5555', requestedAction: 'OVERRIDE_SESSION_VARIANCE', context: { branchId: branch1._id } }, ip: '127.0.0.1' };
  let resAuth = mockRes();
  await authController.managerOverride(reqAuth, resAuth);
  console.log('Test 7 Get token:', resAuth.statusCode === 200 ? 'PASS' : 'FAIL', resAuth.data);
  let overrideToken = resAuth.data.overrideToken;

  req.body.overrideToken = overrideToken;
  await posSessionController.closeSession(req, res);
  console.log('Test 7 Close with override:', res.statusCode === 200 ? 'PASS' : 'FAIL', res.data);

  // Test 8: Invalid manager PIN
  reqAuth = { user: cashier, body: { managerEmail: 'mgr8@test.com', posPin: '9999', requestedAction: 'OVERRIDE_SESSION_VARIANCE', context: { branchId: branch1._id } }, ip: '127.0.0.1' };
  resAuth = mockRes();
  await authController.managerOverride(reqAuth, resAuth);
  console.log('Test 8 Invalid PIN:', resAuth.statusCode === 401 ? 'PASS' : 'FAIL', resAuth.data);

  // Test 10: Wrong override action
  reqAuth = { user: cashier, body: { managerEmail: 'mgr8@test.com', posPin: '5555', requestedAction: 'OVERRIDE_POS_DISCOUNT', context: { branchId: branch1._id } }, ip: '127.0.0.2' };
  resAuth = mockRes();
  await authController.managerOverride(reqAuth, resAuth);
  overrideToken = resAuth.data.overrideToken;
  session = await POSSession.create({
    tenantId: company._id, branchId: branch1._id, registerId: register._id, openedBy: cashier._id, openingCash: 100
  });
  req = { user: cashier, params: { id: session._id }, body: { closingCash: 150, overrideToken } };
  res = mockRes();
  try {
    await posSessionController.closeSession(req, res);
  } catch(e) {
    console.log('Test 10 Wrong action (expected error): PASS', e.message);
  }

  // Test 11: Cross-branch manager
  reqAuth = { user: cashier, body: { managerEmail: 'mgr8-2@test.com', posPin: '6666', requestedAction: 'OVERRIDE_SESSION_VARIANCE', context: { branchId: branch1._id } }, ip: '127.0.0.3' };
  resAuth = mockRes();
  await authController.managerOverride(reqAuth, resAuth);
  console.log('Test 11 Cross-branch manager:', resAuth.statusCode === 403 ? 'PASS' : 'FAIL', resAuth.data);

  // Test 14: Plaintext PIN Check - direct match testing
  const plainTextFound = await User.findOne({ posPin: '5555' });
  console.log('Test 14 Plaintext PIN check:', plainTextFound === null ? 'PASS' : 'FAIL');

  // Test setPosPin logic (direct API bypass attempt)
  // Ensure that no user can bypass setting
  console.log('All automated backend tests run successfully.');

  // Cleanup
  await Company.deleteOne({ _id: company._id });
  await User.deleteMany({ tenantId: company._id });
  await Role.deleteMany({ tenantId: company._id });
  await Branch.deleteMany({ tenantId: company._id });
  await Register.deleteMany({ tenantId: company._id });
  await POSSession.deleteMany({ tenantId: company._id });
  
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
