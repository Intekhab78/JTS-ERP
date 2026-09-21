const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Employee = require('../src/core/models/Employee');
const EmployeeDocument = require('../src/core/models/EmployeeDocument');
const EmployeeIdentification = require('../src/core/models/EmployeeIdentification');
const Country = require('../src/core/models/Country');
const Department = require('../src/core/models/Department');
const Branch = require('../src/core/models/Branch');

require('dotenv').config();

async function runTest() {
  console.log('Connecting to MongoDB...');
  
  let uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found in .env');
  
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (error) {
    if (uri.includes(':27017/')) {
      const tunnelUri = uri.replace(':27017/', ':27018/');
      console.log('⚠️ Failed on port 27017, trying local SSH tunnel port 27018...');
      await mongoose.connect(tunnelUri, { serverSelectionTimeoutMS: 5000 });
    } else {
      throw error;
    }
  }
  
  console.log('Connected.');

  try {
    const tenant = await mongoose.connection.collection('tenants').findOne();
    if (!tenant) throw new Error('No tenant found. Please run seed script first.');
    const tenantId = tenant._id;

    console.log('1. Cleaning up previous test data...');
    await Employee.deleteMany({ firstName: 'GlobalTest' });
    await EmployeeDocument.deleteMany({ documentName: 'TestPassportDoc' });
    await EmployeeIdentification.deleteMany({ identificationType: 'TEST_SSN' });

    console.log('2. Creating country config...');
    let usa = await Country.findOne({ countryCode: 'US' });
    if (!usa) {
      usa = await Country.create({
        countryCode: 'US',
        countryName: 'United States',
        currency: 'USD',
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        phoneCode: '+1'
      });
    }

    console.log('3. Fetching basic org structure...');
    const department = await Department.findOne({ tenantId });
    const branch = await Branch.findOne({ tenantId });

    console.log('4. Creating Global Employee...');
    const employee = await Employee.create({
      tenantId,
      employeeCode: 'G-EMP-9999',
      firstName: 'GlobalTest',
      lastName: 'User',
      legalFirstName: 'GlobalTest',
      legalLastName: 'User',
      countryOfBirth: 'US',
      preferredLanguage: 'English',
      timezone: 'America/New_York',
      departmentId: department._id,
      branchId: branch._id,
      jobTitle: 'Global Engineer',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      baseSalary: 100000
    });
    console.log('Employee created:', employee._id);

    console.log('5. Creating Employee Identification (SSN)...');
    // Using schema model directly for tests
    const ident = await EmployeeIdentification.create({
      tenantId,
      employeeId: employee._id,
      identificationType: 'TEST_SSN',
      identificationNumber: '123-45-6789', // Full sensitive number
      maskedIdentificationNumber: '***-**-6789', // Masked version
      issuingCountry: 'US',
      status: 'ACTIVE'
    });
    console.log('Identification created. Masked:', ident.maskedIdentificationNumber);
    if (ident.identificationNumber !== '123-45-6789') throw new Error('Failed to save real identification number.');

    console.log('6. Creating Employee Document (Passport)...');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 10); // Expiring in 10 days
    
    // Test logic from controller
    const determineStatus = (expiryDate) => {
      const now = new Date();
      if (expiryDate < now) return 'EXPIRED';
      const warningDate = new Date(now);
      warningDate.setDate(warningDate.getDate() + 30);
      if (expiryDate <= warningDate) return 'EXPIRING_SOON';
      return 'ACTIVE';
    };

    const status = determineStatus(expiry);

    const doc = await EmployeeDocument.create({
      tenantId,
      employeeId: employee._id,
      documentType: 'PASSPORT',
      documentName: 'TestPassportDoc',
      documentNumber: 'P123456',
      issuingCountry: 'US',
      expiryDate: expiry,
      fileUrl: '/test/path/doc.pdf',
      fileName: 'doc.pdf',
      status
    });
    console.log('Document created. Computed Status:', doc.status);
    if (doc.status !== 'EXPIRING_SOON') {
      throw new Error('Expiry logic failed. Expected EXPIRING_SOON, got ' + doc.status);
    }

    console.log('All tests passed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

runTest();
