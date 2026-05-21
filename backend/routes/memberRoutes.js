const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect);

router.get('/', memberController.getAllMembers);

// Admin only for management
router.post('/', adminOnly, memberController.createMember);
router.route('/:id')
  .put(adminOnly, memberController.updateMember)
  .delete(adminOnly, memberController.deleteMember);

module.exports = router;
