/**
 * Client Details Module
 */

let clientsData = [];

async function renderClients(container) {
  if (!(currentUser.permissions || {}).clients && currentUser.role !== 'admin') {
    container.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text-muted)"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3;margin-bottom:16px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><p>Access denied. You don't have permission to view clients.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Clients Management</div>
        <div class="section-sub">Manage client accounts and points of contact</div>
      </div>
      <div class="header-actions">
        <input type="text" class="search-input" placeholder="Search clients..." data-module="Clients" oninput="SearchManager.search('Clients', this.value, loadClients)" style="width:240px" />
        <button class="btn btn-ghost" onclick="toggleAllFilterIcons()" title="Show/Hide Table Filters">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg>
          <span>Filters</span>
        </button>
        <button class="btn btn-ghost" onclick="exportToCSV('Clients', clientsData)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Export</span>
        </button>
        <button class="btn btn-secondary" onclick="openImportModal('Clients')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Import Excel</span>
        </button>
        <button class="btn btn-primary" onclick="openClientForm()">
          ${iconPlus()} Add Client
        </button>
      </div>
    </div>

    <div class="card table-card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th><div class="th-content"><span>SPOC Name</span><button class="filter-trigger" onclick="openClientColumnFilter(this, 'spocName')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Company</span><button class="filter-trigger" onclick="openClientColumnFilter(this, 'companyName')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Email</span><button class="filter-trigger" onclick="openClientColumnFilter(this, 'email')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Contact</span><button class="filter-trigger" onclick="openClientColumnFilter(this, 'contactNumber')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Account ID</span><button class="filter-trigger" onclick="openClientColumnFilter(this, 'accountId')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Legal Name</span><button class="filter-trigger" onclick="openClientColumnFilter(this, 'legalName')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th>Added</th>
              <th>Actions</th>
            </tr>
          </thead>


          <tbody id="clients-list"><tr><td colspan="7"><div class="empty-table"><p>Loading...</p></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  await loadClients();
}

async function loadClients(options = {}) {
  const res = await api.clients.list(options);
  const tbody = document.getElementById('clients-list');
  if (!tbody) return;

  if (res.ok) {
    clientsData = res.data.data;
    if (clientsData.length === 0 && options.search) {
      SearchManager.renderEmptyState('Clients', 'clients-list');
    } else {
      renderClientsTable(clientsData);
    }
  } else {
    if (res.data && res.data.message === 'Request aborted') return;
    tbody.innerHTML = `<tr><td colspan="7" class="error-state">Error: ${res.data.message}</td></tr>`;
  }
}

function renderClientsTable(clients) {
  const tbody = document.getElementById('clients-list');
  if (!tbody) return;
  if (!clients.length) {
    SearchManager.renderEmptyState('Clients', 'clients-list');
    return;
  }
  tbody.innerHTML = clients.map(c => `
    <tr>
      <td style="font-weight:600;color:var(--text-primary)">${c.spocName}</td>
      <td>
        <div style="font-weight:600">${c.companyName||'—'}</div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${c.legalName||'—'}</div>
      </td>
      <td><a href="mailto:${c.email}" style="color:var(--accent)">${c.email}</a></td>
      <td><a href="tel:${c.contactNumber}" style="color:var(--text-secondary)">${c.contactNumber}</a></td>
      <td class="td-mono">${c.accountId||'—'}</td>
      <td>${formatDate(c.createdAt)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-icon" onclick="viewClient('${c._id}')" title="View Profile">${iconEye()}</button>
          <button class="btn btn-ghost btn-icon" onclick="editClient('${c._id}')">${iconEdit()}</button>
          <button class="btn btn-ghost btn-icon" style="color:var(--red)" onclick="deleteClientConfirm('${c._id}','${c.spocName.replace(/'/g,"\\'")}')"> ${iconTrash()}</button>
        </div>
      </td>
    </tr>
`).join('');
}

async function viewClient(id) {
  const res = await api.clients.get(id);
  if (!res.ok) { toast('Failed to load client', 'error'); return; }
  const c = res.data.data;

  // Fetch linked data (this is additive and won't break if endpoints are new)
  const [tickets, invoices, meetings] = await Promise.all([
    api.tickets.list({ clientId: id }).then(r => r.ok ? r.data.data : []),
    api.invoices.list({ clientId: id }).then(r => r.ok ? r.data.data : []),
    api.meetings.list({ clientName: c.companyName }).then(r => r.ok ? r.data.data : [])
  ]);

  const html = `
    <div style="display:flex;flex-direction:column;gap:20px">
      <div class="stat-card" style="padding:16px;background:var(--accent-dim)">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h3 style="margin:0">${c.companyName || c.spocName}</h3>
            <p style="margin:4px 0 0;color:var(--text-secondary);font-size:0.85rem">${c.spocName} • ${c.email}</p>
          </div>
          <div class="td-mono" style="font-weight:700;color:var(--accent)">${c.accountId || 'NO-ID'}</div>
        </div>
      </div>

      <div class="form-grid">
        <div class="field"><label>Phone</label><div>${c.contactNumber || '—'}</div></div>
        <div class="field"><label>Department</label><div>${c.department || '—'}</div></div>
        <div class="field full"><label>Notes</label><div style="font-size:0.85rem;color:var(--text-secondary)">${c.notes || 'No notes available.'}</div></div>
      </div>

      <div class="tabs" style="display:flex;gap:15px;border-bottom:1px solid var(--border);padding-bottom:10px">
        <span style="font-weight:700;color:var(--accent);cursor:default">Relationship Hub</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
        <div class="table-card" style="margin:0;padding:12px">
          <div style="font-weight:700;font-size:0.8rem;text-transform:uppercase;margin-bottom:10px;color:var(--text-muted)">Linked Tickets (${tickets.length})</div>
          <div style="max-height:150px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
            ${tickets.map(t => `<div style="font-size:0.75rem;padding:6px;background:var(--bg-input);border-radius:4px;display:flex;justify-content:space-between"><span>${t.ticketId}</span><span class="badge ${t.status==='resolved'?'badge-green':'badge-blue'}">${t.status}</span></div>`).join('') || '<p style="font-size:0.75rem;color:var(--text-muted)">No tickets.</p>'}
          </div>
        </div>
        <div class="table-card" style="margin:0;padding:12px">
          <div style="font-weight:700;font-size:0.8rem;text-transform:uppercase;margin-bottom:10px;color:var(--text-muted)">Linked Invoices (${invoices.length})</div>
          <div style="max-height:150px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
            ${invoices.map(i => `<div style="font-size:0.75rem;padding:6px;background:var(--bg-input);border-radius:4px;display:flex;justify-content:space-between"><span>${i.invoiceNumber}</span><span style="color:var(--green)">${formatCurrency(i.grandTotal)}</span></div>`).join('') || '<p style="font-size:0.75rem;color:var(--text-muted)">No invoices.</p>'}
          </div>
        </div>
      </div>

      <div class="table-card" style="margin:0;padding:12px">
        <div style="font-weight:700;font-size:0.8rem;text-transform:uppercase;margin-bottom:10px;color:var(--text-muted)">Recent Meetings (${meetings.length})</div>
        <div style="max-height:150px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">
          ${meetings.map(m => `<div style="font-size:0.75rem;padding:6px;background:var(--bg-input);border-radius:4px;display:flex;justify-content:space-between"><span>${truncate(m.header, 30)}</span><span>${formatDate(m.scheduledDate)}</span></div>`).join('') || '<p style="font-size:0.75rem;color:var(--text-muted)">No meetings found.</p>'}
        </div>
      </div>

      <div class="modal-footer" style="margin:0 -26px -26px;padding:18px 26px">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="closeModal();editClient('${c._id}')">Edit Profile</button>
      </div>
    </div>`;
  openModal('Client Profile', html);
}

// â”€â”€â”€ Filtering â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let clientFilters = {};

function openClientColumnFilter(btn, column) {
  const values = [...new Set(clientsData.map(c => c[column]).filter(v => v !== null && v !== undefined))].sort();
  toggleExcelFilter(btn, {
    module: 'Clients',
    column: column,
    items: values.map(v => ({ label: String(v), value: v }))
  });
}

window.applyClientsFilter = function(column, selectedValues) {
  clientFilters[column] = selectedValues;
  const filteredData = clientsData.filter(c => {
    return Object.keys(clientFilters).every(col => {
      if (!clientFilters[col] || clientFilters[col].length === 0) return true;
      return clientFilters[col].includes(c[col]);
    });
  });
  renderClientsTable(filteredData);
};

let clientSearchTimeout;
function searchClients(q) {
  clearTimeout(clientSearchTimeout);
  clientSearchTimeout = setTimeout(() => loadClients({ search: q }), 350);
}

function openClientForm(client = null) {
  const isEdit = !!client;
  const html = `
    <form id="client-form" onsubmit="saveClient(event, ${isEdit ? `'${client._id}'` : 'null'})">
      <div class="form-grid">
        <div class="field">
          <label>SPOC Name *</label>
          <input type="text" name="spocName" required placeholder="Full name" value="${isEdit ? client.spocName : ''}" />
        </div>
        <div class="field">
          <label>Company Name</label>
          <input type="text" name="companyName" placeholder="e.g. ORAI Robotics" value="${isEdit ? (client.companyName||'') : ''}" />
        </div>
        <div class="field">
          <label>Legal Name</label>
          <input type="text" name="legalName" placeholder="e.g. ORAI Robotics Pvt Ltd" value="${isEdit ? (client.legalName||'') : ''}" />
        </div>
        <div class="field">
          <label>Email *</label>
          <input type="email" name="email" required placeholder="spoc@company.com" value="${isEdit ? client.email : ''}" />
        </div>
        <div class="field">
          <label>Contact Number *</label>
          <input type="tel" name="contactNumber" required placeholder="+91 XXXXX XXXXX" value="${isEdit ? client.contactNumber : ''}" />
        </div>
        <div class="field">
          <label>Account ID (Bot link)</label>
          <input type="text" name="accountId" placeholder="ACC-XXXXX" value="${isEdit ? (client.accountId||'') : ''}" />
        </div>
        <div class="field full">
          <label>Notes</label>
          <textarea name="notes" rows="3" placeholder="Any additional notes...">${isEdit ? (client.notes||'') : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer" style="margin:0 -26px -26px;padding:18px 26px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Update Client' : 'Add Client'}</button>
      </div>
    </form>`;
  openModal(isEdit ? 'Edit Client' : 'Add Client', html);
}

async function saveClient(e, clientId) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving...';
  const res = clientId ? await api.clients.update(clientId, data) : await api.clients.create(data);
  btn.disabled = false; btn.textContent = clientId ? 'Update Client' : 'Add Client';
  if (res.ok) { closeModal(); toast(clientId ? 'Client updated!' : 'Client added!', 'success'); await loadClients(); }
  else toast(res.data.message || 'Failed to save', 'error');
}

async function editClient(id) {
  const res = await api.clients.get(id);
  if (!res.ok) { toast('Failed to load client', 'error'); return; }
  openClientForm(res.data.data);
}

function deleteClientConfirm(id, name) {
  confirmDelete(name, async () => {
    const res = await api.clients.delete(id);
    if (res.ok) { toast('Client deleted', 'success'); await loadClients(); }
    else toast(res.data.message || 'Delete failed', 'error');
  });
}
function searchClients(q) {
  SearchManager.search('Clients', q, loadClients);
}

console.log('[CLIENT MODULE STANDARDIZED]');
