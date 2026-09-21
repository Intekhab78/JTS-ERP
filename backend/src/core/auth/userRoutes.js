const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser, setPosPin } = require('./userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, authorize('VIEW_USERS'), getUsers)
  .post(protect, authorize('CREATE_USERS'), createUser);

router.route('/:id')
  .put(protect, authorize('EDIT_USERS'), updateUser)
  .delete(protect, authorize('DELETE_USERS'), deleteUser);

router.route('/:id/pos-pin')
  .put(protect, authorize('EDIT_USERS'), setPosPin);

module.exports = router;
