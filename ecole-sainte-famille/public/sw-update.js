// Service Worker Update Script
// Version: 1.4.0.20250121

// Force mise à jour du cache PWA
const CACHE_VERSION = 'v1.4.0.20250121';
const CACHE_NAME = `bethanie-miracle-${CACHE_VERSION}`;

// Événement d'installation du service worker
self.addEventListener('install', (event) => {
    console.log('🔄 Service Worker installé - Version:', CACHE_VERSION);
    // Force l'activation immédiate
    self.skipWaiting();
});

// Événement d'activation
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activé - Version:', CACHE_VERSION);

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Supprime tous les anciens caches
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Suppression ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Prend le contrôle de tous les clients
            return self.clients.claim();
        })
    );
});

// Événement de fetch
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Retourne la réponse du cache si disponible, sinon fetch depuis le réseau
            return response || fetch(event.request);
        })
    );
});

// Message pour notifier les clients de la mise à jour
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});