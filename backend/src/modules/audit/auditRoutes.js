const express = require('express');
const { getLogs } = require('./auditController');
const { protect, authorize } = require('../../core/middleware/authMiddleware');

const router = express.Router();

// Apply authentication and strict authorization for all audit routes
router.use(protect);
router.use(authorize('VIEW_AUDIT_LOGS'));

// READ-ONLY API. Intentionally missing POST, PUT, PATCH, DELETE.
router.get('/logs', getLogs);

module.exports = router;
