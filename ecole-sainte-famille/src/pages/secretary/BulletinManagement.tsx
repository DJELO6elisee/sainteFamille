import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import SecretarySidebar from '../../components/SecretarySidebar';
import axios from 'axios';

interface EducationLevel {
  id: number;
  name: string;
  description?: string;
  classes_count?: number;
  students_count?: number;
}

const BulletinManagement: React.FC = () => {
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEducationLevels();
  }, []);

  const fetchEducationLevels = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await axios.get('https://saintefamilleexcellence.ci/api/education-levels', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Filtrer uniquement les niveaux actifs
      const activeLevels = (response.data.data || []).filter((level: EducationLevel) => 
        level.id !== undefined && level.name !== undefined
      );

      setLevels(activeLevels);
      console.log('[BulletinManagement] Niveaux d\'éducation récupérés:', activeLevels);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des niveaux d\'éducation:', error);
      setError(error.response?.data?.message || 'Erreur lors du chargement des niveaux d\'éducation');
    } finally {
      setLoading(false);
    }
  };

  const handleLevelClick = (levelId: number, levelName: string) => {
    navigate(`/secretary/bulletins/level/${levelId}`, {
      state: { levelName }
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex' }}>
        <SecretarySidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress size={60} />
          </Box>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex' }}>
        <SecretarySidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          {/* En-tête */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ 
              fontWeight: 'bold', 
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2
            }}>
              <AssignmentIcon fontSize="large" sx={{ color: '#1976d2' }} />
              Gestion des Bulletins
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom sx={{
              fontWeight: 500,
              opacity: 0.8
            }}>
              Sélectionnez un niveau d'éducation pour gérer les bulletins de ses classes
            </Typography>
          </Box>

          {/* Liste des niveaux */}
          {levels.length === 0 ? (
            <Alert severity="info">
              Aucun niveau d'éducation trouvé.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {levels.map((level) => (
                <Grid item xs={12} sm={6} md={4} key={level.id}>
                  <Card 
                    elevation={3}
                    sx={{ 
                      height: '100%',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)',
                      border: '1px solid rgba(25, 118, 210, 0.1)',
                      '&:hover': {
                        elevation: 8,
                        transform: 'translateY(-8px) scale(1.02)',
                        boxShadow: '0 20px 40px rgba(25, 118, 210, 0.15)',
                        border: '1px solid rgba(25, 118, 210, 0.2)',
                      }
                    }}
                  >
                    <CardActionArea 
                      onClick={() => handleLevelClick(level.id, level.name)}
                      sx={{ height: '100%' }}
                    >
                      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <SchoolIcon sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
                          <Typography variant="h6" component="h2" sx={{ 
                            fontWeight: 'bold',
                            color: '#1976d2',
                            flexGrow: 1
                          }}>
                            {level.name}
                          </Typography>
                        </Box>

                        {level.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {level.description}
                          </Typography>
                        )}

                        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                          {level.classes_count !== undefined && (
                            <Chip 
                              icon={<SchoolIcon />}
                              label={`${level.classes_count} classe${(level.classes_count || 0) > 1 ? 's' : ''}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {level.students_count !== undefined && (
                            <Chip 
                              icon={<PeopleIcon />}
                              label={`${level.students_count} élève${(level.students_count || 0) > 1 ? 's' : ''}`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                        </Box>

                        <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center' }}>
                          <Chip 
                            label="Voir les classes"
                            color="primary"
                            variant="filled"
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default BulletinManagement;

