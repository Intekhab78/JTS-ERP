const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a company name']
  },
  legalName: {
    type: String
  },
  domain: {
    type: String,
    unique: true,
    sparse: true
  },
  taxId: {
    type: String
  },
  registrationNumber: {
    type: String
  },
  industry: {
    type: String
  },
  companyType: {
    type: String
  },
  contact: {
    email: String,
    phone: String,
    website: String
  },
  currency: {
    type: String,
    default: 'USD'
  },
  address: {
    street: String,
    addressLine2: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    type: Object,
    default: {
      timeZone: 'UTC',
      fiscalYearStart: 'January',
      dateFormat: 'YYYY-MM-DD',
      posMaxDiscountLimit: 10,
      posVarianceLimit: 0
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', companySchema);
