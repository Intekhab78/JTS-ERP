const mongoose = require('mongoose');

const jobLevelSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true },
  levelNumber: { type: Number },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

jobLevelSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('JobLevel', jobLevelSchema);
