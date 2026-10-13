const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a group name'],
    trim: true
  },
  code: {
    type: String,
    trim: true
  },
  description: {
    type: String
  },
  reportingCurrency: {
    type: String,
    default: 'USD'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

groupSchema.index({ tenantId: 1, name: 1 });
groupSchema.index({ tenantId: 1, code: 1 });

module.exports = mongoose.model('Group', groupSchema);
