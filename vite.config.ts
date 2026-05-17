import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.svg'],
      manifest: {
        name: 'Tally Web',
        short_name: 'TallyWeb',
        description: 'Tally ERP Business Analytics',
        theme_color: '#1565C0',
        background_color: '#1565C0',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/dashboard',
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/icons/icon-192.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https?.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'tally-web-cache', networkTimeoutSeconds: 10 },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api/tally': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tally/, ''),
        timeout: 120000, // 2 minutes timeout for Tally API
        proxyTimeout: 120000, // 2 minutes proxy timeout
      }
    }
  }
});
