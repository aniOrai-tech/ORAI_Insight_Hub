window.TaskTable = function(tasks) {
  if (!Array.isArray(tasks)) tasks = [];
  
  const state = useDailyTasks.getState();
  const isSearchActive = state.filters.search && state.filters.search.trim().length > 0;

  // 1. Pre-calculate member totals strictly PER DAY
  const dailyMemberTotals = {}; // Key: memberId + '_' + dateString
  tasks.forEach(t => {
    const mId = t.memberId?._id || t.memberId || 'unknown';
    const dateStr = new Date(t.date).toISOString().split('T')[0];
    const key = `${mId}_${dateStr}`;
    
    if (!dailyMemberTotals[key]) dailyMemberTotals[key] = 0;
    dailyMemberTotals[key] += (Number(t.taskTimeSpentMinutes) || 0);
  });

  const format = window.formatMinutesToHours;

  if (tasks.length === 0) {
    return `
      <tr><td colspan="9" class="empty-state">
        <div style="padding:60px 20px; text-align:center; color:var(--text-muted)">
          <div style="margin-bottom:15px; opacity:0.5">${iconActivity()}</div>
          <div style="font-size:1.1rem; font-weight:600; color:var(--text-secondary)">
            ${isSearchActive ? 'No matching tasks found' : 'No tasks added yet'}
          </div>
          <p style="margin-top:8px; font-size:0.85rem">
            ${isSearchActive ? 'Try adjusting your search or filters' : 'Click "Add Daily Task" to log your work.'}
          </p>
        </div>
      </td></tr>
    `;
  }

  return tasks.map((t) => {
    return `
      <tr>
        <td class="td-mono">${new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
        <td style="font-weight: 600; white-space: nowrap;">${t.memberName || '-'}</td>
        <td class="td-mono">${window.formatTimeToAMPM(t.loginTime) || '10:00 AM'}</td>
        <td class="td-mono">${window.formatTimeToAMPM(t.logoutTime) || '07:00 PM'}</td>
        <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.taskActivity || ''}">${t.taskActivity || '-'}</td>
        <td class="td-mono text-center">
          <span style="font-weight:700; color:var(--accent)">${t.taskTimeSpentMinutes || 0}m</span>
        </td>
        <td class="td-mono text-center" style="font-weight:700; color:var(--purple)">
          ${t.workHoursFormatted || window.formatMinutesToHours(t.taskTimeSpentMinutes || 0)}
        </td>
        <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${t.comments || ''}">${t.comments || '-'}</td>
        <td>
          <div style="display:flex;gap:4px;justify-content:center">
            <button class="btn btn-ghost btn-icon" onclick="AddTaskModal.open('${t._id}')" title="Edit">${iconEdit()}</button>
            <button class="btn btn-ghost btn-icon" style="color:var(--red)" onclick="useDailyTasks.deleteTask('${t._id}')" title="Delete">${iconTrash()}</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};
