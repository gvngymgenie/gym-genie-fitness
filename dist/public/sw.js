// Service Worker for Gym Genie PWA
// Import OneSignal SDK for push notification handling
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'gym-genie-v1';
const STATIC_CACHE = 'gym-genie-static-v1';
const DYNAMIC_CACHE = 'gym-genie-dynamic-v1';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// API routes that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/members$/,
  /\/api\/plans$/,
  /\/api\/staff$/,
  /\/api\/branches$/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets:', error);
      })
  );
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle file uploads - bypass cache for POST requests
  if (url.pathname.includes('/avatar') && request.method === 'POST') {
    event.respondWith(
      fetch(request).catch((error) => {
        console.error('Service Worker: Upload failed:', error);
        return new Response(JSON.stringify({ error: 'Upload failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Handle avatar file requests - bypass cache for better performance
  if (url.pathname.startsWith('/uploads/avatars/')) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return default avatar if file not found
        return fetch('/assets/dumbbells.avif');
      })
    );
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    // Cache GET requests to specific API endpoints
    if (request.method === 'GET' && API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      event.respondWith(
        caches.open(DYNAMIC_CACHE).then((cache) => {
          return fetch(request)
            .then((response) => {
              // Cache successful responses
              if (response.status === 200) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => {
              // Return cached version if network fails
              return cache.match(request);
            });
        })
      );
    } else {
      // For other API requests, try network first, then cache
      event.respondWith(
        fetch(request).catch(() => {
          return caches.match(request);
        })
      );
    }
    return;
  }

  // Handle static assets and pages
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache the response
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline fallback for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// PWA Service Worker - Push notifications handled by OneSignal SDK (imported above)
// The OneSignal SDK provides push event handling automatically

// Handle notification clicks (backup handler - OneSignal SDK also handles this)
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Background sync function
async function doBackgroundSync() {
  try {
    // Sync any pending offline actions here
    console.log('Service Worker: Performing background sync');
    // This could sync offline attendance, member updates, etc.
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Handle messages from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_FIREBASE_CONFIG') {
    console.log('Service Worker: Received Firebase config');
    // Store Firebase config globally for use in messaging
    self.FIREBASE_CONFIG = event.data.config;
  } else if (event.data && event.data.type === 'CLEAN_CACHE') {
    cleanOldCaches();
  }
});

async function cleanOldCaches() {
  const cacheNames = await caches.keys();
  const validCaches = [STATIC_CACHE, DYNAMIC_CACHE];

  await Promise.all(
    cacheNames.map(cacheName => {
      if (!validCaches.includes(cacheName)) {
        console.log('Service Worker: Cleaning old cache:', cacheName);
        return caches.delete(cacheName);
      }
    })
  );
}
