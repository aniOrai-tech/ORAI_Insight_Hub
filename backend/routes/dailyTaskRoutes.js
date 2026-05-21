const express = require('express');
const router = express.Router();
const dailyTaskController = require('../controllers/dailyTaskController');
const upload = require('../middleware/upload');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/', dailyTaskController.getAllTasks);
router.post('/', upload.array('attachments', 5), dailyTaskController.createTask);
router.get('/summary', dailyTaskController.getSummary);

router.route('/:id')
  .put(upload.array('attachments', 5), dailyTaskController.updateTask)
  .delete(dailyTaskController.deleteTask);

module.exports = router;
