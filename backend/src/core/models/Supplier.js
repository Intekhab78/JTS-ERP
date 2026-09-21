const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  vendorCode: {
    type: String,
    sparse: true
  },
  vendorType: {
    type: String,
    enum: ['Transport', 'Packaging', 'Food', 'Other'],
    default: 'Other'
  },
  name: {
    type: String,
    required: [true, 'Please add a supplier name'],
    trim: true
  },
  contactName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  phone: {
    type: String
  },
  address: {
    type: String
  },
  taxId: {
    type: String
  },
  website: {
    type: String
  },
  contactDetails: {
    firstName: String,
    lastName: String,
    email: String,
    mobile: String
  },
  addressDetails: {
    address: String,
    city: String,
    state: String,
    zip: String,
    country: String
  },
  bankDetails: {
    bankName: String,
    accountHolderName: String,
    accountNo: String,
    ifsc: String,
    swift: String,
    branchName: String
  },
  legalDetails: {
    tradeLicense: String,
    tradeLicenseExpiryDate: Date,
    taxCertificate: String,
    taxRegistrationNumber: String,
    importLicenseNo: String,
    companyRegistrationNumber: String
  },
  documents: [{
    // New Compliance Fields
    documentType: {
      type: String,
      enum: ['TRADE_LICENSE', 'TAX_CERTIFICATE', 'IMPORT_LICENSE', 'OTHER_DOCUMENT', 'Other'] // Added 'Other' for existing docs
    },
    documentName: String,
    fileUrl: String,
    fileName: String,
    mimeType: String,
    fileSize: Number,
    expiryDate: Date,
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'NOT_PROVIDED'],
      default: 'ACTIVE'
    },
    uploadedAt: Date,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    // Existing fields for backward compatibility
    documentNumber: String,
    documentUrl: String,
    issueDate: Date,
    remarks: String
  }],
  remarks: {
    type: String
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE'
  },
  ownerPhoto: {
    url: String,
    fileName: String,
    mimeType: String,
    size: Number,
    uploadedAt: Date
  }
}, {
  timestamps: true
});

// Ensure vendorCode is unique per tenant
supplierSchema.index({ tenantId: 1, vendorCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Supplier', supplierSchema);
