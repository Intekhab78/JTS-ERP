const Shift = require('../../core/models/Shift');
const EmployeeShift = require('../../core/models/EmployeeShift');
const Employee = require('../../core/models/Employee');

// --- SHIFT MANAGEMENT ---

exports.createShift = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const shift = new Shift({
      ...req.body,
      tenantId,
      createdBy: req.user.id
    });
    await shift.save();
    res.status(201).json(shift);
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.getShifts = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const shifts = await Shift.find({ tenantId }).sort('-createdAt');
    res.json(shifts);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateShift = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const shift = await Shift.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { ...req.body, updatedBy: req.user.id },
      { returnDocument: 'after', runValidators: true }
    );
    if (!shift) return res.status(404).json({ message: 'Shift not found' });
    res.json(shift);
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteShift = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    
    // Check if shift is in use
    const assigned = await EmployeeShift.findOne({ shiftId: req.params.id, tenantId });
    if (assigned) {
      return res.status(400).json({ message: 'Cannot delete shift as it is currently assigned to employees.' });
    }

    const result = await Shift.deleteOne({ _id: req.params.id, tenantId });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Shift not found' });
    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// --- EMPLOYEE SHIFT ASSIGNMENT ---

exports.assignEmployeeShift = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { shiftId, effectiveFrom, effectiveTo } = req.body;
    const tenantId = req.user.tenantId;

    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const shift = await Shift.findOne({ _id: shiftId, tenantId });
    if (!shift) return res.status(404).json({ message: 'Shift not found' });

    // Ensure we don't have overlapping active indefinite assignments
    if (!effectiveTo) {
      await EmployeeShift.updateMany(
        { employeeId, tenantId, status: 'ACTIVE', effectiveTo: null },
        { effectiveTo: new Date(new Date(effectiveFrom).getTime() - 1), updatedBy: req.user.id }
      );
    }

    const assignment = new EmployeeShift({
      tenantId,
      employeeId,
      shiftId,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      createdBy: req.user.id
    });

    await assignment.save();
    
    const populated = await EmployeeShift.findById(assignment._id).populate('shiftId', 'name code startTime endTime');
    res.status(201).json(populated);
  } catch (error) {
    console.error('Error assigning shift:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.getEmployeeShifts = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const tenantId = req.user.tenantId;

    const assignments = await EmployeeShift.find({ employeeId, tenantId })
      .populate('shiftId')
      .sort({ effectiveFrom: -1 });

    res.json(assignments);
  } catch (error) {
    console.error('Error fetching employee shifts:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteEmployeeShift = async (req, res) => {
  try {
    const { employeeId, assignmentId } = req.params;
    const tenantId = req.user.tenantId;

    const result = await EmployeeShift.deleteOne({ _id: assignmentId, employeeId, tenantId });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Shift assignment not found' });
    
    res.json({ message: 'Shift assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee shift:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
