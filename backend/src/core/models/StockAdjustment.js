const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema({
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
  referenceNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['DRAFT', 'VALIDATED', 'CANCELLED'],
    default: 'DRAFT'
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    expectedQuantity: {
      type: Number,
      required: true
    },
    actualQuantity: {
      type: Number,
      required: true,
      min: [0, 'Actual quantity cannot be negative']
    },
    difference: {
      type: Number,
      required: true
    }
  }],
  reason: {
    type: String,
    required: true
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  validatedAt: {
    type: Date
  }
}, {
  timestamps: true
});

stockAdjustmentSchema.index({ tenantId: 1, branchId: 1 });
stockAdjustmentSchema.index({ tenantId: 1, status: 1 });
stockAdjustmentSchema.index({ tenantId: 1, referenceNumber: 1 });

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
