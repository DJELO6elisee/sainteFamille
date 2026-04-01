import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
  Chip,
  Breadcrumbs,
  Link,
  Button
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Class as ClassIcon,
  NavigateNext as NavigateNextIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import SecretarySidebar from '../../components/SecretarySidebar';
import axios from 'axios';

interface Class {
  id: number;
  name: string;
  description?: string;
  student_count: number;
  education_level_id: number;
  level_name: string;
}

const LevelClassesList: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { levelId } = useParams<{ levelId: string }>();
  const location = useLocation();
  const levelName = location.state?.levelName || 'Niveau';
  const classNamePrefix: string | undefined = location.state?.classNamePrefix;

  useEffect(() => {
    if (levelId) {
      fetchClasses();
    }
  }, [levelId]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      // Interroger le backend avec le paramètre de filtrage par niveau
      const params: any = { education_level_id: levelId };
      if (classNamePrefix) params.class_name_prefix = classNamePrefix;

      const response = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      console.log('Réponse API classes (filtrées côté serveur):', response.data);
      console.log('Paramètres envoyés au backend:', params);
      console.log('Niveau demandé (levelId):', levelId);

      let levelClasses = (Array.isArray(response.data) ? response.data : []).map((cls: any) => ({
        id: cls.id,
        name: cls.name,
        description: cls.description,
        student_count: cls.students_count || 0, // Utiliser students_count du backend
        education_level_id: cls.education_level_id,
        level_name: cls.level_name
      }));

      // IMPORTANT: Filtrage côté client pour garantir que seules les classes du bon niveau sont affichées
      const levelIdNum = parseInt(levelId || '0', 10);
      levelClasses = levelClasses.filter(c => {
        const classLevelId = c.education_level_id ? parseInt(String(c.education_level_id), 10) : null;
        return classLevelId === levelIdNum;
      });

      // Sécurité: filtrage côté client par préfixe si fourni
      if (classNamePrefix) {
        const prefixUpper = classNamePrefix.toUpperCase();
        levelClasses = levelClasses.filter(c => (c.name || '').toUpperCase().startsWith(prefixUpper));
      }

      console.log('Classes filtrées pour le niveau', levelId, ':', levelClasses);
      console.log('Nombre de classes après filtrage:', levelClasses.length);
      setClasses(levelClasses);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des classes:', error);
      setError(error.response?.data?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleClassClick = (classId: number, className: string) => {
    navigate(`/secretary/bulletins/class/${classId}`, {
      state: { levelName, className }
    });
  };

  const handleBack = () => {
    navigate('/secretary/bulletins');
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
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Retour
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 3 }}
          >
            <Link
              component="button"
              variant="body1"
              onClick={handleBack}
              sx={{ textDecoration: 'none' }}
            >
              Gestion des Bulletins
            </Link>
            <Typography color="text.primary">{levelName}</Typography>
          </Breadcrumbs>

          {/* En-tête */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
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
                Classes - {levelName}
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom sx={{
                fontWeight: 500,
                opacity: 0.8
              }}>
                Sélectionnez une classe pour gérer la publication de ses bulletins
              </Typography>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
            >
              Retour
            </Button>
          </Box>

          {/* Liste des classes */}
          {classes.length === 0 ? (
            <Alert severity="info">
              Aucune classe trouvée pour ce niveau d'études.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {classes.map((classItem) => (
                <Grid item xs={12} sm={6} md={4} key={classItem.id}>
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
                      onClick={() => handleClassClick(classItem.id, classItem.name)}
                      sx={{ height: '100%' }}
                    >
                      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <ClassIcon sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
                          <Typography variant="h6" component="h2" sx={{ 
                            fontWeight: 'bold',
                            color: '#1976d2',
                            flexGrow: 1
                          }}>
                            {classItem.name}
                          </Typography>
                        </Box>

                        {classItem.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {classItem.description}
                          </Typography>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <PeopleIcon sx={{ fontSize: 20, color: '#666', mr: 1 }} />
                          <Chip 
                            label={`${classItem.student_count || 0} élève${(classItem.student_count || 0) > 1 ? 's' : ''}`}
                            size="small"
                            color={classItem.student_count && classItem.student_count > 0 ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        </Box>

                        <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center' }}>
                          <Chip 
                            label="Gérer les bulletins"
                            color="primary"
                            variant="outlined"
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

export default LevelClassesList;

