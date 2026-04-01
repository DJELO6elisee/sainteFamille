import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Breadcrumbs,
  Link,
  Grid,
  Card,
  CardContent,
  Chip,
  useTheme
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon,
  NavigateNext as NavigateNextIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Grade as GradeIcon
} from '@mui/icons-material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import SecretarySidebar from '../../components/SecretarySidebar';
import axios from 'axios';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  registration_number: string;
  gender: string;
  date_of_birth: string;
  parent_first_name?: string;
  parent_last_name?: string;
  parent_phone?: string;
}

interface PublicationStatus {
  composition_id: number;
  composition_name: string;
  composition_date: string;
  published: boolean;
  published_at?: string;
}

const BulletinClassManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [publications, setPublications] = useState<PublicationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();
  const location = useLocation();
  const className = location.state?.className || 'Classe';
  const levelName = location.state?.levelName || 'Niveau';
  const theme = useTheme();

  useEffect(() => {
    if (classId) {
      fetchStudentsByClass();
      fetchPublicationStatus();
    }
  }, [classId]);

  const fetchStudentsByClass = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      // Récupérer les élèves de la classe via la route spécifique
      // Utilisation de l'année scolaire courante (septembre à juillet)
      const getCurrentSchoolYear = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        
        if (month >= 8) { // Septembre à décembre
          return `${year}-${year + 1}`;
        } else { // Janvier à août
          return `${year - 1}-${year}`;
        }
      };
      
      const currentSchoolYear = getCurrentSchoolYear();
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}/students?school_year=${currentSchoolYear}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      console.log(`[BulletinClassManagement] Récupération des élèves pour la classe ${classId}, année ${currentSchoolYear}`);
      console.log(`[BulletinClassManagement] Réponse:`, response.data);

      // Si aucun élève trouvé avec l'année scolaire, essayer sans filtre d'année
      if (!response.data || response.data.length === 0) {
        console.log(`[BulletinClassManagement] Aucun élève trouvé avec l'année ${currentSchoolYear}, essai sans filtre d'année`);
        const fallbackResponse = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}/students`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log(`[BulletinClassManagement] Réponse fallback:`, fallbackResponse.data);
        setStudents(fallbackResponse.data);
      } else {
        setStudents(response.data);
      }
    } catch (error: any) {
      console.error('Erreur lors de la récupération des élèves:', error);
      setError(error.response?.data?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicationStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const getCurrentSchoolYear = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      };
      
      const currentSchoolYear = getCurrentSchoolYear();
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/bulletins/class/${classId}/status?school_year=${currentSchoolYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPublications(response.data.publications || []);
      console.log('[BulletinClassManagement] Statuts de publication récupérés:', response.data.publications);
    } catch (error: any) {
      console.error('Erreur lors de la récupération du statut de publication:', error);
    }
  };

  const handleStudentBulletinClick = (studentId: number, studentName: string) => {
    // Navigation vers la page de bulletin de l'élève
    navigate(`/secretary/bulletins/student/${studentId}`, {
      state: { 
        studentName, 
        className, 
        classId: parseInt(classId || '0'),
        levelName 
      }
    });
  };

  const handleStudentNotesClick = (studentId: number, studentName: string, event: React.MouseEvent) => {
    // Empêcher la propagation du clic sur la carte
    event.stopPropagation();
    
    // Navigation vers la gestion des notes pour cet élève
    // On utilise la même logique que pour le bouton "Voir les notes" de classe
    // mais on pré-sélectionne l'élève spécifique
    navigate(`/teacher/grade-management/${classId}`, {
      state: { 
        className, 
        levelName,
        publications, // Passer les statuts de publication pour contrôler les modifications
        isAdminAccess: true, // Indiquer que c'est un accès admin
        canModifyNotes: canModifyNotes, // Passer la permission de modification
        preSelectedStudentId: studentId, // Pré-sélectionner l'élève
        preSelectedStudentName: studentName
      }
    });
  };

  const handleBackToClasses = () => {
    navigate(-1); // Retour à la page précédente
  };

  const handleViewNotesClick = () => {
    // Navigation vers la gestion des notes pour cette classe
    navigate(`/teacher/grade-management/${classId}`, {
      state: { 
        className, 
        levelName,
        publications, // Passer les statuts de publication pour contrôler les modifications
        isAdminAccess: true, // Indiquer que c'est un accès admin
        canModifyNotes: canModifyNotes // Passer la permission de modification
      }
    });
  };

  // Vérifier si des bulletins sont publiés (empêche la modification des notes)
  const hasPublishedBulletins = publications.some(pub => pub.published);
  const canModifyNotes = !hasPublishedBulletins;

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
            onClick={handleBackToClasses}
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
            onClick={() => navigate('/secretary/bulletins')}
            sx={{ textDecoration: 'none' }}
          >
            Gestion des Bulletins
          </Link>
          <Link
            component="button"
            variant="body1"
            onClick={handleBackToClasses}
            sx={{ textDecoration: 'none' }}
          >
            {levelName}
          </Link>
          <Typography color="text.primary">{className}</Typography>
        </Breadcrumbs>

        {/* En-tête */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ 
              fontWeight: 'bold', 
              background: 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2
            }}>
              <AssignmentIcon fontSize="large" sx={{ color: '#ff9800' }} />
              Bulletins - {className}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom sx={{
              fontWeight: 500,
              opacity: 0.8
            }}>
              Gérez les bulletins des élèves de cette classe
            </Typography>
            
            {/* Indicateur de statut de modification */}
            {!canModifyNotes && (
              <Alert severity="warning" sx={{ mt: 2, maxWidth: 600 }}>
                <Typography variant="body2">
                  ⚠️ Les notes ne peuvent plus être modifiées car des bulletins ont été publiés pour cette classe.
                </Typography>
              </Alert>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
            <Button
              variant="contained"
              startIcon={canModifyNotes ? <EditIcon /> : <VisibilityIcon />}
              onClick={handleViewNotesClick}
              color={canModifyNotes ? "primary" : "secondary"}
              sx={{ 
                fontWeight: 600,
                px: 3,
                py: 1.5
              }}
            >
              {canModifyNotes ? 'Modifier les notes' : 'Voir les notes'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToClasses}
              sx={{ height: 'fit-content' }}
            >
              Retour
            </Button>
          </Box>
        </Box>

        {/* Statistiques */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  {students.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Élèves total
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <SchoolIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                  {className}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Classe
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {students.length === 0 ? (
          <Alert severity="info">
            Aucun élève trouvé dans cette classe.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {students.map((student) => (
              <Grid item xs={12} sm={6} md={4} key={student.id}>
                <Card 
                  elevation={3}
                  sx={{ 
                    height: '100%',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #ffffff 0%, #fff8f0 100%)',
                    border: '1px solid rgba(255, 152, 0, 0.1)',
                    '&:hover': {
                      elevation: 6,
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 24px rgba(255, 152, 0, 0.1)',
                      border: '1px solid rgba(255, 152, 0, 0.15)',
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <AssignmentIcon sx={{ fontSize: 30, color: '#1976d2', mr: 2 }} />
                      <Typography variant="h6" component="h3" sx={{ 
                        fontWeight: 'bold',
                        color: '#1976d2'
                      }}>
                        {student.first_name} {student.last_name}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Matricule:</strong> {student.registration_number}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <strong>Genre:</strong> {student.gender === 'M' ? 'Masculin' : 'Féminin'}
                    </Typography>

                    {student.date_of_birth && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Né(e) le:</strong> {new Date(student.date_of_birth).toLocaleDateString('fr-FR')}
                      </Typography>
                    )}

                    {(student.parent_first_name || student.parent_last_name) && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Parent:</strong> {student.parent_first_name} {student.parent_last_name}
                      </Typography>
                    )}

                    {student.parent_phone && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        <strong>Contact:</strong> {student.parent_phone}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<GradeIcon />}
                        onClick={(event) => handleStudentNotesClick(student.id, `${student.first_name} ${student.last_name}`, event)}
                        color="primary" // Toujours bleu pour les admins
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                      >
                        Voir les notes
                      </Button>
                      
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AssignmentIcon />}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleStudentBulletinClick(student.id, `${student.first_name} ${student.last_name}`);
                        }}
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                      >
                        Gérer bulletin
                      </Button>
                    </Box>
                  </CardContent>
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

export default BulletinClassManagement;

