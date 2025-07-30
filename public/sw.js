// Service Worker simple para notificaciones
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push event recibido:', event);
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nueva notificación',
      icon: data.icon || '/assets/icons/notification-icon.png',
      badge: data.badge || '/assets/icons/badge-icon.png',
      tag: data.tag || 'default',
      renotify: true
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Notificación', options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notificación clickeada:', event);
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
}); 