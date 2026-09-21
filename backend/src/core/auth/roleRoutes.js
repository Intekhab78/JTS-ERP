const express = require('express');
const router = express.Router();
const { getRoles, createRole, updateRole, deleteRole } = require('./roleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, authorize('VIEW_ROLES'), getRoles)
  .post(protect, authorize('CREATE_ROLES'), createRole);

router.route('/:id')
  .put(protect, authorize('EDIT_ROLES'), updateRole)
  .delete(protect, authorize('DELETE_ROLES'), deleteRole);

module.exports = router;
