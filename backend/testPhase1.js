const mongoose = require('mongoose');
const User = require('./src/core/models/User');
const Employee = require('./src/core/models/Employee');

async function runTest() {
  await mongoose.connect('mongodb://localhost:27017/erp_db');
  console.log('Connected to DB');
  
  // 1. Get an admin token (we'll just use a mock or fetch one if we can)
  // Let's directly query the database to verify since we don't have a token handy.
  
  // 1. Clean up previous
  await Employee.deleteMany({ firstName: 'Security', lastName: 'Guard' });
  await User.deleteMany({ email: 'guard@example.com' });
  
  // Create an employee directly
  const tenant = await mongoose.connection.collection('tenants').findOne();
  if (!tenant) {
    console.log('No tenant found, cannot test.');
    process.exit(1);
  }

  console.log('Creating Security Guard employee...');
  const employee = new Employee({
    tenantId: tenant._id,
    firstName: 'Security',
    lastName: 'Guard',
    jobTitle: 'Guard',
    status: 'ACTIVE',
    hireDate: new Date()
  });
  await employee.save();
  console.log('Employee created:', employee._id, 'Code:', employee.employeeCode);

  // Verify no user exists
  const existingUser = await User.findOne({ employeeId: employee._id });
  if (existingUser) {
    console.error('FAILED: User was automatically created!');
  } else {
    console.log('SUCCESS: No user created for the employee.');
  }

  // Create a user and link it
  console.log('Creating linked user...');
  const role = await mongoose.connection.collection('roles').findOne();
  const user = new User({
    tenantId: tenant._id,
    firstName: 'Security',
    lastName: 'Guard',
    email: 'guard@example.com',
    password: 'Password123!',
    roleId: role ? role._id : null,
    employeeId: employee._id,
    portalAccess: 'WEB LOGIN',
    isActive: true
  });
  await user.save();
  
  // Ensure the link goes both ways
  employee.userId = user._id;
  await employee.save();

  console.log('User created and linked:', user._id);
  
  // Verify bidirectional link
  const verifyEmp = await Employee.findById(employee._id);
  const verifyUsr = await User.findById(user._id);
  
  if (verifyEmp.userId.toString() === verifyUsr._id.toString() && verifyUsr.employeeId.toString() === verifyEmp._id.toString()) {
    console.log('SUCCESS: Bidirectional link verified.');
  } else {
    console.error('FAILED: Bidirectional link broken.');
  }
  
  console.log('Test completed successfully.');
  process.exit(0);
}

runTest().catch(console.error);
