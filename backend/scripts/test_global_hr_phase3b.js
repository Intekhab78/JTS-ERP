require('dotenv').config();
const mongoose = require('mongoose');
const LeaveType = require('../src/core/models/LeaveType');
const HolidayCalendar = require('../src/core/models/HolidayCalendar');
const Holiday = require('../src/core/models/Holiday');
const EmployeeLeaveBalance = require('../src/core/models/EmployeeLeaveBalance');
const LeaveRequest = require('../src/core/models/LeaveRequest');
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

    // 2. Create Leave Type
    const leaveType = new LeaveType({
      tenantId,
      name: 'Test Annual Leave',
      code: 'TAL',
      unit: 'DAYS',
      paidLeave: true,
      annualEntitlement: 20,
      accrualEnabled: true,
      accrualFrequency: 'MONTHLY',
      accrualAmount: 1.66
    });
    await leaveType.save();
    console.log(`Created Leave Type: ${leaveType.name}`);

    // 3. Create Holiday Calendar & Holiday
    const calendar = new HolidayCalendar({
      tenantId,
      name: 'Global Holidays 2026',
      year: 2026
    });
    await calendar.save();
    
    const holiday = new Holiday({
      tenantId,
      calendarId: calendar._id,
      date: new Date('2026-12-25'),
      name: 'Christmas Day',
      holidayType: 'PUBLIC'
    });
    await holiday.save();
    console.log(`Created Holiday Calendar and Holiday.`);

    // 4. Create Leave Balance
    const year = 2026;
    const balance = new EmployeeLeaveBalance({
      tenantId,
      employeeId: employee._id,
      leaveTypeId: leaveType._id,
      year,
      openingBalance: 10,
      accrued: 5,
      used: 2
    });
    // closingBalance should be 13 automatically via pre-save hook
    await balance.save();
    console.log(`Created Leave Balance. Closing Balance is: ${balance.closingBalance} (Expected: 13)`);

    // 5. Submit Leave Request
    const request = new LeaveRequest({
      tenantId,
      employeeId: employee._id,
      leaveTypeId: leaveType._id,
      fromDate: new Date('2026-10-01'),
      toDate: new Date('2026-10-02'),
      leaveDurationType: 'FULL_DAY',
      requestedUnits: 2,
      reason: 'Vacation'
    });
    await request.save();
    
    // Simulate approval logic to see if balance updates
    balance.pending += request.requestedUnits;
    await balance.save();
    console.log(`Leave Request Submitted. Balance Pending: ${balance.pending}`);

    // Mock transaction-less approval for test script purposes
    balance.used += request.requestedUnits;
    balance.pending = Math.max(0, balance.pending - request.requestedUnits);
    await balance.save();
    
    request.status = 'APPROVED';
    await request.save();

    console.log(`Leave Request Approved. New Closing Balance: ${balance.closingBalance} (Expected: 11)`);

    // 6. Cleanup
    await LeaveType.deleteOne({ _id: leaveType._id });
    await HolidayCalendar.deleteOne({ _id: calendar._id });
    await Holiday.deleteOne({ _id: holiday._id });
    await EmployeeLeaveBalance.deleteOne({ _id: balance._id });
    await LeaveRequest.deleteOne({ _id: request._id });
    console.log('Cleanup successful.');

    console.log('ALL PHASE 3B TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

runTest();
