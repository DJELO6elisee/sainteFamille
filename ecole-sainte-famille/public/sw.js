const CACHE_NAME = 'lapetiteacademie-v1.3.0'; // Version mise à jour pour forcer le cache
const STATIC_CACHE = 'static-v1.3.0';
const DYNAMIC_CACHE = 'dynamic-v1.3.0';

// Fichiers à mettre en cache (seulement les fichiers qui existent toujours)
const STATIC_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico'
];

// Installer le Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installation du Service Worker');
    event.waitUntil(
        caches.open(STATIC_CACHE)
        .then(async(cache) => {
            console.log('[SW] Mise en cache des fichiers statiques');
            // Ajouter les fichiers un par un pour éviter que l'échec d'un fichier fasse échouer tous
            const promises = STATIC_FILES.map(async(file) => {
                try {
                    await cache.add(file);
                    console.log(`[SW] Fichier mis en cache: ${file}`);
                } catch (error) {
                    console.warn(`[SW] Impossible de mettre en cache: ${file}`, error);
                }
            });
            await Promise.allSettled(promises);
        })
        .then(() => {
            console.log('[SW] Service Worker installé avec succès');
            return self.skipWaiting();
        })
        .catch((error) => {
            console.error('[SW] Erreur lors de l\'installation:', error);
        })
    );
});

// Activer le Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activation du Service Worker');
    event.waitUntil(
        caches.keys()
        .then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Supprimer les anciens caches
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('[SW] Suppression de l\'ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('[SW] Service Worker activé');
            return self.clients.claim();
        })
    );
});

// Intercepter les requêtes
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer les requêtes non-GET
    if (request.method !== 'GET') {
        return;
    }

    // Ignorer les requêtes vers l'API
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // Ignorer les requêtes de fichiers de données
    if (url.pathname.includes('.json') || url.pathname.includes('.xml')) {
        return;
    }

    event.respondWith(
        caches.match(request)
        .then((response) => {
            // Retourner la réponse du cache si elle existe
            if (response) {
                return response;
            }

            // Sinon, faire la requête réseau
            return fetch(request)
                .then((networkResponse) => {
                    // Mettre en cache la réponse si elle est valide
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then((cache) => {
                                cache.put(request, responseClone);
                            });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // En cas d'erreur réseau, retourner une page d'erreur
                    if (request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                });
        })
    );
});

// Écouter les messages du client
self.addEventListener('message', (event) => {
    const { data } = event;

    if (data.type === 'SKIP_WAITING') {
        console.log('[SW] Skip waiting demandé');
        self.skipWaiting();
    }

    if (data.type === 'FORCE_UPDATE') {
        console.log('[SW] Mise à jour forcée demandée');
        self.skipWaiting();
        event.ports[0].postMessage({ type: 'UPDATE_READY' });
    }

    if (data.type === 'CLEAR_CACHE') {
        console.log('[SW] Nettoyage du cache demandé');
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        console.log('[SW] Suppression du cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            })
            .then(() => {
                console.log('[SW] Cache nettoyé');
                event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
            });
    }
});

// Gérer les erreurs
self.addEventListener('error', (event) => {
    console.error('[SW] Erreur du Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Promesse rejetée non gérée:', event.reason);
});