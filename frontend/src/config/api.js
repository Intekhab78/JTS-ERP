import axios from 'axios';

// Backend endpoints configuration
export const ONLINE_API_URL = import.meta.env.VITE_ONLINE_API_URL || 'https://erpapi.jtsonline.shop/api/v1';
export const ONLINE_BACKEND_URL = import.meta.env.VITE_ONLINE_BACKEND_URL || 'https://erpapi.jtsonline.shop';

export const LOCAL_API_URL = import.meta.env.VITE_LOCAL_API_URL || '/api/v1';
export const LOCAL_BACKEND_URL = import.meta.env.VITE_LOCAL_BACKEND_URL || 'http://localhost:5000';

const STORAGE_KEY = 'jts_api_mode';

/**
 * Determine if running in a local browser environment (localhost / 127.0.0.1)
 */
export const isLocalEnvironment = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
};

/**
 * Get current configured API mode: 'auto' | 'local' | 'online'
 */
export const getApiMode = () => {
  if (typeof window === 'undefined') return 'online';
  
  // Production hosts always use online backend
  if (!isLocalEnvironment()) {
    return 'online';
  }

  const savedMode = localStorage.getItem(STORAGE_KEY);
  if (savedMode && ['auto', 'local', 'online'].includes(savedMode)) {
    return savedMode;
  }

  return import.meta.env.VITE_API_MODE || 'auto';
};

/**
 * Get resolved API and Backend URLs based on current mode
 */
export const getActiveConfig = () => {
  const mode = getApiMode();

  if (mode === 'local') {
    return {
      mode: 'local',
      apiUrl: LOCAL_API_URL,
      backendUrl: LOCAL_BACKEND_URL,
      isLocal: true,
      isOnline: false,
    };
  }

  if (mode === 'online') {
    return {
      mode: 'online',
      apiUrl: ONLINE_API_URL,
      backendUrl: ONLINE_BACKEND_URL,
      isLocal: false,
      isOnline: true,
    };
  }

  // 'auto' mode:
  // When running locally in auto mode, default to Online unless local backend flag is set
  const autoTarget = localStorage.getItem('jts_auto_resolved_target') || 'online';
  const isLocalTarget = autoTarget === 'local';

  return {
    mode: 'auto',
    resolvedTarget: autoTarget,
    apiUrl: isLocalTarget ? LOCAL_API_URL : ONLINE_API_URL,
    backendUrl: isLocalTarget ? LOCAL_BACKEND_URL : ONLINE_BACKEND_URL,
    isLocal: isLocalTarget,
    isOnline: !isLocalTarget,
  };
};

// Current active URLs
export const API_BASE_URL = getActiveConfig().apiUrl;
export const SERVER_URL = getActiveConfig().backendUrl;
export const BACKEND_URL = SERVER_URL;

/**
 * Switch backend mode: 'auto' | 'local' | 'online'
 */
export const setApiMode = (newMode) => {
  if (!['auto', 'local', 'online'].includes(newMode)) return;
  localStorage.setItem(STORAGE_KEY, newMode);
  // Dispatch custom event for UI updates
  window.dispatchEvent(new CustomEvent('jts_api_mode_changed', { detail: newMode }));
  // Reload page to apply fresh axios defaults and clear any cached states
  window.location.reload();
};

/**
 * Set auto-resolved target ('local' or 'online')
 */
export const setAutoResolvedTarget = (target) => {
  if (!['local', 'online'].includes(target)) return;
  localStorage.setItem('jts_auto_resolved_target', target);
  window.dispatchEvent(new CustomEvent('jts_api_mode_changed', { detail: target }));
};

/**
 * Generate full URL for static assets (images, documents)
 */
export const getFileUrl = (path) => {
  if (!path) return '';
  if (typeof path !== 'string') return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    // If it already contains localhost, rewrite to active backend
    const active = getActiveConfig();
    if (path.includes('localhost:5000')) {
      return path.replace(/http:\/\/localhost:5000/g, active.backendUrl);
    }
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${getActiveConfig().backendUrl}${cleanPath}`;
};

/**
 * Generate full API endpoint URL
 */
export const getApiUrl = (endpoint = '') => {
  const active = getActiveConfig();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith('/api/v1')) {
    return `${active.backendUrl}${cleanEndpoint}`;
  }
  return `${active.apiUrl}${cleanEndpoint}`;
};

/**
 * Check if local backend server is running
 */
export const pingLocalBackend = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(`${LOCAL_BACKEND_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Configure global Axios defaults and interceptors
 */
export const setupAxios = () => {
  const active = getActiveConfig();
  axios.defaults.baseURL = active.backendUrl;

  // Request Interceptor:
  // 1. Rewrite any hardcoded localhost URLs to active backend URL
  // 2. Map relative paths /api/v1/... to active server
  // 3. Auto-attach Authorization Bearer token if not already attached
  axios.interceptors.request.use(
    (config) => {
      const current = getActiveConfig();

      if (config.url) {
        // Rewrite legacy localhost:5000
        if (config.url.startsWith('/api/v1')) {
          config.url = config.url.replace('/api/v1', current.apiUrl);
        } else if (config.url.startsWith('http://localhost:5000')) {
          config.url = config.url.replace('http://localhost:5000', current.backendUrl);
        } else if (config.url.startsWith('https://erpapi.jtsonline.shop/api/v1') && current.isLocal) {
          config.url = config.url.replace('https://erpapi.jtsonline.shop/api/v1', current.apiUrl);
        } else if (config.url.startsWith('https://erpapi.jtsonline.shop') && current.isLocal) {
          config.url = config.url.replace('https://erpapi.jtsonline.shop', current.backendUrl);
        } else if (config.url.startsWith('/api/v1')) {
          // Absolute path starting with /api/v1
          config.url = `${current.backendUrl}${config.url}`;
        }
      }

      // Auto-attach Bearer token if missing
      if (!config.headers.Authorization) {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor: Token Expiry & Unauthorized Handling
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        const url = error.config?.url || '';
        if (!url.includes('/auth/login')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
      return Promise.reject(error);
    }
  );
};

// Initialize Axios immediately upon module load
setupAxios();
