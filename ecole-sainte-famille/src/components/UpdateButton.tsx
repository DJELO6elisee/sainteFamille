import React, { useEffect, useState } from 'react';
import { Button, Box, Snackbar, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useLocation } from 'react-router-dom';

// Version de l'application - À mettre à jour à chaque déploiement
// Format: YYYYMMDDHHmm (année, mois, jour, heure, minute du déploiement)
// La version peut être définie via REACT_APP_VERSION ou sera générée automatiquement
const getAppVersion = async (): Promise<string> => {
  try {
    // Essayer de charger la version depuis le fichier version.json
    const response = await fetch('/version.json?' + Date.now());
    if (response.ok) {
      const data = await response.json();
      return data.version || process.env.REACT_APP_VERSION || `v${Date.now()}`;
    }
  } catch (error) {
    console.log('[UpdateButton] Impossible de charger version.json, utilisation de la version par défaut');
  }
  return process.env.REACT_APP_VERSION || `v${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 12)}`;
};

let APP_VERSION = `v${Date.now()}`;

interface UpdateButtonProps {
  position?: 'fixed' | 'relative';
  variant?: 'contained' | 'outlined';
  size?: 'small' | 'medium' | 'large';
}

const UpdateButton: React.FC<UpdateButtonProps> = ({ 
  position = 'fixed',
  variant = 'contained',
  size = 'medium'
}) => {
  const [showButton, setShowButton] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const location = useLocation();

  useEffect(() => {
    // Vérifier si une nouvelle version est disponible
    const checkForUpdate = (currentVersion: string) => {
      const storedVersion = localStorage.getItem('app_version');
      
      // Si pas de version stockée, c'est la première visite - stocker la version actuelle
      if (!storedVersion) {
        localStorage.setItem('app_version', currentVersion);
        return;
      }

      // Si la version stockée est différente de la version actuelle, afficher le bouton
      if (storedVersion !== currentVersion) {
        console.log('[UpdateButton] Nouvelle version détectée:', currentVersion, 'Version précédente:', storedVersion);
        setShowButton(true);
      }
    };

    // Charger la version de l'application
    const loadVersion = async () => {
      const version = await getAppVersion();
      APP_VERSION = version;
      checkForUpdate(version);
    };

    loadVersion();

    // Vérifier aussi via le Service Worker si disponible
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Vérifier s'il y a une mise à jour disponible
        registration.addEventListener('updatefound', () => {
          console.log('[UpdateButton] Service Worker: mise à jour trouvée');
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[UpdateButton] Service Worker: nouvelle version installée');
                setShowButton(true);
              }
            });
          }
        });

        // Vérifier immédiatement s'il y a une mise à jour
        registration.update().catch(err => {
          console.log('[UpdateButton] Erreur lors de la vérification de mise à jour:', err);
        });
      }).catch(err => {
        console.log('[UpdateButton] Service Worker non disponible:', err);
      });

      // Vérifier périodiquement les mises à jour (toutes les 5 minutes)
      const updateInterval = setInterval(() => {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update();
        }).catch(() => {});
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(updateInterval);
    }
  }, []);

  const handleUpdate = async () => {
    try {
      // Vider tous les caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Caches vidés');
      }

      // Désenregistrer tous les Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
        console.log('Service Workers désenregistrés');
      }

      // Mettre à jour la version stockée
      localStorage.setItem('app_version', APP_VERSION);

      // Vider le localStorage du navigateur (optionnel, seulement les données de cache)
      // localStorage.clear(); // Décommenter si nécessaire

      // Afficher un message
      setSnackbar({
        open: true,
        message: 'Mise à jour en cours...'
      });

      // Attendre un peu pour que le message s'affiche
      setTimeout(() => {
        // Recharger la page avec vidage du cache (équivalent à Ctrl+F5)
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la mise à jour. Veuillez recharger manuellement (Ctrl+F5).'
      });
    }
  };

  // Ne pas afficher sur les pages de login
  const isLoginPage = location.pathname === '/login' || location.pathname === '/secretary-login';
  
  if (!showButton || isLoginPage) {
    return null;
  }

  const buttonStyles = position === 'fixed' ? {
    position: 'fixed' as const,
    bottom: 20,
    right: 20,
    zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  } : {
    position: 'relative' as const,
  };

  return (
    <>
      <Box sx={buttonStyles}>
        <Button
          variant={variant}
          color="primary"
          size={size}
          startIcon={<RefreshIcon />}
          onClick={handleUpdate}
          sx={{
            backgroundColor: variant === 'contained' ? '#1976d2' : 'transparent',
            color: variant === 'contained' ? 'white' : '#1976d2',
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: 2,
            px: 3,
            py: 1,
            '&:hover': {
              backgroundColor: variant === 'contained' ? '#1565c0' : 'rgba(25, 118, 210, 0.1)',
            },
            ...(position === 'fixed' && {
              '@media (max-width: 600px)': {
                bottom: 10,
                right: 10,
                fontSize: '0.75rem',
                px: 2,
                py: 0.75,
              }
            })
          }}
        >
          Actualiser l'application
        </Button>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default UpdateButton;

