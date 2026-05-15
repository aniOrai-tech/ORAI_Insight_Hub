const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/financeController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',       ctrl.getInvoices);
router.get('/:id',    ctrl.getInvoice);
router.post('/',      ctrl.createInvoice);
router.put('/:id',    ctrl.updateInvoice);
router.delete('/:id', ctrl.deleteInvoice);

console.log('[FINANCE MODULE INITIALIZED] — Invoices');
module.exports = router;
