const mongoose = require('mongoose');

const productAssortmentItemSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  assortmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductAssortment',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  }
}, {
  timestamps: true
});

// A product can only be in a specific assortment once per tenant
productAssortmentItemSchema.index({ tenantId: 1, assortmentId: 1, productId: 1 }, { unique: true });
// For efficient reverse lookups when finding which assortments a product belongs to
productAssortmentItemSchema.index({ tenantId: 1, productId: 1, assortmentId: 1 });

module.exports = mongoose.model('ProductAssortmentItem', productAssortmentItemSchema);
