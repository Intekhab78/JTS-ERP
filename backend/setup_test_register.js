require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Branch = require('./src/core/models/Branch');
const User = require('./src/core/models/User');
const Role = require('./src/core/models/Role');
const Register = require('./src/core/models/Register');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ecom_erp';
  const tunnelUri = uri.replace(':27017/', ':27018/');
  await mongoose.connect(tunnelUri);

  try {
    const branch = await Branch.findOne({ name: /Sharjah/i });
    if (!branch) {
      console.log('Error: Sharjah branch not found');
      process.exit(1);
    }
    console.log(`1. Found Sharjah Branch ID: ${branch._id}`);

    const existingRegister = await Register.findOne({ branchId: branch._id, status: 'ACTIVE' });
    if (existingRegister) {
      console.log('2. Active register already exists for Sharjah:', existingRegister.name);
    } else {
      console.log('2. No ACTIVE register exists for Sharjah.');
    }

    const reg01Exists = await Register.findOne({ branchId: branch._id, code: 'REG-01' });
    if (reg01Exists) {
      console.log('3. REG-01 already exists for Sharjah. Do not create duplicate.');
      process.exit(0);
    }

    // Find an admin user to generate token
    const adminUser = await User.findOne({ tenantId: branch.tenantId }).populate('roleId');
    if (!adminUser) {
       console.log('Could not find admin user for this tenant.');
       process.exit(1);
    }

    const token = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    console.log('\nCreating Register via existing API...');
    const createRes = await fetch('http://localhost:5000/api/v1/pos/registers', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        branchId: branch._id,
        name: 'Main Register',
        code: 'REG-01',
        description: 'Main POS Register - Sharjah',
        status: 'ACTIVE'
      })
    });

    const newRegister = await createRes.json();
    if (!createRes.ok) throw new Error(newRegister.message || 'Error creating register');
    console.log('Successfully created register via API.');

    console.log('\nVerifying via GET API...');
    const getRes = await fetch(`http://localhost:5000/api/v1/pos/registers?branchId=${branch._id}&status=ACTIVE`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const activeRegisters = await getRes.json();
    const found = activeRegisters.find(r => r._id.toString() === newRegister._id.toString());
    
    console.log('\n--- REPORT ---');
    console.log('Register ID:', newRegister._id);
    console.log('Branch ID:', newRegister.branchId);
    console.log('Register Name:', newRegister.name);
    console.log('Register Code:', newRegister.code);
    console.log('Status:', newRegister.status);
    console.log('API POST Response:', JSON.stringify(newRegister, null, 2));
    console.log(`GET verification found ${activeRegisters.length} active register(s). Newly created register appears: ${!!found}`);
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    mongoose.disconnect();
  }
}

run();
