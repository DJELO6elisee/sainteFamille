import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Paper, useTheme, useMediaQuery, CircularProgress, Alert } from '@mui/material';
import { ContactBanner, SiteFooter } from './Home';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaletteIcon from '@mui/icons-material/Palette';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import axios from 'axios';

interface ActivityImage {
  id: number;
  image_url: string;
  alt_text?: string;
  order_index: number;
  is_active: boolean;
}

interface Activity {
  id: number;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
  order_index: number;
  images: ActivityImage[];
}

const ActivitesExtrascolaires = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadActivityImages = async () => {
      try {
        setLoading(true);
        const response = await axios.get('https://saintefamilleexcellence.ci/api/homepage/activities/3'); // ID 3 = Activités Extrascolaires
        if (response.data.status === 'success') {
          setActivity(response.data.data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des images:', error);
        setError('Erreur lors du chargement des images depuis le serveur');
      } finally {
        setLoading(false);
      }
    };

    loadActivityImages();
  }, []);

  const getImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // Si l'URL commence par /img/pages, utiliser le domaine du frontend
    if (imageUrl.startsWith('/img/pages/')) {
      return `https://saintefamilleexcellence.ci${imageUrl}`;
    }
    
    // Si l'URL commence par /uploads/homepage/, utiliser la nouvelle route API
    if (imageUrl.startsWith('/uploads/homepage/')) {
      const filename = imageUrl.split('/').pop();
      return `https://saintefamilleexcellence.ci/api/homepage/images/${filename}`;
    }
    
    // Si l'URL commence par /uploads, utiliser le domaine du backend
    if (imageUrl.startsWith('/uploads/')) {
      return `https://saintefamilleexcellence.ci${imageUrl}`;
    }
    
    // Par défaut, ajouter le domaine du backend
    return `https://saintefamilleexcellence.ci${imageUrl}`;
  };

  return (
    <Box>
      <ContactBanner />
      
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #eee', py: 2 }}>
        <Container maxWidth="lg">
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <Box sx={{ minWidth: 180 }}>
              <img 
                src="/img/pages/vrailogo.jpg" 
                alt="Logo GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE" 
                style={{ height: 70, maxWidth: '100%' }} 
              />
            </Box>
            
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1780c2',
                  display: { xs: 'none', md: 'block' }
                }}
              >
                Activités Extrascolaires
              </Typography>
              <Box
                onClick={() => navigate('/')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  color: '#1780c2',
                  '&:hover': {
                    color: '#1565c0',
                  }
                }}
              >
                <ArrowBackIcon />
                <Typography sx={{ fontWeight: 600 }}>
                  Retour à l'accueil
                </Typography>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      <Box sx={{ 
        py: { xs: 4, md: 8 }, 
        bgcolor: '#f8f9fa',
        minHeight: '100vh'
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            textAlign: 'center', 
            mb: { xs: 4, md: 6 },
            bgcolor: 'white',
            borderRadius: 3,
            p: { xs: 3, md: 4 },
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 1 }}>
              <PaletteIcon sx={{ color: '#1780c2', fontSize: { xs: 32, md: 40, lg: 44 } }} />
              <Typography 
                variant="h2" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1780c2',
                  fontSize: { xs: 24, md: 32, lg: 36 }
                }}
              >
                Activités Extrascolaires
              </Typography>
            </Box>
            <Typography 
              variant="h5" 
              sx={{ 
                color: '#666',
                fontSize: { xs: 16, md: 18 },
                lineHeight: 1.6
              }}
            >
              Découvrez nos activités créatives et sportives pour l'épanouissement complet de votre enfant
            </Typography>
          </Box>

          <Box sx={{ 
            bgcolor: 'white',
            borderRadius: 3,
            p: { xs: 3, md: 4 },
            mb: { xs: 4, md: 6 },
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: '#1780c2',
                mb: 3,
                fontSize: { xs: 20, md: 24 }
              }}
            >
              Nos Activités Créatives et Sportives
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <PaletteIcon sx={{ color: '#1780c2', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#1780c2', fontWeight: 600 }}>
                       Arts Plastiques et Créativité
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Peinture, dessin, modelage, collage et activités manuelles pour développer 
                    l'expression artistique et la motricité fine.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <MusicNoteIcon sx={{ color: '#1780c2', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#1780c2', fontWeight: 600 }}>
                       Musique et Expression
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Chant, danse, éveil musical et découverte des instruments pour stimuler 
                    la sensibilité artistique et l'expression corporelle.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ 
            bgcolor: 'white',
            borderRadius: 3,
            p: { xs: 3, md: 4 },
            mb: { xs: 4, md: 6 },
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color: '#1780c2',
                mb: 4,
                textAlign: 'center',
                fontSize: { xs: 20, md: 24 }
              }}
            >
              Galerie Photos - Activités Extrascolaires
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : activity?.images && activity.images.length > 0 ? (
              <Grid container spacing={3}>
                {activity.images.map((photo, index) => (
                  <Grid item xs={12} sm={6} md={4} key={photo.id}>
                    <Paper 
                      elevation={3}
                      sx={{ 
                        borderRadius: 3,
                        overflow: 'hidden',
                        transition: 'transform 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.05)',
                        }
                      }}
                    >
                      <img 
                        src={getImageUrl(photo.image_url)}
                        alt={photo.alt_text || `Activité extrascolaire ${index + 1}`}
                        style={{ 
                          width: '100%', 
                          height: 250, 
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        onError={(e) => {
                          // Utiliser une image de test en cas d'erreur
                          e.currentTarget.src = `https://picsum.photos/400/300?random=${photo.id}`;
                          e.currentTarget.style.display = 'block';
                        }}
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" sx={{ color: '#666', mb: 2 }}>
                  Aucune image disponible pour le moment
                </Typography>
                <Typography variant="body2" sx={{ color: '#999' }}>
                  Les images seront ajoutées par l'équipe de communication
                </Typography>
              </Box>
            )}
          </Box>
        </Container>
      </Box>

      <SiteFooter />
    </Box>
  );
};

export default ActivitesExtrascolaires;

