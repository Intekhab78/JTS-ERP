const express = require('express');
const router = express.Router();
const { 
  getJournalEntries, 
  createJournalEntry, 
  updateJournalEntry,
  postJournalEntry, 
  voidJournalEntry, 
  reverseJournalEntry 
} = require('./journalController');
const { protect } = require('../../core/middleware/authMiddleware');

router.route('/')
  .get(protect, getJournalEntries)
  .post(protect, createJournalEntry);

router.route('/:id')
  .put(protect, updateJournalEntry);

router.post('/:id/post', protect, postJournalEntry);
router.post('/:id/void', protect, voidJournalEntry);
router.post('/:id/reverse', protect, reverseJournalEntry);

module.exports = router;
