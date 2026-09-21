const mongoose = require('mongoose');

const uomSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a UOM name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please add a UOM code'],
    trim: true,
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure unique code per tenant
uomSchema.index({ tenantId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Uom', uomSchema);
