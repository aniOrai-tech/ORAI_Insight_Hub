window.TaskSearch = function(state) {
  const currentUser = window.currentUser || {};
  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';
  const members = Array.isArray(state?.members) ? state.members : [];
  const currentTeamFilter = state?.filters?.team || '';
  const currentMemberFilter = state?.filters?.memberId || '';

  const getMemberTeam = (m) => {
    const dept = (m.department || '').toLowerCase();
    if (dept.includes('cs')) return 'cs';
    if (dept.includes('implementation') || dept.includes('dev')) return 'implementation';
    if (dept.includes('sales')) return 'sales';
    return '';
  };

  const filteredMembers = currentTeamFilter
    ? members.filter(m => getMemberTeam(m) === currentTeamFilter)
    : members;

  // Team options with icons
  const teamOptions = [
    { value: '', label: 'All Teams', icon: '👥' },
    { value: 'implementation', label: 'Implementation', icon: '⚙️' },
    { value: 'sales', label: 'Sales', icon: '📈' },
    { value: 'cs', label: 'Customer Success', icon: '🎯' }
  ];

  let teamSelectHTML = '';
  let memberSelectHTML = '';

  if (isAdmin) {
    // Admin Team Selector
    teamSelectHTML = `
      <div class="dt-selector-group">
        <div class="dt-selector-label">
          <span class="dt-selector-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
          <span class="dt-selector-text">Team</span>
        </div>
        <div class="dt-select-wrapper">
          <select id="dashboard-team-select" class="dt-select"
            onchange="useDailyTasks.setFilter('team', this.value)">
            ${teamOptions.map(t => `<option value="${t.value}" ${currentTeamFilter === t.value ? 'selected' : ''}>${t.icon} ${t.label}</option>`).join('')}
          </select>
          <div class="dt-select-arrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
      </div>
    `;

    // Admin Member Selector
    let options = `<option value="">👤 All Members / Resources</option>`;
    filteredMembers.forEach(m => {
      options += `<option value="${m._id}" ${currentMemberFilter === m._id ? 'selected' : ''}>📊 ${m.fullName || m.username}</option>`;
    });

    memberSelectHTML = `
      <div class="dt-selector-group">
        <div class="dt-selector-label">
          <span class="dt-selector-icon resource-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </span>
          <span class="dt-selector-text">Resource</span>
        </div>
        <div class="dt-select-wrapper">
          <select id="dashboard-member-select" class="dt-select dt-select-wide"
            onchange="useDailyTasks.setFilter('memberId', this.value)">
            ${options}
          </select>
          <div class="dt-select-arrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  } else {
    // Non-admin: locked selectors
    const myTeam = getMemberTeam(currentUser);
    const myTeamLabel = myTeam === 'cs' ? 'Customer Success' : myTeam === 'sales' ? 'Sales' : myTeam === 'implementation' ? 'Implementation' : 'My Team';
    const myTeamIcon = myTeam === 'cs' ? '🎯' : myTeam === 'sales' ? '📈' : myTeam === 'implementation' ? '⚙️' : '👥';

    teamSelectHTML = `
      <div class="dt-selector-group dt-locked">
        <div class="dt-selector-label">
          <span class="dt-selector-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
            </svg>
          </span>
          <span class="dt-selector-text">Team</span>
        </div>
        <div class="dt-select-wrapper">
          <select class="dt-select" disabled>
            <option>${myTeamIcon} ${myTeamLabel}</option>
          </select>
          <div class="dt-select-lock">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>
      </div>
    `;

    memberSelectHTML = `
      <div class="dt-selector-group dt-locked">
        <div class="dt-selector-label">
          <span class="dt-selector-icon resource-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
            </svg>
          </span>
          <span class="dt-selector-text">Resource</span>
        </div>
        <div class="dt-select-wrapper">
          <select class="dt-select dt-select-wide" disabled>
            <option>📊 ${currentUser.fullName || currentUser.username}</option>
          </select>
          <div class="dt-select-lock">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  // Date quick-filter chips
  const currentDate = state?.filters?.date || '';
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const dateChips = `
    <div class="dt-date-chips">
      <button class="dt-chip ${currentDate === today ? 'active' : ''}" onclick="useDailyTasks.setFilter('date', '${today}')">Today</button>
      <button class="dt-chip ${currentDate === yesterday ? 'active' : ''}" onclick="useDailyTasks.setFilter('date', '${yesterday}')">Yesterday</button>
      <button class="dt-chip ${!currentDate ? 'active' : ''}" onclick="useDailyTasks.setFilter('date', '')">All Time</button>
    </div>
  `;

  return `
    <div class="dt-search-bar">
      <div class="dt-selectors-row">
        ${teamSelectHTML}
        <div class="dt-selector-divider"></div>
        ${memberSelectHTML}
        <div class="dt-selector-divider hide-mobile"></div>
        ${dateChips}
      </div>
      <div class="dt-actions-row">
        <button class="dt-export-btn" onclick="DailyTaskDashboard.exportCSV()" title="Export to CSV">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Export</span>
        </button>
      </div>
    </div>
  `;
};
