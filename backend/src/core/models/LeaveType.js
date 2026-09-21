const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country' // Optional, for country-specific leaves
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  description: String,
  paidLeave: {
    type: Boolean,
    default: true
  },
  unit: {
    type: String,
    enum: ['DAYS', 'HOURS'],
    default: 'DAYS'
  },
  annualEntitlement: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Accrual rules
  accrualEnabled: { type: Boolean, default: false },
  accrualFrequency: {
    type: String,
    enum: ['MONTHLY', 'QUARTERLY', 'YEARLY', 'NONE'],
    default: 'NONE'
  },
  accrualAmount: { type: Number, default: 0 },
  
  // Carry Forward Rules
  carryForwardEnabled: { type: Boolean, default: false },
  maximumCarryForward: { type: Number, default: 0 },
  carryForwardExpiry: { type: Number, default: 0 }, // Months until expiry, 0 means never expires

  // Encashment Rules
  encashmentEnabled: { type: Boolean, default: false },
  maximumEncashment: { type: Number, default: 0 },

  // Policy restrictions
  requiresApproval: { type: Boolean, default: true },
  requiresDocument: { type: Boolean, default: false },
  minimumNoticeDays: { type: Number, default: 0 },
  maximumConsecutiveDays: { type: Number, default: 0 },
  
  genderRestriction: {
    type: String,
    enum: ['ALL', 'MALE', 'FEMALE', 'OTHER'],
    default: 'ALL'
  },
  
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
