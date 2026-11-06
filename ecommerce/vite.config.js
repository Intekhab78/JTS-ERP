import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isOnlineMode = env.VITE_API_MODE === 'online' && mode === 'production';

  // Target resolves to local backend in development so local routes & models are used
  const target = isOnlineMode 
    ? (env.VITE_ONLINE_BACKEND_URL || 'https://erpapi.jtsmiddleeast.com')
    : (env.VITE_LOCAL_BACKEND_URL || 'http://localhost:5000');

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
