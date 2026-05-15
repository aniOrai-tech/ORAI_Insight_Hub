/**
 * WhatsApp Login Details Module
 * Manage WhatsApp business credentials and status
 */

async function renderWhatsapp(container) {
  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">WhatsApp Login Details</h2>
        <div class="section-sub">Manage WhatsApp Business API credentials and account status</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" onclick="toggleAllFilterIcons()" title="Show/Hide Table Filters">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg>
          <span>Filters</span>
        </button>
        <button class="btn btn-secondary" onclick="openImportModal('WhatsApp')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Import Excel</span>
        </button>
        <button class="btn btn-primary" onclick="openAddWhatsappModal()">
          ${iconPlus()} <span>Add New Account</span>
        </button>
      </div>
    </div>


    <div class="card table-card">
      <div class="table-container table-container-wide">
        <table class="data-table" id="whatsapp-table">
          <thead>
            <tr>
              <th><div class="th-content"><span>Company</span><button class="filter-trigger" onclick="openWhatsappColumnFilter(this, 'companyLegalName')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Email</span><button class="filter-trigger" onclick="openWhatsappColumnFilter(this, 'clientEmail')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Password</span><button class="filter-trigger" onclick="openWhatsappColumnFilter(this, 'password')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Number</span><button class="filter-trigger" onclick="openWhatsappColumnFilter(this, 'whatsAppNumber')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Namespace</span><button class="filter-trigger" onclick="openWhatsappColumnFilter(this, 'namespace')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Status</span><button class="filter-trigger" onclick="openWhatsappColumnFilter(this, 'status')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Close Date</span><button class="filter-trigger" onclick="openWhatsappColumnFilter(this, 'closeDate')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>FBM ID</span><button class="filter-trigger" onclick="openWhatsappColumnFilter(this, 'fbm')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>FBM Date</span><button class="filter-trigger" onclick="openWhatsappColumnFilter(this, 'fbmDate')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Platform</span><button class="filter-trigger" onclick="openWhatsappColumnFilter(this, 'hostingPlatformType')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody id="whatsapp-list">
            <tr><td colspan="11" class="loading-state">Loading accounts...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadWhatsappAccounts();
}

let whatsappData = [];
let whatsappFilters = {};

async function loadWhatsappAccounts() {
  const res = await api.whatsapp.list();
  if (res.ok) {
    whatsappData = res.data.data;
    renderWhatsappTable(whatsappData);
  } else {
    document.getElementById('whatsapp-list').innerHTML = `<tr><td colspan="11" class="error-state">Error: ${res.data.message}</td></tr>`;
  }
}

function renderWhatsappTable(data) {
  const tbody = document.getElementById('whatsapp-list');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="11" class="empty-state">No WhatsApp accounts found.</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(acc => `
    <tr>
      <td style="font-weight:600;color:var(--text-primary)">${acc.companyLegalName}</td>
      <td>${acc.clientEmail || '—'}</td>
      <td class="td-mono">${acc.password ? '••••••••' : '—'}</td>
      <td class="td-mono">${acc.whatsAppNumber || '—'}</td>
      <td class="td-mono">${acc.namespace || '—'}</td>
      <td>${statusBadge(acc.status || 'active')}</td>
      <td>${formatDate(acc.closeDate)}</td>
      <td class="td-mono">${acc.fbm || '—'}</td>
      <td>${formatDate(acc.fbmDate)}</td>
      <td><span class="badge badge-blue">${acc.hostingPlatformType || '—'}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-icon" onclick="viewWhatsappDetails('${acc._id}')" title="View Details">${iconEye()}</button>
          <button class="btn btn-ghost btn-icon" onclick="openEditWhatsappModal('${acc._id}')" title="Edit">${iconEdit()}</button>
          <button class="btn btn-ghost btn-icon" style="color:var(--red)" onclick="deleteWhatsappConfirm('${acc._id}','${acc.companyLegalName.replace(/'/g,"\\'")}')" title="Delete">${iconTrash()}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── Filtering ────────────────────────────────────────────────────────────────
function openWhatsappColumnFilter(btn, column) {
  let items = [];
  const isDate = column.toLowerCase().includes('date');
  
  const values = [...new Set(whatsappData.map(a => a[column]).filter(v => v !== null && v !== undefined))].sort();
  items = values.map(v => ({ label: isDate ? formatDate(v) : String(v), value: v }));

  toggleExcelFilter(btn, {
    module: 'Whatsapp',
    column: column,
    items: items,
    isDate: isDate
  });
}

window.applyWhatsappFilter = function(column, selectedValues) {
  whatsappFilters[column] = selectedValues;
  const filteredData = whatsappData.filter(a => {
    return Object.keys(whatsappFilters).every(col => {
      const selected = whatsappFilters[col];
      if (!selected || selected.length === 0 || !Array.isArray(selected)) return true;
      const val = a[col];
      return selected.some(s => String(s) === String(val));
    });
  });
  renderWhatsappTable(filteredData);
};

function openAddWhatsappModal() {
  const html = `
    <form id="whatsapp-form" class="modal-form" onsubmit="handleWhatsappSubmit(event)">
      <div class="form-grid">
        <div class="form-group">
          <label>Company Legal Name *</label>
          <input type="text" name="companyLegalName" required placeholder="e.g. Acme Corp Inc.">
        </div>
        <div class="form-group">
          <label>Customer Type</label>
          <select name="customerType">
            <option value="Enterprise">Enterprise</option>
            <option value="SME">SME</option>
            <option value="Startup">Startup</option>
          </select>
        </div>
        <div class="form-group">
          <label>WhatsApp Number</label>
          <input type="text" name="whatsAppNumber" placeholder="+91 98765 43210">
        </div>
        <div class="form-group">
          <label>Client Email</label>
          <input type="email" name="clientEmail" placeholder="client@example.com">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="text" name="password" placeholder="API/Account Password">
        </div>
        <div class="form-group">
          <label>API Key / Token</label>
          <input type="text" name="api" placeholder="Bearer token...">
        </div>
        <div class="form-group">
          <label>Namespace</label>
          <input type="text" name="namespace" placeholder="Namespace ID">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div class="form-group">
          <label>Close Date</label>
          <input type="date" name="closeDate">
        </div>
        <div class="form-group">
          <label>FBM ID</label>
          <input type="text" name="fbm" placeholder="Facebook Business Manager ID">
        </div>
        <div class="form-group">
          <label>FBM Date</label>
          <input type="date" name="fbmDate">
        </div>
        <div class="form-group">
          <label>Hosting Platform</label>
          <select name="hostingPlatformType">
            <option value="Cloud API">Cloud API</option>
            <option value="On-Premise">On-Premise</option>
            <option value="360Dialog">360Dialog</option>
            <option value="Twilio">Twilio</option>
          </select>
        </div>
        <div class="form-group full-width">
          <label>Remark / Status Details</label>
          <textarea name="remarkStatus" rows="3" placeholder="Any additional notes..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Account</button>
      </div>
    </form>
  `;
  openModal('Add WhatsApp Account', html);
}

async function openEditWhatsappModal(id) {
  const res = await api.whatsapp.list(); // Simple list filter for demo, better to have a get endpoint
  const acc = res.data.data.find(a => a._id === id);
  if (!acc) return;

  const html = `
    <form id="whatsapp-form" class="modal-form" onsubmit="handleWhatsappSubmit(event, '${id}')">
      <div class="form-grid">
        <div class="form-group">
          <label>Company Legal Name *</label>
          <input type="text" name="companyLegalName" value="${acc.companyLegalName}" required>
        </div>
        <div class="form-group">
          <label>Customer Type</label>
          <select name="customerType">
            <option value="Enterprise" ${acc.customerType === 'Enterprise' ? 'selected' : ''}>Enterprise</option>
            <option value="SME" ${acc.customerType === 'SME' ? 'selected' : ''}>SME</option>
            <option value="Startup" ${acc.customerType === 'Startup' ? 'selected' : ''}>Startup</option>
          </select>
        </div>
        <div class="form-group">
          <label>WhatsApp Number</label>
          <input type="text" name="whatsAppNumber" value="${acc.whatsAppNumber || ''}">
        </div>
        <div class="form-group">
          <label>Client Email</label>
          <input type="email" name="clientEmail" value="${acc.clientEmail || ''}">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="text" name="password" value="${acc.password || ''}">
        </div>
        <div class="form-group">
          <label>API Key / Token</label>
          <input type="text" name="api" value="${acc.api || ''}">
        </div>
        <div class="form-group">
          <label>Namespace</label>
          <input type="text" name="namespace" value="${acc.namespace || ''}">
        </div>
        <div class="form-group">
          <label>Status</label>
          <select name="status">
            <option value="active" ${acc.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="pending" ${acc.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="suspended" ${acc.status === 'suspended' ? 'selected' : ''}>Suspended</option>
            <option value="closed" ${acc.status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
        <div class="form-group">
          <label>Close Date</label>
          <input type="date" name="closeDate" value="${acc.closeDate ? acc.closeDate.split('T')[0] : ''}">
        </div>
        <div class="form-group">
          <label>FBM ID</label>
          <input type="text" name="fbm" value="${acc.fbm || ''}">
        </div>
        <div class="form-group">
          <label>FBM Date</label>
          <input type="date" name="fbmDate" value="${acc.fbmDate ? acc.fbmDate.split('T')[0] : ''}">
        </div>
        <div class="form-group">
          <label>Hosting Platform</label>
          <select name="hostingPlatformType">
            <option value="Cloud API" ${acc.hostingPlatformType === 'Cloud API' ? 'selected' : ''}>Cloud API</option>
            <option value="On-Premise" ${acc.hostingPlatformType === 'On-Premise' ? 'selected' : ''}>On-Premise</option>
            <option value="360Dialog" ${acc.hostingPlatformType === '360Dialog' ? 'selected' : ''}>360Dialog</option>
            <option value="Twilio" ${acc.hostingPlatformType === 'Twilio' ? 'selected' : ''}>Twilio</option>
          </select>
        </div>
        <div class="form-group full-width">
          <label>Remark / Status Details</label>
          <textarea name="remarkStatus" rows="3">${acc.remarkStatus || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Update Account</button>
      </div>
    </form>
  `;
  openModal('Edit WhatsApp Account', html);
}

async function handleWhatsappSubmit(e, id = null) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  const res = id ? await api.whatsapp.update(id, data) : await api.whatsapp.create(data);

  if (res.ok) {
    toast(`Account ${id ? 'updated' : 'created'} successfully!`, 'success');
    closeModal();
    loadWhatsappAccounts();
  } else {
    toast(`Error: ${res.data.message}`, 'error');
  }
}

function deleteWhatsappConfirm(id, name) {
  confirmDelete(`WhatsApp Account for ${name}`, async () => {
    const res = await api.whatsapp.delete(id);
    if (res.ok) {
      toast('Account deleted successfully', 'success');
      loadWhatsappAccounts();
    } else {
      toast(`Error: ${res.data.message}`, 'error');
    }
  });
}

async function viewWhatsappDetails(id) {
  const res = await api.whatsapp.list();
  const acc = res.data.data.find(a => a._id === id);
  if (!acc) return;

  const html = `
    <div class="details-view">
      <div class="details-section">
        <h4 class="details-subtitle">Company Information</h4>
        <div class="details-grid">
          <div class="detail-item"><label>Legal Name</label><span>${acc.companyLegalName}</span></div>
          <div class="detail-item"><label>Customer Type</label><span class="badge badge-gray">${acc.customerType || '—'}</span></div>
          <div class="detail-item"><label>Client Email</label><span>${acc.clientEmail || '—'}</span></div>
          <div class="detail-item"><label>Status</label>${statusBadge(acc.status || 'active')}</div>
        </div>
      </div>

      <div class="details-section" style="margin-top: 24px;">
        <h4 class="details-subtitle">Technical Credentials</h4>
        <div class="details-grid">
          <div class="detail-item"><label>WhatsApp Number</label><span class="font-mono">${acc.whatsAppNumber || '—'}</span></div>
          <div class="detail-item"><label>Password</label><span class="font-mono">${acc.password || '—'}</span></div>
          <div class="detail-item full-width"><label>API Key / Token</label><div class="code-block">${acc.api || '—'}</div></div>
          <div class="detail-item"><label>Namespace</label><span class="font-mono">${acc.namespace || '—'}</span></div>
          <div class="detail-item"><label>Hosting Platform</label><span class="badge badge-blue">${acc.hostingPlatformType || '—'}</span></div>
        </div>
      </div>

      <div class="details-section" style="margin-top: 24px;">
        <h4 class="details-subtitle">Facebook Business Manager</h4>
        <div class="details-grid">
          <div class="detail-item"><label>FBM ID</label><span class="font-mono">${acc.fbm || '—'}</span></div>
          <div class="detail-item"><label>Verification Date</label><span>${formatDate(acc.fbmDate)}</span></div>
        </div>
      </div>

      ${acc.remarkStatus ? `
      <div class="details-section" style="margin-top: 24px;">
        <h4 class="details-subtitle">Remarks</h4>
        <p style="color:var(--text-secondary); font-size:0.9rem; line-height:1.5;">${acc.remarkStatus}</p>
      </div>` : ''}

      <div class="modal-footer" style="margin: 24px -26px -26px; padding: 16px 26px;">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="closeModal(); openEditWhatsappModal('${acc._id}')">Edit Account</button>
      </div>
    </div>
  `;

  openModal('WhatsApp Account Details', html);
}
