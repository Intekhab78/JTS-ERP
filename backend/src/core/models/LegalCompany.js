const mongoose = require('mongoose');

const legalCompanySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  name: {
    type: String,
    required: [true, 'Please add a legal company name'],
    trim: true
  },
  code: {
    type: String,
    trim: true
  },
  legalName: {
    type: String
  },
  country: {
    type: String
  },
  countryCode: {
    type: String
  },
  baseCurrency: {
    type: String,
    required: [true, 'Please add a base currency (e.g. USD, INR, AED)'],
    default: 'USD'
  },
  taxId: {
    type: String
  },
  registrationNumber: {
    type: String
  },
  address: {
    street: String,
    addressLine2: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  settings: {
    type: Object,
    default: {
      timeZone: 'UTC',
      fiscalYearStart: 'January',
      dateFormat: 'YYYY-MM-DD'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

legalCompanySchema.index({ tenantId: 1, groupId: 1 });
legalCompanySchema.index({ tenantId: 1, name: 1 });
legalCompanySchema.index({ tenantId: 1, code: 1 });

module.exports = mongoose.model('LegalCompany', legalCompanySchema);
