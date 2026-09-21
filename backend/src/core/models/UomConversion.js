const mongoose = require('mongoose');

const uomConversionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  fromUom: {
    type: String,
    required: [true, 'Please add the From UOM']
  },
  toUom: {
    type: String,
    required: [true, 'Please add the To UOM']
  },
  conversionFactor: {
    type: Number,
    required: [true, 'Please add a conversion factor'],
    min: [0.0000000001, 'Conversion factor must be greater than 0']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure unique From -> To UOM conversion per tenant
uomConversionSchema.index({ tenantId: 1, fromUom: 1, toUom: 1 }, { unique: true });

// Custom validation
uomConversionSchema.pre('validate', function() {
  if (this.fromUom && this.toUom && this.fromUom === this.toUom && this.conversionFactor !== 1) {
    this.invalidate('conversionFactor', 'Conversion factor must be 1 if From UOM and To UOM are the same');
  }
});

module.exports = mongoose.model('UomConversion', uomConversionSchema);
