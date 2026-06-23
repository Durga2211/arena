import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleLogin: (token) => api.post('/auth/google', { token }),
  getMe: () => api.get('/auth/me'),
};

// Wallet API
export const walletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  addMoney: (amount) => api.post('/wallet/add-money', { amount }),
  verifyPayment: (data) => api.post('/wallet/verify-payment', data),
  withdraw: (data) => api.post('/wallet/withdraw', data),
  getTransactions: () => api.get('/wallet/transactions'),
};

// Room API
export const roomAPI = {
  getAvailable: () => api.get('/rooms/available'),
  join: (entryFeeOrData) => {
    const data = typeof entryFeeOrData === 'object' ? entryFeeOrData : { entryFee: entryFeeOrData };
    return api.post('/rooms/join', data);
  },
  leave: (roomId) => api.post(`/rooms/${roomId}/leave`),
  getDetails: (roomId) => api.get(`/rooms/${roomId}`),
  getHistory: () => api.get('/rooms/history'),
};

// Leaderboard API
export const leaderboardAPI = {
  getTop: () => api.get('/leaderboard'),
};

export const paymentAPI = {
  createOrder: (amount) => api.post('/payment/create-order', { amount }),
  verifyPayment: (data) => api.post('/payment/verify-payment', data),
};

export const adminAPI = {
  getStats: (password) => api.get('/admin/stats', { headers: { 'x-admin-password': password } }),
  getTransactions: (password) => api.get('/admin/transactions', { headers: { 'x-admin-password': password } }),
  getActiveRooms: (password) => api.get('/admin/rooms', { headers: { 'x-admin-password': password } }),
  createRoom: (password, data) => api.post('/admin/rooms', data, { headers: { 'x-admin-password': password } }),
  endRoom: (password, roomId) => api.post(`/admin/rooms/${roomId}/end`, {}, { headers: { 'x-admin-password': password } }),
  getLiveRoomStats: (password, roomId) => api.get(`/admin/rooms/${roomId}/live`, { headers: { 'x-admin-password': password } }),
  getWithdrawals: (password) => api.get('/admin/withdrawals', { headers: { 'x-admin-password': password } }),
  approveWithdrawal: (password, id) => api.post(`/admin/withdrawals/${id}/approve`, {}, { headers: { 'x-admin-password': password } }),
};

export default api;
