const mongoose = require('mongoose');

const manufacturingOrderSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  bomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BOM',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  quantityToProduce: {
    type: Number,
    required: true,
    min: 1
  },
  producedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  rawMaterials: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    itemName: { type: String },
    uom: { type: String },
    conversionFactor: { type: Number, default: 1 },
    baseUom: { type: String },
    baseQuantity: { type: Number },
    requiredQuantity: {
      type: Number,
      required: true,
      min: 0
    },
    consumedQuantity: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'READY', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
    default: 'DRAFT'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  }
}, {
  timestamps: true
});

manufacturingOrderSchema.index({ tenantId: 1, orderNumber: 1 }, { unique: true });

module.exports = mongoose.model('ManufacturingOrder', manufacturingOrderSchema);
