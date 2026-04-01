import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Badge,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import PaymentIcon from '@mui/icons-material/Payment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventIcon from '@mui/icons-material/Event';
import GradeIcon from '@mui/icons-material/Grade';
import BookIcon from '@mui/icons-material/Book';

const StudentNavbar = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setNotificationsAnchorEl(null);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <SchoolIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Espace Élève
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            color="inherit"
            component={RouterLink}
            to="/student/dashboard"
            startIcon={<AssignmentIcon />}
          >
            Tableau de bord
          </Button>

          <Button
            color="inherit"
            component={RouterLink}
            to="/student/schedule"
            startIcon={<EventIcon />}
          >
            Emploi du temps
          </Button>

          <Button
            color="inherit"
            component={RouterLink}
            to="/student/grades"
            startIcon={<GradeIcon />}
          >
            Notes
          </Button>

          <Button
            color="inherit"
            component={RouterLink}
            to="/student/courses"
            startIcon={<BookIcon />}
          >
            Cours
          </Button>

          <Button
            variant="contained"
            color="secondary"
            startIcon={<PaymentIcon />}
            component={RouterLink}
            to="/student/payment"
            sx={{ ml: 2 }}
          >
            Payer ma scolarité
          </Button>

          <IconButton
            color="inherit"
            onClick={handleNotificationsMenuOpen}
            sx={{ ml: 1 }}
          >
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton
            color="inherit"
            onClick={handleProfileMenuOpen}
            sx={{ ml: 1 }}
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              <AccountCircleIcon />
            </Avatar>
          </IconButton>
        </Box>

        {/* Menu des notifications */}
        <Menu
          anchorEl={notificationsAnchorEl}
          open={Boolean(notificationsAnchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleMenuClose}>
            Nouveau message de votre professeur
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            Note de cours publiée
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            Rappel de paiement
          </MenuItem>
        </Menu>

        {/* Menu du profil */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem component={RouterLink} to="/student/profile" onClick={handleMenuClose}>
            Mon profil
          </MenuItem>
          <MenuItem component={RouterLink} to="/student/settings" onClick={handleMenuClose}>
            Paramètres
          </MenuItem>
          <MenuItem onClick={handleMenuClose}>
            Déconnexion
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default StudentNavbar; 
