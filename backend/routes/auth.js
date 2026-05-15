// routes/auth.js
const express = require('express');
const router = express.Router();
const { login, register, getMe, changePassword, verifyOTP, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/register', register);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/update-profile', protect, updateProfile);

module.exports = router;
