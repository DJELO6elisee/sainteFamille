import React, { useState, useEffect } from 'react';
import { Box, Container, Grid, Typography, Paper, CircularProgress, Alert, Button } from '@mui/material';
import { ContactBanner } from './Home';
import { SiteFooter } from './Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { useNavigate } from 'react-router-dom';
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

const GalleryJeux: React.FC = () => {
  const navigate = useNavigate();
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
      <ContactBanner />
      
      <Box sx={{ py: 6, bgcolor: '#f8f9fa', minHeight: '100vh' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
              sx={{
                color: '#4CAF50',
                borderColor: '#4CAF50',
                '&:hover': {
                  borderColor: '#388E3C',
                  backgroundColor: 'rgba(76, 175, 80, 0.04)',
                },
              }}
            >
              Retour à l'accueil
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SportsEsportsIcon sx={{ color: '#4CAF50', fontSize: 32 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50' }}>
                Jeux éducatifs - Galerie
              </Typography>
            </Box>
            <Box sx={{ width: 140 }} /> {/* Espaceur pour centrer le titre */}
          </Box>

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
            <Grid container spacing={2}>
              {activity.images.map((image, idx) => (
                <Grid item xs={12} sm={6} md={4} key={image.id}>
                  <Paper sx={{ overflow: 'hidden', borderRadius: 2 }}>
                                          <img 
                        src={getImageUrl(image.image_url)} 
                        alt={image.alt_text || `Jeux éducatifs ${idx + 1}`} 
                        style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }} 
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
        </Container>
      </Box>
      <SiteFooter />
    </Box>
  );
};

export default GalleryJeux;

