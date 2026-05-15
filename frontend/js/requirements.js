/**
 * New Requirements Module
 */

let requirementsData = [];

async function renderRequirements(container) {
  if (!(currentUser.permissions || {}).requirements && currentUser.role !== 'admin') {
    container.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text-muted)"><p>Access denied.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">New Requirements</div>
        <div class="section-sub">Track client requests and feature requirements</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" onclick="toggleAllFilterIcons()" title="Show/Hide Table Filters">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg>
          <span>Filters</span>
        </button>
        <button class="btn btn-primary" onclick="openRequirementForm()">
          ${iconPlus()} Add Requirement
        </button>
      </div>
    </div>

    <div class="card table-card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th><div class="th-content"><span>Account</span><button class="filter-trigger" onclick="openRequirementColumnFilter(this, 'accountName')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Account Manager</span><button class="filter-trigger" onclick="openRequirementColumnFilter(this, 'accountManagerName')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Summary</span><button class="filter-trigger" onclick="openRequirementColumnFilter(this, 'usecaseSummary')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Priority</span><button class="filter-trigger" onclick="openRequirementColumnFilter(this, 'priority')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Status</span><button class="filter-trigger" onclick="openRequirementColumnFilter(this, 'status')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th>Recording</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody id="req-tbody"><tr><td colspan="8"><div class="empty-table"><p>Loading...</p></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  await loadRequirements();
}

let reqFilters = {};
async function loadRequirements(params = {}) {
  reqFilters = { ...reqFilters, ...params };
  const res = await api.requirements.list(reqFilters);
  if (!res.ok) { toast('Failed to load requirements', 'error'); return; }
  requirementsData = res.data.data;
  renderReqTable(requirementsData);
}

function filterRequirements(key, val) {
  reqFilters[key] = val || undefined;
  loadRequirements();
}

const priorityColors = { urgent: 'badge-red', high: 'badge-yellow', medium: 'badge-blue', low: 'badge-gray' };

function renderReqTable(data) {
  const tbody = document.getElementById('req-tbody');
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-table">${iconClipboard()}<p>No requirements found.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(r => `
    <tr>
      <td style="font-weight:600;color:var(--text-primary)">${r.accountName}</td>
      <td>${r.accountManagerName}</td>
      <td style="max-width:220px">${truncate(r.usecaseSummary, 55)}</td>
      <td><span class="badge ${priorityColors[r.priority]||'badge-gray'}">${r.priority}</span></td>
      <td>${statusBadge(r.status)}</td>
      <td>${r.recording?.filename
        ? `<a href="/uploads/recordings/${r.recording.filename}" target="_blank" class="btn btn-ghost btn-sm">🎙 Play</a>`
        : '<span style="color:var(--text-muted);font-size:0.8rem">None</span>'}</td>
      <td>${formatDate(r.createdAt)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-icon" onclick="viewRequirement('${r._id}')">${iconEye()}</button>
          <button class="btn btn-ghost btn-icon" onclick="editRequirement('${r._id}')">${iconEdit()}</button>
          <button class="btn btn-ghost btn-icon" style="color:var(--red)" onclick="deleteReqConfirm('${r._id}','${r.accountName.replace(/'/g,"\\'")}')"> ${iconTrash()}</button>
        </div>
      </td>
    </tr>`).join('');
}

function openRequirementForm(req = null) {
  const isEdit = !!req;
  const html = `
    <form onsubmit="saveRequirement(event, ${isEdit ? `'${req._id}'` : 'null'})">
      <div class="form-grid">
        <div class="field">
          <label>Account Name *</label>
          <input type="text" name="accountName" required placeholder="Acme Corp" value="${isEdit ? req.accountName : ''}" />
        </div>
        <div class="field">
          <label>Account Manager *</label>
          <input type="text" name="accountManagerName" required placeholder="Manager name" value="${isEdit ? req.accountManagerName : ''}" />
        </div>
        <div class="field full">
          <label>Usecase Summary *</label>
          <textarea name="usecaseSummary" required rows="4" placeholder="Describe the requirement or use case in detail...">${isEdit ? req.usecaseSummary : ''}</textarea>
        </div>
        <div class="field">
          <label>Priority</label>
          <select name="priority">
            ${['low','medium','high','urgent'].map(p => `<option value="${p}" ${isEdit && req.priority===p?'selected':''}>${p.charAt(0).toUpperCase()+p.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Status</label>
          <select name="status">
            ${['new','in_review','in_progress','completed','rejected'].map(s => `<option value="${s}" ${isEdit && req.status===s?'selected':''}>${s.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Est. Completion Date</label>
          <input type="date" name="estimatedCompletionDate" value="${isEdit && req.estimatedCompletionDate ? req.estimatedCompletionDate.split('T')[0] : ''}" />
        </div>
        <div class="field full">
          <label>Recording (if available)</label>
          <div class="file-upload-area" onclick="this.querySelector('input').click()">
            <input type="file" name="recording" accept="audio/*,video/*,.mp3,.wav,.ogg,.flac,.aac,.wma,.m4a,.mp4,.webm,.mov,.avi,.mkv,.wmv,.3gp" style="display:none" onchange="showFileName(this)" />
            <div class="file-upload-label"><span>Click to upload</span> recording<div style="font-size:0.75rem;margin-top:4px;color:var(--text-muted)">Audio or video file</div></div>
            <div class="file-name" id="file-name-display">${isEdit && req.recording ? `📎 ${req.recording.originalName}` : ''}</div>
          </div>
        </div>
        <div class="field full">
          <label>Notes</label>
          <textarea name="notes" rows="2" placeholder="Additional context...">${isEdit ? (req.notes||'') : ''}</textarea>
        </div>
      </div>
      <div class="modal-footer" style="margin:0 -26px -26px;padding:18px 26px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Update Requirement' : 'Add Requirement'}</button>
      </div>
    </form>`;
  openModal(isEdit ? 'Edit Requirement' : 'Add New Requirement', html);
}

async function saveRequirement(e, reqId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving...';
  const res = reqId ? await api.requirements.update(reqId, Object.fromEntries(fd)) : await api.requirements.create(fd);
  btn.disabled = false;
  if (res.ok) { closeModal(); toast(reqId ? 'Updated!' : 'Requirement added!', 'success'); await loadRequirements(); }
  else toast(res.data.message || 'Failed to save', 'error');
}

function viewRequirement(id) {
  const r = requirementsData.find(x => x._id === id);
  if (!r) return;
  const html = `
    <div style="display:flex;flex-direction:column;gap:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="field"><label>Account</label><div style="color:var(--text-primary);font-weight:600">${r.accountName}</div></div>
        <div class="field"><label>Account Manager</label><div>${r.accountManagerName}</div></div>
        <div class="field"><label>Priority</label><div><span class="badge ${priorityColors[r.priority]||'badge-gray'}">${r.priority}</span></div></div>
        <div class="field"><label>Status</label><div>${statusBadge(r.status)}</div></div>
        <div class="field"><label>Est. Completion</label><div>${formatDate(r.estimatedCompletionDate)}</div></div>
        <div class="field"><label>Created</label><div>${formatDate(r.createdAt)}</div></div>
      </div>
      <div class="field"><label>Usecase Summary</label><div style="color:var(--text-secondary);line-height:1.7;white-space:pre-wrap;background:var(--bg-input);padding:14px;border-radius:var(--radius)">${r.usecaseSummary}</div></div>
      ${r.recording ? `<div class="field"><label>Recording</label><a href="/uploads/recordings/${r.recording.filename}" target="_blank" class="btn btn-secondary btn-sm">🎙 Play Recording</a></div>` : ''}
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:8px;border-top:1px solid var(--border)">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="closeModal();editRequirement('${r._id}')">Edit</button>
      </div>
    </div>`;
  openModal('Requirement Details', html);
}

async function editRequirement(id) {
  const res = await api.requirements.get(id);
  if (!res.ok) { toast('Failed to load', 'error'); return; }
  openRequirementForm(res.data.data);
}

function deleteReqConfirm(id, name) {
  confirmDelete(name, async () => {
    const res = await api.requirements.delete(id);
    if (res.ok) { toast('Requirement deleted', 'success'); await loadRequirements(); }
    else toast(res.data.message || 'Delete failed', 'error');
  });
}

// ─── Filtering ────────────────────────────────────────────────────────────────
function openRequirementColumnFilter(btn, column) {
  const values = [...new Set(requirementsData.map(r => r[column]).filter(v => v !== null && v !== undefined))].sort();
  toggleExcelFilter(btn, {
    module: 'Requirements',
    column: column,
    items: values.map(v => ({ label: String(v), value: v }))
  });
}

window.applyRequirementsFilter = function(column, selectedValues) {
  reqFilters[column] = selectedValues;
  const filteredData = requirementsData.filter(r => {
    return Object.keys(reqFilters).every(col => {
      const selected = reqFilters[col];
      if (!selected || selected.length === 0 || !Array.isArray(selected)) return true;
      const val = r[col];
      return selected.some(s => String(s) === String(val));
    });
  });
  renderReqTable(filteredData);
};
