// Types pour les événements PWA
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Interface pour les informations PWA
export interface PWAInfo {
  isInstalled: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  isOnline: boolean;
  hasServiceWorker: boolean;
}

// Désinscrire tous les Service Workers existants
export const unregisterServiceWorkers = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[PWA] Service Worker désinscrit:', registration.scope);
      }
    } catch (error) {
      console.error('[PWA] Erreur lors de la désinscription des Service Workers:', error);
    }
  }
};

// Enregistrement du Service Worker (désactivé en développement)
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  // En développement, désinscrire tous les SW existants
  if (process.env.NODE_ENV !== 'production') {
    console.log('[PWA] Mode développement - Désinscription des Service Workers existants');
    await unregisterServiceWorkers();
    return null;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service Worker enregistré avec succès:', registration);
      
      // Écouter les mises à jour du Service Worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nouvelle version disponible
              console.log('[PWA] Nouvelle version disponible');
              // Ici vous pourriez afficher une notification à l'utilisateur
            }
          });
        }
      });
      
      return registration;
    } catch (error) {
      console.error('[PWA] Erreur lors de l\'enregistrement du Service Worker:', error);
      return null;
    }
  }
  return null;
};

// Vérifier le statut PWA
export const getPWAStatus = (): PWAInfo => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isInstalled = (window.navigator as any).standalone || isStandalone;
  const isOnline = navigator.onLine;
  
  return {
    isInstalled,
    isStandalone,
    canInstall: false, // Sera mis à jour par l'événement beforeinstallprompt
    isOnline,
    hasServiceWorker: 'serviceWorker' in navigator
  };
};

// Demander les permissions de notification
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('[PWA] Ce navigateur ne supporte pas les notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    console.warn('[PWA] Permissions de notification refusées');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Permission de notification:', permission);
    return permission;
  } catch (error) {
    console.error('[PWA] Erreur lors de la demande de permission:', error);
    return 'denied';
  }
};

// Envoyer une notification locale
export const sendLocalNotification = (
  title: string,
  options?: NotificationOptions
): void => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const defaultOptions: NotificationOptions = {
    icon: '/icons/icon-192x192.webp',
    badge: '/icons/icon-96x96.webp',
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir',
        icon: '/icons/icon-96x96.webp'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/icons/icon-96x96.webp'
      }
    ],
    ...options
  } as any; // Utiliser 'as any' pour inclure vibrate qui n'est pas dans le type standard

  new Notification(title, defaultOptions);
};

// Vérifier si l'app peut être installée
export const canInstallPWA = (): boolean => {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    window.matchMedia('(display-mode: browser)').matches
  );
};

// Obtenir les informations sur l'appareil
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  return {
    isAndroid: /android/.test(userAgent),
    isIOS: /iphone|ipad|ipod/.test(userAgent),
    isMobile: /mobile|android|iphone|ipad|ipod/.test(userAgent),
    isTablet: /tablet|ipad/.test(userAgent),
    isChrome: /chrome/.test(userAgent),
    isSafari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
    isFirefox: /firefox/.test(userAgent),
    isEdge: /edge/.test(userAgent)
  };
};

// Obtenir les instructions d'installation selon l'appareil
export const getInstallInstructions = (): string => {
  const deviceInfo = getDeviceInfo();
  
  if (deviceInfo.isAndroid) {
    return "Appuyez sur 'Installer' puis 'Ajouter à l'écran d'accueil'";
  } else if (deviceInfo.isIOS) {
    return "Appuyez sur l'icône de partage puis 'Sur l'écran d'accueil'";
  } else if (deviceInfo.isChrome) {
    return "Cliquez sur l'icône d'installation dans la barre d'adresse";
  } else if (deviceInfo.isSafari) {
    return "Cliquez sur l'icône de partage puis 'Ajouter à l'écran d'accueil'";
  } else {
    return "Suivez les instructions de votre navigateur pour installer l'application";
  }
};

// Mettre à jour le cache du Service Worker
export const updateCache = async (cacheName: string, urls: string[]): Promise<void> => {
  if ('caches' in window) {
    try {
      const cache = await caches.open(cacheName);
      await cache.addAll(urls);
      console.log('[PWA] Cache mis à jour:', cacheName);
    } catch (error) {
      console.error('[PWA] Erreur lors de la mise à jour du cache:', error);
    }
  }
};

// Nettoyer les anciens caches
export const cleanOldCaches = async (currentCacheName: string): Promise<void> => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== currentCacheName)
          .map(cacheName => {
            console.log('[PWA] Suppression de l\'ancien cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    } catch (error) {
      console.error('[PWA] Erreur lors du nettoyage des caches:', error);
    }
  }
};

// Vérifier la connectivité
export const checkConnectivity = (): boolean => {
  return navigator.onLine;
};

// Écouter les changements de connectivité
export const onConnectivityChange = (callback: (isOnline: boolean) => void): void => {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
};

// Obtenir la taille de l'application installée
export const getAppSize = async (): Promise<number> => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return estimate.usage || 0;
    } catch (error) {
      console.error('[PWA] Erreur lors du calcul de la taille:', error);
      return 0;
    }
  }
  return 0;
};
