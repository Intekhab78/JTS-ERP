const EmployeeAttendance = require('../../core/models/EmployeeAttendance');
const Employee = require('../../core/models/Employee');
const EmployeeShift = require('../../core/models/EmployeeShift');
const Shift = require('../../core/models/Shift');

// Helper to calculate time difference in minutes
const diffMinutes = (start, end) => {
  return Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
};

// Helper to convert HH:mm string to a Date object on a specific day
const parseTimeOnDate = (timeStr, baseDate) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

// Calculate all metrics based on punches and shift
const recalculateMetrics = (attendance, shift) => {
  if (!attendance.punches || attendance.punches.length === 0) {
    attendance.totalWorkingMinutes = 0;
    attendance.firstCheckIn = null;
    attendance.lastCheckOut = null;
    return;
  }

  // Sort punches chronologically
  attendance.punches.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  attendance.firstCheckIn = attendance.punches.find(p => p.type === 'IN')?.timestamp || null;
  
  // Find last OUT punch. If none, use last checkIn as fallback for tracking but it shouldn't compute minutes
  const outPunches = attendance.punches.filter(p => p.type === 'OUT');
  attendance.lastCheckOut = outPunches.length > 0 ? outPunches[outPunches.length - 1].timestamp : null;

  // Calculate total working minutes by pairing INs and OUTs
  let totalMins = 0;
  let currentIn = null;
  
  for (const punch of attendance.punches) {
    if (punch.type === 'IN') {
      currentIn = punch.timestamp;
    } else if (punch.type === 'OUT' && currentIn) {
      totalMins += diffMinutes(currentIn, punch.timestamp);
      currentIn = null; // Wait for next IN
    }
  }
  
  attendance.totalWorkingMinutes = totalMins;

  // Calculate Shift-based metrics (Late, Early, Overtime)
  if (shift && attendance.firstCheckIn) {
    const shiftStart = parseTimeOnDate(shift.startTime, attendance.attendanceDate);
    let shiftEnd = parseTimeOnDate(shift.endTime, attendance.attendanceDate);
    
    if (shift.overnightShift) {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    }
    
    // Add grace periods
    const allowedCheckIn = new Date(shiftStart.getTime() + (shift.graceInMinutes * 60000));
    
    // Late minutes
    if (attendance.firstCheckIn > allowedCheckIn) {
      attendance.lateMinutes = diffMinutes(shiftStart, attendance.firstCheckIn);
    } else {
      attendance.lateMinutes = 0;
    }

    // Early exit
    if (attendance.lastCheckOut && attendance.lastCheckOut < shiftEnd) {
      attendance.earlyExitMinutes = diffMinutes(attendance.lastCheckOut, shiftEnd);
      // Remove grace out logic simplified: if they leave before shiftEnd, it's early.
      if (attendance.earlyExitMinutes <= shift.graceOutMinutes) {
        attendance.earlyExitMinutes = 0;
      }
    } else {
      attendance.earlyExitMinutes = 0;
    }

    // Overtime
    if (shift.overtimeAllowed && attendance.totalWorkingMinutes > (shift.workingHours * 60)) {
      const computedOt = attendance.totalWorkingMinutes - (shift.workingHours * 60);
      attendance.overtimeMinutes = computedOt > shift.overtimeAfterMinutes ? computedOt : 0;
    } else {
      attendance.overtimeMinutes = 0;
    }
    
    attendance.shiftId = shift._id;
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { attendanceDate, punchType, timestamp, source, location, remarks, deviceId } = req.body;
    const tenantId = req.user.tenantId;

    if (!['IN', 'OUT'].includes(punchType)) {
      return res.status(400).json({ message: 'Invalid punch type. Must be IN or OUT.' });
    }

    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Canonical date (strip time)
    const dateObj = new Date(attendanceDate);
    dateObj.setUTCHours(0,0,0,0);

    let attendance = await EmployeeAttendance.findOne({
      tenantId,
      employeeId,
      attendanceDate: dateObj
    });

    if (!attendance) {
      attendance = new EmployeeAttendance({
        tenantId,
        employeeId,
        attendanceDate: dateObj,
        status: 'PRESENT',
        punches: []
      });
    }

    // Add new punch
    attendance.punches.push({
      timestamp: new Date(timestamp || Date.now()),
      type: punchType,
      source: source || 'MANUAL',
      location,
      remarks,
      deviceId
    });

    // Find active shift for this day
    let activeShiftId = null;
    let shiftData = null;
    
    // Find assignment valid on this date
    const assignment = await EmployeeShift.findOne({
      tenantId,
      employeeId,
      status: 'ACTIVE',
      effectiveFrom: { $lte: dateObj },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $gte: dateObj } }
      ]
    }).sort({ effectiveFrom: -1 });

    if (assignment) {
      shiftData = await Shift.findById(assignment.shiftId);
    }

    recalculateMetrics(attendance, shiftData);
    
    attendance.updatedBy = req.user.id;
    await attendance.save();

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    const tenantId = req.user.tenantId;
    
    let filter = { tenantId, employeeId };
    
    if (startDate && endDate) {
      filter.attendanceDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const records = await EmployeeAttendance.find(filter)
      .populate('shiftId', 'name startTime endTime')
      .sort({ attendanceDate: -1 });
      
    res.json(records);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getDailyAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const tenantId = req.user.tenantId;
    
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const dateObj = new Date(date);
    dateObj.setUTCHours(0,0,0,0);

    const records = await EmployeeAttendance.find({
      tenantId,
      attendanceDate: dateObj
    })
    .populate('employeeId', 'firstName lastName employeeCode')
    .populate('shiftId', 'name');

    res.json(records);
  } catch (error) {
    console.error('Error fetching daily attendance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const attendance = await EmployeeAttendance.findOneAndUpdate(
      { _id: id, tenantId },
      { ...req.body, updatedBy: req.user.id },
      { returnDocument: 'after', runValidators: true }
    );

    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });
    res.json(attendance);
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(400).json({ message: error.message });
  }
};
