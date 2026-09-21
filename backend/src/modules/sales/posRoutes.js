const express = require('express');
const router = express.Router();
const posSessionController = require('./posSessionController');
const posController = require('./posController');
const registerController = require('./registerController');
const { protect, authorize } = require('../../core/middleware/authMiddleware');

// Middleware to protect all POS routes
router.use(protect);

// Session Routes
router.get('/sessions', authorize('VIEW_POS_SESSIONS'), posSessionController.getAllSessions);
router.post('/sessions/open', authorize('CREATE_POS_SESSIONS'), posSessionController.openSession);
router.get('/sessions/active', authorize('VIEW_POS_SESSIONS', 'CREATE_POS_ORDERS'), posSessionController.getActiveSession);
router.post('/sessions/:id/close', authorize('EDIT_POS_SESSIONS'), posSessionController.closeSession);
router.post('/sessions/:id/submit-audit', authorize('EDIT_POS_SESSIONS'), posSessionController.submitForAudit);
router.post('/sessions/:id/resolve-audit', authorize('AUDIT_POS_SESSIONS'), posSessionController.resolveAudit);
router.get('/sessions/reconciliation', authorize('VIEW_POS_SESSIONS', 'VIEW_POS_REPORTS'), posSessionController.getReconciliationReport);

// Order Routes
router.post('/orders', authorize('CREATE_POS_ORDERS'), posController.createOrder);
router.get('/orders', authorize('VIEW_POS_ORDERS'), posController.getOrders);
router.get('/orders/:id', authorize('VIEW_POS_ORDERS'), posController.getOrderById);
router.post('/orders/:id/void', posController.voidOrder);

// Return Routes
router.get('/returns', authorize('VIEW_POS_ORDERS'), posController.getReturns);
router.post('/returns', posController.createReturn);

// Register Routes
// Viewing registers is allowed for anyone who can open a session or view sessions
router.get('/registers', authorize('VIEW_POS_SESSIONS', 'CREATE_POS_SESSIONS'), registerController.getRegisters);
router.get('/registers/:id', authorize('VIEW_POS_SESSIONS', 'CREATE_POS_SESSIONS'), registerController.getRegisterById);
// Creating/Modifying physical registers should be restricted to managers/admins
router.post('/registers', authorize('MANAGE_COMPANY', 'admin', 'sales_manager'), registerController.createRegister);
router.put('/registers/:id', authorize('MANAGE_COMPANY', 'admin', 'sales_manager'), registerController.updateRegister);
// Drawer Operations
router.post('/registers/:id/drawer-open', registerController.openDrawer);

// Report Routes
router.get('/reports', authorize('VIEW_POS_REPORTS'), posController.getReports);

module.exports = router;
