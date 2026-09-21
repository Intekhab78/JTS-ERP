const express = require('express');
const router = express.Router();
const { getMappings, upsertMapping } = require('./mappingController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, getMappings)
  .post(protect, upsertMapping);

module.exports = router;
