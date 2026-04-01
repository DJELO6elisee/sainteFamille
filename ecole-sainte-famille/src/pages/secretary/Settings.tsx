import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  Chip,
  Avatar,
  Fade,
  Zoom,
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import SecretarySidebar from '../../components/SecretarySidebar';
import axios from 'axios';

const Settings = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    autoSave: true,
    darkMode: false,
  });

  // États pour les informations du profil admin
  const [profileData, setProfileData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    fonction: '',
  });

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // États pour le changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // État pour afficher le mot de passe actuel
  const [currentPasswordDisplay, setCurrentPasswordDisplay] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [canDisplayPassword, setCanDisplayPassword] = useState(false);

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [passwordErrors, setPasswordErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Fonction pour récupérer les informations du profil
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://saintefamilleexcellence.ci/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('=== [DEBUG] Réponse API profile:', response.data);
      
      if (response.data.status === 'success') {
        setProfileData({
          email: response.data.user.email || '',
          firstName: response.data.user.first_name || '',
          lastName: response.data.user.last_name || '',
          fonction: response.data.user.fonction || '',
        });
        console.log('=== [DEBUG] Données du profil mises à jour:', {
          email: response.data.user.email || '',
          firstName: response.data.user.first_name || '',
          lastName: response.data.user.last_name || '',
          fonction: response.data.user.fonction || '',
        });
      } else {
        console.log('=== [DEBUG] Statut de réponse non success:', response.data);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération du profil:', error);
      setSnackbar({
        open: true,
        message: 'Erreur lors de la récupération du profil',
        severity: 'error',
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Fonction pour récupérer le mot de passe actuel
  const fetchCurrentPassword = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://saintefamilleexcellence.ci/api/auth/current-password', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.status === 'success') {
        setCurrentPasswordDisplay(response.data.password || '');
        setCanDisplayPassword(response.data.canDisplay || false);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération du mot de passe:', error);
    }
  };

  // Fonction pour mettre à jour les informations du profil
  const handleProfileUpdate = async () => {
    setIsUpdatingProfile(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        'https://saintefamilleexcellence.ci/api/auth/profile',
        {
          email: profileData.email,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          fonction: profileData.fonction,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.status === 'success') {
        setSnackbar({
          open: true,
          message: 'Profil mis à jour avec succès !',
          severity: 'success',
        });
      }
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      
      let errorMessage = 'Erreur lors de la mise à jour du profil';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Récupérer les informations du profil au chargement du composant
  useEffect(() => {
    let isMounted = true;
    
    const loadProfile = async () => {
      if (!isMounted) return;
      await fetchProfile();
      await fetchCurrentPassword();
    };
    
    loadProfile();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSettingChange = (setting: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [setting]: event.target.checked,
    });
  };

  const handleProfileFieldChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({
      ...profileData,
      [field]: event.target.value,
    });
  };

  const handlePasswordFieldChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [field]: event.target.value,
    });
    // Effacer l'erreur quand l'utilisateur tape
    setPasswordErrors({
      ...passwordErrors,
      [field]: '',
    });
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field],
    });
  };

  const validatePasswordForm = () => {
    const errors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Le mot de passe actuel est requis';
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'Le nouveau mot de passe est requis';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'La confirmation du mot de passe est requise';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = 'Le nouveau mot de passe doit être différent de l\'actuel';
    }

    setPasswordErrors(errors);
    return !Object.values(errors).some(error => error !== '');
  };

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    setIsChangingPassword(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'https://saintefamilleexcellence.ci/api/auth/change-password',
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.status === 'success') {
        setSnackbar({
          open: true,
          message: 'Mot de passe modifié avec succès !',
          severity: 'success',
        });

        // Réinitialiser le formulaire
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      
      let errorMessage = 'Erreur lors du changement de mot de passe';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSave = () => {
    // Simulation de sauvegarde
    setSnackbar({
      open: true,
      message: 'Paramètres sauvegardés avec succès',
      severity: 'success',
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
        <Container maxWidth="lg">
          <Fade in timeout={800}>
            <Box>
              {/* Header avec gradient et ombre */}
              <Box sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 3,
                p: 4,
                mb: 4,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <Box sx={{
                  position: 'absolute',
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  filter: 'blur(40px)',
                }} />
                <Typography 
                  variant="h3" 
                  component="h1" 
                  gutterBottom
                  sx={{
                    color: 'white',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  <SettingsIcon sx={{ fontSize: 40 }} />
            Paramètres
          </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: 300,
                  }}
                >
                  Gérez vos préférences et votre profil
                </Typography>
              </Box>

              <Grid container spacing={4}>
            {/* Paramètres généraux */}
            <Grid item xs={12} md={6}>
                  <Zoom in timeout={1000}>
                    <Card sx={{
                      height: '100%',
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                      borderRadius: 3,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                      },
                    }}>
                      <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <Avatar sx={{ 
                            bgcolor: 'primary.main', 
                            mr: 2,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          }}>
                            <NotificationsIcon />
                          </Avatar>
                          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                  Paramètres généraux
                </Typography>
                        </Box>
                        
                        <List sx={{ pt: 0 }}>
                          <ListItem sx={{ 
                            borderRadius: 2, 
                            mb: 1,
                            background: 'rgba(102, 126, 234, 0.05)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              background: 'rgba(102, 126, 234, 0.1)',
                            },
                          }}>
                    <ListItemText
                              primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  Notifications
                                </Typography>
                              }
                      secondary="Recevoir des notifications sur le tableau de bord"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={settings.notifications}
                        onChange={handleSettingChange('notifications')}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#667eea',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#667eea',
                                  },
                                }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                          
                          <ListItem sx={{ 
                            borderRadius: 2, 
                            mb: 1,
                            background: 'rgba(102, 126, 234, 0.05)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              background: 'rgba(102, 126, 234, 0.1)',
                            },
                          }}>
                    <ListItemText
                              primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  Notifications par email
                                </Typography>
                              }
                      secondary="Recevoir des notifications par email"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={settings.emailNotifications}
                        onChange={handleSettingChange('emailNotifications')}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#667eea',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#667eea',
                                  },
                                }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                          
                          <ListItem sx={{ 
                            borderRadius: 2, 
                            mb: 1,
                            background: 'rgba(102, 126, 234, 0.05)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              background: 'rgba(102, 126, 234, 0.1)',
                            },
                          }}>
                    <ListItemText
                              primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  Sauvegarde automatique
                                </Typography>
                              }
                      secondary="Sauvegarder automatiquement les modifications"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={settings.autoSave}
                        onChange={handleSettingChange('autoSave')}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#667eea',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#667eea',
                                  },
                                }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                          
                          <ListItem sx={{ 
                            borderRadius: 2, 
                            mb: 1,
                            background: 'rgba(102, 126, 234, 0.05)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              background: 'rgba(102, 126, 234, 0.1)',
                            },
                          }}>
                    <ListItemText
                              primary={
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  Mode sombre
                                </Typography>
                              }
                      secondary="Activer le thème sombre"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        edge="end"
                        checked={settings.darkMode}
                        onChange={handleSettingChange('darkMode')}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#667eea',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#667eea',
                                  },
                                }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
                      </CardContent>
                    </Card>
                  </Zoom>
            </Grid>

            {/* Paramètres du compte */}
            <Grid item xs={12} md={6}>
                  <Zoom in timeout={1200}>
                    <Card sx={{
                      height: '100%',
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
                      borderRadius: 3,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                      },
                    }}>
                      <CardContent sx={{ p: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <Avatar sx={{ 
                            bgcolor: 'primary.main', 
                            mr: 2,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          }}>
                            <SecurityIcon />
                          </Avatar>
                          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                            Sécurité du compte
                </Typography>
                        </Box>
                        
                        {isLoadingProfile ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <CircularProgress sx={{ color: '#667eea' }} />
                          </Box>
                        ) : (
                <Box component="form" sx={{ mt: 2 }}>
                            <Stack spacing={3}>
                              <TextField
                                fullWidth
                                label="Prénom"
                                value={profileData.firstName}
                                onChange={handleProfileFieldChange('firstName')}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '&:hover fieldset': {
                                      borderColor: '#667eea',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#667eea',
                                    },
                                  },
                                }}
                              />
                  <TextField
                    fullWidth
                                label="Nom"
                                value={profileData.lastName}
                                onChange={handleProfileFieldChange('lastName')}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '&:hover fieldset': {
                                      borderColor: '#667eea',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#667eea',
                                    },
                                  },
                                }}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                                value={profileData.email}
                                onChange={handleProfileFieldChange('email')}
                                type="email"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '&:hover fieldset': {
                                      borderColor: '#667eea',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#667eea',
                                    },
                                  },
                                }}
                              />
                              <TextField
                                fullWidth
                                label="Fonction"
                                value={profileData.fonction}
                                onChange={handleProfileFieldChange('fonction')}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    '&:hover fieldset': {
                                      borderColor: '#667eea',
                                    },
                                    '&.Mui-focused fieldset': {
                                      borderColor: '#667eea',
                                    },
                                  },
                                }}
                              />
                              
                              <Button
                                variant="contained"
                                startIcon={isUpdatingProfile ? <CircularProgress size={20} /> : <SaveIcon />}
                                onClick={handleProfileUpdate}
                                disabled={isUpdatingProfile}
                                sx={{
                                  mt: 2,
                                  mb: 3,
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  borderRadius: 2,
                                  py: 1.5,
                                  fontWeight: 600,
                                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                                    boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                                  },
                                }}
                                fullWidth
                              >
                                {isUpdatingProfile ? 'Mise à jour en cours...' : 'Sauvegarder les modifications'}
                              </Button>
                            </Stack>
                          </Box>
                        )}
                        
                        <Divider sx={{ my: 4, borderColor: 'rgba(102, 126, 234, 0.2)' }} />
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <Avatar sx={{ 
                            bgcolor: 'primary.main', 
                            mr: 2,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          }}>
                            <LockIcon />
                          </Avatar>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Changer le mot de passe
                          </Typography>
                        </Box>
                        
                        <Stack spacing={3}>
                          {/* Information sur le mot de passe actuel */}
                          <Alert severity="info" sx={{ borderRadius: 2 }}>
                            <Typography variant="body2">
                              <strong>Note de sécurité :</strong> Pour des raisons de sécurité, le mot de passe actuel ne peut pas être affiché. 
                              Entrez votre mot de passe actuel dans le champ ci-dessous pour le modifier.
                            </Typography>
                          </Alert>
                          
                          {/* Affichage du statut du mot de passe */}
                          <TextField
                            fullWidth
                            label="Statut du mot de passe actuel"
                            value={currentPasswordDisplay}
                            InputProps={{
                              readOnly: true,
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                backgroundColor: 'rgba(102, 126, 234, 0.05)',
                                '& fieldset': {
                                  borderColor: 'rgba(102, 126, 234, 0.3)',
                                },
                              },
                            }}
                          />
                          
                          <TextField
                            fullWidth
                            label="Mot de passe actuel"
                            type={showPasswords.current ? 'text' : 'password'}
                            value={passwordData.currentPassword}
                            onChange={handlePasswordFieldChange('currentPassword')}
                            error={!!passwordErrors.currentPassword}
                            helperText={passwordErrors.currentPassword || "Entrez votre mot de passe actuel pour le modifier"}
                            placeholder="Entrez votre mot de passe actuel"
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                '&:hover fieldset': {
                                  borderColor: '#667eea',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#667eea',
                                },
                              },
                            }}
                            InputProps={{
                              endAdornment: (
                                <IconButton
                                  onClick={() => togglePasswordVisibility('current')}
                                  edge="end"
                                  sx={{ color: '#667eea' }}
                                >
                                  {showPasswords.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              ),
                            }}
                          />
                          
                  <TextField
                    fullWidth
                    label="Nouveau mot de passe"
                            type={showPasswords.new ? 'text' : 'password'}
                            value={passwordData.newPassword}
                            onChange={handlePasswordFieldChange('newPassword')}
                            error={!!passwordErrors.newPassword}
                            helperText={passwordErrors.newPassword}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                '&:hover fieldset': {
                                  borderColor: '#667eea',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#667eea',
                                },
                              },
                            }}
                            InputProps={{
                              endAdornment: (
                                <IconButton
                                  onClick={() => togglePasswordVisibility('new')}
                                  edge="end"
                                  sx={{ color: '#667eea' }}
                                >
                                  {showPasswords.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              ),
                            }}
                          />
                          
                  <TextField
                    fullWidth
                            label="Confirmer le nouveau mot de passe"
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordFieldChange('confirmPassword')}
                            error={!!passwordErrors.confirmPassword}
                            helperText={passwordErrors.confirmPassword}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                                '&:hover fieldset': {
                                  borderColor: '#667eea',
                                },
                                '&.Mui-focused fieldset': {
                                  borderColor: '#667eea',
                                },
                              },
                            }}
                            InputProps={{
                              endAdornment: (
                                <IconButton
                                  onClick={() => togglePasswordVisibility('confirm')}
                                  edge="end"
                                  sx={{ color: '#667eea' }}
                                >
                                  {showPasswords.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              ),
                            }}
                          />
                          
                  <Button
                    variant="contained"
                            startIcon={isChangingPassword ? <CircularProgress size={20} /> : <LockIcon />}
                            onClick={handlePasswordChange}
                            disabled={isChangingPassword}
                            sx={{
                              mt: 2,
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              borderRadius: 2,
                              py: 1.5,
                              fontWeight: 600,
                              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                              },
                            }}
                            fullWidth
                          >
                            {isChangingPassword ? 'Modification en cours...' : 'Modifier le mot de passe'}
                  </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Zoom>
            </Grid>
          </Grid>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            TransitionComponent={undefined}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity={snackbar.severity}
                  sx={{ 
                    width: '100%',
                    borderRadius: 2,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
            </Box>
          </Fade>
        </Container>
      </Box>
    </Box>
  );
};

export default Settings; 

