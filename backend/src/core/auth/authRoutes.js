const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  managerOverride, 
  setPosPin,
  forgotPassword,
  resetPassword
} = require('./authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.post('/manager-override', protect, managerOverride);
router.post('/set-pos-pin', protect, setPosPin);

module.exports = router;

