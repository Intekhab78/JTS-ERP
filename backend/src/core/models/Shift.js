const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  startTime: {
    type: String, // HH:mm format
    required: true
  },
  endTime: {
    type: String, // HH:mm format
    required: true
  },
  breakMinutes: {
    type: Number,
    default: 0
  },
  graceInMinutes: {
    type: Number,
    default: 0
  },
  graceOutMinutes: {
    type: Number,
    default: 0
  },
  overtimeAllowed: {
    type: Boolean,
    default: false
  },
  overtimeAfterMinutes: {
    type: Number,
    default: 0
  },
  workingHours: {
    type: Number, // Computed or specified daily working hours for this shift
    required: true
  },
  overnightShift: {
    type: Boolean,
    default: false // True if endTime is on the next calendar day
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
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

module.exports = mongoose.model('Shift', shiftSchema);
