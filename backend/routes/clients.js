const express = require('express');
const router = express.Router();
const { clientController } = require('../controllers/resourceControllers');
const { protect, checkPermission } = require('../middleware/auth');

router.use(protect);
// Public-auth route for metadata (dropdowns)
router.get('/all', clientController.getAll);

router.use(checkPermission('clients'));
router.get('/', clientController.getAll);
router.get('/:id', clientController.getOne);
router.post('/', clientController.create);
router.put('/:id', clientController.update);
router.delete('/:id', clientController.delete);

module.exports = router;
