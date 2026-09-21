const mongoose = require('mongoose');

const salesReturnItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  uom: { type: String, default: 'PCS' },
  conversionFactor: { type: Number, default: 1 },
  baseUom: { type: String },
  baseQuantity: { type: Number },
  deliveredQuantity: { type: Number, required: true, min: 0 },
  previouslyReturnedQuantity: { type: Number, required: true, min: 0, default: 0 },
  returnQuantity: { type: Number, required: true, min: 0 },
  returnReason: { type: String }
});

const salesReturnSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  returnNumber: { type: String, required: true },
  deliveryNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryNote', required: true },
  salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'VALIDATED', 'CANCELLED'],
    default: 'DRAFT'
  },
  
  items: [salesReturnItemSchema],
  
  returnDate: { type: Date, required: true, default: Date.now },
  notes: { type: String },
  
  stockAdded: { type: Boolean, default: false },
  stockAddedAt: { type: Date },
  stockMovementId: { type: String },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes
salesReturnSchema.index({ tenantId: 1, returnNumber: 1 }, { unique: true });
salesReturnSchema.index({ tenantId: 1, branchId: 1 });
salesReturnSchema.index({ tenantId: 1, deliveryNoteId: 1 });
salesReturnSchema.index({ tenantId: 1, customerId: 1 });
salesReturnSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('SalesReturn', salesReturnSchema);
