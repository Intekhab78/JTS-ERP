const mongoose = require('mongoose');

const employeeDocumentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  documentTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentType' },
  documentType: {
    type: String, // Legacy, kept for backward compatibility
  },
  documentName: { type: String, required: true },
  documentNumber: String,
  issuingCountry: String,
  issueDate: Date,
  expiryDate: Date,
  fileUrl: { type: String }, // Legacy, kept for backward compatibility
  storageKey: { type: String }, // Protected file reference
  fileName: { type: String }, // Legacy
  originalFileName: { type: String },
  storedFileName: { type: String },
  mimeType: String,
  fileSize: Number,
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'NOT_PROVIDED'],
    default: 'ACTIVE'
  },
  notes: String,
  remarks: String, // Legacy
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
}, { timestamps: true });

employeeDocumentSchema.index({ tenantId: 1, employeeId: 1, documentType: 1 });
employeeDocumentSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('EmployeeDocument', employeeDocumentSchema);
