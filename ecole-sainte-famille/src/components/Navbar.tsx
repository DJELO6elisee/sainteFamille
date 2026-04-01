import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
} from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import LoginIcon from '@mui/icons-material/Login';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const Navbar = () => {
  const location = useLocation();
  return (
    <AppBar position="sticky">
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          {location.pathname !== '/' && (
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ArrowBackIcon />}
              component={RouterLink}
              to="/"
              sx={{
                mr: 2,
                borderColor: 'white',
                color: 'primary.main',
                background: 'white',
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: 2,
                px: 2.5,
                py: 1,
                minWidth: 120,
                fontSize: 16,
                letterSpacing: 1,
                transition: 'all 0.2s',
                '& .MuiButton-startIcon': {
                  color: 'primary.main',
                },
                '&:hover': {
                  background: '#e3f0fc',
                  borderColor: 'primary.main',
                  color: 'primary.dark',
                  boxShadow: 4,
                },
              }}
            >
              Retour
            </Button>
          )}
          <SchoolIcon sx={{ mr: 2 }} />
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 'bold',
            }}
          >
           GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {location.pathname === '/' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<LoginIcon />}
                component={RouterLink}
                to="/login"
              >
                Connexion
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar; 
