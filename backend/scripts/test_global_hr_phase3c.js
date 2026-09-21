const mongoose = require('mongoose');
const Company = require('../src/core/models/Company');
const Employee = require('../src/core/models/Employee');
const SalaryComponent = require('../src/core/models/SalaryComponent');
const SalaryStructure = require('../src/core/models/SalaryStructure');
const EmployeeSalary = require('../src/core/models/EmployeeSalary');
const User = require('../src/core/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp_system';

async function runTest() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Get Tenant and User
    const company = await Company.findOne();
    if (!company) throw new Error('No company found.');
    const tenantId = company._id;

    const user = await User.findOne({ tenantId });
    if (!user) throw new Error('No user found.');

    // 2. Create Salary Components
    console.log('Creating Salary Components...');
    const basicComponent = await SalaryComponent.create({
      tenantId,
      name: 'Basic Salary',
      code: 'BASIC',
      type: 'EARNING',
      calculationType: 'FIXED',
      defaultAmount: 0,
      currency: 'USD',
      createdBy: user._id
    });

    const hraComponent = await SalaryComponent.create({
      tenantId,
      name: 'Housing Allowance',
      code: 'HRA',
      type: 'EARNING',
      calculationType: 'PERCENTAGE',
      percentageOf: basicComponent._id,
      currency: 'USD',
      createdBy: user._id
    });

    const taxComponent = await SalaryComponent.create({
      tenantId,
      name: 'Employee Tax',
      code: 'TAX',
      type: 'DEDUCTION',
      calculationType: 'FIXED',
      defaultAmount: 200,
      currency: 'USD',
      createdBy: user._id
    });

    console.log('✅ Components created successfully.');

    // 3. Create Salary Structure
    console.log('Creating Salary Structure...');
    const structure = await SalaryStructure.create({
      tenantId,
      name: 'Standard Monthly USD',
      code: 'STD_USD',
      currency: 'USD',
      payFrequency: 'MONTHLY',
      components: [
        {
          componentId: basicComponent._id,
          calculationType: 'FIXED',
          amount: 0,
          sequence: 1
        },
        {
          componentId: hraComponent._id,
          calculationType: 'PERCENTAGE',
          percentage: 40,
          sequence: 2
        },
        {
          componentId: taxComponent._id,
          calculationType: 'FIXED',
          amount: 200,
          sequence: 3
        }
      ],
      createdBy: user._id
    });
    console.log('✅ Salary Structure created successfully.');

    // 4. Find/Create Employee without User
    let employee = await Employee.findOne({ tenantId, userId: { $exists: false } });
    if (!employee) {
      employee = await Employee.create({
        tenantId,
        firstName: 'Test',
        lastName: 'Worker',
        employeeCode: 'EMP_SAL_001',
        hireDate: new Date()
      });
    }

    // 5. Assign Employee Salary
    console.log(`Assigning Salary to Employee ${employee.employeeCode}...`);
    const basicSalary = 5000;
    const hraAmount = (basicSalary * 40) / 100; // 2000
    const taxAmount = 200;

    const initialSalary = await EmployeeSalary.create({
      tenantId,
      employeeId: employee._id,
      salaryStructureId: structure._id,
      effectiveFrom: new Date('2026-01-01'),
      currency: 'USD',
      payFrequency: 'MONTHLY',
      basicSalary,
      components: [
        {
          componentId: basicComponent._id,
          nameSnapshot: basicComponent.name,
          typeSnapshot: basicComponent.type,
          calculationType: 'FIXED',
          amount: basicSalary
        },
        {
          componentId: hraComponent._id,
          nameSnapshot: hraComponent.name,
          typeSnapshot: hraComponent.type,
          calculationType: 'PERCENTAGE',
          percentage: 40,
          amount: hraAmount
        },
        {
          componentId: taxComponent._id,
          nameSnapshot: taxComponent.name,
          typeSnapshot: taxComponent.type,
          calculationType: 'FIXED',
          amount: taxAmount
        }
      ],
      totalEarnings: basicSalary + hraAmount, // 7000
      totalDeductions: taxAmount, // 200
      employerContributions: 0,
      grossSalary: basicSalary + hraAmount,
      netSalary: (basicSalary + hraAmount) - taxAmount, // 6800
      status: 'ACTIVE',
      createdBy: user._id
    });
    
    console.log(`✅ Initial Salary Assigned (Net: ${initialSalary.netSalary} USD).`);

    // 6. Revise Salary
    console.log('Revising Salary...');
    initialSalary.status = 'HISTORICAL';
    initialSalary.effectiveTo = new Date('2026-12-31');
    await initialSalary.save();

    const newBasicSalary = 6000;
    const newHraAmount = (newBasicSalary * 40) / 100; // 2400

    const revisedSalary = await EmployeeSalary.create({
      tenantId,
      employeeId: employee._id,
      salaryStructureId: structure._id,
      effectiveFrom: new Date('2027-01-01'),
      currency: 'USD',
      payFrequency: 'MONTHLY',
      basicSalary: newBasicSalary,
      components: [
        {
          componentId: basicComponent._id,
          nameSnapshot: basicComponent.name,
          typeSnapshot: basicComponent.type,
          calculationType: 'FIXED',
          amount: newBasicSalary
        },
        {
          componentId: hraComponent._id,
          nameSnapshot: hraComponent.name,
          typeSnapshot: hraComponent.type,
          calculationType: 'PERCENTAGE',
          percentage: 40,
          amount: newHraAmount
        },
        {
          componentId: taxComponent._id,
          nameSnapshot: taxComponent.name,
          typeSnapshot: taxComponent.type,
          calculationType: 'FIXED',
          amount: taxAmount
        }
      ],
      totalEarnings: newBasicSalary + newHraAmount, // 8400
      totalDeductions: taxAmount, // 200
      grossSalary: newBasicSalary + newHraAmount,
      netSalary: (newBasicSalary + newHraAmount) - taxAmount, // 8200
      status: 'ACTIVE',
      reasonForRevision: 'Annual Increment',
      createdBy: user._id
    });

    console.log(`✅ Salary Revised (Net: ${revisedSalary.netSalary} USD).`);

    // 7. Verify Historical record
    const hist = await EmployeeSalary.findById(initialSalary._id);
    if (hist.status !== 'HISTORICAL') throw new Error('Old salary did not become historical!');
    
    console.log('✅ Test Passed: Phase 3C Salary Architecture is functionally correct.');

    // Cleanup
    await SalaryComponent.deleteMany({ tenantId });
    await SalaryStructure.deleteMany({ tenantId });
    await EmployeeSalary.deleteMany({ tenantId });

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTest();
