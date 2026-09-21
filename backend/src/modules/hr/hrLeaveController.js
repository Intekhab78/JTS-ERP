const mongoose = require('mongoose');
const LeaveType = require('../../core/models/LeaveType');
const EmployeeLeaveBalance = require('../../core/models/EmployeeLeaveBalance');
const LeaveRequest = require('../../core/models/LeaveRequest');
const Holiday = require('../../core/models/Holiday');
const EmployeeAttendance = require('../../core/models/EmployeeAttendance');

// --- LEAVE TYPES ---

exports.createLeaveType = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const leaveType = new LeaveType({
      ...req.body,
      tenantId,
      createdBy: req.user.id
    });
    await leaveType.save();
    res.status(201).json(leaveType);
  } catch (error) {
    console.error('Error creating LeaveType:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.getLeaveTypes = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const leaveTypes = await LeaveType.find({ tenantId }).sort('name');
    res.json(leaveTypes);
  } catch (error) {
    console.error('Error fetching LeaveTypes:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const leaveType = await LeaveType.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { ...req.body, updatedBy: req.user.id },
      { returnDocument: 'after', runValidators: true }
    );
    if (!leaveType) return res.status(404).json({ message: 'Leave Type not found' });
    res.json(leaveType);
  } catch (error) {
    console.error('Error updating LeaveType:', error);
    res.status(400).json({ message: error.message });
  }
};


// --- LEAVE BALANCES ---

exports.getEmployeeBalances = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { employeeId, year } = req.query;
    
    if (!employeeId || !year) return res.status(400).json({ message: 'employeeId and year are required' });

    const balances = await EmployeeLeaveBalance.find({ tenantId, employeeId, year })
      .populate('leaveTypeId', 'name code unit')
      .sort('leaveTypeId');
      
    res.json(balances);
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.adjustLeaveBalance = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { adjustmentAmount } = req.body; // e.g., +2 or -1

    const balance = await EmployeeLeaveBalance.findOne({ _id: id, tenantId });
    if (!balance) return res.status(404).json({ message: 'Balance not found' });

    balance.adjustment += Number(adjustmentAmount);
    balance.updatedBy = req.user.id;
    await balance.save(); // pre-save hook computes closingBalance

    res.json(balance);
  } catch (error) {
    console.error('Error adjusting balance:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// --- LEAVE REQUESTS ---

exports.submitLeaveRequest = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { employeeId, leaveTypeId, fromDate, toDate, leaveDurationType, requestedUnits, reason, attachment } = req.body;

    const leaveType = await LeaveType.findOne({ _id: leaveTypeId, tenantId });
    if (!leaveType) return res.status(404).json({ message: 'Leave Type not found' });

    if (leaveType.requiresDocument && !attachment) {
      return res.status(400).json({ message: 'This leave type requires a supporting document.' });
    }

    // Basic overlap check
    const from = new Date(fromDate);
    const to = new Date(toDate);
    
    const overlap = await LeaveRequest.findOne({
      tenantId,
      employeeId,
      status: { $in: ['SUBMITTED', 'APPROVED'] },
      $or: [
        { fromDate: { $lte: to }, toDate: { $gte: from } }
      ]
    });

    if (overlap) {
      return res.status(400).json({ message: 'Overlapping leave request already exists.' });
    }

    const request = new LeaveRequest({
      tenantId,
      employeeId,
      leaveTypeId,
      fromDate: from,
      toDate: to,
      leaveDurationType,
      requestedUnits,
      reason,
      attachment,
      status: 'SUBMITTED',
      createdBy: req.user.id
    });

    await request.save();

    // If it requires approval, leave it SUBMITTED and add to pending balance
    // But realistically pending balance update needs a hook or separate transaction.
    // For now we'll do an optimistic atomic update on the balance.
    const year = from.getFullYear();
    const balance = await EmployeeLeaveBalance.findOne({ tenantId, employeeId, leaveTypeId, year });
    if (balance) {
       balance.pending += requestedUnits;
       await balance.save();
    }

    res.status(201).json(request);
  } catch (error) {
    console.error('Error submitting leave:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.getLeaveRequests = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { employeeId, status } = req.query;

    let query = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const requests = await LeaveRequest.find(query)
      .populate('employeeId', 'firstName lastName employeeCode')
      .populate('leaveTypeId', 'name code unit')
      .sort('-createdAt');

    res.json(requests);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.approveLeaveRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    
    const request = await LeaveRequest.findOne({ _id: id, tenantId }).session(session);
    if (!request) throw new Error('Leave Request not found');
    if (request.status !== 'SUBMITTED') throw new Error('Only SUBMITTED requests can be approved');

    // Fetch leave type
    const leaveType = await LeaveType.findOne({ _id: request.leaveTypeId, tenantId }).session(session);

    // Fetch balance
    const year = request.fromDate.getFullYear();
    const balance = await EmployeeLeaveBalance.findOne({ 
      tenantId, 
      employeeId: request.employeeId, 
      leaveTypeId: request.leaveTypeId, 
      year 
    }).session(session);

    if (balance) {
      if (!leaveType.paidLeave) {
        // Unpaid leave doesn't usually consume balance, but if it does we process it
        balance.used += request.requestedUnits;
        balance.pending = Math.max(0, balance.pending - request.requestedUnits);
      } else {
        // Paid leave
        if (balance.closingBalance < request.requestedUnits) {
            // Some policies allow negative balance, but standard is reject unless permitted.
            // Let's implement strict for now unless configured. (No config for negative yet, so block)
            throw new Error(`Insufficient leave balance. Available: ${balance.closingBalance}, Requested: ${request.requestedUnits}`);
        }
        balance.used += request.requestedUnits;
        balance.pending = Math.max(0, balance.pending - request.requestedUnits);
      }
      await balance.save({ session });
    }

    request.status = 'APPROVED';
    request.approvedBy = req.user.id;
    request.approvedAt = new Date();
    await request.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json(request);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error approving leave:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.rejectLeaveRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const request = await LeaveRequest.findOne({ _id: id, tenantId }).session(session);
    if (!request) throw new Error('Leave Request not found');
    if (request.status !== 'SUBMITTED') throw new Error('Only SUBMITTED requests can be rejected');

    const year = request.fromDate.getFullYear();
    const balance = await EmployeeLeaveBalance.findOne({ 
      tenantId, 
      employeeId: request.employeeId, 
      leaveTypeId: request.leaveTypeId, 
      year 
    }).session(session);

    if (balance) {
      balance.pending = Math.max(0, balance.pending - request.requestedUnits);
      await balance.save({ session });
    }

    request.status = 'REJECTED';
    request.rejectionReason = rejectionReason;
    request.rejectedBy = req.user.id;
    request.rejectedAt = new Date();
    await request.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json(request);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error rejecting leave:', error);
    res.status(400).json({ message: error.message });
  }
};
