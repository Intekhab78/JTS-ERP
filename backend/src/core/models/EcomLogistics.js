const mongoose = require('mongoose');

const ecomLogisticsSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  carrierName: {
    type: String,
    required: [true, 'Please add carrier name'],
    trim: true
  },
  carrierCode: {
    type: String,
    required: [true, 'Please add carrier code'],
    uppercase: true,
    trim: true
  },
  trackingUrlTemplate: {
    type: String,
    required: [true, 'Please add tracking URL template'],
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true
  },
  websiteUrl: {
    type: String,
    trim: true
  },
  notes: {
    type: String
  },
  isDefault: {
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

ecomLogisticsSchema.index({ tenantId: 1, carrierCode: 1 }, { unique: true });

module.exports = mongoose.model('EcomLogistics', ecomLogisticsSchema);
