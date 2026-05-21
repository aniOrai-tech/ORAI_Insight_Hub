window.TaskSummaryCards = function(state) {
  const summary = state.summary || {
    totalTasks: 0,
    totalWorkingMinutes: 0,
    sessionDurationFormatted: '0h 00m'
  };
  
  const tasks = state.tasks || [];
  const completed = tasks.filter(t => t.status === 'completed').length;
  const pending = tasks.filter(t => t.status !== 'completed').length;
  const activeMembersCount = state.memberDurations ? state.memberDurations.length : 0;

  const totalMinutes = summary.totalWorkingMinutes || 0;
  const formattedDuration = summary.sessionDurationFormatted || '0h 00m';

  return `
    <div class="stats-grid compact" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); align-items: stretch;">
      <!-- 1. Total Productive Time -->
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--accent-dim); color:var(--accent)">
          ${iconTrend()}
        </div>
        <div class="stat-info">
          <div class="stat-label">Total Productive Time</div>
          <div class="stat-value" style="color:var(--accent);">${totalMinutes} mins</div>
          <div class="stat-sub">Aggregated from tasks</div>
        </div>
      </div>

      <!-- 2. Session Duration -->
      <div class="stat-card purple">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Session Duration</div>
          <div class="stat-value" style="color:var(--purple);">${formattedDuration}</div>
          <div class="stat-sub">Total work hours today</div>
        </div>
      </div>

      <!-- 3. Active Members -->
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--accent-dim); color:var(--accent)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Active Members</div>
          <div class="stat-value" style="color:var(--accent);">${activeMembersCount}</div>
          <div class="stat-sub">Logging activity today</div>
        </div>
      </div>

      <!-- 4. Tasks Completed -->
      <div class="stat-card green">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Tasks Completed</div>
          <div class="stat-value" style="color:var(--green);">${completed}</div>
          <div class="stat-sub">Finished today</div>
        </div>
      </div>

      <!-- 5. Pending Tasks -->
      <div class="stat-card yellow">
        <div class="stat-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div class="stat-info">
          <div class="stat-label">Pending Tasks</div>
          <div class="stat-value" style="color:var(--yellow);">${pending}</div>
          <div class="stat-sub">Remaining logs</div>
        </div>
      </div>
    </div>
  `;
};
