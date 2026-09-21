const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a role name']
  },
  description: {
    type: String
  },
  permissions: [{
    type: String // e.g., 'CREATE_USER', 'VIEW_INVENTORY', 'MANAGE_ROLES'
  }],
  isSystem: {
    type: Boolean,
    default: false // Set to true for default roles that cannot be deleted
  }
}, {
  timestamps: true
});

// A tenant cannot have duplicate role names
roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Role', roleSchema);
