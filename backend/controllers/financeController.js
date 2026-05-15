/**
 * Finance Controller — Invoice, Payment, Expense CRUD + Analytics
 */

const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const { sanitizePayload } = require('../services/mappers/accountMapper');

// ═══════════════════════════════════════════════════════════════ INVOICES

exports.getInvoices = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const filter = { department: req.user.department, isDeleted: false };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Invoice.countDocuments(filter);
    const invoices = await Invoice.find(filter)
      .populate('createdBy', 'username fullName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Auto-check overdue on read
    const now = new Date();
    for (const inv of invoices) {
      if (inv.dueDate && now > inv.dueDate && !['paid', 'cancelled', 'draft'].includes(inv.status)) {
        if (inv.status !== 'overdue') { inv.status = 'overdue'; await inv.save(); }
      }
    }

    res.json({ success: true, data: invoices, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, department: req.user.department, isDeleted: false })
      .populate('createdBy', 'username fullName');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    // Get payments linked to this invoice
    const payments = await Payment.find({ invoiceId: invoice._id, isDeleted: false }).sort({ paymentDate: -1 });

    res.json({ success: true, data: { ...invoice.toJSON(), payments } });
  } catch (error) { next(error); }
};

exports.createInvoice = async (req, res, next) => {
  try {
    const sanitizedBody = sanitizePayload(req.body, 'Invoice');
    const data = { ...sanitizedBody, createdBy: req.user._id, department: req.user.department };

    // Calculate totals from items
    if (data.items && data.items.length > 0) {
      let subtotal = 0, taxTotal = 0;
      data.items = data.items.map(item => {
        const amount = (item.quantity || 1) * (item.rate || 0);
        const taxAmt = amount * ((item.taxPercent || 0) / 100);
        subtotal += amount;
        taxTotal += taxAmt;
        return { ...item, amount, taxAmount: taxAmt };
      });
      data.subtotal = subtotal;
      data.taxTotal = taxTotal;

      let discountAmt = 0;
      if (data.discountType === 'percent') {
        discountAmt = subtotal * ((data.discount || 0) / 100);
      } else {
        discountAmt = data.discount || 0;
      }
      data.grandTotal = subtotal + taxTotal - discountAmt;
      data.balanceDue = data.grandTotal - (data.paidAmount || 0);
    }

    const invoice = await Invoice.create(data);
    console.log(`[INVOICE CREATED] ${invoice.invoiceNumber} for ${invoice.clientName} — ₹${invoice.grandTotal}`);
    res.status(201).json({ success: true, message: `Invoice ${invoice.invoiceNumber} created`, data: invoice });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join('. ') });
    }
    next(error);
  }
};

exports.updateInvoice = async (req, res, next) => {
  try {
    const data = sanitizePayload(req.body, 'Invoice');

    // Recalculate totals if items changed
    if (data.items && data.items.length > 0) {
      let subtotal = 0, taxTotal = 0;
      data.items = data.items.map(item => {
        const amount = (item.quantity || 1) * (item.rate || 0);
        const taxAmt = amount * ((item.taxPercent || 0) / 100);
        subtotal += amount;
        taxTotal += taxAmt;
        return { ...item, amount, taxAmount: taxAmt };
      });
      data.subtotal = subtotal;
      data.taxTotal = taxTotal;
      let discountAmt = data.discountType === 'percent' ? subtotal * ((data.discount || 0) / 100) : (data.discount || 0);
      data.grandTotal = subtotal + taxTotal - discountAmt;
      data.balanceDue = data.grandTotal - (data.paidAmount || 0);
    }

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, department: req.user.department, isDeleted: false },
      data, { new: true, runValidators: true }
    ).populate('createdBy', 'username fullName');

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice updated', data: invoice });
  } catch (error) { next(error); }
};

exports.deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, department: req.user.department },
      { isDeleted: true }, { new: true }
    );
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════ PAYMENTS

exports.getPayments = async (req, res, next) => {
  try {
    const { invoiceId, page = 1, limit = 20 } = req.query;
    const filter = { department: req.user.department, isDeleted: false };
    if (invoiceId) filter.invoiceId = invoiceId;

    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('createdBy', 'username fullName')
      .populate('invoiceId', 'invoiceNumber clientName grandTotal')
      .sort({ paymentDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: payments, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const data = { ...req.body, createdBy: req.user._id, department: req.user.department };

    // Validate invoice exists
    const invoice = await Invoice.findOne({ _id: data.invoiceId, department: req.user.department, isDeleted: false });
    if (!invoice) return res.status(400).json({ success: false, message: 'Invoice not found' });

    data.invoiceNumber = invoice.invoiceNumber;
    data.clientName = invoice.clientName;
    data.clientId = invoice.clientId;

    const payment = await Payment.create(data);

    // Update invoice paid amount
    invoice.paidAmount = (invoice.paidAmount || 0) + payment.amount;
    await invoice.save(); // triggers auto-status calculation

    console.log(`[PAYMENT RECORDED] ${payment.paymentId} — ₹${payment.amount} for ${invoice.invoiceNumber}`);

    res.status(201).json({ success: true, message: `Payment ${payment.paymentId} recorded`, data: payment });
  } catch (error) { next(error); }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, department: req.user.department },
      { isDeleted: true }, { new: true }
    );
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    // Reverse the amount on the invoice
    if (payment.invoiceId) {
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        invoice.paidAmount = Math.max(0, (invoice.paidAmount || 0) - payment.amount);
        await invoice.save();
      }
    }

    res.json({ success: true, message: 'Payment deleted and invoice updated' });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════ EXPENSES

exports.getExpenses = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;
    const filter = { department: req.user.department, isDeleted: false };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { expenseId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .populate('createdBy', 'username fullName')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: expenses, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
};

exports.createExpense = async (req, res, next) => {
  try {
    const sanitizedBody = sanitizePayload(req.body, 'Expense');
    const data = { ...sanitizedBody, createdBy: req.user._id, department: req.user.department };

    if (req.file) {
      data.receipt = {
        filename: req.file.filename, originalName: req.file.originalname,
        path: req.file.path, size: req.file.size, mimetype: req.file.mimetype
      };
    }

    // Calculate tax
    if (data.taxPercent && data.amount) {
      data.taxAmount = data.amount * (data.taxPercent / 100);
    }

    const expense = await Expense.create(data);
    console.log(`[EXPENSE RECORDED] ${expense.expenseId} — ₹${expense.amount} (${expense.category})`);
    res.status(201).json({ success: true, message: `Expense ${expense.expenseId} recorded`, data: expense });
  } catch (error) { next(error); }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const sanitizedBody = sanitizePayload(req.body, 'Expense');
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, department: req.user.department, isDeleted: false },
      sanitizedBody, { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense updated', data: expense });
  } catch (error) { next(error); }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, department: req.user.department },
      { isDeleted: true }, { new: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════ FINANCE ANALYTICS

exports.getFinanceAnalytics = async (req, res, next) => {
  try {
    const dept = req.user.department;
    const f = { department: dept, isDeleted: false };

    // Invoice stats
    const [totalInvoices, draftInv, sentInv, paidInv, overdueInv, partialInv] = await Promise.all([
      Invoice.countDocuments(f),
      Invoice.countDocuments({ ...f, status: 'draft' }),
      Invoice.countDocuments({ ...f, status: 'sent' }),
      Invoice.countDocuments({ ...f, status: 'paid' }),
      Invoice.countDocuments({ ...f, status: 'overdue' }),
      Invoice.countDocuments({ ...f, status: 'partially_paid' })
    ]);

    // Revenue aggregation
    const revenueAgg = await Invoice.aggregate([
      { $match: { ...f, status: { $in: ['paid', 'partially_paid'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$paidAmount' }, totalInvoiced: { $sum: '$grandTotal' } } }
    ]);
    const { totalRevenue = 0, totalInvoiced = 0 } = revenueAgg[0] || {};

    // Pending amount
    const pendingAgg = await Invoice.aggregate([
      { $match: { ...f, status: { $nin: ['paid', 'cancelled', 'draft'] } } },
      { $group: { _id: null, totalPending: { $sum: '$balanceDue' } } }
    ]);
    const totalPending = pendingAgg[0]?.totalPending || 0;

    // Monthly collections (last 6 months)
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyCollections = await Payment.aggregate([
      { $match: { department: dept, isDeleted: false, status: 'completed', paymentDate: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: '$paymentDate' }, year: { $year: '$paymentDate' } }, total: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Expense stats
    const expenseAgg = await Expense.aggregate([
      { $match: { ...f, status: { $ne: 'rejected' } } },
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
    ]);
    const totalExpenses = expenseAgg[0]?.totalExpenses || 0;

    const expenseByCategory = await Expense.aggregate([
      { $match: { ...f, status: { $ne: 'rejected' } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);

    console.log(`[FINANCE ANALYTICS] Dept: ${dept} — Revenue: ₹${totalRevenue}, Pending: ₹${totalPending}`);

    res.json({
      success: true,
      data: {
        invoices: { total: totalInvoices, draft: draftInv, sent: sentInv, paid: paidInv, overdue: overdueInv, partiallyPaid: partialInv },
        revenue: { totalRevenue, totalInvoiced, totalPending, netProfit: totalRevenue - totalExpenses },
        expenses: { totalExpenses, byCategory: expenseByCategory },
        charts: { monthlyCollections }
      }
    });
  } catch (error) { next(error); }
};
