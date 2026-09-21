const mongoose = require('mongoose');

const punchSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['IN', 'OUT'],
    required: true
  },
  source: {
    type: String,
    enum: ['MANUAL', 'WEB', 'MOBILE', 'BIOMETRIC', 'IMPORT', 'API'],
    required: true
  },
  deviceId: { type: String },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  remarks: String
});

const employeeAttendanceSchema = new mongoose.Schema({
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
  attendanceDate: {
    type: Date, // Canonical date representing this shift/work day.
    required: true
  },
  status: {
    type: String,
    enum: [
      'PRESENT',
      'ABSENT',
      'HALF_DAY',
      'ON_LEAVE',
      'HOLIDAY',
      'WEEK_OFF',
      'WORK_FROM_HOME',
      'LATE',
      'EARLY_EXIT'
    ],
    required: true
  },
  // Multiple punches support
  punches: [punchSchema],
  
  // Computed summaries for payroll/reporting
  firstCheckIn: { type: Date },
  lastCheckOut: { type: Date },
  
  totalWorkingMinutes: {
    type: Number,
    default: 0
  },
  overtimeMinutes: {
    type: Number,
    default: 0
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  earlyExitMinutes: {
    type: Number,
    default: 0
  },
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  remarks: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
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

// Prevent duplicate attendance records for the same day (unless they have multiple shifts a day, but for now we enforce 1 record per canonical date per employee)
employeeAttendanceSchema.index({ tenantId: 1, employeeId: 1, attendanceDate: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeAttendance', employeeAttendanceSchema);
