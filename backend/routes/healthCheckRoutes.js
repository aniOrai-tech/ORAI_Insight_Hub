const express = require('express');
const router = express.Router();
const HealthCheck = require('../models/HealthCheck');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect);
router.use(checkPermission('healthChecks'));

// GET /api/healthchecks?monthYear=April 2026
router.get('/', async (req, res, next) => {
  try {
    const { monthYear, search } = req.query;
    const { buildSearchFilter } = require('../utils/queryHelper');
    
    let filter = {};
    if (monthYear) filter.monthYear = monthYear;
    if (search) {
      filter = { ...filter, ...buildSearchFilter('HealthCheck', search) };
    }

    const sheets = await HealthCheck.find(filter)
      .populate('createdBy', 'username fullName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: sheets });
  } catch (error) { next(error); }
});

// POST /api/healthchecks - Create single entry
router.post('/', async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    const sheet = await HealthCheck.create(payload);
    await sheet.populate('createdBy', 'username fullName');
    res.status(201).json({ success: true, message: 'Entry created', data: sheet });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join('. ') });
    }
    next(error);
  }
});

// PUT /api/healthchecks/:id - Update entry
router.put('/:id', async (req, res, next) => {
  try {
    const sheet = await HealthCheck.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('createdBy', 'username fullName');
    if (!sheet) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Updated successfully', data: sheet });
  } catch (error) { next(error); }
});

// DELETE /api/healthchecks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const sheet = await HealthCheck.findByIdAndDelete(req.params.id);
    if (!sheet) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) { next(error); }
});

// POST /api/healthchecks/generate - Clone entries from one month to another
router.post('/generate', async (req, res, next) => {
  try {
    const { fromMonthYear, toMonthYear } = req.body;
    
    if (!fromMonthYear || !toMonthYear) {
      return res.status(400).json({ success: false, message: 'Source and target months are required' });
    }

    // Check if target month already has entries
    const existing = await HealthCheck.countDocuments({ monthYear: toMonthYear });
    if (existing > 0) {
      return res.status(400).json({ success: false, message: 'Target month already has entries' });
    }

    // Find entries from source month
    const sourceEntries = await HealthCheck.find({ monthYear: fromMonthYear });
    if (sourceEntries.length === 0) {
      return res.status(404).json({ success: false, message: 'No entries found in source month' });
    }

    // Create new entries
    const newEntries = sourceEntries.map(e => ({
      monthYear: toMonthYear,
      cstPoc: e.cstPoc,
      customerName: e.customerName,
      customerType: e.customerType,
      status: 'active',
      channelsLiveOn: e.channelsLiveOn,
      updateStatus: 'Pending',
      createdBy: req.user._id
    }));

    await HealthCheck.insertMany(newEntries);
    res.json({ success: true, message: `Successfully generated ${newEntries.length} entries for ${toMonthYear}` });
  } catch (error) { next(error); }
});

module.exports = router;

