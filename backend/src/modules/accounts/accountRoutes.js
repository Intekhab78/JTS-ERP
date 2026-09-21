const express = require('express');
const router = express.Router();
const { getAccounts, createAccount } = require('./accountController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, getAccounts)
  .post(protect, createAccount);

module.exports = router;
