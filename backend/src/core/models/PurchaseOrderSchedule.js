const mongoose = require('mongoose');

const purchaseOrderScheduleSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  purchaseOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  purchaseOrderItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrderItem',
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  scheduledQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  expectedDate: {
    type: Date,
    required: true
  },
  destinationType: {
    type: String,
    enum: ['Store', 'Warehouse', 'Branch'],
    default: 'Store'
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['PENDING', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
    default: 'PENDING'
  },
  cancelReason: {
    type: String
  }
}, {
  timestamps: true
});

purchaseOrderScheduleSchema.index({ tenantId: 1, purchaseOrderId: 1 });
purchaseOrderScheduleSchema.index({ tenantId: 1, purchaseOrderItemId: 1 });

module.exports = mongoose.model('PurchaseOrderSchedule', purchaseOrderScheduleSchema);
