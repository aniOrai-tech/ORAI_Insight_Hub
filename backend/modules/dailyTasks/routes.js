const express = require('express');
const router = express.Router();
const controller = require('./controllers');
const { protect } = require('../../middleware/auth');

// All daily task routes are protected
router.use(protect);

router.get('/', controller.getTasks);
router.get('/summary', controller.getSummary);
router.get('/durations', controller.getAggregatedDurations);

router.post('/', controller.createTask);
router.put('/:id', controller.updateTask);
router.delete('/:id', controller.deleteTask);

module.exports = router;
