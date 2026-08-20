import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['crew-logo.ico', 'crew-logo.png'],
      manifest: {
        name: 'Jornada',
        short_name: 'Jornada',
        description: 'Hub operacional mobile-first da Gran Services.',
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
        enabled: true,
      },
    }),
  ],
});
