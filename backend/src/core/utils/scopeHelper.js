const mongoose = require('mongoose');

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

    const xCompanyId = req.headers['x-company-id'];
    const accessibleCompanyIds = req.user.accessibleCompanyIds || [];

    if (xCompanyId && xCompanyId !== 'ALL' && xCompanyId !== 'null' && xCompanyId !== 'undefined') {
        if (!accessibleCompanyIds.includes(xCompanyId.toString())) {
            throw { status: 403, message: 'Forbidden: You do not have access to the specified Legal Company context.' };
        }
        if (options.allowLegacy) {
            filter.$or = [
                { legalCompanyId: xCompanyId },
                { legalCompanyId: { $exists: false } },
                { legalCompanyId: null }
            ];
        } else {
            filter.legalCompanyId = xCompanyId;
        }
    } else {
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

    if (req.user.accessibleBranchIds && req.user.accessibleBranchIds.length > 0) {
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

    const accessibleCompanyIds = req.user.accessibleCompanyIds || [];
    
    if (accessibleCompanyIds.length === 0) {
        throw { status: 403, message: 'Forbidden: You have zero accessible Legal Companies.' };
    }

    const activeCompanyId = req.headers ? req.headers['x-company-id'] : null;

    if (!body.legalCompanyId) {
        if (activeCompanyId && activeCompanyId !== 'ALL' && activeCompanyId !== 'null' && activeCompanyId !== 'undefined') {
            body.legalCompanyId = activeCompanyId;
        } else if (accessibleCompanyIds.length === 1) {
            body.legalCompanyId = accessibleCompanyIds[0];
        } else {
            throw { status: 400, message: 'Bad Request: Multiple accessible companies found. You must explicitly provide a legalCompanyId.' };
        }
    }

    if (!accessibleCompanyIds.includes(body.legalCompanyId.toString())) {
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

    const Branch = mongoose.model('Branch');
    const branch = await Branch.findById(branchId);
    
    if (!branch) {
        throw { status: 404, message: 'Not Found: Branch does not exist.' };
    }
    
    if (branch.tenantId.toString() !== tenantId.toString()) {
        throw { status: 403, message: 'Forbidden: Branch belongs to a different tenant.' };
    }

    if (branch.legalCompanyId && !(req.user.accessibleCompanyIds || []).includes(branch.legalCompanyId.toString())) {
        throw { status: 403, message: 'Forbidden: Branch belongs to a Legal Company you cannot access.' };
    }

    const isBranchRestricted = req.user.branches && req.user.branches.length > 0;
    if (isBranchRestricted) {
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
