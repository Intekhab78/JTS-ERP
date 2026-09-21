const mongoose = require('mongoose');

const proFormaItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  uom: { type: String, default: 'PCS' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
});

const proFormaInvoiceSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  pfNumber: { type: String, required: true },
  sourceType: { type: String, enum: ['QUOTE', 'ORDER', 'MANUAL'], default: 'MANUAL' },
  sourceId: { type: mongoose.Schema.Types.ObjectId },
  salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerSnapshot: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    billingAddress: { type: String },
    shippingAddress: { type: String }
  },
  salespersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issueDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  currency: { type: String, default: 'USD' },
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'CONVERTED'],
    default: 'DRAFT'
  },
  items: [proFormaItemSchema],
  
  // Totals
  subtotal: { type: Number, default: 0 },
  discountTotal: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  shippingCharges: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  amountInWords: { type: String },
  
  billingType: { type: String, enum: ['ADVANCE', 'PROGRESSIVE', 'BALANCE'], default: 'ADVANCE' },
  // Payment Request feature (e.g. asking for 50% advance)
  paymentRequestPercentage: { type: Number, default: 100 },
  paymentRequestAmount: { type: Number, required: true }, // computed as grandTotal * (percentage/100)
  
  paymentTerms: { type: String },
  deliveryTerms: { type: String },
  notes: { type: String },
  termsAndConditions: { type: String },
  internalNotes: { type: String },
  
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

proFormaInvoiceSchema.index({ tenantId: 1, pfNumber: 1 }, { unique: true });
// (Removed unique index on sourceType and sourceId to allow multiple PFs per quote)

module.exports = mongoose.model('ProFormaInvoice', proFormaInvoiceSchema);
