const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

teamSchema.index({ tenantId: 1, departmentId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
