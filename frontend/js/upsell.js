/**
 * Upsell Tracker Module
 * Upgraded with Proposal Upload & Versioning
 */

let upsellData = [];

async function renderUpsell(container) {
  if (!(currentUser.permissions || {}).upsell && currentUser.role !== 'admin') {
    container.innerHTML = `<div style="text-align:center;padding:80px 20px;color:var(--text-muted)"><p>Access denied.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Upsell & Proposals</div>
        <div class="section-sub">Track deals, upload proposals, and manage client versions</div>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary" onclick="openUpsellForm()">
          ${iconPlus()} Add Deal
        </button>
      </div>
    </div>

    <div class="stats-grid" id="upsell-stats"></div>

    <div class="card table-card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Proposal Status</th>
              <th>Amount</th>
              <th>Deal Status</th>
              <th>Proposal Document</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="upsell-tbody"><tr><td colspan="7"><div class="empty-table"><p>Loading...</p></div></td></tr></tbody>
        </table>
      </div>
    </div>`;

  await loadUpsell();
}

async function loadUpsell() {
  const res = await api.upsell.list();
  if (!res.ok) return;
  upsellData = res.data.data;
  renderUpsellStats(upsellData);
  renderUpsellTable(upsellData);
}

function renderUpsellStats(data) {
  const el = document.getElementById('upsell-stats');
  if (!el) return;
  const won = data.filter(u => u.status === 'closed_won').length;
  const pending = data.filter(u => u.status === 'pending' || u.status === 'negotiation').length;
  const revenue = data.filter(u => u.paymentReceived).reduce((s, u) => s + (u.proposalAmount || 0), 0);
  
  el.innerHTML = `
    <div class="stat-card green"><div class="stat-value">${won}</div><div class="stat-label">Deals Won</div></div>
    <div class="stat-card yellow"><div class="stat-value">${pending}</div><div class="stat-label">In Pipeline</div></div>
    <div class="stat-card"><div class="stat-value">${formatCurrency(revenue)}</div><div class="stat-label">Revenue Received</div></div>
  `;
}

function renderUpsellTable(data) {
  const tbody = document.getElementById('upsell-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = data.map(u => {
    const hasLinkedProposal = !!u.linkedProposalId;
    const hasDirectFile = !!u.proposalFile;
    const hasDocument = hasLinkedProposal || hasDirectFile;
    
    return `
    <tr>
      <td style="font-weight:600">${u.clientName}</td>
      <td>${hasDocument ? '<span class="badge badge-blue">Document Attached</span>' : '<span class="badge badge-gray">No Document</span>'}</td>
      <td class="td-mono">${formatCurrency(u.proposalAmount)}</td>
      <td>${statusBadge(u.status)}</td>
      <td>
        ${hasDirectFile ? `
          <a href="/${u.proposalFile.path}" target="_blank" class="btn btn-sm btn-ghost" style="color:var(--accent)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Download Proposal
          </a>
        ` : (hasLinkedProposal ? `
          <button class="btn btn-sm btn-ghost" onclick="viewProposalDetails('${u.linkedProposalId}')" style="color:var(--accent)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            View Document
          </button>
        ` : `
          <button class="btn btn-sm btn-ghost" onclick="editUpsell('${u._id}')">
            + Add Document
          </button>
        `)}
      </td>
      <td>${u.paymentReceived ? '<span class="badge badge-green">Received</span>' : '<span class="badge badge-gray">Pending</span>'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="editUpsell('${u._id}')">${iconEdit()}</button>
          <button class="btn btn-ghost btn-icon btn-sm" style="color:var(--red)" onclick="deleteUpsellConfirm('${u._id}','${u.clientName}')">${iconTrash()}</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openProposalUploadModal(upsellId, clientName) {
  const html = `
    <div style="padding:10px 0">
      <p style="margin-bottom:15px; font-size:0.9rem">Upload a proposal document for <strong>${clientName}</strong>.</p>
      <form id="proposal-upload-form" onsubmit="handleProposalUpload(event, '${upsellId}', '${clientName}')">
        <div class="field">
          <label>Proposal Title</label>
          <input type="text" name="title" required placeholder="e.g. Q3 Automation Roadmap" />
        </div>
        <div class="field">
          <label>Select File (PDF, DOCX, PPTX)</label>
          <div class="proposal-dropzone" onclick="document.getElementById('proposal-file').click()">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" style="margin-bottom:10px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p id="file-label">Click to select or drag file</p>
            <input type="file" id="proposal-file" name="proposalFile" class="hidden" onchange="updateFileLabel(this)" required />
          </div>
        </div>
        <div class="field">
          <label>Notes / Change Log</label>
          <textarea name="changeLog" rows="2" placeholder="Initial version..."></textarea>
        </div>
        <div class="modal-footer" style="margin:20px -26px -26px; padding:15px 26px; background:var(--bg-body)">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary" id="upload-submit-btn">Upload Proposal</button>
        </div>
      </form>
    </div>
  `;
  openModal('Upload Proposal', html);
}

function updateFileLabel(input) {
  const label = document.getElementById('file-label');
  if (input.files && input.files[0]) {
    label.textContent = input.files[0].name;
    label.style.color = 'var(--accent)';
    label.style.fontWeight = '600';
  }
}

async function handleProposalUpload(e, upsellId, clientName) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('upload-submit-btn');
  const formData = new FormData(form);
  formData.append('upsellId', upsellId);
  formData.append('clientName', clientName);

  btn.disabled = true;
  btn.textContent = 'Uploading...';

  try {
    const res = await api.proposals.upload(formData);
    if (res.ok) {
      toast('Proposal uploaded successfully!', 'success');
      closeModal();
      loadUpsell();
    } else {
      toast(res.data.message || 'Upload failed', 'error');
    }
  } catch (err) {
    toast('An error occurred during upload', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Upload Proposal';
  }
}

async function viewProposalDetails(proposalId) {
  const res = await api.proposals.getVersions(proposalId);
  if (!res.ok) return;
  const versions = res.data.data;
  
  const html = `
    <div style="padding:10px 0">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px">
        <h4 style="margin:0">Document Versions</h4>
        <button class="btn btn-sm btn-primary" onclick="openNewVersionModal('${proposalId}')">+ Upload New Version</button>
      </div>
      <div class="version-list">
        ${versions.map(v => `
          <div class="version-item">
            <div class="version-number">V${v.versionNumber}</div>
            <div style="flex:1">
              <div style="font-weight:600">${v.file.originalName}</div>
              <div style="font-size:0.75rem; color:var(--text-muted)">
                Uploaded by ${v.uploadedBy.fullName} on ${new Date(v.createdAt).toLocaleString()}
              </div>
              <div style="font-size:0.8rem; margin-top:5px; font-style:italic">"${v.changeLog || 'No notes'}"</div>
            </div>
            <a href="/${v.file.path}" target="_blank" class="btn btn-ghost btn-icon" title="Download">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  openModal('Proposal Versions', html);
}

// Reuse some logic for new version
function openNewVersionModal(proposalId) {
  // Simpler version of upload modal
  const html = `
    <form onsubmit="handleProposalUpload(event, null, null, '${proposalId}')">
      <div class="field">
        <label>Select File</label>
        <input type="file" name="proposalFile" required />
      </div>
      <div class="field">
        <label>Change Log / What's new?</label>
        <textarea name="changeLog" rows="3" required placeholder="Describe changes in this version..."></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Upload New Version</button>
      </div>
    </form>
  `;
  openModal('New Proposal Version', html);
}

/* Original Helper Functions */
function openUpsellForm(deal = null) {
  const isEdit = !!deal;
  const html = `
    <form id="upsell-form" onsubmit="saveUpsell(event, ${isEdit ? `'${deal._id}'` : 'null'})">
      <div class="form-grid">
        <div class="field full">
          <label>Client Name *</label>
          <input type="text" name="clientName" required value="${isEdit ? deal.clientName : ''}" />
        </div>
        <div class="field">
          <label>Deal Status</label>
          <select name="status">
            ${['pending','negotiation','closed_won','closed_lost'].map(s => `<option value="${s}" ${isEdit && deal.status===s?'selected':''}>${s.toUpperCase()}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Proposal Amount</label>
          <input type="number" name="proposalAmount" value="${isEdit ? deal.proposalAmount : ''}" />
        </div>
        <div class="field full">
          <label>Proposal Description (Brief)</label>
          <textarea name="proposal" required rows="3" placeholder="Describe the scope of work...">${isEdit ? deal.proposal : ''}</textarea>
        </div>
        <div class="field full">
          <label>Proposal Document (Upload File)</label>
          <div style="border: 2px dashed var(--border); padding: 15px; border-radius: 8px; text-align: center; background: var(--bg-body)">
            <input type="file" name="proposalFile" id="upsell-file-input" style="display:none" onchange="document.getElementById('upsell-file-name').textContent = this.files[0].name" />
            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('upsell-file-input').click()">Choose File</button>
            <span id="upsell-file-name" style="margin-left:10px; font-size:0.85rem; color:var(--text-secondary)">
              ${isEdit && deal.proposalFile ? deal.proposalFile.originalName : 'No file chosen'}
            </span>
          </div>
        </div>
        <div class="field">
          <label>Payment Received</label>
          <select name="paymentReceived">
            <option value="false" ${isEdit && !deal.paymentReceived?'selected':''}>No</option>
            <option value="true" ${isEdit && deal.paymentReceived?'selected':''}>Yes</option>
          </select>
        </div>
      </div>
      <div class="modal-footer" style="margin:20px -26px -26px; padding:15px 26px; background:var(--bg-body)">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" id="upsell-save-btn">${isEdit ? 'Update' : 'Add'} Deal</button>
      </div>
    </form>`;
  openModal(isEdit ? 'Edit Deal' : 'Add Deal', html);
}

async function saveUpsell(e, dealId) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('upsell-save-btn');
  const formData = new FormData(form);

  btn.disabled = true;
  btn.textContent = 'Saving...';

  const res = dealId ? await api.upsell.update(dealId, formData) : await api.upsell.create(formData);
  
  btn.disabled = false;
  btn.textContent = dealId ? 'Update Deal' : 'Add Deal';

  if (res.ok) { 
    closeModal(); 
    toast(dealId ? 'Deal updated!' : 'Deal added!', 'success'); 
    loadUpsell(); 
  } else {
    toast(res.data.message || 'Failed to save deal', 'error');
  }
}

async function editUpsell(id) {
  const res = await api.upsell.get(id);
  if (res.ok) openUpsellForm(res.data.data);
}

function deleteUpsellConfirm(id, name) {
  confirmDelete(name, async () => {
    const res = await api.upsell.delete(id);
    if (res.ok) { toast('Deleted'); loadUpsell(); }
  });
}

console.log('[UPSELL MODULE UPGRADED]');
