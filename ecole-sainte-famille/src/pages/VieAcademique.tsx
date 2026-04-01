import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Paper, useTheme, useMediaQuery, CircularProgress, Alert } from '@mui/material';
import { ContactBanner, SiteFooter } from './Home';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookIcon from '@mui/icons-material/Book';
import TranslateIcon from '@mui/icons-material/Translate';
import CalculateIcon from '@mui/icons-material/Calculate';
import PublicIcon from '@mui/icons-material/Public';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import FlagIcon from '@mui/icons-material/Flag';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
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

const VieAcademique = () => {
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
        const response = await axios.get('https://saintefamilleexcellence.ci/api/homepage/activities/2'); // ID 2 = Vie Académique
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
                  color: '#FF9800',
                  display: { xs: 'none', md: 'block' }
                }}
              >
                Vie Académique
              </Typography>
              <Box
                onClick={() => navigate('/')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  color: '#FF9800',
                  '&:hover': {
                    color: '#F57C00',
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
              <BookIcon sx={{ color: '#FF9800', fontSize: { xs: 32, md: 40, lg: 44 } }} />
              <Typography 
                variant="h2" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#FF9800',
                  fontSize: { xs: 24, md: 32, lg: 36 }
                }}
              >
                Vie Académique
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
              Programme éducatif complet et structuré pour préparer votre enfant à l'école maternelle
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
                color: '#FF9800',
                mb: 3,
                fontSize: { xs: 20, md: 24 }
              }}
            >
              Notre Programme Éducatif
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
              Notre programme académique est conçu pour offrir une base solide aux enfants 
              en préparation de leur entrée à l'école maternelle. Nous combinons apprentissage 
              structuré et développement personnel dans un environnement bienveillant.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <TranslateIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                       Langage et Communication
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Développement du vocabulaire, expression orale, écoute active et 
                    préparation à la lecture et l'écriture.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <CalculateIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                       Mathématiques Préscolaires
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Découverte des nombres, comptage, formes géométriques, tri et 
                    classification d'objets.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <PublicIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                       Découverte du Monde
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Exploration de l'environnement, sciences naturelles, géographie 
                    et culture générale adaptée aux enfants.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <MusicNoteIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                       Éveil Artistique et Musical
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Musique, chant, danse, arts plastiques et expression créative 
                    pour développer la sensibilité artistique.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Niveaux par âge */}
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
                color: '#FF9800',
                mb: 4,
                textAlign: 'center',
                fontSize: { xs: 20, md: 24 }
              }}
            >
              Niveaux par Âge
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#fff3e0' }}>
                  <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 700, mb: 2 }}>
                    TPS (2-3 ans)
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                    Éveil sensoriel et développement de l'autonomie
                  </Typography>
                  <Box sx={{ 
                    width: 60, 
                    height: 3, 
                    bgcolor: '#FF9800', 
                    mx: 'auto',
                    borderRadius: 2
                  }} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#fff3e0' }}>
                  <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 700, mb: 2 }}>
                    PS (3-4 ans)
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                    Découverte des lettres et premiers apprentissages
                  </Typography>
                  <Box sx={{ 
                    width: 60, 
                    height: 3, 
                    bgcolor: '#FF9800', 
                    mx: 'auto',
                    borderRadius: 2
                  }} />
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#fff3e0' }}>
                  <Typography variant="h5" sx={{ color: '#FF9800', fontWeight: 700, mb: 2 }}>
                    MS (4-5 ans)
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
                    Approfondissement et préparation à la GS
                  </Typography>
                  <Box sx={{ 
                    width: 60, 
                    height: 3, 
                    bgcolor: '#FF9800', 
                    mx: 'auto',
                    borderRadius: 2
                  }} />
                </Paper>
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
                color: '#FF9800',
                mb: 4,
                textAlign: 'center',
                fontSize: { xs: 20, md: 24 }
              }}
            >
              Galerie Photos - Vie Académique
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
                        alt={image.alt_text || `Vie académique ${idx + 1}`}
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

          {/* Méthodes pédagogiques */}
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
                color: '#FF9800',
                mb: 3,
                fontSize: { xs: 20, md: 24 }
              }}
            >
              Nos Méthodes Pédagogiques
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                                           <FlagIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                       Approche Personnalisée
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Chaque enfant progresse à son rythme avec un suivi individualisé 
                    et des objectifs adaptés à ses capacités.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <HandshakeIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                       Apprentissage Collaboratif
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Travail en petits groupes pour favoriser l'entraide, 
                    la communication et le respect mutuel.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <AutoAwesomeIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                       Méthodes Actives
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Utilisation de supports visuels, manipulations concrètes 
                    et expériences pratiques pour faciliter l'apprentissage.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                                     <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                     <AssessmentIcon sx={{ color: '#FF9800', fontSize: 20 }} />
                     <Typography variant="h6" sx={{ color: '#FF9800', fontWeight: 600 }}>
                       Évaluation Continue
                     </Typography>
                   </Box>
                  <Typography variant="body2" sx={{ color: '#666' }}>
                    Suivi régulier des progrès avec des bilans personnalisés 
                    et des échanges réguliers avec les parents.
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

export default VieAcademique;

