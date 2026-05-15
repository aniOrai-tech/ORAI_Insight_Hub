// routes/bots.js
const express = require('express');
const router = express.Router();
const { botController } = require('../controllers/resourceControllers');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', botController.getAll);
router.get('/:id', botController.getOne);
router.post('/', botController.create);
router.put('/:id', botController.update);
router.delete('/:id', botController.delete);

module.exports = router;
