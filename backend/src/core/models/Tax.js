const mongoose = require('mongoose');

const taxSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a tax name'],
    trim: true
  },
  rate: {
    type: Number,
    required: [true, 'Please add a tax rate'],
    min: 0
  },
  type: {
    type: String,
    enum: ['Percentage', 'Fixed'],
    default: 'Percentage'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Tax', taxSchema);
