const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate a secure key before saving
apiKeySchema.pre('validate', function() {
  if (this.isNew && !this.key) {
    this.key = 'erp_' + crypto.randomBytes(32).toString('hex');
  }
});

module.exports = mongoose.model('ApiKey', apiKeySchema);
