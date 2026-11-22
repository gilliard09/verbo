// Service Worker do Verbo
// O vite-plugin-pwa injeta os arquivos do build em self.__WB_MANIFEST.
// O cache local de sermões fica no IndexedDB; respostas autenticadas da API
// Supabase nunca são armazenadas pelo Service Worker.

const CACHE_NAME = 'verbo-app-shell-v2';
const PRECACHE_ENTRIES = self.__WB_MANIFEST || [];
const PRECACHE_URLS = PRECACHE_ENTRIES
  .map((entry) => typeof entry === 'string' ? entry : entry.url)
  .filter(Boolean);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Não intercepta APIs externas (incluindo Supabase): os dados do usuário
  // são disponibilizados offline pelo IndexedDB, isolados por user_id.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('/index.html')) || Response.error();
      })
    );
    return;
  }

  const isStaticAsset = /\.(?:js|css|ico|svg|png|jpe?g|webp|woff2|webmanifest)$/i.test(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
  );
});

// Push Notifications
self.addEventListener('push', (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Verbo', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Novo conteúdo disponível no seu devocional!',
    icon: '/logo.webp',
    badge: '/logo.webp',
    data: { url: data.url || '/' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Verbo', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
