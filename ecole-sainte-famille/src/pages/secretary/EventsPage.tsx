import React from 'react';
import { Box, Typography, Grid, Button, Stack, Card, CardActionArea, Container, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CampaignIcon from '@mui/icons-material/Campaign';
import SchoolIcon from '@mui/icons-material/School';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SecretarySidebar from '../../components/SecretarySidebar';

const EventsPage = () => {
  const navigate = useNavigate();

  const eventTypes = [
    {
      title: 'Événement Publique',
      description: 'Annonces visibles par tous les utilisateurs de la plateforme.',
      icon: <CampaignIcon />,
      path: '/secretary/events/public',
      gradient: 'linear-gradient(135deg, #64b5f6 0%, #1976d2 100%)',
    },
    {
      title: 'Événement par Classe',
      description: 'Ciblez des classes spécifiques avec vos communications.',
      icon: <SchoolIcon />,
      path: '/secretary/events/class',
      gradient: 'linear-gradient(135deg, #81c784 0%, #388e3c 100%)',
    },
    {
      title: 'Événement Privé',
      description: 'Envoyez des messages privés à des utilisateurs ou groupes spécifiques.',
      icon: <LockIcon />,
      path: '/secretary/events/private',
      gradient: 'linear-gradient(135deg, #f06292 0%, #c2185b 100%)',
    },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <SecretarySidebar />
      <Box 
        component="main"
        sx={{ p: 3, flexGrow: 1, bgcolor: '#f0f7ff' }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 5 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.dark', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
              Gestion des Événements
            </Typography>
            <Button 
                variant="outlined" 
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/secretary/dashboard')}
            >
                Retour
            </Button>
          </Stack>
          <Grid container spacing={4}>
            {eventTypes.map((event) => (
              <Grid item xs={12} md={4} key={event.title}>
                <Card sx={{
                  position: 'relative',
                  color: 'white',
                  background: event.gradient,
                  borderRadius: 4,
                  overflow: 'hidden',
                  height: '100%',
                  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.03)',
                    boxShadow: '0 16px 32px rgba(0,0,0,0.25)',
                  },
                }}>
                  <Box sx={{ 
                    position: 'absolute', 
                    top: -20,
                    right: -20, 
                    opacity: 0.15, 
                    color: 'white',
                    pointerEvents: 'none'
                  }}>
                    {React.cloneElement(event.icon, { sx: { fontSize: 140, transform: 'rotate(-15deg)' }})}
                  </Box>
                  <CardActionArea onClick={() => navigate(event.path)} sx={{ 
                    p: { xs: 2.5, md: 3 }, 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.25)', mb: 2, width: 56, height: 56 }}>
                      {React.cloneElement(event.icon, { sx: { fontSize: 32, color: 'white' }})}
                    </Avatar>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      {event.title}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
                      {event.description}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default EventsPage; 
