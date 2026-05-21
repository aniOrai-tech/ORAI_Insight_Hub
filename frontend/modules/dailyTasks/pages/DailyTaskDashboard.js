window.DailyTaskDashboard = {
  render: (container) => {
    console.log("[DAILY TASK DASHBOARD] Rendering Production UI...");
    
    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2 class="section-title">Daily Task Update</h2>
          <div class="section-sub">Track productivity and work logs across the team</div>
        </div>
        <div class="header-actions">
          <button class="btn btn-ghost" onclick="toggleAllFilterIcons()">
            ${iconTrend()} <span>Filters</span>
          </button>
          <button class="btn btn-primary" onclick="AddTaskModal.open()">
            ${iconPlus()} <span>Add Daily Task</span>
          </button>
        </div>
      </div>

      <div id="task-summary-container"></div>

      <div class="card table-card" style="margin-top: 20px;">
        <div id="task-search-container" style="padding: 16px; border-bottom: 1px solid var(--border)"></div>
        <div id="task-filters-container" style="padding: 16px; background: var(--bg-body); display: none;"></div>
        
        <div class="table-container" style="border-bottom: 1px solid var(--border);">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 85px;">Date</th>
                <th style="width: 140px;">Member</th>
                <th style="width: 95px;">Login</th>
                <th style="width: 95px;">Logout</th>
                <th style="width: 260px;">Task/Activity</th>
                <th class="text-center" style="width: 130px;">Duration (In Min)</th>
                <th class="text-center" style="width: 110px;">Work Hours</th>
                <th style="width: auto; min-width: 180px;">Comments</th>
                <th style="width: 90px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody id="task-table-body">
              <tr><td colspan="9" class="loading-state">Initializing module...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="task-pagination-container" style="padding: 16px;"></div>
      </div>

      <!-- Member sheet tabs outside with a blank space margin -->
      <div class="sheet-tabs-bar" id="daily-tasks-sheet-tabs"></div>
    `;

    // 2. Subscribe to state updates
    useDailyTasks.subscribe((state) => {
      try {
        const summaryArea = document.getElementById('task-summary-container');
        const searchArea = document.getElementById('task-search-container');
        const filtersArea = document.getElementById('task-filters-container');
        const tableBody = document.getElementById('task-table-body');
        const paginationArea = document.getElementById('task-pagination-container');
        const productivityArea = document.getElementById('member-productivity-container');
        const tabsEl = document.getElementById('daily-tasks-sheet-tabs');

        if (!tableBody) return;

        // Update Summary & Search
        if (summaryArea) summaryArea.innerHTML = TaskSummaryCards(state);
        if (searchArea) searchArea.innerHTML = TaskSearch(state);
        if (filtersArea) {
          filtersArea.innerHTML = TaskFilters(state);
          filtersArea.style.display = document.body.classList.contains('filters-active') ? 'block' : 'none';
        }

        // Handle Loading State
        if (state.loading && state.tasks.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="9" class="loading-state" style="padding:40px; text-align:center">Loading tasks...</td></tr>`;
        } else {
          tableBody.innerHTML = TaskTable(state.tasks);
        }

        // Update Sheet Tabs
        if (tabsEl) {
          const membersList = Array.isArray(state.members) ? state.members : [];
          const currentUser = window.currentUser || {};
          const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';
          const currentTeamFilter = state.filters.team || '';

          const getMemberTeam = (m) => {
            const dept = (m.department || '').toLowerCase();
            if (dept.includes('cs')) return 'cs';
            if (dept.includes('implementation') || dept.includes('dev')) return 'implementation';
            if (dept.includes('sales')) return 'sales';
            return '';
          };

          const filteredMembersList = currentTeamFilter
            ? membersList.filter(m => getMemberTeam(m) === currentTeamFilter)
            : membersList;
          
          let tabsHTML = '';
          if (isAdmin) {
            const isAllActive = !state.filters.memberId;
            tabsHTML += `
              <div class="sheet-tab ${isAllActive ? 'active' : ''}" onclick="useDailyTasks.setFilter('memberId', '')">
                <span class="sheet-tab-icon">👥</span>
                <span class="sheet-tab-name">All Members</span>
              </div>
            `;
          }

          filteredMembersList.forEach(m => {
            // Hide tabs for other members if user is not admin
            if (!isAdmin && String(m._id) !== String(currentUser._id)) return;
            
            const isTabActive = state.filters.memberId === m._id;
            const durationObj = state.memberDurations.find(d => String(d._id) === String(m._id));
            const durationStr = durationObj ? ` (${window.formatMinutesToHours(durationObj.totalMinutes)})` : '';

            tabsHTML += `
              <div class="sheet-tab ${isTabActive ? 'active' : ''}" onclick="useDailyTasks.setFilter('memberId', '${m._id}')">
                <span class="sheet-tab-icon">📊</span>
                <span class="sheet-tab-name">${m.fullName}</span>
                <span class="sheet-tab-hours">${durationStr}</span>
              </div>
            `;
          });

          tabsEl.innerHTML = `
            <div class="sheet-tabs-scroll-container">
              <div class="sheet-tab-scroll-btn left" onclick="document.getElementById('sheet-tabs-scroll-area').scrollBy({left: -150, behavior: 'smooth'})">‹</div>
              <div class="sheet-tabs-scroll-area" id="sheet-tabs-scroll-area">
                ${tabsHTML}
              </div>
              <div class="sheet-tab-scroll-btn right" onclick="document.getElementById('sheet-tabs-scroll-area').scrollBy({left: 150, behavior: 'smooth'})">›</div>
            </div>
          `;
        }

        // Update Pagination
        if (paginationArea) paginationArea.innerHTML = TaskPagination(state.pagination);

      } catch (err) {
        console.error('[DAILY TASK RENDER ERROR]', err);
      }
    });

    // 3. Load Data with Fail-safe Check
    if (typeof useDailyTasks.fetchData === 'function') {
      useDailyTasks.fetchData().catch(err => {
        console.log('[DAILY TASK LOAD ERROR]', err);
        if (window.toast) toast('Failed to load dashboard data', 'error');
      });
    }
  }
};

window.renderDailyTasks = window.DailyTaskDashboard.render;
console.log('[MODULAR DAILY TASKS] Production UI Active.');
