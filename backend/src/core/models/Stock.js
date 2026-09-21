const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
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
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  ownerType: {
    type: String,
    enum: ['COMPANY', 'SUPPLIER'],
    default: 'COMPANY'
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  }
}, {
  timestamps: true
});

// A product can only have one stock entry per branch per owner
stockSchema.index({ tenantId: 1, branchId: 1, productId: 1, ownerType: 1, ownerId: 1 }, { unique: true });

module.exports = mongoose.model('Stock', stockSchema);
