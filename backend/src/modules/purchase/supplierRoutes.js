const express = require('express');
const router = express.Router();
const { uploadSupplierPhoto } = require('../../core/utils/upload');
const { getSuppliers, createSupplier, updateSupplier, deleteSupplier, getSupplier, uploadOwnerPhoto, deleteOwnerPhoto } = require('./supplierController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, createSupplier);

router.route('/:id')
  .get(protect, getSupplier)
  .put(protect, updateSupplier)
  .delete(protect, deleteSupplier);

router.route('/:id/owner-photo')
  .post(protect, uploadSupplierPhoto.single('photo'), uploadOwnerPhoto)
  .delete(protect, deleteOwnerPhoto);

const { uploadSupplierDocument } = require('../../core/utils/upload');
const { uploadDocument, getDocuments, viewDocument, deleteDocument, replaceDocument } = require('./supplierController');

router.route('/:id/documents')
  .get(protect, getDocuments)
  .post(protect, uploadSupplierDocument.single('file'), uploadDocument);

router.route('/:id/documents/:documentId')
  .put(protect, uploadSupplierDocument.single('file'), replaceDocument)
  .delete(protect, deleteDocument);

router.route('/:id/documents/:documentId/view')
  .get(protect, viewDocument);

module.exports = router;
