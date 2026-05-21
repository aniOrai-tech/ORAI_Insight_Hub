window.MemberManagement = {
  render: (members) => {
    const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';
    if (!isAdmin) return '';

    return `
      <div class="card" style="margin-top: 30px; border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
        <div class="table-header" style="background: var(--bg-surface); padding: 15px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="color: var(--accent); background: var(--accent-dim); padding: 8px; border-radius: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3 style="font-size: 1rem; font-weight: 700; margin: 0;">Team Member Management</h3>
          </div>
          <button class="btn btn-primary btn-sm" onclick="MemberModal.open()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:5px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Member
          </button>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Full Name</th>
                <th>Email</th>
                <th>Role / Dept</th>
                <th>Status</th>
                <th width="100">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${members.map(m => `
                <tr>
                  <td style="font-weight: 600;">${m.fullName}</td>
                  <td>${m.email || '-'}</td>
                  <td><span class="badge" style="background: var(--bg-body); border: 1px solid var(--border);">${m.department || 'Operations'}</span></td>
                  <td>
                    <span class="status-pill ${m.isActive ? 'status-completed' : 'status-pending'}">
                      ${m.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 5px;">
                      <button class="btn btn-ghost btn-sm" onclick="MemberModal.open('${m._id}')" title="Edit Member">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button class="btn btn-ghost btn-sm" onclick="useDailyTasks.deleteMember('${m._id}')" style="color: var(--red)" title="Delete Member">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};

window.MemberModal = {
  open: (id = null) => {
    const state = useDailyTasks.getState();
    const member = id ? state.members.find(m => m._id === id) : null;
    
    const html = `
      <form id="member-form" onsubmit="MemberModal.save(event, '${id}')" style="padding: 10px 5px;">
        <div class="form-group" style="margin-bottom: 15px;">
          <label class="form-label">Full Name <span style="color:var(--red)">*</span></label>
          <input type="text" name="fullName" required class="form-control" placeholder="John Doe" value="${member?.fullName || ''}">
        </div>
        <div class="form-group" style="margin-bottom: 15px;">
          <label class="form-label">Email Address</label>
          <input type="email" name="email" class="form-control" placeholder="john@example.com" value="${member?.email || ''}">
        </div>
        <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
          <div class="form-group">
            <label class="form-label">Department / Role</label>
            <select name="department" class="form-control">
              <option value="CS Team" ${member?.department === 'CS Team' ? 'selected' : ''}>CS Team</option>
              <option value="Implementation Team" ${member?.department === 'Implementation Team' ? 'selected' : ''}>Implementation Team</option>
              <option value="Dev Team" ${member?.department === 'Dev Team' ? 'selected' : ''}>Dev Team</option>
              <option value="Sales Team" ${member?.department === 'Sales Team' ? 'selected' : ''}>Sales Team</option>
              <option value="Operations" ${member?.department === 'Operations' ? 'selected' : ''}>Operations</option>
              <option value="Management" ${member?.department === 'Management' ? 'selected' : ''}>Management</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Status</label>
            <select name="isActive" class="form-control">
              <option value="true" ${member?.isActive !== false ? 'selected' : ''}>Active</option>
              <option value="false" ${member?.isActive === false ? 'selected' : ''}>Disabled</option>
            </select>
          </div>
        </div>
        <div class="modal-footer" style="margin-top: 20px; padding: 0;">
          <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">${id ? 'Update Member' : 'Add Member'}</button>
        </div>
      </form>
    `;
    
    openModal(id ? 'Edit Team Member' : 'Add Team Member', html);
  },
  save: (e, id) => {
    e.preventDefault();
    const data = {};
    new FormData(e.target).forEach((v, k) => {
      data[k] = k === 'isActive' ? v === 'true' : v;
    });
    useDailyTasks.saveMember(id, data);
  }
};
