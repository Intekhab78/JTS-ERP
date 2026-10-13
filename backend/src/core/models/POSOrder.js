const mongoose = require('mongoose');

const posOrderSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  legalCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LegalCompany'
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POSSession',
    required: true
  },
  registerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Register'
  },
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerName: {
    type: String,
    default: 'Walk-in Customer'
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    allowDiscount: { type: Boolean, default: true },
    overallDiscountAmount: { type: Number, default: 0 },
    netAmount: { type: Number },
    tax: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    // New field to snapshot applied promotion details on this line item
    appliedPromotions: [{
      promotionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount' },
      promotionName: { type: String },
      discountAmount: { type: Number }
    }]
  }],
  discountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discount'
  },
  discountCode: {
    type: String
  },
  discountName: {
    type: String
  },
  discountType: {
    type: String,
    enum: ['PERCENTAGE', 'FIXED', 'BUY_X_GET_Y', 'BULK_PURCHASE', 'TIERED_DISCOUNT']
  },
  discountValue: {
    type: Number
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  // New field to snapshot multiple applied promotions for an order
  appliedPromotions: [{
    promotionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Discount' },
    promotionCode: { type: String },
    promotionName: { type: String },
    discountType: { type: String },
    discountAmount: { type: Number },
    snapshot: { type: mongoose.Schema.Types.Mixed } // Flexible snapshot of the promo at time of order
  }],
  eligibleDiscountSubtotal: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String
  },
  status: {
    type: String,
    enum: ['PAID', 'CANCELLED', 'VOIDED'],
    default: 'PAID'
  },
  idempotencyKey: {
    type: String,
    trim: true
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaxInvoice',
    default: null
  },
  voidReason: {
    type: String
  },
  voidedAt: {
    type: Date
  },
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  voidManagerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

posOrderSchema.index({ tenantId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('POSOrder', posOrderSchema);
