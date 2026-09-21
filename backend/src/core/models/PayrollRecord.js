const mongoose = require('mongoose');

const componentSnapshotSchema = new mongoose.Schema({
  componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryComponent' },
  nameSnapshot: String,
  codeSnapshot: String,
  typeSnapshot: String,
  amount: Number,
  isTaxable: Boolean
}, { _id: false });

const payrollRecordSchema = new mongoose.Schema({
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
  currency: {
    type: String,
    required: true
  },
  payFrequency: {
    type: String,
    required: true
  },
  
  // Attendance snapshot
  workingDays: { type: Number, default: 0 },
  calendarDays: { type: Number, default: 0 },
  presentDays: { type: Number, default: 0 },
  absentDays: { type: Number, default: 0 },
  paidLeaveDays: { type: Number, default: 0 },
  unpaidLeaveDays: { type: Number, default: 0 },
  halfDays: { type: Number, default: 0 },
  overtimeMinutes: { type: Number, default: 0 },
  overtimeAmount: { type: Number, default: 0 },
  lateMinutes: { type: Number, default: 0 },
  earlyExitMinutes: { type: Number, default: 0 },

  // Salary snapshot
  basicSalary: { type: Number, default: 0 },
  earnings: [componentSnapshotSchema],
  deductions: [componentSnapshotSchema],
  employerContributions: [componentSnapshotSchema],
  
  // Totals
  totalEarnings: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  totalEmployerContributions: { type: Number, default: 0 },
  grossSalary: { type: Number, default: 0 },
  netSalary: { type: Number, default: 0 },
  payableAmount: { type: Number, default: 0 },

  // Additional
  adjustments: [
    {
      name: String,
      amount: Number,
      type: { type: String, enum: ['ADDITION', 'DEDUCTION'] },
      reason: String
    }
  ],
  reimbursements: { type: Number, default: 0 },
  unpaidAbsenceAmount: { type: Number, default: 0 },
  roundingAdjustment: { type: Number, default: 0 },
  calculationNotes: String,

  // Status and Audit
  status: {
    type: String,
    enum: ['DRAFT', 'CALCULATED', 'REVIEWED', 'APPROVED', 'PAID', 'CANCELLED'],
    default: 'DRAFT'
  },
  calculationVersion: { type: Number, default: 1 },
  calculatedAt: Date,
  calculatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paidAt: Date,
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remarks: String
}, { timestamps: true });

payrollRecordSchema.index({ tenantId: 1, payrollPeriodId: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('PayrollRecord', payrollRecordSchema);
