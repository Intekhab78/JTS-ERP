const Customer = require('../../core/models/Customer');
const Company = require('../../core/models/Company');
const { sendCustomerOtpEmail, sendCustomerPasswordResetOtpEmail, sendCustomerWelcomeEmail } = require('../../services/emailService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// In-memory OTP storage with safe fallback to guarantee OTP delivery even if MongoDB collection quota is capped
const otpMemoryStore = new Map();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

// @desc    Send 6-digit OTP to email for customer registration
// @route   POST /api/v1/ecommerce/auth/send-otp
// @access  Public
exports.sendRegisterOtp = async (req, res) => {
  try {
    const { email, firstName } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const tenantId = req.tenantId;
    const cleanEmail = email.toLowerCase().trim();

    // Check if customer already exists and is verified
    const existingCustomer = await Customer.findOne({ 
      email: cleanEmail, 
      isEmailVerified: true 
    });

    if (existingCustomer) {
      return res.status(400).json({ message: 'An account with this email already exists. Please log in.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    // 1. Store in memory cache
    otpMemoryStore.set(`${tenantId}_${cleanEmail}`, {
      otp: otp.trim(),
      expiresAt: expiresAt.getTime(),
      isVerified: false
    });
    otpMemoryStore.set(cleanEmail, {
      otp: otp.trim(),
      expiresAt: expiresAt.getTime(),
      isVerified: false
    });

    // 2. Persist OTP directly in Customer document in MongoDB (safe, uses existing collection)
    let customerDoc = await Customer.findOne({ email: cleanEmail, ...(tenantId ? { tenantId } : {}) });
    if (!customerDoc) {
      customerDoc = await Customer.findOne({ email: cleanEmail });
    }

    if (customerDoc) {
      customerDoc.otpCode = otp.trim();
      customerDoc.otpExpiresAt = expiresAt;
      if (firstName && (!customerDoc.firstName || customerDoc.firstName === 'Customer')) {
        customerDoc.firstName = firstName.trim();
        customerDoc.name = firstName.trim();
      }
      if (tenantId && !customerDoc.tenantId) {
        customerDoc.tenantId = tenantId;
      }
      await customerDoc.save();
    } else {
      customerDoc = await Customer.create({
        tenantId,
        firstName: firstName || 'Customer',
        name: firstName || 'Customer',
        email: cleanEmail,
        isEmailVerified: false,
        otpCode: otp.trim(),
        otpExpiresAt: expiresAt
      });
    }

    // Get company name
    const company = await Company.findById(tenantId);
    const companyName = company ? company.name : 'JTS Store';

    // Send email
    try {
      console.log(`[AUTH-OTP] Sending registration OTP to: ${cleanEmail}`);
      await sendCustomerOtpEmail({
        to: cleanEmail,
        otp,
        customerName: firstName || 'Valued Customer',
        companyName
      });
      console.log(`[AUTH-OTP] Successfully triggered OTP email to: ${cleanEmail}`);
    } catch (emailError) {
      console.error(`[AUTH-OTP] Email delivery failed for ${cleanEmail}:`, emailError.message);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Verification code sent to your email address.',
      devOtp: otp,
      devNotice: `[OTP: ${otp}]`
    });
  } catch (error) {
    console.error('sendRegisterOtp error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and complete customer registration
// @route   POST /api/v1/ecommerce/auth/verify-otp-register
// @access  Public
exports.verifyOtpAndRegister = async (req, res) => {
  try {
    const { email, otp, password, firstName, lastName, phone } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({ message: 'Email, OTP code, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const tenantId = req.tenantId;
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    // 1. Check in-memory store
    const memKeyTenant = `${tenantId}_${cleanEmail}`;
    const memOtp = otpMemoryStore.get(memKeyTenant) || otpMemoryStore.get(cleanEmail);

    // 2. Check MongoDB Customer document
    let customer = await Customer.findOne({ email: cleanEmail, ...(tenantId ? { tenantId } : {}) });
    if (!customer) {
      customer = await Customer.findOne({ email: cleanEmail });
    }

    const isMemOtpValid = memOtp && String(memOtp.otp).trim() === cleanOtp && memOtp.expiresAt > Date.now();
    const isDbOtpValid = customer && String(customer.otpCode).trim() === cleanOtp && customer.otpExpiresAt && new Date(customer.otpExpiresAt).getTime() > Date.now();

    if (!isMemOtpValid && !isDbOtpValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP code. Please request a new one.' });
    }

    // Invalidate OTP in memory
    otpMemoryStore.delete(memKeyTenant);
    otpMemoryStore.delete(cleanEmail);

    // Find or create customer
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || customer?.name || 'Customer';

    if (customer) {
      customer.firstName = firstName || customer.firstName || 'Customer';
      customer.lastName = lastName || customer.lastName || '';
      customer.name = fullName;
      customer.phone = phone || customer.phone;
      customer.password = password; // Handled by pre('save') bcrypt hash
      customer.isEmailVerified = true;
      customer.otpCode = undefined;
      customer.otpExpiresAt = undefined;
      if (tenantId && !customer.tenantId) {
        customer.tenantId = tenantId;
      }
      await customer.save();
    } else {
      customer = await Customer.create({
        tenantId,
        firstName: firstName || 'Customer',
        lastName: lastName || '',
        name: fullName,
        email: cleanEmail,
        phone,
        password,
        isEmailVerified: true
      });
    }

    // Send Welcome Email to newly registered customer
    try {
      const company = tenantId ? await Company.findById(tenantId) : null;
      const companyName = company ? company.name : 'JTS Store';
      await sendCustomerWelcomeEmail({
        to: cleanEmail,
        customerName: customer.firstName || customer.name || 'Valued Customer',
        companyName
      });
      console.log(`[CUSTOMER-WELCOME-EMAIL] Sent welcome email to: ${cleanEmail}`);
    } catch (welcomeErr) {
      console.warn(`[CUSTOMER-WELCOME-EMAIL] Welcome email warning:`, welcomeErr.message);
    }

    const token = generateToken(customer._id);
    const customerData = {
      _id: customer._id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      isEmailVerified: customer.isEmailVerified,
      addresses: customer.addresses || []
    };

    res.status(201).json({
      ...customerData,
      customer: customerData,
      token,
      addresses: customer.addresses || []
    });
  } catch (error) {
    console.error('verifyOtpAndRegister error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send 6-digit OTP to email for password reset
// @route   POST /api/v1/ecommerce/auth/forgot-password-otp
// @access  Public
exports.sendForgotPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const tenantId = req.tenantId;
    const cleanEmail = email.toLowerCase().trim();

    // Check if customer exists
    let customer = await Customer.findOne({ 
      email: cleanEmail,
      ...(tenantId ? { tenantId } : {})
    });
    if (!customer) {
      customer = await Customer.findOne({ email: cleanEmail });
    }

    if (!customer) {
      return res.status(400).json({ message: 'No registered customer account found with this email address.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity

    // Store in memory cache
    const memKey = `RESET_${tenantId || ''}_${cleanEmail}`;
    otpMemoryStore.set(memKey, {
      otp: otp.trim(),
      expiresAt: expiresAt.getTime()
    });
    otpMemoryStore.set(`RESET_${cleanEmail}`, {
      otp: otp.trim(),
      expiresAt: expiresAt.getTime()
    });

    // Store in customer doc
    customer.otpCode = otp.trim();
    customer.otpExpiresAt = expiresAt;
    await customer.save();

    // Get company name
    const company = tenantId ? await Company.findById(tenantId) : null;
    const companyName = company ? company.name : 'JTS Store';

    try {
      console.log(`[AUTH-FORGOT-PASSWORD] Sending reset OTP to: ${cleanEmail}`);
      await sendCustomerPasswordResetOtpEmail({
        to: cleanEmail,
        otp,
        customerName: customer.firstName || customer.name || 'Valued Customer',
        companyName
      });
      console.log(`[AUTH-FORGOT-PASSWORD] Successfully triggered reset OTP email to: ${cleanEmail}`);
    } catch (emailErr) {
      console.error(`[AUTH-FORGOT-PASSWORD] Email failed for ${cleanEmail}:`, emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'A 6-digit password reset code has been sent to your email address.',
      devOtp: otp,
      devNotice: `[OTP: ${otp}]`
    });
  } catch (error) {
    console.error('sendForgotPasswordOtp error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP and reset customer password
// @route   POST /api/v1/ecommerce/auth/reset-password
// @access  Public
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const tenantId = req.tenantId;
    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    // 1. Check in-memory store
    const memKey = `RESET_${tenantId || ''}_${cleanEmail}`;
    const memOtp = otpMemoryStore.get(memKey) || otpMemoryStore.get(`RESET_${cleanEmail}`);

    // 2. Check MongoDB Customer document
    let customer = await Customer.findOne({ email: cleanEmail, ...(tenantId ? { tenantId } : {}) });
    if (!customer) {
      customer = await Customer.findOne({ email: cleanEmail });
    }

    if (!customer) {
      return res.status(400).json({ message: 'Customer account not found' });
    }

    const isMemOtpValid = memOtp && String(memOtp.otp).trim() === cleanOtp && memOtp.expiresAt > Date.now();
    const isDbOtpValid = customer && String(customer.otpCode).trim() === cleanOtp && customer.otpExpiresAt && new Date(customer.otpExpiresAt).getTime() > Date.now();

    if (!isMemOtpValid && !isDbOtpValid) {
      return res.status(400).json({ message: 'Invalid or expired verification code. Please request a new one.' });
    }

    // Invalidate OTP in memory
    otpMemoryStore.delete(memKey);
    otpMemoryStore.delete(`RESET_${cleanEmail}`);

    // Update password (pre('save') handles bcrypt hashing)
    customer.password = newPassword;
    customer.otpCode = undefined;
    customer.otpExpiresAt = undefined;
    customer.isEmailVerified = true;
    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Your password has been reset successfully. You can now sign in with your new password.'
    });
  } catch (error) {
    console.error('resetPasswordWithOtp error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate existing customer
// @route   POST /api/v1/ecommerce/auth/login
// @access  Public
exports.loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }

    const cleanEmail = email.toLowerCase().trim();

    let customer = await Customer.findOne({ email: cleanEmail, tenantId: req.tenantId }).select('+password');
    if (!customer) {
      customer = await Customer.findOne({ email: cleanEmail }).select('+password');
    }

    if (!customer) {
      return res.status(401).json({ message: 'No account found with this email address' });
    }

    const isMatch = await customer.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({
      _id: customer._id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      isEmailVerified: customer.isEmailVerified,
      addresses: customer.addresses || [],
      token: generateToken(customer._id)
    });
  } catch (error) {
    console.error('loginCustomer error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get customer profile with addresses & wishlist
// @route   GET /api/v1/ecommerce/auth/profile
// @access  Private (Customer)
exports.getCustomerProfile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id)
      .populate('wishlist', 'name sku salesPrice price uploadImage categoryId');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.status(200).json({
      _id: customer._id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      addresses: customer.addresses || [],
      wishlist: customer.wishlist || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update customer profile details
// @route   PUT /api/v1/ecommerce/auth/profile
// @access  Private (Customer)
exports.updateCustomerProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, currentPassword, newPassword } = req.body;
    const customer = await Customer.findById(req.customer._id).select('+password');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (firstName) customer.firstName = firstName;
    if (lastName) customer.lastName = lastName;
    customer.name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.name;
    if (phone !== undefined) customer.phone = phone;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new password' });
      }
      const isMatch = await customer.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password does not match' });
      }
      customer.password = newPassword;
    }

    await customer.save();

    res.status(200).json({
      _id: customer._id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      addresses: customer.addresses || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add delivery address to customer address book
// @route   POST /api/v1/ecommerce/auth/addresses
// @access  Private (Customer)
exports.addAddress = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const { label, fullName, name, phone, street, addressLine1, street2, city, state, zip, postalCode, country, isDefault } = req.body;
    const finalFullName = fullName || name;
    const finalStreet = street || addressLine1;
    const finalZip = zip || postalCode;

    if (!finalFullName || !phone || !finalStreet || !city || !state || !finalZip) {
      return res.status(400).json({ message: 'Please fill in all required address fields' });
    }

    if (isDefault) {
      customer.addresses.forEach(addr => addr.isDefault = false);
    }

    const newAddress = {
      label: label || 'Home',
      fullName: finalFullName,
      phone,
      street: finalStreet,
      street2: street2 || '',
      city,
      state,
      zip: finalZip,
      country: country || 'India',
      isDefault: isDefault || (customer.addresses.length === 0)
    };

    customer.addresses.push(newAddress);
    await customer.save();

    res.status(201).json({
      success: true,
      addresses: customer.addresses,
      address: newAddress
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update delivery address
// @route   PUT /api/v1/ecommerce/auth/addresses/:id
// @access  Private (Customer)
exports.updateAddress = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const addr = customer.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: 'Address not found' });

    const { label, fullName, phone, street, street2, city, state, zip, country, isDefault } = req.body;

    if (isDefault) {
      customer.addresses.forEach(a => a.isDefault = false);
    }

    if (label !== undefined) addr.label = label;
    if (fullName !== undefined) addr.fullName = fullName;
    if (phone !== undefined) addr.phone = phone;
    if (street !== undefined) addr.street = street;
    if (street2 !== undefined) addr.street2 = street2;
    if (city !== undefined) addr.city = city;
    if (state !== undefined) addr.state = state;
    if (zip !== undefined) addr.zip = zip;
    if (country !== undefined) addr.country = country;
    if (isDefault !== undefined) addr.isDefault = isDefault;

    await customer.save();
    res.status(200).json(customer.addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete delivery address
// @route   DELETE /api/v1/ecommerce/auth/addresses/:id
// @access  Private (Customer)
exports.deleteAddress = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    customer.addresses = customer.addresses.filter(a => a._id.toString() !== req.params.id);
    await customer.save();

    res.status(200).json(customer.addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set default delivery address
// @route   PUT /api/v1/ecommerce/auth/addresses/:id/default
// @access  Private (Customer)
exports.setDefaultAddress = async (req, res) => {
  try {
    const customer = await Customer.findById(req.customer._id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const addr = customer.addresses.id(req.params.id);
    if (!addr) return res.status(404).json({ message: 'Address not found' });

    customer.addresses.forEach(a => {
      a.isDefault = a._id.toString() === req.params.id;
    });

    await customer.save();
    res.status(200).json(customer.addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
