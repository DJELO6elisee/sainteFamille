import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogProps,
  Box
} from '@mui/material';

interface SafeDialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: DialogProps['maxWidth'];
  fullWidth?: boolean;
  PaperProps?: DialogProps['PaperProps'];
  TransitionProps?: DialogProps['TransitionProps'];
}

/**
 * Composant Dialog sécurisé qui évite les erreurs DOM
 * Gère mieux le cycle de vie et évite les mises à jour sur des composants démontés
 */
const SafeDialog: React.FC<SafeDialogProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = false,
  PaperProps,
  TransitionProps,
  ...dialogProps
}) => {
  const isMounted = useRef(true);
  const [internalOpen, setInternalOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchroniser l'état interne avec la prop open
  useEffect(() => {
    if (isMounted.current) {
      setInternalOpen(open);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    if (isMounted.current) {
      setInternalOpen(false);
      // Utiliser un timeout pour éviter les conflits DOM
      timeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          onClose();
        }
      }, 100); // Délai plus long pour laisser le temps à la transition
    }
  };

  // Nettoyer le timeout si le composant est démonté
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Ne pas rendre le Dialog si le composant n'est pas monté
  if (!isMounted.current) {
    return null;
  }

  return (
    <Dialog
      open={internalOpen}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      TransitionProps={{
        onExited: () => {
          // Nettoyer après la transition
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
        },
        ...TransitionProps
      }}
      PaperProps={PaperProps}
      {...dialogProps}
    >
      {title && (
        <DialogTitle>
          {title}
        </DialogTitle>
      )}
      <DialogContent>
        <Box sx={{ minHeight: '50px' }}>
          {children}
        </Box>
      </DialogContent>
      {actions && (
        <DialogActions>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default SafeDialog; 
