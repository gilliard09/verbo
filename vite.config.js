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

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.(supabase\.co\/storage|unsplash\.com|images\.)/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'imagens',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      manifest: {
        name: 'Verbo — Plataforma do Pregador',
        short_name: 'Verbo',
        description: 'Escreva, leia e pregue seus sermões com o Verbo.',
        theme_color: '#4C1D95',
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

      devOptions: {
        enabled: false,
      },
    }),
  ],

  // ✅ NOVO: Otimização de Build & Code Splitting
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    
    // 🔴 CRITICAL: Code Splitting Strategy
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor: Dependências pesadas separadas
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-vendor';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }
          if (id.includes('node_modules/@tiptap')) {
            return 'tiptap-vendor'; // Editor pesado
          }
          if (id.includes('node_modules/pdfjs-dist') || id.includes('node_modules/react-pdf')) {
            return 'pdf-vendor'; // PDF pesado — carrega só para Leitura/Biblioteca
          }
          if (id.includes('node_modules/@google/generative-ai')) {
            return 'ai-vendor'; // Google AI — carrega só para Editor
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
          // Utils e compostos menores
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },

    // 🔴 IMPORTANTE: Limpar warnings de chunk size
    chunkSizeWarningLimit: 1000, // 1MB limit (aumentado)
  },

  // ✅ Otimizar deps pré-bundling (acelera dev)
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['@google/generative-ai'], // Deixa esse lazy
  },
});