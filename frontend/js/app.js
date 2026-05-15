/**
 * ORAI Insight Hub — App Core
 * Authentication, routing, navigation, utilities
 */

// ─── State ────────────────────────────────────────────────────────────────────
window.currentUser = null;
window.currentPage = 'dashboard';
let sidebarCollapsed = false;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initClock();
  checkAuth();

  document.getElementById('login-form').addEventListener('submit', handleLogin);
  
  // Voice Search setup
  const micBtn = document.getElementById('voice-search-btn');
  if (micBtn) {
    micBtn.addEventListener('click', startVoiceSearch);
  }
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
async function checkAuth() {
  const token = localStorage.getItem('orai_token');
  const userData = localStorage.getItem('orai_user');

  if (token && userData) {
    try {
      window.currentUser = JSON.parse(userData);
      const res = await api.auth.me();
      if (res.ok) {
        window.currentUser = res.data.user;
        localStorage.setItem('orai_user', JSON.stringify(window.currentUser));
        showDashboard();
      } else {
        localStorage.clear();
        showLogin();
      }
    } catch {
      showLogin();
    }
  } else {
    showLogin();
  }
}

let tempUserId = null;

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');
  errorEl.classList.add('hidden');

  const username   = document.getElementById('login-username').value.trim();
  const password   = document.getElementById('login-password').value;
  const department = document.getElementById('login-department').value;

  // Loading state
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-loader').classList.remove('hidden');
  btn.disabled = true;

  const res = await api.auth.login({ username, password, department });

  btn.querySelector('.btn-text').classList.remove('hidden');
  btn.querySelector('.btn-loader').classList.add('hidden');
  btn.disabled = false;

  if (res.ok) {
    if (res.data.otpRequired) {
      // Step 1 success — Show OTP form
      tempUserId = res.data.userId;
      document.getElementById('login-form').classList.add('hidden');
      document.getElementById('otp-form').classList.remove('hidden');
      document.getElementById('login-demo-text').classList.add('hidden');
      
      const msgEl = document.getElementById('otp-message');
      if (res.data.maskedEmail) {
        msgEl.innerHTML = `Enter the 6-digit code sent to <strong>${res.data.maskedEmail}</strong>.`;
      }
      
      // Auto-focus OTP input
      setTimeout(() => document.getElementById('login-otp').focus(), 100);
      
      toast('OTP sent successfully', 'success');
    } else {
      // Direct login (no email registered)
      localStorage.setItem('orai_token', res.data.token);
      localStorage.setItem('orai_user', JSON.stringify(res.data.user));
      window.currentUser = res.data.user;
      showDashboard();
    }
  } else {
    errorEl.textContent = res.data.message || 'Login failed. Please try again.';
    errorEl.classList.remove('hidden');
  }
}

// ─── OTP Verification ─────────────────────────────────────────────────────────

document.getElementById('otp-form').addEventListener('submit', handleVerifyOTP);

async function handleVerifyOTP(e) {
  e.preventDefault();
  const btn = document.getElementById('verify-btn');
  const errorEl = document.getElementById('otp-error');
  errorEl.classList.add('hidden');

  const otp = document.getElementById('login-otp').value.trim();

  if (!tempUserId || !otp) {
    errorEl.textContent = 'Invalid state. Please log in again.';
    errorEl.classList.remove('hidden');
    return;
  }

  // Loading state
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-loader').classList.remove('hidden');
  btn.disabled = true;

  const res = await api.auth.verifyOTP({ userId: tempUserId, otp });

  btn.querySelector('.btn-text').classList.remove('hidden');
  btn.querySelector('.btn-loader').classList.add('hidden');
  btn.disabled = false;

  if (res.ok) {
    // Step 2 success — Login complete
    tempUserId = null;
    localStorage.setItem('orai_token', res.data.token);
    localStorage.setItem('orai_user', JSON.stringify(res.data.user));
    window.currentUser = res.data.user;
    showDashboard();
  } else {
    errorEl.textContent = res.data.message || 'Invalid OTP.';
    errorEl.classList.remove('hidden');
  }
}

function cancelOTP() {
  tempUserId = null;
  document.getElementById('otp-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('login-demo-text').classList.remove('hidden');
  document.getElementById('login-otp').value = '';
  document.getElementById('otp-error').classList.add('hidden');
  document.getElementById('login-password').value = ''; // clear password for security
}

function logout() {
  localStorage.removeItem('orai_token');
  localStorage.removeItem('orai_user');
  window.currentUser = null;
  showLogin();
  toast('Signed out successfully', 'success');
}

function showLogin() {
  document.getElementById('login-page').classList.add('active');
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('dashboard-page').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('login-page').classList.remove('active');
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('dashboard-page').classList.remove('hidden');
  initDashboard();
}

// ─── Dashboard Init ────────────────────────────────────────────────────────────
function initDashboard() {
  if (!currentUser) return;

  // User info
  document.getElementById('sidebar-username').textContent = currentUser.fullName || currentUser.username;
  document.getElementById('sidebar-dept').textContent = currentUser.department;
  document.getElementById('topbar-dept-badge').textContent = currentUser.department;
  document.getElementById('user-avatar').textContent = (currentUser.fullName || currentUser.username).charAt(0).toUpperCase();

  LayoutManager.init();
  LayoutManager.renderSidebar(); // Force re-render with fresh user data
  navigateTo('dashboard');
  
  // Pre-load data for AI Assistant context
  if (typeof api !== 'undefined') {
    api.bots.list().then(res => { if(res.ok) window.botsData = res.data.data; });
    api.meetings.list().then(res => { if(res.ok) window.meetingsData = res.data.data; });
  }
}

// ─── Navigation Builder ────────────────────────────────────────────────────────
function buildNav() {
  if (window.LayoutManager) {
    LayoutManager.renderSidebar();
  }
}

function navigateTo(page) {
  console.log(`[NAVIGATE] Attempting navigation to: ${page}`);
  window.currentPage = page;
  
  const titleEl = document.getElementById('page-title');
  if (titleEl) {
    titleEl.textContent = pageTitles[page] || page;
  }

  if (window.LayoutManager) {
    LayoutManager.detectMode();
  }

  // Highlight active nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-sub-item').forEach(el => el.classList.remove('active'));
  const activeNav = document.getElementById(`nav-${page}`);
  if (activeNav) {
    activeNav.classList.add('active');
  }

  // Render page
  const area = document.getElementById('content-area');
  if (!area) return;
  area.innerHTML = '';

  console.log(`[NAVIGATE] Rendering page function for: ${page}`);
  switch (page) {
    case 'dashboard':    if(typeof renderDashboard === 'function') renderDashboard(area); break;
    case 'meetings':     if(typeof renderMeetings === 'function') renderMeetings(area); break;
    case 'bots':         if(typeof renderBots === 'function') renderBots(area); break;
    case 'clients':      if(typeof renderClients === 'function') renderClients(area); break;
    case 'upsell':       if(typeof renderUpsell === 'function') renderUpsell(area); break;
    case 'requirements': if(typeof renderRequirements === 'function') renderRequirements(area); break;
    case 'whatsapp':     if(typeof renderWhatsapp === 'function') renderWhatsapp(area); break;
    case 'healthchecks': if(typeof renderHealthChecks === 'function') renderHealthChecks(area); break;
    case 'tickets':      if(typeof renderTickets === 'function') renderTickets(area); break;
    case 'finance':      if(typeof renderFinanceHome === 'function') renderFinanceHome(area); break;
    case 'admin':        if(typeof renderAdmin === 'function') renderAdmin(area); break;
    case 'profile':      if(typeof renderProfile === 'function') renderProfile(area); break;
    case 'desk-hq':      if(typeof renderDeskHQ === 'function') renderDeskHQ(area); break;
    case 'desk-queue':   if(typeof renderDeskQueue === 'function') renderDeskQueue(area); break;
    case 'desk-feeds':   if(typeof renderDeskFeeds === 'function') renderDeskFeeds(area); break;
    case 'books-home':   if(typeof renderFinanceHome === 'function') renderFinanceHome(area); break;
    case 'finance-sales':if(typeof renderFinanceSales === 'function') renderFinanceSales(area); break;
    case 'books-invoices':if(typeof renderFinanceInvoices === 'function') renderFinanceInvoices(area); break;
    case 'books-payments':if(typeof renderFinancePayments === 'function') renderFinancePayments(area); break;
    default: area.innerHTML = '<p style="color:var(--text-muted);padding:40px">Page not found.</p>';
  }
}

const pageTitles = {
  dashboard: 'Overview',
  meetings: 'Meetings Tracker',
  bots: 'Bot Details',
  clients: 'Clients',
  upsell: 'Upsell Tracker',
  requirements: 'Project Requirements',
  whatsapp: 'WhatsApp Manager',
  healthchecks: 'Health Tracker',
  tickets: 'Support Desk',
  finance: 'Finance & Accounts',
  admin: 'Admin Control Panel',
  profile: 'My Profile',
  'desk-hq': 'Headquarters',
  'desk-queue': 'My Workplace',
  'desk-feeds': 'Team Collaboration',
  'books-home': 'Finance Dashboard',
  'finance-sales': 'Sales Overview',
  'books-invoices': 'Invoices',
  'books-payments': 'Payments Received'
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
}

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  const icons = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  };

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons.success}</span><span class="toast-message">${message}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = '0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ─── Clock ────────────────────────────────────────────────────────────────────
function initClock() {
  const el = document.getElementById('topbar-time');
  if (!el) return;
  const tick = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  tick();
  setInterval(tick, 1000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Voice Search
function startVoiceSearch() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    toast('Voice search is not supported in this browser.', 'error');
    return;
  }
  
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  const micBtn = document.getElementById('voice-search-btn');
  
  // Add styling if not exists
  if (!document.getElementById('voice-search-style')) {
    const style = document.createElement('style');
    style.id = 'voice-search-style';
    style.textContent = `
      #voice-search-btn { transition: all 0.3s; background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; border-radius: 8px; }
      #voice-search-btn.recording { background: #fee2e2 !important; color: #dc2626 !important; border-color: #fecaca !important; box-shadow: 0 0 0 4px rgba(239,68,68,0.2); }
      #voice-search-btn.recording svg { animation: top-mic-pulse 1.2s infinite; }
      @keyframes top-mic-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
    `;
    document.head.appendChild(style);
  }

  micBtn.classList.add('recording');
  toast('Listening... Speak your search query.', 'success', 2000);
  
  recognition.start();
  
  recognition.onresult = (event) => {
    micBtn.classList.remove('recording');
    const transcript = event.results[0][0].transcript;
    toast(`Searching for: "${transcript}"`, 'success');
    
    // Send to AI Agent for a full answer
    if (window.askAIAgent) {
      window.askAIAgent(transcript);
    } else {
      // Fallback to basic navigation
      const t = transcript.toLowerCase();
      if (t.includes('meeting')) navigateTo('meetings');
      else if (t.includes('bot')) navigateTo('bots');
      else if (t.includes('client')) navigateTo('clients');
    }
  };
  
  recognition.onerror = (event) => {
    micBtn.classList.remove('recording');
    toast(`Voice recognition error: ${event.error}`, 'error');
  };

  recognition.onend = () => {
    micBtn.classList.remove('recording');
  };
}

function togglePassword() {
  const input = document.getElementById('login-password');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(n, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0);
}

function daysUntil(date) {
  const diff = new Date(date) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function expiryBadge(expiryDate) {
  const days = daysUntil(expiryDate);
  if (days < 0) return `<span class="badge badge-red">Expired</span>`;
  if (days <= 7) return `<span class="badge badge-yellow">⚠ ${days}d left</span>`;
  return `<span class="badge badge-green">${days}d left</span>`;
}

function statusBadge(status) {
  const map = {
    active: 'badge-green', expired: 'badge-red', archived: 'badge-gray',
    new: 'badge-blue', in_review: 'badge-yellow', in_progress: 'badge-purple',
    completed: 'badge-green', rejected: 'badge-red',
    pending: 'badge-yellow', negotiation: 'badge-purple',
    closed_won: 'badge-green', closed_lost: 'badge-red'
  };
  const labels = {
    active: 'Active', expired: 'Expired', archived: 'Archived',
    new: 'New', in_review: 'In Review', in_progress: 'In Progress',
    completed: 'Completed', rejected: 'Rejected',
    pending: 'Pending', negotiation: 'Negotiation',
    closed_won: 'Won', closed_lost: 'Lost'
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${labels[status] || status}</span>`;
}

function truncate(str, len = 50) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// ─── Excel Import ─────────────────────────────────────────────────────────────
function openImportModal(moduleName) {
  const html = `
    <div style="padding:10px 0">
      <p style="margin-bottom:20px;color:var(--text-secondary)">
        Upload a spreadsheet file to bulk import <strong>${moduleName}</strong>. 
        Supports <strong>Excel (.xlsx, .xls), CSV (.csv), and ODS (.ods)</strong> formats.
        Please ensure the column headers match the required fields.
      </p>
      <div class="file-upload-area" id="excel-upload-area">
        <input type="file" id="excel-file-input" accept=".xlsx,.xls,.csv,.ods,.xlsm,.xlsb,.tsv" onchange="updateExcelFileName(this)">
        <div class="file-upload-label">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" style="margin-bottom:10px">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <p>Click or drag to upload spreadsheet</p>
          <div style="font-size:0.75rem;margin-top:6px;color:var(--text-muted)">Accepts .xlsx, .xls, .csv, .ods files</div>
          <span id="excel-file-name" class="file-name hidden"></span>
        </div>
      </div>
      <div class="modal-footer" style="padding-bottom:0; margin-top:20px">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="import-btn" onclick="handleImportExcel('${moduleName}')">
          <span class="btn-text">Import Data</span>
          <span class="btn-loader hidden">${iconSpin()}</span>
        </button>
      </div>
    </div>
  `;
  openModal(`Import ${moduleName}`, html);
}

function updateExcelFileName(input) {
  const el = document.getElementById('excel-file-name');
  if (input.files && input.files[0]) {
    el.textContent = input.files[0].name;
    el.classList.remove('hidden');
  }
}

async function handleImportExcel(moduleName) {
  const input = document.getElementById('excel-file-input');
  if (!input.files || !input.files[0]) {
    toast('Please select an Excel file first', 'warning');
    return;
  }

  const btn = document.getElementById('import-btn');
  btn.disabled = true;
  btn.querySelector('.btn-text').classList.add('hidden');
  btn.querySelector('.btn-loader').classList.remove('hidden');

  const formData = new FormData();
  formData.append('file', input.files[0]);

  const res = await api.import(moduleName.toLowerCase().replace(/ /g, ''), formData);

  btn.disabled = false;
  btn.querySelector('.btn-text').classList.remove('hidden');
  btn.querySelector('.btn-loader').classList.add('hidden');

  if (res.ok) {
    toast(res.data.message, 'success');
    closeModal();
    // Refresh the current page
    if (typeof window[`load${moduleName.replace(/ /g, '')}`] === 'function') {
      window[`load${moduleName.replace(/ /g, '')}`]();
    } else {
      navigateTo(currentPage);
    }
  } else {
    toast(res.data.message || 'Import failed', 'error');
  }
}

// ─── Filter Toggle ────────────────────────────────────────────────────────────
let filtersVisible = false; // Default to hidden for cleaner look
function toggleAllFilterIcons() {
  filtersVisible = !filtersVisible;
  document.body.classList.toggle('filters-active', filtersVisible);
  
  // Update all filter buttons in headers
  document.querySelectorAll('.header-actions button[onclick="toggleAllFilterIcons()"]').forEach(btn => {
    btn.classList.toggle('btn-primary', filtersVisible);
    btn.classList.toggle('btn-ghost', !filtersVisible);
    const span = btn.querySelector('span');
    if (span) span.textContent = filtersVisible ? 'Hide Filters' : 'Filters';
  });
}

// ─── Excel Style Filter Logic ──────────────────────────────────────────────────
let activeFilterDropdown = null;

function toggleExcelFilter(btn, options) {
  if (activeFilterDropdown) {
    const isSame = activeFilterDropdown.btn === btn;
    closeExcelFilter();
    if (isSame) return;
  }

  const rect = btn.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.className = 'filter-dropdown';
  dropdown.style.top = `${rect.bottom + window.scrollY}px`;
  dropdown.style.left = `${rect.left + window.scrollX - 200}px`; // Shift left to keep in viewport

  let listHtml = '';
  if (options.type === 'date') {
    // Group by Year/Month
    const groups = {};
    options.items.forEach(item => {
      const date = new Date(item.value);
      const year = date.getFullYear();
      const month = date.toLocaleString('default', { month: 'long' });
      if (!groups[year]) groups[year] = new Set();
      groups[year].add(month);
    });

    listHtml = Object.keys(groups).sort((a,b) => b-a).map(year => `
      <div class="filter-group">
        <label class="filter-item">
          <input type="checkbox" checked onchange="toggleFilterGroup(this, '${year}')">
          <span>${year}</span>
        </label>
        <div class="filter-sub-group" id="filter-group-${year}" style="padding-left:20px">
          ${Array.from(groups[year]).map(month => `
            <label class="filter-item">
              <input type="checkbox" value="${month} ${year}" checked class="filter-checkbox" data-group="${year}">
              <span>${month}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('');
  } else {
    listHtml = options.items.map(item => `
      <label class="filter-item">
        <input type="checkbox" value="${item.value}" checked class="filter-checkbox">
        <span>${item.label}</span>
      </label>
    `).join('');
  }

  dropdown.innerHTML = `
    <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px; display:flex; justify-content:space-between">
      <span>Filter by ${options.column}</span>
      <span style="cursor:pointer; color:var(--red)" onclick="clearExcelFilter('${options.module}', '${options.column}')">Clear</span>
    </div>
    <div class="filter-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" placeholder="Search..." oninput="filterExcelList(this)">
    </div>
    <div class="filter-list">
      <label class="filter-item">
        <input type="checkbox" checked onchange="toggleAllExcelFilters(this)">
        <span>Select All</span>
      </label>
      ${listHtml}
    </div>
    <div class="filter-footer">
      <button class="filter-btn-clear" onclick="closeExcelFilter()">Cancel</button>
      <button class="filter-btn-apply" onclick="applyExcelFilter('${options.module}', '${options.column}')">Apply</button>
    </div>
  `;

  document.body.appendChild(dropdown);
  activeFilterDropdown = { el: dropdown, btn, options };

  setTimeout(() => {
    window.addEventListener('click', closeExcelFilterOnClickOutside);
  }, 0);
}

function toggleFilterGroup(master, year) {
  const checkboxes = activeFilterDropdown.el.querySelectorAll(`.filter-checkbox[data-group="${year}"]`);
  checkboxes.forEach(cb => cb.checked = master.checked);
}

function clearExcelFilter(module, column) {
  const checkboxes = activeFilterDropdown.el.querySelectorAll('.filter-checkbox');
  checkboxes.forEach(cb => cb.checked = true);
  applyExcelFilter(module, column);
}

function closeExcelFilter() {
  if (activeFilterDropdown) {
    activeFilterDropdown.el.remove();
    activeFilterDropdown = null;
    window.removeEventListener('click', closeExcelFilterOnClickOutside);
  }
}

function closeExcelFilterOnClickOutside(e) {
  if (activeFilterDropdown && !activeFilterDropdown.el.contains(e.target) && !activeFilterDropdown.btn.contains(e.target)) {
    closeExcelFilter();
  }
}

function toggleAllExcelFilters(master) {
  const checkboxes = activeFilterDropdown.el.querySelectorAll('.filter-checkbox');
  checkboxes.forEach(cb => cb.checked = master.checked);
}

function filterExcelList(input) {
  const query = input.value.toLowerCase();
  const items = activeFilterDropdown.el.querySelectorAll('.filter-item:not(:first-child)');
  items.forEach(item => {
    const text = item.querySelector('span').textContent.toLowerCase();
    item.style.display = text.includes(query) ? 'flex' : 'none';
  });
}

function applyExcelFilter(module, column) {
  const checked = Array.from(activeFilterDropdown.el.querySelectorAll('.filter-checkbox:checked')).map(cb => cb.value);
  closeExcelFilter();
  
  if (typeof window[`apply${module}Filter`] === 'function') {
    window[`apply${module}Filter`](column, checked);
  } else {
    toast(`Filtering ${module} by ${column}: ${checked.length} selected`, 'info');
  }
}



window.pendingDeleteCallback = null;
function confirmDelete(name, onConfirm) {
  window.pendingDeleteCallback = onConfirm;
  const html = `
    <div style="text-align:center;padding:10px 0">
      <div style="width:56px;height:56px;background:var(--red-bg);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
      </div>
      <h4 style="margin-bottom:8px;font-family:var(--font-heading)">Delete ${name}?</h4>
      <p style="color:var(--text-muted);font-size:0.875rem;margin-bottom:24px">This action cannot be undone.</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-danger" onclick="if(window.pendingDeleteCallback) window.pendingDeleteCallback(); closeModal()">Delete</button>
      </div>
    </div>`;
  openModal('Confirm Delete', html);
}

// ─── Theming ──────────────────────────────────────────────────────────────────
function initTheme() {
  const savedTheme = localStorage.getItem('orai-theme') || 'dark';
  setTheme(savedTheme, false);
}

function setTheme(theme, save = true) {
  document.body.classList.remove('theme-light', 'theme-white');
  if (theme !== 'dark') {
    document.body.classList.add(`theme-${theme}`);
  }
  if (save) localStorage.setItem('orai-theme', theme);
  
  // Close menu if open
  const menu = document.getElementById('theme-menu');
  if (menu) menu.classList.add('hidden');
}

function toggleThemeMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('theme-menu');
  if (menu) menu.classList.toggle('hidden');
}

// Close theme menu on click outside
document.addEventListener('click', (e) => {
  const menu = document.getElementById('theme-menu');
  if (menu && !menu.contains(e.target) && !e.target.closest('.theme-switcher')) {
    menu.classList.add('hidden');
  }
});
