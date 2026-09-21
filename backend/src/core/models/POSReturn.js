const mongoose = require('mongoose');

const posReturnSchema = new mongoose.Schema({
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
  originalOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POSOrder',
    required: true
  },
  returnItems: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: { type: Number, required: true },
    refundAmount: { type: Number, required: true }
  }],
  refundAmount: {
    type: Number,
    required: true
  },
  refundMethod: {
    type: String,
    enum: ['CASH', 'CARD', 'ONLINE', 'UPI', 'OTHER']
  },
  refundAllocations: [{
    method: {
      type: String,
      enum: ['CASH', 'CARD', 'ONLINE', 'UPI', 'OTHER'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  idempotencyKey: {
    type: String,
    trim: true
  },
  reason: {
    type: String
  },
  status: {
    type: String,
    enum: ['COMPLETED'],
    default: 'COMPLETED'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

posReturnSchema.index(
  { tenantId: 1, idempotencyKey: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('POSReturn', posReturnSchema);
