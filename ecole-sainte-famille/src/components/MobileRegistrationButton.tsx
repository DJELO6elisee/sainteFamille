import React, { useState } from 'react';
import { Button, useMediaQuery, useTheme } from '@mui/material';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import MobileRegistration from '../pages/MobileRegistration';

interface MobileRegistrationButtonProps {
  children?: React.ReactNode;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  size?: 'small' | 'medium' | 'large';
  sx?: any;
  onClick?: () => void; // Ajout du prop onClick
}


const MobileRegistrationButton: React.FC<MobileRegistrationButtonProps> = ({ 
  children = 'Pré-Inscription Crèche & Garderie',
  variant = 'contained',
  color = 'primary',
  size = 'large',
  sx = {},
  onClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showMobileRegistration, setShowMobileRegistration] = useState(false);

  const handleClick = () => {
    if (isMobile) {
      setShowMobileRegistration(true);
    } else if (onClick) {
      // Sur desktop, on appelle la fonction onClick du parent
      onClick();
    }
  };

  const handleClose = () => {
    setShowMobileRegistration(false);
  };

  return (
    <>
      <Button
        variant={variant}
        color={color}
        size={size}
        onClick={handleClick}
        startIcon={<AppRegistrationIcon />}
        sx={{ 
          fontWeight: 600, 
          fontSize: 18, 
          px: 4, 
          py: 1.5, 
          boxShadow: 3,
          ...sx
        }}
      >
        {children}
      </Button>

      {showMobileRegistration && (
        <MobileRegistration onClose={handleClose} />
      )}
    </>
  );
};

export default MobileRegistrationButton;
