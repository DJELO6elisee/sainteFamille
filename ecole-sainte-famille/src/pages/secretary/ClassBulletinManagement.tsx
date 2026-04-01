import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Switch,
  FormControlLabel,
  Breadcrumbs,
  Link,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assignment as AssignmentIcon,
  NavigateNext as NavigateNextIcon,
  Person as PersonIcon,
  Publish as PublishIcon,
  UnpublishedOutlined as UnpublishIcon,
  Quiz as QuizIcon,
  Visibility as VisibilityIcon,
  Grade as GradeIcon,
  Search as SearchIcon,
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
  class_name: string;
  level_name: string;
}

interface PublicationStatus {
  type: 'trimester' | 'composition';
  period: string;
  composition_id?: number;
  composition_date?: string;
  published: boolean;
  published_at?: string;
  published_by?: number;
}

interface ClassInfo {
  id: number;
  class_name: string;
  level_name: string;
}

const ClassBulletinManagement: React.FC = () => {
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [publications, setPublications] = useState<PublicationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishingStatus, setPublishingStatus] = useState<{ [key: string]: boolean }>({});
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'publish' | 'unpublish';
    type: 'trimester' | 'composition';
    period: string;
    composition_id?: number;
  }>({
    open: false,
    action: 'publish',
    type: 'trimester',
    period: ''
  });

  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();
  const location = useLocation();
  const levelName = location.state?.levelName || 'Niveau';

  useEffect(() => {
    if (classId) {
      fetchClassData();
      fetchStudents();
      fetchPublicationStatus();
    }
  }, [classId]);

  const fetchClassData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/bulletins/class/${classId}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setClassInfo(response.data.class);
      setPublications(response.data.publications);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des données de classe:', error);
      setError(error.response?.data?.message || 'Erreur lors du chargement des données');
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Déterminer l'année scolaire actuelle
      const getCurrentSchoolYear = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        
        if (month >= 8) {
          return `${year}-${year + 1}`;
        } else {
          return `${year - 1}-${year}`;
        }
      };

      const currentSchoolYear = getCurrentSchoolYear();
      
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/bulletins/class/${classId}/students?school_year=${currentSchoolYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(`[ClassBulletinManagement] Élèves récupérés: ${response.data.students?.length || 0} (total_in_enrollments: ${response.data.total_in_enrollments || 0})`);
      
      setStudents(response.data.students || []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des élèves:', error);
    }
  };

  const fetchPublicationStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Obtenir l'année scolaire courante (septembre à juillet)
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
      
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/bulletins/class/${classId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: currentSchoolYear }
      });

      console.log('[ClassBulletinManagement] Statuts de publication récupérés:', response.data);
      setPublications(response.data.publications || []);
    } catch (error: any) {
      console.error('Erreur lors de la récupération du statut:', error);
      setError(error.response?.data?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishToggle = (publication: PublicationStatus) => {
    setConfirmDialog({
      open: true,
      action: publication.published ? 'unpublish' : 'publish',
      type: publication.type,
      period: publication.period,
      composition_id: publication.composition_id
    });
  };

  const confirmAction = async () => {
    const { action, type, period, composition_id } = confirmDialog;
    const key = `${type}-${period}-${composition_id || ''}`;
    
    try {
      setPublishingStatus(prev => ({ ...prev, [key]: true }));
      
      const token = localStorage.getItem('token');
      const endpoint = action === 'publish' ? 'publish' : 'unpublish';
      
      const payload = {
        type,
        period: type === 'trimester' ? period : undefined,
        composition_id: type === 'composition' ? composition_id : undefined,
        school_year: '2025-2026'
      };

      await axios.post(`https://saintefamilleexcellence.ci/api/bulletins/class/${classId}/${endpoint}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Rafraîchir le statut
      await fetchPublicationStatus();
      
      setConfirmDialog({ ...confirmDialog, open: false });
    } catch (error: any) {
      console.error(`Erreur lors de la ${action === 'publish' ? 'publication' : 'dépublication'}:`, error);
      setError(error.response?.data?.message || `Erreur lors de la ${action === 'publish' ? 'publication' : 'dépublication'}`);
    } finally {
      setPublishingStatus(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleViewBulletin = (studentId: number, studentName: string) => {
    navigate(`/secretary/student-bulletin/${studentId}`, {
      state: { 
        studentName, 
        className: classInfo?.class_name,
        levelName: classInfo?.level_name 
      }
    });
  };

  const handleViewNotes = (studentId: number, studentName: string) => {
    // Vérifier si des bulletins sont publiés pour déterminer les permissions
    const hasPublishedBulletins = publications.some(pub => pub.published);
    const canModifyNotes = !hasPublishedBulletins;
    
    // Navigation vers la gestion des notes pour cet élève
    navigate(`/teacher/grade-management/${classId}`, {
      state: { 
        className: classInfo?.class_name,
        levelName: classInfo?.level_name,
        publications, // Passer les statuts de publication pour contrôler les modifications
        isAdminAccess: true, // Indiquer que c'est un accès admin
        canModifyNotes: canModifyNotes, // Passer la permission de modification
        preSelectedStudentId: studentId, // Pré-sélectionner l'élève
        preSelectedStudentName: studentName
      }
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Filtrer les élèves par nom et matricule
  const filteredStudents = useMemo(() => {
    if (!searchFilter.trim()) {
      return students;
    }
    
    const filterLower = searchFilter.toLowerCase().trim();
    return students.filter(student => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      const registrationNumber = student.registration_number.toLowerCase();
      
      return fullName.includes(filterLower) || registrationNumber.includes(filterLower);
    });
  }, [students, searchFilter]);

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

  const compositionPublications = publications.filter(p => p.type === 'composition');

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
              onClick={handleBack}
              sx={{ textDecoration: 'none' }}
            >
              {levelName}
            </Link>
            <Typography color="text.primary">
              {classInfo?.class_name || 'Classe'}
            </Typography>
          </Breadcrumbs>

          {/* En-tête */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ 
                fontWeight: 'bold', 
                background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                mb: 2
              }}>
                <AssignmentIcon fontSize="large" sx={{ color: '#2e7d32' }} />
                Publication des Bulletins
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {classInfo?.class_name} - {classInfo?.level_name}
              </Typography>
              <Typography variant="body2" color="primary.main" fontWeight={600}>
                {students.length} élève{students.length > 1 ? 's' : ''} inscrit{students.length > 1 ? 's' : ''}
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

          <Grid container spacing={3}>
            {/* Section Publication */}
            <Grid item xs={12} md={8}>
              {/* Bulletins par Composition */}
              {compositionPublications.length > 0 ? (
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <QuizIcon sx={{ color: '#ff9800' }} />
                    <Typography variant="h6" fontWeight={600}>
                      Publication des Bulletins par Composition
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {compositionPublications.map((publication, index) => {
                      const key = `${publication.type}-${publication.period}-${publication.composition_id}`;
                      const isProcessing = publishingStatus[key];
                      
                      return (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <Card 
                            elevation={2}
                            sx={{ 
                              borderRadius: 2,
                              border: publication.published ? '2px solid #ff9800' : '2px solid #e0e0e0',
                              background: publication.published 
                                ? 'linear-gradient(135deg, #fff3e0 0%, #ffeaa7 100%)'
                                : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                            }}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {publication.period}
                                </Typography>
                                <Chip
                                  label={publication.published ? 'Publié' : 'Non publié'}
                                  color={publication.published ? 'warning' : 'default'}
                                  size="small"
                                  variant={publication.published ? 'filled' : 'outlined'}
                                />
                              </Box>
                              
                              {publication.composition_date && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                  Date: {new Date(publication.composition_date).toLocaleDateString('fr-FR')}
                                </Typography>
                              )}
                              
                              {publication.published && publication.published_at && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                  Publié le {new Date(publication.published_at).toLocaleDateString('fr-FR')} à {new Date(publication.published_at).toLocaleTimeString('fr-FR')}
                                </Typography>
                              )}

                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={publication.published}
                                    onChange={() => handlePublishToggle(publication)}
                                    disabled={isProcessing}
                                    color="warning"
                                  />
                                }
                                label={publication.published ? 'Publié' : 'Publier'}
                                sx={{ mt: 1 }}
                              />
                              
                              {isProcessing && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                  <CircularProgress size={16} sx={{ mr: 1 }} />
                                  <Typography variant="caption">
                                    {publication.published ? 'Dépublication...' : 'Publication...'}
                                  </Typography>
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Paper>
              ) : (
                <Alert severity="info">
                  Aucune composition trouvée pour cette classe.
                </Alert>
              )}
            </Grid>

            {/* Section Élèves */}
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={600} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ color: '#1976d2' }} />
                  Élèves de la classe
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {/* Champ de recherche */}
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Rechercher par nom ou matricule..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
                
                {/* Compteur de résultats */}
                {searchFilter.trim() && (
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    {filteredStudents.length} élève{filteredStudents.length > 1 ? 's' : ''} trouvé{filteredStudents.length > 1 ? 's' : ''} sur {students.length}
                  </Typography>
                )}
                
                <List sx={{ maxHeight: 450, overflow: 'auto' }}>
                  {filteredStudents.length === 0 ? (
                    <ListItem>
                      <ListItemText
                        primary="Aucun élève trouvé"
                        secondary={searchFilter.trim() ? "Essayez avec un autre terme de recherche" : "Aucun élève dans cette classe"}
                        sx={{ textAlign: 'center' }}
                      />
                    </ListItem>
                  ) : (
                    filteredStudents.map((student) => (
                    <ListItem 
                      key={student.id}
                      sx={{ 
                        borderRadius: 1, 
                        mb: 1, 
                        bgcolor: 'background.paper',
                        '&:hover': { bgcolor: 'action.hover' },
                        py: 2, // Plus d'espace vertical
                        flexDirection: 'column',
                        alignItems: 'stretch'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: student.gender === 'F' ? '#e91e63' : '#2196f3' }}>
                            {student.first_name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={`${student.first_name} ${student.last_name}`}
                          secondary={`Mat: ${student.registration_number}`}
                          sx={{ flex: 1 }}
                        />
                      </Box>
                      
                      {/* Boutons sous le nom */}
                      <Box sx={{ 
                        display: 'flex', 
                        gap: 1, 
                        justifyContent: 'center',
                        mt: 1
                      }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<GradeIcon />}
                          onClick={() => handleViewNotes(student.id, `${student.first_name} ${student.last_name}`)}
                          color={publications.some(pub => pub.published) ? "secondary" : "primary"}
                          sx={{ 
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            minWidth: '100px',
                            height: '32px',
                            borderRadius: 2
                          }}
                        >
                          Notes
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => handleViewBulletin(student.id, `${student.first_name} ${student.last_name}`)}
                          sx={{ 
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            minWidth: '100px',
                            height: '32px',
                            borderRadius: 2
                          }}
                        >
                          Bulletin
                        </Button>
                      </Box>
                    </ListItem>
                    ))
                  )}
                </List>
              </Paper>
            </Grid>
          </Grid>

          {/* Dialog de confirmation */}
          <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            <DialogTitle>
              {confirmDialog.action === 'publish' ? 'Publier le bulletin' : 'Dépublier le bulletin'}
            </DialogTitle>
            <DialogContent>
              <Typography>
                Êtes-vous sûr de vouloir {confirmDialog.action === 'publish' ? 'publier' : 'dépublier'} le bulletin de la composition{' '}
                <strong>{confirmDialog.period}</strong> pour la classe <strong>{classInfo?.class_name}</strong> ?
              </Typography>
              {confirmDialog.action === 'publish' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Une fois publié, les parents pourront voir les bulletins de leurs enfants.
                </Alert>
              )}
              {confirmDialog.action === 'unpublish' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Une fois dépublié, les parents ne pourront plus voir les bulletins de leurs enfants.
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
                Annuler
              </Button>
              <Button 
                onClick={confirmAction} 
                variant="contained" 
                color={confirmDialog.action === 'publish' ? 'primary' : 'error'}
                startIcon={confirmDialog.action === 'publish' ? <PublishIcon /> : <UnpublishIcon />}
              >
                {confirmDialog.action === 'publish' ? 'Publier' : 'Dépublier'}
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
      </Box>
    </Box>
  );
};

export default ClassBulletinManagement;

