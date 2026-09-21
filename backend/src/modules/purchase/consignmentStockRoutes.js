const express = require('express');
const router = express.Router();
const controller = require('./consignmentStockController');
const { protect } = require('../../core/middleware/authMiddleware');

router.use(protect);

router.get('/', controller.getStock);
router.get('/:id', controller.getStockById);

module.exports = router;
