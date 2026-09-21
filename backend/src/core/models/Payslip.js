const mongoose = require('mongoose');

const componentSnapshotSchema = new mongoose.Schema({
  code: String,
  name: String,
  type: String, // EARNING, DEDUCTION, EMPLOYER_CONTRIBUTION, TAX, etc.
  calculationType: String,
  amount: Number
}, { _id: false });

const payslipSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  payrollPeriodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayrollPeriod',
    required: true,
    index: true
  },
  payrollRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayrollRecord',
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  employeeSalaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeSalary'
  },
  
  // Identification
  payslipNumber: {
    type: String,
    required: true,
    index: true
  },
  payslipDate: {
    type: Date,
    default: Date.now
  },
  paymentDate: {
    type: Date
  },

  // Employee snapshot
  employeeCode: String,
  employeeName: String,
  designation: String,
  department: String,
  branch: String,
  location: String,
  country: String,

  // Employment snapshot
  employmentType: String,
  jobLevel: String,
  payFrequency: String,
  currency: {
    type: String,
    required: true
  },

  // Salary snapshot totals
  basicSalary: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  employerContributionsTotal: { type: Number, default: 0 },
  grossSalary: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  payableAmount: { type: Number, default: 0 },

  // Component snapshot arrays
  earnings: [componentSnapshotSchema],
  deductions: [componentSnapshotSchema],
  employerContributions: [componentSnapshotSchema],

  // Attendance snapshot
  workingDays: { type: Number, default: 0 },
  payableDays: { type: Number, default: 0 },
  presentDays: { type: Number, default: 0 },
  absentDays: { type: Number, default: 0 },
  paidLeaveDays: { type: Number, default: 0 },
  unpaidLeaveDays: { type: Number, default: 0 },
  halfDays: { type: Number, default: 0 },
  overtimeMinutes: { type: Number, default: 0 },
  overtimeAmount: { type: Number, default: 0 },
  lateMinutes: { type: Number, default: 0 },
  earlyExitMinutes: { type: Number, default: 0 },

  // Other adjustments
  adjustments: [
    {
      name: String,
      amount: Number,
      type: { type: String, enum: ['ADDITION', 'DEDUCTION'] },
      reason: String
    }
  ],
  reimbursements: { type: Number, default: 0 },
  remarks: String,

  // Status and Audit
  status: {
    type: String,
    enum: ['DRAFT', 'GENERATED', 'FINALIZED', 'CANCELLED'],
    default: 'GENERATED'
  },
  generatedAt: { type: Date, default: Date.now },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  finalizedAt: Date,
  finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: Date,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Prevent duplicate payslips for the same payroll record
payslipSchema.index({ tenantId: 1, payrollRecordId: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);
