const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
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
  source: {
    type: String,
    enum: ['POS', 'WEB', 'ERP'],
    default: 'POS'
  },
  shippingAddress: {
    type: String
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  quoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerName: {
    type: String,
    default: 'Walk-in Customer'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'DRAFT', 'CONFIRMED'],
    default: 'PENDING'
  },
  deliveryStatus: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'DELIVERED'],
    default: 'PENDING'
  },
  invoiceStatus: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'INVOICED'],
    default: 'PENDING'
  },
  trackingNumber: {
    type: String
  },
  carrier: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'BANK_TRANSFER'],
    default: 'CASH'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
