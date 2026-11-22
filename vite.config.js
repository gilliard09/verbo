// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Usa o Service Worker próprio para combinar precache do app e push.
      // O registro é feito manualmente em App.jsx, sem uma segunda inscrição.
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],

      injectManifest: {
        globPatterns: ['**/*.{html,css,js,ico,svg,png,jpg,jpeg,webp,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },

      // Manifest do PWA
      manifest: {
        name: 'Verbo — Plataforma do Pregador',
        short_name: 'Verbo',
        description: 'Escreva, leia e pregue seus sermões com o Verbo.',
        theme_color: '#6D28D9',
        background_color: '#6D28D9',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
});
