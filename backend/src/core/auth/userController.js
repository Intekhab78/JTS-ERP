const User = require('../models/User');
const Employee = require('../models/Employee');
const { verifyBranchAccess } = require('../middleware/authMiddleware');

// @desc    Get all users for tenant
// @route   GET /api/v1/users
// @access  Private
const getUsers = async (req, res) => {
  try {
    const query = req.user.tenantId ? { tenantId: req.user.tenantId } : {};
    if (req.user.branches && req.user.branches.length > 0) {
      query.branches = { $in: req.user.branches };
    }
    const users = await User.find(query).populate('roleId').populate('branches').populate('tenantId', 'name').populate('employeeId', 'employeeCode firstName lastName designation');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create/Invite new user
// @route   POST /api/v1/users
// @access  Private
const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, roleId, branches, employeeId, mobile, portalAccess } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      tenantId: req.user.tenantId,
      firstName,
      lastName,
      email,
      password,
      roleId,
      branches: Array.isArray(branches) ? branches : [],
      employeeId: employeeId || null,
      mobile: mobile || null,
      portalAccess: portalAccess || 'NO ACCESS'
    });

    if (employeeId) {
      // Update employee with userId
      await Employee.findOneAndUpdate(
        { _id: employeeId, tenantId: req.user.tenantId },
        { userId: user._id }
      );
    }

    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roleId: user.roleId,
      branches: user.branches,
      employeeId: user.employeeId,
      portalAccess: user.portalAccess
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private
const deleteUser = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenantId) query.tenantId = req.user.tenantId;

    const user = await User.findOneAndDelete(query);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private
const updateUser = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenantId) query.tenantId = req.user.tenantId;

    const { firstName, lastName, roleId, branches, employeeId, mobile, portalAccess, isActive } = req.body;

    let user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldEmployeeId = user.employeeId;

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    if (roleId !== undefined) user.roleId = roleId;
    if (branches !== undefined) user.branches = Array.isArray(branches) ? branches : [];
    if (employeeId !== undefined) user.employeeId = employeeId || null;
    if (mobile !== undefined) user.mobile = mobile;
    if (portalAccess !== undefined) user.portalAccess = portalAccess;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Handle employee linkage changes
    if (employeeId && oldEmployeeId && employeeId.toString() !== oldEmployeeId.toString()) {
      // Unlink old
      await Employee.findOneAndUpdate({ _id: oldEmployeeId }, { userId: null });
      // Link new
      await Employee.findOneAndUpdate({ _id: employeeId }, { userId: user._id });
    } else if (employeeId && !oldEmployeeId) {
      // Link new
      await Employee.findOneAndUpdate({ _id: employeeId }, { userId: user._id });
    } else if (!employeeId && oldEmployeeId) {
      // Unlink old
      await Employee.findOneAndUpdate({ _id: oldEmployeeId }, { userId: null });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set POS PIN
// @route   PUT /api/v1/users/:id/pos-pin
// @access  Private
const setPosPin = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.tenantId) query.tenantId = req.user.tenantId;

    const { posPin } = req.body;
    
    if (!posPin || typeof posPin !== 'string' || posPin.length < 4 || posPin.length > 6 || !/^\d+$/.test(posPin)) {
      return res.status(400).json({ message: 'POS PIN must be a 4-6 digit number' });
    }

    const user = await User.findOne(query);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.posPin = posPin;
    await user.save(); // triggers bcrypt hash in pre('save')

    res.status(200).json({ success: true, message: 'POS PIN updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  deleteUser,
  updateUser,
  setPosPin
};
