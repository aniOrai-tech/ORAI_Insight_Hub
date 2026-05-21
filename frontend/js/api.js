/**
 * ORAI Insight Hub — API Client
 * Handles all HTTP requests to the backend
 */

const API_BASE = '/api';

const api = {
  // â”€â”€â”€ Core fetch wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async request(method, endpoint, data = null, isFormData = false, signal = null) {
    const token = localStorage.getItem('orai_token');
    const headers = {};

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const config = { method, headers, signal };
    if (data) {
      config.body = isFormData ? data : JSON.stringify(data);
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, config);
      const json = await res.json();

      if (res.status === 401 && !endpoint.includes('/auth/login')) {
        // Token expired or invalid — redirect to login
        localStorage.removeItem('orai_token');
        localStorage.removeItem('orai_user');
        window.location.reload();
        return;
      }

      return { ok: res.ok, status: res.status, data: json };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { ok: false, data: { message: 'Request aborted' } };
      }
      console.error('API Error:', err);
      return { ok: false, data: { message: 'Network error. Please check your connection.' } };
    }
  },

  get: (url, params = {}) => {
    const { signal, ...rest } = params;
    const qs = Object.keys(rest).length ? '?' + new URLSearchParams(rest).toString() : '';
    return api.request('GET', url + qs, null, false, signal);
  },
  post:   (url, data)        => api.request('POST', url, data),
  put:    (url, data)        => api.request('PUT', url, data),
  patch:  (url, data)        => api.request('PATCH', url, data),
  delete: (url)              => api.request('DELETE', url),
  upload: (url, formData)    => api.request('POST', url, formData, true),
  uploadPut: (url, formData) => api.request('PUT', url, formData, true),

  // â”€â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  auth: {
    login: (creds) => api.post('/auth/login', creds),
    verifyOTP: (data) => api.post('/auth/verify-otp', data),

    register: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
    changePassword: (data) => api.put('/auth/change-password', data),
    updateProfile: (data) => api.put('/auth/update-profile', data),
  },

  // â”€â”€â”€ Users (Admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  users: {
    list: (params) => api.get('/users', params),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    toggleStatus: (id) => api.put(`/users/${id}/status`)
  },

  // â”€â”€â”€ Meetings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  meetings: {
    list:   (params) => api.get('/meetings', params),
    get:    (id)     => api.get(`/meetings/${id}`),
    create: (data)   => api.upload('/meetings', data),
    update: (id, data) => api.uploadPut(`/meetings/${id}`, data),
    delete: (id)     => api.delete(`/meetings/${id}`),
    sync:   ()       => api.post('/meetings/sync'),
    importRecordings: () => api.post('/meetings/import-recordings'),
    enrichManual: () => api.post('/meetings/enrich-manual')
  },

  // â”€â”€â”€ Bots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  bots: {
    list:   (params) => api.get('/bots', params),
    get:    (id)     => api.get(`/bots/${id}`),
    create: (data)   => api.post('/bots', data),
    update: (id, d)  => api.put(`/bots/${id}`, d),
    delete: (id)     => api.delete(`/bots/${id}`)
  },

  // â”€â”€â”€ Clients â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  clients: {
    list:   (params) => api.get('/clients', params),
    get:    (id)     => api.get(`/clients/${id}`),
    create: (data)   => api.post('/clients', data),
    update: (id, d)  => api.put(`/clients/${id}`, d),
    delete: (id)     => api.delete(`/clients/${id}`)
  },

  // â”€â”€â”€ Upsell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  upsell: {
    list:   (params) => api.get('/upsell', params),
    get:    (id)     => api.get(`/upsell/${id}`),
    create: (data)   => api.post('/upsell', data),
    update: (id, d)  => api.put(`/upsell/${id}`, d),
    delete: (id)     => api.delete(`/upsell/${id}`)
  },

  // â”€â”€â”€ Requirements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  requirements: {
    list:   (params) => api.get('/requirements', params),
    get:    (id)     => api.get(`/requirements/${id}`),
    create: (data)   => api.upload('/requirements', data),
    update: (id, d)  => api.put(`/requirements/${id}`, d),
    delete: (id)     => api.delete(`/requirements/${id}`)
  },

  // â”€â”€â”€ Analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  analytics: {
    get: () => api.get('/analytics')
  },

  // â”€â”€â”€ WhatsApp Logins â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  whatsapp: {
    list:   (params) => api.get('/whatsapp', params),
    create: (data) => api.post('/whatsapp', data),
    update: (id, data) => api.put(`/whatsapp/${id}`, data),
    delete: (id) => api.delete(`/whatsapp/${id}`)
  },

  // â”€â”€â”€ Health Checks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  healthchecks: {
    list:   (params) => api.get('/healthchecks', params),
    create: (data) => api.post('/healthchecks', data),
    update: (id, data) => api.put(`/healthchecks/${id}`, data),
    delete: (id) => api.delete(`/healthchecks/${id}`),
    generate: (data) => api.post('/healthchecks/generate', data)
  },

  // â”€â”€â”€ Bulk Import â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  import: (module, formData) => api.upload(`/import/${module}`, formData),

  // â”€â”€â”€ Tickets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  tickets: {
    list:      (params) => api.get('/tickets', params),
    get:       (id)     => api.get(`/tickets/${id}`),
    create:    (data)   => api.post('/tickets', data),
    update:    (id, d)  => api.put(`/tickets/${id}`, d),
    delete:    (id)     => api.delete(`/tickets/${id}`),
    addNote:   (id, d)  => api.post(`/tickets/${id}/notes`, d),
    assign:    (id, d)  => api.patch(`/tickets/${id}/assign`, d),
    analytics: ()       => api.get('/tickets/analytics')
  },

  // â”€â”€â”€ Invoices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  invoices: {
    list:   (params) => api.get('/invoices', params),
    get:    (id)     => api.get(`/invoices/${id}`),
    create: (data)   => api.post('/invoices', data),
    update: (id, d)  => api.put(`/invoices/${id}`, d),
    delete: (id)     => api.delete(`/invoices/${id}`)
  },

  // â”€â”€â”€ Payments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  payments: {
    list:   (params) => api.get('/payments', params),
    create: (data)   => api.post('/payments', data),
    delete: (id)     => api.delete(`/payments/${id}`)
  },

  // â”€â”€â”€ Expenses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  expenses: {
    list:      (params) => api.get('/expenses', params),
    create:    (data)   => api.post('/expenses', data),
    update:    (id, d)  => api.put(`/expenses/${id}`, d),
    delete:    (id)     => api.delete(`/expenses/${id}`),
    analytics: ()       => api.get('/expenses/analytics/finance')
  },

  // â”€â”€â”€ Daily Tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  dailyTasks: {
    list:       (params) => api.get('/tasks', params),
    create:     (data)   => api.post('/tasks', data),
    update:     (id, d)  => api.put(`/tasks/${id}`, d),
    delete:     (id)     => api.delete(`/tasks/${id}`),
    getSummary: (params) => api.get('/tasks/summary', params)
  },

  // â”€â”€â”€ Members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  members: {
    list:   (params) => api.get('/members', params),
    create: (data)   => api.post('/members', data),
    update: (id, d)  => api.put(`/members/${id}`, d),
    delete: (id)     => api.delete(`/members/${id}`)
  },

  // â”€â”€â”€ Proposals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  proposals: {
    list:        (params) => api.get('/proposals', params),
    getVersions: (id)     => api.get(`/proposals/${id}/versions`),
    upload:      (data)   => api.upload('/proposals/upload', data),
    updateStatus:(id, s)  => api.request('PATCH', `/proposals/${id}/status`, { status: s })
  }
};


