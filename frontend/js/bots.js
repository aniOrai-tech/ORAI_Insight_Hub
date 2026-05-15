/**
 * Bot Details Module
 */

let botsData = [];

async function renderBots(container) {
  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Bot Details</div>
        <div class="section-sub">Manage WhatsApp Business Account (WABA) configurations</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" onclick="toggleAllFilterIcons()" title="Show/Hide Table Filters">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg>
          <span>Filters</span>
        </button>
        <button class="btn btn-secondary" onclick="openImportModal('Bots')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Import Excel</span>
        </button>
        <button class="btn btn-primary" onclick="openBotForm()">
          ${iconPlus()} Add Bot Config
        </button>
      </div>
    </div>

    <div class="card table-card">
      <div class="table-container table-container-wide">
        <table class="data-table" id="bots-table">
          <thead>
            <tr>
              <th><div class="th-content"><span>Client</span><button class="filter-trigger" onclick="openBotColumnFilter(this, 'clientName')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Account ID</span><button class="filter-trigger" onclick="openBotColumnFilter(this, 'accountId')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Namespace</span><button class="filter-trigger" onclick="openBotColumnFilter(this, 'namespace')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Type</span><button class="filter-trigger" onclick="openBotColumnFilter(this, 'accountType')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Integration</span><button class="filter-trigger" onclick="openBotColumnFilter(this, 'remark')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Status</span><button class="filter-trigger" onclick="openBotColumnFilter(this, 'isActive')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody id="bots-tbody"><tr><td colspan="9"><div class="empty-table"><p>Loading...</p></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  await loadBots();
}

async function loadBots(params = {}) {
  const res = await api.bots.list(params);
  if (!res.ok) { toast('Failed to load bots', 'error'); return; }
  botsData = res.data.data;
  renderBotsTable(botsData);
}

function renderBotsTable(bots) {
  const tbody = document.getElementById('bots-tbody');
  if (!tbody) return;
  if (!bots.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-table">${iconBot()}<p>No bots found.</p></div></td></tr>`;
    return;
  }

  const remarkColors = { 'CRM Integration':'badge-blue','GSheet Integration':'badge-green','External API Integration':'badge-purple','None':'badge-gray' };
  tbody.innerHTML = bots.map(b => `
    <tr>
      <td style="font-weight:600;color:var(--text-primary)">${b.clientName}</td>
      <td class="td-mono">${b.accountId}</td>
      <td class="td-mono">${b.namespace || '—'}</td>
      <td><span class="badge badge-blue">${b.accountType}</span></td>
      <td><span class="badge ${remarkColors[b.remark]||'badge-gray'}">${b.remark}</span></td>
      <td>${b.isActive ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Inactive</span>'}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-icon" onclick="viewBot('${b._id}')">${iconEye()}</button>
          <button class="btn btn-ghost btn-icon" onclick="editBot('${b._id}')">${iconEdit()}</button>
          <button class="btn btn-ghost btn-icon" style="color:var(--red)" onclick="deleteBotConfirm('${b._id}','${b.clientName.replace(/'/g,"\\'")}')"> ${iconTrash()}</button>
        </div>
      </td>
    </tr>`).join('');
}

let botSearchTimeout;
function searchBots(q) {
  clearTimeout(botSearchTimeout);
  botSearchTimeout = setTimeout(() => loadBots({ search: q }), 350);
}

function openBotForm(bot = null) {
  const isEdit = !!bot;
  const html = `
    <form id="bot-form" onsubmit="saveBot(event, ${isEdit ? `'${bot._id}'` : 'null'})">
      <div class="form-grid">
        <div class="field full">
          <label>Client Name *</label>
          <input type="text" name="clientName" required placeholder="Acme Corp" value="${isEdit ? bot.clientName : ''}" />
        </div>
        <div class="field">
          <label>Account ID *</label>
          <input type="text" name="accountId" required placeholder="ACC-XXXXX" value="${isEdit ? bot.accountId : ''}" />
        </div>
        <div class="field">
          <label>Password</label>
          <input type="password" name="password" placeholder="${isEdit ? '(leave blank to keep)' : 'Bot password'}" />
        </div>
        <div class="field">
          <label>API Key</label>
          <input type="text" name="apiKey" placeholder="sk-xxxxx" value="${isEdit ? (bot.apiKey||'') : ''}" />
        </div>
        <div class="field">
          <label>Namespace</label>
          <input type="text" name="namespace" placeholder="namespace-slug" value="${isEdit ? (bot.namespace||'') : ''}" />
        </div>
        <div class="field">
          <label>Number</label>
          <input type="text" name="number" placeholder="+91 XXXXX XXXXX" value="${isEdit ? (bot.number||'') : ''}" />
        </div>
        <div class="field">
          <label>Account Type</label>
          <select name="accountType">
            ${['standard','premium','enterprise','trial'].map(t => `<option value="${t}" ${isEdit && bot.accountType===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Integration Remark</label>
          <select name="remark">
            ${['CRM Integration','GSheet Integration','External API Integration','None'].map(r => `<option value="${r}" ${isEdit && bot.remark===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="field full">
          <label>Smart Link</label>
          <input type="url" name="smartLink" placeholder="https://..." value="${isEdit ? (bot.smartLink||'') : ''}" />
        </div>
        <div class="field">
          <label>Status</label>
          <select name="isActive">
            <option value="true" ${!isEdit || bot.isActive ? 'selected' : ''}>Active</option>
            <option value="false" ${isEdit && !bot.isActive ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
      </div>
      <div class="modal-footer" style="margin:0 -26px -26px;padding:18px 26px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Update Bot' : 'Add Bot'}</button>
      </div>
    </form>`;
  openModal(isEdit ? 'Edit Bot Details' : 'Add Bot Details', html);
}

async function saveBot(e, botId) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  data.isActive = data.isActive === 'true';
  if (!data.password) delete data.password;

  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const res = botId ? await api.bots.update(botId, data) : await api.bots.create(data);
  btn.disabled = false; btn.textContent = botId ? 'Update Bot' : 'Add Bot';

  if (res.ok) {
    closeModal(); toast(botId ? 'Bot updated!' : 'Bot added!', 'success');
    await loadBots();
  } else toast(res.data.message || 'Failed to save', 'error');
}

function viewBot(id) {
  const b = botsData.find(x => x._id === id);
  if (!b) return;
  const html = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="field"><label>Client</label><div style="color:var(--text-primary);font-weight:600">${b.clientName}</div></div>
        <div class="field"><label>Account ID</label><div class="td-mono" style="color:var(--accent)">${b.accountId}</div></div>
        <div class="field"><label>API Key</label><div class="td-mono" style="color:var(--text-secondary);font-size:0.8rem">${b.apiKey ? b.apiKey.slice(0,20)+'...' : '—'}</div></div>
        <div class="field"><label>Namespace</label><div class="td-mono">${b.namespace||'—'}</div></div>
        <div class="field"><label>Number</label><div>${b.number||'—'}</div></div>
        <div class="field"><label>Account Type</label><div><span class="badge badge-blue">${b.accountType}</span></div></div>
        <div class="field"><label>Integration</label><div><span class="badge badge-purple">${b.remark}</span></div></div>
        <div class="field"><label>Status</label><div>${b.isActive ? '<span class="badge badge-green">Active</span>' : '<span class="badge badge-gray">Inactive</span>'}</div></div>
      </div>
      ${b.smartLink ? `<div class="field"><label>Smart Link</label><a href="${b.smartLink}" target="_blank" class="btn btn-secondary btn-sm">🔗 Open Link</a></div>` : ''}
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:8px;border-top:1px solid var(--border)">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="closeModal();editBot('${b._id}')">Edit</button>
      </div>
    </div>`;
  openModal('Bot Details', html);
}

async function editBot(id) {
  const res = await api.bots.get(id);
  if (!res.ok) { toast('Failed to load bot', 'error'); return; }
  openBotForm(res.data.data);
}

function deleteBotConfirm(id, name) {
  confirmDelete(name, async () => {
    const res = await api.bots.delete(id);
    if (res.ok) { toast('Bot deleted', 'success'); await loadBots(); }
    else toast(res.data.message || 'Delete failed', 'error');
  });
}

// ─── Filtering ────────────────────────────────────────────────────────────────
let botFilters = {};

function openBotColumnFilter(btn, column) {
  let items = [];
  let type = 'text';

  if (column === 'goLiveDate') {
    type = 'date';
    items = botsData.map(b => ({ value: b[column] }));
  } else if (column === 'isActive') {
    items = [
      { label: 'Active', value: true },
      { label: 'Inactive', value: false }
    ];
  } else {
    const values = [...new Set(botsData.map(b => b[column]).filter(v => v !== null && v !== undefined))].sort();
    items = values.map(v => ({ label: String(v), value: v }));
  }

  toggleExcelFilter(btn, {
    module: 'Bots',
    column: column,
    items: items,
    type: type
  });
}

window.applyBotsFilter = function(column, selectedValues) {
  botFilters[column] = selectedValues;
  const filteredData = botsData.filter(b => {
    return Object.keys(botFilters).every(col => {
      const selected = botFilters[col];
      if (!selected || selected.length === 0) return true;
      
      if (col === 'goLiveDate') {
        const date = new Date(b[col]);
        const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
        return selected.includes(monthYear);
      }
      
      const val = b[col];
      return selected.some(s => String(s) === String(val));
    });
  });
  renderBotsTable(filteredData);
};