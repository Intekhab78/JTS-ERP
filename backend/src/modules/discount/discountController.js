const Discount = require('../../core/models/Discount');
const { getReadFilter } = require('../../core/utils/scopeHelper');

// @desc    Get all discounts
// @route   GET /api/v1/discounts
// @access  Private
exports.getDiscounts = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    const discounts = await Discount.find({ tenantId })
      .populate('applicableProducts', 'name sku')
      .populate('applicableCategories', 'name')
      .populate('excludedProducts', 'name sku')
      .sort({ createdAt: -1 });

    res.status(200).json(discounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a discount
// @route   POST /api/v1/discounts
// @access  Private
exports.createDiscount = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    const data = { ...req.body, tenantId, createdBy: req.user._id };
    const discount = await Discount.create(data);
    res.status(201).json(discount);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Discount code already exists.' });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get discount by ID
// @route   GET /api/v1/discounts/:id
// @access  Private
exports.getDiscountById = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    const discount = await Discount.findOne({ _id: req.params.id, tenantId })
      .populate('applicableProducts', 'name sku')
      .populate('applicableCategories', 'name')
      .populate('excludedProducts', 'name sku');

    if (!discount) return res.status(404).json({ message: 'Discount not found' });
    res.status(200).json(discount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a discount
// @route   PUT /api/v1/discounts/:id
// @access  Private
exports.updateDiscount = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    const discount = await Discount.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { ...req.body, updatedBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!discount) return res.status(404).json({ message: 'Discount not found' });
    res.status(200).json(discount);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Discount code already exists.' });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Deactivate a discount
// @route   DELETE /api/v1/discounts/:id
// @access  Private
exports.deleteDiscount = async (req, res) => {
  try {
    const tenantId = req.user.activeTenantId || req.user.tenantId;
    const discount = await Discount.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { isActive: false, updatedBy: req.user._id },
      { new: true }
    );

    if (!discount) return res.status(404).json({ message: 'Discount not found' });
    res.status(200).json({ message: 'Discount deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Validate discount code
// @route   POST /api/v1/discounts/validate
// @access  Private
exports.validateDiscount = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: 'Discount code is required' });

    const tenantId = req.user.activeTenantId || req.user.tenantId;
    const discount = await Discount.findOne({ code: code.toUpperCase().trim(), tenantId });

    if (!discount) return res.status(404).json({ message: 'Invalid discount code' });
    if (!discount.isActive) return res.status(400).json({ message: 'Discount code is inactive' });
    
    const now = new Date();
    if (discount.startDate && now < new Date(discount.startDate)) {
      return res.status(400).json({ message: 'Discount code is not active yet' });
    }
    if (discount.endDate && now > new Date(discount.endDate)) {
      return res.status(400).json({ message: 'Discount code has expired' });
    }

    res.status(200).json(discount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
