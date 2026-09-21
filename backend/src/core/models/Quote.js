const mongoose = require('mongoose');

const quoteItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  uom: { type: String, default: 'PCS' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
});

const quoteSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  quoteNumber: {
    type: String,
    required: true
  },
  revisionNumber: {
    type: Number,
    default: 1
  },
  isCurrentRevision: {
    type: Boolean,
    default: true
  },
  rootQuoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote'
  },
  revisedFromQuoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote'
  },
  revisedAt: {
    type: Date
  },
  revisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerSnapshot: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    billingAddress: { type: String },
    shippingAddress: { type: String }
  },
  salespersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  quoteDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'CONVERTED'],
    default: 'DRAFT'
  },
  convertedToOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  convertedAt: {
    type: Date
  },
  items: [quoteItemSchema],
  subtotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  shippingCharges: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  paymentTerms: { type: String },
  deliveryTerms: { type: String },
  notes: { type: String },
  termsAndConditions: { type: String },
  internalNotes: { type: String },
  isActive: {
    type: Boolean,
    default: true
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

// Ensure quote number + revision number is unique per tenant
quoteSchema.index({ tenantId: 1, quoteNumber: 1, revisionNumber: 1 }, { unique: true });

module.exports = mongoose.model('Quote', quoteSchema);
