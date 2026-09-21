const express = require('express');
const router = express.Router();
const { 
  getProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadProductImage,
  deleteProductImage
} = require('./inventoryController');
const { protect } = require('../../core/middleware/authMiddleware');
const { uploadProductImages } = require('../../core/utils/upload');

const {
  getUoms,
  createUom,
  updateUom,
  deleteUom,
  getConversions,
  createConversion,
  updateConversion,
  deleteConversion
} = require('./uomController');

router.route('/products')
  .get(protect, getProducts)
  .post(protect, createProduct);

router.route('/products/:id')
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

router.route('/products/:id/images')
  .post(protect, uploadProductImages.array('images', 5), uploadProductImage);

router.route('/products/:id/images/:imageName')
  .delete(protect, deleteProductImage);


router.route('/categories')
  .get(protect, getCategories)
  .post(protect, createCategory);

router.route('/categories/:id')
  .put(protect, updateCategory)
  .delete(protect, deleteCategory);

// UOM Routes
router.route('/uoms')
  .get(protect, getUoms)
  .post(protect, createUom);

router.route('/uoms/:id')
  .put(protect, updateUom)
  .delete(protect, deleteUom);

// UOM Conversion Routes
router.route('/uom-conversions')
  .get(protect, getConversions)
  .post(protect, createConversion);

router.route('/uom-conversions/:id')
  .put(protect, updateConversion)
  .delete(protect, deleteConversion);

module.exports = router;
