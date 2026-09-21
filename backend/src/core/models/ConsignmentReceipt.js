const mongoose = require('mongoose');

const consignmentReceiptItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  orderedQuantity: { type: Number, required: true },
  receivedQuantity: { type: Number, required: true, min: 0 },
  acceptedQuantity: { type: Number, required: true, min: 0 },
  rejectedQuantity: { type: Number, default: 0 },
  uom: { type: String, required: true },
  baseQuantity: { type: Number, required: true },
  baseUom: { type: String, required: true },
  conversionFactor: { type: Number, default: 1 },
  unitCost: { type: Number },
  notes: { type: String }
});

const consignmentReceiptSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  receiptNumber: { type: String, required: true, unique: true },
  consignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consignment', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  receiptDate: { type: Date, required: true, default: Date.now },
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'VALIDATED', 'CANCELLED'],
    default: 'DRAFT'
  },
  reference: { type: String },
  notes: { type: String },
  items: [consignmentReceiptItemSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: { type: Date },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedAt: { type: Date },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

consignmentReceiptSchema.index({ tenantId: 1, receiptNumber: 1 }, { unique: true });
consignmentReceiptSchema.index({ tenantId: 1, consignmentId: 1 });
consignmentReceiptSchema.index({ tenantId: 1, supplierId: 1 });
consignmentReceiptSchema.index({ tenantId: 1, branchId: 1 });

module.exports = mongoose.model('ConsignmentReceipt', consignmentReceiptSchema);
