const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
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
    required: true
  },
  documentQuantity: {
    type: Number
  },
  documentUom: {
    type: String
  },
  baseQuantity: {
    type: Number
  },
  baseUom: {
    type: String
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
  },
  type: {
    type: String,
    enum: ['GRN', 'DELIVERY', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'OPENING_BALANCE', 'MANUFACTURING_CONSUMPTION', 'MANUFACTURING_PRODUCTION', 'SALES_RETURN', 'VENDOR_RETURN', 'PURCHASE_RETURN', 'CONSIGNMENT_RECEIPT', 'CONSIGNMENT_CONSUMPTION', 'CONSIGNMENT_RETURN'],
    required: true
  },
  referenceId: {
    type: String, // e.g., GRN-2026-000001
    required: true
  },
  referenceType: {
    type: String, // e.g., 'GRN', 'DeliveryNote', 'StockAdjustment'
    required: true
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

stockMovementSchema.index({ tenantId: 1, branchId: 1, productId: 1 });
stockMovementSchema.index({ tenantId: 1, type: 1 });
stockMovementSchema.index({ tenantId: 1, referenceId: 1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
