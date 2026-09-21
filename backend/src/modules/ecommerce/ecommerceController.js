const Product = require('../../core/models/Product');
const Order = require('../../core/models/Order');
const Stock = require('../../core/models/Stock');
const Branch = require('../../core/models/Branch');
const mongoose = require('mongoose');

// @desc    Get public product catalog for E-Commerce
// @route   GET /api/v1/ecommerce/products
// @access  Public (via API Key)
exports.getPublicProducts = async (req, res) => {
  try {
    // Only return active products. 
    // In a real app, you might have an 'isPublishedToWeb' flag on the Product model.
    const products = await Product.find({ tenantId: req.tenantId }).select('name sku description type sellingPrice');
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit a new web order
// @route   POST /api/v1/ecommerce/checkout
// @access  Public (via API Key)
exports.submitWebOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerName, customerEmail, shippingAddress, items, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      throw new Error('No items in the cart');
    }

    // 1. Find the main warehouse to deduct stock from
    // For V1, we just take the first branch associated with the tenant
    const mainBranch = await Branch.findOne({ tenantId: req.tenantId }).session(session);
    if (!mainBranch) {
      throw new Error('No branch available to fulfill order');
    }

    let totalAmount = 0;

    // 2. Process items and deduct inventory
    for (const item of items) {
      const product = await Product.findOne({ _id: item.productId, tenantId: req.tenantId }).session(session);
      if (!product) throw new Error(`Product not found: ${item.productId}`);
      
      const qty = Number(item.quantity);
      if (qty <= 0) throw new Error('Invalid quantity');

      const itemTotal = product.sellingPrice * qty;
      totalAmount += itemTotal;

      if (product.type === 'STANDARD') {
        let stock = await Stock.findOne({
          tenantId: req.tenantId,
          branchId: mainBranch._id,
          productId: product._id
        }).session(session);

        if (!stock || stock.quantity < qty) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }
        stock.quantity -= qty;
        await stock.save({ session });
      }
    }

    // 3. Create the Order document
    const order = await Order.create([{
      tenantId: req.tenantId,
      branchId: mainBranch._id,
      source: 'WEB',
      customerName: customerName || 'Online Customer',
      shippingAddress,
      totalAmount,
      paymentMethod: paymentMethod || 'ONLINE',
      status: 'PENDING' // Web orders might need manual fulfillment
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Order placed successfully',
      orderId: order[0]._id,
      totalAmount
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

const Review = require('../../core/models/Review');
const Coupon = require('../../core/models/Coupon');
const Customer = require('../../core/models/Customer');

// @desc    Get product by ID with reviews
// @route   GET /api/v1/ecommerce/products/:id
// @access  Public (via API Key)
exports.getPublicProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    const reviews = await Review.find({ productId: product._id, isApproved: true }).populate('customerId', 'firstName lastName');
    
    res.status(200).json({ product, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add review to product
// @route   POST /api/v1/ecommerce/products/:id/reviews
// @access  Private (Customer)
exports.addProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.create({
      tenantId: req.customer.tenantId,
      productId: req.params.id,
      customerId: req.customer._id,
      rating,
      comment
    });
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Validate coupon
// @route   POST /api/v1/ecommerce/coupons/validate
// @access  Public (via API Key)
exports.validateCoupon = async (req, res) => {
  try {
    const { code, purchaseAmount } = req.body;
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), tenantId: req.tenantId, isActive: true });
    
    if (!coupon) return res.status(404).json({ message: 'Invalid coupon' });
    
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ message: 'Coupon expired' });
    }
    
    if (purchaseAmount < coupon.minPurchaseAmount) {
      return res.status(400).json({ message: `Minimum purchase of $${coupon.minPurchaseAmount} required` });
    }
    
    res.status(200).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle wishlist item
// @route   POST /api/v1/ecommerce/wishlist/:productId
// @access  Private (Customer)
exports.toggleWishlist = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    const productId = req.params.productId;
    
    const index = customer.wishlist.indexOf(productId);
    if (index > -1) {
      customer.wishlist.splice(index, 1);
    } else {
      customer.wishlist.push(productId);
    }
    
    await customer.save();
    res.status(200).json(customer.wishlist);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
