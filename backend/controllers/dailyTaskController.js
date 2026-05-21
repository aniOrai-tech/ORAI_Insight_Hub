const DailyTask = require('../models/DailyTask');
const Member = require('../models/Member');
const User = require('../models/User');
const { Client } = require('../models/index');
const { buildSearchFilter } = require('../utils/queryHelper');

exports.getAllTasks = async (req, res, next) => {
  try {
    const { date, memberId, clientId, status, search, durationMin, durationMax } = req.query;
    const filter = {};
    
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      
      // Support cross-collection search
      const [matchingMembers, matchingClients] = await Promise.all([
        Member.find({ fullName: searchRegex }).select('_id'),
        Client.find({ companyName: searchRegex }).select('_id')
      ]);

      const mIds = matchingMembers.map(m => m._id);
      const cIds = matchingClients.map(c => c._id);

      filter.$or = [
        { taskActivity: searchRegex },
        { comments: searchRegex },
        { status: searchRegex },
        { memberId: { $in: mIds } },
        { clientId: { $in: cIds } },
        { memberName: searchRegex },
        { clientName: searchRegex }
      ];
    }

    // Duration filters
    if (durationMin || durationMax) {
      filter.taskTimeSpentMinutes = {};
      if (durationMin) filter.taskTimeSpentMinutes.$gte = Number(durationMin);
      if (durationMax) filter.taskTimeSpentMinutes.$lte = Number(durationMax);
    }

    // RBAC
    if (req.user.role !== 'admin' && req.user.username !== 'admin') {
      filter.createdBy = req.user._id;
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    if (memberId) filter.memberId = memberId;
    if (clientId) filter.clientId = clientId;
    if (status) filter.status = status;

    console.log('[DAILY TASK FETCH] Filter:', JSON.stringify(filter));
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      DailyTask.find(filter)
        .populate('memberId', 'fullName designation')
        .populate('clientId', 'companyName spocName')
        .populate('createdBy', 'username fullName')
        .populate('ticketId', 'ticketId subject status priority')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DailyTask.countDocuments(filter)
    ]);

    res.json({ 
      success: true, 
      data: tasks,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) { next(error); }
};

exports.createTask = async (req, res, next) => {
  try {
    const data = {
      ...req.body,
      createdBy: req.user._id
    };

    // Handle ticket linking — clear empty string
    if (!data.ticketId || data.ticketId === '' || data.ticketId === 'null') {
      delete data.ticketId;
    }

    // Handle file attachments from multer
    if (req.files && req.files.length > 0) {
      data.attachments = req.files.map(f => ({
        filename: f.filename,
        originalName: f.originalname,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype
      }));
    }

    // Handle names for frontend compatibility if not provided
    if (data.memberId && !data.memberName) {
      const member = await Member.findById(data.memberId);
      if (member) {
        data.memberName = member.fullName;
      } else {
        const user = await User.findById(data.memberId);
        if (user) data.memberName = user.fullName || user.username;
      }
    }
    if (data.clientId && !data.clientName) {
      const client = await Client.findById(data.clientId);
      if (client) data.clientName = client.companyName;
    }

    const task = await DailyTask.create(data);
    
    await task.populate('memberId', 'fullName');
    await task.populate('clientId', 'companyName');
    if (task.ticketId) await task.populate('ticketId', 'ticketId subject status priority');
    
    console.log('[TASK CREATED] Session Duration:', task.sessionDurationMinutes, '| Task Time Spent:', task.taskTimeSpentMinutes);
    res.status(201).json({ success: true, data: task });
  } catch (error) { next(error); }
};

exports.updateTask = async (req, res, next) => {
  try {
    const task = await DailyTask.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    // Handle names for frontend compatibility
    if (req.body.memberId) {
      const member = await Member.findById(req.body.memberId);
      if (member) {
        req.body.memberName = member.fullName;
      } else {
        const user = await User.findById(req.body.memberId);
        if (user) req.body.memberName = user.fullName || user.username;
      }
    }
    if (req.body.clientId) {
      const client = await Client.findById(req.body.clientId);
      if (client) req.body.clientName = client.companyName;
    }

    // Handle ticket linking — clear empty string
    if (!req.body.ticketId || req.body.ticketId === '' || req.body.ticketId === 'null') {
      req.body.ticketId = undefined;
      task.ticketId = undefined;
    }

    // Handle new file attachments
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(f => ({
        filename: f.filename,
        originalName: f.originalname,
        path: f.path,
        size: f.size,
        mimetype: f.mimetype
      }));
      task.attachments = [...(task.attachments || []), ...newAttachments];
    }

    // Update fields
    Object.assign(task, req.body);
    await task.save();

    await task.populate('memberId', 'fullName');
    await task.populate('clientId', 'companyName');
    if (task.ticketId) await task.populate('ticketId', 'ticketId subject status priority');

    res.json({ success: true, data: task });
  } catch (error) { next(error); }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await DailyTask.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) { next(error); }
};

exports.getSummary = async (req, res, next) => {
  try {
    const { date, memberId } = req.query;
    const filter = {};
    
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }
    
    if (memberId) filter.memberId = memberId;

    const tasks = await DailyTask.find(filter).populate('clientId', 'companyName');
    
    const totalMinutes = tasks.reduce((sum, t) => sum + (Number(t.taskTimeSpentMinutes) || 0), 0);
    const summary = {
      totalTasks: tasks.length,
      totalWorkingMinutes: totalMinutes,
      sessionDurationFormatted: `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`,
      clientBreakdown: {}
    };

    tasks.forEach(t => {
      const cName = t.clientId ? t.clientId.companyName : 'Unknown';
      if (!summary.clientBreakdown[cName]) summary.clientBreakdown[cName] = 0;
      summary.clientBreakdown[cName] += t.taskTimeSpentMinutes || 0;
    });

    console.log('[PRODUCTIVE HOURS CALCULATED]', summary.sessionDurationFormatted);
    console.log('[TASK ANALYTICS GENERATED]', { date, totalMinutes });

    res.json({ success: true, data: summary });
  } catch (error) { next(error); }
};

exports.getMemberDailyDurations = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const aggregations = await DailyTask.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$memberId",
          memberName: { $first: "$memberName" },
          totalMinutes: { $sum: "$taskTimeSpentMinutes" },
          taskCount: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          formattedDuration: {
            $concat: [
              { $toString: { $floor: { $divide: ["$totalMinutes", 60] } } },
              "h ",
              { $toString: { $mod: ["$totalMinutes", 60] } },
              "m"
            ]
          }
        }
      },
      { $sort: { totalMinutes: -1 } }
    ]);

    res.json({ success: true, data: aggregations });
  } catch (error) { next(error); }
};
