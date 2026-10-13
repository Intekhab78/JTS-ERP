const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Branch = require('../models/Branch');
const Product = require('../models/Product');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token and populate role
      req.user = await User.findById(decoded.id).select('-password').populate('roleId');

      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ message: 'Not authorized, user disabled or not found' });
      }

      // Resolve dynamic scope server-side
      const activeTenantId = req.headers['x-tenant-id'];
      const scope = await req.user.resolveScope(activeTenantId);
      req.user.activeTenantId = scope.tenantId;
      req.user.accessibleCompanyIds = scope.accessibleCompanyIds;
      req.user.accessibleBranchIds = scope.accessibleBranchIds;

      next();
    } catch (error) {
      // Don't spam stack traces for normal JWT expiration/malformed errors
      if (error.name !== 'TokenExpiredError' && error.name !== 'JsonWebTokenError') {
        console.error(error);
      }
      res.status(401).json({ message: 'Not authorized, token failed: ' + error.message });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Global Admin Check
    const isGlobalAdmin = !req.user.tenantId;

    if (isGlobalAdmin) {
      if (!req.user.activeTenantId) {
        return res.status(403).json({ message: 'Forbidden: Global Admin must select a valid workspace (x-tenant-id) to access operational routes.' });
      }
      return next(); // Grant superuser bypass for the target tenant
    }

    // Normal User Check: must have a tenantId
    if (!req.user.tenantId) {
      return res.status(403).json({ message: 'Forbidden: Missing tenant context.' });
    }

    // Role check
    if (!req.user.roleId || !req.user.roleId.permissions) {
      return res.status(403).json({ message: 'User role has no permissions' });
    }

    const isTenantAdmin = req.user.roleId && req.user.roleId.name === 'TENANT ADMIN';
    const hasPermission = req.user.roleId.permissions.includes('*') || permissions.some(p => req.user.roleId.permissions.includes(p)) || isTenantAdmin;

    if (!hasPermission) {
      return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

const superAdminOnly = (req, res, next) => {
  if (req.user && !req.user.tenantId) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: Superadmin access required' });
};

const verifyBranchAccess = async (branchId, req) => {
  if (!branchId) return true;
  const tenantContext = req.user?.activeTenantId || req.user?.tenantId;
  if (!req.user || !tenantContext) return false;

  if (req.user.branchId && req.user.branchId.toString() !== branchId.toString()) {
    return false;
  }

  const branchExists = await Branch.exists({ _id: branchId, tenantId: tenantContext });
  if (!branchExists) return false;

  return true;
};

const verifyProductAccess = async (productId, req, requireActive = false) => {
  if (!productId) return true;
  const tenantContext = req.user?.activeTenantId || req.user?.tenantId;
  if (!req.user || !tenantContext) return false;

  const query = { _id: productId, tenantId: tenantContext };
  if (requireActive) {
    query.isActive = { $ne: false };
  }

  const productExists = await Product.exists(query);
  if (!productExists) return false;

  return true;
};

const verifyCustomerAccess = async (customerId, req) => {
  if (!customerId) return true; 
  const tenantContext = req.user?.activeTenantId || req.user?.tenantId;
  if (!req.user || !tenantContext) return false;

  const Customer = require('../models/Customer');
  const customerExists = await Customer.exists({ _id: customerId, tenantId: tenantContext });
  if (!customerExists) return false;

  return true;
};

const verifyPOSOverrideToken = (token, requiredAction, req) => {
  if (!token) {
    throw new Error('Override token missing');
  }
  
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  if (decoded.tokenType !== 'POS_OVERRIDE') {
    throw new Error('Invalid token type');
  }
  
  if (decoded.action !== requiredAction) {
    throw new Error(`Token action mismatch. Expected: ${requiredAction}`);
  }
  
  const tenantContext = req.user?.activeTenantId || req.user?.tenantId;
  if (!req.user || decoded.tenantId.toString() !== tenantContext.toString()) {
    throw new Error('Tenant mismatch in override token');
  }
  
  if (req.body.context && req.body.context.branchId && decoded.branchId) {
    if (decoded.branchId.toString() !== req.body.context.branchId.toString()) {
      throw new Error('Branch mismatch in override token');
    }
  }

  return decoded;
};

const verifyCompanyAccess = (req, res, next) => {
  const tenantContext = req.user?.activeTenantId || req.user?.tenantId;
  if (!req.user || !tenantContext) {
    return res.status(403).json({ message: 'Forbidden: Missing tenant context' });
  }

  const targetCompanyId = req.body.legalCompanyId || req.query.legalCompanyId || req.params.legalCompanyId;
  
  if (targetCompanyId) {
    if (!req.user.accessibleCompanyIds || !req.user.accessibleCompanyIds.includes(targetCompanyId.toString())) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this Legal Company.' });
    }
  }
  
  next();
};

module.exports = { protect, authorize, superAdminOnly, verifyBranchAccess, verifyProductAccess, verifyCustomerAccess, verifyPOSOverrideToken, verifyCompanyAccess };
