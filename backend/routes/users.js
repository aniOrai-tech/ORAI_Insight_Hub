const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Middleware to ensure user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.username !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

// GET /api/users - Get all users
router.get('/', protect, requireAdmin, async (req, res, next) => {
  try {
    const users = await User.find().sort('-createdAt');
    const safeUsers = users.map(u => u.toSafeObject());
    res.json({ success: true, data: safeUsers });
  } catch (err) {
    next(err);
  }
});

// POST /api/users - Create new user (Admin)
router.post('/', protect, requireAdmin, async (req, res, next) => {
  try {
    const { username, password, department, fullName, email } = req.body;
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Username already exists' });
    }
    const user = await User.create({ username, password, department, fullName, email });
    res.status(201).json({ success: true, message: 'User created successfully', data: user.toSafeObject() });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    next(error);
  }
});

// PUT /api/users/:id/status - Toggle user active status
router.put('/:id/status', protect, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.username === 'admin') return res.status(400).json({ success: false, message: 'Cannot deactivate admin' });
    
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    
    res.json({ success: true, message: 'User status updated', data: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id - Update user details
router.put('/:id', protect, requireAdmin, async (req, res, next) => {
  try {
    const { fullName, department, email, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (fullName) user.fullName = fullName;
    if (department) user.department = department;
    if (email) user.email = email;
    if (password) user.password = password;

    await user.save();
    res.json({ success: true, message: 'User updated successfully', data: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', protect, requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.username === 'admin') return res.status(400).json({ success: false, message: 'Cannot delete primary admin' });

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
