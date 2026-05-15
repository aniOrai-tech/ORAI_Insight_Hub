const express = require('express');
const router = express.Router();
const { upsellController } = require('../controllers/resourceControllers');
const { protect, checkPermission } = require('../middleware/auth');

const upload = require('../middleware/upload');
 
 router.use(protect, checkPermission('upsell'));
 router.get('/', upsellController.getAll);
 router.get('/:id', upsellController.getOne);
 router.post('/', upload.single('proposalFile'), upsellController.create);
 router.put('/:id', upload.single('proposalFile'), upsellController.update);
router.delete('/:id', upsellController.delete);

module.exports = router;
