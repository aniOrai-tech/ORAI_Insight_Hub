/**
 * Daily Task Update Module
 * Track team productivity, work hours, and client-task associations
 */

let dailyTasksData = [];
let membersData = [];
let clientsData = [];
let ticketsData = []; // Added ticket state
let currentTaskFilters = {
  date: new Date().toISOString().split('T')[0],
  memberId: '',
  clientId: '',
  status: ''
};

async function renderDailyTasks(container) {
  console.log('[DAILY TASK MODULE] Starting initialization...');
  console.log('[DAILY TASK COMPONENT MOUNTED]');
  console.log('[RENDER STARTED]');
  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';
  
  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Daily Task Update</h2>
        <div class="section-sub">Track productivity and work logs across the team</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" onclick="toggleAllFilterIcons()" title="Show/Hide Table Filters">
          ${iconTrend()} <span>Filters</span>
        </button>
        ${isAdmin ? `<button class="btn btn-secondary" onclick="renderMemberManagement()">
          ${iconUsers()} <span>Manage Members</span>
        </button>` : ''}
        <button class="btn btn-primary" onclick="openTaskForm()">
          ${iconPlus()} <span>Add Daily Task</span>
        </button>
      </div>
    </div>

    <!-- Summary Widgets -->
    <div class="stats-grid" id="task-summary-widgets">
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--blue-bg);color:var(--blue)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="stat-info">
          <div class="stat-label">Total Tasks</div>
          <div class="stat-value" id="stat-total-tasks">0</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--purple-bg);color:var(--purple)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
        <div class="stat-info">
          <div class="stat-label">Work Hours Today</div>
          <div class="stat-value" id="stat-total-hours">0h 0m</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:var(--green-bg);color:var(--green)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg></div>
        <div class="stat-info">
          <div class="stat-label">Active Members</div>
          <div class="stat-value" id="stat-active-members">0</div>
        </div>
      </div>
    </div>

    <div class="card table-card">
      <div class="table-actions">
        <div class="filter-bar">
          <div class="filter-group">
            <label>Date</label>
            <div style="display:flex; gap:5px">
              <input type="date" value="${currentTaskFilters.date}" onchange="updateTaskFilter('date', this.value)">
              <button class="btn btn-ghost btn-sm" onclick="updateTaskFilter('date', '')" title="Show All Dates">All</button>
            </div>
          </div>
          ${isAdmin ? `
          <div class="filter-group">
            <label>Member</label>
            <select onchange="updateTaskFilter('memberId', this.value)" id="filter-member-select">
              <option value="">All Members</option>
            </select>
          </div>
          ` : ''}
          <div class="filter-group">
            <label>Client</label>
            <select onchange="updateTaskFilter('clientId', this.value)" id="filter-client-select">
              <option value="">All Clients</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <input type="text" class="search-input" placeholder="Search tasks..." data-module="DailyTasks" oninput="SearchManager.search('DailyTasks', this.value, loadDailyTasks)">
          <button class="btn btn-ghost" onclick="exportTasks('csv')" title="Export to CSV">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table" id="daily-tasks-table">
          <thead>
            <tr>
              <th width="50">Sno</th>
              <th>Member Name</th>
              <th>Client Name</th>
              <th>Login</th>
              <th>Logout</th>
              <th>Duration</th>
              <th>Work Hours</th>
              <th width="250">Task/Activity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="daily-tasks-list">
            <tr><td colspan="10" class="loading-state">Loading tasks...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // First render the table (shows loading state)
  loadDailyTasks();

  // Then load dropdown data in parallel
  Promise.all([
    loadMembersForDropdowns(),
    loadClientsForDropdowns(),
    loadTicketsForDropdowns()
  ]).catch(err => console.error('[TASK MODULE] Dependency load failed:', err));
  
  console.log('[TASK MODULE INITIALIZED]');
}

// â”€â”€â”€ Data Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function loadDailyTasks(options = {}) {
  const params = { ...currentTaskFilters, ...options };
  console.log('[DAILY TASK LOAD] Params:', params);
  console.log('[TASK API CALLED]');
  const res = await api.dailyTasks.list(params);
  
  if (res.ok) {
    dailyTasksData = res.data.data;
    console.log('[DAILY TASK LOAD] Data received:', dailyTasksData.length, 'records');
    console.log('[TASK DATA RECEIVED]');
    if (dailyTasksData.length > 0) console.table(dailyTasksData.slice(0, 5));

    if (dailyTasksData.length === 0) {
      if (params.search) {
        SearchManager.renderEmptyState('DailyTasks', 'daily-tasks-list');
      } else {
        // Genuinely empty collection
        const tbody = document.getElementById('daily-tasks-list');
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="10" class="empty-state">
            <div style="padding:60px 20px; text-align:center; color:var(--text-muted)">
              <div style="margin-bottom:15px; opacity:0.5">${iconActivity()}</div>
              <div style="font-size:1.1rem; font-weight:600; color:var(--text-secondary)">No tasks logged for this date</div>
              <p style="margin-top:8px; font-size:0.85rem">Click "Add Daily Task" to log your first work record.</p>
              <div style="margin-top:20px; font-size:0.75rem; background:var(--blue-bg); color:var(--blue); padding:10px; border-radius:8px; display:inline-block">
                <strong>Note:</strong> You must add <strong>Members</strong> and <strong>Clients</strong> first to create tasks.
              </div>
            </div>
          </td></tr>`;
        }
      }
    } else {
      renderTasksTable(dailyTasksData);
    }
    updateSummaryWidgets(dailyTasksData);
  } else {
    if (res.data && res.data.message === 'Request aborted') return;
    document.getElementById('daily-tasks-list').innerHTML = `<tr><td colspan="10" class="error-state">Error: ${res.data.message}</td></tr>`;
  }
}

async function loadMembersForDropdowns() {
  const res = await api.members.list({ status: 'active' });
  if (res.ok) {
    membersData = res.data.data;
    const filterSelect = document.getElementById('filter-member-select');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">All Members</option>' + 
        membersData.map(m => `<option value="${m._id}" ${currentTaskFilters.memberId === m._id ? 'selected' : ''}>${m.fullName}</option>`).join('');
    }
    const statActive = document.getElementById('stat-active-members');
    if (statActive) statActive.textContent = membersData.length;
    console.log('[MEMBER FETCH SUCCESS]');
    console.log('[MEMBER DATA RECEIVED]');
  }
}

async function loadClientsForDropdowns() {
  const res = await api.clients.list();
  if (res.ok) {
    clientsData = res.data.data;
    const filterSelect = document.getElementById('filter-client-select');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">All Clients</option>' + 
        clientsData.map(c => `<option value="${c._id}" ${currentTaskFilters.clientId === c._id ? 'selected' : ''}>${c.companyName}</option>`).join('');
    }
    console.log('[CLIENT FETCH SUCCESS]');
    console.log('[CLIENT DATA RECEIVED]');
  }
}

async function loadTicketsForDropdowns() {
  const res = await api.tickets.list({ status: 'open,in_progress,pending' });
  if (res.ok) {
    ticketsData = res.data.data;
    console.log('[TICKET FETCH SUCCESS]');
  }
}

function renderTasksTable(tasks) {
  const tbody = document.getElementById('daily-tasks-list');
  if (!tbody) return;

  if (tasks.length === 0) {
    SearchManager.renderEmptyState('DailyTasks', 'daily-tasks-list');
    return;
  }

  tbody.innerHTML = tasks.map((t, i) => `
    <tr>
      <td class="td-mono">${i + 1}</td>
      <td>
        <div style="font-weight:600">${t.memberId ? t.memberId.fullName : '—'}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${t.memberId ? t.memberId.designation || '' : ''}</div>
      </td>
      <td>
        <strong>${t.clientId ? t.clientId.companyName : '—'}</strong>
        ${t.ticketId ? `<div style="font-size:0.7rem; color:var(--accent); margin-top:4px"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:2px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> ${t.ticketId.ticketId}</div>` : ''}
      </td>
      <td class="td-mono">${t.loginTime}</td>
      <td class="td-mono">${t.logoutTime}</td>
      <td>${t.durationMinutes} min</td>
      <td><span class="badge badge-blue">${t.workHoursFormatted}</span></td>
      <td title="${t.activity}">
        ${truncate(t.activity, 45)}
        ${t.attachments && t.attachments.length > 0 ? `
          <button class="btn btn-ghost btn-icon btn-sm" onclick="viewTaskAttachments('${t._id}')" title="View ${t.attachments.length} attachments" style="margin-left:4px">
            ${iconPaperclip()}
          </button>
        ` : ''}
      </td>
      <td>${statusBadge(t.status)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-icon" onclick="openTaskForm('${t._id}')" title="Edit">${iconEdit()}</button>
          <button class="btn btn-ghost btn-icon" style="color:var(--red)" onclick="deleteTaskConfirm('${t._id}')" title="Delete">${iconTrash()}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function updateSummaryWidgets(tasks) {
  const totalTasks = tasks.length;
  let totalMinutes = 0;
  tasks.forEach(t => totalMinutes += (t.durationMinutes || 0));

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  document.getElementById('stat-total-tasks').textContent = totalTasks;
  document.getElementById('stat-total-hours').textContent = `${h}h ${m}m`;
}

// â”€â”€â”€ Filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function updateTaskFilter(key, value) {
  currentTaskFilters[key] = value;
  loadDailyTasks();
}

// â”€â”€â”€ Task Form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function openTaskForm(id = null) {
  if (membersData.length === 0 || clientsData.length === 0) {
    toast('Cannot add task: Please add Members and Clients first', 'warning');
    if (membersData.length === 0 && (currentUser.role === 'admin' || currentUser.username === 'admin')) {
      renderMemberManagement();
    }
    return;
  }
  const task = id ? dailyTasksData.find(t => t._id === id) : null;
  const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';

  const html = `
    <div class="tabs" style="margin-bottom:20px; border-bottom:1px solid var(--border)">
      <button class="tab-btn active" onclick="switchTaskFormTab(this, 'general')">General Info</button>
      <button class="tab-btn" onclick="switchTaskFormTab(this, 'ticket')">Ticket & Files</button>
    </div>

    <form id="daily-task-form" onsubmit="saveDailyTask(event, ${id ? `'${id}'` : 'null'})">
      <div id="task-tab-general" class="task-form-tab">
        <div class="form-grid">
          <div class="form-group">
            <label>Date *</label>
            <input type="date" name="date" required value="${task ? task.date.split('T')[0] : new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label>Member Name *</label>
            <select name="memberId" required>
              <option value="" disabled ${!task ? 'selected' : ''}>Select Member</option>
              ${membersData.map(m => `<option value="${m._id}" ${task && task.memberId && task.memberId._id === m._id ? 'selected' : ''}>${m.fullName}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Client Name *</label>
            <select name="clientId" required>
              <option value="" disabled ${!task ? 'selected' : ''}>Select Client</option>
              ${clientsData.map(c => `<option value="${c._id}" ${task && task.clientId && task.clientId._id === c._id ? 'selected' : ''}>${c.companyName}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select name="status">
              <option value="completed" ${task && task.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="pending" ${task && task.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="in_review" ${task && task.status === 'in_review' ? 'selected' : ''}>In Review</option>
            </select>
          </div>
          <div class="form-group">
            <label>Login Time *</label>
            <input type="time" name="loginTime" id="task-login-time" required value="${task ? task.loginTime : '09:00'}" oninput="calculateLiveDuration()">
          </div>
          <div class="form-group">
            <label>Logout Time *</label>
            <input type="time" name="logoutTime" id="task-logout-time" required value="${task ? task.logoutTime : '18:30'}" oninput="calculateLiveDuration()">
          </div>
          <div class="form-group full-width" style="background:var(--bg-body); padding:12px; border-radius:8px; border:1px dashed var(--border-color); display:flex; justify-content:space-between; align-items:center">
            <div>
              <span style="font-size:0.8rem; color:var(--text-muted)">Calculated Duration:</span>
              <strong id="live-duration-text" style="margin-left:8px; color:var(--accent)">—</strong>
            </div>
            <div>
              <span style="font-size:0.8rem; color:var(--text-muted)">Total Hours:</span>
              <strong id="live-hours-text" style="margin-left:8px; color:var(--green)">—</strong>
            </div>
          </div>
          <div class="form-group full-width">
            <label>Task / Activity *</label>
            <textarea name="activity" rows="3" required placeholder="Describe what you worked on...">${task ? task.activity : ''}</textarea>
          </div>
        </div>
      </div>

      <div id="task-tab-ticket" class="task-form-tab hidden">
        <div class="form-grid">
          <div class="form-group full-width">
            <label>Associated Ticket</label>
            <select name="ticketId">
              <option value="">No Ticket Linked</option>
              ${ticketsData.map(tk => `<option value="${tk._id}" ${task && task.ticketId && task.ticketId._id === tk._id ? 'selected' : ''}>[${tk.ticketId}] ${tk.subject}</option>`).join('')}
            </select>
            <p style="font-size:0.7rem; color:var(--text-muted); margin-top:4px">Select a ticket if this task is related to a support request.</p>
          </div>
          
          <div class="form-group full-width">
            <label>Attach Images / Screenshots</label>
            <div class="file-upload-area" style="padding:20px; background:var(--bg-body); border:1px dashed var(--border); border-radius:8px; text-align:center">
              <input type="file" name="attachments" multiple accept="image/*" id="task-attachments" onchange="updateTaskFilePreview(this)">
              <div style="color:var(--text-muted)">
                ${iconPaperclip()} <span>Click to upload or drag images here</span>
                <div id="attachment-count" style="font-size:0.75rem; margin-top:5px">Up to 5 images (JPG, PNG)</div>
              </div>
            </div>
          </div>

          <div class="form-group full-width">
            <label>Comments / Internal Notes</label>
            <textarea name="comments" rows="2" placeholder="Any additional internal notes...">${task ? task.comments || '' : ''}</textarea>
          </div>
        </div>
      </div>

      <div class="modal-footer" style="margin:20px -26px -26px; padding:15px 26px; background:var(--bg-body)">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" id="save-task-btn">
          <span class="btn-text">${id ? 'Update Task' : 'Save Task'}</span>
          <span class="btn-loader hidden">${iconSpin()}</span>
        </button>
      </div>
    </form>
  `;
  openModal(id ? 'Edit Daily Task' : 'Add Daily Task', html);
  calculateLiveDuration();
}

function calculateLiveDuration() {
  const login = document.getElementById('task-login-time').value;
  const logout = document.getElementById('task-logout-time').value;
  const durationEl = document.getElementById('live-duration-text');
  const hoursEl = document.getElementById('live-hours-text');

  if (login && logout) {
    const [loginH, loginM] = login.split(':').map(Number);
    const [logoutH, logoutM] = logout.split(':').map(Number);
    
    let diff = (logoutH * 60 + logoutM) - (loginH * 60 + loginM);
    if (diff < 0) diff += 1440; // Handle overnight

    durationEl.textContent = `${diff} minutes`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    hoursEl.textContent = `${h}h ${m}m`;
    
    console.log('[WORK HOURS CALCULATED]', `${h}h ${m}m`);
  }
}

function switchTaskFormTab(btn, tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  document.querySelectorAll('.task-form-tab').forEach(t => t.classList.add('hidden'));
  document.getElementById(`task-tab-${tab}`).classList.remove('hidden');
}

function updateTaskFilePreview(input) {
  const countEl = document.getElementById('attachment-count');
  if (input.files.length > 0) {
    countEl.textContent = `${input.files.length} file(s) selected`;
    countEl.style.color = 'var(--accent)';
  } else {
    countEl.textContent = 'Up to 5 images (JPG, PNG)';
    countEl.style.color = 'var(--text-muted)';
  }
}

async function saveDailyTask(e, id) {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  const btn = document.getElementById('save-task-btn');
  if (btn) {
    btn.disabled = true;
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
  }

  const res = id ? await api.dailyTasks.update(id, formData) : await api.dailyTasks.create(formData);
  
  if (btn) {
    btn.disabled = false;
    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-loader').classList.add('hidden');
  }

  if (res.ok) {
    toast(`Task ${id ? 'updated' : 'created'} successfully`, 'success');
    closeModal();
    loadDailyTasks();
    console.log(`[TASK ${id ? 'UPDATED' : 'CREATED'}]`);
  } else {
    toast(res.data.message || 'Error saving task', 'error');
  }
}

function viewTaskAttachments(id) {
  const task = dailyTasksData.find(t => t._id === id);
  if (!task || !task.attachments.length) return;

  const html = `
    <div class="attachment-gallery" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:15px; padding:10px 0">
      ${task.attachments.map(a => `
        <div class="attachment-item" style="border:1px solid var(--border); border-radius:8px; overflow:hidden; background:var(--bg-body)">
          <a href="/${a.path.replace(/\\/g, '/')}" target="_blank">
            <img src="/${a.path.replace(/\\/g, '/')}" style="width:100%; height:120px; object-fit:cover" onerror="this.src='/assets/file-icon.png'">
          </a>
          <div style="padding:8px; font-size:0.7rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
            ${a.originalName}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="modal-footer" style="margin:20px -26px -26px; padding:15px 26px; background:var(--bg-body)">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
    </div>
  `;
  openModal('Task Attachments', html);
}

function deleteTaskConfirm(id) {
  confirmDelete('this work log', async () => {
    const res = await api.dailyTasks.delete(id);
    if (res.ok) {
      toast('Task deleted');
      loadDailyTasks();
      console.log('[TASK DELETED]');
    }
  });
}

// â”€â”€â”€ Member Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function renderMemberManagement() {
  const res = await api.members.list();
  const members = res.ok ? res.data.data : [];

  const html = `
    <div class="member-mgmt">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px">
        <h4 style="margin:0">Team Members</h4>
        <button class="btn btn-primary btn-sm" onclick="openMemberForm()">+ Add Member</button>
      </div>
      <div class="table-container" style="max-height:400px; overflow-y:auto">
        <table class="data-table small">
          <thead>
            <tr>
              <th>Name</th>
              <th>Dept</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${members.map(m => `
              <tr>
                <td><strong>${m.fullName}</strong><div style="font-size:0.7rem;color:var(--text-muted)">${m.designation || 'Staff'}</div></td>
                <td>${m.department}</td>
                <td><span class="badge ${m.isActive ? 'badge-green' : 'badge-red'}">${m.isActive ? 'Active' : 'Disabled'}</span></td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn-icon sm" onclick="openMemberForm('${m._id}')">${iconEdit()}</button>
                    <button class="btn-icon sm" style="color:var(--red)" onclick="deleteMemberConfirm('${m._id}', '${m.fullName.replace(/'/g,"")}')">${iconTrash()}</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="modal-footer" style="margin:20px -26px -26px; padding:15px 26px; background:var(--bg-body)">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
  openModal('Member Management', html);
}

function openMemberForm(id = null) {
  const member = id ? membersData.find(m => m._id === id) : null;
  const depts = ['CS Team', 'Implementation Team', 'Dev Team', 'Sales Team', 'Operations', 'Management'];

  const html = `
    <form onsubmit="saveMember(event, ${id ? `'${id}'` : 'null'})">
      <div class="form-grid">
        <div class="form-group full-width">
          <label>Full Name *</label>
          <input type="text" name="fullName" required value="${member ? member.fullName : ''}">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" value="${member ? member.email || '' : ''}">
        </div>
        <div class="form-group">
          <label>Designation</label>
          <input type="text" name="designation" value="${member ? member.designation || '' : ''}">
        </div>
        <div class="form-group">
          <label>Department</label>
          <select name="department">
            ${depts.map(d => `<option value="${d}" ${member && member.department === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="isActive">
            <option value="true" ${member && member.isActive ? 'selected' : ''}>Active</option>
            <option value="false" ${member && !member.isActive ? 'selected' : ''}>Disabled</option>
          </select>
        </div>
      </div>
      <div class="modal-footer" style="margin:20px -26px -26px; padding:15px 26px; background:var(--bg-body)">
        <button type="button" class="btn btn-secondary" onclick="closeModal(); renderMemberManagement();">Back</button>
        <button type="submit" class="btn btn-primary">Save Member</button>
      </div>
    </form>
  `;
  openModal(id ? 'Edit Member' : 'Add Member', html);
}

async function saveMember(e, id) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.isActive = data.isActive === 'true';

  const res = id ? await api.members.update(id, data) : await api.members.create(data);
  if (res.ok) {
    toast('Member saved');
    closeModal();
    renderMemberManagement();
    loadMembersForDropdowns();
  } else {
    toast(res.data.message || 'Error', 'error');
  }
}

function deleteMemberConfirm(id, name) {
  confirmDelete(`Member: ${name}`, async () => {
    const res = await api.members.delete(id);
    if (res.ok) {
      toast('Member deleted');
      renderMemberManagement();
      loadMembersForDropdowns();
    }
  });
}

// â”€â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function exportTasks(format) {
  if (dailyTasksData.length === 0) return toast('No data to export', 'warning');
  
  const headers = ['Sno', 'Date', 'Member', 'Client', 'Login', 'Logout', 'Duration (Min)', 'Work Hours', 'Activity', 'Comments', 'Status'];
  const rows = dailyTasksData.map((t, i) => [
    i + 1,
    formatDate(t.date),
    t.memberId ? t.memberId.fullName : '—',
    t.clientId ? t.clientId.companyName : '—',
    t.loginTime,
    t.logoutTime,
    t.durationMinutes,
    t.workHoursFormatted,
    t.activity,
    t.comments || '',
    t.status
  ]);

  let content = '';
  if (format === 'csv') {
    content = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ORAI_Daily_Tasks_${currentTaskFilters.date}.csv`;
    link.click();
    console.log('[EXPORT GENERATED] CSV');
  }
}

console.log('[DAILY TASK MODULE LOADED]');
