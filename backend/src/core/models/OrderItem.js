const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductVariant',
    default: null
  },
  variantSku: {
    type: String,
    trim: true
  },
  selectedAttributes: {
    type: Map,
    of: String
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  deliveredQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  invoicedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true
  },
  subTotal: {
    type: Number,
    required: true
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

orderItemSchema.virtual('remainingQuantity').get(function() {
  return Math.max(0, this.quantity - this.deliveredQuantity);
});

orderItemSchema.virtual('remainingInvoiceQuantity').get(function() {
  return Math.max(0, this.quantity - this.invoicedQuantity);
});

module.exports = mongoose.model('OrderItem', orderItemSchema);
