const mongoose = require('mongoose');

const posPaymentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  posOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POSOrder',
    required: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POSSession',
    required: true
  },
  method: {
    type: String,
    enum: ['CASH', 'CARD', 'ONLINE', 'OTHER'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  cashTendered: {
    type: Number
  },
  changeDue: {
    type: Number
  },
  reference: {
    type: String
  },
  currency: {
    type: String
  },
  paidAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('POSPayment', posPaymentSchema);
