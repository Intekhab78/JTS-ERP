const mongoose = require('mongoose');

const ecomStatusSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add status name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please add status code'],
    uppercase: true,
    trim: true
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  badgeVariant: {
    type: String,
    enum: ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'neutral'],
    default: 'info'
  },
  order: {
    type: Number,
    default: 0
  },
  // Key feature: select/de-select email to customer
  sendEmailToCustomer: {
    type: Boolean,
    default: false
  },
  emailSubject: {
    type: String,
    default: 'Order #{{orderId}} status update'
  },
  emailTemplate: {
    type: String,
    default: 'Your order status has been updated to {{statusName}}.'
  },
  isSystem: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

ecomStatusSchema.index({ tenantId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('EcomStatus', ecomStatusSchema);
