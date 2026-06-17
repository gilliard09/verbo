// Nome do cache para versionamento
const CACHE_NAME = 'verbo-v1';

// Arquivos críticos para o carregamento offline (App Shell)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png'
];

// 1. Instalação: Armazena os arquivos no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Ativação: Remove caches antigos que não são mais necessários
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Fetch: Intercepta requisições de rede
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Retorna do cache se existir, caso contrário busca na rede
      return cachedResponse || fetch(event.request);
    })
  );
});

// 4. Push Notifications: Ouvinte de eventos enviados pelo servidor
self.addEventListener('push', (event) => {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Verbo', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Novo conteúdo disponível no seu devocional!',
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: '/' } // URL para onde o app deve ir ao clicar
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Verbo', options)
  );
});

// 5. Clique na notificação: Abre o PWA
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});