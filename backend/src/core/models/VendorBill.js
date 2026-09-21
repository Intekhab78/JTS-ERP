const mongoose = require('mongoose');

const vendorBillItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  description: { type: String },
  quantity: { type: Number, required: true, min: 0.01 },
  uom: { type: String, default: 'PCS' },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  subTotal: { type: Number, required: true, min: 0 }
});

const vendorBillSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  grnIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'GRN' }],
  billNumber: { type: String, required: true },
  billDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  currency: { type: String, default: 'USD' },
  paymentTerms: { type: String },
  
  items: [vendorBillItemSchema],
  
  subtotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  
  notes: { type: String },
  journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' }, // Accounting placeholder
  
  status: {
    type: String,
    enum: ['DRAFT', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
    default: 'DRAFT'
  },
  
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

vendorBillSchema.pre('save', function() {
  this.balanceDue = this.grandTotal - this.amountPaid;
});

// Enforce unique bill number per tenant
vendorBillSchema.index({ tenantId: 1, billNumber: 1 }, { unique: true });

module.exports = mongoose.model('VendorBill', vendorBillSchema);
