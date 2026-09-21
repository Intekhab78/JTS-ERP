const AuditLog = require('../../core/models/AuditLog');

/**
 * Logs an audit event synchronously (non-transactional).
 * Use this when there is no active MongoDB transaction.
 * Will throw an error if logging fails, intentionally blocking the operation.
 */
exports.logAuditEventSync = async (req, auditData) => {
  const logEntry = {
    tenantId: req.user.tenantId,
    userId: req.user._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    ...auditData
  };

  try {
    await AuditLog.create(logEntry);
  } catch (error) {
    console.error('AuditLog creation failed:', error);
    throw new Error('Critical failure: Unable to write audit log.');
  }
};

/**
 * Logs an audit event within an active MongoDB transaction.
 * If the transaction rolls back, the audit log will also roll back.
 * If the audit log fails, it will cause the transaction to fail.
 */
exports.logAuditEventTx = async (req, auditData, session) => {
  if (!session) {
    throw new Error('logAuditEventTx requires a MongoDB session');
  }

  const logEntry = {
    tenantId: req.user.tenantId,
    userId: req.user._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    ...auditData
  };

  try {
    await AuditLog.create([logEntry], { session });
  } catch (error) {
    console.error('Transactional AuditLog creation failed:', error);
    throw new Error('Critical failure: Unable to write audit log within transaction.');
  }
};
