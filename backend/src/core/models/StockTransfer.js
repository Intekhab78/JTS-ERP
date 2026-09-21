const mongoose = require('mongoose');

const stockTransferSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  sourceBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  destinationBranchId: {
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
    quantity: {
      type: Number,
      required: true,
      min: [0.00001, 'Quantity must be greater than zero']
    }
  }],
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

stockTransferSchema.index({ tenantId: 1, sourceBranchId: 1 });
stockTransferSchema.index({ tenantId: 1, destinationBranchId: 1 });
stockTransferSchema.index({ tenantId: 1, status: 1 });
stockTransferSchema.index({ tenantId: 1, referenceNumber: 1 });

module.exports = mongoose.model('StockTransfer', stockTransferSchema);
