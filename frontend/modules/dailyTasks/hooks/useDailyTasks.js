window.useDailyTasks = (function() {
  const store = {
    tasks: [],
    members: [],
    clients: [],
    memberDurations: [], // Pre-calculated daily totals from backend
    summary: {
      totalTasks: 0,
      totalWorkingMinutes: 0,
      sessionDurationFormatted: '0h 00m'
    },
    loading: false,
    filters: {
      date: new Date().toISOString().split('T')[0],
      memberId: '',
      clientId: '',
      team: '',
      search: '',
      page: 1,
      limit: 50
    },
    pagination: {
      total: 0,
      pages: 1
    }
  };

  const listeners = new Set();
  const notify = () => listeners.forEach(l => l(store));

  const api = {
    getState: () => store,
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },

    setFilter: (key, val) => {
      store.filters[key] = val;
      if (key === 'team') {
        store.filters.memberId = '';
      }
      store.filters.page = 1; // Reset to first page on filter change
      window.useDailyTasks.fetchData();
    },

    fetchMetadata: async () => {
      try {
        const [membersRes, clientsRes] = await Promise.all([
          DailyTaskService.fetchMembers(),
          DailyTaskService.fetchClients()
        ]);
        console.log("[MEMBERS FETCHED]", membersRes?.data);
        console.log("[CLIENTS FETCHED]", clientsRes?.data);
        
        if (membersRes?.success) store.members = membersRes.data;
        if (clientsRes?.success) store.clients = clientsRes.data;
        notify();
      } catch (err) {
        console.error('Metadata Fetch Failed', err);
      }
    },

    fetchData: async () => {
      store.loading = true;
      notify();
      try {
        const query = new URLSearchParams(store.filters).toString();
        
        const fetchPromises = [
          DailyTaskAPI.getAll(query),
          DailyTaskAPI.getSummary(query),
          DailyTaskAPI.getDurations(`date=${store.filters.date}`)
        ];

        // Ensure we have metadata on first load
        if (store.members.length === 0 || store.clients.length === 0) {
          fetchPromises.push(DailyTaskService.fetchMembers());
          fetchPromises.push(DailyTaskService.fetchClients());
        }

        const results = await Promise.all(fetchPromises);
        const [taskRes, summaryRes, durationRes, membersRes, clientsRes] = results;

        if (taskRes.success) {
          store.tasks = taskRes.data;
          store.pagination = taskRes.pagination;
        }
        if (summaryRes.success) {
          store.summary = summaryRes.data;
        }
        if (durationRes.success) {
          store.memberDurations = durationRes.data;
        }
        
        // Update metadata if fetched in this call
        if (membersRes?.success) {
          console.log("[MEMBERS FETCHED ON LOAD]", membersRes.data);
          store.members = membersRes.data;
        }
        if (clientsRes?.success) {
          console.log("[CLIENTS FETCHED ON LOAD]", clientsRes.data);
          store.clients = clientsRes.data;
        }

      } catch (err) {
        console.error('Fetch Failed', err);
      } finally {
        store.loading = false;
        notify();
      }
    },

    saveTask: async (id, data) => {
      const isUpdate = id && id !== 'null';
      const res = isUpdate ? await DailyTaskAPI.update(id, data) : await DailyTaskAPI.create(data);
      if (res.success) {
        if (window.closeModal) closeModal();
        if (window.toast) toast(`Task ${isUpdate ? 'updated' : 'saved'} successfully`, 'success');
        window.useDailyTasks.fetchData();
        return true;
      }
      return false;
    },

    deleteTask: async (id) => {
      if (!confirm('Are you sure you want to delete this task?')) return;
      const res = await DailyTaskAPI.delete(id);
      if (res.success) {
        window.useDailyTasks.fetchData();
      }
    },

    // Backward compatibility alias
    loadInitialData: function() { return this.fetchData(); }
  };

  return api;
})();
