/**
 * ORAI Insight Hub — Admin Panel
 * User management
 */

async function renderAdmin(container) {
  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Admin Panel</h2>
        <p class="section-sub">Manage team members and access</p>
      </div>
        <div style="display:flex; gap:12px">
          <input type="text" class="search-input" placeholder="Search team..." data-module="Users" oninput="SearchManager.search('Users', this.value, loadUsers)" style="width:240px" />
          <button class="btn btn-primary" onclick="openAddUserModal()">
            ${iconPlus()} Add Team Member
          </button>
        </div>
      </div>

    <div class="table-card" style="animation: fadeUp 0.4s ease both;">
      <div class="table-header">
        <h3 class="table-title">Registered Users</h3>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            <tr><td colspan="6"><div class="empty-table"><p>Loading team members...</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadUsers();
}

async function loadUsers(options = {}) {
  const res = await api.users.list(options);
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  if (res.ok) {
    const users = res.data.data || res.data;
    if ((!users || users.length === 0) && options.search) {
      SearchManager.renderEmptyState('Users', 'users-tbody');
      return;
    }
    if (!users || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-table"><p>No users found.</p></td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(user => `
      <tr>
        <td style="font-weight:600;color:var(--text-primary)">${user.fullName || '—'}</td>
        <td>${user.username}</td>
        <td><span class="badge badge-gray">${user.department}</span></td>
        <td>
          <span class="badge ${user.isActive ? 'badge-green' : 'badge-red'}">
            ${user.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td>${formatDate(user.lastLogin)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="btn-icon btn-ghost" title="View Details" onclick="viewUser('${user._id}')">
              ${iconEye()}
            </button>
            <button class="btn-icon btn-ghost" title="Edit User" onclick="openEditUserModal('${user._id}')">
              ${iconEdit()}
            </button>
            <button class="btn-icon btn-ghost" title="Toggle Status" onclick="toggleUserStatus('${user._id}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
            </button>
            <button class="btn-icon btn-ghost" style="color:var(--red)" title="Delete User" onclick="deleteUser('${user._id}', '${user.username}')">
              ${iconTrash()}
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } else {
    if (res.data && res.data.message === 'Request aborted') return;
    tbody.innerHTML = `<tr><td colspan="6" class="error-state">Error: ${res.data.message}</td></tr>`;
  }
}

function searchUsers(q) {
  SearchManager.search('Users', q, loadUsers);
}

async function viewUser(id) {
  const usersRes = await api.users.list();
  const user = (usersRes.data.data || usersRes.data).find(u => u._id === id);
  if (!user) return toast('User not found', 'error');

  const html = `
    <div class="view-details">
      <div class="detail-row">
        <div class="detail-label">Full Name</div>
        <div class="detail-value">${user.fullName || '—'}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Username</div>
        <div class="detail-value">${user.username}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Email</div>
        <div class="detail-value">${user.email || '—'}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Department</div>
        <div class="detail-value"><span class="badge badge-gray">${user.department}</span></div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Status</div>
        <div class="detail-value">
          <span class="badge ${user.isActive ? 'badge-green' : 'badge-red'}">
            ${user.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Last Login</div>
        <div class="detail-value">${formatDate(user.lastLogin)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Created At</div>
        <div class="detail-value">${formatDate(user.createdAt)}</div>
      </div>
      <div class="modal-footer" style="margin: 20px -26px -26px; border-radius: 0 0 var(--radius-xl) var(--radius-xl)">
        <button type="button" class="btn btn-primary" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
  openModal('User Details', html);
}

async function deleteUser(id, username) {
  if (username === 'admin') return toast('Cannot delete primary admin', 'error');
  confirmDelete(`user ${username}`, async () => {
    const res = await api.users.delete(id);
    if (res.ok) {
      toast('User deleted successfully');
      loadUsers();
    } else {
      toast(res.data.message || 'Failed to delete user', 'error');
    }
  });
}

async function toggleUserStatus(id) {
  const res = await api.users.toggleStatus(id);
  if (res.ok) {
    toast('User status updated');
    loadUsers();
  } else {
    toast(res.data.message || 'Failed to update user status', 'error');
  }
}

function openAddUserModal() {
  renderUserModal();
}

async function openEditUserModal(id) {
  const usersRes = await api.users.list();
  const user = (usersRes.data.data || usersRes.data).find(u => u._id === id);
  if (!user) return toast('User not found', 'error');
  renderUserModal(user);
}

function renderUserModal(user = null) {
  const isEdit = !!user;
  const html = `
    <form id="user-form" onsubmit="submitUserForm(event, ${isEdit ? `'${user._id}'` : 'null'})">
      <div class="form-grid">
        <div class="field full">
          <label>Full Name</label>
          <input type="text" id="user-name" required placeholder="John Doe" value="${isEdit ? user.fullName || '' : ''}">
        </div>
        <div class="field">
          <label>Username</label>
          <input type="text" id="user-username" required placeholder="johndoe" value="${isEdit ? user.username : ''}" ${isEdit ? 'disabled' : ''}>
        </div>
        <div class="field">
          <label>${isEdit ? 'Change Password (Optional)' : 'Password'}</label>
          <input type="password" id="user-password" ${isEdit ? '' : 'required'} placeholder="${isEdit ? 'Leave blank to keep same' : 'Min 6 characters'}">
        </div>
        <div class="field">
          <label>Department</label>
          <select id="user-dept" required>
            ${['CS Team', 'Implementation Team', 'Dev Team', 'Sales Team'].map(d => `<option value="${d}" ${isEdit && user.department === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Email</label>
          <input type="email" id="user-email" placeholder="john@orai.com" value="${isEdit ? user.email || '' : ''}">
        </div>
      </div>
      <div class="modal-footer" style="margin: 20px -26px -26px; border-radius: 0 0 var(--radius-xl) var(--radius-xl)">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary" id="btn-save-user">${isEdit ? 'Update' : 'Create'} User</button>
      </div>
    </form>
  `;
  openModal(isEdit ? 'Edit Team Member' : 'Add Team Member', html);
}

async function submitUserForm(e, id) {
  e.preventDefault();
  const isEdit = !!id;
  const btn = document.getElementById('btn-save-user');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const data = {
    fullName: document.getElementById('user-name').value,
    department: document.getElementById('user-dept').value,
    email: document.getElementById('user-email').value,
  };

  const password = document.getElementById('user-password').value;
  if (password) data.password = password;
  if (!isEdit) data.username = document.getElementById('user-username').value;

  const res = isEdit ? await api.users.update(id, data) : await api.users.create(data);
  if (res.ok) {
    toast(isEdit ? 'User updated successfully' : 'User created successfully', 'success');
    closeModal();
    loadUsers();
  } else {
    toast(res.data.message || 'Error saving user', 'error');
    btn.disabled = false;
    btn.textContent = isEdit ? 'Update User' : 'Create User';
  }
}
