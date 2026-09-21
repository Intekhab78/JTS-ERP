const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  componentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryComponent',
    required: true
  },
  calculationType: {
    type: String,
    enum: ['FIXED', 'PERCENTAGE', 'FORMULA', 'MANUAL'],
    required: true
  },
  amount: {
    type: Number,
    default: 0
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
  },
  sequence: {
    type: Number,
    default: 0
  }
}, { _id: false });

const salaryStructureSchema = new mongoose.Schema({
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
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country'
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
  components: [componentSchema],
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
salaryStructureSchema.index({ tenantId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
