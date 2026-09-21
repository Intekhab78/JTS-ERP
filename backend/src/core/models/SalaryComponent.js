const mongoose = require('mongoose');

const salaryComponentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'REIMBURSEMENT'],
    required: true
  },
  calculationType: {
    type: String,
    enum: ['FIXED', 'PERCENTAGE', 'FORMULA', 'MANUAL'],
    required: true
  },
  defaultAmount: {
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
  },
  currency: {
    type: String,
    trim: true
  },
  taxable: {
    type: Boolean,
    default: true
  },
  recurring: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  description: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure code is unique per tenant
salaryComponentSchema.index({ tenantId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('SalaryComponent', salaryComponentSchema);
