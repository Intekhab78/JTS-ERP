const mongoose = require('mongoose');
const PaymentReceipt = require('../../core/models/PaymentReceipt');
const TaxInvoice = require('../../core/models/TaxInvoice');
const Counter = require('../../core/models/Counter');

const generateReceiptNumber = async (tenantId, session) => {
  const currentYear = new Date().getFullYear();
  const counterId = `PAYMENT_RECEIPT_${currentYear}`;
  
  const counter = await Counter.findOneAndUpdate(
    { tenantId, sequenceName: counterId, year: currentYear },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true, session }
  );

  const seqStr = String(counter.sequenceValue).padStart(6, '0');
  return `PR-${currentYear}-${seqStr}`;
};

exports.createPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tenantId = req.user.tenantId;
    const { invoiceId, amount, paymentMethod, paymentDate, referenceNumber, notes } = req.body;

    if (!amount || amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const invoice = await TaxInvoice.findOne({ _id: invoiceId, tenantId }).session(session);
    if (!invoice) throw new Error('Tax Invoice not found');

    if (amount > invoice.balanceDue) {
      throw new Error(`Payment amount (${amount}) cannot exceed the balance due (${invoice.balanceDue}). Advance payments are not supported through this endpoint.`);
    }

    const receiptNumber = await generateReceiptNumber(tenantId, session);

    const payment = new PaymentReceipt({
      tenantId,
      branchId: invoice.branchId,
      receiptNumber,
      customerId: invoice.customerId,
      invoiceId: invoice._id,
      amount,
      paymentMethod: paymentMethod || 'BANK_TRANSFER',
      paymentDate: paymentDate || new Date(),
      referenceNumber,
      notes,
      createdBy: req.user._id
    });

    await payment.save({ session });

    invoice.amountPaid += amount;
    invoice.balanceDue = invoice.grandTotal - invoice.amountPaid;

    if (invoice.balanceDue <= 0) {
      invoice.status = 'PAID_FULL';
    } else {
      invoice.status = 'PARTIAL';
    }

    await invoice.save({ session });

    await session.commitTransaction();
    res.status(201).json(payment);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message || 'Error creating payment' });
  } finally {
    session.endSession();
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await PaymentReceipt.find({ tenantId: req.user.tenantId, isActive: true })
      .populate('invoiceId', 'invoiceNumber')
      .populate('customerId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
