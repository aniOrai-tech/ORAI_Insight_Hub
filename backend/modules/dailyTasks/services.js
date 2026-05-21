const DailyTask = require('../../models/DailyTask');
const Member = require('../../models/Member');
const { Client } = require('../../models/index');

const DailyTaskService = {
  /**
   * Validate times and calculate duration/hours
   */
  processTimes: (loginTime, logoutTime) => {
    if (!loginTime || !logoutTime) return { durationMinutes: 0, workHoursFormatted: '0h 00m' };
    
    const [loginH, loginM] = loginTime.split(':').map(Number);
    const [logoutH, logoutM] = logoutTime.split(':').map(Number);
    
    let diffMinutes = (logoutH * 60 + logoutM) - (loginH * 60 + loginM);
    if (diffMinutes < 0) diffMinutes += 1440; 
    
    const h = Math.floor(diffMinutes / 60);
    const m = String(diffMinutes % 60).padStart(2, '0');
    
    return {
      durationMinutes: diffMinutes,
      workHoursFormatted: `${h}h ${m}m`
    };
  },

  /**
   * Perform cross-collection search
   */
  searchMembersAndClients: async (search) => {
    const searchRegex = { $regex: search, $options: 'i' };
    const [members, clients] = await Promise.all([
      Member.find({ fullName: searchRegex }).select('_id'),
      Client.find({ companyName: searchRegex }).select('_id')
    ]);
    return {
      memberIds: members.map(m => m._id),
      clientIds: clients.map(c => c._id)
    };
  },

  /**
   * Session Duration Aggregator
   */
  calculateSessionDuration: require('./services/calculateSessionDuration')
};

module.exports = DailyTaskService;
