import axios from 'axios';

// Backend endpoints configuration matching frontend/.env
export const ONLINE_API_URL = import.meta.env.VITE_ONLINE_API_URL || 'https://erpapi.jtsmiddleeast.com/api/v1';
export const ONLINE_BACKEND_URL = import.meta.env.VITE_ONLINE_BACKEND_URL || 'https://erpapi.jtsmiddleeast.com';

export const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:5000/api/v1';
export const LOCAL_BACKEND_URL = import.meta.env.VITE_LOCAL_BACKEND_URL || 'http://localhost:5000';

const STORAGE_KEY = 'jts_ecommerce_api_mode';

/**
 * Determine if running in a local browser environment
 */
export const isLocalEnvironment = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
};

/**
 * Get current configured API mode: 'online' | 'local' | 'auto'
 */
export const getApiMode = () => {
  // Check user preference in localStorage (both ecommerce and global ERP keys)
  const saved = localStorage.getItem('jts_ecommerce_api_mode') || localStorage.getItem('jts_api_mode');
  if (saved && (saved === 'local' || saved === 'online')) {
    return saved;
  }

  // If running in local browser environment (localhost / 127.0.0.1), default to local backend
  if (isLocalEnvironment()) {
    return 'local';
  }

  return import.meta.env.VITE_API_MODE || 'online';
};

/**
 * Switch API mode and persist preference
 */
export const setApiMode = (mode) => {
  localStorage.setItem('jts_ecommerce_api_mode', mode);
  localStorage.setItem('jts_api_mode', mode);
  setupAxios();
  window.dispatchEvent(new Event('jts_api_mode_changed'));
};

/**
 * Get active configuration matching frontend architecture
 */
export const getActiveConfig = () => {
  const mode = getApiMode();

  if (mode === 'local') {
    return {
      mode: 'local',
      apiUrl: LOCAL_API_URL,
      backendUrl: LOCAL_BACKEND_URL,
      ecommerceApiUrl: `${LOCAL_BACKEND_URL}/api/v1/ecommerce`,
      isLocal: true,
      isOnline: false,
    };
  }

  // Default to online
  return {
    mode: 'online',
    apiUrl: ONLINE_API_URL,
    backendUrl: ONLINE_BACKEND_URL,
    ecommerceApiUrl: `${ONLINE_BACKEND_URL}/api/v1/ecommerce`,
    isLocal: false,
    isOnline: true,
  };
};

export const API_BASE_URL = getActiveConfig().apiUrl;
export const SERVER_URL = getActiveConfig().backendUrl;
export const BACKEND_URL = SERVER_URL;

/**
 * Configure global Axios defaults and interceptors (identical to frontend)
 * Automatically redirects relative /api/v1/... and /uploads/... calls
 */
export const setupAxios = () => {
  const active = getActiveConfig();
  axios.defaults.baseURL = active.backendUrl;

  axios.interceptors.request.use(
    (config) => {
      const current = getActiveConfig();

      if (config.url) {
        // If request is relative, rewrite to active backend URL
        if (config.url.startsWith('/api/v1')) {
          config.url = `${current.backendUrl}${config.url}`;
        } else if (config.url.startsWith('http://localhost:5000')) {
          config.url = config.url.replace(/http:\/\/localhost:5000/g, current.backendUrl);
        } else if (config.url.startsWith('/uploads')) {
          config.url = `${current.backendUrl}${config.url}`;
        }
      }

      // Attach customer token if available
      const token = localStorage.getItem('customer_token');
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );
};

// Initialize Axios immediately upon module load
setupAxios();

