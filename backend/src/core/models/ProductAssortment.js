const mongoose = require('mongoose');

const productAssortmentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  legalCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LegalCompany',
    // Temporarily optional for backward compatibility during migration
    required: false
  },
  name: {
    type: String,
    required: [true, 'Please add an assortment name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  businessVerticalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessVertical'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

productAssortmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ProductAssortment', productAssortmentSchema);
