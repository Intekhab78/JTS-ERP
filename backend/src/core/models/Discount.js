const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  description: { type: String },
  discountType: { type: String, enum: ['PERCENTAGE', 'FIXED', 'BUY_X_GET_Y', 'BULK_PURCHASE', 'TIERED_DISCOUNT'], required: true },
  value: { type: Number, default: 0, min: 0 }, // made default 0 for buyXgetY where value might not be the primary field
  
  // Scope definitions
  scope: { 
    type: String, 
    enum: ['ORDER', 'LINE_ITEM'], 
    default: 'ORDER' 
  },
  
  // Applicability Mode Strategy
  applicabilityMode: {
    type: String,
    enum: ['ALL_DISCOUNTABLE_PRODUCTS', 'SELECTED_PRODUCTS', 'SELECTED_CATEGORIES'],
    default: 'ALL_DISCOUNTABLE_PRODUCTS'
  },

  // NEW TARGETING (Replaces scope/applicabilityMode conceptually, but kept alongside for backwards compat)
  applyTo: {
    type: String,
    enum: ['ORDER', 'DEPARTMENT', 'CATEGORY', 'FAMILY', 'SUBFAMILY', 'SUBCATEGORY', 'PRODUCT', 'MULTIPLE_PRODUCTS']
    // No default so we can detect legacy usage vs new usage
  },

  priority: { type: Number, default: 0 },
  
  // Rule Definitions
  applicableDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  applicableCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  applicableFamilies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Family' }],
  applicableSubFamilies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubFamily' }],
  applicableSubcategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subcategory' }], // Legacy
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  excludedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  
  minOrderAmount: { type: Number, default: 0 },
  maxDiscountAmount: { type: Number }, // Max absolute value for percentage discounts
  
  // Advanced Constraints
  isAutomatic: { type: Boolean, default: false },
  branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
  customers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }],
  customerGroups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CustomerGroup' }],
  usageLimit: { type: Number, default: 0 }, // 0 = unlimited
  usageCount: { type: Number, default: 0 },
  stackable: { type: Boolean, default: false },
  startTime: { type: String }, // e.g. "09:00"
  endTime: { type: String },   // e.g. "17:00"

  // Buy X Get Y details
  buyXGetYMode: { type: String, enum: ['SAME_PRODUCT', 'ELIGIBLE_PRODUCTS'] },
  buyXGetYEligibleProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  buyXQuantity: { type: Number },
  getYQuantity: { type: Number },
  getYDiscountType: { type: String, enum: ['FREE', 'PERCENTAGE'] },
  getYDiscountValue: { type: Number }, // 100 for FREE, or specific percentage

  // Tiered / Bulk details
  tiers: [{
    minQuantity: Number,
    discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'] },
    value: Number
  }],
  
  startDate: { type: Date },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  approvalRequired: { type: Boolean, default: false },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Strict unique index
discountSchema.index({ tenantId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Discount', discountSchema);
