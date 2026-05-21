window.TaskFilters = function(state) {
  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';
  return `
    <div class="filter-bar" style="margin-bottom:15px; display:flex; flex-wrap:wrap; gap:15px">
      <div class="filter-group">
        <label>Date</label>
        <div style="display:flex; gap:5px">
          <input type="date" value="${state.filters.date}" onchange="useDailyTasks.updateFilters('date', this.value)">
          <button class="btn btn-ghost btn-sm" onclick="useDailyTasks.updateFilters('date', '')" title="Show All Dates">All</button>
        </div>
      </div>
      ${isAdmin ? `
      <div class="filter-group">
        <label>Member</label>
        <select onchange="useDailyTasks.updateFilters('memberId', this.value)">
          <option value="">All Members</option>
          ${state.members.map(m => `<option value="${m._id}" ${state.filters.memberId === m._id ? 'selected' : ''}>${m.fullName}</option>`).join('')}
        </select>
      </div>
      ` : ''}
      <div class="filter-group">
        <label>Client</label>
        <select onchange="useDailyTasks.updateFilters('clientId', this.value)">
          <option value="">All Clients</option>
          ${state.clients.map(c => `<option value="${c._id}" ${state.filters.clientId === c._id ? 'selected' : ''}>${c.companyName}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Status</label>
        <select onchange="useDailyTasks.updateFilters('status', this.value)">
          <option value="">All Status</option>
          ${Object.entries(DailyTaskConstants.STATUS_LABELS).map(([val, lbl]) => `
            <option value="${val}" ${state.filters.status === val ? 'selected' : ''}>${lbl}</option>
          `).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label>Duration (Min - Max)</label>
        <div style="display:flex; gap:5px; align-items:center">
          <input type="number" placeholder="Min" style="width:70px" value="${state.filters.durationMin || ''}" onchange="useDailyTasks.updateFilters('durationMin', this.value)">
          <span>-</span>
          <input type="number" placeholder="Max" style="width:70px" value="${state.filters.durationMax || ''}" onchange="useDailyTasks.updateFilters('durationMax', this.value)">
        </div>
      </div>
    </div>
  `;
};
