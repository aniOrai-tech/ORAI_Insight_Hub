/**
 * tickets.js
 * ─────────────────────────────────────────────────────────
 * Upgraded Support Desk Module — Zoho Desk Style
 * Bridges the custom premium user mockup with the actual DB API backend
 * ─────────────────────────────────────────────────────────
 */

let ticketsPage = 1;
let currentTicketFilter = 'all';

window.updateActivityDurationFromDropdowns = function() {
  const hrs = parseInt(document.getElementById('sd-act-hours')?.value) || 0;
  const mins = parseInt(document.getElementById('sd-act-minutes')?.value) || 0;
  const durationInput = document.getElementById('sd-act-duration');
  if (!durationInput) return;
  if (hrs === 0 && mins === 0) {
    durationInput.value = '—';
  } else if (hrs === 0) {
    durationInput.value = `${mins}m`;
  } else if (mins === 0) {
    durationInput.value = `${hrs}h`;
  } else {
    durationInput.value = `${hrs}h ${mins}m`;
  }
};

// Expose public entrypoint to SPA router
async function renderTickets(container) {
  container.innerHTML = SupportDesk.getHTML();
  await SupportDesk.init();
}

async function renderDeskHQ(container) {
  await renderTickets(container);
  SupportDesk.switchMainTab(null, 'sd-reports-section');
}

async function renderDeskQueue(container) {
  await renderTickets(container);
  // Filter for my in progress tickets
  const sidebarItem = document.querySelector('.sd-sidebar__item[data-filter="inprogress"]');
  if (sidebarItem) {
    document.querySelectorAll('.sd-sidebar__item').forEach(i => i.classList.remove('is-active'));
    sidebarItem.classList.add('is-active');
  }
  SupportDesk.filterTickets('inprogress', sidebarItem);
}

async function renderDeskFeeds(container) {
  await renderTickets(container);
  SupportDesk.switchMainTab(null, 'sd-reports-section');
}

const SupportDesk = (() => {
  // ──────────────────────────────────────────────────────────
  // STATE
  // ───────
  let tickets = [];
  let contacts = [];
  let activeSidebarFilter = 'all';
  let activeStatusFilter = 'all';
  let activePriorityFilter = 'all';
  let activeSort = 'newest';
  let activeMembers = [];
  let activeAgentFilter = 'all';
  let editingContactId = null;
  let editingAccountId = null;
  let editingActivityId = null;
  let editingArticleTitle = null;
  
  
  // Fallbacks in case the backend DB has no tickets
  const fallbackTickets = [
    {
      id: 'TKT-001001',
      subject: 'Login loop on Mobile App',
      category: 'bug',
      client: 'Ptron',
      clientSub: 'CS: —',
      priority: 'high',
      status: 'open',
      agent: 'Sarah M.',
      sla: 'atrisk',
      created: '2026-05-18T10:15:00Z',
      desc: 'Users are stuck in a loop when logging in from iOS device.'
    },
    {
      id: 'TKT-001002',
      subject: 'Invoice #1092 query',
      category: 'billing',
      client: 'TechStart Inc',
      clientSub: 'CS: —',
      priority: 'low',
      status: 'resolved',
      agent: 'James K.',
      sla: 'ontrack',
      created: '2026-05-17T14:22:00Z',
      desc: 'Client is questioning the hosting surcharge in last month bill.'
    },
    {
      id: 'TKT-001003',
      subject: 'API Gateway Timeout (504)',
      category: 'bug',
      client: 'Alpha Corp',
      clientSub: 'CS: —',
      priority: 'urgent',
      status: 'overdue',
      agent: 'Sarah M.',
      sla: 'breached',
      created: '2026-05-16T09:00:00Z',
      desc: 'API requests are timing out when executing bulk data sync exports.'
    },
    {
      id: 'TKT-001004',
      subject: 'SaaS Onboarding assistance',
      category: 'support',
      client: 'Beta Ltd',
      clientSub: 'CS: —',
      priority: 'medium',
      status: 'inprogress',
      agent: 'Unassigned',
      sla: 'notset',
      created: '2026-05-18T08:30:00Z',
      desc: 'New customer needs setup walkthrough for custom domains.'
    },
    {
      id: 'TKT-001005',
      subject: 'Add Dark Mode to platform',
      category: 'feature request',
      client: 'Gamma LLC',
      clientSub: 'CS: —',
      priority: 'low',
      status: 'closed',
      agent: 'James K.',
      sla: 'notset',
      created: '2026-05-15T11:45:00Z',
      desc: 'Requesting dark theme style for dashboard screens.'
    }
  ];

  const STATUS_BADGE = {
    open:       'sd-badge--open',
    pending:    'sd-badge--pending',
    overdue:    'sd-badge--overdue',
    resolved:   'sd-badge--resolved',
    closed:     'sd-badge--closed',
    inprogress: 'sd-badge--inprogress'
  };

  const PRIORITY_BADGE = {
    low:    'sd-badge--low',
    medium: 'sd-badge--medium',
    high:   'sd-badge--high',
    urgent: 'sd-badge--urgent'
  };

  const SLA_BADGE = {
    ontrack:  'sd-badge--ontrack',
    atrisk:   'sd-badge--atrisk',
    breached: 'sd-badge--breached',
    notset:   'sd-badge--notset'
  };

  const SLA_LABEL = {
    ontrack:  '🟢 On Track',
    atrisk:   '⚠️ At Risk',
    breached: '🛑 Breached',
    notset:   '—'
  };

  let currentTicketId = null;

  // ──────────────────────────────────────────────────────────
  // UI UTILS
  // ──────────
  function badge(map, key) {
    const val = key ? key.toLowerCase() : '';
    const cls = map[val] || 'sd-badge--notset';
    return `<span class="sd-badge ${cls}">${key}</span>`;
  }

  function avatar(name) {
    if (!name || name === 'Unassigned') {
      return `<div class="sd-avatar sd-avatar--unassigned">👤</div>`;
    }
    const char = name.charAt(0).toUpperCase();
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#ef4444'];
    const color = colors[Math.abs(hash) % colors.length];
    return `<div class="sd-avatar" style="background:${color}">${char}</div>`;
  }

  function formatDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ──────────────────────────────────────────────────────────
  // CORE BUSINESS LOGIC
  // ──────────────────────────────────────────────────────────

  // Fetch from live database & map to model
  async function loadBackendTickets() {
    const res = await api.tickets.list({ limit: 100 });
    if (res.ok && res.data && res.data.data && res.data.data.length > 0) {
      tickets = res.data.data.map(t => {
        let slaStatus = 'notset';
        if (t.slaBreach) {
          slaStatus = 'breached';
        } else if (t.slaDeadline) {
          const hoursLeft = (new Date(t.slaDeadline) - new Date()) / (1000 * 60 * 60);
          if (hoursLeft < 0) slaStatus = 'breached';
          else if (hoursLeft < 4) slaStatus = 'atrisk';
          else slaStatus = 'ontrack';
        }

        let categoryVal = t.category ? t.category.toLowerCase().replace(/_/g, ' ') : 'support';
        if (!['support', 'billing', 'bug', 'feature request'].includes(categoryVal)) {
          categoryVal = 'support';
        }

        let statusVal = t.status ? t.status.toLowerCase() : 'open';
        if (statusVal === 'in_progress') statusVal = 'inprogress';

        return {
          id: t.ticketId || `TKT-${t._id.slice(-6).toUpperCase()}`,
          _id: t._id,
          subject: t.subject,
          category: categoryVal,
          client: t.clientName || '—',
          clientSub: `CS: ${t.csSpoc || '—'}`,
          priority: t.priority || 'medium',
          status: statusVal,
          agent: t.assignedToName || 'Unassigned',
          sla: slaStatus,
          created: t.createdAt,
          desc: t.description || ''
        };
      });
      tickets.sort((a,b) => new Date(b.created) - new Date(a.created));
    } else {
      // Fallback
      tickets = [...fallbackTickets];
    }
  }

  async function loadActiveMembers() {
    const res = await api.members.list({ status: 'active' });
    if (res.ok && res.data && res.data.data) {
      activeMembers = res.data.data;
    } else {
      activeMembers = [];
    }
  }

  function renderSidebarMembers() {
    const container = document.getElementById('sd-sidebar-members');
    if (!container) return;

    if (activeMembers.length === 0) {
      container.innerHTML = `
        <div style="font-size:0.75rem; color:var(--sd-text-muted); padding:8px 12px;">
          No active members
        </div>
      `;
      return;
    }

    container.innerHTML = activeMembers.map(m => `
      <div class="sd-sidebar__item" data-filter="agent:${m.fullName}">
        <span>${m.fullName}</span>
        <span id="sd-cnt-member-${m._id}" class="sd-sidebar__badge">0</span>
      </div>
    `).join('');

    // Wire up events dynamically
    container.querySelectorAll('.sd-sidebar__item').forEach(item => {
      item.onclick = () => filterTickets(item.dataset.filter, item);
    });
  }

  function populateAssigneeDropdown() {
    const select = document.getElementById('sd-nt-agent');
    if (select) {
      select.innerHTML = `
        <option value="Unassigned">Unassigned</option>
        ${activeMembers.map(m => `<option value="${m.fullName}">${m.fullName}</option>`).join('')}
      `;
    }

    const toolbarSelect = document.getElementById('sd-toolbar-agent-select');
    if (toolbarSelect) {
      const currentValue = toolbarSelect.value || 'all';
      toolbarSelect.innerHTML = `
        <option value="all">All Members</option>
        <option value="unassigned">Unassigned</option>
        ${activeMembers.map(m => `<option value="${m.fullName}">${m.fullName}</option>`).join('')}
      `;
      // Restore previous selection if still valid
      if (Array.from(toolbarSelect.options).some(opt => opt.value === currentValue)) {
        toolbarSelect.value = currentValue;
      } else {
        toolbarSelect.value = 'all';
      }
    }
  }

  function openViewDetailModal(title, fields) {
    const modal = document.getElementById('sd-view-detail-modal');
    if (!modal) return;
    document.getElementById('sd-vd-title').textContent = title;
    
    let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
    for (const [label, val] of Object.entries(fields)) {
      html += `
        <div style="border-bottom: 1px solid var(--sd-border); padding-bottom: 8px;">
          <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--sd-text-muted); font-weight: 600;">${label}</div>
          <div style="font-weight: 700; margin-top: 4px; color: var(--sd-text);">${val || '—'}</div>
        </div>
      `;
    }
    html += '</div>';
    document.getElementById('sd-vd-content').innerHTML = html;
    modal.classList.add('is-open');
  }

  function closeViewDetailModal() {
    const modal = document.getElementById('sd-view-detail-modal');
    if (modal) modal.classList.remove('is-open');
  }

  async function refreshAll() {
    await loadActiveMembers();
    await loadBackendTickets();
    await loadContacts();
    loadAccounts();
    renderSidebarMembers();
    populateAssigneeDropdown();
    applyFiltersAndSort();
    updateCounts();
    renderWeeklyBars();
    renderContactsSection();
    renderAccountsSection();
    renderActivitiesSection();
    renderReportsSection();
    renderKBSection();
  }

  const defaultContacts = [
    {
      id: 'cnt-1',
      spocName: 'Ptron Electronics',
      companyName: 'Ptron',
      email: 'ptron@example.com',
      contactNumber: '+91 98765 43210',
      status: 'Active',
      tags: ['Support', 'Premium']
    },
    {
      id: 'cnt-2',
      spocName: 'TechStart Innovations',
      companyName: 'TechStart Inc',
      email: 'billing@techstart.io',
      contactNumber: '+91 87654 32109',
      status: 'Active',
      tags: ['Billing', 'Bug']
    },
    {
      id: 'cnt-3',
      spocName: 'Alpha Technologies',
      companyName: 'Alpha Corp',
      email: 'support@alphacorp.com',
      contactNumber: '+91 76543 21098',
      status: 'Active',
      tags: ['Feature Request']
    },
    {
      id: 'cnt-4',
      spocName: 'Beta Solutions',
      companyName: 'Beta Ltd',
      email: 'contact@betasolutions.com',
      contactNumber: '+91 65432 10987',
      status: 'Inactive',
      tags: ['Support']
    }
  ];

  function getCustomContacts() {
    try {
      return JSON.parse(localStorage.getItem('sd-custom-contacts') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveCustomContact(newContact) {
    const list = getCustomContacts();
    list.push(newContact);
    localStorage.setItem('sd-custom-contacts', JSON.stringify(list));
  }

  async function loadContacts() {
    try {
      const res = await api.clients.list({ limit: 100 });
      let dbContacts = [];
      if (res.ok && res.data && res.data.data) {
        dbContacts = res.data.data.map((c, i) => {
          let tags = ['Support'];
          if (c.notes) {
            try {
              tags = JSON.parse(c.notes);
              if (!Array.isArray(tags)) tags = [c.notes];
            } catch (e) {
              tags = c.notes.split(',').map(t => t.trim()).filter(Boolean);
            }
          } else {
            if (c.companyName.includes('Ptron')) tags = ['Support', 'Premium'];
            else if (c.companyName.includes('TechStart')) tags = ['Billing', 'Bug'];
            else if (c.companyName.includes('Alpha')) tags = ['Feature Request'];
          }
          return {
            id: c._id,
            spocName: c.spocName,
            companyName: c.companyName || c.spocName,
            email: c.email,
            contactNumber: c.contactNumber,
            status: i === 3 ? 'Inactive' : 'Active',
            tags: tags
          };
        });
      }

      const mergedMap = new Map();
      defaultContacts.forEach(c => mergedMap.set(c.email.toLowerCase(), c));
      dbContacts.forEach(c => mergedMap.set(c.email.toLowerCase(), c));
      getCustomContacts().forEach(c => mergedMap.set(c.email.toLowerCase(), c));
      contacts = Array.from(mergedMap.values());
    } catch (err) {
      console.error('Error loading contacts:', err);
      contacts = [...defaultContacts, ...getCustomContacts()];
    }
  }

  function renderContactsSection() {
    const container = document.getElementById('sd-contacts-section');
    if (!container) return;

    const totalContacts = contacts.length;
    const activeContacts = contacts.filter(c => c.status === 'Active').length;

    const contactStatsList = contacts.map(c => {
      const clientTickets = tickets.filter(t => 
        (t.client && c.companyName && t.client.toLowerCase().includes(c.companyName.toLowerCase())) || 
        (t.client && c.companyName && c.companyName.toLowerCase().includes(t.client.toLowerCase()))
      );

      const total = clientTickets.length;
      const resolved = clientTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
      const overdue = clientTickets.filter(t => t.status === 'overdue' || t.sla === 'breached').length;

      return {
        contact: c,
        total,
        resolved,
        overdue
      };
    });

    const openTicketsSum = contactStatsList.reduce((sum, item) => sum + (item.total - item.resolved), 0);
    const resolvedTicketsSum = contactStatsList.reduce((sum, item) => sum + item.resolved, 0);

    container.innerHTML = `
      <div class="sd-contacts-container">
        <div class="sd-contacts-header">
          <div class="sd-contacts-header-left">
            <h1 class="sd-contacts-title">Contacts</h1>
            <p class="sd-contacts-subtitle">All customers and stakeholders</p>
          </div>
          <button id="sd-btn-new-contact" class="sd-btn sd-btn--primary">+ New Contact</button>
        </div>
        
        <!-- KPI Row -->
        <div class="sd-contacts-stats">
          <div class="sd-cstat-card">
            <div class="sd-cstat-label">TOTAL CONTACTS</div>
            <div id="sd-cstat-total" class="sd-cstat-value">${totalContacts}</div>
          </div>
          <div class="sd-cstat-card">
            <div class="sd-cstat-label">ACTIVE</div>
            <div id="sd-cstat-active" class="sd-cstat-value text-purple">${activeContacts}</div>
          </div>
          <div class="sd-cstat-card">
            <div class="sd-cstat-label">OPEN TICKETS</div>
            <div id="sd-cstat-open" class="sd-cstat-value text-orange">${openTicketsSum}</div>
          </div>
          <div class="sd-cstat-card">
            <div class="sd-cstat-label">RESOLVED</div>
            <div id="sd-cstat-resolved" class="sd-cstat-value text-green">${resolvedTicketsSum}</div>
          </div>
        </div>
        
        <!-- Contacts Grid -->
        <div class="sd-contacts-grid">
          ${contactStatsList.map(item => {
            const c = item.contact;
            const initials = c.companyName ? c.companyName.charAt(0).toUpperCase() : 'C';
            const avatarBg = getContactAvatarColor(c.companyName);
            const statusClass = c.status === 'Active' ? 'sd-contact-badge-active' : 'sd-contact-badge-inactive';
            
            return `
              <div class="sd-contact-card">
                <div class="${statusClass}" title="Status: ${c.status}"></div>
                <div class="sd-contact-card-header">
                  <div class="sd-contact-avatar" style="background: ${avatarBg}">
                    ${initials}
                  </div>
                  <div class="sd-contact-meta">
                    <div class="sd-contact-name">${c.companyName}</div>
                    <div class="sd-contact-company">${c.spocName}</div>
                  </div>
                </div>
                
                <div class="sd-contact-details">
                  <a href="mailto:${c.email}" class="sd-contact-detail-item">
                    <span class="sd-contact-detail-icon">✉️</span>
                    <span>${c.email}</span>
                  </a>
                  <a href="tel:${c.contactNumber}" class="sd-contact-detail-item">
                    <span class="sd-contact-detail-icon">📞</span>
                    <span>${c.contactNumber}</span>
                  </a>
                </div>
                
                <div class="sd-contact-divider"></div>
                
                <div class="sd-contact-stats">
                  <div class="sd-contact-stat-item">
                    <span class="sd-contact-stat-num">${item.total}</span>
                    <span class="sd-contact-stat-label">Tickets</span>
                  </div>
                  <div class="sd-contact-stat-item">
                    <span class="sd-contact-stat-num">${item.resolved}</span>
                    <span class="sd-contact-stat-label">Resolved</span>
                  </div>
                  <div class="sd-contact-stat-item">
                    <span class="sd-contact-stat-num ${item.overdue > 0 ? 'text-orange' : ''}">${item.overdue}</span>
                    <span class="sd-contact-stat-label">Overdue</span>
                  </div>
                </div>
                
                <div class="sd-contact-tags" style="display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; gap:6px;">
                    ${c.tags.map(tag => `<span class="sd-contact-tag">${tag}</span>`).join('')}
                  </div>
                  <div style="display:flex; gap:8px;">
                    <button class="sd-btn sd-btn--ghost sd-btn--sm btn-view-contact" data-id="${c.id}" style="padding:4px 8px; font-size:0.8rem;" title="View Detail">👁️</button>
                    <button class="sd-btn sd-btn--ghost sd-btn--sm btn-edit-contact" data-id="${c.id}" style="padding:4px 8px; font-size:0.8rem;" title="Edit">✏️</button>
                    <button class="sd-btn sd-btn--ghost sd-btn--sm btn-delete-contact" data-id="${c.id}" style="padding:4px 8px; font-size:0.8rem; color:var(--sd-red)" title="Delete">🗑️</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const newContactBtn = document.getElementById('sd-btn-new-contact');
    if (newContactBtn) {
      newContactBtn.onclick = () => openNewContactModal();
    }

    container.querySelectorAll('.btn-view-contact').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const contact = contacts.find(c => c.id === btn.dataset.id);
        if (contact) {
          openViewDetailModal('Contact Details', {
            'SPOC Name': contact.spocName,
            'Company / Organization': contact.companyName,
            'Email Address': contact.email,
            'Phone Number': contact.contactNumber,
            'Status': contact.status,
            'Tags': contact.tags.join(', ')
          });
        }
      };
    });

    container.querySelectorAll('.btn-edit-contact').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const contact = contacts.find(c => c.id === btn.dataset.id);
        if (contact) {
          editingContactId = contact.id;
          document.getElementById('sd-nc-spoc-name').value = contact.spocName;
          document.getElementById('sd-nc-company-name').value = contact.companyName;
          document.getElementById('sd-nc-email').value = contact.email;
          document.getElementById('sd-nc-phone').value = contact.contactNumber;
          document.getElementById('sd-nc-status').value = contact.status;
          document.getElementById('sd-nc-tags').value = contact.tags.join(', ');
          
          const title = document.querySelector('#sd-new-contact-modal h2');
          if (title) title.textContent = 'Edit Contact';
          const saveBtn = document.getElementById('sd-btn-create-contact');
          if (saveBtn) saveBtn.textContent = 'Save Changes';
          
          openNewContactModal();
        }
      };
    });

    container.querySelectorAll('.btn-delete-contact').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const contact = contacts.find(c => c.id === btn.dataset.id);
        if (contact && confirm(`Are you sure you want to delete contact "${contact.spocName}"?`)) {
          let custom = getCustomContacts();
          custom = custom.filter(c => c.id !== contact.id);
          localStorage.setItem('sd-custom-contacts', JSON.stringify(custom));
          showToast('Contact deleted successfully!');
          refreshAll();
        }
      };
    });
  }

  function getContactAvatarColor(name) {
    if (!name) return '#7c3aed';
    if (name.includes('Ptron')) return '#7c3aed';
    if (name.includes('TechStart')) return '#f97316';
    if (name.includes('Alpha')) return '#10b981';
    if (name.includes('Beta')) return '#3b82f6';
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#ef4444'];
    return colors[Math.abs(hash) % colors.length];
  }

  function openNewContactModal() {
    const modal = document.getElementById('sd-new-contact-modal');
    if (modal) modal.classList.add('is-open');
  }

  function closeNewContactModal(force = false) {
    if (!force) {
      const name = document.getElementById('sd-nc-spoc-name').value;
      if (name && !confirm('Discard unsaved draft?')) return;
    }
    const modal = document.getElementById('sd-new-contact-modal');
    if (modal) modal.classList.remove('is-open');

    ['sd-nc-spoc-name', 'sd-nc-company-name', 'sd-nc-email', 'sd-nc-phone', 'sd-nc-tags'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const title = document.querySelector('#sd-new-contact-modal h2');
    if (title) title.textContent = 'Create New Contact';
    const saveBtn = document.getElementById('sd-btn-create-contact');
    if (saveBtn) saveBtn.textContent = 'Create Contact';
    editingContactId = null;
  }

  async function createContact() {
    const spocName = document.getElementById('sd-nc-spoc-name').value.trim();
    const companyName = document.getElementById('sd-nc-company-name').value.trim();
    const email = document.getElementById('sd-nc-email').value.trim();
    const contactNumber = document.getElementById('sd-nc-phone').value.trim();
    const status = document.getElementById('sd-nc-status').value;
    const tagsInput = document.getElementById('sd-nc-tags').value.trim();

    if (!spocName || !companyName || !email || !contactNumber) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];

    if (editingContactId) {
      // Edit existing
      let custom = getCustomContacts();
      const idx = custom.findIndex(c => c.id === editingContactId);
      const updatedContact = {
        id: editingContactId,
        spocName,
        companyName,
        email,
        contactNumber,
        status,
        tags
      };
      if (idx !== -1) {
        custom[idx] = updatedContact;
      } else {
        custom.push(updatedContact);
      }
      localStorage.setItem('sd-custom-contacts', JSON.stringify(custom));
      showToast('Contact updated successfully!');
      editingContactId = null;
    } else {
      // Create new
      const newContact = {
        spocName,
        companyName,
        email,
        contactNumber,
        notes: JSON.stringify(tags),
        department: 'CS Team'
      };

      let apiSuccess = false;
      try {
        const res = await api.clients.create(newContact);
        if (res.ok) {
          showToast('Contact created successfully!');
          apiSuccess = true;
        }
      } catch (e) {
        console.error('Failed to create client in DB:', e);
      }

      if (!apiSuccess) {
        const localContact = {
          id: 'cnt-local-' + Date.now(),
          spocName,
          companyName,
          email,
          contactNumber,
          status,
          tags
        };
        saveCustomContact(localContact);
        showToast('Contact created (Saved locally)!');
      }
    }

    closeNewContactModal(true);
    await refreshAll();
  }

  const defaultAccounts = [
    {
      companyName: 'Ptron Electronics',
      industry: 'Consumer Electronics',
      plan: 'Premium',
      since: 'Jan 2024'
    },
    {
      companyName: 'TechStart Innovations',
      industry: 'SaaS',
      plan: 'Standard',
      since: 'Mar 2024'
    },
    {
      companyName: 'Alpha Technologies',
      industry: 'IT Services',
      plan: 'Premium',
      since: 'Jun 2024'
    },
    {
      companyName: 'Beta Solutions',
      industry: 'Consulting',
      plan: 'Basic',
      since: 'Aug 2024'
    }
  ];

  let accounts = [];

  function getCustomAccounts() {
    try {
      return JSON.parse(localStorage.getItem('sd-custom-accounts') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveCustomAccount(newAccount) {
    const list = getCustomAccounts();
    list.push(newAccount);
    localStorage.setItem('sd-custom-accounts', JSON.stringify(list));
  }

  function loadAccounts() {
    const mergedMap = new Map();
    defaultAccounts.forEach(a => mergedMap.set(a.companyName.toLowerCase(), a));
    getCustomAccounts().forEach(a => mergedMap.set(a.companyName.toLowerCase(), a));
    accounts = Array.from(mergedMap.values());
  }

  function renderAccountsSection() {
    const container = document.getElementById('sd-accounts-section');
    if (!container) return;

    loadAccounts();

    container.innerHTML = `
      <div class="sd-accounts-container">
        <div class="sd-accounts-header">
          <div class="sd-accounts-header-left">
            <h1 class="sd-accounts-title">Accounts</h1>
            <p class="sd-accounts-subtitle">Company-level management</p>
          </div>
          <button id="sd-btn-new-account" class="sd-btn sd-btn--primary">+ New Account</button>
        </div>
        
        <!-- Table Card -->
        <div class="sd-accounts-table-card">
          <div class="sd-accounts-table-title">All Accounts</div>
          <div class="sd-accounts-table-wrapper">
            <table class="sd-accounts-table">
              <thead>
                <tr>
                  <th>COMPANY</th>
                  <th>INDUSTRY</th>
                  <th>CONTACTS</th>
                  <th>OPEN TICKETS</th>
                  <th>PLAN</th>
                  <th>SINCE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                ${accounts.map(acc => {
                  const matchedContacts = contacts.filter(c => 
                    (c.spocName && c.spocName.toLowerCase().includes(acc.companyName.toLowerCase())) ||
                    (c.companyName && c.companyName.toLowerCase().includes(acc.companyName.toLowerCase())) ||
                    (acc.companyName && acc.companyName.toLowerCase().includes(c.spocName.toLowerCase())) ||
                    (acc.companyName && acc.companyName.toLowerCase().includes(c.companyName.toLowerCase()))
                  );
                  const contactsCount = Math.max(1, matchedContacts.length);

                  const clientTickets = tickets.filter(t => 
                    (t.client && t.client.toLowerCase().includes(acc.companyName.toLowerCase())) ||
                    (t.client && acc.companyName.toLowerCase().includes(t.client.toLowerCase())) ||
                    matchedContacts.some(c => t.client && (t.client.toLowerCase().includes(c.companyName.toLowerCase()) || t.client.toLowerCase().includes(c.spocName.toLowerCase())))
                  );
                  const openTicketsCount = clientTickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length;

                  let planClass = 'badge-basic';
                  if (acc.plan.toLowerCase() === 'premium') planClass = 'badge-premium';
                  else if (acc.plan.toLowerCase() === 'standard') planClass = 'badge-standard';

                  return `
                    <tr>
                      <td class="td-company">${acc.companyName}</td>
                      <td>${acc.industry}</td>
                      <td>${contactsCount}</td>
                      <td>
                        <span class="sd-acc-ticket-badge">${openTicketsCount}</span>
                      </td>
                      <td>
                        <span class="sd-acc-plan-badge ${planClass}">${acc.plan}</span>
                      </td>
                      <td>${acc.since}</td>
                      <td>
                        <div style="display:flex; gap:6px;">
                          <button class="sd-btn sd-btn--ghost sd-btn--sm btn-view-account" data-id="${acc.companyName}" style="padding:4px 8px; font-size:0.8rem;" title="View Detail">👁️</button>
                          <button class="sd-btn sd-btn--ghost sd-btn--sm btn-edit-account" data-id="${acc.companyName}" style="padding:4px 8px; font-size:0.8rem;" title="Edit">✏️</button>
                          <button class="sd-btn sd-btn--ghost sd-btn--sm btn-delete-account" data-id="${acc.companyName}" style="padding:4px 8px; font-size:0.8rem; color:var(--sd-red)" title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const newAccountBtn = document.getElementById('sd-btn-new-account');
    if (newAccountBtn) {
      newAccountBtn.onclick = () => openNewAccountModal();
    }

    container.querySelectorAll('.btn-view-account').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const acc = accounts.find(a => a.companyName === btn.dataset.id);
        if (acc) {
          openViewDetailModal('Account Details', {
            'Company Name': acc.companyName,
            'Industry': acc.industry,
            'Service Plan': acc.plan,
            'Customer Since': acc.since
          });
        }
      };
    });

    container.querySelectorAll('.btn-edit-account').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const acc = accounts.find(a => a.companyName === btn.dataset.id);
        if (acc) {
          editingAccountId = acc.companyName;
          document.getElementById('sd-na-company-name').value = acc.companyName;
          document.getElementById('sd-na-industry').value = acc.industry;
          document.getElementById('sd-na-plan').value = acc.plan;
          
          const title = document.querySelector('#sd-new-account-modal h2');
          if (title) title.textContent = 'Edit Account';
          const saveBtn = document.getElementById('sd-btn-create-account');
          if (saveBtn) saveBtn.textContent = 'Save Changes';
          
          openNewAccountModal();
        }
      };
    });

    container.querySelectorAll('.btn-delete-account').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const acc = accounts.find(a => a.companyName === btn.dataset.id);
        if (acc && confirm(`Are you sure you want to delete account "${acc.companyName}"?`)) {
          let custom = getCustomAccounts();
          custom = custom.filter(a => a.companyName !== acc.companyName);
          localStorage.setItem('sd-custom-accounts', JSON.stringify(custom));
          showToast('Account deleted successfully!');
          refreshAll();
        }
      };
    });
  }

  function openNewAccountModal() {
    const modal = document.getElementById('sd-new-account-modal');
    if (modal) modal.classList.add('is-open');
  }

  function closeNewAccountModal(force = false) {
    if (!force) {
      const name = document.getElementById('sd-na-company-name').value;
      if (name && !confirm('Discard unsaved draft?')) return;
    }
    const modal = document.getElementById('sd-new-account-modal');
    if (modal) modal.classList.remove('is-open');

    ['sd-na-company-name', 'sd-na-industry'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const title = document.querySelector('#sd-new-account-modal h2');
    if (title) title.textContent = 'Create New Account';
    const saveBtn = document.getElementById('sd-btn-create-account');
    if (saveBtn) saveBtn.textContent = 'Create Account';
    editingAccountId = null;
  }

  function createAccount() {
    const companyName = document.getElementById('sd-na-company-name').value.trim();
    const industry = document.getElementById('sd-na-industry').value.trim();
    const plan = document.getElementById('sd-na-plan').value;

    if (!companyName || !industry) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const since = `${months[now.getMonth()]} ${now.getFullYear()}`;

    if (editingAccountId) {
      // Edit existing
      let custom = getCustomAccounts();
      const idx = custom.findIndex(a => a.companyName === editingAccountId);
      const updatedAccount = {
        companyName,
        industry,
        plan,
        since: custom[idx] ? custom[idx].since : since
      };
      if (idx !== -1) {
        custom[idx] = updatedAccount;
      } else {
        custom.push(updatedAccount);
      }
      localStorage.setItem('sd-custom-accounts', JSON.stringify(custom));
      showToast('Account updated successfully!');
      editingAccountId = null;
    } else {
      // Create new
      const newAccount = {
        companyName,
        industry,
        plan,
        since
      };
      saveCustomAccount(newAccount);
      showToast('Account created successfully!');
    }

    closeNewAccountModal(true);
    refreshAll();
  }

  const defaultActivities = [
    {
      id: 'act-1',
      type: 'call',
      title: 'Follow-up call — TechStart Inc (Billing Issue)',
      ticket: 'TKT-002004',
      agent: 'Sarah M.',
      detail: 'Outbound call',
      timeStr: 'Today, 10:30 AM',
      duration: '18m 42s'
    },
    {
      id: 'act-2',
      type: 'task',
      title: 'Review invoice INV-0042 discrepancy',
      ticket: 'TKT-002004',
      agent: 'James K.',
      detail: 'Task',
      timeStr: 'Today, 09:15 AM',
      duration: '45m 00s'
    },
    {
      id: 'act-3',
      type: 'time',
      title: 'Time logged on Internal Task (TKT-001005)',
      ticket: 'TKT-001005',
      agent: 'Admin User',
      detail: 'Time Entry',
      timeStr: 'Yesterday, 4:00 PM',
      duration: '1h 20m'
    },
    {
      id: 'act-4',
      type: 'email',
      title: 'Email sent to Ptron re: support ticket',
      ticket: 'TKT-001005',
      agent: 'Sarah M.',
      detail: 'Email',
      timeStr: 'Yesterday, 2:15 PM',
      duration: '—'
    }
  ];

  let activities = [];

  function getCustomActivities() {
    try {
      return JSON.parse(localStorage.getItem('sd-custom-activities') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveCustomActivity(newActivity) {
    const list = getCustomActivities();
    list.unshift(newActivity);
    localStorage.setItem('sd-custom-activities', JSON.stringify(list));
  }

  function loadActivities() {
    activities = [...getCustomActivities(), ...defaultActivities];
  }

  function renderActivitiesSection() {
    const container = document.getElementById('sd-activities-section');
    if (!container) return;

    loadActivities();

    let totalSecs = 3 * 3600 + 42 * 60;
    let tasksDue = 4;
    let callsToday = 2;
    let completedCount = 7;

    getCustomActivities().forEach(act => {
      if (act.timeStr.includes('Today')) {
        if (act.type === 'call') callsToday++;
        if (act.type === 'task') tasksDue++;
        
        if (act.duration && act.duration !== '—') {
          const matchH = act.duration.match(/(\d+)h/);
          const matchM = act.duration.match(/(\d+)m/);
          const matchS = act.duration.match(/(\d+)s/);
          let secs = 0;
          if (matchH) secs += parseInt(matchH[1]) * 3600;
          if (matchM) secs += parseInt(matchM[1]) * 60;
          if (matchS) secs += parseInt(matchS[1]);
          totalSecs += secs;
        }
      }
    });

    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const timeLoggedStr = `${hours}h ${mins}m`;

    container.innerHTML = `
      <div class="sd-activities-container">
        <div class="sd-activities-header">
          <div class="sd-activities-header-left">
            <h1 class="sd-activities-title">Activities</h1>
            <p class="sd-activities-subtitle">Calls, tasks, time logs and events</p>
          </div>
          <div class="sd-activities-header-right">
            <button id="sd-btn-log-call" class="sd-btn sd-btn--secondary">
              <span class="btn-icon">📞</span> Log Call
            </button>
            <button id="sd-btn-add-task" class="sd-btn sd-btn--secondary">
              <span class="btn-icon">✅</span> Add Task
            </button>
            <button id="sd-btn-new-event" class="sd-btn sd-btn--primary">
              + New Event
            </button>
          </div>
        </div>

        <!-- KPI Cards Row -->
        <div class="sd-cstats-row">
          <div class="sd-cstat-card">
            <span class="sd-cstat-label">TIME LOGGED TODAY</span>
            <span class="sd-cstat-value text-purple">${timeLoggedStr}</span>
          </div>
          <div class="sd-cstat-card">
            <span class="sd-cstat-label">TASKS DUE</span>
            <span class="sd-cstat-value">${tasksDue}</span>
          </div>
          <div class="sd-cstat-card">
            <span class="sd-cstat-label">CALLS TODAY</span>
            <span class="sd-cstat-value text-orange">${callsToday}</span>
          </div>
          <div class="sd-cstat-card">
            <span class="sd-cstat-label">COMPLETED</span>
            <span class="sd-cstat-value text-green">${completedCount}</span>
          </div>
        </div>

        <!-- Activities List -->
        <div class="sd-activities-list">
          ${activities.map(act => {
            let icon = '📞';
            let iconClass = 'icon-call';
            if (act.type === 'task') {
              icon = '✅';
              iconClass = 'icon-task';
            } else if (act.type === 'time') {
              icon = '⏱️';
              iconClass = 'icon-time';
            } else if (act.type === 'email') {
              icon = '✉️';
              iconClass = 'icon-email';
            } else if (act.type === 'event') {
              icon = '📅';
              iconClass = 'icon-event';
            }

            return `
              <div class="sd-activity-card">
                <div class="sd-activity-card-left">
                  <div class="sd-activity-icon ${iconClass}">${icon}</div>
                  <div class="sd-activity-meta">
                    <div class="sd-activity-title">${act.title}</div>
                    <div class="sd-activity-subtitle">${act.ticket} · ${act.agent} · ${act.detail}</div>
                  </div>
                </div>
                <div class="sd-activity-card-right" style="display:flex; flex-direction:column; align-items:flex-end;">
                  <div class="sd-activity-time">${act.timeStr}</div>
                  <div class="sd-activity-duration ${act.duration !== '—' ? 'text-purple' : 'text-muted'}">${act.duration}</div>
                  <div style="display:flex; gap:6px; margin-top:8px;">
                    <button class="sd-btn sd-btn--ghost sd-btn--sm btn-view-activity" data-id="${act.id}" style="padding:2px 6px; font-size:0.75rem;" title="View Detail">👁️</button>
                    <button class="sd-btn sd-btn--ghost sd-btn--sm btn-edit-activity" data-id="${act.id}" style="padding:2px 6px; font-size:0.75rem;" title="Edit">✏️</button>
                    <button class="sd-btn sd-btn--ghost sd-btn--sm btn-delete-activity" data-id="${act.id}" style="padding:2px 6px; font-size:0.75rem; color:var(--sd-red)" title="Delete">🗑️</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const logCallBtn = document.getElementById('sd-btn-log-call');
    if (logCallBtn) logCallBtn.onclick = () => openActivityModal('call');

    const addTaskBtn = document.getElementById('sd-btn-add-task');
    if (addTaskBtn) addTaskBtn.onclick = () => openActivityModal('task');

    const newEventBtn = document.getElementById('sd-btn-new-event');
    if (newEventBtn) newEventBtn.onclick = () => openActivityModal('event');

    container.querySelectorAll('.btn-view-activity').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const act = activities.find(a => a.id === btn.dataset.id);
        if (act) {
          openViewDetailModal('Activity Details', {
            'Type': act.type.toUpperCase(),
            'Description': act.title,
            'Ticket Association': act.ticket,
            'Agent': act.agent,
            'Details': act.detail,
            'Time Logged': act.timeStr,
            'Duration': act.duration
          });
        }
      };
    });

    container.querySelectorAll('.btn-edit-activity').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const act = activities.find(a => a.id === btn.dataset.id);
        if (act) {
          editingActivityId = act.id;
          openActivityModal(act.type);
          
          document.getElementById('sd-act-title').value = act.title;
          document.getElementById('sd-act-ticket').value = act.ticket;
          document.getElementById('sd-act-detail').value = act.detail;
          document.getElementById('sd-act-duration').value = act.duration === '—' ? '' : act.duration;
          document.getElementById('sd-act-agent').value = act.agent;

          // Parse and sync Hours/Minutes dropdowns
          let hVal = 0;
          let mVal = 0;
          if (act.duration && act.duration !== '—') {
            const matchH = act.duration.match(/(\d+)\s*h/i);
            const matchM = act.duration.match(/(\d+)\s*m/i);
            if (matchH) hVal = parseInt(matchH[1]) || 0;
            if (matchM) mVal = parseInt(matchM[1]) || 0;
            if (!matchH && !matchM && /^\d+$/.test(act.duration.trim())) {
              const totalMin = parseInt(act.duration.trim()) || 0;
              hVal = Math.floor(totalMin / 60);
              mVal = totalMin % 60;
            }
          }
          const hSelect = document.getElementById('sd-act-hours');
          const mSelect = document.getElementById('sd-act-minutes');
          if (hSelect) hSelect.value = hVal;
          if (mSelect) mSelect.value = mVal;
          
          const modalTitle = document.getElementById('sd-act-modal-title');
          if (modalTitle) modalTitle.textContent = `Edit ${act.type.toUpperCase()}`;
          const saveBtn = document.getElementById('sd-btn-save-activity');
          if (saveBtn) saveBtn.textContent = 'Save Changes';
        }
      };
    });

    container.querySelectorAll('.btn-delete-activity').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const act = activities.find(a => a.id === btn.dataset.id);
        if (act && confirm(`Are you sure you want to delete activity "${act.title}"?`)) {
          let custom = getCustomActivities();
          custom = custom.filter(a => a.id !== act.id);
          localStorage.setItem('sd-custom-activities', JSON.stringify(custom));
          showToast('Activity deleted successfully!');
          refreshAll();
        }
      };
    });
  }

  function openActivityModal(type) {
    const modal = document.getElementById('sd-activity-modal');
    if (!modal) return;

    const titleEl = document.getElementById('sd-act-modal-title');
    const typeInput = document.getElementById('sd-act-type');
    const detailLabel = document.getElementById('sd-act-detail-label');
    const detailInput = document.getElementById('sd-act-detail');
    const durationInput = document.getElementById('sd-act-duration');

    typeInput.value = type;

    document.getElementById('sd-act-title').value = '';
    detailInput.value = '';
    durationInput.value = '';

    // Reset dropdowns
    const hSelect = document.getElementById('sd-act-hours');
    const mSelect = document.getElementById('sd-act-minutes');
    if (hSelect) hSelect.value = '0';
    if (mSelect) mSelect.value = '0';

    const ticketSelect = document.getElementById('sd-act-ticket');
    if (ticketSelect) {
      ticketSelect.innerHTML = '<option value="General">General (No Ticket)</option>' + 
        tickets.map(t => `<option value="${t.id}">${t.id} - ${t.subject}</option>`).join('');
    }

    const agentSelect = document.getElementById('sd-act-agent');
    if (agentSelect) {
      agentSelect.innerHTML = activeMembers.map(m => `<option value="${m.fullName}">${m.fullName}</option>`).join('');
    }

    if (type === 'call') {
      titleEl.textContent = 'Log Call';
      detailLabel.textContent = 'Call Type';
      detailInput.placeholder = 'e.g. Outbound call, Inbound call';
      detailInput.value = 'Outbound call';
    } else if (type === 'task') {
      titleEl.textContent = 'Add Task';
      detailLabel.textContent = 'Task Category';
      detailInput.placeholder = 'e.g. Task, Verification, Setup';
      detailInput.value = 'Task';
    } else if (type === 'event') {
      titleEl.textContent = 'New Event';
      detailLabel.textContent = 'Event Type';
      detailInput.placeholder = 'e.g. Meeting, Call, Webinar';
      detailInput.value = 'Event';
    }

    modal.classList.add('is-open');
  }

  function closeActivityModal(force = false) {
    if (!force) {
      const subject = document.getElementById('sd-act-title').value;
      if (subject && !confirm('Discard unsaved draft?')) return;
    }
    const modal = document.getElementById('sd-activity-modal');
    if (modal) modal.classList.remove('is-open');

    // Reset modal title and button
    const titleEl = document.getElementById('sd-act-modal-title');
    if (titleEl) titleEl.textContent = 'Log Call';
    const saveBtn = document.getElementById('sd-btn-save-activity');
    if (saveBtn) saveBtn.textContent = 'Save';
    editingActivityId = null;
  }

  function saveActivity() {
    const type = document.getElementById('sd-act-type').value;
    const title = document.getElementById('sd-act-title').value.trim();
    const ticket = document.getElementById('sd-act-ticket').value;
    const detail = document.getElementById('sd-act-detail').value.trim();
    const duration = document.getElementById('sd-act-duration').value.trim() || '—';
    const agent = document.getElementById('sd-act-agent').value;

    if (!title) {
      showToast('Please enter a subject / description.', 'error');
      return;
    }

    if (editingActivityId) {
      // Edit existing
      let custom = getCustomActivities();
      const idx = custom.findIndex(a => a.id === editingActivityId);
      const updatedActivity = {
        id: editingActivityId,
        type,
        title,
        ticket,
        agent,
        detail,
        timeStr: custom[idx] ? custom[idx].timeStr : 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        duration
      };
      if (idx !== -1) {
        custom[idx] = updatedActivity;
      } else {
        custom.push(updatedActivity);
      }
      localStorage.setItem('sd-custom-activities', JSON.stringify(custom));
      showToast('Activity updated successfully!');
      editingActivityId = null;
    } else {
      // Create new
      const newActivity = {
        id: 'act-local-' + Date.now(),
        type,
        title,
        ticket,
        agent,
        detail,
        timeStr: 'Today, ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        duration
      };
      saveCustomActivity(newActivity);
      showToast('Activity logged successfully!');
    }

    closeActivityModal(true);
    refreshAll();
  }

  const defaultKBArticles = [
    {
      title: 'How to raise a billing dispute',
      category: 'Billing',
      views: 142,
      helpful: '89%',
      status: 'Published',
      author: 'Sarah M.'
    },
    {
      title: 'Understanding your invoice',
      category: 'Billing',
      views: 98,
      helpful: '91%',
      status: 'Published',
      author: 'James K.'
    },
    {
      title: 'How to report a bug',
      category: 'Bug',
      views: 56,
      helpful: '82%',
      status: 'Published',
      author: 'Admin'
    },
    {
      title: 'Drafting escalation guidelines',
      category: 'Setup',
      views: 0,
      helpful: '—',
      status: 'Draft',
      author: 'Admin'
    }
  ];

  let kbArticles = [];

  function getCustomKBArticles() {
    try {
      return JSON.parse(localStorage.getItem('sd-custom-kb') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveCustomKBArticle(newArticle) {
    const list = getCustomKBArticles();
    list.push(newArticle);
    localStorage.setItem('sd-custom-kb', JSON.stringify(list));
  }

  function loadKBArticles() {
    const mergedMap = new Map();
    defaultKBArticles.forEach(a => mergedMap.set(a.title.toLowerCase(), a));
    getCustomKBArticles().forEach(a => mergedMap.set(a.title.toLowerCase(), a));
    kbArticles = Array.from(mergedMap.values());
  }

  function renderKBSection() {
    const container = document.getElementById('sd-kb-section');
    if (!container) return;

    loadKBArticles();

    container.innerHTML = `
      <div class="sd-accounts-container">
        <div class="sd-accounts-header">
          <div class="sd-accounts-header-left">
            <h1 class="sd-accounts-title">Knowledge Base</h1>
            <p class="sd-accounts-subtitle">Articles, FAQs and guides</p>
          </div>
          <button id="sd-btn-new-article" class="sd-btn sd-btn--primary">+ New Article</button>
        </div>
        
        <!-- Table Card -->
        <div class="sd-accounts-table-card">
          <div class="sd-accounts-table-title">Published Articles</div>
          <div class="sd-accounts-table-wrapper">
            <table class="sd-accounts-table">
              <thead>
                <tr>
                  <th>TITLE</th>
                  <th>CATEGORY</th>
                  <th>VIEWS</th>
                  <th>HELPFUL</th>
                  <th>STATUS</th>
                  <th>AUTHOR</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                ${kbArticles.map(art => {
                  let statusClass = 'badge-basic';
                  if (art.status.toLowerCase() === 'published') statusClass = 'badge-premium';
                  else if (art.status.toLowerCase() === 'draft') statusClass = 'badge-standard';

                  return `
                    <tr>
                      <td class="td-company">${art.title}</td>
                      <td>${art.category}</td>
                      <td>${art.views}</td>
                      <td>${art.helpful}</td>
                      <td>
                        <span class="sd-acc-plan-badge ${statusClass}">${art.status}</span>
                      </td>
                      <td>${art.author}</td>
                      <td>
                        <div style="display:flex; gap:6px;">
                          <button class="sd-btn sd-btn--ghost sd-btn--sm btn-view-article" data-id="${art.title}" style="padding:4px 8px; font-size:0.8rem;" title="View Detail">👁️</button>
                          <button class="sd-btn sd-btn--ghost sd-btn--sm btn-edit-article" data-id="${art.title}" style="padding:4px 8px; font-size:0.8rem;" title="Edit">✏️</button>
                          <button class="sd-btn sd-btn--ghost sd-btn--sm btn-delete-article" data-id="${art.title}" style="padding:4px 8px; font-size:0.8rem; color:var(--sd-red)" title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const newArticleBtn = document.getElementById('sd-btn-new-article');
    if (newArticleBtn) {
      newArticleBtn.onclick = () => openNewArticleModal();
    }

    container.querySelectorAll('.btn-view-article').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const art = kbArticles.find(a => a.title === btn.dataset.id);
        if (art) {
          openViewDetailModal('Article Details', {
            'Title': art.title,
            'Category': art.category,
            'Views': art.views,
            'Helpful Rating': art.helpful,
            'Status': art.status,
            'Author': art.author
          });
        }
      };
    });

    container.querySelectorAll('.btn-edit-article').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const art = kbArticles.find(a => a.title === btn.dataset.id);
        if (art) {
          editingArticleTitle = art.title;
          document.getElementById('sd-na-title').value = art.title;
          document.getElementById('sd-na-category').value = art.category;
          document.getElementById('sd-na-status').value = art.status;
          
          const title = document.querySelector('#sd-new-article-modal h2');
          if (title) title.textContent = 'Edit Article';
          const saveBtn = document.getElementById('sd-btn-create-article');
          if (saveBtn) saveBtn.textContent = 'Save Changes';
          
          openNewArticleModal();
        }
      };
    });

    container.querySelectorAll('.btn-delete-article').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const art = kbArticles.find(a => a.title === btn.dataset.id);
        if (art && confirm(`Are you sure you want to delete article "${art.title}"?`)) {
          let custom = getCustomKBArticles();
          custom = custom.filter(a => a.title !== art.title);
          localStorage.setItem('sd-custom-kb', JSON.stringify(custom));
          showToast('Article deleted successfully!');
          refreshAll();
        }
      };
    });
  }

  function openNewArticleModal() {
    const modal = document.getElementById('sd-new-article-modal');
    if (modal) modal.classList.add('is-open');
  }

  function closeNewArticleModal(force = false) {
    if (!force) {
      const title = document.getElementById('sd-na-title').value;
      if (title && !confirm('Discard unsaved draft?')) return;
    }
    const modal = document.getElementById('sd-new-article-modal');
    if (modal) modal.classList.remove('is-open');

    ['sd-na-title', 'sd-na-category'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const title = document.querySelector('#sd-new-article-modal h2');
    if (title) title.textContent = 'Create New Article';
    const saveBtn = document.getElementById('sd-btn-create-article');
    if (saveBtn) saveBtn.textContent = 'Create Article';
    editingArticleTitle = null;
  }

  function createArticle() {
    const title = document.getElementById('sd-na-title').value.trim();
    const category = document.getElementById('sd-na-category').value.trim();
    const status = document.getElementById('sd-na-status').value;

    if (!title || !category) {
      showToast('Please fill all required fields.', 'error');
      return;
    }

    if (editingArticleTitle) {
      // Edit existing
      let custom = getCustomKBArticles();
      const idx = custom.findIndex(a => a.title.toLowerCase() === editingArticleTitle.toLowerCase());
      const updatedArticle = {
        title,
        category,
        views: custom[idx] ? custom[idx].views : 0,
        helpful: custom[idx] ? custom[idx].helpful : '—',
        status,
        author: custom[idx] ? custom[idx].author : (window.currentUser && window.currentUser.fullName || 'Admin')
      };
      if (idx !== -1) {
        custom[idx] = updatedArticle;
      } else {
        custom.push(updatedArticle);
      }
      localStorage.setItem('sd-custom-kb', JSON.stringify(custom));
      showToast('Article updated successfully!');
      editingArticleTitle = null;
    } else {
      // Create new
      const newArticle = {
        title,
        category,
        views: 0,
        helpful: '—',
        status,
        author: window.currentUser && window.currentUser.fullName || 'Admin'
      };
      saveCustomKBArticle(newArticle);
      showToast('Article created successfully!');
    }

    closeNewArticleModal(true);
    refreshAll();
  }

  function renderReportsSection() {
    const container = document.getElementById('sd-reports-section');
    if (!container) return;

    const openCount = tickets.filter(t => t.status === 'open').length;
    const pendingCount = tickets.filter(t => t.status === 'pending').length;
    const overdueCount = tickets.filter(t => t.status === 'overdue' || t.sla === 'breached').length;
    const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const totalCount = tickets.length;
    const inProgressCount = tickets.filter(t => t.status === 'inprogress').length;

    const csatPercent = totalCount > 0 ? Math.round(((resolvedCount + 1) / (totalCount + 1)) * 100) : 94;

    const openPct = totalCount > 0 ? (openCount / totalCount) * 100 : 60;
    const pendingPct = totalCount > 0 ? (pendingCount / totalCount) * 100 : 20;
    const overduePct = totalCount > 0 ? (overdueCount / totalCount) * 100 : 20;

    const stop1 = openPct;
    const stop2 = stop1 + pendingPct;
    const stop3 = stop2 + overduePct;

    const donutGradient = `conic-gradient(var(--sd-purple) 0% ${stop1}%, var(--sd-yellow) ${stop1}% ${stop2}%, var(--sd-red) ${stop2}% 100%)`;

    container.innerHTML = `
      <div class="sd-reports-container">
        <div class="sd-reports-header">
          <div class="sd-reports-header-left">
            <h1 class="sd-reports-title">Reports & Analytics</h1>
            <p class="sd-reports-subtitle">Team performance and ticket insights</p>
          </div>
          <div class="sd-reports-header-right">
            <button id="sd-btn-export-reports" class="sd-btn sd-btn--secondary">
              <span class="btn-icon">📥</span> Export
            </button>
            <button class="sd-btn sd-btn--secondary">
              <span class="btn-icon">📅</span> This Week
            </button>
          </div>
        </div>

        <!-- Ticket Summary Stats Grid -->
        <div class="sd-stats-grid" style="margin-bottom: 28px;">
          <div class="sd-stat-card purple" data-filter="all">
            <div id="sd-stat-total" class="sd-stat-value">${totalCount}</div>
            <div class="sd-stat-label">Total Volume</div>
          </div>
          <div class="sd-stat-card yellow" data-filter="open">
            <div id="sd-stat-open" class="sd-stat-value">${openCount}</div>
            <div class="sd-stat-label">Open</div>
          </div>
          <div class="sd-stat-card green" data-filter="resolved">
            <div id="sd-stat-resolved" class="sd-stat-value">${resolvedCount}</div>
            <div class="sd-stat-label">Resolved</div>
          </div>
          <div class="sd-stat-card red" data-filter="overdue">
            <div id="sd-stat-overdue" class="sd-stat-value">${overdueCount}</div>
            <div class="sd-stat-label">Overdue</div>
          </div>
          <div class="sd-stat-card purple" data-filter="inprogress">
            <div id="sd-stat-inprogress" class="sd-stat-value">${inProgressCount}</div>
            <div class="sd-stat-label">In Progress</div>
          </div>
        </div>

        <!-- KPI Cards Row -->
        <div class="sd-cstats-row">
          <div class="sd-cstat-card">
            <span class="sd-cstat-label">AVG RESOLUTION</span>
            <span class="sd-cstat-value text-green">4.2h</span>
            <span class="sd-cstat-sub">↓ 12% vs last week</span>
          </div>
          <div class="sd-cstat-card">
            <span class="sd-cstat-label">CSAT SCORE</span>
            <span class="sd-cstat-value text-purple">${Math.max(90, csatPercent)}%</span>
            <span class="sd-cstat-sub">↑ 3% vs last week</span>
          </div>
          <div class="sd-cstat-card">
            <span class="sd-cstat-label">FIRST RESPONSE</span>
            <span class="sd-cstat-value text-orange">22m</span>
            <span class="sd-cstat-sub">SLA: 30m</span>
          </div>
          <div class="sd-cstat-card">
            <span class="sd-cstat-label">TOTAL TIME LOGGED</span>
            <span class="sd-cstat-value">24h</span>
            <span class="sd-cstat-sub">This week</span>
          </div>
        </div>

        <!-- Charts Grid -->
        <div class="sd-reports-charts-grid">
          <!-- Tickets by Day Bar Chart -->
          <div class="sd-reports-chart-card">
            <div class="sd-chart-title">Tickets by Day (This Week)</div>
            <div class="sd-bar-chart-container">
              <div class="sd-weekly-bars">
                <div class="sd-bar-col">
                  <span class="sd-bar-val">3</span>
                  <div class="sd-bar" style="height: 37%"></div>
                  <span class="sd-bar-label">Mon</span>
                </div>
                <div class="sd-bar-col">
                  <span class="sd-bar-val">7</span>
                  <div class="sd-bar" style="height: 87%"></div>
                  <span class="sd-bar-label">Tue</span>
                </div>
                <div class="sd-bar-col">
                  <span class="sd-bar-val">5</span>
                  <div class="sd-bar" style="height: 62%"></div>
                  <span class="sd-bar-label">Wed</span>
                </div>
                <div class="sd-bar-col">
                  <span class="sd-bar-val">2</span>
                  <div class="sd-bar" style="height: 25%"></div>
                  <span class="sd-bar-label">Thu</span>
                </div>
                <div class="sd-bar-col">
                  <span class="sd-bar-val">8</span>
                  <div class="sd-bar sd-bar--active" style="height: 100%"></div>
                  <span class="sd-bar-label">Fri</span>
                </div>
                <div class="sd-bar-col">
                  <span class="sd-bar-val">1</span>
                  <div class="sd-bar" style="height: 12%"></div>
                  <span class="sd-bar-label">Sat</span>
                </div>
                <div class="sd-bar-col">
                  <span class="sd-bar-val">4</span>
                  <div class="sd-bar" style="height: 50%"></div>
                  <span class="sd-bar-label">Sun</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Ticket Status Distribution Donut Chart -->
          <div class="sd-reports-chart-card">
            <div class="sd-chart-title">Ticket Status Distribution</div>
            <div class="sd-donut-chart-container">
              <div class="sd-donut-wrapper">
                <div class="sd-donut-chart" style="background: ${donutGradient}">
                  <div class="sd-donut-hole"></div>
                </div>
              </div>
              <div class="sd-donut-legend">
                <div class="sd-legend-item">
                  <span class="sd-legend-dot" style="background: var(--sd-purple)"></span>
                  <span class="sd-legend-label">Open — ${openCount}</span>
                </div>
                <div class="sd-legend-item">
                  <span class="sd-legend-dot" style="background: var(--sd-yellow)"></span>
                  <span class="sd-legend-label">Pending — ${pendingCount}</span>
                </div>
                <div class="sd-legend-item">
                  <span class="sd-legend-dot" style="background: var(--sd-red)"></span>
                  <span class="sd-legend-label">Overdue — ${overdueCount}</span>
                </div>
                <div class="sd-legend-item">
                  <span class="sd-legend-dot" style="background: var(--sd-green)"></span>
                  <span class="sd-legend-label">Resolved — ${resolvedCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Agent Performance Table -->
        <div class="sd-reports-chart-card" style="padding-bottom: 24px">
          <div class="sd-chart-title">Agent Performance</div>
          <div class="sd-accounts-table-wrapper">
            <table class="sd-accounts-table">
              <thead>
                <tr>
                  <th>AGENT</th>
                  <th>RESOLVED TICKETS</th>
                  <th>AVG RESOLUTION TIME</th>
                  <th>SLA ADHERENCE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="display: flex; align-items: center; gap: 10px;">
                    <div class="sd-contact-avatar" style="background: var(--sd-purple); width: 32px; height: 32px; font-size: 0.8rem; line-height: 32px;">SM</div>
                    <span style="font-weight: 700">Sarah M.</span>
                  </td>
                  <td>14</td>
                  <td>3.8h</td>
                  <td>96%</td>
                  <td><span class="sd-contact-tag" style="background: #dcfce7; color: #16a34a; border: none">Excellent</span></td>
                </tr>
                <tr>
                  <td style="display: flex; align-items: center; gap: 10px;">
                    <div class="sd-contact-avatar" style="background: #3b82f6; width: 32px; height: 32px; font-size: 0.8rem; line-height: 32px;">JK</div>
                    <span style="font-weight: 700">James K.</span>
                  </td>
                  <td>10</td>
                  <td>4.5h</td>
                  <td>92%</td>
                  <td><span class="sd-contact-tag" style="background: #fef3c7; color: #d97706; border: none">Good</span></td>
                </tr>
                <tr>
                  <td style="display: flex; align-items: center; gap: 10px;">
                    <div class="sd-contact-avatar" style="background: #10b981; width: 32px; height: 32px; font-size: 0.8rem; line-height: 32px;">AU</div>
                    <span style="font-weight: 700">Admin User</span>
                  </td>
                  <td>6</td>
                  <td>4.9h</td>
                  <td>89%</td>
                  <td><span class="sd-contact-tag" style="background: #f3f4f6; color: #4b5563; border: none">Standard</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const exportBtn = document.getElementById('sd-btn-export-reports');
    if (exportBtn) {
      exportBtn.onclick = () => {
        const modal = document.getElementById('sd-export-reports-modal');
        if (modal) modal.classList.add('is-open');
      };
    }
  }

  function applyFiltersAndSort() {
    let filtered = [...tickets];

    // 1. Sidebar filter
    const titleEl = document.getElementById('sd-table-view-title');
    if (activeSidebarFilter === 'all') {
      if (titleEl) titleEl.textContent = 'All Tickets';
    } else if (activeSidebarFilter === 'closed') {
      filtered = filtered.filter(t => t.status === 'closed');
      if (titleEl) titleEl.textContent = 'Closed Tickets';
    } else if (activeSidebarFilter.startsWith('agent:')) {
      const name = activeSidebarFilter.replace('agent:', '');
      const nameLower = name.toLowerCase();
      const searchName = nameLower.replace('cs_', '').replace('cs-impl ', '');
      filtered = filtered.filter(t => 
        (t.agent || '').toLowerCase().includes(nameLower) || 
        nameLower.includes((t.agent || '').toLowerCase()) ||
        (t.agent || '').toLowerCase().includes(searchName)
      );
      if (titleEl) titleEl.textContent = `Assigned to ${name}`;
    } else if (activeSidebarFilter === 'agent-queue') {
      // Find open or in-progress tickets assigned to the logged-in agent, or unassigned
      const myName = (window.currentUser && window.currentUser.fullName || '').toLowerCase();
      filtered = filtered.filter(t => 
        (t.status === 'open' || t.status === 'inprogress') &&
        (t.agent === 'Unassigned' || (t.agent || '').toLowerCase().includes(myName) || myName.includes((t.agent || '').toLowerCase()))
      );
      if (titleEl) titleEl.textContent = 'Agent Queue';
    } else if (activeSidebarFilter === 'tags') {
      // Offline fallback: show all, but change title
      if (titleEl) titleEl.textContent = 'Tagged Tickets';
    }

    // 2. Status Toolbar filter
    if (activeStatusFilter !== 'all') {
      if (activeStatusFilter === 'overdue') {
        filtered = filtered.filter(t => t.status === 'overdue' || t.sla === 'breached');
      } else {
        filtered = filtered.filter(t => t.status === activeStatusFilter);
      }
    }

    // 3. Priority Toolbar filter
    if (activePriorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority.toLowerCase() === activePriorityFilter);
    }

    // 3.5 Agent Toolbar filter
    if (activeAgentFilter !== 'all') {
      if (activeAgentFilter === 'unassigned') {
        filtered = filtered.filter(t => !t.agent || t.agent === 'Unassigned' || t.agent === '');
      } else {
        const searchName = activeAgentFilter.toLowerCase();
        const fallbackName = searchName.replace('cs_', '').replace('cs-impl ', '');
        filtered = filtered.filter(t => 
          (t.agent || '').toLowerCase().includes(searchName) || 
          searchName.includes((t.agent || '').toLowerCase()) ||
          (t.agent || '').toLowerCase().includes(fallbackName)
        );
      }
    }

    // 4. Text Search
    const searchInput = document.getElementById('sd-ticket-search');
    if (searchInput && searchInput.value.trim()) {
      const query = searchInput.value.toLowerCase().trim();
      filtered = filtered.filter(t => 
        t.id.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.client.toLowerCase().includes(query) ||
        (t.desc && t.desc.toLowerCase().includes(query))
      );
    }

    // 5. Sort
    if (activeSort === 'newest') {
      filtered.sort((a, b) => new Date(b.created) - new Date(a.created));
    } else if (activeSort === 'oldest') {
      filtered.sort((a, b) => new Date(a.created) - new Date(b.created));
    } else if (activeSort === 'priority-desc') {
      const weight = { urgent: 4, high: 3, medium: 2, low: 1 };
      filtered.sort((a, b) => (weight[b.priority.toLowerCase()] || 0) - (weight[a.priority.toLowerCase()] || 0));
    } else if (activeSort === 'priority-asc') {
      const weight = { urgent: 4, high: 3, medium: 2, low: 1 };
      filtered.sort((a, b) => (weight[a.priority.toLowerCase()] || 0) - (weight[b.priority.toLowerCase()] || 0));
    } else if (activeSort === 'sla') {
      const weight = { breached: 4, atrisk: 3, ontrack: 2, notset: 1 };
      filtered.sort((a, b) => (weight[b.sla.toLowerCase()] || 0) - (weight[a.sla.toLowerCase()] || 0));
    }

    renderTickets(filtered);
  }

  function renderTickets(list) {
    const tbody = document.getElementById('sd-ticket-tbody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9"><div class="sd-table-empty">No tickets match active filters.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(t => `
      <tr onclick="SupportDesk.openTicketDetail('${t.id}')">
        <td><span class="sd-ticket-id">${t.id}</span></td>
        <td>
          <div class="sd-ticket-subject">${t.subject}</div>
          <div class="sd-ticket-category">${t.category}</div>
        </td>
        <td>
          <div class="sd-client-name">${t.client}</div>
          <div class="sd-client-sub">${t.clientSub}</div>
        </td>
        <td>${badge(PRIORITY_BADGE, t.priority)}</td>
        <td>${badge(STATUS_BADGE, t.status)}</td>
        <td>
          <div class="sd-agent-cell">
            ${avatar(t.agent)}
            <span>${t.agent}</span>
          </div>
        </td>
        <td>${badge(SLA_BADGE, t.sla)}</td>
        <td><span style="font-size:0.8rem; color:var(--sd-text-muted)">${formatDate(t.created)}</span></td>
        <td>
          <div style="display:flex; gap:6px" onclick="event.stopPropagation()">
            <button class="sd-btn sd-btn--ghost sd-btn--sm" onclick="SupportDesk.openTicketDetail('${t.id}')">👁️ View</button>
            ${t.status !== 'resolved' && t.status !== 'closed' ? `
              <button class="sd-btn sd-btn--secondary sd-btn--sm" style="color:var(--sd-green)" onclick="SupportDesk.quickResolve('${t.id}')">✅ Resolve</button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  }

  function updateCounts() {
    const stats = {
      all: tickets.length,
      closed: tickets.filter(t => t.status === 'closed').length,
      anita: tickets.filter(t => (t.agent || '').toLowerCase().includes('anita')).length,
      anand: tickets.filter(t => (t.agent || '').toLowerCase().includes('anand')).length,
      arin: tickets.filter(t => (t.agent || '').toLowerCase().includes('arin')).length,
      gourav: tickets.filter(t => (t.agent || '').toLowerCase().includes('gourav')).length,
      harsh: tickets.filter(t => (t.agent || '').toLowerCase().includes('harsh')).length,
      queue: tickets.filter(t => t.status === 'open' || t.status === 'inprogress').length
    };

    // Update left sidebar badges
    Object.keys(stats).forEach(k => {
      const el = document.getElementById(`sd-cnt-${k}`);
      if (el) el.textContent = stats[k];
    });

    // Update dynamic members counts
    activeMembers.forEach(m => {
      const nameLower = m.fullName.toLowerCase();
      const searchName = nameLower.replace('cs_', '').replace('cs-impl ', '');
      const count = tickets.filter(t => 
        (t.agent || '').toLowerCase().includes(nameLower) || 
        nameLower.includes((t.agent || '').toLowerCase()) ||
        (t.agent || '').toLowerCase().includes(searchName)
      ).length;
      
      const el = document.getElementById(`sd-cnt-member-${m._id}`);
      if (el) el.textContent = count;
    });

    // Update main top stats cards (both first tab tickets grid and reports grid)
    const totalCount = tickets.length;
    const openCount = tickets.filter(t => t.status === 'open').length;
    const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
    const overdueCount = tickets.filter(t => t.status === 'overdue' || t.sla === 'breached').length;
    const inprogressCount = tickets.filter(t => t.status === 'inprogress').length;

    // Reports section stats
    setText('sd-stat-total', totalCount);
    setText('sd-stat-open', openCount);
    setText('sd-stat-resolved', resolvedCount);
    setText('sd-stat-overdue', overdueCount);
    setText('sd-stat-inprogress', inprogressCount);

    // Tickets section (first tab) stats
    setText('sd-tkt-stat-total', totalCount);
    setText('sd-tkt-stat-open', openCount);
    setText('sd-tkt-stat-resolved', resolvedCount);
    setText('sd-tkt-stat-overdue', overdueCount);
    setText('sd-tkt-stat-inprogress', inprogressCount);
  }

  function filterTickets(filterVal, clickedEl) {
    if (clickedEl) {
      document.querySelectorAll('.sd-sidebar__item').forEach(i => i.classList.remove('is-active'));
      clickedEl.classList.add('is-active');
    }
    activeSidebarFilter = filterVal;

    // Sync toolbar agent dropdown select
    const toolbarSelect = document.getElementById('sd-toolbar-agent-select');
    if (toolbarSelect) {
      if (filterVal.startsWith('agent:')) {
        const name = filterVal.replace('agent:', '');
        toolbarSelect.value = name;
        activeAgentFilter = name;
      } else {
        toolbarSelect.value = 'all';
        activeAgentFilter = 'all';
      }
    }

    applyFiltersAndSort();
  }

  function searchTickets(q) {
    applyFiltersAndSort();
  }

  async function quickResolve(id) {
    const t = tickets.find(t => t.id === id);
    if (!t) return;
    t.status = 'resolved';
    if (t._id) {
      await api.tickets.update(t._id, { status: 'resolved' });
    }
    showToast(`Ticket ${id} resolved successfully!`);
    await refreshAll();
  }

  async function openTicketDetail(id) {
    currentTicketId = id;
    const t = tickets.find(t => t.id === id);
    if (!t) return;

    let notes = [];
    if (t._id) {
      const res = await api.tickets.get(t._id);
      if (res.ok && res.data && res.data.data) {
        notes = res.data.data.notes || [];
        t.desc = res.data.data.description || '';
      }
    }

    setText('sd-detail-id',    t.id);
    setText('sd-detail-title', t.subject);
    const badgesEl = document.getElementById('sd-detail-badges');
    if (badgesEl) badgesEl.innerHTML = badge(STATUS_BADGE, t.status) + ' ' + badge(PRIORITY_BADGE, t.priority);
    setText('sd-detail-sla',   SLA_LABEL[t.sla] || t.sla);
    setText('sd-conv-client-name', t.client);
    setText('sd-conv-description', t.desc);

    // Render Conversation / Notes dynamically
    const convTab = document.getElementById('sd-conv-tab');
    const externalNotes = notes.filter(n => !n.isInternal);
    if (convTab) {
      convTab.innerHTML = `
        <div class="sd-conv-item">
          <div class="sd-conv-meta">
            <div class="sd-avatar sd-avatar--sm" style="background:var(--sd-purple)">C</div>
            <div>
              <div class="sd-conv-name">${t.client}</div>
              <div class="sd-conv-time">Reported originally</div>
            </div>
          </div>
          <div class="sd-conv-bubble">${t.desc}</div>
        </div>
        ${externalNotes.map(n => `
          <div class="sd-conv-item">
            <div class="sd-conv-meta" style="justify-content: flex-end; flex-direction: row-reverse;">
              <div class="sd-avatar sd-avatar--sm" style="background:var(--sd-purple)">${(n.authorName || 'A').charAt(0)}</div>
              <div style="text-align: right">
                <div class="sd-conv-name">${n.authorName || 'Agent'}</div>
                <div class="sd-conv-time">${new Date(n.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <div class="sd-conv-bubble sd-conv-bubble--reply">${n.content}</div>
          </div>
        `).join('')}
      `;
    }

    const internalTab = document.getElementById('sd-internal-tab');
    const internalNotes = notes.filter(n => n.isInternal);
    if (internalTab) {
      if (internalNotes.length > 0) {
        internalTab.innerHTML = internalNotes.map(n => `
          <div class="sd-conv-item" style="border-left: 3px solid var(--sd-orange); padding-left: 10px; margin-bottom: 12px">
            <div class="sd-conv-meta">
              <div class="sd-avatar sd-avatar--sm" style="background:var(--sd-orange)">${(n.authorName || 'A').charAt(0)}</div>
              <div>
                <div class="sd-conv-name">${n.authorName || 'Agent'}</div>
                <div class="sd-conv-time">${new Date(n.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <div class="sd-conv-bubble" style="background: rgba(249, 115, 22, 0.05);">${n.content}</div>
          </div>
        `).join('');
      } else {
        internalTab.innerHTML = '<div class="sd-empty-state">No internal notes for this ticket.</div>';
      }
    }

    const timelineTab = document.getElementById('sd-timeline-tab');
    if (timelineTab) {
      timelineTab.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; font-size:0.85rem">
          <div style="display:flex; gap:10px">
            <span style="color:var(--sd-green)">🟢</span>
            <span>Ticket created - ${new Date(t.created).toLocaleString()}</span>
          </div>
          ${notes.map(n => `
            <div style="display:flex; gap:10px">
              <span style="color:var(--sd-purple)">💬</span>
              <span>${n.authorName || 'Agent'} added ${n.isInternal ? 'an internal note' : 'a reply'} - ${new Date(n.createdAt).toLocaleString()}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    const modal = document.getElementById('sd-ticket-modal');
    if (modal) modal.classList.add('is-open');

    resetTimer();
    updateTimeLogs();
  }

  function closeTicketDetail(force = false) {
    if (timerId && !force) {
      if (!confirm('You have a running work timer. Close and stop the timer?')) return;
    }
    stopTimer();
    const modal = document.getElementById('sd-ticket-modal');
    if (modal) modal.classList.remove('is-open');
    currentTicketId = null;
  }

  function switchReplyTab(btn, tabId) {
    document.querySelectorAll('.sd-reply-tab').forEach(t => t.classList.remove('is-active'));
    btn.classList.add('is-active');

    document.querySelectorAll('.sd-reply-panel').forEach(p => p.style.display = 'none');
    const target = document.getElementById(tabId);
    if (target) target.style.display = 'block';
  }

  async function sendReply() {
    const txt = document.getElementById('sd-reply-text').value.trim();
    if (!txt) return;

    const activeTab = document.querySelector('.sd-reply-tab.is-active');
    const tabId = activeTab ? activeTab.dataset.tab : 'sd-conv-tab';
    const isInternal = tabId === 'sd-internal-tab';

    const t = tickets.find(x => x.id === currentTicketId);
    if (!t) return;

    if (t._id) {
      const res = await api.tickets.addNote(t._id, {
        content: txt,
        isInternal: isInternal
      });
      if (res.ok) {
        showToast(isInternal ? 'Internal note added' : 'Reply sent successfully');
        document.getElementById('sd-reply-text').value = '';
        await openTicketDetail(currentTicketId);
      } else {
        showToast(res.data.message || 'Failed to send reply', 'error');
      }
    } else {
      // Offline fallback note addition
      showToast(isInternal ? 'Internal note added (Offline)' : 'Reply sent (Offline)');
      document.getElementById('sd-reply-text').value = '';
    }
  }

  // ──────────────────────────────────────────────────────────
  // WORK TIMER WIDGET
  // ──────────────────────────────────────────────────────────
  let timerId = null;
  let elapsedSeconds = 0;
  let timeLogs = JSON.parse(localStorage.getItem('sd-time-logs') || '{}');

  function startTimer() {
    if (timerId) return;
    timerId = setInterval(() => {
      elapsedSeconds++;
      const disp = document.getElementById('sd-timer-display');
      if (disp) disp.textContent = formatTime(elapsedSeconds);
    }, 1000);
    showToast('Work timer started!');
  }

  function stopTimer() {
    if (!timerId) return;
    clearInterval(timerId);
    timerId = null;

    if (elapsedSeconds > 0) {
      const logStr = formatTime(elapsedSeconds);
      if (!timeLogs[currentTicketId]) timeLogs[currentTicketId] = [];
      timeLogs[currentTicketId].push({
        dur: logStr,
        ts: new Date().toISOString()
      });
      localStorage.setItem('sd-time-logs', JSON.stringify(timeLogs));
      updateTimeLogs();
      showToast(`Logged ${logStr} of work time.`);
    }
    elapsedSeconds = 0;
    const disp = document.getElementById('sd-timer-display');
    if (disp) disp.textContent = '00:00:00';
  }

  function resetTimer() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    elapsedSeconds = 0;
    const disp = document.getElementById('sd-timer-display');
    if (disp) disp.textContent = '00:00:00';
  }

  function formatTime(s) {
    const hrs = String(Math.floor(s / 3600)).padStart(2, '0');
    const mins = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const secs = String(s % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }

  function updateTimeLogs() {
    const listEl = document.getElementById('sd-time-log-list');
    if (!listEl) return;
    const logs = timeLogs[currentTicketId] || [];
    if (logs.length === 0) {
      listEl.innerHTML = '<div class="sd-timer-empty">No time logged yet.</div>';
      return;
    }
    listEl.innerHTML = logs.map(l => `
      <div class="sd-timer-log-item">
        <span class="sd-timer-log-dur">⏱️ ${l.dur}</span>
        <span style="font-size:0.75rem; color:var(--sd-text-muted)">${new Date(l.ts).toLocaleTimeString()}</span>
      </div>
    `).join('');
  }

  // ──────────────────────────────────────────────────────────
  // NEW TICKET CREATION MODAL
  // ──────────────────────────────────────────────────────────
  function openNewTicketModal() {
    const modal = document.getElementById('sd-new-ticket-modal');
    if (modal) modal.classList.add('is-open');
  }

  function closeNewTicketModal(force = false) {
    if (!force) {
      const subject = document.getElementById('sd-nt-subject').value;
      if (subject && !confirm('Discard unsaved draft?')) return;
    }
    const modal = document.getElementById('sd-new-ticket-modal');
    if (modal) modal.classList.remove('is-open');

    // Reset fields
    ['sd-nt-subject', 'sd-nt-desc', 'sd-nt-resolution-time'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  async function createTicket() {
    const subject = document.getElementById('sd-nt-subject').value.trim();
    const client = document.getElementById('sd-nt-client').value;
    const category = document.getElementById('sd-nt-category').value;
    const priority = document.getElementById('sd-nt-priority').value.toLowerCase();
    const agent = document.getElementById('sd-nt-agent').value;
    const desc = document.getElementById('sd-nt-desc').value.trim();
    const resolutionTimeVal = document.getElementById('sd-nt-resolution-time').value.trim();

    if (!subject || !client || !category) {
      showToast('Please fill required fields.', 'error');
      return;
    }

    const backendCategory = category.toLowerCase().replace(/ /g, '_');
    const backendData = {
      subject,
      description: desc,
      clientName: client,
      priority: priority === 'urgent' ? 'critical' : priority,
      category: backendCategory,
      assignedToName: agent === 'Unassigned' ? '' : agent,
      status: 'open'
    };

    if (resolutionTimeVal) {
      backendData.resolutionTime = parseInt(resolutionTimeVal, 10);
    }

    const res = await api.tickets.create(backendData);
    if (res.ok) {
      showToast('Ticket created successfully!');
      closeNewTicketModal(true);
      await refreshAll();
    } else {
      showToast(res.data.message || 'Failed to create ticket', 'error');
    }
  }

  // ──────────────────────────────────────────────────────────
  // NAVIGATION & VIEW SWITCHING
  // ──────────────────────────────────────────────────────────
  function switchMainTab(clickedTab, viewId) {
    if (clickedTab) {
      document.querySelectorAll('.sd-topnav__tab').forEach(t => t.classList.remove('is-active'));
      clickedTab.classList.add('is-active');
    } else {
      // Map view ID to tab highlighting
      document.querySelectorAll('.sd-topnav__tab').forEach(t => {
        t.classList.toggle('is-active', t.dataset.view === viewId);
      });
    }

    document.querySelectorAll('.sd-view').forEach(v => v.classList.remove('is-active'));
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('is-active');

    if (viewId === 'sd-contacts-section') {
      renderContactsSection();
    } else if (viewId === 'sd-accounts-section') {
      renderAccountsSection();
    } else if (viewId === 'sd-activities-section') {
      renderActivitiesSection();
    } else if (viewId === 'sd-reports-section') {
      renderReportsSection();
    } else if (viewId === 'sd-kb-section') {
      renderKBSection();
    }
  }

  // ──────────────────────────────────────────────────────────
  // TOAST WRAPPER
  // ──────────────────────────────────────────────────────────
  function showToast(msg, type = 'success') {
    const container = document.getElementById('sd-toast-wrap');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `sd-toast sd-toast--${type}`;
    el.innerHTML = `
      <span>${type === 'success' ? '🔔' : '⚠️'}</span>
      <span>${msg}</span>
    `;
    container.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  // ──────────────────────────────────────────────────────────
  // CLOCK WIDGET
  // ──────────────────────────────────────────────────────────
  function startClock() {
    const el = document.getElementById('sd-clock');
    if (!el) return;
    function update() {
      const now = new Date();
      el.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();
    }
    update();
    if (window._sdClockInterval) clearInterval(window._sdClockInterval);
    window._sdClockInterval = setInterval(update, 1000);
  }

  // ──────────────────────────────────────────────────────────
  // REPORTS VIEW WIDGETS
  // ──────────────────────────────────────────────────────────
  function renderWeeklyBars() {
    const el = document.getElementById('sd-weekly-bars');
    if (!el) return;

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxTickets = Math.max(...days.map((_, i) => (tickets.length * (i + 1)) % 8 + 2), 1);
    
    el.innerHTML = days.map((day, i) => {
      const val = ((tickets.length * (i + 1)) % 8) + 2;
      const heightPercent = Math.round((val / maxTickets) * 80) + 10;
      const isActive = i === new Date().getDay() - 1;
      return `
        <div class="sd-bar-col">
          <span class="sd-bar-val">${val}</span>
          <div class="sd-bar ${isActive ? 'sd-bar--active' : ''}" style="height: ${heightPercent}%"></div>
          <span class="sd-bar-label">${day}</span>
        </div>
      `;
    }).join('');
  }

  // ──────────────────────────────────────────────────────────
  // EVENT WIRING  — called once from init()
  // ──────────────────────────────────────────────────────────
  function wireEvents() {
    document.querySelectorAll('.sd-topnav__tab').forEach(tab => {
      tab.onclick = () => switchMainTab(tab, tab.dataset.view);
    });

    // First tab (Tickets section) stats cards click event delegation
    const ticketsSection = document.getElementById('sd-tickets-section');
    if (ticketsSection) {
      ticketsSection.addEventListener('click', (e) => {
        const card = e.target.closest('.sd-stats-grid .sd-stat-card');
        if (card) {
          const filterVal = card.dataset.filter;
          const statusSelectEl = document.getElementById('sd-toolbar-status-select');
          if (statusSelectEl) {
            const optionExists = Array.from(statusSelectEl.options).some(opt => opt.value === filterVal);
            statusSelectEl.value = optionExists ? filterVal : 'all';
          }
          activeStatusFilter = filterVal;
          applyFiltersAndSort();
        }
      });
    }

    // Export Modal Events
    const exportModal = document.getElementById('sd-export-reports-modal');
    if (exportModal) {
      const radios = exportModal.querySelectorAll('input[name="export-range"]');
      const customDates = document.getElementById('sd-export-custom-dates');
      radios.forEach(radio => {
        radio.addEventListener('change', () => {
          if (customDates) {
            customDates.style.display = (radio.value === 'custom') ? 'flex' : 'none';
          }
        });
      });

      const closeBtns = [
        document.getElementById('sd-btn-close-export-modal'),
        document.getElementById('sd-btn-cancel-export')
      ];
      closeBtns.forEach(btn => {
        if (btn) {
          btn.onclick = () => exportModal.classList.remove('is-open');
        }
      });

      const confirmBtn = document.getElementById('sd-btn-confirm-export');
      if (confirmBtn) {
        confirmBtn.onclick = () => {
          const selectedRadio = exportModal.querySelector('input[name="export-range"]:checked');
          const rangeVal = selectedRadio ? selectedRadio.value : 'week';
          
          if (rangeVal === 'custom') {
            const startVal = document.getElementById('sd-export-start-date').value;
            const endVal = document.getElementById('sd-export-end-date').value;
            if (!startVal || !endVal) {
              showToast('Please select both start and end dates.', 'error');
              return;
            }
            showToast(`Exporting custom report from ${startVal} to ${endVal}...`, 'success');
          } else {
            showToast(`Exporting reports for this ${rangeVal} to CSV...`, 'success');
          }
          exportModal.classList.remove('is-open');
        };
      }
    }

    document.querySelectorAll('.sd-sidebar__item').forEach(item => {
      item.onclick = () => filterTickets(item.dataset.filter, item);
    });

    const statusSelect = document.getElementById('sd-toolbar-status-select');
    if (statusSelect) {
      statusSelect.onchange = (e) => {
        activeStatusFilter = e.target.value;
        applyFiltersAndSort();
      };
    }

    const agentSelect = document.getElementById('sd-toolbar-agent-select');
    if (agentSelect) {
      agentSelect.onchange = (e) => {
        activeAgentFilter = e.target.value;
        applyFiltersAndSort();
      };
    }

    const prioritySelect = document.getElementById('sd-toolbar-priority');
    if (prioritySelect) {
      prioritySelect.onchange = (e) => {
        activePriorityFilter = e.target.value;
        applyFiltersAndSort();
      };
    }

    const sortSelect = document.getElementById('sd-toolbar-sort-select');
    if (sortSelect) {
      sortSelect.onchange = (e) => {
        activeSort = e.target.value;
        applyFiltersAndSort();
      };
    }

    // Handle stats card clicks in Reports section via event delegation
    const reportsSection = document.getElementById('sd-reports-section');
    if (reportsSection) {
      reportsSection.onclick = (e) => {
        const card = e.target.closest('.sd-stat-card');
        if (card) {
          const filterVal = card.dataset.filter;
          // Switch back to Tickets tab
          switchMainTab(null, 'sd-tickets-section');
          // Apply filter
          const statusSelectEl = document.getElementById('sd-toolbar-status-select');
          if (statusSelectEl) {
            const optionExists = Array.from(statusSelectEl.options).some(opt => opt.value === filterVal);
            statusSelectEl.value = optionExists ? filterVal : 'all';
          }
          activeStatusFilter = filterVal;
          applyFiltersAndSort();
        }
      };
    }

    const searchInput = document.getElementById('sd-ticket-search');
    if (searchInput) {
      searchInput.oninput = (e) => searchTickets(e.target.value);
    }

    const closeDetailBtn = document.getElementById('sd-detail-close');
    if (closeDetailBtn) {
      closeDetailBtn.onclick = () => closeTicketDetail();
    }

    document.querySelectorAll('.sd-reply-tab').forEach(btn => {
      btn.onclick = () => switchReplyTab(btn, btn.dataset.tab);
    });

    const sendReplyBtn = document.getElementById('sd-btn-send-reply');
    if (sendReplyBtn) {
      sendReplyBtn.onclick = () => sendReply();
    }

    const replyTextarea = document.getElementById('sd-reply-text');
    if (replyTextarea) {
      replyTextarea.onkeydown = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          sendReply();
        }
      };
    }

    const timerStartBtn = document.getElementById('sd-timer-start-btn');
    if (timerStartBtn) timerStartBtn.onclick = () => startTimer();

    const timerStopBtn = document.getElementById('sd-timer-stop-btn');
    if (timerStopBtn) timerStopBtn.onclick = () => stopTimer();

    const timerResetBtn = document.getElementById('sd-timer-reset-btn');
    if (timerResetBtn) timerResetBtn.onclick = () => resetTimer();

    const btnNewTicket = document.getElementById('sd-btn-new-ticket');
    if (btnNewTicket) btnNewTicket.onclick = () => openNewTicketModal();

    const btnCancelTicket = document.getElementById('sd-btn-cancel-ticket');
    if (btnCancelTicket) btnCancelTicket.onclick = () => closeNewTicketModal();

    const btnCreateTicket = document.getElementById('sd-btn-create-ticket');
    if (btnCreateTicket) btnCreateTicket.onclick = () => createTicket();

    const btnCancelContact = document.getElementById('sd-btn-cancel-contact');
    if (btnCancelContact) btnCancelContact.onclick = () => closeNewContactModal();

    const btnCreateContact = document.getElementById('sd-btn-create-contact');
    if (btnCreateContact) btnCreateContact.onclick = () => createContact();

    const btnCancelAccount = document.getElementById('sd-btn-cancel-account');
    if (btnCancelAccount) btnCancelAccount.onclick = () => closeNewAccountModal();

    const btnCreateAccount = document.getElementById('sd-btn-create-account');
    if (btnCreateAccount) btnCreateAccount.onclick = () => createAccount();

    const btnCancelActivity = document.getElementById('sd-btn-cancel-activity');
    if (btnCancelActivity) btnCancelActivity.onclick = () => closeActivityModal();

    const btnSaveActivity = document.getElementById('sd-btn-save-activity');
    if (btnSaveActivity) btnSaveActivity.onclick = () => saveActivity();

    const btnCancelArticle = document.getElementById('sd-btn-cancel-article');
    if (btnCancelArticle) btnCancelArticle.onclick = () => closeNewArticleModal();

    const btnCreateArticle = document.getElementById('sd-btn-create-article');
    if (btnCreateArticle) btnCreateArticle.onclick = () => createArticle();

    const searchHeaderBtn = document.getElementById('sd-btn-search-header');
    if (searchHeaderBtn) {
      searchHeaderBtn.onclick = () => {
        const searchInput = document.getElementById('sd-ticket-search');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      };
    }

    const notifHeaderBtn = document.getElementById('sd-btn-notif-header');
    if (notifHeaderBtn) {
      notifHeaderBtn.onclick = () => {
        showToast('No new notifications.', 'success');
      };
    }

    const settingsHeaderBtn = document.getElementById('sd-btn-settings-header');
    if (settingsHeaderBtn) {
      settingsHeaderBtn.onclick = () => {
        showToast('Support Desk settings loaded.', 'success');
      };
    }

    const btnCloseView = document.getElementById('sd-btn-close-view');
    if (btnCloseView) {
      btnCloseView.onclick = () => closeViewDetailModal();
    }
  }

  function injectStyles() {
    if (document.getElementById('support-desk-styles')) return;
    const style = document.createElement('style');
    style.id = 'support-desk-styles';
    style.textContent = `
      body {
        --sd-purple: var(--accent);
        --sd-purple-light: var(--accent-dim);
        --sd-green: var(--green);
        --sd-red: var(--red);
        --sd-yellow: var(--yellow);
        --sd-gray-100: var(--bg-card-hover);
        --sd-gray-200: var(--border);
        --sd-gray-400: var(--text-muted);
        --sd-gray-800: var(--bg-surface);
        --sd-gray-900: var(--bg-base);
        
        --sd-bg: var(--bg-base);
        --sd-surface: var(--bg-surface);
        --sd-border: var(--border);
        --sd-text: var(--text-primary);
        --sd-text-muted: var(--text-secondary);
        --sd-bg-dim: var(--bg-card-hover);
      }

      .sd-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        color: var(--sd-text);
        font-family: 'Inter', sans-serif;
        overflow: hidden;
      }

      .topbar-subnav-container {
        display: flex;
        align-items: center;
        margin-left: 12px;
        padding-left: 20px;
        border-left: 1px solid var(--border);
        height: 28px;
      }

      .sd-topnav__tabs {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .sd-topnav__tab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 6px;
        font-weight: 500;
        font-size: 0.85rem;
        border: none;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        white-space: nowrap;
      }

      .sd-topnav__tab:hover {
        color: var(--text-primary);
        background: var(--bg-card-hover);
      }

      .sd-topnav__tab.is-active {
        background: var(--accent-dim);
        color: var(--accent);
        font-weight: 600;
      }

      .sd-tab-icon {
        width: 16px;
        height: 16px;
        stroke: currentColor;
        stroke-width: 2.2px;
        fill: none;
        transition: transform 0.2s ease, stroke 0.2s ease;
      }

      .sd-topnav__tab:hover .sd-tab-icon {
        transform: translateY(-1px);
        stroke: var(--text-primary);
      }

      .sd-topnav__tab.is-active .sd-tab-icon {
        stroke: var(--accent);
      }

      .sd-main-body {
        flex: 1;
        overflow: hidden;
        position: relative;
      }

      .sd-view {
        display: none;
        height: 100%;
        overflow: hidden;
      }

      .sd-view.is-active {
        display: block;
      }

      .sd-view-layout {
        display: flex;
        height: 100%;
      }

      .sd-sidebar {
        width: 240px;
        border-right: 1px solid var(--sd-border);
        background: var(--sd-surface);
        padding: 20px 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex-shrink: 0;
        overflow-y: auto;
      }

      .sd-sidebar__title {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--sd-text-muted);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
        padding-left: 8px;
      }

      .sd-sidebar__item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--sd-text-muted);
        cursor: pointer;
        transition: all 0.2s;
      }

      .sd-sidebar__item:hover, .sd-sidebar__item.is-active {
        background: var(--sd-bg-dim);
        color: var(--sd-text);
      }

      .sd-sidebar__item.is-active {
        color: var(--sd-purple);
        font-weight: 600;
      }

      .sd-sidebar__badge {
        font-size: 0.75rem;
        font-weight: 700;
        background: var(--sd-bg-dim);
        color: var(--sd-text-muted);
        padding: 2px 8px;
        border-radius: 12px;
        border: 1px solid var(--sd-border);
      }

      .sd-content {
        flex: 1;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        overflow-y: auto;
        background: var(--sd-bg);
      }

      .sd-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
      }

      .sd-stat-card {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        padding: 16px 20px;
        border-radius: 12px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .sd-stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }

      .sd-stat-value {
        font-size: 1.8rem;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .sd-stat-label {
        font-size: 0.85rem;
        color: var(--sd-text-muted);
        font-weight: 500;
      }

      .sd-stat-card.purple { border-left: 4px solid var(--sd-purple); }
      .sd-stat-card.yellow { border-left: 4px solid var(--sd-yellow); }
      .sd-stat-card.green { border-left: 4px solid var(--sd-green); }
      .sd-stat-card.red { border-left: 4px solid var(--sd-red); }

      .sd-table-card {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .sd-table-header {
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--sd-border);
      }

      .sd-table-title {
        font-size: 1.1rem;
        font-weight: 700;
      }

      .sd-search-input {
        width: 280px;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--sd-border);
        background: var(--sd-bg-dim);
        color: var(--sd-text);
        font-size: 0.85rem;
        outline: none;
      }

      /* TOOLBAR STYLES */
      .sd-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 20px;
        background: var(--sd-bg-dim);
        border-bottom: 1px solid var(--sd-border);
        gap: 16px;
        flex-wrap: wrap;
      }

      .sd-toolbar-filters {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .sd-toolbar-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--sd-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .sd-toolbar-tabs {
        display: flex;
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        border-radius: 6px;
        padding: 2px;
        gap: 2px;
      }

      .sd-toolbar-btn {
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--sd-text-muted);
        background: transparent;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
      }

      .sd-toolbar-btn:hover {
        color: var(--sd-text);
      }

      .sd-toolbar-btn.is-active {
        background: var(--sd-purple);
        color: white;
      }

      .sd-toolbar-select {
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid var(--sd-border);
        background: var(--sd-surface);
        color: var(--sd-text);
        font-size: 0.8rem;
        font-weight: 600;
        outline: none;
        cursor: pointer;
      }

      .sd-toolbar-select:hover {
        border-color: var(--sd-purple);
      }

      .sd-table-container {
        overflow-x: auto;
      }

      .sd-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
      }

      .sd-table th, .sd-table td {
        padding: 12px 18px;
        border-bottom: 1px solid var(--sd-border);
        font-size: 0.875rem;
      }

      .sd-table th {
        background: var(--sd-bg-dim);
        font-weight: 600;
        color: var(--sd-text-muted);
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.5px;
      }

      .sd-table tbody tr {
        cursor: pointer;
        transition: background 0.15s;
      }

      .sd-table tbody tr:hover {
        background: var(--sd-bg-dim);
      }

      .sd-ticket-id {
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        color: var(--sd-purple);
      }

      .sd-ticket-subject {
        font-weight: 600;
        color: var(--sd-text);
      }

      .sd-ticket-category {
        font-size: 0.75rem;
        color: var(--sd-text-muted);
        text-transform: uppercase;
        margin-top: 2px;
      }

      .sd-client-name {
        font-weight: 500;
      }

      .sd-client-sub {
        font-size: 0.75rem;
        color: var(--sd-text-muted);
        margin-top: 2px;
      }

      .sd-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .sd-badge--open { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
      .sd-badge--pending { background: rgba(234, 179, 8, 0.15); color: #eab308; }
      .sd-badge--overdue { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
      .sd-badge--resolved { background: rgba(16, 185, 129, 0.15); color: #10b981; }
      .sd-badge--closed { background: rgba(156, 163, 175, 0.15); color: #9ca3af; }
      .sd-badge--inprogress { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }

      .sd-badge--low { background: rgba(156, 163, 175, 0.1); color: #9ca3af; }
      .sd-badge--medium { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
      .sd-badge--high { background: rgba(249, 115, 22, 0.1); color: #f97316; }
      .sd-badge--urgent { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

      .sd-badge--ontrack { background: rgba(16, 185, 129, 0.1); color: #10b981; }
      .sd-badge--atrisk { background: rgba(249, 115, 22, 0.1); color: #f97316; }
      .sd-badge--breached { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
      .sd-badge--notset { background: rgba(156, 163, 175, 0.1); color: #9ca3af; }

      .sd-agent-cell {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .sd-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.8rem;
        color: white;
      }

      .sd-avatar--sm {
        width: 24px;
        height: 24px;
        font-size: 0.75rem;
      }

      .sd-avatar--unassigned {
        background: var(--sd-gray-400);
      }

      .sd-btn {
        padding: 8px 16px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .sd-btn--primary {
        background: var(--sd-purple);
        color: white;
      }

      .sd-btn--primary:hover {
        background: #6d28d9;
      }

      .sd-btn--secondary {
        background: var(--sd-bg-dim);
        color: var(--sd-text);
        border: 1px solid var(--sd-border);
      }

      .sd-btn--secondary:hover {
        background: var(--sd-border);
      }

      .sd-btn--ghost {
        background: transparent;
        color: var(--sd-text-muted);
      }

      .sd-btn--ghost:hover {
        background: var(--sd-bg-dim);
        color: var(--sd-text);
      }

      .sd-btn--sm {
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
      }

      .sd-modal-overlay {
        display: none;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        z-index: 1000;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }

      .sd-modal-overlay.is-open {
        display: flex;
      }

      .sd-detail-panel {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        border-radius: 16px;
        width: 100%;
        max-width: 900px;
        height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        animation: sdSlideUp 0.3s ease-out;
      }

      @keyframes sdSlideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .sd-detail-header {
        padding: 20px 24px;
        border-bottom: 1px solid var(--sd-border);
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .sd-detail-id {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.85rem;
        color: var(--sd-purple);
        font-weight: 700;
      }

      .sd-detail-title {
        font-size: 1.4rem;
        font-weight: 700;
        margin-top: 4px;
      }

      .sd-detail-body {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      .sd-detail-main {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .sd-detail-sidebar {
        width: 280px;
        border-left: 1px solid var(--sd-border);
        background: var(--sd-bg-dim);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        overflow-y: auto;
      }

      .sd-sidebar-card {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        padding: 16px;
        border-radius: 12px;
      }

      .sd-sidebar-card h3 {
        font-size: 0.8rem;
        text-transform: uppercase;
        color: var(--sd-text-muted);
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        margin-top: 0;
      }

      .sd-timer-display {
        font-family: 'JetBrains Mono', monospace;
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--sd-purple);
        text-align: center;
        margin: 10px 0;
      }

      .sd-timer-actions {
        display: flex;
        justify-content: center;
        gap: 6px;
      }

      .sd-time-log-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .sd-timer-log-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8rem;
        padding: 6px 8px;
        background: var(--sd-bg-dim);
        border-radius: 6px;
      }

      .sd-timer-log-dur {
        font-weight: 700;
        color: var(--sd-purple);
      }

      .sd-reply-card {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        height: 100%;
      }

      .sd-reply-tabs {
        display: flex;
        border-bottom: 1px solid var(--sd-border);
        background: var(--sd-bg-dim);
      }

      .sd-reply-tab {
        padding: 12px 18px;
        border: none;
        background: transparent;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--sd-text-muted);
        cursor: pointer;
        transition: all 0.2s;
        outline: none;
      }

      .sd-reply-tab.is-active {
        background: var(--sd-surface);
        color: var(--sd-purple);
        border-right: 1px solid var(--sd-border);
        border-left: 1px solid var(--sd-border);
      }

      .sd-reply-tab:first-child.is-active {
        border-left: none;
      }

      .sd-reply-panel {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
      }

      .sd-conv-item {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
      }

      .sd-conv-meta {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .sd-conv-name {
        font-weight: 700;
        font-size: 0.9rem;
      }

      .sd-conv-time {
        font-size: 0.75rem;
        color: var(--sd-text-muted);
      }

      .sd-conv-bubble {
        background: var(--sd-bg-dim);
        padding: 14px 18px;
        border-radius: 12px;
        line-height: 1.6;
        font-size: 0.9rem;
        white-space: pre-wrap;
      }

      .sd-conv-bubble--reply {
        background: rgba(124, 58, 237, 0.08);
        border-left: 3px solid var(--sd-purple);
      }

      .sd-reply-editor {
        padding: 16px;
        border-top: 1px solid var(--sd-border);
        background: var(--sd-bg-dim);
      }

      .sd-reply-editor textarea {
        width: 100%;
        padding: 12px;
        border-radius: 8px;
        border: 1px solid var(--sd-border);
        background: var(--sd-surface);
        color: var(--sd-text);
        font-size: 0.875rem;
        outline: none;
        resize: none;
      }

      .sd-form-card {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        padding: 24px;
        border-radius: 16px;
        width: 100%;
        max-width: 600px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }

      .sd-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .sd-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .sd-field label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--sd-text-muted);
      }

      .sd-field input, .sd-field select, .sd-field textarea {
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid var(--sd-border);
        background: var(--sd-bg-dim);
        color: var(--sd-text);
        font-size: 0.875rem;
        outline: none;
      }

      .sd-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }

      .sd-weekly-bars {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        height: 240px;
        padding: 10px 0;
      }

      .sd-bar-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: 40px;
      }

      .sd-bar-val {
        font-size: 0.75rem;
        font-weight: 700;
      }

      .sd-bar {
        width: 16px;
        background: var(--sd-border);
        border-radius: 8px;
        transition: height 0.3s, background 0.3s;
      }

      .sd-bar--active {
        background: var(--sd-purple);
      }

      .sd-bar-label {
        font-size: 0.75rem;
        color: var(--sd-text-muted);
        font-weight: 600;
      }

      .sd-toast-wrap {
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 1100;
      }

      .sd-toast {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        color: var(--sd-text);
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        font-size: 0.875rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: sdSlideInRight 0.25s ease-out;
        transition: opacity 0.3s;
      }

      @keyframes sdSlideInRight {
        from { transform: translateX(50px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      .sd-toast--success {
        border-left: 4px solid var(--sd-green);
      }

      .sd-toast--error {
        border-left: 4px solid var(--sd-red);
      }

      .sd-empty-state, .sd-timer-empty, .sd-table-empty {
        text-align: center;
        padding: 24px;
        color: var(--sd-text-muted);
        font-size: 0.9rem;
      }

      /* Contacts Section Styling */
      .sd-contacts-container {
        padding: 24px;
        height: 100%;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 24px;
        box-sizing: border-box;
      }

      .sd-contacts-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .sd-contacts-title {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0;
        color: var(--sd-text);
      }

      .sd-contacts-subtitle {
        font-size: 0.9rem;
        color: var(--sd-text-muted);
        margin: 4px 0 0 0;
      }

      .sd-contacts-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
      }

      .sd-cstat-card {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .sd-cstat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      }

      .sd-cstat-label {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--sd-text-muted);
        letter-spacing: 0.5px;
      }

      .sd-cstat-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--sd-text);
      }

      .sd-cstat-value.text-purple {
        color: var(--sd-purple);
      }

      .sd-cstat-value.text-orange {
        color: var(--sd-orange);
      }

      .sd-cstat-value.text-green {
        color: var(--sd-green);
      }

      .sd-contacts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 20px;
        padding-bottom: 40px;
      }

      .sd-contact-card {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        display: flex;
        flex-direction: column;
        gap: 16px;
        transition: transform 0.2s, box-shadow 0.2s;
        position: relative;
      }

      .sd-contact-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        border-color: var(--sd-purple);
      }

      .sd-contact-card-header {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .sd-contact-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        font-weight: 700;
        color: white;
      }

      .sd-contact-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .sd-contact-name {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--sd-text);
      }

      .sd-contact-company {
        font-size: 0.8rem;
        color: var(--sd-text-muted);
      }

      .sd-contact-details {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 0.85rem;
      }

      .sd-contact-detail-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--sd-text-muted);
        text-decoration: none;
      }

      .sd-contact-detail-item:hover {
        color: var(--sd-text);
      }

      .sd-contact-detail-icon {
        font-size: 1rem;
        opacity: 0.85;
      }

      .sd-contact-divider {
        height: 1px;
        background: var(--sd-border);
        margin: 0;
      }

      .sd-contact-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        text-align: center;
        gap: 8px;
      }

      .sd-contact-stat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .sd-contact-stat-num {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--sd-text);
      }

      .sd-contact-stat-num.text-orange {
        color: var(--sd-orange);
      }

      .sd-contact-stat-label {
        font-size: 0.65rem;
        font-weight: 600;
        color: var(--sd-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .sd-contact-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .sd-contact-tag {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 12px;
        background: var(--sd-bg-dim);
        color: var(--sd-text-muted);
        border: 1px solid var(--sd-border);
      }

      .sd-contact-badge-active {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--sd-green);
      }
      .sd-contact-badge-inactive {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--sd-gray-400);
      }

      /* Accounts Section Styling */
      .sd-accounts-container {
        padding: 24px;
        height: 100%;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 24px;
        box-sizing: border-box;
      }

      .sd-accounts-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .sd-accounts-title {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0;
        color: var(--sd-text);
      }

      .sd-accounts-subtitle {
        font-size: 0.9rem;
        color: var(--sd-text-muted);
        margin: 4px 0 0 0;
      }

      .sd-accounts-table-card {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        border-radius: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        padding: 24px;
        overflow: hidden;
      }

      .sd-accounts-table-title {
        font-size: 1.1rem;
        font-weight: 700;
        margin-bottom: 20px;
        color: var(--sd-text);
      }

      .sd-accounts-table-wrapper {
        overflow-x: auto;
      }

      .sd-accounts-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
      }

      .sd-accounts-table th {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--sd-text-muted);
        padding: 12px 16px;
        border-bottom: 2px solid var(--sd-border);
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      .sd-accounts-table td {
        font-size: 0.9rem;
        padding: 16px;
        border-bottom: 1px solid var(--sd-border);
        color: var(--sd-text);
        vertical-align: middle;
      }

      .sd-accounts-table tr:hover td {
        background: var(--sd-bg-dim);
      }

      .sd-accounts-table .td-company {
        font-weight: 700;
        color: var(--sd-text);
      }

      .sd-acc-ticket-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #dbeafe;
        color: #2563eb;
        font-weight: 700;
        font-size: 0.8rem;
      }

      .sd-acc-plan-badge {
        font-size: 0.75rem;
        font-weight: 700;
        padding: 6px 12px;
        border-radius: 12px;
        display: inline-block;
      }

      .sd-acc-plan-badge.badge-premium {
        background: #dcfce7;
        color: #16a34a;
      }

      .sd-acc-plan-badge.badge-standard {
        background: #fef3c7;
        color: #d97706;
      }

      .sd-acc-plan-badge.badge-basic {
        background: #f3f4f6;
        color: #4b5563;
      }

      /* Activities Section Styling */
      .sd-activities-container {
        padding: 24px;
        height: 100%;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 24px;
        box-sizing: border-box;
      }

      .sd-activities-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .sd-activities-title {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0;
        color: var(--sd-text);
      }

      .sd-activities-subtitle {
        font-size: 0.9rem;
        color: var(--sd-text-muted);
        margin: 4px 0 0 0;
      }

      .sd-activities-header-right {
        display: flex;
        gap: 12px;
      }

      .sd-activities-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-bottom: 40px;
      }

      .sd-activity-card {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        border-radius: 12px;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .sd-activity-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      }

      .sd-activity-card-left {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .sd-activity-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
      }

      .sd-activity-icon.icon-call {
        background: #f5f3ff;
        color: #7c3aed;
      }

      .sd-activity-icon.icon-task {
        background: #dcfce7;
        color: #10b981;
      }

      .sd-activity-icon.icon-time {
        background: #fef3c7;
        color: #d97706;
      }

      .sd-activity-icon.icon-email {
        background: #ffe4e6;
        color: #f43f5e;
      }

      .sd-activity-icon.icon-event {
        background: #e0f2fe;
        color: #0284c7;
      }

      .sd-activity-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .sd-activity-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--sd-text);
      }

      .sd-activity-subtitle {
        font-size: 0.8rem;
        color: var(--sd-text-muted);
      }

      .sd-activity-card-right {
        text-align: right;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .sd-activity-time {
        font-size: 0.8rem;
        color: var(--sd-text-muted);
      }

      .sd-activity-duration {
        font-size: 0.9rem;
        font-weight: 700;
      }

      .sd-activity-duration.text-purple {
        color: var(--sd-purple);
      }

      .sd-activity-duration.text-muted {
        color: var(--sd-text-muted);
      }

      /* Reports & Analytics Styling */
      .sd-reports-container {
        padding: 24px;
        height: 100%;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 24px;
        box-sizing: border-box;
      }

      .sd-reports-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .sd-reports-title {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0;
        color: var(--sd-text);
      }

      .sd-reports-subtitle {
        font-size: 0.9rem;
        color: var(--sd-text-muted);
        margin: 4px 0 0 0;
      }

      .sd-reports-header-right {
        display: flex;
        gap: 12px;
      }

      .sd-cstat-sub {
        font-size: 0.75rem;
        color: var(--sd-text-muted);
        margin-top: 4px;
      }

      .sd-reports-charts-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }

      @media (max-width: 768px) {
        .sd-reports-charts-grid {
          grid-template-columns: 1fr;
        }
      }

      .sd-reports-chart-card {
        background: var(--sd-surface);
        border: 1px solid var(--sd-border);
        border-radius: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .sd-chart-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--sd-text);
      }

      .sd-bar-chart-container {
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        height: 240px;
      }

      .sd-weekly-bars {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        height: 200px;
        padding: 10px 0;
      }

      .sd-bar-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        width: 14%;
      }

      .sd-bar-val {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--sd-text-muted);
      }

      .sd-bar {
        width: 100%;
        max-width: 48px;
        border-radius: 6px;
        background: rgba(124, 58, 237, 0.12);
        transition: height 0.3s ease;
      }

      .sd-bar.sd-bar--active {
        background: var(--sd-purple);
      }

      .sd-bar-label {
        font-size: 0.75rem;
        color: var(--sd-text-muted);
      }

      .sd-donut-chart-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 32px;
        height: 200px;
      }

      .sd-donut-wrapper {
        position: relative;
        width: 140px;
        height: 140px;
      }

      .sd-donut-chart {
        width: 140px;
        height: 140px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .sd-donut-hole {
        width: 90px;
        height: 90px;
        border-radius: 50%;
        background: var(--sd-surface);
      }

      .sd-donut-legend {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .sd-legend-item {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .sd-legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }

      .sd-legend-label {
        font-size: 0.85rem;
        color: var(--sd-text);
        font-weight: 600;
      }
      .sd-export-option-label {
        transition: all 0.2s ease;
      }
      .sd-export-option-label:hover {
        border-color: var(--sd-purple) !important;
        background: var(--sd-bg) !important;
        opacity: 0.95;
      }
    `;
    document.head.appendChild(style);
  }

  async function init() {
    injectStyles();
    renderTopbarTabs();
    wireEvents();
    await refreshAll();
    startClock();
  }

  function getSvgIcon(name) {
    const icons = {
      tickets: `<svg class="sd-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
      contacts: `<svg class="sd-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
      accounts: `<svg class="sd-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"></rect><path d="M7 22V4h10v18"></path><path d="M12 8h.01"></path><path d="M12 12h.01"></path><path d="M12 16h.01"></path><path d="M7 8H5"></path><path d="M7 12H5"></path><path d="M7 16H5"></path><path d="M19 8h-2"></path><path d="M19 12h-2"></path><path d="M19 16h-2"></path></svg>`,
      activities: `<svg class="sd-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
      reports: `<svg class="sd-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
      kb: `<svg class="sd-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`
    };
    return icons[name] || '';
  }

  function renderTopbarTabs() {
    const container = document.getElementById('topbar-subnav');
    if (!container) return;
    container.innerHTML = `
      <div class="sd-topnav__tabs">
        <button class="sd-topnav__tab is-active" data-view="sd-tickets-section">
          ${getSvgIcon('tickets')}
          <span>Tickets</span>
        </button>
        <button class="sd-topnav__tab" data-view="sd-contacts-section">
          ${getSvgIcon('contacts')}
          <span>Contacts</span>
        </button>
        <button class="sd-topnav__tab" data-view="sd-accounts-section">
          ${getSvgIcon('accounts')}
          <span>Accounts</span>
        </button>
        <button class="sd-topnav__tab" data-view="sd-activities-section">
          ${getSvgIcon('activities')}
          <span>Activities</span>
        </button>
        <button class="sd-topnav__tab" data-view="sd-reports-section">
          ${getSvgIcon('reports')}
          <span>Reports</span>
        </button>
        <button class="sd-topnav__tab" data-view="sd-kb-section">
          ${getSvgIcon('kb')}
          <span>Knowledge Base</span>
        </button>
      </div>
    `;
  }

  function getHTML() {
    return `
      <div class="sd-container">
        <!-- Main View Area -->
        <div class="sd-main-body">
          <!-- 1. TICKETS SECTION -->
          <div id="sd-tickets-section" class="sd-view is-active">
            <div class="sd-view-layout">
              <!-- Sidebar Filters -->
              <div class="sd-sidebar">
                <div class="sd-sidebar__title">ALL VIEWS <span style="font-size:0.7rem; font-weight:normal; margin-left:2px; vertical-align:middle;">▼</span></div>
                <div class="sd-sidebar__item is-active" data-filter="all">
                  <span>All Tickets</span>
                  <span id="sd-cnt-all" class="sd-sidebar__badge">0</span>
                </div>
                <div class="sd-sidebar__item" data-filter="closed">
                  <span>Closed Tickets</span>
                  <span id="sd-cnt-closed" class="sd-sidebar__badge">0</span>
                </div>

                <div class="sd-sidebar__title" style="margin-top:20px">TEAM MEMBERS</div>
                <div id="sd-sidebar-members">
                  <div style="font-size:0.75rem; color:var(--sd-text-muted); padding:8px 12px;">Loading members...</div>
                </div>

                <div class="sd-sidebar__title" style="margin-top:20px">WORKPLACE</div>
                <div class="sd-sidebar__item" data-filter="agent-queue">
                  <span>Agent Queue</span>
                  <span id="sd-cnt-queue" class="sd-sidebar__badge">0</span>
                </div>
                <div class="sd-sidebar__item" data-filter="tags">
                  <span>Tags</span>
                </div>
              </div>

              <!-- Main Content (Stats + Table) -->
              <div class="sd-content">
                <!-- Ticket Summary Stats Grid -->
                <div class="sd-stats-grid">
                  <div class="sd-stat-card purple" data-filter="all">
                    <div id="sd-tkt-stat-total" class="sd-stat-value">0</div>
                    <div class="sd-stat-label">Total Volume</div>
                  </div>
                  <div class="sd-stat-card yellow" data-filter="open">
                    <div id="sd-tkt-stat-open" class="sd-stat-value">0</div>
                    <div class="sd-stat-label">Open</div>
                  </div>
                  <div class="sd-stat-card green" data-filter="resolved">
                    <div id="sd-tkt-stat-resolved" class="sd-stat-value">0</div>
                    <div class="sd-stat-label">Resolved</div>
                  </div>
                  <div class="sd-stat-card red" data-filter="overdue">
                    <div id="sd-tkt-stat-overdue" class="sd-stat-value">0</div>
                    <div class="sd-stat-label">Overdue</div>
                  </div>
                  <div class="sd-stat-card purple" data-filter="inprogress">
                    <div id="sd-tkt-stat-inprogress" class="sd-stat-value">0</div>
                    <div class="sd-stat-label">In Progress</div>
                  </div>
                </div>

                <!-- Table Card -->
                <div class="sd-table-card">
                  <div class="sd-table-header">
                    <div id="sd-table-view-title" class="sd-table-title">All Tickets</div>
                    <div style="display:flex; gap:12px; align-items:center;">
                      <input type="text" id="sd-ticket-search" class="sd-search-input" placeholder="Search by ID, subject, client..." />
                      <button id="sd-btn-new-ticket" class="sd-btn sd-btn--primary sd-btn--sm">➕ New Ticket</button>
                    </div>
                  </div>
                  
                  <!-- Toolbar Filters -->
                  <div class="sd-toolbar">
                    <div class="sd-toolbar-filters">
                      <span class="sd-toolbar-label">Status:</span>
                      <select id="sd-toolbar-status-select" class="sd-toolbar-select">
                        <option value="all">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="inprogress">In Progress</option>
                        <option value="pending">Pending</option>
                        <option value="overdue">Overdue</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      
                      <span class="sd-toolbar-label" style="margin-left: 15px;">Team Member:</span>
                      <select id="sd-toolbar-agent-select" class="sd-toolbar-select">
                        <option value="all">All Members</option>
                      </select>
                      
                      <span class="sd-toolbar-label" style="margin-left: 15px;">Priority:</span>
                      <select id="sd-toolbar-priority" class="sd-toolbar-select">
                        <option value="all">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div class="sd-toolbar-sort">
                      <span class="sd-toolbar-label">Sort By:</span>
                      <select id="sd-toolbar-sort-select" class="sd-toolbar-select">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="priority-desc">Priority: High to Low</option>
                        <option value="priority-asc">Priority: Low to High</option>
                        <option value="sla">SLA Urgency</option>
                      </select>
                    </div>
                  </div>

                  <div class="sd-table-container">
                    <table class="sd-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Subject / Category</th>
                          <th>Client</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Agent</th>
                          <th>SLA</th>
                          <th>Created</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody id="sd-ticket-tbody">
                        <!-- Dynamic rows -->
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. REPORTS SECTION -->
          <div id="sd-reports-section" class="sd-view">
            <!-- Dynamically populated via renderReportsSection() -->
          </div>

          <!-- 3. CONTACTS SECTION -->
          <div id="sd-contacts-section" class="sd-view">
            <!-- Dynamically populated via renderContactsSection() -->
          </div>

          <!-- 4. ACCOUNTS SECTION -->
          <div id="sd-accounts-section" class="sd-view">
            <!-- Dynamically populated via renderAccountsSection() -->
          </div>

          <!-- 5. ACTIVITIES SECTION -->
          <div id="sd-activities-section" class="sd-view">
            <!-- Dynamically populated via renderActivitiesSection() -->
          </div>

          <!-- 6. KNOWLEDGE BASE SECTION -->
          <div id="sd-kb-section" class="sd-view">
            <!-- Dynamically populated via renderKBSection() -->
          </div>
        </div>

        <!-- TOAST CONTAINER -->
        <div id="sd-toast-wrap" class="sd-toast-wrap"></div>
      </div>

      <!-- TICKET DETAIL PANEL MODAL -->
      <div id="sd-ticket-modal" class="sd-modal-overlay">
        <div class="sd-detail-panel">
          <div class="sd-detail-header">
            <div>
              <span id="sd-detail-id" class="sd-detail-id">TKT-XXXXXX</span>
              <h2 id="sd-detail-title" class="sd-detail-title">Ticket Title</h2>
              <div id="sd-detail-badges" style="margin-top:8px"></div>
            </div>
            <button id="sd-detail-close" class="sd-btn sd-btn--ghost">✕</button>
          </div>

          <div class="sd-detail-body">
            <div class="sd-detail-main">
              <!-- Reply & Tabs -->
              <div class="sd-reply-card">
                <div class="sd-reply-tabs">
                  <button class="sd-reply-tab is-active" data-tab="sd-conv-tab">Conversation</button>
                  <button class="sd-reply-tab" data-tab="sd-internal-tab">Internal Note</button>
                  <button class="sd-reply-tab" data-tab="sd-timeline-tab">Timeline</button>
                </div>
                <div id="sd-conv-tab" class="sd-reply-panel">
                  <div class="sd-conv-item">
                    <div class="sd-conv-meta">
                      <div class="sd-avatar sd-avatar--sm" style="background:var(--sd-purple)">C</div>
                      <div>
                        <div id="sd-conv-client-name" class="sd-conv-name">Client Name</div>
                        <div class="sd-conv-time">Reported originally</div>
                      </div>
                    </div>
                    <div id="sd-conv-description" class="sd-conv-bubble">Ticket Description</div>
                  </div>
                </div>
                <div id="sd-internal-tab" class="sd-reply-panel" style="display:none">
                  <div class="sd-empty-state">No internal notes for this ticket.</div>
                </div>
                <div id="sd-timeline-tab" class="sd-reply-panel" style="display:none">
                  <div class="sd-empty-state">No timeline events recorded.</div>
                </div>

                <div class="sd-reply-editor">
                  <textarea id="sd-reply-text" rows="3" placeholder="Type a reply or press Ctrl+Enter to send..."></textarea>
                  <div style="display:flex; justify-content:flex-end; margin-top:10px">
                    <button id="sd-btn-send-reply" class="sd-btn sd-btn--primary">Send Reply</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="sd-detail-sidebar">
              <!-- SLA and Timer Info -->
              <div class="sd-sidebar-card">
                <h3>SLA Target</h3>
                <div id="sd-detail-sla" style="font-weight:600; font-size:1.1rem; margin-top:10px">SLA status</div>
              </div>

              <div class="sd-sidebar-card">
                <h3>Work Timer</h3>
                <div id="sd-timer-display" class="sd-timer-display">00:00:00</div>
                <div class="sd-timer-actions">
                  <button id="sd-timer-start-btn" class="sd-btn sd-btn--sm" style="background:var(--sd-purple); color:white">▶ Start</button>
                  <button id="sd-timer-stop-btn" class="sd-btn sd-btn--sm" style="background:var(--sd-gray-400); color:white">⏹ Stop</button>
                  <button id="sd-timer-reset-btn" class="sd-btn sd-btn--sm" style="background:var(--border); color:var(--text-primary)">🔄 Reset</button>
                </div>
                <div id="sd-time-log-list" class="sd-time-log-list" style="margin-top:15px">
                  <!-- Time Logs -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- NEW TICKET MODAL -->
      <div id="sd-new-ticket-modal" class="sd-modal-overlay">
        <div class="sd-form-card">
          <h2>Create New Ticket</h2>
          <div class="sd-form-grid">
            <div class="sd-field" style="grid-column: span 2">
              <label>Subject *</label>
              <input type="text" id="sd-nt-subject" required placeholder="Describe the issue briefly" />
            </div>
            <div class="sd-field">
              <label>Client *</label>
              <select id="sd-nt-client" required>
                <option value="" disabled selected>Select client</option>
                <option value="Ptron">Ptron</option>
                <option value="TechStart Inc">TechStart Inc</option>
                <option value="Alpha Corp">Alpha Corp</option>
                <option value="Beta Ltd">Beta Ltd</option>
              </select>
            </div>
            <div class="sd-field">
              <label>Category *</label>
              <select id="sd-nt-category" required>
                <option value="" disabled selected>Select category</option>
                <option value="Support">Support</option>
                <option value="Billing">Billing</option>
                <option value="Bug">Bug</option>
                <option value="Feature Request">Feature Request</option>
              </select>
            </div>
            <div class="sd-field">
              <label>Priority</label>
              <select id="sd-nt-priority">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div class="sd-field">
              <label>Assignee</label>
              <select id="sd-nt-agent">
                <option value="Unassigned">Unassigned</option>
              </select>
            </div>
            <div class="sd-field" style="grid-column: span 2">
              <label>Resolution SLA (Hours)</label>
              <input type="number" id="sd-nt-resolution-time" min="1" placeholder="Override standard priority SLA (e.g. 12)" />
            </div>
            <div class="sd-field" style="grid-column: span 2">
              <label>Description</label>
              <textarea id="sd-nt-desc" rows="3" placeholder="Provide full details of the issue..."></textarea>
            </div>
          </div>
          <div class="sd-form-actions">
            <button id="sd-btn-cancel-ticket" class="sd-btn sd-btn--secondary">Cancel</button>
            <button id="sd-btn-create-ticket" class="sd-btn sd-btn--primary">Create Ticket</button>
          </div>
        </div>
      </div>

      <!-- NEW CONTACT MODAL -->
      <div id="sd-new-contact-modal" class="sd-modal-overlay">
        <div class="sd-form-card">
          <h2>Create New Contact</h2>
          <div class="sd-form-grid">
            <div class="sd-field" style="grid-column: span 2">
              <label>Contact Name *</label>
              <input type="text" id="sd-nc-spoc-name" required placeholder="e.g. John Doe" />
            </div>
            <div class="sd-field">
              <label>Company / Organization *</label>
              <input type="text" id="sd-nc-company-name" required placeholder="e.g. Ptron Electronics" />
            </div>
            <div class="sd-field">
              <label>Email Address *</label>
              <input type="email" id="sd-nc-email" required placeholder="name@example.com" />
            </div>
            <div class="sd-field">
              <label>Phone Number *</label>
              <input type="text" id="sd-nc-phone" required placeholder="+91 XXXXX XXXXX" />
            </div>
            <div class="sd-field">
              <label>Status</label>
              <select id="sd-nc-status">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div class="sd-field" style="grid-column: span 2">
              <label>Tags (Comma separated)</label>
              <input type="text" id="sd-nc-tags" placeholder="Support, Premium" />
            </div>
          </div>
          <div class="sd-form-actions">
            <button id="sd-btn-cancel-contact" class="sd-btn sd-btn--secondary">Cancel</button>
            <button id="sd-btn-create-contact" class="sd-btn sd-btn--primary">Create Contact</button>
          </div>
        </div>
      </div>

      <!-- NEW ACCOUNT MODAL -->
      <div id="sd-new-account-modal" class="sd-modal-overlay">
        <div class="sd-form-card">
          <h2>Create New Account</h2>
          <div class="sd-form-grid">
            <div class="sd-field" style="grid-column: span 2">
              <label>Company Name *</label>
              <input type="text" id="sd-na-company-name" required placeholder="e.g. Acme Corp" />
            </div>
            <div class="sd-field">
              <label>Industry *</label>
              <input type="text" id="sd-na-industry" required placeholder="e.g. Software, Healthcare" />
            </div>
            <div class="sd-field">
              <label>Service Plan</label>
              <select id="sd-na-plan">
                <option value="Basic">Basic</option>
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
              </select>
            </div>
          </div>
          <div class="sd-form-actions">
            <button id="sd-btn-cancel-account" class="sd-btn sd-btn--secondary">Cancel</button>
            <button id="sd-btn-create-account" class="sd-btn sd-btn--primary">Create Account</button>
          </div>
        </div>
      </div>

      <!-- ACTIVITY MODAL -->
      <div id="sd-activity-modal" class="sd-modal-overlay">
        <div class="sd-form-card">
          <h2 id="sd-act-modal-title">Log Call</h2>
          <input type="hidden" id="sd-act-type" value="call" />
          <div class="sd-form-grid">
            <div class="sd-field" style="grid-column: span 2">
              <label>Subject / Description *</label>
              <input type="text" id="sd-act-title" required placeholder="e.g. Discuss billing issue" />
            </div>
            <div class="sd-field">
              <label>Ticket Association</label>
              <select id="sd-act-ticket">
                <option value="General">General (No Ticket)</option>
              </select>
            </div>
            <div class="sd-field">
              <label id="sd-act-detail-label">Call Type</label>
              <input type="text" id="sd-act-detail" placeholder="e.g. Outbound call, Task description" />
            </div>
            <div class="sd-field">
              <label>Duration (optional)</label>
              <div style="display: flex; gap: 6px;">
                <select id="sd-act-hours" onchange="updateActivityDurationFromDropdowns()" style="flex: 1; height: 38px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-body); color: var(--text-main); font-weight: 500; font-size: 0.88rem; padding: 0 10px;">
                  ${(() => {
                    let opts = '';
                    for (let h = 0; h <= 24; h++) {
                      opts += `<option value="${h}">${h} hr</option>`;
                    }
                    return opts;
                  })()}
                </select>
                <select id="sd-act-minutes" onchange="updateActivityDurationFromDropdowns()" style="flex: 1; height: 38px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-body); color: var(--text-main); font-weight: 500; font-size: 0.88rem; padding: 0 10px;">
                  ${(() => {
                    let opts = '';
                    for (let m = 0; m < 60; m++) {
                      opts += `<option value="${m}">${String(m).padStart(2, '0')} min</option>`;
                    }
                    return opts;
                  })()}
                </select>
              </div>
              <input type="hidden" id="sd-act-duration" value="" />
            </div>
            <div class="sd-field" style="grid-column: span 2">
              <label>Assigned Agent</label>
              <select id="sd-act-agent">
              </select>
            </div>
          </div>
          <div class="sd-form-actions">
            <button id="sd-btn-cancel-activity" class="sd-btn sd-btn--secondary">Cancel</button>
            <button id="sd-btn-save-activity" class="sd-btn sd-btn--primary">Save</button>
          </div>
        </div>
      </div>

      <!-- NEW ARTICLE MODAL -->
      <div id="sd-new-article-modal" class="sd-modal-overlay">
        <div class="sd-form-card">
          <h2>Create New Article</h2>
          <div class="sd-form-grid">
            <div class="sd-field" style="grid-column: span 2">
              <label>Title *</label>
              <input type="text" id="sd-na-title" required placeholder="e.g. How to reset your password" />
            </div>
            <div class="sd-field">
              <label>Category *</label>
              <input type="text" id="sd-na-category" required placeholder="e.g. Billing, General, Setup" />
            </div>
            <div class="sd-field">
              <label>Status</label>
              <select id="sd-na-status">
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>
          <div class="sd-form-actions">
            <button id="sd-btn-cancel-article" class="sd-btn sd-btn--secondary">Cancel</button>
            <button id="sd-btn-create-article" class="sd-btn sd-btn--primary">Create Article</button>
          </div>
        </div>
      </div>

      <!-- VIEW DETAILS MODAL -->
      <div id="sd-view-detail-modal" class="sd-modal-overlay">
        <div class="sd-form-card" style="max-width: 500px">
          <h2 id="sd-vd-title">Item Details</h2>
          <div id="sd-vd-content" style="margin-top: 16px; font-size: 0.95rem; line-height: 1.6;">
            <!-- Dynamic fields -->
          </div>
          <div class="sd-form-actions" style="margin-top: 24px">
            <button id="sd-btn-close-view" class="sd-btn sd-btn--primary">Close</button>
          </div>
        </div>
      </div>

      <!-- EXPORT REPORTS RANGE MODAL -->
      <div id="sd-export-reports-modal" class="sd-modal-overlay">
        <div class="sd-modal" style="max-width: 480px; width: 100%; border-radius: 12px; background: var(--sd-surface); border: 1px solid var(--sd-border); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); overflow: hidden; position: relative;">
          <div class="sd-modal-header" style="display:flex; justify-content:space-between; align-items:center; padding: 16px 24px; border-bottom:1px solid var(--sd-border);">
            <h3 style="margin:0; font-size:1.15rem; font-weight:700; color:var(--sd-text);">Export Report</h3>
            <button id="sd-btn-close-export-modal" class="sd-btn sd-btn--ghost" style="padding: 4px 8px; font-size:1.1rem; line-height:1; border: none; background: transparent; cursor: pointer; color: var(--sd-text-muted);">✕</button>
          </div>
          <div class="sd-modal-body" style="padding: 24px;">
            <p style="margin-top:0; margin-bottom:18px; font-size:0.9rem; color:var(--sd-text-muted);">Select the time period you want to export the ticket reports for:</p>
            <div class="sd-export-options" style="display:flex; flex-direction:column; gap:12px;">
              <label class="sd-export-option-label" style="display:flex; align-items:center; gap:12px; padding:12px 16px; border:1px solid var(--sd-border); border-radius:8px; cursor:pointer; transition:all 0.2s;">
                <input type="radio" name="export-range" value="week" checked style="accent-color: var(--sd-purple);" />
                <div style="display:flex; flex-direction:column;">
                  <span style="font-weight:600; font-size:0.9rem; color:var(--sd-text);">This Week</span>
                  <span style="font-size:0.75rem; color:var(--sd-text-muted);">Export data for the current calendar week</span>
                </div>
              </label>
              <label class="sd-export-option-label" style="display:flex; align-items:center; gap:12px; padding:12px 16px; border:1px solid var(--sd-border); border-radius:8px; cursor:pointer; transition:all 0.2s;">
                <input type="radio" name="export-range" value="month" style="accent-color: var(--sd-purple);" />
                <div style="display:flex; flex-direction:column;">
                  <span style="font-weight:600; font-size:0.9rem; color:var(--sd-text);">This Month</span>
                  <span style="font-size:0.75rem; color:var(--sd-text-muted);">Export data for the current calendar month</span>
                </div>
              </label>
              <label class="sd-export-option-label" style="display:flex; align-items:center; gap:12px; padding:12px 16px; border:1px solid var(--sd-border); border-radius:8px; cursor:pointer; transition:all 0.2s;">
                <input type="radio" name="export-range" value="year" style="accent-color: var(--sd-purple);" />
                <div style="display:flex; flex-direction:column;">
                  <span style="font-weight:600; font-size:0.9rem; color:var(--sd-text);">This Year</span>
                  <span style="font-size:0.75rem; color:var(--sd-text-muted);">Export data for the current calendar year</span>
                </div>
              </label>
              <label class="sd-export-option-label" style="display:flex; align-items:center; gap:12px; padding:12px 16px; border:1px solid var(--sd-border); border-radius:8px; cursor:pointer; transition:all 0.2s;">
                <input type="radio" name="export-range" value="custom" id="sd-export-radio-custom" style="accent-color: var(--sd-purple);" />
                <div style="display:flex; flex-direction:column; width: 100%;">
                  <span style="font-weight:600; font-size:0.9rem; color:var(--sd-text);">Custom Range</span>
                  <span style="font-size:0.75rem; color:var(--sd-text-muted);">Select custom start and end dates</span>
                  <div id="sd-export-custom-dates" style="display:none; gap:10px; margin-top:10px; width: 100%;">
                    <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                      <label style="font-size:0.7rem; font-weight:600; color:var(--sd-text-muted);">START DATE</label>
                      <input type="date" id="sd-export-start-date" style="padding:6px; border:1px solid var(--sd-border); border-radius:4px; font-size:0.8rem; background:var(--sd-bg); color:var(--sd-text);" />
                    </div>
                    <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                      <label style="font-size:0.7rem; font-weight:600; color:var(--sd-text-muted);">END DATE</label>
                      <input type="date" id="sd-export-end-date" style="padding:6px; border:1px solid var(--sd-border); border-radius:4px; font-size:0.8rem; background:var(--sd-bg); color:var(--sd-text);" />
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>
          <div class="sd-modal-footer" style="padding:16px 24px; border-top:1px solid var(--sd-border); display:flex; justify-content:flex-end; gap:12px;">
            <button id="sd-btn-cancel-export" class="sd-btn sd-btn--secondary">Cancel</button>
            <button id="sd-btn-confirm-export" class="sd-btn sd-btn--primary">📥 Export Report</button>
          </div>
        </div>
      </div>
    `;
  }

  return {
    init,
    getHTML,
    openTicketDetail,
    quickResolve,
    filterTickets,
    switchMainTab
  };
})();

console.log('[TICKETS MODULE UPGRADED SUCCESSFULLY]');
