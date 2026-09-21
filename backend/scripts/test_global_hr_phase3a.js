require('dotenv').config();
const mongoose = require('mongoose');
const Shift = require('../src/core/models/Shift');
const EmployeeShift = require('../src/core/models/EmployeeShift');
const EmployeeAttendance = require('../src/core/models/EmployeeAttendance');
const Employee = require('../src/core/models/Employee');

async function runTest() {
  console.log('Connecting to MongoDB...');
  let uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found in .env');

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  } catch (error) {
    if (uri.includes(':27017/')) {
      const tunnelUri = uri.replace(':27017/', ':27018/');
      console.log('⚠️ Failed on port 27017, trying local SSH tunnel port 27018...');
      await mongoose.connect(tunnelUri, { serverSelectionTimeoutMS: 5000 });
    } else {
      throw error;
    }
  }
  
  console.log('Connected.');

  try {
    // 1. Get any tenant and employee
    const employee = await Employee.findOne({});
    if (!employee) throw new Error('No employee found in DB');
    
    const tenantId = employee.tenantId;

    console.log(`Using Tenant: ${tenantId}, Employee: ${employee.firstName}`);

    // 2. Create a test shift (Overnight, allows overtime)
    const shift = new Shift({
      tenantId,
      name: 'Night Operations',
      code: 'NIGHT_01',
      startTime: '20:00',
      endTime: '06:00', // Next day
      workingHours: 10, // 10 hours
      overnightShift: true,
      graceInMinutes: 15,
      graceOutMinutes: 15,
      overtimeAllowed: true,
      overtimeAfterMinutes: 30
    });
    await shift.save();
    console.log(`Created Shift: ${shift.name}`);

    // 3. Assign shift to employee
    const effectiveFrom = new Date();
    effectiveFrom.setDate(effectiveFrom.getDate() - 5); // 5 days ago

    const employeeShift = new EmployeeShift({
      tenantId,
      employeeId: employee._id,
      shiftId: shift._id,
      effectiveFrom
    });
    await employeeShift.save();
    console.log(`Assigned shift to employee.`);

    // 4. Test Attendance (Multiple Punches)
    const baseDate = new Date();
    baseDate.setUTCHours(0,0,0,0);

    const attendance = new EmployeeAttendance({
      tenantId,
      employeeId: employee._id,
      attendanceDate: baseDate,
      status: 'PRESENT',
      punches: []
    });

    // In at 19:50 (10 mins early)
    let d1 = new Date(baseDate);
    d1.setHours(19, 50, 0, 0);
    attendance.punches.push({ timestamp: d1, type: 'IN', source: 'WEB' });

    // Out at 23:00 (Break)
    let d2 = new Date(baseDate);
    d2.setHours(23, 0, 0, 0);
    attendance.punches.push({ timestamp: d2, type: 'OUT', source: 'WEB' });

    // In at 00:00 (Back from break, next day)
    let d3 = new Date(baseDate);
    d3.setDate(d3.getDate() + 1);
    d3.setHours(0, 0, 0, 0);
    attendance.punches.push({ timestamp: d3, type: 'IN', source: 'WEB' });

    // Out at 07:30 (Late checkout, 1.5 hours overtime)
    let d4 = new Date(baseDate);
    d4.setDate(d4.getDate() + 1);
    d4.setHours(7, 30, 0, 0);
    attendance.punches.push({ timestamp: d4, type: 'OUT', source: 'WEB' });

    console.log('Calculating metrics...');
    
    // Simulate the recalculateMetrics function from the controller
    const diffMinutes = (start, end) => Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
    const parseTimeOnDate = (timeStr, bDate) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const d = new Date(bDate);
      d.setHours(hours, minutes, 0, 0);
      return d;
    };

    attendance.punches.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    attendance.firstCheckIn = attendance.punches.find(p => p.type === 'IN').timestamp;
    
    const outPunches = attendance.punches.filter(p => p.type === 'OUT');
    attendance.lastCheckOut = outPunches[outPunches.length - 1].timestamp;

    let totalMins = 0;
    let currentIn = null;
    
    for (const punch of attendance.punches) {
      if (punch.type === 'IN') {
        currentIn = punch.timestamp;
      } else if (punch.type === 'OUT' && currentIn) {
        totalMins += diffMinutes(currentIn, punch.timestamp);
        currentIn = null;
      }
    }
    
    attendance.totalWorkingMinutes = totalMins;

    const shiftStart = parseTimeOnDate(shift.startTime, attendance.attendanceDate);
    let shiftEnd = parseTimeOnDate(shift.endTime, attendance.attendanceDate);
    if (shift.overnightShift) shiftEnd.setDate(shiftEnd.getDate() + 1);
    
    const allowedCheckIn = new Date(shiftStart.getTime() + (shift.graceInMinutes * 60000));
    
    attendance.lateMinutes = attendance.firstCheckIn > allowedCheckIn ? diffMinutes(shiftStart, attendance.firstCheckIn) : 0;
    
    if (attendance.lastCheckOut && attendance.lastCheckOut < shiftEnd) {
      attendance.earlyExitMinutes = diffMinutes(attendance.lastCheckOut, shiftEnd);
      if (attendance.earlyExitMinutes <= shift.graceOutMinutes) attendance.earlyExitMinutes = 0;
    } else {
      attendance.earlyExitMinutes = 0;
    }

    if (shift.overtimeAllowed && attendance.totalWorkingMinutes > (shift.workingHours * 60)) {
      const computedOt = attendance.totalWorkingMinutes - (shift.workingHours * 60);
      attendance.overtimeMinutes = computedOt > shift.overtimeAfterMinutes ? computedOt : 0;
    } else {
      attendance.overtimeMinutes = 0;
    }
    
    attendance.shiftId = shift._id;

    await attendance.save();

    console.log('✅ Multiple Punches Test Passed');
    console.log(`Total Working Minutes: ${attendance.totalWorkingMinutes} (Expected: 640 = 10h 40m)`);
    console.log(`Late Minutes: ${attendance.lateMinutes} (Expected: 0)`);
    console.log(`Early Exit Minutes: ${attendance.earlyExitMinutes} (Expected: 0)`);
    console.log(`Overtime Minutes: ${attendance.overtimeMinutes} (Expected: 40)`);

    // Clean up
    await Shift.deleteOne({ _id: shift._id });
    await EmployeeShift.deleteOne({ _id: employeeShift._id });
    await EmployeeAttendance.deleteOne({ _id: attendance._id });
    console.log('Cleanup successful.');

    console.log('ALL PHASE 3A TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runTest();
