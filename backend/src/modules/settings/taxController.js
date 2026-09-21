const Tax = require('../../core/models/Tax');

// @desc    Get all taxes
// @route   GET /api/v1/taxes
// @access  Private
exports.getTaxes = async (req, res) => {
  try {
    const taxes = await Tax.find({ tenantId: req.user.tenantId }).sort('-createdAt');
    res.status(200).json(taxes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single tax
// @route   GET /api/v1/taxes/:id
// @access  Private
exports.getTax = async (req, res) => {
  try {
    const tax = await Tax.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!tax) {
      return res.status(404).json({ message: `Tax not found with id of ${req.params.id}` });
    }

    res.status(200).json(tax);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new tax
// @route   POST /api/v1/taxes
// @access  Private
exports.createTax = async (req, res) => {
  try {
    req.body.tenantId = req.user.tenantId;
    const tax = await Tax.create(req.body);
    res.status(201).json(tax);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update tax
// @route   PUT /api/v1/taxes/:id
// @access  Private
exports.updateTax = async (req, res) => {
  try {
    let tax = await Tax.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!tax) {
      return res.status(404).json({ message: `Tax not found with id of ${req.params.id}` });
    }

    tax = await Tax.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true
    });

    res.status(200).json(tax);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete tax
// @route   DELETE /api/v1/taxes/:id
// @access  Private
exports.deleteTax = async (req, res) => {
  try {
    const tax = await Tax.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!tax) {
      return res.status(404).json({ message: `Tax not found with id of ${req.params.id}` });
    }

    // Soft delete
    tax.isActive = false;
    await tax.save();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
