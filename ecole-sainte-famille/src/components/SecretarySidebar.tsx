import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  Typography,
  Divider,
  useTheme,
  CircularProgress
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Class as ClassIcon,
  Payment as PaymentIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  PersonAdd as PersonAddIcon,
  Group as GroupIcon,
  Event,
  Assessment,
  Assignment,
  ExitToApp,
  School,
  LibraryBooks,
  LocalOffer as LocalOfferIcon,
  Restaurant as RestaurantIcon,
  PhotoCamera as PhotoCameraIcon,
  ChildCare as ChildCareIcon,
  Search as SearchIcon,
  History as HistoryIcon,
  Home as HomeIcon,
  AccountBalance as AccountBalanceIcon,
  Email as EmailIcon,
  Article as ArticleIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useIsMounted } from '../hooks/useIsMounted';

const drawerWidth = 250;

// Définition des éléments de menu avec leurs rôles autorisés
const menuItems = [
  { 
    text: 'Tableau de bord', 
    icon: <DashboardIcon />, 
    path: '/secretary/dashboard',
    roles: ['admin', 'secretary', 'directrice', 'informaticien', 'comptable']
  },
  { 
    text: 'Élèves', 
    icon: <PeopleIcon />, 
    path: '/secretary/students',
    roles: ['admin', 'secretary', 'comptable', 'informaticien']
  },
  { 
    text: 'Gestion des élèves', 
    icon: <GroupIcon />, 
    path: '/secretary/gestion-eleves',
    roles: ['admin', 'secretary', 'directrice', 'informaticien', 'comptable']
  },
  { 
    text: 'Inscription Enseignant', 
    icon: <PersonAddIcon />, 
    path: '/secretary/teachers',
    roles: ['admin', 'directrice', 'informaticien'] // Seul l'admin peut inscrire des enseignants
  },
  { 
    text: 'Classes', 
    icon: <ClassIcon />, 
    path: '/secretary/classes',
    roles: ['admin', 'secretary', 'directrice', 'informaticien', 'comptable']
  },
  { 
    text: 'Activités', 
    icon: <LibraryBooks />, 
    path: '/secretary/subjects',
    roles: ['admin', 'secretary', 'directrice', 'informaticien', 'comptable']
  },
  { 
    text: 'Gestion des emplois du temps', 
    icon: <Assignment />, 
    path: '/secretary/timetables',
    roles: ['admin', 'secretary', 'directrice', 'informaticien']
  },
  { 
    text: 'Événements', 
    icon: <Event />, 
    path: '/secretary/events',
    roles: ['admin', 'secretary', 'directrice', 'informaticien']
  },
  { 
    text: 'Gestion des médias', 
    icon: <PhotoCameraIcon />, 
    path: '/secretary/media',
    roles: ['admin', 'directrice'] // Seul l'admin peut gérer les médias
  },
  { 
    text: 'Gestion des bulletins', 
    icon: <ArticleIcon />, 
    path: '/secretary/bulletins',
    roles: ['admin', 'secretary', 'directrice', 'informaticien']
  },
  { 
    text: 'Gestion des compositions', 
    icon: <Assignment />, 
    path: '/secretary/compositions',
    roles: ['admin', 'secretary', 'directrice', 'informaticien']
  },
  { 
    text: 'Rapports', 
    icon: <Assessment />, 
    path: '/secretary/reports',
    roles: ['admin', 'secretary', 'directrice', 'informaticien']
  },
  { 
    text: 'Niveaux d\'Études', 
    icon: <School />, 
    path: '/secretary/education-levels',
    roles: ['admin', 'secretary', 'directrice', 'informaticien']
  },
  { 
    text: 'Frais annexes et Car', 
    icon: <ReceiptIcon />, 
    path: '/secretary/frais-annexes',
    roles: ['admin', 'secretary', 'informaticien', 'comptable']
  },
  { 
    text: 'Versements des Élèves', 
    icon: <AccountBalanceIcon />, 
    path: '/secretary/student-installments',
    roles: ['admin', 'secretary', 'comptable', 'informaticien']
  },
  { 
    text: 'Relances de Paiement', 
    icon: <EmailIcon />, 
    path: '/secretary/payment-reminders',
    roles: ['admin', 'secretary', 'comptable', 'informaticien']
  },
  { 
    text: 'Finances et comptabilité', 
    icon: <PaymentIcon />, 
    path: '/secretary/payments',
    roles: ['admin'] // Admin et comptable peuvent accéder aux finances
  },
  { 
    text: 'Cantine', 
    icon: <RestaurantIcon />, 
    path: '/secretary/cantine',
    roles: ['admin', 'secretary', 'informaticien']
  },
  { 
    text: 'Paramètres', 
    icon: <SettingsIcon />, 
    path: '/secretary/settings',
    roles: ['admin', 'secretary', 'comptable', 'informaticien']
  },
  { 
    text: 'Gérer les rôles', 
    icon: <SettingsIcon />, 
    path: '/secretary/roles',
    roles: ['admin', 'informaticien'] // Seul l'admin peut gérer les rôles
  },
  { 
    text: 'Garderie', 
    icon: <ChildCareIcon />, 
    path: '/secretary/garderie',
    roles: ['admin', 'secretary', 'informaticien']
  },
  { 
    text: 'Historique', 
    icon: <HistoryIcon />, 
    path: '/secretary/history',
    roles: ['admin'] // Seul l'admin peut voir l'historique
  },
];

const SecretarySidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMounted = useIsMounted();
  const [userRole, setUserRole] = useState<string>(''); // Pas de rôle par défaut
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour récupérer le rôle de l'utilisateur connecté
  const fetchUserRole = async () => {
    try {
      if (!isMounted) return;
      setIsLoading(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Token non trouvé');
        return;
      }

      const response = await axios.get('https://saintefamilleexcellence.ci/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log('Réponse API profile:', response.data); // Debug

      if (isMounted && response.data && response.data.user && response.data.user.role) {
        const role = response.data.user.role;
        console.log('Rôle détecté:', role); // Debug
        setUserRole(role);
      } else if (isMounted && response.data && response.data.role) {
        const role = response.data.role;
        console.log('Rôle détecté (format alternatif):', role); // Debug
        setUserRole(role);
      } else {
        console.log('Aucun rôle trouvé dans la réponse:', response.data); // Debug
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du rôle:', error);
      // En cas d'erreur, on garde le rôle par défaut (admin)
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchRole = async () => {
      if (!isMounted) return;
      await fetchUserRole();
    };
    
    fetchRole();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtrer les éléments de menu selon le rôle de l'utilisateur
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(userRole)
  );

  // Déterminer le titre affiché selon le rôle
  const getDisplayTitle = () => {
    switch (userRole) {
      case 'secretary':
        return 'Secrétaire';
      case 'directrice':
        return 'Directrice';
      case 'admin':
        return 'Admin';
      case 'éducateur':
        return 'Éducateur';
      case 'comptable':
        return 'Comptable';
      case 'comunicateur':
        return 'Comunicateur';
      case 'informaticien':
        return 'Informaticien';
      default:
        return isLoading ? 'Chargement...' : 'Utilisateur';
    }
  };

  return (
    <Drawer
      variant="permanent"
      className="no-print"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          bgcolor: 'linear-gradient(135deg, #1976d2 60%, #512da8 100%)',
          color: 'white',
          borderRight: 'none',
          boxShadow: 4,
          background: 'linear-gradient(135deg, #1976d2 60%, #512da8 100%)',
        },
      }}
    >
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(255,255,255,0.06)' }}>
        <img src="/img/sainte/logo.jpg" alt="Logo" style={{ width: 100, height: 48, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isLoading ? (
            <CircularProgress size={20} sx={{ color: 'white' }} />
          ) : (
            <Typography variant="h5" noWrap component="div" sx={{ fontWeight: 700, letterSpacing: 1 }}>
              {getDisplayTitle()}
            </Typography>
          )}
        </Box>
      </Box>
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.15)' }} />
      <List sx={{ mt: 2 }}>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mx: 1,
                '&.Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.18)',
                  color: '#1976d2',
                  fontWeight: 700,
                  '& .MuiListItemIcon-root': {
                    color: '#1976d2',
                  },
                },
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.10)',
                },
                transition: 'all 0.2s',
              }}
            >
              <ListItemIcon sx={{ color: 'white', minWidth: 40, fontSize: 24 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 500, fontSize: 17 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.15)' }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => navigate('/')}
            sx={{
              borderRadius: 2,
              mx: 1,
              mb: 2,
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.10)',
              },
              transition: 'all 0.2s',
            }}
          >
            <ListItemIcon sx={{ color: 'white', minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Déconnexion" primaryTypographyProps={{ fontWeight: 500, fontSize: 17 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};

export default SecretarySidebar; 

