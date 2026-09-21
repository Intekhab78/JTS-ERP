const mongoose = require('mongoose');

const payrollRuleSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country'
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
  ruleType: {
    type: String,
    enum: ['TAX', 'SOCIAL_SECURITY', 'INSURANCE', 'PENSION', 'OVERTIME', 'ABSENCE', 'ALLOWANCE', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'OTHER'],
    required: true
  },
  calculationType: {
    type: String,
    enum: ['FIXED', 'PERCENTAGE', 'FORMULA', 'MANUAL'],
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  fixedAmount: {
    type: Number,
    default: 0
  },
  formula: {
    type: String,
    trim: true
  },
  employeeShare: {
    type: Number, // Percentage of the total amount borne by employee
    default: 100
  },
  employerShare: {
    type: Number, // Percentage of the total amount borne by employer
    default: 0
  },
  taxable: {
    type: Boolean,
    default: false
  },
  effectiveFrom: {
    type: Date,
    required: true
  },
  effectiveTo: {
    type: Date
  },
  priority: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  configuration: {
    type: mongoose.Schema.Types.Mixed // JSON for arbitrary rule params
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Prevent duplicate rule codes per tenant/country
payrollRuleSchema.index({ tenantId: 1, countryId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('PayrollRule', payrollRuleSchema);
