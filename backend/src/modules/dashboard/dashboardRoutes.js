const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('./dashboardController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/summary')
  .get(protect, getDashboardSummary);

module.exports = router;
