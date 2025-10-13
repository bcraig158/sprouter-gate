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

// Get current domain for tracking (removed unused function)

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
    const response = await api.post('/login', {
      studentId
    });
    return response.data;
  },

  loginVolunteer: async (code: string, email: string) => {
    const response = await api.post('/volunteer-login', {
      volunteerCode: code,
      email
    });
    return response.data;
  },

  loginAdmin: async (code: string) => {
    const response = await api.post('/volunteer-login', {
      volunteerCode: code,
      email: 'admin@maidu.com'
    });
    return response.data;
  },

  verifyToken: async (token: string) => {
    const response = await api.post('/.netlify/functions/auth', {
      action: 'verify_token',
      token
    });
    return response.data;
  }
};

// Analytics service
export const analyticsService = {
  getAnalytics: async (token: string) => {
    const response = await api.get('/.netlify/functions/analytics', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  }
};

export default api;
