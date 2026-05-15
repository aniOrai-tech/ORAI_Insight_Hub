/**
 * Layout Manager
 * Handles switching between Enterprise Hub, Zoho Desk (Ticketing), and Zoho Books (Finance) layouts.
 */

const LayoutManager = {
  currentMode: null, // Initially null to ensure setMode triggers on first call

  init() {
    console.log('[LAYOUT MANAGER] Initializing...');
    this.detectMode();
    if (!this.currentMode) {
      this.setMode('hub');
    }
    console.log('[SIDEBAR COMPONENT LOADED]');
  },

  detectMode() {
    const page = window.currentPage || 'dashboard';
    if (page === 'tickets' || page.startsWith('desk-')) {
      this.setMode('desk');
    } else if (page === 'finance' || page.startsWith('books-') || page.startsWith('finance-')) {
      this.setMode('books');
    } else if (page === 'clients') {
      // Clients can be Hub (Admin) or Books (Finance). 
      // If we are already in Books, stay there. Otherwise Hub.
      if (this.currentMode !== 'books') {
        this.setMode('hub');
      }
    } else {
      this.setMode('hub');
    }
  },

  setMode(mode) {
    this.currentMode = mode;
    console.log(`[LAYOUT MODE CHANGED] -> ${mode.toUpperCase()}`);
    
    // Apply layout-specific classes to body
    document.body.classList.remove('layout-hub', 'layout-desk', 'layout-books');
    document.body.classList.add(`layout-${mode}`);

    // Always rebuild sidebar to ensure it reflects current state
    this.renderSidebar();
  },

  renderSidebar() {
    console.log(`[LAYOUT MANAGER] Rendering sidebar for mode: ${this.currentMode}`);
    if (typeof renderEnterpriseSidebar === 'function') {
      try {
        renderEnterpriseSidebar(this.currentMode);
      } catch (err) {
        console.error('[LAYOUT MANAGER] Error rendering sidebar:', err);
      }
    } else {
      console.error('[LAYOUT MANAGER] renderEnterpriseSidebar function not found!');
    }
  }
};

window.LayoutManager = LayoutManager;
