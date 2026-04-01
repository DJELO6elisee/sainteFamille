import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Snackbar,
  Alert,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Update as UpdateIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

interface ServiceWorkerManagerProps {
  children: React.ReactNode;
}

// Fonction pour détecter Safari
const isSafari = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /safari/.test(userAgent) && !/chrome/.test(userAgent);
};

// Fonction pour détecter iOS Safari
const isIOSSafari = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) && /safari/.test(userAgent) && !/chrome/.test(userAgent);
};

const ServiceWorkerManager: React.FC<ServiceWorkerManagerProps> = ({ children }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSafariBrowser, setIsSafariBrowser] = useState(false);

  useEffect(() => {
    // Détecter Safari
    const safari = isSafari() || isIOSSafari();
    setIsSafariBrowser(safari);

    if (safari || process.env.NODE_ENV !== 'production') {
      console.log('[SW Manager] Safari détecté ou mode développement - Service Worker désactivé');
      return;
    }

    if ('serviceWorker' in navigator) {
      // Enregistrer le Service Worker approprié selon le navigateur
      const swPath = safari ? '/sw-safari.js' : '/sw.js';
      navigator.serviceWorker
        .register(swPath)
        .then((reg) => {
          setRegistration(reg);
          console.log('[SW Manager] Service Worker enregistré:', reg);

          // Écouter les mises à jour
          reg.addEventListener('updatefound', () => {
            console.log('[SW Manager] Mise à jour trouvée');
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[SW Manager] Nouvelle version disponible');
                  setUpdateAvailable(true);
                  setShowUpdateDialog(true);
                }
              });
            }
          });

          // Écouter les messages du Service Worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'UPDATE_READY') {
              console.log('[SW Manager] Mise à jour prête');
              (window as any).location.reload();
            }
            if (event.data && event.data.type === 'CACHE_CLEARED') {
              console.log('[SW Manager] Cache nettoyé');
            }
          });
        })
        .catch((error) => {
          console.error('[SW Manager] Erreur lors de l\'enregistrement du Service Worker:', error);
        });

      // Vérifier s'il y a une mise à jour au chargement
      navigator.serviceWorker.ready.then((reg) => {
        reg.update();
      });
    }
  }, []);

  const handleUpdate = async () => {
    if (!registration) return;

    setIsUpdating(true);
    try {
      // Envoyer un message au Service Worker pour forcer la mise à jour
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Attendre que le Service Worker soit mis à jour
      await new Promise<void>((resolve) => {
        const checkForUpdate = () => {
          if (registration.waiting && registration.waiting.state === 'installed') {
            resolve();
          } else {
            setTimeout(checkForUpdate, 100);
          }
        };
        checkForUpdate();
      });

      // Recharger la page
      (window as any).location.reload();
    } catch (error) {
      console.error('[SW Manager] Erreur lors de la mise à jour:', error);
      setIsUpdating(false);
    }
  };



  
  // Si Safari, retourner simplement les enfants sans message
  if (isSafariBrowser) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      {/* Dialog de mise à jour */}
      <Dialog open={showUpdateDialog} onClose={() => setShowUpdateDialog(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <UpdateIcon color="primary" />
            <Typography variant="h6">Mise à jour disponible</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Une nouvelle version de l'application est disponible. Voulez-vous l'installer maintenant ?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Cette action rechargera automatiquement la page pour appliquer les changements.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUpdateDialog(false)} color="secondary">
            Plus tard
          </Button>
          <Button
            onClick={handleUpdate}
            variant="contained"
            color="primary"
            disabled={isUpdating}
            startIcon={isUpdating ? <CircularProgress size={20} /> : <UpdateIcon />}
          >
            {isUpdating ? 'Mise à jour...' : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </Dialog>



      {/* Snackbar pour les notifications */}
      <Snackbar
        open={updateAvailable}
        autoHideDuration={6000}
        onClose={() => setUpdateAvailable(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setUpdateAvailable(false)}
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={handleUpdate}>
              Mettre à jour
            </Button>
          }
        >
          Une nouvelle version est disponible
        </Alert>
      </Snackbar>
    </>
  );
};

export default ServiceWorkerManager;
