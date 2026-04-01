import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  CircularProgress,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import axios from 'axios';

interface TrimesterOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  available: boolean;
  gradeCount?: number;
  average?: number;
}

// Helpers pour l'année scolaire
function getCurrentSchoolYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 9) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}
function getSchoolYears(count = 5) {
  const current = getCurrentSchoolYear();
  const startYear = parseInt(current.split('-')[0], 10);
  return Array.from({ length: count }, (_, i) => {
    const start = startYear - i;
    return `${start}-${start + 1}`;
  });
}
const SCHOOL_YEARS = getSchoolYears(5);

const ChooseTrimester = () => {
  const navigate = useNavigate();
  const [student, setStudent] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());
  const [publishedTrimesters, setPublishedTrimesters] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        if (isMounted) navigate('/login');
        return;
      }

      try {
        // Récupérer les informations de l'élève
        const studentRes = await axios.get(`https://saintefamilleexcellence.ci/api/students/me?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!isMounted) return;
        setStudent(studentRes.data.student);

        // Récupérer toutes les notes de l'élève
        const gradesRes = await axios.get(`https://saintefamilleexcellence.ci/api/students/${studentRes.data.student.id}/grades?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (isMounted) {
          setGrades(gradesRes.data);
        }

        // Récupérer l'état de publication des bulletins pour chaque trimestre
        if (studentRes.data.student && studentRes.data.student.class_id) {
          const pub: { [key: string]: boolean } = {};
          for (const t of ['1er trimestre', '2e trimestre', '3e trimestre']) {
            try {
              const res = await axios.get(`https://saintefamilleexcellence.ci/api/report-cards/published?class_id=${studentRes.data.student.class_id}&trimester=${encodeURIComponent(t)}&school_year=${schoolYear}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              pub[t] = !!res.data.published;
            } catch {
              pub[t] = false;
            }
          }
          if (isMounted) setPublishedTrimesters(pub);
        }

      } catch (err: any) {
        if (isMounted) {
          console.error('Erreur lors du chargement des données:', err);
          setError(err.response?.data?.message || 'Erreur lors du chargement des données.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [navigate, schoolYear]);

  const trimesters: TrimesterOption[] = [
    {
      id: '1er trimestre',
      name: '1er Trimestre',
      description: 'Bulletin du premier trimestre de l\'année scolaire',
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      bgColor: '#e3f2fd',
      available: publishedTrimesters['1er trimestre'],
      gradeCount: grades.filter(g => g.semester === '1er trimestre').length,
      average: (() => {
        const semesterGrades = grades.filter(g => g.semester === '1er trimestre');
        if (semesterGrades.length === 0) return undefined;
        const totalMoyenne = semesterGrades.reduce((sum, g) => sum + g.moyenne, 0);
        return totalMoyenne / semesterGrades.length;
      })()
    },
    {
      id: '2e trimestre',
      name: '2e Trimestre',
      description: 'Bulletin du deuxième trimestre de l\'année scolaire',
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      bgColor: '#e8f5e8',
      available: publishedTrimesters['2e trimestre'],
      gradeCount: grades.filter(g => g.semester === '2e trimestre').length,
      average: (() => {
        const semesterGrades = grades.filter(g => g.semester === '2e trimestre');
        if (semesterGrades.length === 0) return undefined;
        const totalMoyenne = semesterGrades.reduce((sum, g) => sum + g.moyenne, 0);
        return totalMoyenne / semesterGrades.length;
      })()
    },
    {
      id: '3e trimestre',
      name: '3e Trimestre',
      description: 'Bulletin du troisième trimestre de l\'année scolaire',
      icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
      bgColor: '#fff4e5',
      available: publishedTrimesters['3e trimestre'],
      gradeCount: grades.filter(g => g.semester === '3e trimestre').length,
      average: (() => {
        const semesterGrades = grades.filter(g => g.semester === '3e trimestre');
        if (semesterGrades.length === 0) return undefined;
        const totalMoyenne = semesterGrades.reduce((sum, g) => sum + g.moyenne, 0);
        return totalMoyenne / semesterGrades.length;
      })()
    }
  ];

  // Fonction pour déterminer si un trimestre est terminé
  const isTrimesterCompleted = (trimesterName: string) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    switch (trimesterName) {
      case '1er trimestre':
        // Terminé à partir de février (mois 2)
        return currentMonth >= 2;
      case '2e trimestre':
        // Terminé à partir de mai (mois 5)
        return currentMonth >= 5;
      case '3e trimestre':
        // Terminé à partir de juillet (mois 7)
        return currentMonth >= 7;
      default:
        return false;
    }
  };

  const handleTrimesterSelect = (trimesterId: string) => {
    navigate(`/student/report-card/${trimesterId}`);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e3f0ff 0%, #f8e1ff 100%)'
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e3f0ff 0%, #f8e1ff 100%)'
      }}>
        <Typography color="error" variant="h6">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #e3f0ff 0%, #f8e1ff 100%)',
      py: 4
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/student/dashboard')}
            sx={{ mb: 2 }}
          >
            Retour au tableau de bord
          </Button>
          
          <Typography variant="h3" fontWeight={700} sx={{ 
            color: '#1A237E', 
            mb: 1,
            textAlign: 'center'
          }}>
            Mes Bulletins
          </Typography>
          
          <Typography variant="h6" sx={{ 
            color: 'text.secondary', 
            textAlign: 'center',
            mb: 3
          }}>
            Choisissez le trimestre pour consulter votre bulletin
          </Typography>

          {/* Informations de l'élève */}
          <Paper sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <CalendarIcon color="primary" sx={{ fontSize: 32 }} />
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {student?.first_name} {student?.last_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Classe: {student?.class_name} • Matricule: {student?.registration_number}
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Sélecteur d'année scolaire */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
            <FormControl sx={{ minWidth: 180 }} size="small">
              <InputLabel id="school-year-label">Année scolaire</InputLabel>
              <Select
                labelId="school-year-label"
                value={schoolYear}
                label="Année scolaire"
                onChange={e => setSchoolYear(e.target.value)}
              >
                {SCHOOL_YEARS.map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {/* Sélection des trimestres */}
        <Grid container spacing={3}>
          {trimesters.map((trimester) => (
            <Grid item xs={12} md={4} key={trimester.id}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  boxShadow: trimester.available 
                    ? '0 8px 25px rgba(0,0,0,0.15)' 
                    : '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  opacity: trimester.available ? 1 : 0.6,
                  '&:hover': trimester.available ? {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 35px rgba(0,0,0,0.2)',
                  } : {},
                  background: trimester.available ? 'white' : '#f5f5f5'
                }}
              >
                <CardActionArea
                  onClick={() => trimester.available && handleTrimesterSelect(trimester.id)}
                  disabled={!trimester.available}
                  sx={{ height: '100%', p: 3 }}
                >
                  <CardContent sx={{ textAlign: 'center', p: 0 }}>
                    {/* Icône */}
                    <Box sx={{ 
                      mb: 2,
                      color: trimester.color
                    }}>
                      {trimester.icon}
                    </Box>

                    {/* Titre */}
                    <Typography variant="h5" fontWeight={700} sx={{ 
                      mb: 1,
                      color: trimester.color
                    }}>
                      {trimester.name}
                    </Typography>

                    {/* Statut du trimestre */}
                    {trimester.available && (
                      <Chip 
                        label={isTrimesterCompleted(trimester.id) ? "Terminé" : "En cours"}
                        size="small"
                        color={isTrimesterCompleted(trimester.id) ? "success" : "warning"}
                        sx={{ 
                          mb: 2,
                          fontWeight: 600
                        }}
                      />
                    )}

                    {/* Description */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {trimester.description}
                    </Typography>

                    {/* Statistiques */}
                    {trimester.available ? (
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="h4" fontWeight={700} sx={{ color: trimester.color }}>
                            {typeof trimester.average === 'number' ? Number(trimester.average).toFixed(2) : 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Moyenne générale
                          </Typography>
                        </Box>
                        
                        <Chip 
                          label={`${trimester.gradeCount} matières`}
                          size="small"
                          sx={{ 
                            bgcolor: trimester.bgColor,
                            color: trimester.color,
                            fontWeight: 600
                          }}
                        />
                      </Stack>
                    ) : (
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: '#f5f5f5', 
                        borderRadius: 2,
                        border: '2px dashed #ccc'
                      }}>
                        <Typography variant="body2" color="text.secondary">
                          Aucune note publiée pour ce trimestre
                        </Typography>
                      </Box>
                    )}

                    {/* Bouton d'action */}
                    <Button
                      variant={trimester.available ? "contained" : "outlined"}
                      disabled={!trimester.available}
                      sx={{ 
                        mt: 3,
                        bgcolor: trimester.available ? trimester.color : 'transparent',
                        color: trimester.available ? 'white' : 'text.secondary',
                        '&:hover': trimester.available ? {
                          bgcolor: trimester.color,
                          opacity: 0.9
                        } : {},
                        px: 4,
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: 600
                      }}
                    >
                      {trimester.available ? 'Consulter le bulletin' : (publishedTrimesters[trimester.id] === false ? 'Bulletin non publié' : 'Non disponible')}
                    </Button>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Informations supplémentaires */}
        <Paper sx={{ 
          mt: 4, 
          p: 3, 
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#1A237E' }}>
            Informations importantes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • Les bulletins ne sont disponibles que pour les trimestres où des notes ont été publiées par vos professeurs.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • La moyenne générale est calculée sur l'ensemble des matières évaluées pour le trimestre.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            • Un bulletin "partiel" indique que le trimestre est encore en cours, un bulletin "complet" indique que le trimestre est terminé.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Vous pouvez télécharger vos bulletins au format PDF depuis chaque page de bulletin.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default ChooseTrimester; 

