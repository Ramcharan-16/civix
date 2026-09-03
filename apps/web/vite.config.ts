import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:5000';

  const proxyConfig = {
    '/api': {
      target: apiTarget,
      changeOrigin: true,
      secure: false,
      configure: (proxy: any) => {
        proxy.on('error', (_err: any, _req: any, res: any) => {
          if (res && 'writeHead' in res && !res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Backend service is starting up or unreachable. Please ensure API server on port 5000 is running.' }));
          }
        });
      }
    },
    '/whatsapp': {
      target: apiTarget,
      changeOrigin: true,
      secure: false
    }
  };

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: proxyConfig
    },
    preview: {
      port: 5173,
      host: true,
      proxy: proxyConfig
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-leaflet': ['leaflet'],
            'vendor-icons': ['lucide-react'],
            'vendor-three': ['three']
          }
        }
      }
    }
  };
});

