const mongoose = require('mongoose');

const consignmentItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  agreedQuantity: { type: Number, required: true, min: 0 },
  receivedQuantity: { type: Number, default: 0 },
  consumedQuantity: { type: Number, default: 0 },
  returnedQuantity: { type: Number, default: 0 },
  settledQuantity: { type: Number, default: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  settlementPrice: { type: Number, min: 0 },
  notes: { type: String }
});

const consignmentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  consignmentNumber: { type: String, required: true, unique: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  defaultBranchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'ACTIVE', 'CLOSED', 'CANCELLED'],
    default: 'DRAFT'
  },
  notes: { type: String },
  items: [consignmentItemSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: { type: Date },
  activatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

consignmentSchema.index({ tenantId: 1, consignmentNumber: 1 }, { unique: true });
consignmentSchema.index({ tenantId: 1, supplierId: 1 });

module.exports = mongoose.model('Consignment', consignmentSchema);
