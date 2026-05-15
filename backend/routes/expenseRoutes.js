const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/financeController');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/',       ctrl.getExpenses);
router.post('/',      upload.single('receipt'), ctrl.createExpense);
router.put('/:id',    ctrl.updateExpense);
router.delete('/:id', ctrl.deleteExpense);

// Finance-wide analytics
router.get('/analytics/finance', ctrl.getFinanceAnalytics);

console.log('[FINANCE MODULE INITIALIZED] — Expenses');
module.exports = router;
