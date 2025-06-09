// Cache name
const CACHE_NAME = 'story-app-v1';

// Assets to cache - hanya cache file yang pasti ada
const urlsToCache = [
  '/',
  '/index.html',
  '/images/icon-192x192.png',
  '/images/badge-72x72.png'
];

// Service Worker Lifecycle Events
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(error => {
              console.error(`Failed to cache ${url}:`, error);
            })
          )
        );
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim());

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);

    const options = {
      body: data.options.body,
      icon: '/images/icon-192x192.png',
      badge: '/images/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.options.data.url
      },
      actions: [
        {
          action: 'open',
          title: 'Buka'
        },
        {
          action: 'close',
          title: 'Tutup'
        }
      ]
    };

    console.log('Showing notification with options:', options);
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('Error handling push event:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow(event.notification.data.url);
    })
  );
});

// Fetch event - strategi caching yang diperbaiki untuk Vite
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip requests to external APIs
  if (event.request.url.includes('story-api.dicoding.dev')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        // Clone request karena request adalah stream
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check jika response valid
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone response karena response adalah stream
          const responseToCache = response.clone();
          const url = event.request.url;

          // Cache assets secara dinamis (CSS, JS, images)
          if (url.includes('/assets/') || 
              url.endsWith('.css') || 
              url.endsWith('.js') ||
              url.endsWith('.png') ||
              url.endsWith('.jpg') ||
              url.endsWith('.jpeg') ||
              url.endsWith('.gif') ||
              url.endsWith('.svg')) {
            
            console.log('Caching asset:', url);
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('Failed to cache asset:', url, error);
              });
          }

          return response;
        }).catch((error) => {
          console.error('Fetch failed for:', event.request.url, error);
          
          // Fallback untuk offline
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
          
          // Untuk assets yang gagal, coba cari di cache dengan pattern matching
          if (event.request.url.includes('/assets/')) {
            return caches.open(CACHE_NAME).then(cache => {
              return cache.keys().then(keys => {
                // Cari file dengan nama yang mirip (tanpa hash)
                const requestPath = new URL(event.request.url).pathname;
                const fileName = requestPath.split('/').pop().split('.')[0];
                const fileExt = requestPath.split('.').pop();
                
                for (let key of keys) {
                  const keyPath = new URL(key.url).pathname;
                  if (keyPath.includes(fileName) && keyPath.endsWith(`.${fileExt}`)) {
                    return cache.match(key);
                  }
                }
                return null;
              });
            });
          }
          
          throw error;
        });
      })
  );
});