const Payslip = require('../../core/models/Payslip');
const Employee = require('../../core/models/Employee');

// @desc    Get all payslips
// @route   GET /api/v1/payroll
// @access  Private
exports.getPayslips = async (req, res) => {
  try {
    const payslips = await Payslip.find({ tenantId: req.user.tenantId })
      .populate('employeeId', 'firstName lastName jobTitle')
      .sort({ createdAt: -1 });
    res.status(200).json(payslips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate a new payslip
// @route   POST /api/v1/payroll
// @access  Private
exports.createPayslip = async (req, res) => {
  try {
    const { employeeId, payPeriod, basicPay, allowances, deductions } = req.body;

    const netPay = Number(basicPay) + Number(allowances || 0) - Number(deductions || 0);

    const payslip = await Payslip.create({
      tenantId: req.user.tenantId,
      employeeId,
      payPeriod,
      basicPay,
      allowances,
      deductions,
      netPay,
      status: 'DRAFT'
    });

    const populated = await Payslip.findById(payslip._id).populate('employeeId', 'firstName lastName jobTitle');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Mark payslip as paid
// @route   PUT /api/v1/payroll/:id/pay
// @access  Private
exports.payPayslip = async (req, res) => {
  try {
    const payslip = await Payslip.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { status: 'PAID', paymentDate: new Date() },
      { returnDocument: 'after', runValidators: true }
    ).populate('employeeId', 'firstName lastName jobTitle');
    
    if (!payslip) return res.status(404).json({ message: 'Payslip not found' });
    res.status(200).json(payslip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
