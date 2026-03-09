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
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],

      // Service Worker com Workbox
      workbox: {
        // Estratégia para assets estáticos: CacheFirst (instantâneo)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        runtimeCaching: [
          // Fontes do Google: CacheFirst por 1 ano
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Supabase REST (sermões, perfil): NetworkFirst com fallback pro cache
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 dias
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Imagens externas (capas de cursos, avatars): StaleWhileRevalidate
          {
            urlPattern: /^https:\/\/.*\.(supabase\.co\/storage|unsplash\.com|images\.)/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'imagens',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 dias
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Manifest do PWA (ícone, nome, cores)
      manifest: {
        name: 'Verbo — Plataforma do Pregador',
        short_name: 'Verbo',
        description: 'Escreva, leia e pregue seus sermões com o Verbo.',
        theme_color: '#5B2DFF',
        background_color: '#FDFDFF',
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

      // Desenvolvimento: ativa o SW mesmo em dev para testar
      devOptions: {
        enabled: false, // mude para true se quiser testar offline em dev
      },
    }),
  ],
});