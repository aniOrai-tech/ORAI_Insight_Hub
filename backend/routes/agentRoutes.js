const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { protect } = require('../middleware/auth');

router.post('/query', protect, agentController.handleQuery);

module.exports = router;
