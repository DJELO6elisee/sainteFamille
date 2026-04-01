import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  SystemUpdate as UpdateIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

interface UpdateDetectorProps {
  onUpdateAvailable?: () => void;
  onUpdateInstalled?: () => void;
}

const UpdateDetector: React.FC<UpdateDetectorProps> = ({
  onUpdateAvailable,
  onUpdateInstalled
}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateInstalled, setUpdateInstalled] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showTestButton, setShowTestButton] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    // Vérifier si le service worker est supporté
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        
        // Écouter les mises à jour du service worker
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Une nouvelle version est disponible
                setUpdateAvailable(true);
                setShowUpdateModal(true);
                onUpdateAvailable?.();
              }
            });
          }
        });
      });
    }

    // Écouter les événements de mise à jour PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // Écouter les mises à jour de l'application
    window.addEventListener('appinstalled', () => {
      setUpdateInstalled(true);
      onUpdateInstalled?.();
    });

    // Afficher le bouton de test en mode développement
    if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
      setShowTestButton(true);
    }
  }, [onUpdateAvailable, onUpdateInstalled]);

  const handleUpdateNow = async () => {
    if (isTestMode) {
      // Mode test : simuler la mise à jour
      setIsUpdating(true);
      
      // Simuler le processus de mise à jour
      setTimeout(() => {
        setIsUpdating(false);
        setShowUpdateModal(false);
        setUpdateInstalled(true);
        onUpdateInstalled?.();
        
        // Masquer la notification après 3 secondes
        setTimeout(() => {
          setUpdateInstalled(false);
        }, 3000);
      }, 2000); // 2 secondes de simulation
      
      return;
    }

    // Mode production : vraie mise à jour
    if (registration && registration.waiting) {
      setIsUpdating(true);
      
      // Envoyer un message au service worker pour forcer la mise à jour
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Attendre un peu puis recharger la page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else if (deferredPrompt) {
      // Installer l'application PWA
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setUpdateInstalled(true);
        onUpdateInstalled?.();
      }
      
      setDeferredPrompt(null);
    }
  };

  const handleUpdateLater = () => {
    setShowUpdateModal(false);
    // Programmer une vérification dans 24h
    localStorage.setItem('updatePostponed', Date.now().toString());
  };

  const handleCloseModal = () => {
    setShowUpdateModal(false);
  };

  // Fonction pour simuler une mise à jour (test)
  const simulateUpdate = () => {
    setIsTestMode(true);
    setUpdateAvailable(true);
    setShowUpdateModal(true);
    onUpdateAvailable?.();
  };

  // Fonction pour simuler une mise à jour installée (test)
  const simulateUpdateInstalled = () => {
    setUpdateInstalled(true);
    onUpdateInstalled?.();
    setTimeout(() => setUpdateInstalled(false), 3000);
  };

  // Vérifier si une mise à jour a été reportée récemment
  useEffect(() => {
    const postponed = localStorage.getItem('updatePostponed');
    if (postponed) {
      const postponedTime = parseInt(postponed);
      const now = Date.now();
      const hoursSincePostponed = (now - postponedTime) / (1000 * 60 * 60);
      
      // Si plus de 24h ont passé, réafficher la modal
      if (hoursSincePostponed > 24) {
        localStorage.removeItem('updatePostponed');
      } else {
        setShowUpdateModal(false);
      }
    }
  }, [updateAvailable]);

  return (
    <>
      {/* Modal de mise à jour */}
      <Dialog
        open={showUpdateModal && updateAvailable}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            m: isMobile ? 0 : 2
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#1976d2', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 2
        }}>
          <UpdateIcon />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Mise à jour disponible
          </Typography>
          <IconButton
            onClick={handleCloseModal}
            sx={{ 
              color: 'white', 
              ml: 'auto',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <CheckIcon sx={{ fontSize: 48, color: '#4caf50', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: '#1976d2' }}>
              Nouvelle version disponible !
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6 }}>
              Une nouvelle version de l'application est disponible avec des améliorations 
              et des corrections de bugs.
            </Typography>
            <Alert severity="info" sx={{ textAlign: 'left', mt: 2 }}>
              <Typography variant="body2">
                <strong>Recommandé :</strong> Mettre à jour maintenant pour bénéficier 
                des dernières fonctionnalités et améliorations de sécurité.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={handleUpdateLater}
            variant="outlined"
            startIcon={<ScheduleIcon />}
            sx={{
              borderColor: '#1976d2',
              color: '#1976d2',
              '&:hover': {
                borderColor: '#1565c0',
                bgcolor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            Plus tard
          </Button>
          <Button
            onClick={handleUpdateNow}
            variant="contained"
            startIcon={isUpdating ? <CircularProgress size={20} color="inherit" /> : <UpdateIcon />}
            disabled={isUpdating}
            sx={{
              bgcolor: '#1976d2',
              '&:hover': { bgcolor: '#1565c0' },
              minWidth: 140
            }}
          >
            {isUpdating ? 'Mise à jour...' : 'Mettre à jour'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification de mise à jour installée */}
      {updateInstalled && (
        <Box
          sx={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 9999,
            bgcolor: '#4caf50',
            color: 'white',
            p: 2,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            animation: 'slideIn 0.3s ease-out',
            '@keyframes slideIn': {
              from: { transform: 'translateX(100%)', opacity: 0 },
              to: { transform: 'translateX(0)', opacity: 1 }
            }
          }}
        >
          <CheckIcon />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Application mise à jour avec succès !
          </Typography>
        </Box>
      )}

      {/* Boutons de test (uniquement en développement) */}
      {showTestButton && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <Button
            variant="contained"
            onClick={simulateUpdate}
            sx={{
              bgcolor: '#1976d2',
              color: 'white',
              fontSize: 12,
              py: 1,
              px: 2,
              '&:hover': { bgcolor: '#1565c0' }
            }}
          >
            🧪 Tester Mise à jour
          </Button>
          <Button
            variant="contained"
            onClick={simulateUpdateInstalled}
            sx={{
              bgcolor: '#4caf50',
              color: 'white',
              fontSize: 12,
              py: 1,
              px: 2,
              '&:hover': { bgcolor: '#388e3c' }
            }}
          >
            ✅ Tester Installé
          </Button>
        </Box>
      )}
    </>
  );
};

export default UpdateDetector;





