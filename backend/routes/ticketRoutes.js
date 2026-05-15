const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/ticketController');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',          ctrl.getTickets);
router.get('/analytics', ctrl.getTicketAnalytics);
router.get('/:id',       ctrl.getTicket);
router.post('/',         upload.array('attachments', 5), ctrl.createTicket);
router.put('/:id',       ctrl.updateTicket);
router.delete('/:id',    ctrl.deleteTicket);
router.post('/:id/notes',  ctrl.addNote);
router.patch('/:id/assign', ctrl.assignTicket);

console.log('[TICKET MODULE INITIALIZED]');
module.exports = router;
