import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isLocalMode = env.VITE_API_MODE === 'local';

  // Target resolves dynamically based on .env mode
  const target = isLocalMode 
    ? (env.VITE_LOCAL_BACKEND_URL || 'http://localhost:5000') 
    : (env.VITE_ONLINE_BACKEND_URL || 'https://erpapi.jtsmiddleeast.com');

  return {
    plugins: [react()],
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});
