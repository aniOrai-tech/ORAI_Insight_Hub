/**
 * Analytics Controller
 * Provides aggregated data for dashboard charts
 */

const Meeting = require('../models/Meeting');
const { Bot, Client, Upsell, Requirement } = require('../models/index');

const getAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const isAdmin = req.user.role === 'admin' || req.user.username === 'admin';
    const filter = isAdmin ? { isDeleted: { $ne: true } } : { department: req.user.department, isDeleted: { $ne: true } };
    
    // DEBUG LOG:
    console.log(`[ANALYTICS] User: ${req.user.username}, isAdmin: ${isAdmin}, filter: ${JSON.stringify(filter)}`);

    // --- Meeting stats ---
    const [totalMeetings, activeMeetings, expiredMeetings, expiringMeetings] = await Promise.all([
      Meeting.countDocuments(filter),
      Meeting.countDocuments({ 
        ...filter, 
        status: 'active', 
        expiryDate: { $gte: now } 
      }),
      Meeting.countDocuments({ 
        ...filter, 
        $or: [
          { status: 'expired' },
          { status: 'active', expiryDate: { $lt: now } }
        ]
      }),
      Meeting.countDocuments({
        ...filter, status: 'active',
        expiryDate: { $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), $gte: now }
      })
    ]);

    // Fetch 5 most recent meetings for activity feed
    const recentMeetings = await Meeting.find(filter)
      .sort({ updatedAt: -1 })
      .limit(5);

    // Meetings per month (last 6 months)
    const meetingsPerMonth = await Meeting.aggregate([
      { $match: { ...filter, createdAt: { $gte: new Date(now - 180 * 24 * 60 * 60 * 1000) } } },
      { $group: {
        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // --- Bot stats ---
    const [totalBots, activeBots] = await Promise.all([
      Bot.countDocuments(filter),
      Bot.countDocuments({ ...filter, isActive: true })
    ]);

    // Bot account types breakdown
    const botTypes = await Bot.aggregate([
      { $match: filter },
      { $group: { _id: '$accountType', count: { $sum: 1 } } }
    ]);

    // Bot remark breakdown (integrations)
    const botIntegrations = await Bot.aggregate([
      { $match: filter },
      { $group: { _id: '$remark', count: { $sum: 1 } } }
    ]);

    let analyticsData = {
      meetings: { 
        total: totalMeetings, 
        active: activeMeetings, 
        expired: expiredMeetings, 
        expiringSoon: expiringMeetings,
        recent: recentMeetings 
      },
      bots: { total: totalBots, active: activeBots, types: botTypes, integrations: botIntegrations },
      charts: { meetingsPerMonth }
    };

    // --- CS Team & Sales: Client + Upsell stats ---
    const permissions = req.user.getPermissions();

    if (permissions.clients) {
      const totalClients = await Client.countDocuments(filter);
      const recentClients = await Client.countDocuments({ ...filter, createdAt: { $gte: thirtyDaysAgo } });
      analyticsData.clients = { total: totalClients, recentClients };
    }

    if (permissions.upsell) {
      const [totalUpsells, wonDeals, pendingDeals] = await Promise.all([
        Upsell.countDocuments(filter),
        Upsell.countDocuments({ ...filter, status: 'closed_won' }),
        Upsell.countDocuments({ ...filter, status: 'pending' })
      ]);

      // Revenue from received payments
      const revenueAgg = await Upsell.aggregate([
        { $match: { ...filter, paymentReceived: true } },
        { $group: { _id: null, total: { $sum: '$proposalAmount' } } }
      ]);
      const totalRevenue = revenueAgg[0]?.total || 0;

      // Upsell by status
      const upsellByStatus = await Upsell.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      analyticsData.upsell = { total: totalUpsells, won: wonDeals, pending: pendingDeals, totalRevenue, byStatus: upsellByStatus };
    }

    if (permissions.requirements) {
      const [totalReqs, newReqs, inProgressReqs, completedReqs] = await Promise.all([
        Requirement.countDocuments(filter),
        Requirement.countDocuments({ ...filter, status: 'new' }),
        Requirement.countDocuments({ ...filter, status: 'in_progress' }),
        Requirement.countDocuments({ ...filter, status: 'completed' })
      ]);

      const reqByPriority = await Requirement.aggregate([
        { $match: filter },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]);

      analyticsData.requirements = { total: totalReqs, new: newReqs, inProgress: inProgressReqs, completed: completedReqs, byPriority: reqByPriority };
    }

    res.json({ success: true, data: analyticsData });
  } catch (error) { next(error); }
};

module.exports = { getAnalytics };
