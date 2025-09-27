import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg', 'logo-modern.svg', 'logo-text.svg', 'png/*.png'],
      manifest: {
        name: 'Handover App',
        short_name: 'Handover',
        description: 'A mobile-friendly, installable web app for property handover reports.',
        start_url: '.',
        display: 'standalone',
        background_color: '#f8f6f4',
        theme_color: '#bc9e7b',
        icons: [
          {
            src: '/png/120x120.png',
            sizes: '120x120',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/png/48x48.png',
            sizes: '48x48',
            type: 'image/png'
          },
          {
            src: '/png/192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/png/192x192.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheKeyWillBeUsed: async ({ request }) => {
                return `${request.url}?v=2`;
              }
            }
          }
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: true
      }
    }),
  ],
});
