const express = require('express');
const router = express.Router();
const { 
  getPayslips, 
  createPayslip, 
  payPayslip 
} = require('./payrollController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, getPayslips)
  .post(protect, createPayslip);

router.route('/:id/pay')
  .put(protect, payPayslip);

module.exports = router;
