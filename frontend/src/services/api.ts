import axios from 'axios';

// Environment-aware API configuration
const getApiBaseUrl = () => {
  // In production (Netlify), no backend API needed - app works standalone
  if (import.meta.env.PROD) {
    return null; // Return null to disable API calls in production
  }
  // In development, use the proxy or direct backend URL
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
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
