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
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
