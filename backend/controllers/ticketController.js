/**
 * Ticket Controller — Full CRUD + Assignment + Notes + Analytics
 */

const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { sanitizePayload } = require('../services/mappers/accountMapper');

// ─── LIST: Paginated, filterable, searchable ──────────────────────────────────
exports.getTickets = async (req, res, next) => {
  try {
    const { search, status, priority, assignedTo, assignedToName, category, page = 1, limit = 20 } = req.query;
    const filter = req.user.role === 'admin' ? { isDeleted: false } : { department: req.user.department, isDeleted: false };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (assignedToName) filter.assignedToName = assignedToName;
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { ticketId: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'username fullName')
      .populate('assignedTo', 'username fullName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Check SLA breaches on read
    const now = new Date();
    for (const t of tickets) {
      if (t.slaDeadline && now > t.slaDeadline && !['resolved', 'closed'].includes(t.status) && !t.slaBreach) {
        t.slaBreach = true;
        await t.save();
      }
    }

    console.log(`[TICKET MODULE] Listed ${tickets.length} tickets for ${req.user.department}`);

    res.json({
      success: true,
      data: tickets,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    });
  } catch (error) { next(error); }
};

// ─── GET ONE ──────────────────────────────────────────────────────────────────
exports.getTicket = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id, isDeleted: false } : { _id: req.params.id, department: req.user.department, isDeleted: false };
    const ticket = await Ticket.findOne(query)
      .populate('createdBy', 'username fullName')
      .populate('assignedTo', 'username fullName')
      .populate('notes.author', 'username fullName');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, data: ticket });
  } catch (error) { next(error); }
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
exports.createTicket = async (req, res, next) => {
  try {
    const sanitizedBody = sanitizePayload(req.body, 'Ticket');
    const data = {
      ...sanitizedBody,
      createdBy: req.user._id,
      department: req.user.department
    };

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      data.attachments = req.files.map(f => ({
        filename: f.filename,
        originalName: f.originalname,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype
      }));
    }

    const ticket = await Ticket.create(data);
    await ticket.populate('createdBy', 'username fullName');

    // Create activity log
    await require('../models/TicketActivity').create({
      ticketId: ticket._id,
      type: 'field_update',
      content: 'Ticket created',
      performedBy: req.user._id,
      performedByName: req.user.fullName || req.user.username
    });

    console.log(`[TICKET CREATED] ${ticket.ticketId}: "${ticket.subject}" by ${req.user.username}`);

    res.status(201).json({ success: true, message: `Ticket ${ticket.ticketId} created`, data: ticket });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors).map(e => e.message).join('. ') });
    }
    next(error);
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
exports.updateTicket = async (req, res, next) => {
  try {
    const sanitizedBody = sanitizePayload(req.body, 'Ticket');
    const query = req.user.role === 'admin' ? { _id: req.params.id, isDeleted: false } : { _id: req.params.id, department: req.user.department, isDeleted: false };
    const ticket = await Ticket.findOneAndUpdate(
      query,
      sanitizedBody,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username fullName').populate('assignedTo', 'username fullName');

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    // Log status change if applicable
    if (req.body.status) {
      await require('../models/TicketActivity').create({
        ticketId: ticket._id,
        type: 'status_change',
        newValue: req.body.status,
        performedBy: req.user._id,
        performedByName: req.user.fullName || req.user.username
      });
    }

    console.log(`[TICKET UPDATED] ${ticket.ticketId}: status=${ticket.status}, priority=${ticket.priority}`);

    res.json({ success: true, message: 'Ticket updated', data: ticket });
  } catch (error) { next(error); }
};

// ─── DELETE (soft) ────────────────────────────────────────────────────────────
exports.deleteTicket = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, department: req.user.department };
    const ticket = await Ticket.findOneAndUpdate(
      query,
      { isDeleted: true },
      { new: true }
    );
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    console.log(`[TICKET DELETED] ${ticket.ticketId}`);
    res.json({ success: true, message: 'Ticket deleted' });
  } catch (error) { next(error); }
};

// ─── ADD NOTE ─────────────────────────────────────────────────────────────────
exports.addNote = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id, isDeleted: false } : { _id: req.params.id, department: req.user.department, isDeleted: false };
    const ticket = await Ticket.findOne(query);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    ticket.notes.push({
      content: req.body.content,
      author: req.user._id,
      authorName: req.user.fullName || req.user.username,
      isInternal: req.body.isInternal !== false
    });

    // Track first response
    if (!ticket.firstResponseAt && ticket.notes.length === 1) {
      ticket.firstResponseAt = new Date();
    }

    await ticket.save();

    // Log comment activity
    await require('../models/TicketActivity').create({
      ticketId: ticket._id,
      type: 'comment',
      content: req.body.content,
      performedBy: req.user._id,
      performedByName: req.user.fullName || req.user.username
    });

    console.log(`[NOTE ADDED] Ticket ${ticket.ticketId} — note by ${req.user.username}`);

    res.json({ success: true, message: 'Note added', data: ticket });
  } catch (error) { next(error); }
};

// ─── ASSIGN ───────────────────────────────────────────────────────────────────
exports.assignTicket = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const agent = await User.findById(assignedTo);
    if (!agent) return res.status(400).json({ success: false, message: 'Agent not found' });

    const query = req.user.role === 'admin' ? { _id: req.params.id, isDeleted: false } : { _id: req.params.id, department: req.user.department, isDeleted: false };
    const ticket = await Ticket.findOneAndUpdate(
      query,
      { assignedTo: agent._id, assignedToName: agent.fullName || agent.username, status: 'in_progress' },
      { new: true }
    ).populate('assignedTo', 'username fullName');

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    console.log(`[TICKET ASSIGNED] ${ticket.ticketId} → ${agent.fullName || agent.username}`);

    res.json({ success: true, message: `Ticket assigned to ${agent.fullName || agent.username}`, data: ticket });
  } catch (error) { next(error); }
};

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
exports.getTicketAnalytics = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? { isDeleted: false } : { department: req.user.department, isDeleted: false };

    const [total, open, inProgress, pending, resolved, closed, slaBreached] = await Promise.all([
      Ticket.countDocuments(filter),
      Ticket.countDocuments({ ...filter, status: 'open' }),
      Ticket.countDocuments({ ...filter, status: 'in_progress' }),
      Ticket.countDocuments({ ...filter, status: 'pending' }),
      Ticket.countDocuments({ ...filter, status: 'resolved' }),
      Ticket.countDocuments({ ...filter, status: 'closed' }),
      Ticket.countDocuments({ ...filter, slaBreach: true, status: { $nin: ['resolved', 'closed'] } })
    ]);

    const byPriority = await Ticket.aggregate([
      { $match: filter },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const byCategory = await Ticket.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Agent performance
    const agentPerformance = await Ticket.aggregate([
      { $match: { ...filter, assignedTo: { $ne: null } } },
      { $group: {
        _id: '$assignedToName',
        total: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $in: ['$status', ['resolved', 'closed']] }, 1, 0] } },
        breached: { $sum: { $cond: ['$slaBreach', 1, 0] } }
      }},
      { $sort: { total: -1 } }
    ]);

    res.json({
      success: true,
      data: { total, open, inProgress, pending, resolved, closed, slaBreached, byPriority, byCategory, agentPerformance }
    });
  } catch (error) { next(error); }
};

module.exports = exports;
