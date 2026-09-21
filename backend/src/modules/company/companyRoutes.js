const express = require('express');
const router = express.Router();
const { getCompanyProfile, updateCompanyProfile, getAllCompanies, createCompany } = require('./companyController');
const { protect, superAdminOnly } = require('../../core/middleware/authMiddleware');

router.get('/all', protect, superAdminOnly, getAllCompanies);

router.route('/')
  .get(protect, getCompanyProfile)
  .put(protect, updateCompanyProfile)
  .post(protect, superAdminOnly, createCompany);

module.exports = router;
