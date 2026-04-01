import { useState, useEffect, useCallback } from 'react';

interface UpdateInfo {
  isUpdateAvailable: boolean;
  isUpdating: boolean;
  updateInstalled: boolean;
  registration: ServiceWorkerRegistration | null;
}

export const useAppUpdate = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    isUpdateAvailable: false,
    isUpdating: false,
    updateInstalled: false,
    registration: null
  });

  const checkForUpdate = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        setUpdateInfo(prev => ({ ...prev, registration }));

        // Vérifier s'il y a une mise à jour
        await registration.update();
      } catch (error) {
        console.error('Erreur lors de la vérification de mise à jour:', error);
      }
    }
  }, []);

  const forceUpdate = useCallback(async () => {
    if (updateInfo.registration && updateInfo.registration.waiting) {
      setUpdateInfo(prev => ({ ...prev, isUpdating: true }));
      
      // Envoyer un message au service worker pour forcer la mise à jour
      updateInfo.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Attendre un peu puis recharger la page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }, [updateInfo.registration]);

  const postponeUpdate = useCallback(() => {
    // Marquer la mise à jour comme reportée
    localStorage.setItem('updatePostponed', Date.now().toString());
    setUpdateInfo(prev => ({ ...prev, isUpdateAvailable: false }));
  }, []);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        setUpdateInfo(prev => ({ ...prev, registration }));

        // Écouter les mises à jour du service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Vérifier si la mise à jour n'a pas été reportée récemment
                const postponed = localStorage.getItem('updatePostponed');
                if (postponed) {
                  const postponedTime = parseInt(postponed);
                  const now = Date.now();
                  const hoursSincePostponed = (now - postponedTime) / (1000 * 60 * 60);
                  
                  // Si plus de 24h ont passé, permettre la mise à jour
                  if (hoursSincePostponed > 24) {
                    localStorage.removeItem('updatePostponed');
                    setUpdateInfo(prev => ({ ...prev, isUpdateAvailable: true }));
                  }
                } else {
                  setUpdateInfo(prev => ({ ...prev, isUpdateAvailable: true }));
                }
              }
            });
          }
        });
      });

      // Écouter les messages du service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setUpdateInfo(prev => ({ ...prev, isUpdateAvailable: true }));
        }
      });
    }
  }, []);

  // Vérification automatique des mises à jour toutes les 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      checkForUpdate();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [checkForUpdate]);

  return {
    ...updateInfo,
    checkForUpdate,
    forceUpdate,
    postponeUpdate
  };
};





