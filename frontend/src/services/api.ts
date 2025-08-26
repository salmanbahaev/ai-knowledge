import axios, { AxiosInstance, AxiosError } from 'axios';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: any) => {
    // Add any auth tokens here when implemented
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: any) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 404) {
      console.warn('API endpoint not found:', error.config?.url);
    } else if (error.response?.status && error.response.status >= 500) {
      console.error('Server error:', error.message);
    }
    return Promise.reject(error);
  }
);

export { api };
