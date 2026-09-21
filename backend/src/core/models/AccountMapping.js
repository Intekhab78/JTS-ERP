const mongoose = require('mongoose');

const accountMappingSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  key: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Prevent duplicate mapping keys within the same tenant
accountMappingSchema.index({ tenantId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('AccountMapping', accountMappingSchema);
