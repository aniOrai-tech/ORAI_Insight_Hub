/**
 * Auth Controller
 * Login with OTP email verification, register, and user profile management
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailService');

// In-memory OTP store (userId → { otp, expiresAt, userData })
// In production, use Redis or DB
const otpStore = new Map();

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: user.toSafeObject()
    });
  } catch (err) {
    console.error('Update profile error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP email
 */
const sendOTPEmail = async (email, otp, username) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7e22ce, #a855f7); padding: 28px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 22px; }
    .body { padding: 32px; text-align: center; }
    .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #a855f7; background: #0f172a; border-radius: 12px; padding: 20px 32px; display: inline-block; margin: 20px 0; border: 2px dashed rgba(168, 85, 247, 0.3); }
    .info { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-top: 16px; }
    .footer { background: #0f172a; padding: 16px 32px; text-align: center; }
    .footer p { color: #475569; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Login Verification</h1>
    </div>
    <div class="body">
      <p style="color: #e2e8f0; font-size: 16px; margin-bottom: 8px;">Hello <strong>${username}</strong>,</p>
      <p style="color: #94a3b8; font-size: 14px;">Use the code below to complete your login:</p>
      <div class="otp-code">${otp}</div>
      <p class="info">This code expires in <strong>5 minutes</strong>.<br>If you didn't request this, please ignore this email.</p>
    </div>
    <div class="footer">
      <p>ORAI Insight Hub — Secure Login Verification</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to: email,
    subject: `🔐 Your ORAI Login Code: ${otp}`,
    html
  });
};

/**
 * POST /api/auth/login
 * Step 1: Validate credentials → send OTP to user's email
 */
const login = async (req, res, next) => {
  try {
    const { username, password, department } = req.body;

    if (!username || !password || !department) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and department are required'
      });
    }

    // Find user by username and department
    const user = await User.findOne({ username, department }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or department mismatch. Please ensure your account is registered in the Admin Panel.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is inactive. Contact admin.'
      });
    }

    // Send OTP to the specific requested email
    const userEmail = "anitasingh365tech@gmail.com";
    if (!userEmail) {
      // No email registered — skip OTP, login directly (for backward compatibility)
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      const token = generateToken(user._id);
      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: user.toSafeObject()
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    otpStore.set(user._id.toString(), {
      otp,
      expiresAt,
      attempts: 0
    });

    // Send OTP email
    try {
      await sendOTPEmail(userEmail, otp, user.fullName || user.username);
      console.log(`🔐 OTP sent to ${userEmail} for user ${username}. OTP CODE: ${otp}`);
    } catch (emailError) {
      console.error(`❌ Failed to send OTP email:`, emailError.message);
      // If email fails, login directly as fallback
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      const token = generateToken(user._id);
      return res.json({
        success: true,
        message: 'Login successful (email service unavailable)',
        token,
        user: user.toSafeObject()
      });
    }

    // Mask the email for display
    const maskedEmail = userEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3');

    res.json({
      success: true,
      otpRequired: true,
      userId: user._id,
      maskedEmail,
      message: `OTP sent to ${maskedEmail}`
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 * Step 2: Verify OTP and complete login
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'User ID and OTP are required'
      });
    }

    const stored = otpStore.get(userId);
    if (!stored) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found. Please login again.'
      });
    }

    // Check expiry
    if (new Date() > stored.expiresAt) {
      otpStore.delete(userId);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please login again.'
      });
    }

    // Check attempts (max 3)
    if (stored.attempts >= 3) {
      otpStore.delete(userId);
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please login again.'
      });
    }

    // Verify OTP
    if (stored.otp !== otp.trim()) {
      stored.attempts++;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${3 - stored.attempts} attempt(s) remaining.`
      });
    }

    // OTP verified — clean up and complete login
    otpStore.delete(userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toSafeObject()
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register
 * Admin function to create users
 */
const register = async (req, res, next) => {
  try {
    const { username, password, department, fullName, email } = req.body;

    // Check if username exists
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    const user = await User.create({
      username,
      password,
      department,
      fullName,
      email
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      user: req.user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, verifyOTP, register, getMe, changePassword, updateProfile };
