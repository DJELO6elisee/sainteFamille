// Service Worker simplifié pour Safari
// Version minimale pour éviter les erreurs WebKitBlobResource

const CACHE_NAME = 'la-petite-academie-safari-v20250823';

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW Safari] Installation du Service Worker Safari');
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then((cache) => {
            console.log('[SW Safari] Cache ouvert');
            // Cache minimal pour Safari
            return cache.addAll([
                '/',
                '/manifest.json',
                '/favicon.ico'
            ]);
        })
        .then(() => {
            console.log('[SW Safari] Cache de base créé');
            return self.skipWaiting();
        })
    );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW Safari] Activation du Service Worker Safari');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW Safari] Suppression de l\'ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW Safari] Service Worker Safari activé');
            return self.clients.claim();
        })
    );
});

// Interception des requêtes réseau - Stratégie simplifiée pour Safari
self.addEventListener('fetch', (event) => {
    // Ignorer les requêtes non-GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Ignorer les requêtes vers l'API
    if (event.request.url.includes('/api/')) {
        return;
    }

    // Ignorer les requêtes blob pour éviter les erreurs WebKit
    if (event.request.url.startsWith('blob:')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
        .then((response) => {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
            }

            // Cloner la réponse
            const responseToCache = response.clone();

            // Mettre en cache seulement les ressources statiques importantes
            if (event.request.url.includes('/static/') ||
                event.request.url.includes('/manifest.json') ||
                event.request.url.includes('/favicon.ico')) {

                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                        console.log('[SW Safari] Ressource mise en cache:', event.request.url);
                    });
            }

            return response;
        })
        .catch(() => {
            // En cas d'erreur, essayer le cache
            return caches.match(event.request);
        })
    );
});

// Gestion des messages du client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Gestion des notifications push (simplifiée)
self.addEventListener('push', (event) => {
    console.log('[SW Safari] Notification push reçue');

    const options = {
        body: event.data ? event.data.text() : 'Nouvelle notification de GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE',
        icon: '/icons/icon-192x192.webp',
        badge: '/icons/icon-96x96.webp',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE', options)
    );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
    console.log('[SW Safari] Clic sur notification');

    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
    );
});