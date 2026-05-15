const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/financeController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',       ctrl.getPayments);
router.post('/',      ctrl.recordPayment);
router.delete('/:id', ctrl.deletePayment);

console.log('[FINANCE MODULE INITIALIZED] — Payments');
module.exports = router;
