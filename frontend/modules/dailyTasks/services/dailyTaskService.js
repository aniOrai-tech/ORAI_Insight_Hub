/**
 * DailyTaskAPI - High level service for the module
 */
window.DailyTaskAPI = {
  getAll: async (query) => {
    const params = Object.fromEntries(new URLSearchParams(query));
    const res = await api.dailyTasks.list(params);
    return res.data;
  },
  getSummary: async (query) => {
    const params = Object.fromEntries(new URLSearchParams(query));
    const res = await api.dailyTasks.getSummary(params);
    return res.data;
  },
  getDurations: async (query) => {
    const res = await api.get('/tasks/durations', Object.fromEntries(new URLSearchParams(query)));
    return res.data;
  },
  create: async (data) => {
    const res = await api.dailyTasks.create(data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.dailyTasks.update(id, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.dailyTasks.delete(id);
    return res.data;
  }
};

window.DailyTaskService = {
  ...window.DailyTaskAPI,
  fetchMembers: async (status = 'active') => {
    const res = await api.members.list({ status, limit: 1000 });
    return res.data;
  },
  fetchClients: async () => {
    const res = await api.get('/clients/all', { limit: 1000 });
    return res.data;
  }
};
