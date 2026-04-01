import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Button, Stack, Card, CardActionArea, Container, CircularProgress, Alert, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ClassIcon from '@mui/icons-material/Class';
import GroupIcon from '@mui/icons-material/Group';
import SecretarySidebar from '../../components/SecretarySidebar';
import axios from 'axios';

interface ClassData {
  id: number;
  name: string;
  level: string;
  students_count: number;
}

// Helper pour générer une couleur HSL à partir d'une chaîne
function stringToHslColor(str: string, s: number, l: number): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, ${s}%, ${l}%)`;
}

const ClassEventSelectionPage = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isMounted) setClasses(response.data);
      } catch (err) {
        if (isMounted) {
          setError('Erreur lors de la récupération des classes.');
          console.error(err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchClasses();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <SecretarySidebar />
      <Box 
        component="main"
        sx={{ p: 3, flexGrow: 1, bgcolor: '#f0f7ff' }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 5 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
              Événement par Classe : Choisir une classe
            </Typography>
            <Button 
                variant="outlined" 
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/secretary/events')}
            >
                Retour
            </Button>
          </Stack>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <Grid container spacing={4}>
              {classes.map((cls) => {
                const color1 = stringToHslColor(cls.name, 60, 55);
                const color2 = stringToHslColor(cls.name, 75, 70);
                const gradient = `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
                const shadowHue = stringToHslColor(cls.name, 60, 55).match(/(\d+)/)?.[0] || '210';

                return (
                  <Grid item xs={12} sm={6} md={4} key={cls.id}>
                    <Card sx={{
                      position: 'relative',
                      color: 'white',
                      background: gradient,
                      borderRadius: 4,
                      overflow: 'hidden',
                      height: '100%',
                      transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-8px) scale(1.03)',
                        boxShadow: `0 16px 32px hsla(${shadowHue}, 50%, 40%, 0.3)`,
                      },
                    }}>
                      <Box sx={{ 
                          position: 'absolute', 
                          top: -20,
                          right: -20, 
                          opacity: 0.15, 
                          color: 'white',
                          pointerEvents: 'none',
                      }}>
                          <ClassIcon sx={{ fontSize: 140, transform: 'rotate(-15deg)' }}/>
                      </Box>
                      <CardActionArea 
                        onClick={() => navigate(`/secretary/events/class/${cls.id}`)}
                        sx={{ 
                          p: 3, 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'flex-start',
                          minHeight: '190px',
                          position: 'relative',
                          zIndex: 1,
                          height: '100%'
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ width: '100%'}}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', width: 52, height: 52, mb: 2 }}>
                                <ClassIcon sx={{ fontSize: 30, color: 'white' }} />
                            </Avatar>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ bgcolor: 'rgba(0,0,0,0.2)', px: 1.5, py: 0.5, borderRadius: 10, mt: 1 }}>
                                <GroupIcon fontSize="small"/>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {cls.students_count} {cls.students_count > 1 ? 'élèves' : 'élève'}
                                </Typography>
                            </Stack>
                        </Stack>
                        
                        <Box sx={{ flexGrow: 1 }}/>

                        <Box>
                            <Typography variant="h5" fontWeight="bold">{cls.name}</Typography>
                            <Typography variant="body1" sx={{ opacity: 0.85 }}>Niveau: {cls.level}</Typography>
                        </Box>
                      </CardActionArea>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default ClassEventSelectionPage; 

