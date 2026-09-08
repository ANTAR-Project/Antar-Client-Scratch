import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = env.VITE_API_URL || 'http://localhost:8081'; // nas-orchestrator
  const host = new URL(apiUrl).hostname;

  return {
    plugins: [react(), tailwindcss()],

    server: {
      host: true,
      proxy: {
        // nas-orchestrator  :8081  — file ops + stream ops
        '/api/v1/nas-orchestrator': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
        },
        // streaming-service :8084
        '/api/v1/stream': {
          target: `http://${host}:8084`,
          changeOrigin: true,
          secure: false,
        },
        // video-service     :8082
        '/api/v1/videos': {
          target: `http://${host}:8082`,
          changeOrigin: true,
          secure: false,
        },
        // auth-service      :8085
        '/api/v1/auth-service': {
          target: `http://${host}:8085`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

