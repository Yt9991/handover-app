import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
            src: '/logo.svg',
            sizes: '120x120',
            type: 'image/svg+xml',
          },
          {
            src: '/favicon.svg',
            sizes: '48x48',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
});
