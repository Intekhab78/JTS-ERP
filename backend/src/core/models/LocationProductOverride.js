const mongoose = require('mongoose');

const locationProductOverrideSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['INCLUDE', 'EXCLUDE'],
    required: true
  }
}, {
  timestamps: true
});

// Enforce one override per tenant + branch + product. This intrinsically prevents having both INCLUDE and EXCLUDE for the same product at the same branch.
locationProductOverrideSchema.index({ tenantId: 1, branchId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('LocationProductOverride', locationProductOverrideSchema);
