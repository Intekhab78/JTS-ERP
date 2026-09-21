const JournalEntry = require('../../core/models/JournalEntry');
const JournalEntryLine = require('../../core/models/JournalEntryLine');
const AccountingService = require('../../services/accountingService');

// @desc    Get all journal entries
// @route   GET /api/v1/journal
// @access  Private
exports.getJournalEntries = async (req, res) => {
  try {
    const entries = await JournalEntry.find({ tenantId: req.user.tenantId })
      .sort({ entryDate: -1, createdAt: -1 });
      
    // Fetch lines for each entry (inefficient for large sets, but works for now)
    const entriesWithLines = await Promise.all(entries.map(async (entry) => {
      const lines = await JournalEntryLine.find({ journalEntryId: entry._id })
        .populate('accountId', 'code name type');
      return {
        ...entry.toObject(),
        lines
      };
    }));
    
    res.status(200).json(entriesWithLines);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a manual journal entry
// @route   POST /api/v1/journal
// @access  Private
exports.createJournalEntry = async (req, res) => {
  try {
    const entry = await AccountingService.createJournalEntry(req.body, req.user.tenantId, req.user._id);
    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a DRAFT journal entry
// @route   PUT /api/v1/journal/:id
// @access  Private
exports.updateJournalEntry = async (req, res) => {
  try {
    const entry = await AccountingService.updateJournalEntry(req.params.id, req.body, req.user.tenantId);
    res.status(200).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Post a journal entry
// @route   POST /api/v1/journal/:id/post
// @access  Private
exports.postJournalEntry = async (req, res) => {
  try {
    const entry = await AccountingService.postJournalEntry(req.params.id, req.user.tenantId);
    res.status(200).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Void a journal entry
// @route   POST /api/v1/journal/:id/void
// @access  Private
exports.voidJournalEntry = async (req, res) => {
  try {
    const entry = await AccountingService.voidJournalEntry(req.params.id, req.user.tenantId);
    res.status(200).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Reverse a journal entry
// @route   POST /api/v1/journal/:id/reverse
// @access  Private
exports.reverseJournalEntry = async (req, res) => {
  try {
    const entry = await AccountingService.reverseJournalEntry(req.params.id, req.user.tenantId, req.user._id);
    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
