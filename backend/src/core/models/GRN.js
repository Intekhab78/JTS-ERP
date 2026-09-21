const mongoose = require('mongoose');

const grnItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  purchaseOrderScheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrderSchedule' },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  uom: { type: String, default: 'PCS' },
  conversionFactor: { type: Number, default: 1 },
  baseUom: { type: String },
  baseQuantity: { type: Number },
  orderedQuantity: { type: Number, required: true, min: 1 },
  receivedQuantity: { type: Number, required: true, min: 0 },
  acceptedQuantity: { type: Number, required: true, min: 0 },
  rejectedQuantity: { type: Number, default: 0, min: 0 },
  purchaseUnitPrice: { type: Number, default: 0, min: 0 },
  purchaseAmount: { type: Number, default: 0, min: 0 },
  allocatedAdditionalCost: { type: Number, default: 0, min: 0 },
  totalLandedCost: { type: Number, default: 0, min: 0 },
  landedUnitCost: { type: Number, default: 0, min: 0 },
  ownerType: {
    type: String,
    enum: ['COMPANY', 'SUPPLIER'],
    default: 'COMPANY'
  },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  remarks: { type: String }
});

const grnAdditionalCostSchema = new mongoose.Schema({
  costType: { 
    type: String, 
    enum: ['Transportation', 'Logistics', 'Labor', 'Packing', 'Handling', 'Insurance', 'Customs Duty', 'Other'],
    required: true
  },
  description: { type: String },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }
});

const grnSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  grnNumber: { type: String, required: true },
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierSnapshot: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String }
  },
  receiptDate: { type: Date, required: true, default: Date.now },
  deliveryChallanNumber: { type: String },
  vehicleNumber: { type: String },
  status: {
    type: String,
    enum: ['DRAFT', 'CONFIRMED', 'VALIDATED', 'CANCELLED'],
    default: 'DRAFT'
  },
  items: [grnItemSchema],
  
  additionalCosts: [grnAdditionalCostSchema],
  allocationMethod: { 
    type: String, 
    enum: ['By Quantity', 'By Purchase Value', 'By Weight', 'Equal Distribution', 'Manual'],
    default: 'By Purchase Value'
  },
  totalPurchaseCost: { type: Number, default: 0 },
  totalAdditionalCost: { type: Number, default: 0 },
  totalLandedCost: { type: Number, default: 0 },

  notes: { type: String },
  internalNotes: { type: String },
  
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  validatedAt: { type: Date }
}, { timestamps: true });

// Ensure rejected = received - accepted
grnSchema.pre('save', function() {
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      item.rejectedQuantity = item.receivedQuantity - item.acceptedQuantity;
    });
  }
});

grnSchema.index({ tenantId: 1, grnNumber: 1 }, { unique: true });

module.exports = mongoose.model('GRN', grnSchema);
