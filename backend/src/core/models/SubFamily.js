const mongoose = require('mongoose');

const subFamilySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a sub-family name'],
    trim: true
  },
  code: {
    type: String,
    trim: true,
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure name is unique per tenant and family
subFamilySchema.index({ tenantId: 1, familyId: 1, name: 1 }, { unique: true });

// Ensure code is unique per tenant and family, but allow empty/null codes
subFamilySchema.index(
  { tenantId: 1, familyId: 1, code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: 'string', $ne: '' } } }
);

module.exports = mongoose.model('SubFamily', subFamilySchema);
