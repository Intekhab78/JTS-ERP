const Branch = require('../../core/models/Branch');

// @desc    Get all branches
// @route   GET /api/v1/branches
// @access  Private
exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.find({ tenantId: req.user.tenantId }).populate('managerId', 'firstName lastName email');
    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a branch
// @route   POST /api/v1/branches
// @access  Private
exports.createBranch = async (req, res) => {
  try {
    const branch = await Branch.create({
      tenantId: req.user.tenantId,
      ...req.body
    });
    const populatedBranch = await Branch.findById(branch._id).populate('managerId', 'firstName lastName email');
    res.status(201).json(populatedBranch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a branch
// @route   PUT /api/v1/branches/:id
// @access  Private
exports.updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      { returnDocument: 'after', runValidators: true }
    ).populate('managerId', 'firstName lastName email');

    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    res.status(200).json(branch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const User = require('../../core/models/User');
const Employee = require('../../core/models/Employee');
const Order = require('../../core/models/Order');
const Quote = require('../../core/models/Quote');
const PurchaseOrder = require('../../core/models/PurchaseOrder');
const Stock = require('../../core/models/Stock');

// @desc    Delete a branch
// @route   DELETE /api/v1/branches/:id
// @access  Private
exports.deleteBranch = async (req, res) => {
  try {
    const branchId = req.params.id;
    const tenantId = req.user.tenantId;

    // Check for related records to prevent orphaned data
    const [usersCount, employeesCount, ordersCount, quotesCount, poCount, stockCount] = await Promise.all([
      User.countDocuments({ branchId, tenantId }),
      Employee.countDocuments({ branchId, tenantId }),
      Order.countDocuments({ branchId, tenantId }),
      Quote.countDocuments({ branchId, tenantId }),
      PurchaseOrder.countDocuments({ branchId, tenantId }),
      Stock.countDocuments({ branchId, tenantId })
    ]);

    if (usersCount > 0 || employeesCount > 0 || ordersCount > 0 || quotesCount > 0 || poCount > 0 || stockCount > 0) {
      return res.status(400).json({ message: 'Cannot delete branch because there are users, transactions, or stock records linked to it.' });
    }

    const branch = await Branch.findOneAndDelete({ _id: branchId, tenantId });
    if (!branch) return res.status(404).json({ message: 'Branch not found' });
    res.status(200).json({ message: 'Branch removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
