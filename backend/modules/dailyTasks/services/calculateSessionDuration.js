const DailyTask = require('../../../models/DailyTask');

/**
 * calculateSessionDuration Service
 * Responsibilities:
 * - Fetch all tasks for a member on a specific date
 * - Sum taskTimeSpentMinutes
 * - Convert to Hh Mm format
 * - Return structured data
 */
const calculateSessionDuration = async (memberId, dateStr) => {
  try {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);

    const tasks = await DailyTask.find({
      memberId,
      date: { $gte: start, $lte: end }
    });

    const totalMinutes = tasks.reduce((sum, t) => sum + (Number(t.taskTimeSpentMinutes) || 0), 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const formatted = `${hours}h ${String(minutes).padStart(2, '0')}m`;

    return {
      memberId,
      date: dateStr,
      taskCount: tasks.length,
      totalMinutes,
      formattedDuration: formatted,
      tasks: tasks.map(t => ({
        id: t._id,
        activity: t.taskActivity,
        minutes: t.taskTimeSpentMinutes
      }))
    };
  } catch (error) {
    console.error('[SESSION SERVICE ERROR]', error);
    throw error;
  }
};

module.exports = calculateSessionDuration;
