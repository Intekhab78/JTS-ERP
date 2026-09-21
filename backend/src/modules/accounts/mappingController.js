const AccountMapping = require('../../core/models/AccountMapping');
const Account = require('../../core/models/Account');

exports.getMappings = async (req, res) => {
  try {
    const mappings = await AccountMapping.find({ tenantId: req.user.tenantId }).populate('accountId', 'code name type isActive');
    res.status(200).json(mappings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.upsertMapping = async (req, res) => {
  try {
    const { key, accountId, isActive } = req.body;
    const tenantId = req.user.tenantId;

    if (!key || !accountId) {
      return res.status(400).json({ message: 'Key and Account ID are required' });
    }

    // Verify account exists, active and belongs to tenant
    const account = await Account.findOne({ _id: accountId, tenantId });
    if (!account) {
      return res.status(400).json({ message: 'Account not found or does not belong to your tenant.' });
    }
    if (!account.isActive) {
      return res.status(400).json({ message: 'Cannot map to an inactive account.' });
    }

    const mapping = await AccountMapping.findOneAndUpdate(
      { tenantId, key: key.toUpperCase() },
      { accountId, isActive: isActive !== undefined ? isActive : true },
      { returnDocument: 'after', upsert: true }
    ).populate('accountId', 'code name type');

    res.status(200).json(mapping);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mapping key already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};
