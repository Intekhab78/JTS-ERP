const ApiKey = require('../models/ApiKey');

exports.protectApiKey = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no API key provided' });
  }

  try {
    const apiKey = await ApiKey.findOne({ key: token, isActive: true });

    if (!apiKey) {
      return res.status(401).json({ message: 'Not authorized, invalid API key' });
    }

    // Attach tenant info so controllers know which company this is
    req.tenantId = apiKey.tenantId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, API key failed' });
  }
};
