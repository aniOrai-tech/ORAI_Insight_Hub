/**
 * Monthly Health Check Tracker Module
 * Track bot health and performance on a monthly basis
 */

let selectedMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

async function renderHealthChecks(container) {
  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Customer Health Tracker</h2>
        <div class="section-sub">Monitor engagement, calls, and email activity</div>
      </div>
      <div class="header-actions">
        <input type="text" class="search-input" placeholder="Search customers..." data-module="HealthChecks" oninput="SearchManager.search('HealthChecks', this.value, loadHealthChecks)" style="width:240px" />
        <button class="btn btn-ghost" onclick="toggleAllFilterIcons()" title="Show/Hide Table Filters">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg>
          <span>Filters</span>
        </button>
        <button class="btn btn-ghost" onclick="exportToCSV('HealthChecks', healthChecksData)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Export</span>
        </button>
        <button class="btn btn-secondary" onclick="openImportModal('HealthChecks')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Import Excel</span>
        </button>
        <button class="btn btn-primary" onclick="openAddHealthCheckModal()">
          ${iconPlus()} Add Entry
        </button>
      </div>
    </div>

    <div class="card table-card">
      <div class="table-container table-container-wide">
        <table class="data-table" id="healthcheck-table">
          <thead>
            <tr>
              <th><div class="th-content"><span>CST POC</span><button class="filter-trigger" onclick="openHealthCheckColumnFilter(this, 'cstPoc')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Customer</span><button class="filter-trigger" onclick="openHealthCheckColumnFilter(this, 'customerName')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Type</span><button class="filter-trigger" onclick="openHealthCheckColumnFilter(this, 'customerType')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Status</span><button class="filter-trigger" onclick="openHealthCheckColumnFilter(this, 'status')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Channels</span><button class="filter-trigger" onclick="openHealthCheckColumnFilter(this, 'channelsLiveOn')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Call 1</span><button class="filter-trigger" onclick="openHealthCheckColumnFilter(this, 'call1')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Call 2</span><button class="filter-trigger" onclick="openHealthCheckColumnFilter(this, 'call2')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Call 3</span><button class="filter-trigger" onclick="openHealthCheckColumnFilter(this, 'call3')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Payment Status</span><button class="filter-trigger" onclick="openHealthCheckColumnFilter(this, 'paymentStatus')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Pending Amount</span><button class="filter-trigger" onclick="openHealthCheckColumnFilter(this, 'pendingAmount')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody id="healthcheck-list">
            <tr><td colspan="10" class="loading-state">Loading health checks...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadHealthChecks();
}

let healthDebounce = null;
function searchHealthChecks(q) {
  SearchManager.search('HealthChecks', q, loadHealthChecks);
}

let healthChecksData = [];

async function loadHealthChecks(options = {}) {
  const query = { monthYear: selectedMonth, ...options };
  const res = await api.healthchecks.list(query);
  const tbody = document.getElementById('healthcheck-list');
  if (!tbody) return;

  if (res.ok) {
    healthChecksData = res.data.data;
    if (healthChecksData.length === 0 && options.search) {
      SearchManager.renderEmptyState('HealthChecks', 'healthcheck-list');
    } else {
      renderHealthChecksTable(healthChecksData);
    }
  } else {
    if (res.data && res.data.message === 'Request aborted') return;
    tbody.innerHTML = `<tr><td colspan="10" class="error-state">Error: ${res.data.message}</td></tr>`;
  }
}

function renderHealthChecksTable(entries) {
  const tbody = document.getElementById('healthcheck-list');
  if (!tbody) return;

  if (entries.length === 0) {
    SearchManager.renderEmptyState('HealthChecks', 'healthcheck-list');
    return;
  }

  tbody.innerHTML = entries.map(e => `
    <tr>
      <td><span class="user-badge">${e.cstPoc || '—'}</span></td>
      <td><strong>${e.customerName}</strong></td>
      <td><span class="badge badge-gray">${e.customerType || '—'}</span></td>
      <td>${statusBadge(e.status || 'active')}</td>
      <td><div class="channels-list">${e.channelsLiveOn || '—'}</div></td>
      <td>
        <span class="badge ${e.paymentStatus === 'cleared' ? 'badge-green' : (e.paymentStatus === 'overdue' ? 'badge-red' : 'badge-yellow')}">
          ${(e.paymentStatus || 'pending').toUpperCase()}
        </span>
      </td>
      <td class="td-mono" style="font-weight:700; color:${e.pendingAmount > 0 ? 'var(--red)' : 'var(--green)'}">
        ${formatCurrency(e.pendingAmount || 0)}
      </td>
      <td class="actions-cell">
        <div class="action-btns">
          <button class="btn-icon" title="View Details" onclick="viewHealthCheck('${e._id}')">${iconEye()}</button>
          <button class="btn-icon" title="Edit" onclick="openEditHealthCheckModal('${e._id}')">${iconEdit()}</button>
          <button class="btn-icon btn-icon-danger" title="Delete" onclick="deleteHealthCheck('${e._id}', '${e.customerName}')">${iconTrash()}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function changeMonth(delta) {
  const [month, year] = selectedMonth.split(' ');
  const date = new Date(`${month} 1, ${year}`);
  date.setMonth(date.getMonth() + delta);
  selectedMonth = date.toLocaleString('default', { month: 'long', year: 'numeric' });
  document.getElementById('current-month-display').textContent = selectedMonth;
  loadHealthChecks();
}

function openAddHealthCheckModal() {
  const html = `
    <form id="healthcheck-form" class="modal-form" onsubmit="handleHealthCheckSubmit(event)">
      <div class="form-grid">
        <div class="form-group">
          <label>Month / Year</label>
          <input type="text" name="monthYear" value="${selectedMonth}" readonly>
        </div>
        <div class="form-group">
          <label>Customer Name *</label>
          <input type="text" name="customerName" required placeholder="e.g. Reliance Industries">
        </div>
        <div class="form-group">
          <label>CST POC</label>
          <input type="text" name="cstPoc" placeholder="e.g. Anita Singh">
        </div>
        <div class="form-group">
          <label>Customer Type</label>
          <input type="text" name="customerType" placeholder="e.g. Enterprise">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status">
            <option value="active">Active</option>
            <option value="at_risk">At Risk</option>
            <option value="churned">Churned</option>
          </select>
        </div>
        <div class="form-group">
          <label>Channels Live On</label>
          <input type="text" name="channelsLiveOn" placeholder="e.g. WhatsApp, Web, App">
        </div>
        <hr class="full-width">
        <div class="form-group">
          <label>Date of Call 1</label>
          <input type="date" name="dateOfCall1">
        </div>
        <div class="form-group">
          <label>Call 1 Remark</label>
          <input type="text" name="platformUsageRemark">
        </div>
        <div class="form-group">
          <label>Date of Call 2</label>
          <input type="date" name="dateOfCall2">
        </div>
        <div class="form-group">
          <label>Call 2 Remark</label>
          <input type="text" name="remark2">
        </div>
        <div class="form-group">
          <label>Date of Call 3</label>
          <input type="date" name="dateOfCall3">
        </div>
        <div class="form-group">
          <label>Call 3 Remark</label>
          <input type="text" name="remark3">
        </div>
        <div class="form-group">
          <label>Email Sent?</label>
          <select name="emailSent">
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </div>
        <hr class="full-width">
        <div class="form-group">
          <label>Payment Pending Status</label>
          <select name="paymentStatus">
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="cleared">Cleared</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div class="form-group">
          <label>Pending Amount</label>
          <input type="number" name="pendingAmount" placeholder="0.00" step="0.01">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Entry</button>
      </div>
    </form>
  `;
  openModal('Add Health Check Entry', html);
}

async function openEditHealthCheckModal(id) {
  const res = await api.healthchecks.list({ monthYear: selectedMonth });
  const e = res.data.data.find(item => item._id === id);
  if (!e) return;

  const html = `
    <form id="healthcheck-form" class="modal-form" onsubmit="handleHealthCheckSubmit(event, '${id}')">
      <div class="form-grid">
        <div class="form-group">
          <label>Month / Year</label>
          <input type="text" name="monthYear" value="${e.monthYear}" readonly>
        </div>
        <div class="form-group">
          <label>Customer Name *</label>
          <input type="text" name="customerName" value="${e.customerName}" required>
        </div>
        <div class="form-group">
          <label>CST POC</label>
          <input type="text" name="cstPoc" value="${e.cstPoc || ''}">
        </div>
        <div class="form-group">
          <label>Customer Type</label>
          <input type="text" name="customerType" value="${e.customerType || ''}">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status">
            <option value="active" ${e.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="at_risk" ${e.status === 'at_risk' ? 'selected' : ''}>At Risk</option>
            <option value="churned" ${e.status === 'churned' ? 'selected' : ''}>Churned</option>
          </select>
        </div>
        <div class="form-group">
          <label>Channels Live On</label>
          <input type="text" name="channelsLiveOn" value="${e.channelsLiveOn || ''}">
        </div>
        <hr class="full-width">
        <div class="form-group">
          <label>Date of Call 1</label>
          <input type="date" name="dateOfCall1" value="${e.dateOfCall1 ? e.dateOfCall1.split('T')[0] : ''}">
        </div>
        <div class="form-group">
          <label>Call 1 Remark</label>
          <input type="text" name="platformUsageRemark" value="${e.platformUsageRemark || ''}">
        </div>
        <div class="form-group">
          <label>Date of Call 2</label>
          <input type="date" name="dateOfCall2" value="${e.dateOfCall2 ? e.dateOfCall2.split('T')[0] : ''}">
        </div>
        <div class="form-group">
          <label>Call 2 Remark</label>
          <input type="text" name="remark2" value="${e.remark2 || ''}">
        </div>
        <div class="form-group">
          <label>Date of Call 3</label>
          <input type="date" name="dateOfCall3" value="${e.dateOfCall3 ? e.dateOfCall3.split('T')[0] : ''}">
        </div>
        <div class="form-group">
          <label>Call 3 Remark</label>
          <input type="text" name="remark3" value="${e.remark3 || ''}">
        </div>
        <div class="form-group">
          <label>Email Sent?</label>
          <select name="emailSent">
            <option value="false" ${!e.emailSent ? 'selected' : ''}>No</option>
            <option value="true" ${e.emailSent ? 'selected' : ''}>Yes</option>
          </select>
        </div>
        <hr class="full-width">
        <div class="form-group">
          <label>Payment Pending Status</label>
          <select name="paymentStatus">
            <option value="pending" ${e.paymentStatus === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="partial" ${e.paymentStatus === 'partial' ? 'selected' : ''}>Partial</option>
            <option value="cleared" ${e.paymentStatus === 'cleared' ? 'selected' : ''}>Cleared</option>
            <option value="overdue" ${e.paymentStatus === 'overdue' ? 'selected' : ''}>Overdue</option>
          </select>
        </div>
        <div class="form-group">
          <label>Pending Amount</label>
          <input type="number" name="pendingAmount" value="${e.pendingAmount || 0}" step="0.01">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Entry</button>
      </div>
    </form>
  `;
  openModal('Edit Health Check Entry', html);
}

async function handleHealthCheckSubmit(e, id = null) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  data.emailSent = data.emailSent === 'true';

  const res = id ? await api.healthchecks.update(id, data) : await api.healthchecks.create(data);

  if (res.ok) {
    toast(`Entry ${id ? 'updated' : 'created'} successfully!`, 'success');
    closeModal();
    loadHealthChecks();
  } else {
    toast(`Error: ${res.data.message}`, 'error');
  }
}

function deleteHealthCheck(id, name) {
  confirmDelete(`Health check for ${name}`, async () => {
    const res = await api.healthchecks.delete(id);
    if (res.ok) {
      toast('Entry deleted successfully', 'success');
      loadHealthChecks();
    } else {
      toast(`Error: ${res.data.message}`, 'error');
    }
  });
}

function openGenerateMonthModal() {
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonth = prevDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const html = `
    <div style="padding:10px 0">
      <p style="margin-bottom:20px;color:var(--text-muted)">
        This will copy all customer names and types from <strong>${prevMonth}</strong> to the current month (<strong>${selectedMonth}</strong>). 
        All tracking remarks and dates will be reset for the new month.
      </p>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="confirmGenerateMonth('${prevMonth}')">Generate ${selectedMonth} Sheet</button>
      </div>
    </div>
  `;
  openModal('Generate New Month', html);
}

async function confirmGenerateMonth(fromMonth) {
  const res = await api.healthchecks.generate({
    fromMonthYear: fromMonth,
    toMonthYear: selectedMonth
  });

  if (res.ok) {
    toast(res.data.message, 'success');
    closeModal();
    loadHealthChecks();
  } else {
    toast(res.data.message, 'error');
  }
}

// â”€â”€â”€ Filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentFilters = {};

function openHealthCheckColumnFilter(btn, column) {
  let items = [];
  if (column === 'status') {
    items = [
      { label: 'Active', value: 'active' },
      { label: 'At Risk', value: 'at_risk' },
      { label: 'Churned', value: 'churned' }
    ];
  } else {
    // Dynamically get unique values for any other column
    const values = [...new Set(healthChecksData.map(e => e[column]).filter(v => v !== null && v !== undefined))].sort();
    items = values.map(v => ({ label: String(v), value: v }));
  }

  toggleExcelFilter(btn, {
    module: 'HealthChecks',
    column: column,
    items: items
  });
}

window.applyHealthChecksFilter = function(column, selectedValues) {
  currentFilters[column] = selectedValues;
  const filteredData = healthChecksData.filter(e => {
    return Object.keys(currentFilters).every(col => {
      if (!currentFilters[col] || currentFilters[col].length === 0) return true;
      return currentFilters[col].includes(e[col]);
    });
  });
  renderHealthChecksTable(filteredData);
};

