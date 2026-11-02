const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  provider: { type: String, required: true },
  method: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'SIMULATED', 'PAID', 'FAILED', 'REFUNDED'],
    required: true,
    default: 'PENDING'
  },
  providerOrderId: String,
  providerPaymentId: String,
  idempotencyKey: { type: String, unique: true, sparse: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
