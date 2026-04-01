// Script pour forcer la mise à jour du PWA
(function() {
    'use strict';

    // Version actuelle de l'application
    const CURRENT_VERSION = '1.4.0.20251203';

    // Fonction pour vérifier et forcer la mise à jour
    function checkForUpdates() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => {
                    // Vérifier si une nouvelle version est disponible
                    registration.addEventListener('updatefound', () => {
                        console.log('Nouvelle version du Service Worker détectée');
                        const newWorker = registration.installing;

                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // Nouvelle version installée, forcer l'activation
                                console.log('Nouvelle version installée, activation...');
                                showUpdateNotification();
                            }
                        });
                    });

                    // Forcer la mise à jour immédiate
                    registration.update();
                });
            });
        }
    }

    // Fonction pour afficher une notification de mise à jour
    function showUpdateNotification() {
        // Créer une notification visuelle
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #1780c2;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-size: 20px;">🔄</div>
                <div>
                    <div style="font-weight: bold; margin-bottom: 5px;">Mise à jour disponible</div>
                    <div style="font-size: 14px; opacity: 0.9;">Une nouvelle version est prête</div>
                </div>
            </div>
            <button onclick="this.parentElement.remove(); window.location.reload(true);" 
                    style="background: #FF9800; color: white; border: none; padding: 8px 16px; 
                           border-radius: 4px; cursor: pointer; margin-top: 10px; font-weight: bold;">
                Mettre à jour
            </button>
        `;

        // Ajouter l'animation CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Auto-supprimer après 10 secondes
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    // Fonction pour forcer le nettoyage du cache
    function forceCacheClear() {
        if ('caches' in window) {
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('Suppression du cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }).then(() => {
                console.log('Cache vidé avec succès');
                // Recharger la page après nettoyage
                window.location.reload(true);
            }).catch(error => {
                console.error('Erreur lors du nettoyage du cache:', error);
            });
        }
    }

    // Fonction pour ajouter un paramètre de version à l'URL
    function addVersionToUrl() {
        const url = new URL(window.location);
        url.searchParams.set('v', CURRENT_VERSION);
        url.searchParams.set('t', Date.now());

        // Si l'URL n'a pas déjà le paramètre de version, l'ajouter
        if (!window.location.search.includes('v=')) {
            window.history.replaceState({}, '', url.toString());
        }
    }

    // Initialisation
    function init() {
        console.log('Force Update Script initialisé - Version:', CURRENT_VERSION);

        // Ajouter la version à l'URL
        addVersionToUrl();

        // Vérifier les mises à jour
        checkForUpdates();

        // Exposer les fonctions globalement pour utilisation manuelle
        window.forceUpdate = {
            checkForUpdates,
            forceCacheClear,
            showUpdateNotification,
            version: CURRENT_VERSION
        };

        // Vérifier périodiquement les mises à jour (toutes les 30 secondes)
        setInterval(checkForUpdates, 30000);
    }

    // Démarrer quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Écouter les messages du service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
            const { data } = event;

            if (data.type === 'UPDATE_READY') {
                console.log('Mise à jour prête, rechargement...');
                window.location.reload(true);
            }

            if (data.type === 'CACHE_CLEARED') {
                console.log('Cache vidé par le service worker');
                window.location.reload(true);
            }
        });
    }

})();