const mongoose = require('mongoose');

const vendorPaymentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  vendorBillId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorBill', required: true },
  
  paymentNumber: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'],
    default: 'BANK_TRANSFER'
  },
  paymentDate: { type: Date, required: true, default: Date.now },
  reference: { type: String },
  notes: { type: String },
  
  journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' }, // Accounting placeholder
  
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Enforce unique payment number per tenant
vendorPaymentSchema.index({ tenantId: 1, paymentNumber: 1 }, { unique: true });

module.exports = mongoose.model('VendorPayment', vendorPaymentSchema);
