const mongoose = require('mongoose');

const employeeIdentificationSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  identificationType: { type: String, required: true }, // e.g. SSN, PAN, Emirates ID
  identificationNumber: { type: String, required: true }, // Encrypted/Sensitive
  maskedIdentificationNumber: { type: String, required: true }, // To show on UI by default
  issuingCountry: { type: String },
  issueDate: Date,
  expiryDate: Date,
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'NOT_PROVIDED'],
    default: 'ACTIVE'
  },
  remarks: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

employeeIdentificationSchema.index({ tenantId: 1, employeeId: 1, identificationType: 1 });

module.exports = mongoose.model('EmployeeIdentification', employeeIdentificationSchema);
