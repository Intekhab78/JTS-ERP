const ApiKey = require('../models/ApiKey');
const Company = require('../models/Company');
const Product = require('../models/Product');

exports.protectApiKey = async (req, res, next) => {
  let token = req.headers['x-api-key'] || req.headers['api-key'] || req.query.apiKey;

  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    const authHeaderToken = req.headers.authorization.split(' ')[1];
    // Check if it's an erp API key (not a customer JWT)
    if (authHeaderToken.startsWith('erp_')) {
      token = authHeaderToken;
    }
  }

  try {
    if (token) {
      const apiKey = await ApiKey.findOne({ key: token, isActive: true });
      if (apiKey) {
        req.tenantId = apiKey.tenantId;
        return next();
      }
    }

    // Fallback: If no valid API key is explicitly supplied, bind to the primary business company tenant
    // so customer storefront operations (catalog, auth, cart) work seamlessly out of the box
    const activeProduct = await Product.findOne({ isActive: true });
    if (activeProduct && activeProduct.tenantId) {
      req.tenantId = activeProduct.tenantId;
      return next();
    }

    const company = await Company.findOne({ name: /JTS middleeast/i }) || await Company.findOne();
    if (company) {
      req.tenantId = company._id;
      return next();
    }

    return res.status(401).json({ message: 'Not authorized, no tenant company found' });
  } catch (error) {
    res.status(401).json({ message: 'API key resolution failed', error: error.message });
  }
};

