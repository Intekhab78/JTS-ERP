const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  addressLine1: String,
  addressLine2: String,
  city: String,
  stateProvince: String, // updated from state to support provinces
  postalCode: String,    // updated from zipCode to postalCode
  country: String
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
  name: String,
  relationship: String,
  mobile: String,
  alternateMobile: String,
  email: String,
  address: String
}, { _id: false });

const familyMemberSchema = new mongoose.Schema({
  name: String,
  relationship: String,
  dateOfBirth: Date,
  gender: String,
  nationality: String,
  occupation: String,
  mobile: String,
  email: String,
  isDependent: Boolean,
  isEmergencyContact: Boolean,
  address: String,
  remarks: String,
  documentType: String,
  documentUrl: String,
  documentName: String
}, { _id: false });

const employeeSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  
  // System Link
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // A. Identity Information
  employeeCode: { type: String, unique: true, sparse: true },
  profilePhoto: {
    url: String,
    fileName: String,
    mimeType: String,
    size: Number,
    uploadedAt: Date
  },
  firstName: { type: String, required: true, trim: true },
  middleName: { type: String, trim: true },
  lastName: { type: String, required: true, trim: true },
  preferredName: { type: String, trim: true },
  
  // International Identity
  legalFirstName: { type: String, trim: true },
  legalMiddleName: { type: String, trim: true },
  legalLastName: { type: String, trim: true },
  countryOfBirth: String,
  preferredLanguage: String,
  timezone: String,

  dateOfBirth: Date,
  gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
  maritalStatus: { type: String, enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER'] },
  nationality: String,
  bloodGroup: String,
  religion: String,

  // Contact Info
  personalEmail: { type: String, match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'] },
  email: { type: String, match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email'] }, // Legacy/Work Email
  personalMobile: String,
  phone: String, // Legacy/Work Mobile
  alternateMobile: String,

  // Emergency Contact
  emergencyContacts: [emergencyContactSchema], // New array-based contacts
  
  // Legacy Emergency Contact (Keep for backward compatibility)
  emergencyContactName: String,
  emergencyContactRelation: String,
  emergencyContactMobile: String,

  // Family Details
  familyMembers: [familyMemberSchema],

  // Address
  currentAddress: addressSchema,
  permanentAddress: addressSchema,

  // B. Employment Information
  hireDate: { type: Date, required: true, default: Date.now }, // Legacy Joining Date
  joiningDate: { type: Date }, // Added new explicit joiningDate
  employmentType: { 
    type: String, 
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN', 'PROBATION', 'FREELANCE', 'CONSULTANT'],
    default: 'FULL_TIME'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'RETIRED', 'NOTICE_PERIOD'],
    default: 'ACTIVE'
  },
  
  // Organization
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  designationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  jobLevelId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobLevel' },
  
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  hrManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  
  jobTitle: { type: String, required: true }, // Legacy/Designation
  designation: String,
  jobLevel: String,
  employmentCategory: String,

  // Probation & Contract
  probationStartDate: Date,
  probationEndDate: Date,
  confirmationDate: Date,
  noticePeriod: Number,
  noticePeriodUnit: { type: String, enum: ['DAYS', 'WEEKS', 'MONTHS'] },
  contractNumber: String,
  contractStartDate: Date,
  contractEndDate: Date,
  
  // Termination
  resignationDate: Date,
  lastWorkingDate: Date, // Also serves as employmentEndDate
  terminationDate: Date,
  terminationReason: String, // Also serves as reasonForLeaving

  // Payroll / Bank
  baseSalary: { type: Number, required: true, min: 0 }, // Legacy, full salary mgmt is in EmployeeSalary.js
  bankDetails: {
    bankName: String,
    branchName: String,
    branchCode: String,
    accountHolderName: String,
    accountNumber: String,
    iban: String,
    swiftBic: String,
    ifscCode: String,
    routingNumber: String
  },

  // Attendance & Leave
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
  attendancePolicyId: { type: mongoose.Schema.Types.ObjectId },
  leavePolicyId: { type: mongoose.Schema.Types.ObjectId },
  biometricId: String,
  mobileAttendanceEnabled: Boolean,
  overtimeEligible: Boolean,
  overtimePolicyId: { type: mongoose.Schema.Types.ObjectId },

  // C. Statutory / Government Information (Legacy, use DocumentManager instead)
  pan: String,
  maskedAadhaar: String,
  uan: String,
  pfNumber: String,
  esiNumber: String,
  emiratesId: String,
  labourCardNumber: String,
  taxNumber: String,
  socialSecurityNumber: String

}, {
  timestamps: true
});

// A tenant cannot have duplicate employee codes
employeeSchema.index({ tenantId: 1, employeeCode: 1 }, { unique: true, partialFilterExpression: { employeeCode: { $exists: true } } });

module.exports = mongoose.model('Employee', employeeSchema);
