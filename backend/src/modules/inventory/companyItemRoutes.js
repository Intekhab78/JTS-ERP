const express = require('express');
const router = express.Router();
const { 
  createCompanyItem, 
  updateCompanyItem, 
  getCompanyItemById, 
  lookupCompanyItem 
} = require('./companyItemController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/')
  .post(protect, createCompanyItem);

router.route('/lookup')
  .get(protect, lookupCompanyItem);

router.route('/:id')
  .get(protect, getCompanyItemById)
  .put(protect, updateCompanyItem);

module.exports = router;
