import axios from 'axios';
import { getActiveConfig } from '../config/api';

// Centralized Axios client for JTS ERP E-Commerce Storefront
const apiClient = axios.create({
  baseURL: getActiveConfig().ecommerceApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach customer JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('customer_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle common errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (localStorage.getItem('customer_token')) {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_data');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
