/**
 * Enterprise Sidebar - Multi-mode
 */

function renderEnterpriseSidebar(mode = 'hub') {
  console.log(`[SIDEBAR] Render Start. Mode: ${mode}, CurrentPage: ${window.currentPage}`);
  const nav = document.getElementById('sidebar-nav');
  if (!nav || !window.currentUser) return;
  
  const user = window.currentUser;
  const perms = user.permissions || {};

  if (typeof window.showDeskExtras === 'undefined') {
    window.showDeskExtras = false;
  }

  const config = {
    hub: [
      { id: 'dashboard', label: 'Overview', icon: 'grid' },
      { id: 'meetings', label: 'Meetings', icon: 'calendar' },
      { id: 'bots', label: 'Bot Details', icon: 'bot' },
      { id: 'clients', label: 'Clients', icon: 'users', perm: 'clients' },
      { id: 'tickets', label: 'Ticketing', icon: 'clipboard', badge: 'Desk', perm: 'tickets' },
      { id: 'finance', label: 'Finance', icon: 'trend', badge: 'Books', perm: 'finance' },
      { id: 'upsell', label: 'Upsell Tracker', icon: 'trend', perm: 'upsell' },
      { id: 'requirements', label: 'Requirements', icon: 'clipboard', perm: 'requirements' },
      { id: 'whatsapp', label: 'WhatsApp', icon: 'bot', perm: 'whatsapp' },
      { id: 'healthchecks', label: 'Health Tracker', icon: 'trend', perm: 'healthChecks' },
      { id: 'daily-tasks', label: 'Daily Task Update', icon: 'activity' },
      { id: 'admin', label: 'Admin Panel', icon: 'users', perm: 'admin' },
      { type: 'divider' },
      { id: 'profile', label: 'My Profile', icon: 'users' },
    ],
    desk: window.showDeskExtras ? [
      { id: 'desk-hq', label: 'Headquarters', icon: 'grid' },
      { id: 'desk-queue', label: 'My Queue', icon: 'ticket' },
      { id: 'desk-feeds', label: 'Team Feed', icon: 'activity' },
      { id: 'tickets', label: 'All Tickets', icon: 'clipboard' },
      { id: 'desk-more', label: 'Less Options', icon: 'more' },
      { id: 'dashboard', label: 'Exit Desk', icon: 'chevron-left' },
    ] : [
      { id: 'tickets', label: 'All Tickets', icon: 'clipboard' },
      { id: 'desk-more', label: 'More Options', icon: 'more' },
      { id: 'dashboard', label: 'Exit Desk', icon: 'chevron-left' },
    ],
    books: [
      { id: 'books-home', label: 'Home', icon: 'home' },
      { id: 'finance-sales', label: 'Sales', icon: 'trend', sub: [
          { id: 'clients', label: 'Customers' },
          { id: 'books-invoices', label: 'Invoices' },
          { id: 'books-payments', label: 'Payments' }
      ]},
      { id: 'dashboard', label: 'Exit Books', icon: 'chevron-left' },
    ]
  };

  const items = config[mode] || config.hub;
  nav.innerHTML = '';

  const getIcon = (type) => {
    if (typeof iconGrid !== 'function') return '';
    switch(type) {
      case 'grid': return iconGrid();
      case 'calendar': return iconCalendar();
      case 'bot': return iconBot();
      case 'users': return iconUsers();
      case 'clipboard': return iconClipboard();
      case 'trend': return iconTrend();
      case 'activity': return iconActivity();
      case 'ticket': return iconTicket();
      case 'chevron-left': return iconChevronLeft();
      case 'home': return iconHome();
      case 'more': return typeof iconMore === 'function' ? iconMore() : '•••';
      default: return '';
    }
  };

  items.forEach((item, index) => {
    if (item.type === 'divider') {
      const hr = document.createElement('div');
      hr.className = 'sidebar-divider';
      nav.appendChild(hr);
      return;
    }

    if (item.perm) {
      const hasPerm = perms[item.perm] === true || perms[item.perm] === 'true' || user.role === 'admin' || user.username === 'admin';
      if (!hasPerm) return;
    }

    const el = document.createElement('div');
    el.className = `nav-item ${window.currentPage === item.id ? 'active' : ''}`;
    el.id = `nav-${item.id}`;
    el.title = item.label;
    
    const badgeHtml = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
    const iconHtml = getIcon(item.icon);
    
    el.innerHTML = `
      <span class="nav-icon">${iconHtml}</span>
      <span class="nav-label">${item.label}</span>
      ${badgeHtml}
    `;

    el.onclick = () => {
      console.log(`[SIDEBAR] Clicked item: ${item.id}`);
      if (item.id === 'desk-more') {
        window.showDeskExtras = !window.showDeskExtras;
        renderEnterpriseSidebar('desk');
        return;
      }
      if (item.id === 'dashboard' && mode !== 'hub') LayoutManager.setMode('hub');
      navigateTo(item.id);
    };

    nav.appendChild(el);
    console.log(`[SIDEBAR] Appended index ${index}: ${item.id}`);

    if (item.sub) {
      const subContainer = document.createElement('div');
      subContainer.className = 'nav-sub-container';
      item.sub.forEach(sub => {
        const subEl = document.createElement('div');
        subEl.className = `nav-sub-item ${window.currentPage === sub.id ? 'active' : ''}`;
        subEl.textContent = sub.label;
        subEl.title = sub.label;
        subEl.onclick = (e) => {
          e.stopPropagation();
          navigateTo(sub.id);
        };
        subContainer.appendChild(subEl);
      });
      nav.appendChild(subContainer);
    }
  });
  console.log('[SIDEBAR] Render Complete');
}

window.renderEnterpriseSidebar = renderEnterpriseSidebar;
console.log('[SIDEBAR] Module loaded and ready');
