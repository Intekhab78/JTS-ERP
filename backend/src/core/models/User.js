const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false // For super-admins, this might be null
  },
  firstName: {
    type: String,
    required: [true, 'Please add a first name']
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false // Do not return password by default
  },
  posPin: {
    type: String,
    select: false // Dedicated PIN for POS overrides
  },
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  },
  branches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }],
  groupIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  legalCompanyIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LegalCompany'
  }],
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  mobile: {
    type: String
  },
  portalAccess: {
    type: String,
    enum: ['NO ACCESS', 'WEB LOGIN', 'MOBILE LOGIN', 'WEB + MOBILE'],
    default: 'NO ACCESS'
  },
  lastLogin: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  }
}, {
  timestamps: true
});

// Encrypt password and posPin using bcrypt
userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  if (this.isModified('posPin') && this.posPin) {
    const salt = await bcrypt.genSalt(10);
    this.posPin = await bcrypt.hash(this.posPin, salt);
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Match entered POS PIN to hashed posPin in database
userSchema.methods.matchPosPin = async function(enteredPin) {
  if (!this.posPin || !enteredPin) return false;
  return await bcrypt.compare(enteredPin, this.posPin);
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(24).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour

  return resetToken;
};

// Resolve dynamic Group-of-Companies scope
userSchema.methods.resolveScope = async function(activeTenantId) {
  const LegalCompany = mongoose.model('LegalCompany');
  const Branch = mongoose.model('Branch');
  const Role = mongoose.model('Role');
  const Company = mongoose.model('Company'); // Workspace
  
  const scope = { tenantId: null, accessibleCompanyIds: [], accessibleBranchIds: [] };

  const isGlobalAdmin = !this.tenantId;

  if (isGlobalAdmin) {
    if (!activeTenantId) {
      return scope;
    }
    
    // Verify target workspace exists
    const workspace = await Company.findById(activeTenantId);
    if (!workspace) {
      return scope; // Invalid workspace
    }
    scope.tenantId = activeTenantId;
  } else {
    scope.tenantId = this.tenantId;
  }

  const targetTenantId = scope.tenantId;

  let isTenantAdmin = false;
  if (!isGlobalAdmin) {
    if (!this.roleId) {
      isTenantAdmin = true; // Fallback for super users without a specific role
    } else if (this.populated('roleId')) {
      isTenantAdmin = this.roleId.name && this.roleId.name.toUpperCase() === 'TENANT ADMIN';
    } else {
      const role = await Role.findById(this.roleId).select('name');
      isTenantAdmin = role && role.name && role.name.toUpperCase() === 'TENANT ADMIN';
    }
  }

  let companyIds = new Set();

  if (isGlobalAdmin || isTenantAdmin) {
    // Legacy behavior: access all companies in the tenant workspace
    const allCompanies = await LegalCompany.find({ tenantId: targetTenantId }).select('_id');
    allCompanies.forEach(c => companyIds.add(c._id.toString()));
  } else {
    // 1. Explicitly assigned legal companies
    if (this.legalCompanyIds && this.legalCompanyIds.length > 0) {
      // Must verify they actually belong to the user's tenant
      const validCompanies = await LegalCompany.find({ 
        _id: { $in: this.legalCompanyIds }, 
        tenantId: targetTenantId 
      }).select('_id');
      validCompanies.forEach(c => companyIds.add(c._id.toString()));
    }

    // 2. Inherited companies via Group assignment
    if (this.groupIds && this.groupIds.length > 0) {
      // Must verify group companies belong to the user's tenant
      const groupCompanies = await LegalCompany.find({ 
        groupId: { $in: this.groupIds }, 
        tenantId: targetTenantId 
      }).select('_id');
      groupCompanies.forEach(c => companyIds.add(c._id.toString()));
    }
  }

  scope.accessibleCompanyIds = Array.from(companyIds);

  // 3. Resolve Branches based on resolved companies
  const isBranchRestricted = this.branches && this.branches.length > 0;
  
  if (isBranchRestricted && !isGlobalAdmin && !isTenantAdmin) {
    // If restricted, grant ONLY assigned branches that ALSO belong to resolved companies
    const validBranches = await Branch.find({
      _id: { $in: this.branches },
      tenantId: targetTenantId,
      $or: [
        { legalCompanyId: { $in: scope.accessibleCompanyIds } },
        { legalCompanyId: { $exists: false } },
        { legalCompanyId: null }
      ]
    }).select('_id');
    
    scope.accessibleBranchIds = validBranches.map(b => b._id.toString());
  } else {
    // If NOT restricted, they inherit access to ALL branches under their resolved companies
    if (scope.accessibleCompanyIds.length > 0) {
      const allCompanyBranches = await Branch.find({
        tenantId: targetTenantId,
        $or: [
          { legalCompanyId: { $in: scope.accessibleCompanyIds } },
          { legalCompanyId: { $exists: false } },
          { legalCompanyId: null }
        ]
      }).select('_id');
      
      scope.accessibleBranchIds = allCompanyBranches.map(b => b._id.toString());
    }
  }

  return scope;
};

module.exports = mongoose.model('User', userSchema);
