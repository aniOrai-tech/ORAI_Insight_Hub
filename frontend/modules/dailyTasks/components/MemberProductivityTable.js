window.MemberProductivityTable = function(state) {
  const durations = Array.isArray(state.memberDurations) ? state.memberDurations : [];
  const selectedDate = state.filters.date;

  const format = window.formatMinutesToHours;

  if (durations.length === 0) return '';

  return `
    <div class="card" style="margin-top: 24px; border: 1px solid var(--border); border-radius:12px; overflow: hidden;">
      <div class="table-header" style="background: var(--bg-surface); padding: 15px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
        <div style="display:flex; align-items:center; gap:10px">
          <div style="color: var(--accent); background: var(--accent-dim); padding:8px; border-radius:8px">${iconTrend()}</div>
          <div class="table-title" style="font-size: 1rem; font-weight: 700;">Member Work Hour Summary (Server Aggregated)</div>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted)">Live productivity metrics from backend pipeline</div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 85px;">Date</th>
              <th style="width: 180px;">Member Name</th>
              <th class="text-center" style="width: 120px;">Total Tasks</th>
              <th class="text-center" style="width: 130px;">Total Minutes</th>
              <th class="text-center" style="width: 130px;">Total Duration</th>
              <th class="text-center" style="width: auto; min-width: 140px;">Avg Task Duration</th>
            </tr>
          </thead>
          <tbody>
            ${durations.map(r => `
                <tr>
                  <td class="td-mono">${new Date(selectedDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                  <td style="font-weight: 600;">${r.memberName || 'Unknown'}</td>
                  <td class="text-center"><span class="badge" style="background:var(--bg-body)">${r.taskCount || 0}</span></td>
                  <td class="td-mono text-center" style="font-weight: 700; color: var(--accent)">${r.totalMinutes || 0}m</td>
                  <td class="td-mono text-center" style="font-weight: 700; color: var(--purple)">${format(r.totalMinutes)}</td>
                  <td class="td-mono text-center" style="color:var(--text-muted)">
                    ${r.taskCount > 0 ? (r.totalMinutes / r.taskCount).toFixed(1) : 0}m
                  </td>
                </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};
