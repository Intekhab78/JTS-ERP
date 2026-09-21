const AuditLog = require('../../core/models/AuditLog');
const mongoose = require('mongoose');

// @desc    Get all audit logs
// @route   GET /api/v1/audit/logs
// @access  Private
exports.getLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const skip = (page - 1) * limit;

    const query = { tenantId: req.user.tenantId };

    // Branch Authorization Scoping
    const hasWildcard = req.user.roleId?.permissions?.includes('*') || 
                        req.user.roleId?.name === 'TENANT ADMIN' || 
                        req.user.roleName === 'TENANT ADMIN';
    
    let allowedBranches = null;
    if (!hasWildcard && req.user.branches) {
      allowedBranches = req.user.branches.map(b => b.toString());
    } else if (!hasWildcard) {
      allowedBranches = [];
    }

    if (req.query.branchId) {
      if (allowedBranches && !allowedBranches.includes(req.query.branchId.toString())) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to view audit logs for this branch.' });
      }
      query.branchId = req.query.branchId;
    } else if (allowedBranches) {
      query.branchId = { $in: allowedBranches };
    }

    // Exact Filters
    if (req.query.action) query.action = req.query.action;
    if (req.query.entityType) query.entityType = req.query.entityType;
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.registerId) query.registerId = req.query.registerId;
    if (req.query.sessionId) query.sessionId = req.query.sessionId;

    // Date Range Filter
    if (req.query.startDate || req.query.endDate) {
      query.timestamp = {};
      if (req.query.startDate) query.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.timestamp.$lte = new Date(req.query.endDate);
    }

    // Search Filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      const orConditions = [
        { action: searchRegex },
        { entityType: searchRegex },
        { reason: searchRegex }
      ];

      // If search is a valid ObjectId, we can search by entityId as well
      if (mongoose.isValidObjectId(req.query.search)) {
        orConditions.push({ entityId: req.query.search });
      }

      query.$or = orConditions;
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Faster for read-only data

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
