const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

designationSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Designation', designationSchema);
