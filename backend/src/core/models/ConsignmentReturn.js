const mongoose = require('mongoose');

const consignmentReturnItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  returnQuantity: { type: Number, required: true, min: 0.01 },
  uom: { type: String, required: true },
  baseQuantity: { type: Number, required: true },
  baseUom: { type: String, required: true },
  conversionFactor: { type: Number, default: 1 },
  unitCost: { type: Number },
  reason: { type: String },
  notes: { type: String }
});

const consignmentReturnSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  returnNumber: { type: String, required: true, unique: true },
  consignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consignment', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  returnDate: { type: Date, required: true, default: Date.now },
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'VALIDATED', 'CANCELLED'],
    default: 'DRAFT'
  },
  reference: { type: String },
  notes: { type: String },
  items: [consignmentReturnItemSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: { type: Date },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedAt: { type: Date },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

consignmentReturnSchema.index({ tenantId: 1, returnNumber: 1 }, { unique: true });
consignmentReturnSchema.index({ tenantId: 1, consignmentId: 1 });
consignmentReturnSchema.index({ tenantId: 1, supplierId: 1 });
consignmentReturnSchema.index({ tenantId: 1, branchId: 1 });

module.exports = mongoose.model('ConsignmentReturn', consignmentReturnSchema);
