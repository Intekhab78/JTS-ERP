const mongoose = require('mongoose');

const checkIsAdmin = (req) => {
    if (!req.user) return false;
    // Global admin without tenantId is superadmin
    if (!req.user.tenantId) return true;
    // Role checks
    if (req.user.role && ['SUPER_ADMIN', 'ADMIN', 'TENANT ADMIN', 'SUPERADMIN'].includes(req.user.role.toUpperCase())) return true;
    if (req.user.roleId && req.user.roleId.name && ['SUPER_ADMIN', 'ADMIN', 'TENANT ADMIN', 'SUPERADMIN'].includes(req.user.roleId.name.toUpperCase())) return true;
    if (!req.user.roleId) return true; // Legacy unassigned role
    return false;
};

/**
 * Returns the base query filter for transactional READ operations.
 * Enforces tenantId and accessibleCompanyIds.
 * Supports legacy records missing legalCompanyId during the transition period if allowLegacy is true.
 */
const getReadFilter = (req, options = { allowLegacy: true }) => {
    const tenantId = req.user && (req.user.activeTenantId || req.user.tenantId);
    if (!tenantId) {
        throw { status: 403, message: 'Forbidden: Missing tenant context' };
    }

    const filter = {
        tenantId
    };

    const isAdmin = checkIsAdmin(req);
    const xCompanyId = req.headers ? req.headers['x-company-id'] : null;
    const accessibleCompanyIds = req.user.accessibleCompanyIds || [];

    if (xCompanyId && xCompanyId !== 'ALL' && xCompanyId !== 'null' && xCompanyId !== 'undefined') {
        const canAccess = isAdmin || accessibleCompanyIds.includes(xCompanyId.toString());
        if (!canAccess) {
            if (accessibleCompanyIds.length > 0) {
                // If header has a stale company ID that the user doesn't have access to,
                // fall back to their accessible companies rather than crashing the dashboard with 403!
                if (options.allowLegacy) {
                    filter.$or = [
                        { legalCompanyId: { $in: accessibleCompanyIds } },
                        { legalCompanyId: { $exists: false } },
                        { legalCompanyId: null }
                    ];
                } else {
                    filter.legalCompanyId = { $in: accessibleCompanyIds };
                }
            } else {
                throw { status: 403, message: 'Forbidden: You do not have access to the specified Legal Company context.' };
            }
        } else {
            if (options.allowLegacy) {
                filter.$or = [
                    { legalCompanyId: xCompanyId },
                    { legalCompanyId: { $exists: false } },
                    { legalCompanyId: null }
                ];
            } else {
                filter.legalCompanyId = xCompanyId;
            }
        }
    } else {
        if (!isAdmin && accessibleCompanyIds.length > 0) {
            if (options.allowLegacy) {
                filter.$or = [
                    { legalCompanyId: { $in: accessibleCompanyIds } },
                    { legalCompanyId: { $exists: false } },
                    { legalCompanyId: null }
                ];
            } else {
                filter.legalCompanyId = { $in: accessibleCompanyIds };
            }
        }
    }

    if (!isAdmin && req.user.accessibleBranchIds && req.user.accessibleBranchIds.length > 0) {
        filter.branchId = { $in: req.user.accessibleBranchIds };
    }

    return filter;
};

/**
 * Validates and injects legalCompanyId for CREATE operations.
 * Auto-injects if user has 1 accessible company.
 * Throws 400 if user has multiple and didn't provide one.
 * Throws 403 if user provides an unauthorized company.
 */
const validateCreateScope = (req, body) => {
    const tenantId = req.user && (req.user.activeTenantId || req.user.tenantId);
    if (!tenantId) {
        throw { status: 403, message: 'Forbidden: Missing tenant context' };
    }

    const isAdmin = checkIsAdmin(req);
    const accessibleCompanyIds = req.user.accessibleCompanyIds || [];
    const activeCompanyId = req.headers ? req.headers['x-company-id'] : null;

    if (!body.legalCompanyId) {
        if (activeCompanyId && activeCompanyId !== 'ALL' && activeCompanyId !== 'null' && activeCompanyId !== 'undefined') {
            body.legalCompanyId = activeCompanyId;
        } else if (accessibleCompanyIds.length === 1) {
            body.legalCompanyId = accessibleCompanyIds[0];
        } else if (isAdmin) {
            if (accessibleCompanyIds.length > 0) {
                body.legalCompanyId = accessibleCompanyIds[0];
            }
        } else {
            throw { status: 400, message: 'Bad Request: Multiple accessible companies found. You must explicitly provide a legalCompanyId.' };
        }
    }

    if (body.legalCompanyId && !isAdmin && accessibleCompanyIds.length > 0 && !accessibleCompanyIds.includes(body.legalCompanyId.toString())) {
        throw { status: 403, message: 'Forbidden: You do not have access to the specified Legal Company.' };
    }

    return body;
};

/**
 * Validates a specific legalCompanyId against the user's accessible scope.
 */
const validateCompanyId = (req, legalCompanyId) => {
    const tenantId = req.user && (req.user.activeTenantId || req.user.tenantId);
    if (!tenantId) {
        throw { status: 403, message: 'Forbidden: Missing tenant context' };
    }
    const isAdmin = checkIsAdmin(req);
    if (isAdmin) return true;
    const accessibleCompanyIds = req.user.accessibleCompanyIds || [];
    
    if (!legalCompanyId || !accessibleCompanyIds.includes(legalCompanyId.toString())) {
        throw { status: 403, message: 'Forbidden: You do not have access to the specified Legal Company.' };
    }
    return true;
};

/**
 * Validates that a given branch belongs to the user's tenant,
 * belongs to an accessible Legal Company, and is permitted for branch-restricted users.
 */
const validateBranchScope = async (req, branchId) => {
    const tenantId = req.user && (req.user.activeTenantId || req.user.tenantId);
    if (!tenantId) {
        throw { status: 403, message: 'Forbidden: Missing tenant context' };
    }
    if (!branchId) return true; // Let caller decide if branchId is required

    const isAdmin = checkIsAdmin(req);
    const Branch = mongoose.model('Branch');
    const branch = await Branch.findById(branchId);
    
    if (!branch) {
        throw { status: 404, message: 'Not Found: Branch does not exist.' };
    }
    
    if (branch.tenantId.toString() !== tenantId.toString()) {
        throw { status: 403, message: 'Forbidden: Branch belongs to a different tenant.' };
    }

    if (!isAdmin && branch.legalCompanyId && !(req.user.accessibleCompanyIds || []).includes(branch.legalCompanyId.toString())) {
        throw { status: 403, message: 'Forbidden: Branch belongs to a Legal Company you cannot access.' };
    }

    const isBranchRestricted = req.user.branches && req.user.branches.length > 0;
    if (!isAdmin && isBranchRestricted) {
        if (!(req.user.accessibleBranchIds || []).includes(branchId.toString())) {
            throw { status: 403, message: 'Forbidden: You are not authorized for this specific branch.' };
        }
    }

    return true;
};

module.exports = {
    getReadFilter,
    validateCreateScope,
    validateCompanyId,
    validateBranchScope
};

