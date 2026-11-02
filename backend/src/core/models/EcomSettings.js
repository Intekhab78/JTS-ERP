const mongoose = require('mongoose');

const includedLocationSchema = new mongoose.Schema({
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  branchName: {
    type: String,
    required: true
  },
  safetyStockType: {
    type: String,
    enum: ['FIXED', 'PERCENTAGE'],
    default: 'FIXED'
  },
  safetyStockValue: {
    type: Number,
    default: 0,
    min: 0
  },
  pickPriority: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const ecomSettingsSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true
  },
  storeName: {
    type: String,
    default: 'JTS Online Store'
  },
  storeEmail: {
    type: String,
    default: 'orders@jtsstore.com'
  },
  supportPhone: {
    type: String,
    default: '+1 (800) 555-0199'
  },
  currency: {
    type: String,
    default: 'INR'
  },
  currencySymbol: {
    type: String,
    default: '₹'
  },
  // Company & Branch Mapping for website
  mappedGroupCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  mappedCompanies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LegalCompany'
  }],
  mappedBranches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }],

  // Hierarchy Mapping: which departments, sections/categories, families & sub-families are enabled on the website
  mappedDepartments: [{
    type: String,
    trim: true
  }],
  mappedCategories: [{
    type: String,
    trim: true
  }],
  mappedFamilies: [{
    type: String,
    trim: true
  }],
  mappedSubFamilies: [{
    type: String,
    trim: true
  }],

  // Multi-location stock allocation logic
  includedLocations: [includedLocationSchema],
  defaultSafetyStockType: {
    type: String,
    enum: ['FIXED', 'PERCENTAGE'],
    default: 'FIXED'
  },
  defaultSafetyStockValue: {
    type: Number,
    default: 0
  },
  // Customer policies
  requireEmailOtp: {
    type: Boolean,
    default: true
  },
  // Rider Proof of Delivery (POD: Photo & Customer Signature) visibility
  requireDeliveryPod: {
    type: Boolean,
    default: true
  },
  enableRiderPhotoPod: {
    type: Boolean,
    default: true
  },
  enableRiderSignaturePod: {
    type: Boolean,
    default: true
  },
  // Rider Pay-on-Delivery (COD) Digital Options (Dynamic UPI QR & Card M-POS)
  enableRiderCodUpi: {
    type: Boolean,
    default: true
  },
  enableRiderCodCard: {
    type: Boolean,
    default: true
  },
  allowOrderCancellation: {
    type: Boolean,
    default: true
  },
  cancellationAllowedStatuses: {
    type: [String],
    default: ['ORDER_PLACED', 'PENDING', 'CONFIRMED']
  },
  allowReturns: {
    type: Boolean,
    default: true
  },
  returnWindowDays: {
    type: Number,
    default: 7
  },
  shippingCharge: {
    type: Number,
    default: 0
  },
  freeShippingThreshold: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EcomSettings', ecomSettingsSchema);
