const mongoose = require('mongoose');

const taxInvoiceItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  uom: { type: String, default: 'PCS' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 }, // e.g. 5 for 5%
  taxAmount: { type: Number, default: 0, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
});

const taxInvoiceSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  invoiceNumber: { type: String, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  dnId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryNote' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerSnapshot: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    billingAddress: { type: String },
    taxRegistrationNumber: { type: String } // Crucial for Tax Invoice
  },
  salespersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issueDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  currency: { type: String, default: 'USD' },
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PAID_PARTIAL', 'PAID_FULL', 'OVERDUE', 'CANCELLED'],
    default: 'DRAFT'
  },
  items: [taxInvoiceItemSchema],
  
  subtotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  shippingCharges: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 }, // grandTotal - amountPaid
  
  notes: { type: String },
  termsAndConditions: { type: String },
  internalNotes: { type: String },
  
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

taxInvoiceSchema.pre('save', function() {
  this.balanceDue = this.grandTotal - this.amountPaid;
});

taxInvoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model('TaxInvoice', taxInvoiceSchema);
