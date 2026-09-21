const Order = require('../../core/models/Order');
const ApiKey = require('../../core/models/ApiKey');

// @desc    Get all web orders
// @route   GET /api/v1/ecommerce-admin/orders
// @access  Private
exports.getWebOrders = async (req, res) => {
  try {
    const orders = await Order.find({ tenantId: req.user.tenantId, source: 'WEB' })
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update web order status (e.g. to SHIPPED)
// @route   PUT /api/v1/ecommerce-admin/orders/:id/status
// @access  Private
exports.updateWebOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId, source: 'WEB' },
      { status },
      { returnDocument: 'after', runValidators: true }
    ).populate('branchId', 'name');
    
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.status(200).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get API Keys
// @route   GET /api/v1/ecommerce-admin/apikeys
// @access  Private
exports.getApiKeys = async (req, res) => {
  try {
    const keys = await ApiKey.find({ tenantId: req.user.tenantId });
    res.status(200).json(keys);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create API Key
// @route   POST /api/v1/ecommerce-admin/apikeys
// @access  Private
exports.createApiKey = async (req, res) => {
  try {
    let tenantId = req.user.tenantId;
    if (!tenantId) {
      const Company = require('../../core/models/Company');
      const company = await Company.findOne();
      if (!company) throw new Error('No company found to associate API Key with.');
      tenantId = company._id;
    }

    const apiKey = await ApiKey.create({
      tenantId: tenantId,
      name: req.body.name || 'Default Web Storefront'
    });
    res.status(201).json(apiKey);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const StoreSettings = require('../../core/models/StoreSettings');
const Coupon = require('../../core/models/Coupon');

// Helper to get tenantId (handles super admins)
const getTenantId = async (req) => {
  if (req.user.tenantId) return req.user.tenantId;
  const Company = require('../../core/models/Company');
  const company = await Company.findOne();
  if (!company) throw new Error('No company found in the system');
  return company._id;
};

// @desc    Get store settings
// @route   GET /api/v1/ecommerce-admin/settings
// @access  Private
exports.getStoreSettings = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    let settings = await StoreSettings.findOne({ tenantId }).populate('featuredProducts');
    if (!settings) {
      settings = await StoreSettings.create({ tenantId });
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update store settings
// @route   PUT /api/v1/ecommerce-admin/settings
// @access  Private
exports.updateStoreSettings = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const settings = await StoreSettings.findOneAndUpdate(
      { tenantId },
      req.body,
      { returnDocument: 'after', upsert: true, runValidators: true }
    ).populate('featuredProducts');
    res.status(200).json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all coupons
// @route   GET /api/v1/ecommerce-admin/coupons
// @access  Private
exports.getCoupons = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const coupons = await Coupon.find({ tenantId });
    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a coupon
// @route   POST /api/v1/ecommerce-admin/coupons
// @access  Private
exports.createCoupon = async (req, res) => {
  try {
    const tenantId = await getTenantId(req);
    const coupon = await Coupon.create({
      tenantId,
      ...req.body
    });
    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
