const express = require('express');
const router = express.Router();
const { getBranches, createBranch, updateBranch, deleteBranch } = require('./branchController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, getBranches)
  .post(protect, createBranch);

router.route('/:id')
  .put(protect, updateBranch)
  .delete(protect, deleteBranch);

module.exports = router;
