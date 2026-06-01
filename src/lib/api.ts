/// <reference types="vite/client" />
/**
 * API SERVICE HELPER
 * Gateway for communication between Frontend (Vercel) and Backend (GCP VM SQL)
 */

// Pastikan tidak ada trailing slash di akhir base URL
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// Helper to get headers with Bearer token
const getHeaders = () => {
  const token = localStorage.getItem('pos_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const apiService = {
  // --- AUTH ---
  async login(tenantId: string, pin: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, pin }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login gagal');

    // Save token for future requests
    localStorage.setItem('pos_token', data.token);
    return data;
  },

  async superadminLogin(email: string) {
    const response = await fetch(`${API_BASE_URL}/auth/superadmin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Superadmin login gagal');
    localStorage.setItem('pos_token', data.token);
    return data;
  },

  logout() {
    localStorage.removeItem('pos_token');
  },

  // --- TENANTS ---
  async getTenant(id: string) {
    const response = await fetch(`${API_BASE_URL}/tenants/${id}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal mengambil data toko');
    return response.json();
  },

  async createTenant(tenantData: any) {
    const response = await fetch(`${API_BASE_URL}/tenants`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(tenantData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal mendaftarkan toko baru');
    return data;
  },

  async updateTenant(id: string, tenantData: any) {
    const response = await fetch(`${API_BASE_URL}/tenants/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(tenantData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal menyimpan data toko');
    return data;
  },

  async deleteTenant(id: string) {
    const response = await fetch(`${API_BASE_URL}/tenants/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal menghapus toko');
    return response.json();
  },

  // --- PRODUCTS ---
  async getProducts(tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/products/${tenantId}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal mengambil daftar produk');
    return response.json();
  },

  async createProduct(tenantId: string, product: any) {
    const response = await fetch(`${API_BASE_URL}/products/${tenantId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(product),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal membuat produk');
    return data;
  },

  async updateProduct(tenantId: string, productId: string, product: any) {
    const response = await fetch(`${API_BASE_URL}/products/${tenantId}/${productId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(product),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal update produk');
    return data;
  },

  async deleteProduct(tenantId: string, productId: string) {
    const response = await fetch(`${API_BASE_URL}/products/${tenantId}/${productId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal menghapus produk');
    return response.json();
  },

  // --- STOCK LOGS ---
  async createStockLog(tenantId: string, log: any) {
    const response = await fetch(`${API_BASE_URL}/stock-logs/${tenantId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(log),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal membuat log stok');
    return data;
  },

  // --- TRANSACTIONS ---
  async saveTransaction(tenantId: string, transaction: any) {
    const response = await fetch(`${API_BASE_URL}/transactions/${tenantId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(transaction),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal menyimpan transaksi');
    return data;
  },

  async getTransactions(tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/transactions/${tenantId}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal mengambil riwayat transaksi');
    return response.json();
  },

  // --- CASHIER SESSIONS ---
  async getActiveSession(tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/sessions/${tenantId}/active`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal mengambil sesi aktif');
    return response.json();
  },

  async openSession(sessionData: any) {
    const response = await fetch(`${API_BASE_URL}/sessions/open`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(sessionData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal membuka sesi baru');
    return data;
  },

  async closeSession(sessionData: any) {
    const response = await fetch(`${API_BASE_URL}/sessions/close`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(sessionData)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal menutup sesi');
    return data;
  },

  async getSessions(tenantId: string, filters?: { date_from?: string; date_to?: string; cashier_uid?: string }) {
    const params = new URLSearchParams();
    if (filters?.date_from) params.set('date_from', filters.date_from);
    if (filters?.date_to) params.set('date_to', filters.date_to);
    if (filters?.cashier_uid) params.set('cashier_uid', filters.cashier_uid);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await fetch(`${API_BASE_URL}/sessions/${tenantId}${qs}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal mengambil riwayat sesi');
    return response.json();
  },

  // --- KAS BESAR & MUTATIONS ---
  async getKasBesar(tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/kas-besar/${tenantId}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal mengambil saldo Kas Besar');
    return response.json();
  },

  async syncKasBesar(tenantId: string, balance: number) {
    const response = await fetch(`${API_BASE_URL}/kas-besar/${tenantId}/sync`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ balance })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal sinkronisasi Kas Besar');
    return data;
  },

  async getMutations(tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/mutations/${tenantId}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal mengambil riwayat mutasi');
    return response.json();
  },

  async createMutation(tenantId: string, mutation: any) {
    const response = await fetch(`${API_BASE_URL}/mutations/${tenantId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(mutation)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Gagal membuat mutasi baru');
    return data;
  },

  async getTenants() {
    const response = await fetch(`${API_BASE_URL}/tenants`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal mengambil daftar toko');
    return response.json();
  },

  // --- ADMIN ---
  async getLoginStats() {
    const response = await fetch(`${API_BASE_URL}/admin/login-stats`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal mengambil statistik keamanan');
    return response.json();
  },

  async getStockLogs(tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/stock-logs/${tenantId}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal mengambil log riwayat stok');
    return response.json();
  },

  // --- SYSTEM ---
  async resetTenantData(tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/tenants/${tenantId}/reset`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Gagal mereset data toko');
    return response.json();
  }
};
