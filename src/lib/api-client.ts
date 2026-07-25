const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4321/api';

function getToken(): string | null {
  return localStorage.getItem('careconnect_api_token');
}

function setToken(token: string): void {
  localStorage.setItem('careconnect_api_token', token);
}

function clearToken(): void {
  localStorage.removeItem('careconnect_api_token');
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error: ${res.status}`);
  return data;
}

export const apiClient = {
  async register(userData: any): Promise<{ user: any; profile: any; token: string }> {
    const res = await request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
    if (res.token) setToken(res.token);
    return res;
  },

  async login(email: string, password: string): Promise<{ user: any; profile: any; token: string }> {
    const res = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (res.token) setToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try { await request('/auth/logout', { method: 'POST' }); } catch {}
    clearToken();
  },

  async me(): Promise<{ user: any; profile: any }> {
    return request('/auth/me');
  },

  async getCollection<T = any>(collection: string, filter?: Record<string, any>): Promise<T[]> {
    const query = filter ? `?filter=${encodeURIComponent(JSON.stringify(filter))}` : '';
    const res = await request(`/data/${collection}${query}`);
    return res.data;
  },

  async getById<T = any>(collection: string, id: string): Promise<T> {
    const res = await request(`/data/${collection}/${id}`);
    return res.data;
  },

  async insertItem<T = any>(collection: string, item: any): Promise<T> {
    const res = await request(`/data/${collection}`, { method: 'POST', body: JSON.stringify(item) });
    return res.data;
  },

  async updateItem<T = any>(collection: string, id: string, updates: any): Promise<T> {
    const res = await request(`/data/${collection}/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
    return res.data;
  },

  async deleteItem(collection: string, id: string): Promise<void> {
    await request(`/data/${collection}/${id}`, { method: 'DELETE' });
  },

  async verifyEntity(entityId: string, status: string, notes?: string): Promise<any> {
    return request('/admin/verify-entity', { method: 'POST', body: JSON.stringify({ entity_id: entityId, status, notes }) });
  },

  async getAuditLogs(): Promise<any[]> {
    const res = await request('/admin/audit-logs');
    return res.data;
  },

  async getStats(): Promise<Record<string, number>> {
    const res = await request('/admin/stats');
    return res.data;
  },

  async healthCheck(): Promise<any> {
    return request('/health');
  },

  isConfigured(): boolean {
    return !!API_BASE && API_BASE !== '';
  },

  getToken,
  setToken,
  clearToken,
};

export default apiClient;
