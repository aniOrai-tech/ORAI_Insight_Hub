/**
 * Dashboard Overview — Analytics & Charts
 */

let chartInstances = {};

async function renderDashboard(container) {
  container.innerHTML = `
    <div class="dashboard-welcome-banner" style="margin-bottom: 28px; padding: 30px; background: var(--accent-dim); border: 1px solid var(--border); border-radius: var(--radius-xl); position: relative; overflow: hidden;">
      <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: radial-gradient(circle, var(--accent-dim) 0%, transparent 70%); border-radius: 50%;"></div>
      <div style="position: relative; z-index: 1">
        <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--accent); margin-bottom: 8px">System Overview</div>
        <div class="section-title" style="font-size: 2rem; background: linear-gradient(90deg, var(--text-primary), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 6px">
          Welcome, ${(currentUser.fullName || currentUser.username).replace(/\sUser$/i, '')}
        </div>
        <div class="section-sub" style="font-size: 1rem; color: var(--text-muted)">
          ${currentUser.department} · ${new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </div>
      </div>
    </div>


    <!-- Stat Cards -->
    <div class="stats-grid" id="stats-grid">
      ${[1,2,3,4].map(() => `<div class="stat-card"><div class="skeleton" style="height:42px;width:42px;border-radius:10px;margin-bottom:14px"></div><div class="skeleton" style="height:36px;width:80px;margin-bottom:6px"></div><div class="skeleton" style="height:14px;width:120px"></div></div>`).join('')}
    </div>

    <!-- Charts -->
    <div class="charts-grid" id="charts-grid">
      <div class="chart-card">
        <div class="chart-card-header">
          <div><div class="chart-title">Meetings Over Time</div><div class="chart-subtitle">Last 6 months</div></div>
        </div>
        <div class="chart-wrapper"><canvas id="chart-meetings"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header">
          <div><div class="chart-title">Bot Integrations</div><div class="chart-subtitle">By type</div></div>
        </div>
        <div class="chart-wrapper"><canvas id="chart-bots"></canvas></div>
      </div>
      ${(currentUser.permissions || {}).upsell ? `
      <div class="chart-card">
        <div class="chart-card-header">
          <div><div class="chart-title">Upsell Pipeline</div><div class="chart-subtitle">Deal status breakdown</div></div>
        </div>
        <div class="chart-wrapper"><canvas id="chart-upsell"></canvas></div>
      </div>` : ''}
      ${(currentUser.permissions || {}).requirements ? `
      <div class="chart-card">
        <div class="chart-card-header">
          <div><div class="chart-title">Requirements</div><div class="chart-subtitle">By priority</div></div>
        </div>
        <div class="chart-wrapper"><canvas id="chart-reqs"></canvas></div>
      </div>` : ''}
    </div>

    <!-- Recent Activity Feed -->
    <div class="table-card" style="margin-top: 24px">
      <div class="table-header">
        <div class="table-title">Recent Activity</div>
        <div class="table-actions">
          <button class="btn btn-ghost btn-sm" onclick="navigateTo('meetings')">View All</button>
        </div>
      </div>
      <div id="recent-activity-list" style="padding: 10px 20px">
        <div class="skeleton" style="height: 40px; margin-bottom: 10px"></div>
        <div class="skeleton" style="height: 40px; margin-bottom: 10px"></div>
        <div class="skeleton" style="height: 40px"></div>
      </div>
    </div>

    <!-- Expiring Soon Alert -->
    <div id="expiry-alert"></div>
  `;

  // Fetch analytics
  const res = await api.analytics.get();
  if (!res.ok) {
    toast('Failed to load analytics', 'error');
    return;
  }

  const d = res.data.data;
  renderStatCards(d);
  renderCharts(d);
  renderRecentActivity(d.meetings?.recent || []);
  renderExpiryAlert(d.meetings);
}

function renderRecentActivity(meetings) {
  const el = document.getElementById('recent-activity-list');
  if (!el) return;

  if (!meetings.length) {
    el.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:20px 0">No recent activity detected.</p>';
    return;
  }

  el.innerHTML = meetings.map(m => `
    <div class="activity-item" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(56,189,248,0.05)">
      <div style="width:36px;height:36px;border-radius:50%;background:rgba(56,189,248,0.1);display:flex;align-items:center;justify-content:center;color:var(--accent);flex-shrink:0">
        ${m.calendarEventId ? iconCalendar() : iconPlus()}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.875rem;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.header || m.title || 'Untitled Meeting'}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${m.calendarEventId ? 'Synced from Teams' : 'Manually created'} · ${formatDate(m.scheduledDate)}</div>
      </div>
      <div style="text-align:right">
        <span class="badge ${ (new Date(m.expiryDate) < new Date() || m.status === 'expired') ? 'badge-red' : 'badge-green' }" style="font-size:0.65rem">
          ${ (new Date(m.expiryDate) < new Date() || m.status === 'expired') ? 'Expired' : 'Active' }
        </span>
      </div>
    </div>
  `).join('');
}

function renderStatCards(d) {
  const perms = currentUser.permissions || {};
  const cards = [
    {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      value: d.meetings?.total || 0,
      label: 'Total Meetings',
      sub: `${d.meetings?.active || 0} active · ${d.meetings?.expired || 0} expired`,
      color: 'blue',
      link: 'meetings'
    },
    {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/></svg>`,
      value: d.bots?.active || 0,
      label: 'Active Bots',
      sub: `${d.bots?.total || 0} total`,
      color: 'purple',
      link: 'bots'
    },
    perms.clients ? {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      value: d.clients?.total || 0,
      label: 'Active Clients',
      sub: `${d.clients?.recentClients || 0} added this month`,
      color: 'green',
      link: 'clients'
    } : null,
    perms.upsell ? {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
      value: formatCurrency(d.upsell?.totalRevenue || 0),
      label: 'Upsell Revenue',
      sub: `${d.upsell?.won || 0} deals won`,
      color: 'yellow',
      link: 'upsell'
    } : null,
    perms.requirements ? {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
      value: d.requirements?.total || 0,
      label: 'Requirements',
      sub: `${d.requirements?.new || 0} new · ${d.requirements?.inProgress || 0} in progress`,
      color: 'blue',
      link: 'requirements'
    } : null,
    {
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      value: d.meetings?.expiringSoon || 0,
      label: 'Expiring Soon',
      sub: 'Within 7 days',
      color: d.meetings?.expiringSoon > 0 ? 'red' : 'green',
      link: 'meetings'
    }
  ].filter(Boolean);

  const colorClass = { blue: '', green: ' green', red: ' red', yellow: ' yellow', purple: ' purple' };

  document.getElementById('stats-grid').innerHTML = cards.map(c => `
    <div class="stat-card${colorClass[c.color] || ''} clickable" onclick="navigateTo('${c.link}')" style="cursor:pointer">
      <div class="stat-icon">${c.icon}</div>
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
      <div class="stat-sub">${c.sub}</div>
    </div>
  `).join('');
}

function renderCharts(d) {
  // Chart defaults (Theme Aware)
  const computedStyle = getComputedStyle(document.body);
  Chart.defaults.color = computedStyle.getPropertyValue('--text-muted').trim() || '#64748b';
  Chart.defaults.borderColor = computedStyle.getPropertyValue('--border').trim() || 'rgba(168, 85, 247, 0.1)';

  const accent = computedStyle.getPropertyValue('--accent').trim() || '#a855f7';
  const accentDark = computedStyle.getPropertyValue('--accent-dark').trim() || '#7e22ce';
  const green = '#22c55e';
  const yellow = '#fbbf24';
  const red = '#f87171';
  const purple = '#a78bfa';

  // â”€ Meetings over time (Bar) â”€
  const mpm = d.charts?.meetingsPerMonth || [];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  destroyChart('chart-meetings');
  const mCtx = document.getElementById('chart-meetings');
  if (mCtx) {
    chartInstances['chart-meetings'] = new Chart(mCtx, {
      type: 'bar',
      data: {
        labels: mpm.map(m => `${monthNames[m._id.month - 1]} ${m._id.year}`),
        datasets: [{
          label: 'Meetings',
          data: mpm.map(m => m.count),
          backgroundColor: 'rgba(56,189,248,0.2)',
          borderColor: accent,
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: {
        x: { grid: { color: 'rgba(56,189,248,0.06)' } },
        y: { grid: { color: 'rgba(56,189,248,0.06)' }, beginAtZero: true }
      }}
    });
  }

  // â”€ Bot integrations (Doughnut) â”€
  const integrations = d.bots?.integrations || [];
  destroyChart('chart-bots');
  const bCtx = document.getElementById('chart-bots');
  if (bCtx) {
    chartInstances['chart-bots'] = new Chart(bCtx, {
      type: 'doughnut',
      data: {
        labels: integrations.map(i => i._id || 'None'),
        datasets: [{
          data: integrations.map(i => i.count),
          backgroundColor: [accent, green, yellow, purple, red],
          borderColor: '#111f33',
          borderWidth: 3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: {
        legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } }
      }, cutout: '65%' }
    });
  }

  // â”€ Upsell pipeline (Horizontal bar) â”€
  if ((currentUser.permissions || {}).upsell) {
    const upsellStatus = d.upsell?.byStatus || [];
    destroyChart('chart-upsell');
    const uCtx = document.getElementById('chart-upsell');
    if (uCtx) {
      const statusColors = { pending: yellow, negotiation: purple, closed_won: green, closed_lost: red };
      chartInstances['chart-upsell'] = new Chart(uCtx, {
        type: 'bar',
        data: {
          labels: upsellStatus.map(u => u._id),
          datasets: [{
            data: upsellStatus.map(u => u.count),
            backgroundColor: upsellStatus.map(u => statusColors[u._id] || accent),
            borderRadius: 6
          }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { color: 'rgba(56,189,248,0.06)' } }, y: { grid: { display: false } } }
        }
      });
    }
  }

  // â”€ Requirements by priority (Pie) â”€
  if ((currentUser.permissions || {}).requirements) {
    const reqPriority = d.requirements?.byPriority || [];
    destroyChart('chart-reqs');
    const rCtx = document.getElementById('chart-reqs');
    if (rCtx) {
      const pColors = { low: green, medium: accent, high: yellow, urgent: red };
      chartInstances['chart-reqs'] = new Chart(rCtx, {
        type: 'pie',
        data: {
          labels: reqPriority.map(r => r._id),
          datasets: [{
            data: reqPriority.map(r => r.count),
            backgroundColor: reqPriority.map(r => pColors[r._id] || purple),
            borderColor: '#111f33', borderWidth: 3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: {
          legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } }
        }}
      });
    }
  }
}

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function renderExpiryAlert(meetingStats) {
  const el = document.getElementById('expiry-alert');
  if (!el || !meetingStats?.expiringSoon) return;

  if (meetingStats.expiringSoon > 0) {
    el.innerHTML = `
      <div style="background:var(--yellow-bg);border:1px solid rgba(251,191,36,0.25);border-radius:var(--radius-lg);padding:16px 22px;display:flex;align-items:center;gap:14px;margin-bottom:20px;cursor:pointer" onclick="navigateTo('meetings')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div>
          <strong style="color:var(--yellow)">${meetingStats.expiringSoon} meeting${meetingStats.expiringSoon > 1 ? 's' : ''} expiring within 7 days</strong>
          <p style="color:var(--text-muted);font-size:0.82rem;margin:2px 0 0">Click to view meetings and take action.</p>
        </div>
        <svg style="margin-left:auto;color:var(--text-muted)" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;
  }
}


// â”€â”€â”€ Dashboard Filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openGoLiveFilter(btn) {
  // Generate filter items (Last 12 months)
  const items = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    items.push({ label, value: label });
  }

  toggleExcelFilter(btn, {
    module: 'Dashboard',
    column: 'GoLiveDate',
    items: items
  });
}

window.applyDashboardFilter = async function(column, selectedValues) {
  toast(`Filtering by: ${selectedValues.join(', ')}`, 'success');
  // In a real app, we would fetch new analytics with these filters.
  // For this demo, we'll simulate the update.
  const res = await api.analytics.get({ liveMonths: selectedValues.join(',') });
  if (res.ok) {
    const d = res.data.data;
    renderStatCards(d);
    renderCharts(d);
  }
};
