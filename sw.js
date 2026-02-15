// sw.js - V2.0  
const CACHE_VERSION = 'clarte-v2.0';  
const CACHE_FILES = [  
  './',  
  './index.html',  
  './app.js',  
  './manifest.json'  
];  
  
// Install - cache files  
self.addEventListener('install', event => {  
  console.log('[SW] Installing version', CACHE_VERSION);  
    
  event.waitUntil(  
    caches.open(CACHE_VERSION)  
      .then(cache => {  
        console.log('[SW] Caching files');  
        return cache.addAll(CACHE_FILES);  
      })  
      .then(() => self.skipWaiting()) // Force activation immediately  
  );  
});  
  
// Activate - clean old caches  
self.addEventListener('activate', event => {  
  console.log('[SW] Activating version', CACHE_VERSION);  
    
  event.waitUntil(  
    caches.keys()  
      .then(cacheNames => {  
        return Promise.all(  
          cacheNames.map(cacheName => {  
            if (cacheName !== CACHE_VERSION) {  
              console.log('[SW] Deleting old cache:', cacheName);  
              return caches.delete(cacheName);  
            }  
          })  
        );  
      })  
      .then(() => self.clients.claim()) // Take control of all clients immediately  
  );  
});  
  
// Fetch - serve from cache, fallback to network  
self.addEventListener('fetch', event => {  
  event.respondWith(  
    caches.match(event.request)  
      .then(response => {  
        // Cache hit - return cached version  
        if (response) {  
          return response;  
        }  
          
        // Cache miss - fetch from network  
        return fetch(event.request)  
          .then(response => {  
            // Don't cache non-successful responses  
            if (!response || response.status !== 200 || response.type !== 'basic') {  
              return response;  
            }  
              
            // Clone the response  
            const responseToCache = response.clone();  
              
            // Cache the fetched response  
            caches.open(CACHE_VERSION)  
              .then(cache => {  
                cache.put(event.request, responseToCache);  
              });  
              
            return response;  
          });  
      })  
      .catch(() => {  
        // Network failed - return cached index for navigation requests  
        if (event.request.mode === 'navigate') {  
          return caches.match('./index.html');  
        }  
      })  
  );  
});
