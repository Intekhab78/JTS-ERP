const User = require('../models/User');
const Company = require('../models/Company');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');
const auditService = require('../../modules/audit/auditService');

// In-memory brute force tracker
const loginAttemptTracker = {};
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const VALID_POS_ACTIONS = [
  'OVERRIDE_POS_DISCOUNT',
  'OVERRIDE_POS_PRICE',
  'VOID_POS_ORDER',
  'OVERRIDE_POS_RETURN',
  'OPEN_CASH_DRAWER',
  'OVERRIDE_SESSION_VARIANCE'
];

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, tenantName } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    let tenantId = null;
    let roleId = null;

    if (tenantName) {
      // Check if company already exists
      const companyExists = await Company.findOne({ name: tenantName });
      if (companyExists) {
        return res.status(400).json({ message: 'Company name already in use' });
      }

      // Create company
      const company = await Company.create({ name: tenantName });
      tenantId = company._id;

      // Create Super Admin role for this company
      const role = await Role.create({
        tenantId: company._id,
        name: 'Tenant Admin',
        description: 'System generated super admin role',
        permissions: ['*'], // Wildcard permission
        isSystem: true
      });
      roleId = role._id;
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      tenantId,
      roleId
    });

    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      tenantId: user.tenantId,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email }).select('+password').populate('roleId');

    if (user && (await user.matchPassword(password))) {
      const isGlobalAdmin = !user.tenantId;
      const isTenantAdmin = user.tenantId && (!user.roleId || user.roleId.name === 'Tenant Admin');
      const roleName = user.roleId?.name || (user.tenantId ? 'Tenant Admin' : 'Global Admin');
      let permissions = user.roleId?.permissions || [];
      
      // Auto-grant wildcards to primary admins
      if ((isGlobalAdmin || isTenantAdmin) && !permissions.includes('*')) {
        permissions = ['*'];
      }

      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        tenantId: user.tenantId,
        permissions,
        roleName,
        branches: user.branches || [],
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile & latest permissions
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('roleId');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isGlobalAdmin = !user.tenantId;
    const isTenantAdmin = user.tenantId && (!user.roleId || user.roleId.name === 'Tenant Admin');
    const roleName = user.roleId?.name || (user.tenantId ? 'Tenant Admin' : 'Global Admin');
    let permissions = user.roleId?.permissions || [];
    
    if ((isGlobalAdmin || isTenantAdmin) && !permissions.includes('*')) {
      permissions = ['*'];
    }

    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      tenantId: user.tenantId,
      permissions,
      roleName,
      branches: user.branches || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request Manager POS Override
// @route   POST /api/v1/auth/manager-override
// @access  Private
exports.managerOverride = async (req, res) => {
  try {
    const { managerEmail, posPin, requestedAction, context } = req.body;

    if (!managerEmail || !posPin || !requestedAction) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!VALID_POS_ACTIONS.includes(requestedAction)) {
      return res.status(400).json({ message: 'Invalid requested action' });
    }

    const ip = req.ip || req.connection.remoteAddress;
    const trackerKey = `${ip}_${managerEmail.toLowerCase()}`;
    const now = Date.now();

    // Check rate limit
    if (loginAttemptTracker[trackerKey]) {
      if (loginAttemptTracker[trackerKey].lockoutUntil && now < loginAttemptTracker[trackerKey].lockoutUntil) {
        await auditService.logAuditEventSync(req, {
          action: 'MANAGER_AUTHORIZATION_FAILURE',
          entityType: 'User',
          entityId: req.user._id,
          metadata: { managerEmail, requestedAction, reason: 'Rate limit exceeded' },
          reason: 'Rate limit exceeded'
        });
        return res.status(429).json({ message: 'Too many failed attempts. Try again later.' });
      }
      if (loginAttemptTracker[trackerKey].lockoutUntil && now >= loginAttemptTracker[trackerKey].lockoutUntil) {
        delete loginAttemptTracker[trackerKey];
      }
    }

    // Lookup manager explicitly with posPin
    const manager = await User.findOne({ 
      email: managerEmail, 
      tenantId: req.user.tenantId 
    }).select('+posPin').populate('roleId');

    const handleFailure = async (reason, status) => {
      if (!loginAttemptTracker[trackerKey]) {
        loginAttemptTracker[trackerKey] = { attempts: 1 };
      } else {
        loginAttemptTracker[trackerKey].attempts += 1;
      }

      if (loginAttemptTracker[trackerKey].attempts >= MAX_ATTEMPTS) {
        loginAttemptTracker[trackerKey].lockoutUntil = now + LOCKOUT_MS;
      }

      await auditService.logAuditEventSync(req, {
        action: 'MANAGER_AUTHORIZATION_FAILURE',
        entityType: 'User',
        entityId: manager ? manager._id : req.user._id,
        metadata: { managerEmail, requestedAction, reason },
        reason
      });

      return res.status(status).json({ message: 'Unauthorized: ' + reason });
    };

    if (!manager) {
      return await handleFailure('Invalid credentials', 400);
    }

    if (!(await manager.matchPosPin(posPin))) {
      return await handleFailure('Invalid credentials', 400);
    }

    if (!manager.roleId || !manager.roleId.permissions) {
      return await handleFailure('Manager lacks required permission', 403);
    }

    const hasPermission = manager.roleId.permissions.includes('*') || manager.roleId.permissions.includes(requestedAction) || manager.roleId.name === 'Tenant Admin';
    if (!hasPermission) {
      return await handleFailure('Manager lacks required permission', 403);
    }

    if (context && context.branchId) {
      if (manager.branches && manager.branches.length > 0) {
        const isAuthorizedForBranch = manager.branches.some(b => b.toString() === context.branchId.toString());
        if (!isAuthorizedForBranch) {
          return await handleFailure('Manager not authorized for this branch', 403);
        }
      }
    }

    // Reset attempts on success
    delete loginAttemptTracker[trackerKey];

    await auditService.logAuditEventSync(req, {
      action: 'MANAGER_AUTHORIZATION_SUCCESS',
      entityType: 'User',
      entityId: manager._id,
      metadata: { managerId: manager._id, requestedAction, branchId: context?.branchId },
      reason: 'Manager Override Success'
    });

    const overrideToken = jwt.sign({
      managerId: manager._id,
      action: requestedAction,
      tenantId: manager.tenantId,
      branchId: context?.branchId,
      tokenType: 'POS_OVERRIDE'
    }, process.env.JWT_SECRET, { expiresIn: '2m' });

    res.status(200).json({ overrideToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set or change POS PIN
// @route   POST /api/v1/auth/set-pos-pin
// @access  Private
exports.setPosPin = async (req, res) => {
  try {
    const { posPin, userId } = req.body;
    
    if (!posPin) {
      return res.status(400).json({ message: 'POS PIN is required' });
    }

    if (posPin.length < 4 || posPin.length > 6) {
      return res.status(400).json({ message: 'POS PIN must be 4 to 6 digits' });
    }

    let targetUserId = req.user._id;

    if (userId && userId !== req.user._id.toString()) {
      // Admin setting someone else's PIN
      const hasPermission = req.user.roleId?.permissions?.includes('*') || 
                            req.user.roleId?.permissions?.includes('EDIT_USERS') ||
                            req.user.roleId?.name === 'TENANT ADMIN';
      if (!hasPermission) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to set PIN for other users' });
      }
      targetUserId = userId;
    }

    const user = await User.findOne({ _id: targetUserId, tenantId: req.user.tenantId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.posPin = posPin;
    await user.save(); // posPin is hashed in pre-save hook

    await auditService.logAuditEventSync(req, {
      action: 'SET_POS_PIN',
      entityType: 'User',
      entityId: user._id,
      metadata: { targetUserId: user._id, changedBy: req.user._id }
    });

    res.status(200).json({ message: 'POS PIN updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
