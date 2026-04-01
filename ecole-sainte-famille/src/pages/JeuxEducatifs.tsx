import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Paper, useTheme, useMediaQuery, CircularProgress, Alert } from '@mui/material';
import { ContactBanner, SiteFooter } from './Home';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import PsychologyIcon from '@mui/icons-material/Psychology';
import BrushIcon from '@mui/icons-material/Brush';
import GroupIcon from '@mui/icons-material/Group';
import TranslateIcon from '@mui/icons-material/Translate';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
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

const JeuxEducatifs = () => {
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
        const response = await axios.get('https://saintefamilleexcellence.ci/api/homepage/activities/1'); // ID 1 = Jeux Éducatifs
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
      {/* Header avec bannière de contact */}
      <ContactBanner />
      
      {/* Navigation */}
      <Box sx={{ bgcolor: 'white', borderBottom: '1px solid #eee', py: 2 }}>
        <Container maxWidth="lg">
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {/* Logo */}
            <Box sx={{ minWidth: 180 }}>
              <img 
                src="/img/pages/vrailogo.jpg" 
                alt="Logo GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE" 
                style={{ height: 70, maxWidth: '100%' }} 
              />
            </Box>
            
            {/* Bouton retour */}
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
                Jeux Éducatifs
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

      {/* Contenu principal */}
      <Box sx={{ 
        py: { xs: 4, md: 8 }, 
        bgcolor: '#f8f9fa',
        minHeight: '100vh'
      }}>
        <Container maxWidth="lg">
          {/* En-tête de la page */}
          <Box sx={{ 
            textAlign: 'center', 
            mb: { xs: 4, md: 6 },
            bgcolor: 'white',
            borderRadius: 3,
            p: { xs: 3, md: 4 },
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, gap: 1 }}>
              <SportsEsportsIcon sx={{ color: '#1780c2', fontSize: { xs: 32, md: 40, lg: 44 } }} />
              <Typography 
                variant="h2" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1780c2',
                  fontSize: { xs: 24, md: 32, lg: 36 }
                }}
              >
                Jeux Éducatifs
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
              Activités pédagogiques innovantes pour stimuler le développement cognitif et créatif de votre enfant
            </Typography>
          </Box>

          {/* Description détaillée */}
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
              Notre Approche Pédagogique
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: '#666', 
                lineHeight: 1.8,
                fontSize: { xs: 16, md: 18 },
                mb: 3
              }}
            >
              Nos jeux éducatifs sont conçus pour développer les compétences essentielles de votre enfant 
              tout en s'amusant. Nous utilisons des méthodes pédagogiques modernes et des outils 
              spécialement adaptés à chaque tranche d'âge.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <PsychologyIcon sx={{ color: '#1780c2', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#1780c2', fontWeight: 600 }}>
                       Développement Cognitif
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Puzzles, jeux de logique et activités de résolution de problèmes pour stimuler 
                    la pensée critique et la créativité.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <BrushIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                       Créativité Artistique
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Activités manuelles, peinture, dessin et travaux créatifs pour développer 
                    l'expression artistique et la motricité fine.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <GroupIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 600 }}>
                       Compétences Sociales
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Jeux de groupe, activités collaboratives et jeux de rôle pour développer 
                    l'empathie et les compétences sociales.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <TranslateIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#9c27b0', fontWeight: 600 }}>
                       Apprentissage Préscolaire
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Introduction aux lettres, chiffres, couleurs et formes à travers des jeux 
                    interactifs et des activités ludiques.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Galerie de photos */}
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
              Galerie Photos - Nos Activités
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
                {activity.images.map((image, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={image.id}>
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
                        src={getImageUrl(image.image_url)}
                        alt={image.alt_text || `Jeux éducatifs ${idx + 1}`}
                        style={{ 
                          width: '100%', 
                          height: 250, 
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        onError={(e) => {
                          // Utiliser une image de test en cas d'erreur
                          e.currentTarget.src = `https://picsum.photos/400/300?random=${image.id}`;
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

          {/* Informations pratiques */}
          <Box sx={{ 
            bgcolor: 'white',
            borderRadius: 3,
            p: { xs: 3, md: 4 },
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
              Informations Pratiques
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 0.5 }}>
                     <AccessTimeIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                       Horaires
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Lundi au vendredi<br />
                    07h00 - 11h30<br />
                    13h30 - 18h00
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 0.5 }}>
                     <GroupIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 600 }}>
                       Groupes
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Petits groupes de 8-12 enfants<br />
                    Encadrement personnalisé<br />
                    Activités adaptées par âge
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, gap: 0.5 }}>
                     <ContactPhoneIcon sx={{ color: '#9c27b0', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#9c27b0', fontWeight: 600 }}>
                       Contact
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    (+225) 27 22 51 69 04<br />
                    (+225) 07 08 02 24 24<br />
                    infos@lapetiteacademie.ci
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <SiteFooter />
    </Box>
  );
};

export default JeuxEducatifs;

