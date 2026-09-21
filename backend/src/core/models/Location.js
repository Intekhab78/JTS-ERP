const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  address: { type: String, trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

locationSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Location', locationSchema);
