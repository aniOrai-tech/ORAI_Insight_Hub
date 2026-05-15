/**
 * ORAI Insight Hub — API Client
 * Handles all HTTP requests to the backend
 */

const API_BASE = '/api';

const api = {
  // ─── Core fetch wrapper ────────────────────────────────────────
  async request(method, endpoint, data = null, isFormData = false) {
    const token = localStorage.getItem('orai_token');
    const headers = {};

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const config = { method, headers };
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
      console.error('API Error:', err);
      return { ok: false, data: { message: 'Network error. Please check your connection.' } };
    }
  },

  get:    (url, params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.request('GET', url + qs);
  },
  post:   (url, data)        => api.request('POST', url, data),
  put:    (url, data)        => api.request('PUT', url, data),
  patch:  (url, data)        => api.request('PATCH', url, data),
  delete: (url)              => api.request('DELETE', url),
  upload: (url, formData)    => api.request('POST', url, formData, true),
  uploadPut: (url, formData) => api.request('PUT', url, formData, true),

  // ─── Auth ─────────────────────────────────────────────────────
  auth: {
    login: (creds) => api.post('/auth/login', creds),
    verifyOTP: (data) => api.post('/auth/verify-otp', data),

    register: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
    changePassword: (data) => api.put('/auth/change-password', data),
    updateProfile: (data) => api.put('/auth/update-profile', data),
  },

  // ─── Users (Admin) ────────────────────────────────────────────
  users: {
    list: () => api.get('/users'),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
    toggleStatus: (id) => api.put(`/users/${id}/status`)
  },

  // ─── Meetings ─────────────────────────────────────────────────
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

  // ─── Bots ─────────────────────────────────────────────────────
  bots: {
    list:   (params) => api.get('/bots', params),
    get:    (id)     => api.get(`/bots/${id}`),
    create: (data)   => api.post('/bots', data),
    update: (id, d)  => api.put(`/bots/${id}`, d),
    delete: (id)     => api.delete(`/bots/${id}`)
  },

  // ─── Clients ──────────────────────────────────────────────────
  clients: {
    list:   (params) => api.get('/clients', params),
    get:    (id)     => api.get(`/clients/${id}`),
    create: (data)   => api.post('/clients', data),
    update: (id, d)  => api.put(`/clients/${id}`, d),
    delete: (id)     => api.delete(`/clients/${id}`)
  },

  // ─── Upsell ───────────────────────────────────────────────────
  upsell: {
    list:   (params) => api.get('/upsell', params),
    get:    (id)     => api.get(`/upsell/${id}`),
    create: (data)   => api.post('/upsell', data),
    update: (id, d)  => api.put(`/upsell/${id}`, d),
    delete: (id)     => api.delete(`/upsell/${id}`)
  },

  // ─── Requirements ─────────────────────────────────────────────
  requirements: {
    list:   (params) => api.get('/requirements', params),
    get:    (id)     => api.get(`/requirements/${id}`),
    create: (data)   => api.upload('/requirements', data),
    update: (id, d)  => api.put(`/requirements/${id}`, d),
    delete: (id)     => api.delete(`/requirements/${id}`)
  },

  // ─── Analytics ────────────────────────────────────────────────
  analytics: {
    get: () => api.get('/analytics')
  },

  // ─── WhatsApp Logins ──────────────────────────────────────────
  whatsapp: {
    list:   () => api.get('/whatsapp'),
    create: (data) => api.post('/whatsapp', data),
    update: (id, data) => api.put(`/whatsapp/${id}`, data),
    delete: (id) => api.delete(`/whatsapp/${id}`)
  },

  // ─── Health Checks ────────────────────────────────────────────
  healthchecks: {
    list:   (params) => api.get('/healthchecks', params),
    create: (data) => api.post('/healthchecks', data),
    update: (id, data) => api.put(`/healthchecks/${id}`, data),
    delete: (id) => api.delete(`/healthchecks/${id}`),
    generate: (data) => api.post('/healthchecks/generate', data)
  },

  // ─── Bulk Import ──────────────────────────────────────────────
  import: (module, formData) => api.upload(`/import/${module}`, formData),

  // ─── Tickets ──────────────────────────────────────────────────
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

  // ─── Invoices ─────────────────────────────────────────────────
  invoices: {
    list:   (params) => api.get('/invoices', params),
    get:    (id)     => api.get(`/invoices/${id}`),
    create: (data)   => api.post('/invoices', data),
    update: (id, d)  => api.put(`/invoices/${id}`, d),
    delete: (id)     => api.delete(`/invoices/${id}`)
  },

  // ─── Payments ─────────────────────────────────────────────────
  payments: {
    list:   (params) => api.get('/payments', params),
    create: (data)   => api.post('/payments', data),
    delete: (id)     => api.delete(`/payments/${id}`)
  },

  // ─── Expenses ─────────────────────────────────────────────────
  expenses: {
    list:      (params) => api.get('/expenses', params),
    create:    (data)   => api.post('/expenses', data),
    update:    (id, d)  => api.put(`/expenses/${id}`, d),
    delete:    (id)     => api.delete(`/expenses/${id}`),
    analytics: ()       => api.get('/expenses/analytics/finance')
  },

  // ─── Proposals ────────────────────────────────────────────────
  proposals: {
    list:        (params) => api.get('/proposals', params),
    getVersions: (id)     => api.get(`/proposals/${id}/versions`),
    upload:      (data)   => api.upload('/proposals/upload', data),
    updateStatus:(id, s)  => api.request('PATCH', `/proposals/${id}/status`, { status: s })
  }
};


