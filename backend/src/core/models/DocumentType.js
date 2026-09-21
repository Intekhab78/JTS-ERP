const mongoose = require('mongoose');

const documentTypeSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Please add a document type name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please add a code'],
    uppercase: true,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  isMandatory: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Enforce tenant-scoped unique code
documentTypeSchema.index({ tenantId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('DocumentType', documentTypeSchema);
