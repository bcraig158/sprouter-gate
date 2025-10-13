import axios from 'axios';

// Environment-aware API configuration
const getApiBaseUrl = () => {
  // In development, use the proxy (Vite handles this automatically)
  if (import.meta.env.DEV) {
    return '/api'; // Use proxy in development
  }
  // In production, use Netlify Functions
  return '/.netlify/functions/api';
};

// Get current domain for tracking
const getCurrentDomain = () => {
  return window.location.hostname;
};

const api = axios.create({
  baseURL: getApiBaseUrl() || undefined,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('sessionId');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication service
export const authService = {
  loginStudent: async (studentId: string) => {
    const response = await api.post('/auth', {
      action: 'login_student',
      studentId,
      domain: getCurrentDomain()
    });
    return response.data;
  },

  loginVolunteer: async (code: string, email: string) => {
    const response = await api.post('/auth', {
      action: 'login_volunteer',
      code,
      email,
      domain: getCurrentDomain()
    });
    return response.data;
  },

  loginAdmin: async (code: string) => {
    const response = await api.post('/auth', {
      action: 'login_admin',
      code,
      domain: getCurrentDomain()
    });
    return response.data;
  },

  verifyToken: async (token: string) => {
    const response = await api.post('/auth', {
      action: 'verify_token',
      token
    });
    return response.data;
  }
};

// Analytics service
export const analyticsService = {
  getAnalytics: async (token: string) => {
    const response = await api.get('/analytics', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
};

export default api;
