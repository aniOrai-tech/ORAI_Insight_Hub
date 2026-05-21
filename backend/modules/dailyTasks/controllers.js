const DailyTask = require('../../models/DailyTask');
const User = require('../../models/User');
const { Client } = require('../../models/index');
const DailyTaskService = require('./services');

exports.getTasks = async (req, res, next) => {
  try {
    const { date, status, memberId, clientId, team, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 1. RBAC Filtering
    if (req.user.role !== 'admin' && req.user.username !== 'admin') {
      filter.memberId = req.user.memberId || req.user._id;
    }

    // 2. Search Logic
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      filter.$or = [
        { taskActivity: searchRegex },
        { comments: searchRegex },
        { memberName: searchRegex },
        { clientName: searchRegex }
      ];
    }

    // 3. Status/Member/Client Filters
    if (status) filter.status = status;
    if (memberId) {
      filter.memberId = memberId;
    } else if (team) {
      let departments = [];
      if (team === 'cs') departments = ['CS Team'];
      else if (team === 'implementation') departments = ['Implementation Team', 'Dev Team'];
      else if (team === 'sales') departments = ['Sales Team'];
      
      const users = await User.find({ department: { $in: departments } }, '_id');
      const userIds = users.map(u => u._id);
      filter.memberId = { $in: userIds };
    }
    if (clientId) filter.clientId = clientId;

    // 4. Date Range Filter
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const total = await DailyTask.countDocuments(filter);
    const tasks = await DailyTask.find(filter)
      .populate('memberId', 'fullName designation')
      .populate('clientId', 'companyName')
      .populate('createdBy', 'username fullName')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ 
      success: true, 
      data: tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) { next(err); }
};

exports.createTask = async (req, res, next) => {
  try {
    const { memberId, clientId } = req.body;
    
    // Fetch names for denormalization (Using Admin Panel Users)
    const [member, client] = await Promise.all([
      User.findById(memberId),
      Client.findById(clientId)
    ]);

    const task = await DailyTask.create({
      ...req.body,
      memberName: member ? member.fullName : '',
      clientName: client ? client.companyName : '',
      createdBy: req.user._id
    });

    console.log(`[TASK TIME SAVED] Task created for ${task.memberName}, Minutes: ${task.taskTimeSpentMinutes}`);

    res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
};

exports.updateTask = async (req, res, next) => {
  try {
    const { memberId, clientId } = req.body;
    const updateData = { ...req.body };

    if (memberId) {
      const member = await User.findById(memberId);
      if (member) updateData.memberName = member.fullName;
    }
    if (clientId) {
      const client = await Client.findById(clientId);
      if (client) updateData.clientName = client.companyName;
    }
    
    const task = await DailyTask.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('memberId', 'fullName').populate('clientId', 'companyName');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    console.log(`[TASK TIME SAVED] Task updated for ${task.memberName}, New Minutes: ${task.taskTimeSpentMinutes}`);

    res.json({ success: true, data: task });
  } catch (err) { next(err); }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await DailyTask.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) { next(err); }
};

exports.getSummary = async (req, res, next) => {
  try {
    const { date, memberId, team } = req.query;
    const filter = {};
    
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }
    
    if (req.user.role !== 'admin' && req.user.username !== 'admin') {
      filter.memberId = req.user.memberId || req.user._id;
    } else if (memberId) {
      filter.memberId = memberId;
    } else if (team) {
      let departments = [];
      if (team === 'cs') departments = ['CS Team'];
      else if (team === 'implementation') departments = ['Implementation Team', 'Dev Team'];
      else if (team === 'sales') departments = ['Sales Team'];
      
      const users = await User.find({ department: { $in: departments } }, '_id');
      const userIds = users.map(u => u._id);
      filter.memberId = { $in: userIds };
    }

    const tasks = await DailyTask.find(filter);
    const totalMinutes = tasks.reduce((sum, t) => sum + (Number(t.taskTimeSpentMinutes) || 0), 0);
    
    console.log(`[SESSION DURATION CALCULATED] Total: ${totalMinutes}m for filter:`, filter);

    res.json({
      success: true,
      data: {
        totalTasks: tasks.length,
        totalWorkingMinutes: totalMinutes,
        sessionDurationFormatted: `${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, '0')}m`
      }
    });
  } catch (err) { next(err); }
};

exports.getAggregatedDurations = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date required' });

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const stats = await DailyTask.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$memberId",
          memberName: { $first: "$memberName" },
          totalMinutes: { $sum: "$taskTimeSpentMinutes" },
          taskCount: { $sum: 1 }
        }
      },
      { $sort: { totalMinutes: -1 } }
    ]);

    console.log(`[MEMBER DAILY AGGREGATION COMPLETE] Date: ${date}, Members: ${stats.length}`);

    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
};
