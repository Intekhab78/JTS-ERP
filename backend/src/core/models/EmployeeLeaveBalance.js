const mongoose = require('mongoose');

const employeeLeaveBalanceSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  leaveTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  openingBalance: { type: Number, default: 0 },
  accrued: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  pending: { type: Number, default: 0 }, // Requested but not yet approved
  carriedForward: { type: Number, default: 0 },
  encashed: { type: Number, default: 0 },
  adjustment: { type: Number, default: 0 },
  closingBalance: { type: Number, default: 0 },
  lastAccrualDate: { type: Date },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

employeeLeaveBalanceSchema.index({ tenantId: 1, employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

// Pre-save middleware to automatically compute closingBalance
employeeLeaveBalanceSchema.pre('save', function(next) {
  this.closingBalance = this.openingBalance + this.carriedForward + this.accrued + this.adjustment - this.used - this.encashed;
  next();
});

module.exports = mongoose.model('EmployeeLeaveBalance', employeeLeaveBalanceSchema);
