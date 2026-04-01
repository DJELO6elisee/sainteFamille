import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  CircularProgress,
  Alert,
  IconButton,
  Stack,
  Chip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Schedule as ScheduleIcon,
  School as SchoolIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Class {
  id: number;
  name: string;
  level: string;
  academic_year: string;
  timetable_published: boolean;
  student_count?: number;
}

const ClassesScheduleList = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) setClasses(response.data);
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Erreur lors de la récupération des classes');
          console.error('Erreur:', err);
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

  const handleViewSchedule = (classId: number) => {
    navigate(`/class/schedule/${classId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
          Retour
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)', fontFamily: "'Poppins', sans-serif" }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'primary.main' }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight={700} sx={{ color: 'primary.main' }}>
              Emplois du Temps des Classes
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SchoolIcon />
              Consultez les emplois du temps de toutes les classes
            </Typography>
          </Box>
        </Stack>

        {classes.length === 0 ? (
          <Alert severity="info">
            Aucune classe trouvée. Veuillez créer des classes d'abord.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {classes.map((classItem) => (
              <Grid item xs={12} sm={6} md={4} key={classItem.id}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  background: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(10px)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
                  }
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <SchoolIcon color="primary" />
                      <Typography variant="h6" fontWeight={600}>
                        {classItem.name}
                      </Typography>
                    </Stack>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Niveau: {classItem.level}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Année: {classItem.academic_year}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip 
                        label={classItem.timetable_published ? "Emploi publié" : "Non publié"}
                        color={classItem.timetable_published ? "success" : "warning"}
                        size="small"
                        icon={<ScheduleIcon />}
                      />
                    </Stack>
                  </CardContent>
                  
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewSchedule(classItem.id)}
                      disabled={!classItem.timetable_published}
                      sx={{ borderRadius: 2 }}
                    >
                      Voir l'emploi du temps
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
};

export default ClassesScheduleList; 

