// ============================================================
//  FlowDay — Service Worker
//  Обеспечивает работу в офлайн-режиме и кеширование
// ============================================================

const CACHE_NAME = 'flowday-v1';

// Файлы, которые будут кешироваться при установке
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-ico.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Установка Service Worker — кешируем файлы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Кеширование файлов...');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] Установка завершена!');
        return self.skipWaiting();
      })
  );
});

// Активация — удаляем старые кеши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Удаляем старый кеш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      console.log('[SW] Активация завершена!');
      return self.clients.claim();
    })
  );
});

// Перехват запросов — отдаём из кеша или загружаем с сети
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Если есть в кеше — отдаём
        if (response) {
          return response;
        }
        // Иначе загружаем из сети
        return fetch(event.request)
          .then((response) => {
            // Проверяем, что ответ валидный
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            // Кешируем новый файл для будущих запросов
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          })
          .catch(() => {
            // Если нет сети и нет кеша — показываем страницу офлайн
            return new Response('Нет подключения к интернету', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.text() : 'Напоминание!';
  const options = {
    body: data,
    icon: '/android-chrome-192x192.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'close', title: 'Закрыть' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification('🌊 FlowDay', options)
  );
});
