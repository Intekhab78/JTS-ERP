const mongoose = require('mongoose');
const VendorPayment = require('../../core/models/VendorPayment');
const VendorBill = require('../../core/models/VendorBill');
const Counter = require('../../core/models/Counter');
const { verifyBranchAccess } = require('../../core/middleware/authMiddleware');

const generatePaymentNumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  const counterId = `VP_${currentYear}`;
  
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `VP-${currentYear}-${seqStr}`;
};

exports.getVendorPayments = async (req, res) => {
  try {
    const payments = await VendorPayment.find({ tenantId: req.user.tenantId, isActive: true })
      .populate('branchId', 'name')
      .populate('supplierId', 'name')
      .populate('vendorBillId', 'billNumber')
      .sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getVendorPaymentById = async (req, res) => {
  try {
    const payment = await VendorPayment.findOne({ _id: req.params.id, tenantId: req.user.tenantId, isActive: true })
      .populate('branchId', 'name')
      .populate('supplierId', 'name')
      .populate('vendorBillId', 'billNumber')
      .populate('createdBy', 'firstName lastName');
    if (!payment) return res.status(404).json({ message: 'Vendor Payment not found' });
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createVendorPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tenantId = req.user.tenantId;
    const { vendorBillId, amount, paymentMethod, paymentDate, reference, notes } = req.body;
    
    if (amount <= 0) throw new Error('Payment amount must be greater than zero');

    const bill = await VendorBill.findOne({ _id: vendorBillId, tenantId }).session(session);
    if (!bill) throw new Error('Vendor Bill not found');
    
    // Auth Check
    const isAuthorized = await verifyBranchAccess(bill.branchId, req);
    if (!isAuthorized) throw new Error('Forbidden: You do not have access to this branch');

    if (bill.status !== 'POSTED' && bill.status !== 'PARTIALLY_PAID') {
      throw new Error(`Payments can only be registered for POSTED or PARTIALLY_PAID bills. Current status: ${bill.status}`);
    }

    if (amount > bill.balanceDue) {
      throw new Error(`Payment amount (${amount}) cannot exceed the balance due (${bill.balanceDue})`);
    }

    const paymentNumber = await generatePaymentNumber(tenantId, session);

    const payment = await VendorPayment.create([{
      tenantId,
      branchId: bill.branchId,
      supplierId: bill.supplierId,
      vendorBillId: bill._id,
      paymentNumber,
      amount,
      paymentMethod,
      paymentDate: paymentDate || new Date(),
      reference,
      notes,
      createdBy: req.user._id
    }], { session });

    bill.amountPaid += amount;
    bill.balanceDue = bill.grandTotal - bill.amountPaid;

    // Rounding safety for floating point
    if (Math.abs(bill.balanceDue) < 0.01) {
      bill.balanceDue = 0;
      bill.status = 'PAID';
    } else {
      bill.status = 'PARTIALLY_PAID';
    }

    await bill.save({ session });
    await session.commitTransaction();
    
    res.status(201).json(payment[0]);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
