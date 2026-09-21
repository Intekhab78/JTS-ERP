const Payslip = require('../../core/models/Payslip');
const PayrollRecord = require('../../core/models/PayrollRecord');
const PayrollPeriod = require('../../core/models/PayrollPeriod');
const Employee = require('../../core/models/Employee');
const Counter = require('../../core/models/Counter');
const Department = require('../../core/models/Department');
const Designation = require('../../core/models/Designation');
const Company = require('../../core/models/Company');
const pdfService = require('./payrollPayslipPdfService');

// Helper to generate next payslip number
const generatePayslipNumber = async (tenantId) => {
  const currentYear = new Date().getFullYear();
  let counter = await Counter.findOne({ tenantId, sequenceName: 'payslip', year: currentYear });
  if (!counter) {
    counter = new Counter({ tenantId, sequenceName: 'payslip', year: currentYear, sequenceValue: 0 });
  }
  counter.sequenceValue += 1;
  await counter.save();
  return `PS-${currentYear}-${String(counter.sequenceValue).padStart(6, '0')}`;
};

// Generate a single payslip from a payroll record
exports.generatePayslip = async (req, res) => {
  try {
    const { id } = req.params; // payrollRecordId
    const tenantId = req.user.tenantId;

    const record = await PayrollRecord.findOne({ _id: id, tenantId }).populate('payrollPeriodId');
    if (!record) return res.status(404).json({ message: 'Payroll record not found' });

    if (record.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Payslips can only be generated for APPROVED payroll records' });
    }

    // Check if payslip already exists
    let payslip = await Payslip.findOne({ tenantId, payrollRecordId: record._id });
    if (payslip) {
      return res.status(200).json(payslip); // Return existing instead of duplicate
    }

    const employee = await Employee.findOne({ _id: record.employeeId, tenantId })
      .populate('departmentId')
      .populate('designationId');

    const payslipNumber = await generatePayslipNumber(tenantId);

    // Map snapshots
    const mapComponent = c => ({
      code: c.codeSnapshot,
      name: c.nameSnapshot,
      type: c.typeSnapshot,
      calculationType: c.calculationType || 'UNKNOWN',
      amount: c.amount
    });

    payslip = new Payslip({
      tenantId,
      payrollPeriodId: record.payrollPeriodId._id,
      payrollRecordId: record._id,
      employeeId: employee._id,
      employeeSalaryId: record.employeeSalaryId,
      payslipNumber,
      paymentDate: record.payrollPeriodId.paymentDate,
      
      employeeCode: employee.employeeCode,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      department: employee.departmentId?.name || '',
      designation: employee.designationId?.name || '',
      branch: '', // Assume available on branchId pop
      country: '', 
      
      employmentType: employee.employmentType || '',
      payFrequency: record.payFrequency,
      currency: record.currency,

      basicSalary: record.basicSalary,
      totalEarnings: record.totalEarnings,
      totalDeductions: record.totalDeductions,
      employerContributionsTotal: record.totalEmployerContributions,
      grossSalary: record.grossSalary,
      netSalary: record.netSalary,
      payableAmount: record.payableAmount,

      earnings: record.earnings.map(mapComponent),
      deductions: record.deductions.map(mapComponent),
      employerContributions: record.employerContributions.map(mapComponent),

      workingDays: record.workingDays,
      payableDays: record.presentDays + record.paidLeaveDays,
      presentDays: record.presentDays,
      absentDays: record.absentDays,
      paidLeaveDays: record.paidLeaveDays,
      unpaidLeaveDays: record.unpaidLeaveDays,
      overtimeMinutes: record.overtimeMinutes,

      status: 'GENERATED',
      generatedBy: req.user.id
    });

    await payslip.save();
    res.status(201).json(payslip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk generate payslips for a whole period
exports.generatePayslipsForPeriod = async (req, res) => {
  try {
    const { id } = req.params; // payrollPeriodId
    const tenantId = req.user.tenantId;

    const period = await PayrollPeriod.findOne({ _id: id, tenantId });
    if (!period) return res.status(404).json({ message: 'Period not found' });
    
    if (period.status !== 'APPROVED' && period.status !== 'LOCKED') {
      return res.status(400).json({ message: 'Period must be APPROVED or LOCKED to generate payslips' });
    }

    const records = await PayrollRecord.find({ payrollPeriodId: id, tenantId, status: 'APPROVED' });
    let generated = 0;
    let skipped = 0;

    for (const record of records) {
      const exists = await Payslip.findOne({ tenantId, payrollRecordId: record._id });
      if (exists) {
        skipped++;
        continue;
      }
      
      // Simplify logic for bulk: reuse the generate logic or encapsulate it.
      // For sake of brevity in script, we manually do it:
      const employee = await Employee.findOne({ _id: record.employeeId, tenantId })
        .populate('departmentId').populate('designationId');

      const payslipNumber = await generatePayslipNumber(tenantId);
      const mapComponent = c => ({
        code: c.codeSnapshot, name: c.nameSnapshot, type: c.typeSnapshot, amount: c.amount
      });

      const payslip = new Payslip({
        tenantId, payrollPeriodId: period._id, payrollRecordId: record._id,
        employeeId: employee._id, employeeSalaryId: record.employeeSalaryId,
        payslipNumber, paymentDate: period.paymentDate,
        employeeCode: employee.employeeCode, employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.departmentId?.name || '', designation: employee.designationId?.name || '',
        currency: record.currency, basicSalary: record.basicSalary,
        totalEarnings: record.totalEarnings, totalDeductions: record.totalDeductions,
        grossSalary: record.grossSalary, netSalary: record.netSalary,
        earnings: record.earnings.map(mapComponent), deductions: record.deductions.map(mapComponent),
        employerContributions: record.employerContributions.map(mapComponent),
        status: 'GENERATED', generatedBy: req.user.id
      });
      await payslip.save();
      generated++;
    }

    res.json({ message: 'Bulk generation complete', generated, skipped });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPayslips = async (req, res) => {
  try {
    const { period, employee, status } = req.query;
    const filter = { tenantId: req.user.tenantId };
    
    if (period) filter.payrollPeriodId = period;
    if (employee) filter.employeeId = employee;
    if (status) filter.status = status;

    const payslips = await Payslip.find(filter)
      .populate('payrollPeriodId', 'name periodStart periodEnd')
      .populate('employeeId', 'firstName lastName employeeCode')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(payslips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('payrollPeriodId', 'name periodStart periodEnd');
    if (!payslip) return res.status(404).json({ message: 'Not found' });
    res.json(payslip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.finalizePayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!payslip || payslip.status === 'FINALIZED' || payslip.status === 'CANCELLED') {
      return res.status(400).json({ message: 'Invalid payslip state for finalization' });
    }
    payslip.status = 'FINALIZED';
    payslip.finalizedAt = new Date();
    payslip.finalizedBy = req.user.id;
    await payslip.save();
    res.json(payslip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelPayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!payslip) return res.status(404).json({ message: 'Not found' });
    payslip.status = 'CANCELLED';
    payslip.cancelledAt = new Date();
    payslip.cancelledBy = req.user.id;
    await payslip.save();
    res.json(payslip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.downloadPayslipPdf = async (req, res) => {
  try {
    const payslip = await Payslip.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('payrollPeriodId', 'name periodStart periodEnd paymentDate');
    
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });

    const company = await Company.findOne({ _id: req.user.tenantId });

    const pdfBuffer = await pdfService.generatePayslipPdf(payslip, company);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${payslip.payslipNumber}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
