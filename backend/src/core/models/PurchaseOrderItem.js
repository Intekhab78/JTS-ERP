const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  purchaseOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  description: {
    type: String
  },
  uom: {
    type: String,
    default: 'PCS'
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  scheduledQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0
  },
  subTotal: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PurchaseOrderItem', purchaseOrderItemSchema);
