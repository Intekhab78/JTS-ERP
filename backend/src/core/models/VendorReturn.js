const mongoose = require('mongoose');

const vendorReturnItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  purchaseOrderItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrderItem' },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }, // Optional for old returns, required for new multi-branch logic
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  uom: { type: String, default: 'PCS' },
  conversionFactor: { type: Number, default: 1 },
  baseUom: { type: String },
  baseQuantity: { type: Number },
  originalQuantity: { type: Number, min: 0 },
  returnQuantity: { type: Number, required: true, min: 0.01 },
  unitCost: { type: Number, min: 0 },
  returnAmount: { type: Number, min: 0 },
  sourceGRNIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GRN' }],
  reason: { type: String }
});

const vendorReturnSchema = new mongoose.Schema({
  // returnType to differentiate modes
  returnType: {
    type: String,
    enum: ['SINGLE_GRN', 'MULTIPLE_GRN', 'SUPPLIER_CONSOLIDATED'],
    default: 'SINGLE_GRN'
  },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  // Header branchId and grnId are optional to support new multi-GRN/multi-branch returns
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  grnId: { type: mongoose.Schema.Types.ObjectId, ref: 'GRN' },
  vendorReturnNumber: { type: String, required: true, unique: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  returnDate: { type: Date, required: true, default: Date.now },
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'VALIDATED', 'CANCELLED'],
    default: 'DRAFT'
  },
  totalReturnAmount: { type: Number, default: 0 },
  items: [vendorReturnItemSchema],
  notes: { type: String },
  
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedAt: { type: Date }
}, { timestamps: true });

vendorReturnSchema.index({ tenantId: 1, vendorReturnNumber: 1 }, { unique: true });

module.exports = mongoose.model('VendorReturn', vendorReturnSchema);
