/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react-router')) {
            return 'router-vendor';
          }

          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }

          if (id.includes('motion')) {
            return 'motion-vendor';
          }

          if (id.includes('lucide-react')) {
            return 'icons-vendor';
          }

          if (id.includes('react-virtuoso')) {
            return 'virtuoso-vendor';
          }

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'react-vendor';
          }

          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['crew-logo.ico', 'crew-logo.png'],
      manifest: {
        name: 'Jornada',
        short_name: 'Jornada',
        description: 'Hub operacional mobile-first da GranServices.',
        theme_color: '#f3f5f7',
        background_color: '#f3f5f7',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'crew-logo.png',
            sizes: '63x63',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: false,
    css: false,
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 10_000,
  },
});
