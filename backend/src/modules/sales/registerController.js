const Register = require('../../core/models/Register');
const POSSession = require('../../core/models/POSSession');
const { getReadFilter, validateBranchScope } = require('../../core/utils/scopeHelper');
const { verifyPOSOverrideToken } = require('../../core/middleware/authMiddleware');
const auditService = require('../audit/auditService');
const { getPOSSessionForCashier } = require('./posSessionController');

// @desc    Create a new POS Register
// @route   POST /api/v1/pos/registers
// @access  Private
exports.createRegister = async (req, res) => {
  try {
    const { branchId, name, code, description } = req.body;

    if (!branchId || !name || !code) {
      return res.status(400).json({ message: 'Branch ID, Name, and Code are required' });
    }

    try {
      await validateBranchScope(req, branchId);
    } catch (err) {
      return res.status(err.status || 403).json({ message: err.message || 'Forbidden' });
    }

    const existingCode = await Register.findOne({
      ...getReadFilter(req),
      branchId,
      code
    });

    if (existingCode) {
      return res.status(400).json({ message: 'Register code already exists for this branch' });
    }

    const Branch = require('../../core/models/Branch');
    const branchDoc = await Branch.findById(branchId);
    if (!branchDoc) return res.status(404).json({ message: 'Branch not found' });

    const register = await Register.create({
      legalCompanyId: branchDoc.legalCompanyId,
      tenantId: req.user.tenantId,
      branchId,
      name,
      code,
      description,
      createdBy: req.user._id
    });

    res.status(201).json(register);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all registers
// @route   GET /api/v1/pos/registers
// @access  Private
exports.getRegisters = async (req, res) => {
  try {
    const { branchId, status } = req.query;
    
    let query = { tenantId: req.user.tenantId };
    
    if (branchId) {
      try {
        await validateBranchScope(req, branchId);
      } catch (err) {
        return res.status(err.status || 403).json({ message: err.message || 'Forbidden' });
      }
      query.branchId = branchId;
    } else {
      // If user is restricted to specific branches, enforce it in query
      if (req.user.roleId?.name !== 'TENANT ADMIN' && !req.user.roleId?.permissions?.includes('*') && req.user.branches && req.user.branches.length > 0) {
        query.branchId = { $in: req.user.branches };
      }
    }
    
    if (status) {
      query.status = status;
    }

    const registers = await Register.find(query).populate('branchId', 'name');
    res.status(200).json(registers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single register
// @route   GET /api/v1/pos/registers/:id
// @access  Private
exports.getRegisterById = async (req, res) => {
  try {
    const register = await Register.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    }).populate('branchId', 'name');

    if (!register) {
      return res.status(404).json({ message: 'Register not found' });
    }

    try {
      await validateBranchScope(req, register.branchId._id);
    } catch (err) {
      return res.status(err.status || 403).json({ message: err.message || 'Forbidden' });
    }

    res.status(200).json(register);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a register
// @route   PUT /api/v1/pos/registers/:id
// @access  Private
exports.updateRegister = async (req, res) => {
  try {
    const { name, code, description, status } = req.body;
    
    const register = await Register.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!register) {
      return res.status(404).json({ message: 'Register not found' });
    }

    try {
      await validateBranchScope(req, register.branchId);
    } catch (err) {
      return res.status(err.status || 403).json({ message: err.message || 'Forbidden' });
    }

    // Protect against setting INACTIVE if there is an open session
    if (status === 'INACTIVE' && register.status === 'ACTIVE') {
      const activeSession = await POSSession.findOne({
        registerId: register._id,
        status: { $in: ['OPEN', 'CLOSING_AUDIT'] }
      });
      if (activeSession) {
        return res.status(400).json({ message: 'Cannot deactivate register while a POS session is OPEN on it. Close the session first.' });
      }
    }

    // Check for unique code if changed
    if (code && code !== register.code) {
      const existingCode = await Register.findOne({
        ...getReadFilter(req),
        branchId: register.branchId,
        code
      });
      if (existingCode) {
        return res.status(400).json({ message: 'Register code already exists for this branch' });
      }
    }

    register.name = name || register.name;
    register.code = code || register.code;
    register.description = description !== undefined ? description : register.description;
    register.status = status || register.status;

    await register.save();
    res.status(200).json(register);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Open Cash Drawer (No-Sale)
// @route   POST /api/v1/pos/registers/:id/drawer-open
// @access  Private
exports.openDrawer = async (req, res) => {
  try {
    const { reason, overrideToken } = req.body;

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ message: 'Reason is required and must be a string' });
    }

    const validatedReason = reason.trim();
    if (validatedReason.length < 5 || validatedReason.length > 150) {
      return res.status(400).json({ message: 'Reason must be between 5 and 150 characters' });
    }

    const register = await Register.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!register) {
      return res.status(404).json({ message: 'Register not found' });
    }

    try {
      await validateBranchScope(req, register.branchId);
    } catch (err) {
      return res.status(err.status || 403).json({ message: err.message || 'Forbidden' });
    }

    // Policy-aware: works for SINGLE_CASHIER (opener only) and MULTIPLE_CASHIERS (any authorized cashier)
    const activeSession = await getPOSSessionForCashier(req, { registerId: req.params.id });

    if (!activeSession) {
      return res.status(400).json({ message: 'Active POS session is required to open the drawer' });
    }

    const roleName = req.user.roleId?.name || req.user.roleName || '';
    const perms = req.user.roleId?.permissions || req.user.permissions || [];
    const hasPermission = roleName === 'TENANT ADMIN' || perms.includes('*') || perms.includes('OPEN_CASH_DRAWER');

    let decodedOverrideToken = null;

    if (!hasPermission) {
      if (!overrideToken) {
        return res.status(403).json({ message: 'Forbidden: OPEN_CASH_DRAWER permission or manager override required' });
      }

      req.body.context = req.body.context || {};
      req.body.context.branchId = register.branchId;

      try {
        decodedOverrideToken = verifyPOSOverrideToken(overrideToken, 'OPEN_CASH_DRAWER', req);
      } catch (error) {
        return res.status(401).json({ message: error.message });
      }
    }

    try {
      await auditService.logAuditEventSync(req, {
        action: 'CASH_DRAWER_OPEN_NO_SALE',
        entityType: 'Register',
        entityId: register._id,
        branchId: register.branchId,
        sessionId: activeSession._id,
        registerId: register._id,
        reason: validatedReason,
        metadata: {
          managerId: decodedOverrideToken?.managerId || null
        }
      });
    } catch (auditError) {
      return res.status(500).json({ message: auditError.message });
    }

    // TODO: Hardware Phase - dispatch physical cash drawer kick command.
    
    return res.status(200).json({
      success: true,
      message: 'Cash drawer open authorized',
      hardwareTriggered: false
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
