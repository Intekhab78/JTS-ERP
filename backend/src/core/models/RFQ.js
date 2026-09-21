const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  rfqNumber: {
    type: String,
    required: true,
    unique: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'AED'
  },
  paymentTerms: {
    type: String
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'QUOTED', 'CONFIRMED', 'CANCELLED'],
    default: 'DRAFT'
  },
  expectedDate: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

rfqSchema.index({ tenantId: 1, rfqNumber: 1 }, { unique: true });

module.exports = mongoose.model('RFQ', rfqSchema);
