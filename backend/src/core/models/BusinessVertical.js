const mongoose = require('mongoose');

const businessVerticalSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a vertical name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

businessVerticalSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('BusinessVertical', businessVerticalSchema);
