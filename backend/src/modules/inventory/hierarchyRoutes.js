const express = require('express');
const router = express.Router();
const { protect } = require('../../core/middleware/authMiddleware');
const {
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getFamilies, createFamily, updateFamily, deleteFamily,
  getSubFamilies, createSubFamily, updateSubFamily, deleteSubFamily,
  getSizes, createSize, updateSize, deleteSize,
  getColors, createColor, updateColor, deleteColor
} = require('./hierarchyController');

// All routes require authentication
router.use(protect);

// Department Routes
router.route('/departments')
  .get(getDepartments)
  .post(createDepartment);

router.route('/departments/:id')
  .put(updateDepartment)
  .delete(deleteDepartment);

// Family Routes
router.route('/families')
  .get(getFamilies)
  .post(createFamily);

router.route('/families/:id')
  .put(updateFamily)
  .delete(deleteFamily);

// SubFamily Routes
router.route('/subfamilies')
  .get(getSubFamilies)
  .post(createSubFamily);

router.route('/subfamilies/:id')
  .put(updateSubFamily)
  .delete(deleteSubFamily);

// Size Routes
router.route('/sizes')
  .get(getSizes)
  .post(createSize);

router.route('/sizes/:id')
  .put(updateSize)
  .delete(deleteSize);

// Color Routes
router.route('/colors')
  .get(getColors)
  .post(createColor);

router.route('/colors/:id')
  .put(updateColor)
  .delete(deleteColor);

module.exports = router;
