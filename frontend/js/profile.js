/**
 * User Profile — Account Settings & Security
 */

async function renderProfile(container) {
  const user = window.currentUser;
  if (!user) return;

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">My Profile</h2>
        <p class="section-sub">Manage your account details and security settings.</p>
      </div>
    </div>

    <div class="form-grid">
      <!-- Profile Info -->
      <div class="table-card" style="padding: 24px">
        <h3 class="details-subtitle" style="margin-bottom: 24px">Personal Information</h3>
        <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid var(--border)">
          <div class="user-avatar" style="width: 80px; height: 80px; font-size: 2rem;">
            ${(user.fullName || user.username).charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary)">${user.fullName || user.username}</h4>
            <p style="color: var(--text-muted)">${user.department} · ${user.role === 'admin' ? 'Administrator' : 'Team Member'}</p>
          </div>
        </div>

        <form id="profile-info-form" class="form-grid">
          <div class="field">
            <label>Full Name</label>
            <input type="text" id="profile-fullname" value="${user.fullName || ''}" placeholder="Enter full name">
          </div>
          <div class="field">
            <label>Username</label>
            <input type="text" value="${user.username}" disabled style="opacity: 0.6; cursor: not-allowed;">
          </div>
          <div class="field">
            <label>Email Address</label>
            <input type="email" id="profile-email" value="${user.email || ''}" placeholder="Enter email address">
          </div>
          <div class="field">
            <label>Department</label>
            <input type="text" value="${user.department}" disabled style="opacity: 0.6; cursor: not-allowed;">
          </div>
          <div class="full" style="margin-top: 10px">
            <button type="submit" class="btn btn-primary" id="save-profile-btn">
              <span class="btn-text">Save Changes</span>
              <span class="btn-loader hidden"><svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></span>
            </button>
          </div>
        </form>
      </div>

      <!-- Security / Password -->
      <div class="table-card" style="padding: 24px">
        <h3 class="details-subtitle" style="margin-bottom: 24px">Security & Password</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 20px">
          It is recommended to use a strong password that you're not using elsewhere.
        </p>

        <form id="change-password-form" class="form-grid">
          <div class="field full">
            <label>Current Password</label>
            <input type="password" id="current-password" required placeholder="••••••••">
          </div>
          <div class="field full">
            <label>New Password</label>
            <input type="password" id="new-password" required placeholder="••••••••">
          </div>
          <div class="field full">
            <label>Confirm New Password</label>
            <input type="password" id="confirm-password" required placeholder="••••••••">
          </div>
          <div class="full" style="margin-top: 10px">
            <button type="submit" class="btn btn-secondary" style="width: 100%; justify-content: center;" id="change-pass-btn">
              <span class="btn-text">Update Password</span>
              <span class="btn-loader hidden"><svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // â”€â”€ Events â”€â”€
  document.getElementById('profile-info-form').addEventListener('submit', handleUpdateProfile);
  document.getElementById('change-password-form').addEventListener('submit', handleChangePassword);
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const btn = document.getElementById('save-profile-btn');
  const fullName = document.getElementById('profile-fullname').value.trim();
  const email = document.getElementById('profile-email').value.trim();

  setLoading(btn, true);

  // Note: We'll reuse the update user API if available, or create a specific profile update route.
  // For now, let's check if the admin update route can be repurposed.
  const res = await api.post('/auth/update-profile', { fullName, email });

  setLoading(btn, false);

  if (res.ok) {
    toast('Profile updated successfully', 'success');
    window.currentUser = { ...window.currentUser, fullName, email };
    localStorage.setItem('orai_user', JSON.stringify(window.currentUser));
    initDashboard(); // Refresh UI
  } else {
    toast(res.data.message || 'Failed to update profile', 'error');
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const btn = document.getElementById('change-pass-btn');
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword !== confirmPassword) {
    toast('New passwords do not match', 'error');
    return;
  }

  setLoading(btn, true);

  const res = await api.auth.changePassword({ currentPassword, newPassword });

  setLoading(btn, false);

  if (res.ok) {
    toast('Password updated successfully', 'success');
    e.target.reset();
  } else {
    toast(res.data.message || 'Failed to change password', 'error');
  }
}

function setLoading(btn, isLoading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  if (isLoading) {
    text.classList.add('hidden');
    loader.classList.remove('hidden');
    btn.disabled = true;
  } else {
    text.classList.remove('hidden');
    loader.classList.add('hidden');
    btn.disabled = false;
  }
}
