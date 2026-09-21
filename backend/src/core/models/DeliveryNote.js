const mongoose = require('mongoose');

const deliveryNoteItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  itemName: { type: String, required: true },
  sku: { type: String, required: true },
  uom: { type: String, default: 'PCS' },
  conversionFactor: { type: Number, default: 1 },
  baseUom: { type: String },
  baseQuantity: { type: Number },
  orderedQuantity: { type: Number, required: true, min: 1 },
  previouslyDeliveredQuantity: { type: Number, required: true, min: 0, default: 0 },
  deliveryQuantity: { type: Number, required: true, min: 0 },
  remainingQuantity: { type: Number, required: true, min: 0 },
  batchNumber: { type: String },
  serialNumbers: [{ type: String }]
});

const deliveryNoteSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }, // Optional for now
  deliveryNoteNumber: { type: String, required: true },
  salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  
  customerSnapshot: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    billingAddress: { type: String },
    shippingAddress: { type: String }
  },

  deliveryDate: { type: Date, required: true, default: Date.now },
  dispatchDate: { type: Date },
  expectedDeliveryDate: { type: Date },

  status: {
    type: String,
    enum: ['DRAFT', 'READY', 'DISPATCHED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED'],
    default: 'DRAFT'
  },
  
  items: [deliveryNoteItemSchema],
  
  // Transport
  transporterName: { type: String },
  vehicleNumber: { type: String },
  driverName: { type: String },
  driverPhone: { type: String },
  trackingNumber: { type: String },
  lrNumber: { type: String },

  deliveryAddress: { type: String },
  deliveryInstructions: { type: String },

  // Receiver/POD
  receivedBy: { type: String },
  receiverDesignation: { type: String },
  receivedAt: { type: Date },
  receiverPhone: { type: String },
  signatureUrl: { type: String },

  notes: { type: String },
  internalNotes: { type: String },
  
  stockDeducted: { type: Boolean, default: false },
  stockDeductedAt: { type: Date },
  stockMovementId: { type: String },
  
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Indexes
deliveryNoteSchema.index({ tenantId: 1, deliveryNoteNumber: 1 }, { unique: true });
deliveryNoteSchema.index({ tenantId: 1, branchId: 1 });
deliveryNoteSchema.index({ tenantId: 1, salesOrderId: 1 });
deliveryNoteSchema.index({ tenantId: 1, customerId: 1 });
deliveryNoteSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('DeliveryNote', deliveryNoteSchema);
