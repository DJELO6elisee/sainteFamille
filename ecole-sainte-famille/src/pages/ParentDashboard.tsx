import React, { useState, useEffect } from 'react';
import UpdateButton from '../components/UpdateButton';
import {
  Box,
  Typography,
  Paper,
  Button,
  Badge,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Stack
} from '@mui/material';
import {
  Notifications,
  Logout,
  Info,
  Event,
  CheckCircle
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useIsMounted } from '../hooks/useIsMounted';

const ParentDashboard = () => {
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMounted = useIsMounted();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);

  // Pour le menu déroulant
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleNotifClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleNotifClose = () => {
    setAnchorEl(null);
  };

  const [selectedNotif, setSelectedNotif] = useState<any | null>(null);
  
  const handleNotifDetail = (notif: any) => {
    setSelectedNotif(notif);
    handleNotifClose();
    // Marquer la notification comme lue
    markNotificationAsRead(notif.id);
  };
  
  const handleDialogClose = () => {
    setSelectedNotif(null);
  };
  


  // Fonction pour marquer une notification comme lue
  const markNotificationAsRead = async (notificationId: number) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await axios.post('https://saintefamilleexcellence.ci/api/parent/notification/read', {
        userId: user.id,
        notificationId
      });
      if (isMounted) {
        setNotifications(prev => prev.map(n =>
          n.id === notificationId ? { ...n, is_read: 1 } : n
        ));
        setNotifCount(prev => Math.max(0, notifications.filter(n => !n.is_read && n.id !== notificationId).length));
      }
    } catch (error) {
      console.error('Erreur lors du marquage de la notification:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      await axios.post('https://saintefamilleexcellence.ci/api/parent/notification/read-all', {
        userId: user.id
      });
      if (isMounted) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        setNotifCount(0);
      }
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
    }
  };

  const getCurrentSchoolYear = () => {
    const now = new Date();
    const currentYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return `${currentYear}-${currentYear + 1}`;
  };

  const getSchoolYears = (count = 5) => {
    const now = new Date();
    const currentYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return Array.from({ length: count }, (_, i) => {
      const start = currentYear - (count - 1 - i);
      return `${start}-${start + 1}`;
    }).reverse();
  };

  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());
  const SCHOOL_YEARS = getSchoolYears(5);
  const [parent, setParent] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchChildren = async () => {
      if (!isMounted) return;
      
      console.log('[DEBUG] fetchChildren appelée');
      setLoading(true);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('[DEBUG] Token:', token ? 'présent' : 'absent');
      console.log('[DEBUG] User:', user);
      if (!user.id) {
        console.log('[DEBUG] Pas d\'user.id, arrêt fetchChildren');
        if (isMounted) {
          setChildren([]);
          setLoading(false);
        }
        return;
      }
      try {
        console.log('[DEBUG] Appel API /api/students avec token:', token ? 'présent' : 'absent');
        // Le backend va automatiquement filtrer par l'email du parent connecté
        const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('[DEBUG] Réponse API /api/students:', data);
        if (isMounted) {
          setChildren(data);
        }
      } catch (e: any) {
        if (isMounted) {
          console.error('Erreur lors de la récupération des enfants:', e);
          console.error('[DEBUG] Détails de l\'erreur:', e.response?.status, e.response?.data);
          setChildren([]);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    // Nouvelle récupération des notifications parent
    const fetchNotifications = async () => {
      if (!isMounted) return;
      
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.id) return;
      try {
        const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/parent/${user.id}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) {
          setNotifications(data);
          setNotifCount(data.filter((n: any) => !n.is_read).length);
        }
      } catch (e: any) {
        if (isMounted) {
          setNotifications([]);
          setNotifCount(0);
        }
      }
    };

    const fetchParent = async () => {
      if (!isMounted) return;
      
      const token = localStorage.getItem('token');
      try {
        const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/auth/me?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) {
          setParent(data);
        }
      } catch {
        if (isMounted) {
          setParent(null);
        }
      }
    };

    fetchChildren();
    fetchNotifications();
    fetchParent();
    
    return () => {
      isMounted = false;
    };
  }, [schoolYear]);

  // Déconnexion
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  if (loading) return <CircularProgress />;
  if (!children.length) return <Typography>Aucun enfant trouvé pour ce compte parent.</Typography>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', p: { xs: 1, sm: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <FormControl sx={{ minWidth: 160 }} size="small">
          <InputLabel id="school-year-label">Année scolaire</InputLabel>
          <Select
            labelId="school-year-label"
            value={schoolYear}
            label="Année scolaire"
            onChange={e => setSchoolYear(e.target.value)}
          >
            {SCHOOL_YEARS.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Paper elevation={4} sx={{ maxWidth: 700, width: '100%', minHeight: 480, mx: 'auto', p: { xs: 5, sm: 6 }, borderRadius: 6, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.12)', mt: 8, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
        {/* Ligne titre + actions */}
        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" mb={3}>
          <Typography variant="h3" fontWeight={900} color="primary.main" gutterBottom sx={{ fontSize: { xs: 24, sm: 32 }, m: 0 }}>
            Bienvenue sur le tableau de bord parent !
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton color="primary" sx={{ bgcolor: '#fff', borderRadius: 2, boxShadow: 2 }} onClick={handleNotifClick}>
              <Badge badgeContent={notifCount} color="error">
                <Notifications sx={{ fontSize: 30 }} />
              </Badge>
            </IconButton>
            <IconButton color="error" sx={{ bgcolor: '#fff', borderRadius: 2, boxShadow: 2 }} onClick={handleLogout} title="Se déconnecter">
              <Logout sx={{ fontSize: 30 }} />
            </IconButton>
          </Box>
        </Box>
        <Typography variant="body1" sx={{ mb: 3, fontSize: 18, color: '#333', textAlign: 'center' }}>
          Sélectionnez votre enfant et l'option souhaitée :
        </Typography>
        

        <Stack direction="column" spacing={3} alignItems="center" mt={2} width="100%">
          {children.map(child => (
            <Box key={child.id} sx={{ width: '100%', maxWidth: 400 }}>
              <Typography variant="h6" sx={{ mb: 2, textAlign: 'center', fontWeight: 700, color: '#1976d2' }}>
                {child.first_name} {child.last_name}
              </Typography>
              
              {/* Bouton Emplois du temps unique */}
            <Button
              variant="contained"
                fullWidth
                startIcon={<Event />}
              sx={{
                py: 2,
                  fontSize: 16,
                  fontWeight: 700,
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
                color: 'white',
                  boxShadow: 3,
                  textTransform: 'none',
                transition: 'all 0.2s',
                  mb: 2,
                  '&:hover': {
                    background: 'linear-gradient(90deg, #1565c0 0%, #1976d2 100%)',
                    boxShadow: 5,
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => {
                  console.log('🔍 Clic sur Emplois du temps pour:', child.first_name);
                  navigate(`/parent/child/${child.id}?tab=schedule`);
                }}
              >
                Emplois du temps
              </Button>
              
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  py: 1.5,
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  borderColor: '#1976d2',
                  color: '#1976d2',
                '&:hover': {
                    borderColor: '#1565c0',
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                },
              }}
              onClick={() => navigate(`/parent/child/${child.id}`)}
            >
                Voir le profil complet
            </Button>
            </Box>
          ))}
        </Stack>
        

        
        {/* Menu notifications */}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleNotifClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { minWidth: 320, borderRadius: 3, boxShadow: 4 } }}
        >
          <Box sx={{ px: 2, pt: 1, pb: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" color="primary.main" fontWeight={700}>
              Notifications
            </Typography>
            {notifications.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  markAllNotificationsAsRead();
                }}
                sx={{ fontSize: 12, py: 0.5 }}
              >
                Tout marquer comme lu
              </Button>
            )}
          </Box>
          {notifications.length === 0 ? (
            <MenuItem disabled>
              <ListItemText primary="Aucune notification" />
            </MenuItem>
          ) : (
            <>
              {notifications.map((notif: any, i: number) => {
                // Recherche du prénom/nom de l'enfant concerné si possible
                let enfant = null;
                if (notif.type === 'private' && notif.message && children.length > 0) {
                  // On tente d'extraire le prénom/nom de l'enfant depuis le message ou le titre
                  const found = children.find(child =>
                    notif.message.includes(child.first_name) || notif.title.includes(child.first_name)
                  );
                  if (found) enfant = `${found.first_name} ${found.last_name}`;
                }
                return (
                  <MenuItem 
                    key={i} 
                    onClick={() => {
                      markNotificationAsRead(notif.id);
                      handleNotifDetail(notif);
                    }} 
                    sx={{ 
                      alignItems: 'flex-start', 
                      cursor: 'pointer',
                      backgroundColor: notif.is_read ? 'transparent' : '#f0f8ff',
                      '&:hover': {
                        backgroundColor: notif.is_read ? '#f5f5f5' : '#e3f2fd'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ mt: 0.5 }}>
                      {notif.type === 'public' && <Info color="primary" />}
                      {notif.type === 'private' && <Event color="warning" />}
                      {notif.type === 'class' && <CheckCircle color="success" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={<span>
                        {notif.title}
                        {!notif.is_read && (
                          <span style={{
                            marginLeft: 8,
                            fontSize: 10,
                            backgroundColor: '#ff4444',
                            color: 'white',
                            borderRadius: '50%',
                            width: 16,
                            height: 16,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold'
                          }}>
                            N
                          </span>
                        )}
                        <span style={{
                          marginLeft: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            notif.type === 'public' ? '#1976d2' :
                            notif.type === 'private' ? '#ff9800' :
                            '#43a047',
                          border: '1px solid',
                          borderColor:
                            notif.type === 'public' ? '#1976d2' :
                            notif.type === 'private' ? '#ff9800' :
                            '#43a047',
                          borderRadius: 8,
                          padding: '2px 8px',
                          background:
                            notif.type === 'public' ? '#e3f2fd' :
                            notif.type === 'private' ? '#fff3e0' :
                            '#e8f5e9',
                        }}>
                          {notif.type === 'public' && 'Public'}
                          {notif.type === 'private' && 'Privé'}
                          {notif.type === 'class' && 'Classe'}
                        </span>
                        {enfant && (
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#1976d2', fontWeight: 500 }}>
                            (Enfant : {enfant})
                          </span>
                        )}
                      </span>}
                      secondary={notif.message}
                      primaryTypographyProps={{ fontSize: 15 }}
                      secondaryTypographyProps={{ fontSize: 13, color: 'text.secondary' }}
                    />
                  </MenuItem>
                );
              })}
              <MenuItem disabled sx={{ borderTop: '1px solid #e0e0e0', mt: 1 }}>
                <ListItemText 
                  primary="Affiche les 10 notifications les plus récentes" 
                  primaryTypographyProps={{ fontSize: 12, color: 'text.secondary', fontStyle: 'italic' }}
                />
              </MenuItem>
            </>
          )}
        </Menu>
        {/* Dialog de détail notification */}
        <Dialog open={!!selectedNotif} onClose={handleDialogClose} maxWidth="sm" fullWidth>
          {selectedNotif && (
            <>
              <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>{selectedNotif.title}</DialogTitle>
              <DialogContent>
                <Box mb={2}>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color:
                      selectedNotif.type === 'public' ? '#1976d2' :
                      selectedNotif.type === 'private' ? '#ff9800' :
                      '#43a047',
                    border: '1px solid',
                    borderColor:
                      selectedNotif.type === 'public' ? '#1976d2' :
                      selectedNotif.type === 'private' ? '#ff9800' :
                      '#43a047',
                    borderRadius: 8,
                    padding: '2px 10px',
                    background:
                      selectedNotif.type === 'public' ? '#e3f2fd' :
                      selectedNotif.type === 'private' ? '#fff3e0' :
                      '#e8f5e9',
                  }}>
                    {selectedNotif.type === 'public' && 'Public'}
                    {selectedNotif.type === 'private' && 'Privé'}
                    {selectedNotif.type === 'class' && 'Classe'}
                  </span>
                  {/* Affiche l'enfant concerné si possible */}
                  {selectedNotif.type === 'private' && children.length > 0 && (() => {
                    const found = children.find(child =>
                      (selectedNotif.message && selectedNotif.message.includes(child.first_name)) ||
                      (selectedNotif.title && selectedNotif.title.includes(child.first_name))
                    );
                    return found ? (
                      <span style={{ marginLeft: 12, fontSize: 13, color: '#1976d2', fontWeight: 500 }}>
                        (Enfant : {found.first_name} {found.last_name})
                      </span>
                    ) : null;
                  })()}
                </Box>
                <Typography variant="body1" mb={2}>{selectedNotif.message}</Typography>
                {selectedNotif.event_date && (
                  <Typography variant="body2" color="text.secondary">
                    Date de l'événement : {new Date(selectedNotif.event_date).toLocaleString('fr-FR')}
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleDialogClose} color="primary" variant="contained">Fermer</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
        
      </Paper>
      <UpdateButton position="fixed" />
    </Box>
  );
};

export default ParentDashboard; 

