const mongoose = require('mongoose');

const posSessionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  registerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Register'
  },
  openedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  openedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  openingCash: {
    type: Number,
    required: true
  },
  openingDenominations: [{
    denomination: { type: Number, required: true },
    count: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  status: {
    type: String,
    enum: ['OPEN', 'CLOSING_AUDIT', 'CLOSED'],
    default: 'OPEN'
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedAt: {
    type: Date
  },
  closingCash: {
    type: Number
  },
  closingDenominations: [{
    denomination: { type: Number, required: true },
    count: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  expectedCash: {
    type: Number
  },
  cashDifference: {
    type: Number
  },
  notes: {
    type: String
  },
  auditRequired: {
    type: Boolean,
    default: false
  },
  auditStatus: {
    type: String,
    enum: ['PENDING', 'RESOLVED']
  },
  auditReason: {
    type: String
  },
  auditNotes: {
    type: String
  },
  auditResolution: {
    type: String,
    enum: ['APPROVED', 'SHORTAGE_CONFIRMED', 'OVERAGE_CONFIRMED']
  },
  auditSubmittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  auditSubmittedAt: {
    type: Date
  },
  auditReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  auditReviewedAt: {
    type: Date
  },
  auditedDenominations: [{
    denomination: { type: Number, required: true },
    count: { type: Number, required: true },
    total: { type: Number, required: true }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('POSSession', posSessionSchema);
