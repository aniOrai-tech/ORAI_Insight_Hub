const express = require('express');
const router = express.Router();
const { requirementController } = require('../controllers/resourceControllers');
const { protect, checkPermission } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect, checkPermission('requirements'));
router.get('/', requirementController.getAll);
router.get('/:id', requirementController.getOne);
router.post('/', upload.single('recording'), requirementController.create);
router.put('/:id', requirementController.update);
router.delete('/:id', requirementController.delete);

module.exports = router;
