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
  deleteProductImage,
  getProductByBarcode
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

router.route('/products/barcode')
  .get(protect, getProductByBarcode);

router.route('/products/:id')
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

router.route('/products/:id/images')
  .post(protect, uploadProductImages.array('images', 5), uploadProductImage);

router.route('/products/:id/images/:imageName')
  .delete(protect, deleteProductImage);

// Product Variant Master Routes
const {
  getProductVariants,
  getProductVariantById,
  createProductVariant,
  bulkSaveProductVariants,
  updateProductVariant,
  deleteProductVariant
} = require('./productVariantController');

router.route('/products/:productId/variants')
  .get(protect, getProductVariants)
  .post(protect, createProductVariant);

router.route('/products/:productId/variants/bulk')
  .post(protect, bulkSaveProductVariants);

router.route('/variants/:variantId')
  .get(protect, getProductVariantById)
  .put(protect, updateProductVariant)
  .delete(protect, deleteProductVariant);


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
