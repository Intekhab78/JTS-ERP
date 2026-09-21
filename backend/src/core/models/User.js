const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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

module.exports = mongoose.model('User', userSchema);
