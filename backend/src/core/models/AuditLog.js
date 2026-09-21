const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'POS_SESSION_OPEN',
      'POS_SESSION_CLOSE',
      'POS_SESSION_FORCE_CLOSE',
      'POS_AUDIT_SUBMIT',
      'POS_AUDIT_RESOLVE',
      'POS_ORDER_CREATE',
      'POS_RETURN_CREATE',
      'SET_POS_PIN',
      'MANAGER_AUTHORIZATION_FAILURE',
      'MANAGER_AUTHORIZATION_SUCCESS'
    ]
  },
  entityType: {
    type: String,
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POSSession'
  },
  registerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Register'
  },
  reason: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: { createdAt: 'timestamp', updatedAt: false } // Only track creation time
});

// Indexes
auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, branchId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, entityType: 1, timestamp: -1 });

// Immutability Hooks
const immutableError = () => new Error('AuditLog is immutable and cannot be updated or deleted');

auditLogSchema.pre('save', function(next) {
  if (!this.isNew) {
    const err = immutableError();
    if (typeof next === 'function') return next(err);
    throw err;
  }
  if (typeof next === 'function') next();
});

const mutationHooks = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findByIdAndUpdate',
  'replaceOne',
  'findOneAndReplace',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete'
];

mutationHooks.forEach(hook => {
  auditLogSchema.pre(hook, function(next) {
    const err = immutableError();
    if (typeof next === 'function') return next(err);
    throw err;
  });
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
