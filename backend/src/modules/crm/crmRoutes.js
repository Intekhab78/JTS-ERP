const express = require('express');
const router = express.Router();
const { 
  getLeads, 
  createLead, 
  updateLead, 
  getCustomers, 
  createCustomer,
  updateCustomer,
  getCustomerById
} = require('./crmController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/leads')
  .get(protect, getLeads)
  .post(protect, createLead);

router.route('/leads/:id')
  .put(protect, updateLead);

router.route('/customers')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

router.route('/customers/:id')
  .get(protect, getCustomerById)
  .put(protect, updateCustomer);

module.exports = router;
