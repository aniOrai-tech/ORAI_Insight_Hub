/**
 * SearchManager
 * Unified enterprise-grade search system for all dashboard modules.
 * Handles debouncing, request cancellation, and standardized UI states.
 */

const SearchManager = {
  activeControllers: {},
  debounceTimers: {},

  /**
   * Universal search handler
   * @param {string} module - Module name (e.g., 'Invoices', 'DailyTasks')
   * @param {string} query - Search string from input
   * @param {function} loadFn - The data loading function for the module
   */
  search(module, query, loadFn) {
    console.log(`[SEARCH INITIALIZED] Module: ${module}, Query: "${query}"`);
    
    // Clear previous debounce for this module
    if (this.debounceTimers[module]) {
      clearTimeout(this.debounceTimers[module]);
    }

    // Standard debounce delay
    this.debounceTimers[module] = setTimeout(async () => {
      console.log(`[SEARCH INPUT RECEIVED] Applying filter for ${module}: "${query}"`);
      
      // Abort previous pending request for this module to prevent race conditions
      if (this.activeControllers[module]) {
        this.activeControllers[module].abort();
      }
      
      this.activeControllers[module] = new AbortController();
      
      try {
        // Show standardized searching state
        this.setLoadingState(module);
        
        // Trigger the load function with search param and signal
        // We wrap it in an object that the load functions expect
        await loadFn({ 
          search: query.trim(), 
          signal: this.activeControllers[module].signal 
        });
        
        console.log(`[SEARCH RESULTS RENDERED] for ${module}`);
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log(`[SEARCH ABORTED] Previous request for ${module} cancelled.`);
        } else {
          console.error(`[SEARCH ERROR] ${module}:`, err);
          this.setErrorState(module, err.message);
        }
      } finally {
        delete this.activeControllers[module];
        if (!query) console.log(`[SEARCH CLEARED] for ${module}`);
      }
    }, 400);
  },

  /**
   * Standardized loading state for tables
   */
  setLoadingState(module) {
    const listId = this.getListId(module);
    const el = document.getElementById(listId);
    if (el) {
      // Clear existing records immediately to avoid showing stale data
      el.innerHTML = '';
      
      const colCount = el.closest('table')?.querySelectorAll('thead th').length || 10;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="${colCount}" class="loading-state">
        <div style="display:flex; align-items:center; justify-content:center; gap:12px; padding:60px 0">
          <svg class="spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <span style="color:var(--text-secondary); font-weight:500">Searching records...</span>
        </div>
      </td>`;
      el.appendChild(tr);
    }
  },

  /**
   * Standardized empty state when no matches found
   */
  renderEmptyState(module, listId) {
    console.log(`[NON-MATCHING RECORDS HIDDEN] No results found for ${module}`);
    const el = document.getElementById(listId);
    if (el) {
      const colCount = el.closest('table')?.querySelectorAll('thead th').length || 10;
      el.innerHTML = `<tr><td colspan="${colCount}" class="empty-state">
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:80px 20px; color:var(--text-muted); text-align:center">
          <div style="background:var(--bg-body); width:64px; height:64px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:20px">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </div>
          <div style="font-size:1.25rem; font-weight:600; color:var(--text-secondary)">No matching records found</div>
          <div style="font-size:0.875rem; margin-top:8px; max-width:300px">We couldn't find anything matching your search. Try different keywords or check for typos.</div>
          <button class="btn btn-ghost btn-sm" style="margin-top:24px; border:1px solid var(--border-color)" onclick="SearchManager.clear('${module}')">
            Clear Search
          </button>
        </div>
      </td></tr>`;
    }
  },

  /**
   * Standardized error state
   */
  setErrorState(module, message) {
    const listId = this.getListId(module);
    const el = document.getElementById(listId);
    if (el) {
      const colCount = el.closest('table')?.querySelectorAll('thead th').length || 10;
      el.innerHTML = `<tr><td colspan="${colCount}" class="error-state" style="padding:40px; text-align:center; color:var(--red)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:8px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <div>Search failed: ${message}</div>
      </td></tr>`;
    }
  },

  /**
   * Map module names to their table body IDs
   */
  getListId(module) {
    const map = {
      'Invoices': 'finance-invoices-list',
      'Payments': 'finance-payments-list',
      'Expenses': 'finance-expenses-list',
      'DailyTasks': 'daily-tasks-list',
      'Meetings': 'meetings-list',
      'Bots': 'bots-list',
      'Clients': 'clients-list',
      'Upsells': 'upsell-list',
      'Requirements': 'requirements-list',
      'WhatsApp': 'whatsapp-list',
      'HealthChecks': 'healthcheck-list',
      'Tickets': 'tickets-list',
      'Users': 'users-tbody',
      'TicketQueue': 'queue-list'
    };
    return map[module] || `${module.toLowerCase()}-list`;
  },

  /**
   * Clear search for a specific module
   */
  clear(module) {
    const inputSelector = `.search-input[data-module="${module}"], .search-input`;
    const input = document.querySelector(inputSelector);
    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input'));
    }
  }
};

window.SearchManager = SearchManager;
console.log('[SEARCH SYSTEM INITIALIZED]');
