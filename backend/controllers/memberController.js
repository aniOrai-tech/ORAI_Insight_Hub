/**
 * Member Controller
 * Handles team member management for Daily Task Update module
 */

const User = require('../models/User');

exports.getAllMembers = async (req, res, next) => {
  try {
    const { status, department } = req.query;
    const filter = {};
    
    // Default to active users for the dropdown
    if (status === 'all') {
      // No filter on isActive
    } else if (status) {
      filter.isActive = status === 'active';
    } else {
      filter.isActive = true; // Default to active only
    }
    
    if (department) filter.department = department;

    // Fetch from User collection (Admin Panel Members)
    const users = await User.find(filter).sort({ fullName: 1 });
    
    // Map to a structure the frontend expects
    const members = users.map(u => ({
      _id: u._id,
      fullName: u.fullName || u.username,
      email: u.email,
      department: u.department,
      isActive: u.isActive
    }));

    res.json({ success: true, data: members });
  } catch (error) { next(error); }
};

exports.createMember = async (req, res, next) => {
  try {
    const member = await Member.create({
      ...req.body,
      createdBy: req.user._id
    });
    console.log('[MEMBER CREATED]', member.fullName);
    res.status(201).json({ success: true, data: member });
  } catch (error) { next(error); }
};

exports.updateMember = async (req, res, next) => {
  try {
    const member = await Member.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, data: member });
  } catch (error) { next(error); }
};

exports.deleteMember = async (req, res, next) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });
    res.json({ success: true, message: 'Member deleted' });
  } catch (error) { next(error); }
};
