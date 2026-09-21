const Account = require('../../core/models/Account');

// @desc    Get all accounts
// @route   GET /api/v1/accounts
// @access  Private
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({ tenantId: req.user.tenantId }).sort({ code: 1 });
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new account
// @route   POST /api/v1/accounts
// @access  Private
exports.createAccount = async (req, res) => {
  try {
    const { code, name, type, description } = req.body;
    
    // Check if code exists
    const existing = await Account.findOne({ tenantId: req.user.tenantId, code });
    if (existing) {
      return res.status(400).json({ message: 'Account code already exists' });
    }

    const account = await Account.create({
      tenantId: req.user.tenantId,
      code,
      name,
      type,
      description
    });

    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
