const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  sequenceName: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  sequenceValue: {
    type: Number,
    default: 0
  }
});

// Ensure only one counter per tenant, sequence type, and year
counterSchema.index({ tenantId: 1, sequenceName: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Counter', counterSchema);
