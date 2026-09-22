const Department = require('../../core/models/Department');
const Employee = require('../../core/models/Employee');
const Counter = require('../../core/models/Counter');
const User = require('../../core/models/User');
const { verifyBranchAccess } = require('../../core/middleware/authMiddleware');

const generateEmployeeCode = async (tenantId) => {
  const currentYear = new Date().getFullYear();
  const counterId = `EMP_${currentYear}`;
  
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  
  return `EMP-${currentYear}-${String(counter.sequenceValue).padStart(4, '0')}`;
};

// @desc    Get all departments
// @route   GET /api/v1/hr/departments
// @access  Private
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ tenantId: req.user.tenantId }).sort({ name: 1 });
    res.status(200).json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a department
// @route   POST /api/v1/hr/departments
// @access  Private
exports.createDepartment = async (req, res) => {
  try {
    const department = await Department.create({
      tenantId: req.user.tenantId,
      ...req.body
    });
    res.status(201).json(department);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all employees
// @route   GET /api/v1/hr/employees
// @access  Private
exports.getEmployees = async (req, res) => {
  try {
    const filter = { tenantId: req.user.tenantId };
    if (req.user.branchId) {
      filter.branchId = req.user.branchId;
    }
    
    const employees = await Employee.find(filter)
      .populate('departmentId', 'name')
      .populate('branchId', 'name')
      .sort({ hireDate: -1 });
    res.status(200).json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an employee
// @route   POST /api/v1/hr/employees
// @access  Private
exports.createEmployee = async (req, res) => {
  try {
    if (req.body.branchId) {
      const isAuthorized = await verifyBranchAccess(req.body.branchId, req);
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
      }
    }

    let employeeCode = req.body.employeeCode;
    if (!employeeCode) {
      employeeCode = await generateEmployeeCode(req.user.tenantId);
    }

    const employee = await Employee.create({
      tenantId: req.user.tenantId,
      employeeCode,
      ...req.body
    });
    // Populate for the response
    const populated = await Employee.findById(employee._id)
      .populate('departmentId', 'name')
      .populate('branchId', 'name');
      
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Link user to employee
// @route   POST /api/v1/hr/employees/:id/link-user
// @access  Private
exports.linkUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    const User = require('../../core/models/User');
    const user = await User.findOne({ _id: userId, tenantId: req.user.tenantId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check if user is already linked to another employee
    if (user.employeeId && user.employeeId.toString() !== employee._id.toString()) {
       return res.status(400).json({ message: 'User is already linked to another employee' });
    }

    employee.userId = user._id;
    await employee.save();
    
    user.employeeId = employee._id;
    await user.save();
    
    res.status(200).json({ message: 'User linked successfully', employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unlink user from employee
// @route   POST /api/v1/hr/employees/:id/unlink-user
// @access  Private
exports.unlinkUser = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    
    if (employee.userId) {
       const User = require('../../core/models/User');
       await User.findByIdAndUpdate(employee.userId, { $unset: { employeeId: 1 } });
       employee.userId = undefined;
       await employee.save();
    }
    
    res.status(200).json({ message: 'User unlinked successfully', employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get employee by ID
// @route   GET /api/v1/hr/employees/:id
// @access  Private
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('departmentId', 'name')
      .populate('branchId', 'name')
      .populate('locationId', 'name')
      .populate('teamId', 'name')
      .populate('designationId', 'name')
      .populate('jobLevelId', 'name')
      .populate('managerId', 'firstName lastName')
      .populate('hrManagerId', 'firstName lastName')
      .populate('userId', 'email mobile portalAccess isActive roleId');
      
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update employee
// @route   PUT /api/v1/hr/employees/:id
// @access  Private
exports.updateEmployee = async (req, res) => {
  try {
    let employee = await Employee.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (req.body.branchId && req.body.branchId !== employee.branchId.toString()) {
      const isAuthorized = await verifyBranchAccess(req.body.branchId, req);
      if (!isAuthorized) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
      }
    }

    // prevent manual overriding of userId
    delete req.body.userId;

    employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      { returnDocument: 'after', runValidators: true }
    )
    .populate('departmentId', 'name')
    .populate('branchId', 'name');

    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/v1/hr/employees/:id
// @access  Private
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // If this employee is linked to a User, remove the back-reference
    if (employee.userId) {
      await User.findByIdAndUpdate(employee.userId, { $unset: { employeeId: 1 } });
    }

    await employee.deleteOne();
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload Employee Photo
// @route   POST /api/v1/hr/employees/:id/photo
// @access  Private
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    employee.profilePhoto = {
      url: `/uploads/employees/${req.user.tenantId}/${req.params.id}/photo/${req.file.filename}`,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    };
    
    await employee.save();
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload Family Member Document
// @route   POST /api/v1/hr/employees/:id/family/:index/document
// @access  Private
exports.uploadFamilyDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const employee = await Employee.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index >= employee.familyMembers.length) {
      return res.status(400).json({ message: 'Invalid family member index' });
    }
    
    employee.familyMembers[index].documentUrl = `/uploads/employees/${req.user.tenantId}/${req.params.id}/family/${req.file.filename}`;
    employee.familyMembers[index].documentName = req.file.originalname;
    
    // We are modifying an array of subdocuments, Mongoose might need markModified if it's mixed type, but familyMembers is an array of schemas, so modifying a field directly on the indexed item should work if we save, but best to markModified.
    employee.markModified(`familyMembers.${index}`);
    
    await employee.save();
    res.status(200).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
