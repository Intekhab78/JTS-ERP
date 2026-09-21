const express = require('express');
const router = express.Router();
const {
  getDocumentTypes,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType
} = require('./documentTypeController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, getDocumentTypes)
  .post(protect, createDocumentType);

router.route('/:id')
  .put(protect, updateDocumentType)
  .delete(protect, deleteDocumentType);

module.exports = router;
