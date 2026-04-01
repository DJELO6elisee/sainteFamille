import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Snackbar,
  IconButton,
  Typography,
  Chip,
  Slide,
  Fade,
  Alert
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  Close as CloseIcon,
  Smartphone as PhoneIcon,
  Tablet as TabletIcon,
  Computer as ComputerIcon
} from '@mui/icons-material';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    const checkInstallation = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInstalled = (window.navigator as any).standalone || standalone;
      setIsStandalone(standalone);
      setIsInstalled(isInstalled);
    };

    checkInstallation();

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Afficher le prompt après un délai
      setTimeout(() => {
        if (!isInstalled && !isStandalone) {
          setShowInstallPrompt(true);
        }
      }, 3000);
    };

    // Écouter l'événement appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setShowManualInstructions(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Pour le développement, afficher le prompt après 5 secondes si pas d'événement beforeinstallprompt
    const devTimeout = setTimeout(() => {
      if (!deferredPrompt && !isInstalled && !isStandalone) {
        console.log('Mode développement : Affichage du prompt PWA');
        setShowInstallPrompt(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(devTimeout);
    };
  }, [isInstalled, isStandalone, deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        // Afficher le prompt d'installation natif
        await deferredPrompt.prompt();
        
        // Attendre la réponse de l'utilisateur
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('Application installée avec succès');
          setIsInstalled(true);
          setShowInstallPrompt(false);
        } else {
          console.log('Installation refusée par l\'utilisateur');
        }
      } catch (error) {
        console.error('Erreur lors de l\'installation:', error);
      }

      setDeferredPrompt(null);
    } else {
      // Si pas de prompt natif, afficher les instructions manuelles
      console.log('Pas de prompt natif disponible');
      setShowInstallPrompt(false);
      setShowManualInstructions(true);
    }
  };

  const handleClose = () => {
    setShowInstallPrompt(false);
  };

  const handleCloseManual = () => {
    setShowManualInstructions(false);
  };

  const getDeviceIcon = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) return <PhoneIcon fontSize="small" />;
    if (/ipad|tablet/.test(userAgent)) return <TabletIcon fontSize="small" />;
    if (/iphone|ipod/.test(userAgent)) return <PhoneIcon fontSize="small" />;
    return <ComputerIcon fontSize="small" />;
  };

  const getManualInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/android/.test(userAgent)) {
      return "📱 Android : Menu Chrome → Ajouter à l'écran d'accueil";
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      return "🍎 iPhone/iPad : Safari → Partager → Sur l'écran d'accueil";
    } else if (/chrome/.test(userAgent)) {
      return "💻 Chrome : Icône d'installation dans la barre d'adresse";
    } else {
      return "🌐 Recherchez 'Installer l'application' dans votre navigateur";
    }
  };

  // Ne pas afficher si l'app est déjà installée ou en mode standalone
  if (isInstalled || isStandalone) {
    return null;
  }

  return (
    <>
      {/* Popup principal d'installation */}
      <Snackbar
        open={showInstallPrompt}
        autoHideDuration={10000} // Se ferme automatiquement après 10 secondes
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={Slide}
        sx={{
          '& .MuiSnackbar-root': {
            bottom: 20,
            right: 20,
          }
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1780c2 0%, #0d5a8a 100%)',
            color: 'white',
            borderRadius: 3,
            p: 2,
            minWidth: 280,
            maxWidth: 350,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Effet de brillance */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '100%',
              background: 'radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
              pointerEvents: 'none'
            }}
          />

          {/* Bouton fermer */}
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'rgba(255, 255, 255, 0.7)',
              '&:hover': {
                color: 'white',
                background: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          {/* Contenu du popup */}
          <Box sx={{ pr: 4 }}>
            {/* En-tête avec icône */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1.5
                }}
              >
                {getDeviceIcon()}
              </Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                Installer l'App
              </Typography>
            </Box>

            {/* Description */}
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.9, fontSize: '0.8rem', lineHeight: 1.4 }}>
              Accédez rapidement à GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE depuis votre écran d'accueil
            </Typography>

            {/* Bouton d'installation */}
            <Button
              onClick={handleInstallClick}
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              sx={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.8rem',
                py: 0.5,
                px: 2,
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.3)',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              Installer
            </Button>

            {/* Badge "Gratuit" */}
            <Chip
              label="Gratuit"
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: '#4CAF50',
                color: 'white',
                fontSize: '0.7rem',
                height: 20,
                '& .MuiChip-label': {
                  px: 1
                }
              }}
            />
          </Box>
        </Box>
      </Snackbar>

      {/* Toast pour les instructions manuelles */}
      <Snackbar
        open={showManualInstructions}
        autoHideDuration={8000}
        onClose={handleCloseManual}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={Slide}
      >
        <Alert
          onClose={handleCloseManual}
          severity="info"
          sx={{
            width: '100%',
            maxWidth: 400,
            '& .MuiAlert-message': {
              fontSize: '0.9rem'
            }
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            📱 Installation manuelle requise
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
            {getManualInstructions()}
          </Typography>
        </Alert>
      </Snackbar>
    </>
  );
};

export default PWAInstallPrompt;
