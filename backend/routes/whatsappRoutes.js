const express = require('express');
const router = express.Router();
const WhatsAppDetails = require('../models/WhatsAppDetails');
const { protect, checkPermission } = require('../middleware/auth');

// Apply auth and permission checks
router.use(protect);
router.use(checkPermission('whatsapp'));

// GET /api/whatsapp - List all details
router.get('/', async (req, res, next) => {
  try {
    const details = await WhatsAppDetails.find()
      .populate('createdBy', 'username fullName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: details });
  } catch (error) { next(error); }
});

// POST /api/whatsapp - Create new detail
router.post('/', async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    const detail = await WhatsAppDetails.create(payload);
    await detail.populate('createdBy', 'username fullName');
    res.status(201).json({ success: true, message: 'WhatsApp details created', data: detail });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join('. ') });
    }
    next(error);
  }
});

// PUT /api/whatsapp/:id - Update detail
router.put('/:id', async (req, res, next) => {
  try {
    const detail = await WhatsAppDetails.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('createdBy', 'username fullName');
    if (!detail) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Updated successfully', data: detail });
  } catch (error) { next(error); }
});

// DELETE /api/whatsapp/:id - Delete detail
router.delete('/:id', async (req, res, next) => {
  try {
    const detail = await WhatsAppDetails.findByIdAndDelete(req.params.id);
    if (!detail) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) { next(error); }
});

module.exports = router;
