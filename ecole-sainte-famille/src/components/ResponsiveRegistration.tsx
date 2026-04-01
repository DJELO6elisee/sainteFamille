import React, { useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import Registration from '../pages/Registration';
import MobileRegistration from '../pages/MobileRegistration';

interface ResponsiveRegistrationProps {
  onClose: () => void;
  fullScreen?: boolean; // Nouveau prop pour contrôler l'affichage plein écran
}

const ResponsiveRegistration: React.FC<ResponsiveRegistrationProps> = ({ onClose, fullScreen = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Si on est sur mobile et qu'on veut l'affichage plein écran, on utilise MobileRegistration
  if (isMobile && fullScreen) {
    return <MobileRegistration onClose={onClose} />;
  }

  // Sinon, on utilise le formulaire normal (modal ou plein écran selon le contexte)
  if (isMobile) {
    return <MobileRegistration onClose={onClose} />;
  }

  return <Registration onClose={onClose} />;
};

export default ResponsiveRegistration;
