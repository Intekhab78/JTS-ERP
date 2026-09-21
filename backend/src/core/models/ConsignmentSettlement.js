const mongoose = require('mongoose');

const consignmentSettlementItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  settlementQuantity: { type: Number, required: true, min: 0.01 },
  unitPrice: { type: Number, required: true, min: 0 },
  settlementAmount: { type: Number, required: true, min: 0 },
  notes: { type: String }
});

const consignmentSettlementSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  consignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consignment', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  settlementNumber: { type: String, required: true, unique: true },
  settlementDate: { type: Date, required: true, default: Date.now },
  items: [consignmentSettlementItemSchema],
  totalAmount: { type: Number, required: true, default: 0 },
  status: {
    type: String,
    enum: ['DRAFT', 'VALIDATED', 'CANCELLED'],
    default: 'DRAFT'
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID'],
    default: 'PENDING'
  },
  paidDate: { type: Date, default: null },
  paymentReference: { type: String, default: null },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedAt: { type: Date }
}, { timestamps: true });

consignmentSettlementSchema.index({ tenantId: 1, settlementNumber: 1 }, { unique: true });
consignmentSettlementSchema.index({ tenantId: 1, consignmentId: 1 });

module.exports = mongoose.model('ConsignmentSettlement', consignmentSettlementSchema);
