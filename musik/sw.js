/* ========================================
   MLI Musik — Service Worker
   Caches app shell + audio for offline use
   ======================================== */

const CACHE_NAME = 'mli-musik-v1';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './assets/album-cover.webp',
    './assets/artist-hero.jpg',
    './assets/artist-portrait.jpg',
    './assets/hero-bg.jpg',
    './assets/Echoes%20of%20the%20Ancients.mp3',
    './assets/Reaching.mp3',
    './assets/Signalet%20i%20St%C3%B8jen.mp3',
    './assets/Signals%20in%20the%20dead%20zone.mp3',
    './icons/icon-192.png',
    './icons/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap'
];

// Install — cache all assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app shell + audio');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((names) =>
            Promise.all(
                names
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            )
        )
    );
    self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cached) => {
            if (cached) return cached;

            return fetch(e.request).then((response) => {
                // Cache new requests dynamically (fonts, etc.)
                if (response && response.status === 200 && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                }
                return response;
            }).catch(() => {
                // Offline fallback for navigation
                if (e.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
