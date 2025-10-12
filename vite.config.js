import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return defineConfig({
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
    },
    // Force-inject critical VITE_ envs so they are always defined in the client
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || ''),
      'import.meta.env.VITE_KAKAO_MAP_API_KEY': JSON.stringify(env.VITE_KAKAO_MAP_API_KEY || ''),
    },
  });
};
