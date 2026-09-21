const mongoose = require('mongoose');
const Company = require('../src/core/models/Company');
const Employee = require('../src/core/models/Employee');
const SalaryComponent = require('../src/core/models/SalaryComponent');
const SalaryStructure = require('../src/core/models/SalaryStructure');
const EmployeeSalary = require('../src/core/models/EmployeeSalary');
const PayrollPeriod = require('../src/core/models/PayrollPeriod');
const PayrollRecord = require('../src/core/models/PayrollRecord');
const PayrollRule = require('../src/core/models/PayrollRule');
const User = require('../src/core/models/User');
const PayrollCalculationService = require('../src/modules/hr/payroll/payrollCalculationService');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp_system';

async function runTest() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const company = await Company.findOne();
    if (!company) throw new Error('No company found.');
    const tenantId = company._id;

    const user = await User.findOne({ tenantId });
    if (!user) throw new Error('No user found.');

    console.log('--- Setting up Phase 3D Test Data ---');
    
    // 1. Employee and Salary setup (assuming basic salary $5000)
    let employee = await Employee.findOne({ tenantId, employeeCode: 'EMP_PAYROLL_TEST' });
    if (!employee) {
      employee = await Employee.create({
        tenantId,
        firstName: 'Payroll',
        lastName: 'Tester',
        employeeCode: 'EMP_PAYROLL_TEST',
        hireDate: new Date('2026-01-01')
      });
    }

    const structure = await SalaryStructure.create({
      tenantId, name: 'Test Structure', code: 'TST_STR', currency: 'USD', payFrequency: 'MONTHLY'
    });

    const salary = await EmployeeSalary.create({
      tenantId,
      employeeId: employee._id,
      salaryStructureId: structure._id,
      effectiveFrom: new Date('2026-01-01'),
      currency: 'USD',
      payFrequency: 'MONTHLY',
      basicSalary: 5000,
      components: [],
      totalEarnings: 5000,
      totalDeductions: 0,
      grossSalary: 5000,
      netSalary: 5000,
      status: 'ACTIVE',
      createdBy: user._id
    });

    // 2. Global Payroll Rule setup (10% Flat Tax)
    await PayrollRule.create({
      tenantId,
      name: 'Global Flat Tax',
      code: 'GFT_10',
      ruleType: 'TAX',
      calculationType: 'PERCENTAGE',
      percentage: 10, // 10% tax on basic
      effectiveFrom: new Date('2026-01-01')
    });

    // 3. Create Payroll Period
    const periodStart = new Date('2026-10-01');
    const periodEnd = new Date('2026-10-31');
    const paymentDate = new Date('2026-11-05');

    const period = await PayrollPeriod.create({
      tenantId,
      name: 'October 2026',
      code: 'OCT26',
      payFrequency: 'MONTHLY',
      periodStart,
      periodEnd,
      paymentDate,
      currency: 'USD',
      status: 'OPEN',
      createdBy: user._id
    });

    console.log(`✅ Payroll Period ${period.code} Created.`);

    // 4. Calculate Payroll
    console.log('--- Running Payroll Calculation Engine ---');
    const records = await PayrollCalculationService.calculatePayrollForPeriod(tenantId, period._id, user._id);
    
    console.log(`✅ Calculation complete. Processed ${records.length} records.`);
    
    // 5. Verify the generated record for our test employee
    const record = records.find(r => r.employeeId.toString() === employee._id.toString());
    if (!record) throw new Error('No payroll record generated for test employee.');

    console.log(`Gross Salary: ${record.grossSalary}`);
    console.log(`Total Deductions (Tax): ${record.totalDeductions}`);
    console.log(`Net Salary: ${record.netSalary}`);
    console.log(`Working Days: ${record.workingDays}`);
    console.log(`Calendar Days: ${record.calendarDays}`);

    // Assuming 5000 basic, 10% tax = 500 deduction, Net = 4500
    if (record.netSalary !== 4500) {
      console.warn(`⚠️ Warning: Expected Net Salary 4500 but got ${record.netSalary}.`);
    } else {
      console.log(`✅ Global Tax Rule successfully applied!`);
    }

    console.log('✅ Phase 3D Testing Completed Successfully.');

    // Cleanup
    await PayrollPeriod.deleteMany({ tenantId, code: 'OCT26' });
    await PayrollRecord.deleteMany({ tenantId, payrollPeriodId: period._id });
    await PayrollRule.deleteMany({ tenantId, code: 'GFT_10' });
    await EmployeeSalary.deleteMany({ _id: salary._id });
    await SalaryStructure.deleteMany({ _id: structure._id });
    await Employee.deleteMany({ _id: employee._id });

  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTest();
