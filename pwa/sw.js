// NYLA GO PWA - Service Worker

const CACHE_NAME = 'nyla-go-pwa-v2.4.0';
const urlsToCache = [
  '/nyla-go/',
  '/nyla-go/index.html',
  '/nyla-go/css/styles.css',
  '/nyla-go/css/splash.css',
  '/nyla-go/css/tabs.css',
  '/nyla-go/css/desktop.css',
  '/nyla-go/css/mobile-gestures.css',
  '/nyla-go/css/nyla-assistant.css',
  '/nyla-go/js/app.js',
  '/nyla-go/js/nyla-assistant-v2.js',
  '/nyla-go/js/nyla-conversation-v2.js',
  '/nyla-go/js/nyla-llm-engine.js',
  '/nyla-go/js/nyla-ui-v2.js',
  '/nyla-go/js/nyla-knowledge-base.js',
  '/nyla-go/js/nyla-web-fetcher.js',
  '/nyla-go/js/nyla-knowledge-tracker.js',
  '/nyla-go/js/nyla-system-controller.js',
  '/nyla-go/lib/qr-simple.js',
  '/nyla-go/nylago-data.js',
  '/nyla-go/manifest.json',
  '/nyla-go/video/NYLAGo-v2.mp4',
  '/nyla-go/icons/icon-192.png',
  '/nyla-go/icons/icon-512.png',
  '/nyla-go/icons/NYLA.png',
  '/nyla-go/NYLAGO-Logo-v2.png',
  '/nyla-go/GO-BACKGROUND.png',
  '/nyla-go/favicon-16.png',
  '/nyla-go/favicon-32.png',
  '/nyla-go/apple-touch-icon.png',
  '/nyla-go/privacy-policy.html'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  console.log('NYLA GO PWA: Service Worker installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('NYLA GO PWA: Caching app shell');
        
        // Try to cache each URL individually to handle 404s gracefully
        // Filter out non-http URLs to prevent chrome-extension scheme errors
        const validUrls = urlsToCache.filter(url => {
          const isValidScheme = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/');
          if (!isValidScheme) {
            console.warn('NYLA GO PWA: Skipping invalid URL scheme:', url);
          }
          return isValidScheme;
        });
        
        const cachePromises = validUrls.map(url => {
          return cache.add(url).catch(error => {
            console.warn('NYLA GO PWA: Failed to cache:', url, error.message);
            // Don't reject the promise, just log and continue
            return Promise.resolve();
          });
        });
        
        return Promise.all(cachePromises);
      })
      .then(function() {
        console.log('NYLA GO PWA: App shell caching completed (some items may have failed)');
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('NYLA GO PWA: Service worker install failed:', error);
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
  
  // Skip non-http/https requests (chrome-extension, etc.)
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    console.log('NYLA GO PWA: Skipping non-http request:', event.request.url.substring(0, 50));
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
          
          // Clone the response for caching (only for http/https URLs)
          const responseToCache = response.clone();
          
          // Only cache http/https requests, not chrome-extension or other schemes
          if (event.request.url.startsWith('http://') || event.request.url.startsWith('https://')) {
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              })
              .catch(function(error) {
                console.warn('NYLA GO PWA: Failed to cache response:', error.message);
              });
          }
          
          return response;
        }).catch(function() {
          // Network failed, try to return cached fallback
          if (event.request.destination === 'document') {
            return caches.match('/nyla-go/index.html');
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