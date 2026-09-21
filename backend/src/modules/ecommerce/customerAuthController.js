const Customer = require('../../core/models/Customer');
const Company = require('../../core/models/Company');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new customer
// @route   POST /api/v1/ecommerce/auth/register
// @access  Public (via API Key)
exports.registerCustomer = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const customerExists = await Customer.findOne({ email, tenantId: req.tenantId });
    if (customerExists) {
      return res.status(400).json({ message: 'Customer already exists' });
    }

    const customer = await Customer.create({
      tenantId: req.tenantId,
      firstName,
      lastName,
      email,
      password,
    });

    res.status(201).json({
      _id: customer._id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      token: generateToken(customer._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate a customer
// @route   POST /api/v1/ecommerce/auth/login
// @access  Public (via API Key)
exports.loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    const customer = await Customer.findOne({ email, tenantId: req.tenantId }).select('+password');

    if (customer && (await customer.matchPassword(password))) {
      res.json({
        _id: customer._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        token: generateToken(customer._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get customer profile
// @route   GET /api/v1/ecommerce/auth/profile
// @access  Private (Customer)
exports.getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id).populate('wishlist', 'name sku sellingPrice');
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
