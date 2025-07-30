// NYLA GO PWA - Service Worker

const CACHE_NAME = 'nyla-go-pwa-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/splash.css',
  '/js/app.js',
  '/lib/qr-simple.js',
  '/manifest.json',
  '/video/NYLAGo.mp4',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon-16.png',
  '/favicon-32.png',
  '/apple-touch-icon.png'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  console.log('NYLA GO PWA: Service Worker installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('NYLA GO PWA: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('NYLA GO PWA: Service Worker activating');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('NYLA GO PWA: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip external QR generation APIs
  if (event.request.url.includes('api.qrserver.com') || 
      event.request.url.includes('chart.googleapis.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request for fetch
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(function(response) {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response for caching
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(function() {
          // Network failed, try to return cached fallback
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Background sync for offline QR generation (future feature)
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-qr-generation') {
    console.log('NYLA GO PWA: Background sync triggered');
    // Future: Handle offline QR generation requests
  }
});

// Push notifications (future feature)
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    console.log('NYLA GO PWA: Push notification received', data);
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data: data.url
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

console.log('NYLA GO PWA: Service Worker loaded');