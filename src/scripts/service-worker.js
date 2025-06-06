// Service Worker Lifecycle Events
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  // Claim clients to ensure service worker controls all pages
  event.waitUntil(clients.claim());
});

self.addEventListener('push', function(event) {
  console.log('Push event received:', event);
  
  if (!event.data) {
    console.error('Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const options = {
      body: data.options.body,
      icon: '/src/images/icon-192x192.png',
      badge: '/src/images/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Lihat Cerita',
          icon: '/src/images/checkmark.png'
        },
        {
          action: 'close',
          title: 'Tutup',
          icon: '/src/images/xmark.png'
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

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
}); 