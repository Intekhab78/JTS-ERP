const mongoose = require('mongoose');

const companyItemSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'tenantId is required']
  },
  legalCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LegalCompany',
    required: [true, 'legalCompanyId is required']
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'productId is required']
  },
  companySku: {
    type: String,
    trim: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  department: {
    type: String,
    trim: true
  },
  section: {
    type: String,
    trim: true
  },
  salesPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  purchasePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  tax1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tax'
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  allowDiscount: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Unique index to prevent duplicate product configuration within the same Legal Company
companyItemSchema.index(
  { tenantId: 1, legalCompanyId: 1, productId: 1 }, 
  { unique: true }
);

// Partial unique index for companySku: only applies when companySku exists and is non-empty
companyItemSchema.index(
  { tenantId: 1, legalCompanyId: 1, companySku: 1 },
  { 
    unique: true, 
    partialFilterExpression: { 
      companySku: { $type: 'string' } 
    } 
  }
);

// Pre-save hook to handle empty string companySku for the partial unique index
companyItemSchema.pre('save', function() {
  if (this.companySku === '') {
    this.companySku = undefined;
  }
});

module.exports = mongoose.model('CompanyItem', companyItemSchema);
