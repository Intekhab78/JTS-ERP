const mongoose = require('mongoose');

const consignmentStockSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  consignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consignment', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  
  receivedQuantity: { type: Number, default: 0, min: 0 },
  consumedQuantity: { type: Number, default: 0, min: 0 },
  returnedQuantity: { type: Number, default: 0, min: 0 },
  settledQuantity: { type: Number, default: 0, min: 0 },
  availableQuantity: { type: Number, default: 0, min: 0 },
  
  // To match base quantities for easier aggregation
  uom: { type: String, required: true },
  baseQuantity: { type: Number, default: 0, min: 0 },
  baseUom: { type: String, required: true },
  
  lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound index for quick lookups and ensuring unique stock records per location/product/consignment
consignmentStockSchema.index({ tenantId: 1, supplierId: 1, consignmentId: 1, productId: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.model('ConsignmentStock', consignmentStockSchema);
