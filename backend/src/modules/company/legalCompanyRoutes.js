const express = require('express');
const router = express.Router();
const { getMyCompanies, getAllLegalCompanies, getLegalCompanyById, createLegalCompany, updateLegalCompany, deleteLegalCompany } = require('./legalCompanyController');
const { protect } = require('../../core/middleware/authMiddleware');

router.use(protect);

router.get('/my-companies', getMyCompanies);
router.route('/')
  .get(getAllLegalCompanies)
  .post(createLegalCompany);

router.route('/:id')
  .get(getLegalCompanyById)
  .put(updateLegalCompany)
  .delete(deleteLegalCompany);

module.exports = router;
