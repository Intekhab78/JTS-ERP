const mongoose = require('mongoose');

const assignedComponentSchema = new mongoose.Schema({
  componentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryComponent',
    required: true
  },
  nameSnapshot: {
    type: String,
    required: true
  },
  typeSnapshot: {
    type: String,
    enum: ['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'REIMBURSEMENT'],
    required: true
  },
  calculationType: {
    type: String,
    enum: ['FIXED', 'PERCENTAGE', 'FORMULA', 'MANUAL'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  percentageOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryComponent'
  },
  formula: {
    type: String,
    trim: true
  }
}, { _id: false });

const employeeSalarySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  salaryStructureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryStructure',
    required: true
  },
  effectiveFrom: {
    type: Date,
    required: true
  },
  effectiveTo: {
    type: Date
  },
  currency: {
    type: String,
    required: true,
    trim: true
  },
  payFrequency: {
    type: String,
    enum: ['MONTHLY', 'BIWEEKLY', 'WEEKLY', 'SEMI_MONTHLY', 'DAILY', 'HOURLY', 'ANNUAL', 'CUSTOM'],
    required: true
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0
  },
  components: [assignedComponentSchema],
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalDeductions: {
    type: Number,
    default: 0
  },
  employerContributions: {
    type: Number,
    default: 0
  },
  grossSalary: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'HISTORICAL', 'INACTIVE'],
    default: 'ACTIVE'
  },
  reasonForRevision: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmployeeSalary', employeeSalarySchema);
