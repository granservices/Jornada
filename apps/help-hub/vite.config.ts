/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export function atendimentoManualChunks(id: string) {
  const moduleId = id.replaceAll('\\', '/');

  if (moduleId.includes('/node_modules/react/') || moduleId.includes('/node_modules/react-dom/')) {
    return 'vendor-react';
  }

  if (moduleId.includes('/node_modules/react-router/')) {
    return 'vendor-router';
  }

  if (moduleId.includes('/node_modules/@tanstack/')) {
    return 'vendor-query';
  }

  if (moduleId.includes('/node_modules/motion/')) {
    return 'vendor-motion';
  }

  if (moduleId.includes('/node_modules/lucide-react/')) {
    return 'vendor-icons';
  }

  if (
    moduleId.includes('/node_modules/react-aria-components/') ||
    moduleId.includes('/node_modules/@react-aria/') ||
    moduleId.includes('/node_modules/@react-stately/') ||
    moduleId.includes('/node_modules/@react-types/') ||
    moduleId.includes('/node_modules/@internationalized/')
  ) {
    return 'vendor-aria';
  }

  return undefined;
}

export default defineConfig({
  publicDir: '../jornada/public',
  build: {
    rolldownOptions: {
      output: {
        manualChunks: atendimentoManualChunks
      }
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['crew-logo.ico', 'crew-logo.png'],
      manifest: {
        name: 'HelpHub',
        short_name: 'HelpHub',
        description: 'Workspace operacional de atendimento da GranServices.',
        theme_color: '#17191c',
        background_color: '#17191c',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'crew-logo.png',
            sizes: '63x63',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: '@jornada/frontend-core/test-setup',
    globals: false,
    css: false,
    testTimeout: 10_000
  }
});
