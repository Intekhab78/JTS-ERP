const POSSession = require('../../core/models/POSSession');
const POSPayment = require('../../core/models/POSPayment');
const { verifyBranchAccess, verifyPOSOverrideToken } = require('../../core/middleware/authMiddleware');
const auditService = require('../audit/auditService');
const Company = require('../../core/models/Company');

/**
 * Policy-aware session lookup helper.
 *
 * SINGLE_CASHIER:  finds an OPEN session where openedBy = req.user._id
 *                   (and optionally matches branchId / registerId).
 * MULTIPLE_CASHIERS: finds an OPEN session on the given register where the
 *                   user is the opener OR is already in authorizedCashiers[].
 *
 * Returns the session or null.
 * Throws an Error with a user-facing message when the cashier is not
 * authorised to use the session found (SINGLE_CASHIER mode, wrong cashier).
 */
exports.getPOSSessionForCashier = async (req, { branchId, registerId } = {}) => {
  const company = await Company.findById(req.user.tenantId).select('settings');
  const policy = company?.settings?.posCashierPolicy || 'SINGLE_CASHIER';

  if (policy === 'MULTIPLE_CASHIERS') {
    // Find the OPEN session on this register (or branch if no registerId given)
    const query = {
      tenantId: req.user.tenantId,
      status: 'OPEN'
    };
    if (registerId) {
      query.registerId = registerId;
    } else if (branchId) {
      query.branchId = branchId;
    }

    const session = await POSSession.findOne(query);

    if (!session) return null;

    const userId = req.user._id.toString();
    const isOpener = session.openedBy.toString() === userId;
    const isAuthorized = isOpener || session.authorizedCashiers.some(id => id.toString() === userId);

    if (!isAuthorized) {
      // The session exists but this cashier has not joined it
      throw new Error('No active POS session found for this user. Please open or join a session first.');
    }

    return session;
  }

  // SINGLE_CASHIER — original behaviour
  const query = {
    tenantId: req.user.tenantId,
    openedBy: req.user._id,
    status: 'OPEN'
  };
  if (branchId) query.branchId = branchId;
  return POSSession.findOne(query);
};

// @desc    Open a new POS session
// @route   POST /api/v1/pos/sessions/open
// @access  Private
exports.openSession = async (req, res) => {
  try {
    const { branchId, registerId, locationId, openingCash, openingDenominations, notes } = req.body;

    if (!branchId || !registerId || openingCash === undefined) {
      return res.status(400).json({ message: 'Branch ID, Register ID, and Opening Cash are required' });
    }

    if (typeof openingCash !== 'number' || isNaN(openingCash) || !isFinite(openingCash)) {
      return res.status(400).json({ message: 'Opening cash must be a valid finite number' });
    }

    if (openingCash < 0) {
      return res.status(400).json({ message: 'Opening cash cannot be negative' });
    }

    const isAuthorized = await verifyBranchAccess(branchId, req);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this branch' });
    }

    // Verify register belongs to tenant and branch and is ACTIVE
    const Register = require('../../core/models/Register');
    const register = await Register.findOne({
      _id: registerId,
      tenantId: req.user.tenantId,
      branchId: branchId
    });

    if (!register) {
      return res.status(404).json({ message: 'Register not found or does not belong to the selected branch' });
    }

    if (register.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'This register is not currently ACTIVE.' });
    }

    // Read the company cashier policy
    const company = await Company.findById(req.user.tenantId).select('settings');
    const policy = company?.settings?.posCashierPolicy || 'SINGLE_CASHIER';

    // Check for an existing OPEN session on this register
    const registerInUse = await POSSession.findOne({
      registerId,
      status: 'OPEN'
    });

    // ── MULTIPLE_CASHIERS: Join the existing session ──────────────────────────
    if (policy === 'MULTIPLE_CASHIERS' && registerInUse) {
      const userId = req.user._id.toString();
      const isOpener = registerInUse.openedBy.toString() === userId;
      const alreadyAuthorized = registerInUse.authorizedCashiers.some(id => id.toString() === userId);

      if (!isOpener && !alreadyAuthorized) {
        // Add this cashier to authorizedCashiers
        registerInUse.authorizedCashiers.push(req.user._id);
        await registerInUse.save();

        await auditService.logAuditEventSync(req, {
          action: 'POS_SESSION_CASHIER_JOIN',
          entityType: 'POSSession',
          entityId: registerInUse._id,
          branchId: registerInUse.branchId,
          registerId: registerInUse.registerId,
          sessionId: registerInUse._id,
          metadata: {
            joinedCashierId: req.user._id,
            sessionOpenedBy: registerInUse.openedBy
          }
        });
      }

      // Return the existing session with a joined flag so the frontend knows
      const populatedSession = await POSSession.findById(registerInUse._id)
        .populate('branchId', 'name')
        .populate('registerId', 'name code')
        .populate('openedBy', 'firstName lastName')
        .populate('authorizedCashiers', 'firstName lastName');

      return res.status(200).json({ ...populatedSession.toObject(), joined: true });
    }

    // ── SINGLE_CASHIER or MULTIPLE_CASHIERS first opener ─────────────────────
    // Block if register is already in use (SINGLE_CASHIER, or no open session to join)
    if (registerInUse) {
      return res.status(400).json({ message: 'Another active session is already using this register.' });
    }

    // In SINGLE_CASHIER: also prevent the same cashier from opening 2 sessions
    if (policy === 'SINGLE_CASHIER') {
      const existingUserSession = await POSSession.findOne({
        tenantId: req.user.tenantId,
        openedBy: req.user._id,
        status: 'OPEN'
      });
      if (existingUserSession) {
        return res.status(400).json({ message: 'You already have an active POS session. Please close it first.' });
      }
    }

    // Build initial authorizedCashiers — include opener so the array is never empty
    const initialAuthorizedCashiers = policy === 'MULTIPLE_CASHIERS' ? [req.user._id] : [];

    const session = await POSSession.create({
      tenantId: req.user.tenantId,
      branchId,
      registerId,
      locationId: locationId || undefined,
      openedBy: req.user._id,
      authorizedCashiers: initialAuthorizedCashiers,
      openingCash,
      openingDenominations: openingDenominations || [],
      notes
    });

    await auditService.logAuditEventSync(req, {
      action: 'POS_SESSION_OPEN',
      entityType: 'POSSession',
      entityId: session._id,
      branchId: session.branchId,
      registerId: session.registerId,
      sessionId: session._id,
      metadata: { openingCash: session.openingCash, policy }
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current active POS session
// @route   GET /api/v1/pos/sessions/active
// @access  Private
exports.getActiveSession = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find session where user is opener OR is in authorizedCashiers
    // This works for both SINGLE_CASHIER (opener only) and MULTIPLE_CASHIERS (any authorized cashier)
    const session = await POSSession.findOne({
      tenantId: req.user.tenantId,
      status: 'OPEN',
      $or: [
        { openedBy: userId },
        { authorizedCashiers: userId }
      ]
    })
      .populate('branchId', 'name')
      .populate('registerId', 'name code')
      .populate('openedBy', 'firstName lastName')
      .populate('authorizedCashiers', 'firstName lastName');

    if (!session) {
      return res.status(404).json({ message: 'No active session found' });
    }

    const payments = await POSPayment.aggregate([
      { $match: { sessionId: session._id } },
      { $group: { _id: '$method', total: { $sum: '$amount' } } }
    ]);

    let currentCashSales = 0;
    let currentTotalSales = 0;

    payments.forEach(p => {
      currentTotalSales += p.total;
      if (p._id && p._id.toUpperCase() === 'CASH') {
        currentCashSales += p.total;
      }
    });

    const sessionObj = session.toObject();
    sessionObj.currentCashSales = currentCashSales;
    sessionObj.currentTotalSales = currentTotalSales;

    res.status(200).json(sessionObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Close an active POS session
// @route   POST /api/v1/pos/sessions/:id/close
// @access  Private
exports.closeSession = async (req, res) => {
  try {
    const { closingCash, closingDenominations, notes, overrideToken } = req.body;

    if (closingCash === undefined) {
      return res.status(400).json({ message: 'Closing cash is required' });
    }

    const session = await POSSession.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'CLOSED') {
      return res.status(400).json({ message: 'Session is already closed' });
    }
    if (session.status === 'CLOSING_AUDIT') {
      return res.status(400).json({ message: 'Session is currently pending audit and cannot be closed normally' });
    }

    if (session.openedBy.toString() !== req.user._id.toString()) {
      const roleName = req.user.roleId?.name || req.user.roleName || '';
      const perms = req.user.roleId?.permissions || req.user.permissions || [];
      const hasOverride = roleName === 'TENANT ADMIN' || roleName === 'admin' || roleName === 'sales_manager' || perms.includes('*') || perms.includes('MANAGE_COMPANY');

      if (!hasOverride) {
        return res.status(403).json({ message: 'Forbidden: You can only close your own POS session unless you have an administrative override.' });
      }
    }

    // Calculate expected cash
    // expectedCash = openingCash + sum(CASH payments in this session) - sum(CASH refunds in this session)
    // For now, we only have POSPayment, POSReturn refund logic will need to insert negative CASH payments or we calculate from POSReturn

    // Sum CASH payments
    const cashPayments = await POSPayment.aggregate([
      {
        $match: {
          sessionId: session._id,
          method: 'CASH'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const cashSalesAmount = cashPayments.length > 0 ? cashPayments[0].total : 0;

    // Expected cash
    const expectedCash = session.openingCash + cashSalesAmount;
    const cashDifference = closingCash - expectedCash;

    // Fetch company settings for variance limit
    const company = await Company.findById(req.user.tenantId);
    const posVarianceLimit = company?.settings?.posVarianceLimit || 0;

    let overriddenByRole = null;
    let overrideManagerId = null;

    if (Math.abs(cashDifference) > posVarianceLimit) {
      if (!overrideToken) {
        return res.status(403).json({
          message: `Variance exceeds limit of ${posVarianceLimit} AED. Manager override required.`,
          requiresOverride: true
        });
      }

      req.body.context = { branchId: session.branchId };
      const decoded = verifyPOSOverrideToken(overrideToken, 'OVERRIDE_SESSION_VARIANCE', req);
      overrideManagerId = decoded.managerId;
      overriddenByRole = 'Manager Override';
    }

    session.status = 'CLOSED';
    session.closedBy = req.user._id;
    session.closedAt = new Date();
    session.closingCash = closingCash;
    session.closingDenominations = closingDenominations || [];
    session.expectedCash = expectedCash;
    session.cashDifference = cashDifference;
    if (notes) {
      session.notes = session.notes ? session.notes + '\n' + notes : notes;
    }

    await session.save();

    const isForceClose = session.openedBy.toString() !== req.user._id.toString();
    const action = isForceClose ? 'POS_SESSION_FORCE_CLOSE' : 'POS_SESSION_CLOSE';
    let reasonText = null;

    if (isForceClose) {
      reasonText = 'Manager force close';
      overriddenByRole = req.user.roleId?.name || req.user.roleName || 'UNKNOWN';
    } else if (overrideManagerId) {
      reasonText = 'Manager variance override';
    }

    await auditService.logAuditEventSync(req, {
      action,
      entityType: 'POSSession',
      entityId: session._id,
      branchId: session.branchId,
      registerId: session.registerId,
      sessionId: session._id,
      reason: reasonText,
      metadata: {
        expectedCash,
        closingCash,
        cashDifference,
        overriddenByRole,
        managerId: overrideManagerId
      }
    });

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit POS session for variance audit
// @route   POST /api/v1/pos/sessions/:id/submit-audit
// @access  Private
exports.submitForAudit = async (req, res) => {
  try {
    const { closingCash, closingDenominations } = req.body;

    if (closingCash === undefined) {
      return res.status(400).json({ message: 'Closing cash is required' });
    }

    const session = await POSSession.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'CLOSED') {
      return res.status(400).json({ message: 'Session is already closed' });
    }

    if (session.status === 'CLOSING_AUDIT') {
      return res.status(400).json({ message: 'Session is already pending audit' });
    }

    if (session.openedBy.toString() !== req.user._id.toString()) {
      const roleName = req.user.roleId?.name || req.user.roleName || '';
      const perms = req.user.roleId?.permissions || req.user.permissions || [];
      const hasOverride = roleName === 'TENANT ADMIN' || roleName === 'admin' || roleName === 'sales_manager' || perms.includes('*') || perms.includes('MANAGE_COMPANY');

      if (!hasOverride) {
        return res.status(403).json({ message: 'Forbidden: You can only submit your own POS session unless you have an administrative override.' });
      }
    }

    const POSPayment = require('../../core/models/POSPayment');
    const Company = require('../../core/models/Company');
    const cashPayments = await POSPayment.aggregate([
      { $match: { sessionId: session._id, method: 'CASH' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const cashSalesAmount = cashPayments.length > 0 ? cashPayments[0].total : 0;
    const expectedCash = session.openingCash + cashSalesAmount;
    const cashDifference = closingCash - expectedCash;

    const company = await Company.findById(req.user.tenantId);
    const posVarianceLimit = company?.settings?.posVarianceLimit || 0;

    if (Math.abs(cashDifference) <= posVarianceLimit) {
      return res.status(400).json({ message: 'Variance is within acceptable limits. Audit submission is not required. Please close the session normally.' });
    }

    session.status = 'CLOSING_AUDIT';
    session.closingCash = closingCash;
    session.closingDenominations = closingDenominations || [];
    session.expectedCash = expectedCash;
    session.cashDifference = cashDifference;

    session.auditRequired = true;
    session.auditStatus = 'PENDING';
    session.auditSubmittedBy = req.user._id;
    session.auditSubmittedAt = new Date();

    await session.save();

    await auditService.logAuditEventSync(req, {
      action: 'POS_AUDIT_SUBMIT',
      entityType: 'POSSession',
      entityId: session._id,
      branchId: session.branchId,
      registerId: session.registerId,
      sessionId: session._id,
      reason: 'Variance exceeds company limit',
      metadata: {
        expectedCash,
        closingCash,
        cashDifference,
        varianceLimit: posVarianceLimit,
        previousStatus: 'OPEN',
        newStatus: 'CLOSING_AUDIT'
      }
    });

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Resolve POS session audit
// @route   POST /api/v1/pos/sessions/:id/resolve-audit
// @access  Private
exports.resolveAudit = async (req, res) => {
  try {
    const { resolution, auditNotes, auditedDenominations } = req.body;

    if (!resolution || !['APPROVED', 'SHORTAGE_CONFIRMED', 'OVERAGE_CONFIRMED'].includes(resolution)) {
      return res.status(400).json({ message: 'Valid resolution is required' });
    }

    const session = await POSSession.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'OPEN') {
      return res.status(400).json({ message: 'Session is currently OPEN and has not been submitted for audit' });
    }

    if (session.status === 'CLOSED') {
      return res.status(400).json({ message: 'Session is already closed' });
    }

    if (session.status !== 'CLOSING_AUDIT' || session.auditStatus !== 'PENDING') {
      return res.status(400).json({ message: 'Session is not pending audit' });
    }

    session.status = 'CLOSED';
    session.closedBy = req.user._id;
    session.closedAt = new Date();

    session.auditStatus = 'RESOLVED';
    session.auditReviewedBy = req.user._id;
    session.auditReviewedAt = new Date();
    session.auditResolution = resolution;
    if (auditNotes) session.auditNotes = auditNotes;
    if (auditedDenominations) session.auditedDenominations = auditedDenominations;

    await session.save();

    await auditService.logAuditEventSync(req, {
      action: 'POS_AUDIT_RESOLVE',
      entityType: 'POSSession',
      entityId: session._id,
      branchId: session.branchId,
      registerId: session.registerId,
      sessionId: session._id,
      reason: auditNotes || resolution,
      metadata: {
        variance: session.cashDifference,
        resolution,
        previousStatus: 'CLOSING_AUDIT',
        newStatus: 'CLOSED'
      }
    });

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all POS sessions
// @route   GET /api/v1/pos/sessions
// @access  Private
exports.getAllSessions = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const query = { tenantId: req.user.tenantId };

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';

    if (req.user.branches && req.user.branches.length > 0) {
      query.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      // Standard user with no branches assigned sees nothing
      query.branchId = { $in: [] };
    }

    if (req.query.branchId) {
      query.branchId = req.query.branchId;
    }

    const sessions = await POSSession.find(query)
      .populate('branchId', 'name')
      .populate('registerId', 'name code')
      .populate('openedBy', 'firstName lastName')
      .populate('authorizedCashiers', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await POSSession.countDocuments(query);

    res.status(200).json({
      data: sessions,
      pagination: {
        total,
        count: sessions.length,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get POS sessions reconciliation report
// @route   GET /api/v1/pos/sessions/reconciliation
// @access  Private
exports.getReconciliationReport = async (req, res) => {
  try {
    const { branchId, registerId, openedBy, status, startDate, endDate } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const query = { tenantId: req.user.tenantId };

    const hasWildcard = req.user.roleId?.permissions?.includes('*') || req.user.roleId?.name === 'TENANT ADMIN';
    if (req.user.branches && req.user.branches.length > 0) {
      query.branchId = { $in: req.user.branches };
    } else if (!hasWildcard) {
      query.branchId = { $in: [] };
    }

    if (branchId) query.branchId = branchId;
    if (registerId) query.registerId = registerId;
    if (openedBy) query.openedBy = openedBy;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.openedAt = {};
      if (startDate) query.openedAt.$gte = new Date(startDate);
      if (endDate) query.openedAt.$lte = new Date(endDate);
    }

    const sessions = await POSSession.find(query)
      .populate('branchId', 'name')
      .populate('registerId', 'name code')
      .populate('openedBy', 'firstName lastName')
      .populate('closedBy', 'firstName lastName')
      .populate('authorizedCashiers', 'firstName lastName')
      .sort({ openedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await POSSession.countDocuments(query);

    // Aggregate payments for these sessions
    const sessionIds = sessions.map(s => s._id);
    const payments = await POSPayment.aggregate([
      { $match: { sessionId: { $in: sessionIds } } },
      {
        $group: {
          _id: { sessionId: '$sessionId', method: '$method' },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Map payments to sessions
    const sessionData = sessions.map(session => {
      let currentCashSales = 0;
      let currentTotalSales = 0;

      payments.forEach(p => {
        if (p._id.sessionId && p._id.sessionId.toString() === session._id.toString()) {
          currentTotalSales += p.total;
          if (p._id.method && p._id.method.toUpperCase() === 'CASH') {
            currentCashSales += p.total;
          }
        }
      });

      const sessionObj = session.toObject();
      sessionObj.currentCashSales = currentCashSales;
      sessionObj.currentTotalSales = currentTotalSales;
      return sessionObj;
    });

    res.status(200).json({
      success: true,
      data: sessionData,
      pagination: {
        total,
        count: sessions.length,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
