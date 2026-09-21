const PayrollPeriod = require('../../core/models/PayrollPeriod');
const PayrollRecord = require('../../core/models/PayrollRecord');
const PayrollRule = require('../../core/models/PayrollRule');
const PayrollCalculationService = require('./payroll/payrollCalculationService');

// --- Payroll Periods ---

exports.createPayrollPeriod = async (req, res) => {
  try {
    const period = new PayrollPeriod({
      ...req.body,
      tenantId: req.user.tenantId,
      createdBy: req.user.id
    });
    await period.save();
    res.status(201).json(period);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getPayrollPeriods = async (req, res) => {
  try {
    const periods = await PayrollPeriod.find({ tenantId: req.user.tenantId })
      .sort({ periodStart: -1 });
    res.json(periods);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPayrollPeriod = async (req, res) => {
  try {
    const period = await PayrollPeriod.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!period) return res.status(404).json({ message: 'Not found' });
    res.json(period);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Workflow actions
exports.openPayrollPeriod = async (req, res) => {
  try {
    const period = await PayrollPeriod.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!period || period.status !== 'DRAFT') return res.status(400).json({ message: 'Cannot open period' });
    
    period.status = 'OPEN';
    period.openedBy = req.user.id;
    await period.save();
    res.json(period);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.calculatePayroll = async (req, res) => {
  try {
    const records = await PayrollCalculationService.calculatePayrollForPeriod(
      req.user.tenantId,
      req.params.id,
      req.user.id
    );
    // Mark period as PROCESSED if we got records
    const period = await PayrollPeriod.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (period.status === 'PROCESSING') {
      period.status = 'PROCESSED';
      period.processedBy = req.user.id;
      period.processedAt = new Date();
      await period.save();
    }
    res.json({ message: 'Calculation complete', recordsProcessed: records.length });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.reviewPayrollPeriod = async (req, res) => {
  try {
    const period = await PayrollPeriod.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!period || period.status !== 'PROCESSED') return res.status(400).json({ message: 'Cannot review period' });
    
    period.status = 'REVIEWED';
    period.reviewedBy = req.user.id;
    await period.save();

    await PayrollRecord.updateMany(
      { payrollPeriodId: period._id, status: 'CALCULATED' },
      { $set: { status: 'REVIEWED', reviewedBy: req.user.id, reviewedAt: new Date() } }
    );

    res.json(period);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approvePayrollPeriod = async (req, res) => {
  try {
    const period = await PayrollPeriod.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!period || period.status !== 'REVIEWED') return res.status(400).json({ message: 'Cannot approve period' });
    
    period.status = 'APPROVED';
    period.approvedBy = req.user.id;
    await period.save();

    await PayrollRecord.updateMany(
      { payrollPeriodId: period._id, status: 'REVIEWED' },
      { $set: { status: 'APPROVED', approvedBy: req.user.id, approvedAt: new Date() } }
    );

    res.json(period);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.lockPayrollPeriod = async (req, res) => {
  try {
    const period = await PayrollPeriod.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
    if (!period || period.status !== 'APPROVED') return res.status(400).json({ message: 'Cannot lock period' });
    
    period.status = 'LOCKED';
    period.lockedBy = req.user.id;
    await period.save();
    res.json(period);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Payroll Records ---

exports.getPayrollRecords = async (req, res) => {
  try {
    const records = await PayrollRecord.find({ payrollPeriodId: req.params.id, tenantId: req.user.tenantId })
      .populate('employeeId', 'firstName lastName employeeCode');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmployeePayrollHistory = async (req, res) => {
  try {
    const records = await PayrollRecord.find({ employeeId: req.params.id, tenantId: req.user.tenantId })
      .populate('payrollPeriodId', 'name periodStart periodEnd paymentDate status')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Payroll Rules ---

exports.getPayrollRules = async (req, res) => {
  try {
    const rules = await PayrollRule.find({ tenantId: req.user.tenantId });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createPayrollRule = async (req, res) => {
  try {
    const rule = new PayrollRule({
      ...req.body,
      tenantId: req.user.tenantId,
      createdBy: req.user.id
    });
    await rule.save();
    res.status(201).json(rule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
