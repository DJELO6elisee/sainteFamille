import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Avatar,
  Button,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Description as DescriptionIcon,
  School as SchoolIcon,
  Grade as GradeIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon,
  NavigateNext as NavigateNextIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import axios from 'axios';

interface BulletinData {
  student_info: {
    first_name: string;
    last_name: string;
    class_name: string;
    registration_number: string;
    gender?: string;
    date_of_birth?: string;
  };
  composition?: {
    id: string;
    name: string;
    date: string;
    description?: string;
  };
  trimester: string;
  school_year: string;
  subjects: {
    subject_name: string;
    subject_id?: number;
    average: number;
    coefficient: number;
    weighted_average: number;
    rank: number;
    total_students: number;
    teacher_name: string;
    notes?: Array<{
      grade: number;
      composition_name: string;
      composition_date?: string;
    }>;
  }[];
  general_average: number;
  general_rank: number;
  total_class_students: number;
  published: boolean;
  bulletin_type: 'trimester' | 'composition';
  is_empty?: boolean;
}

interface Composition {
  id: number;
  name: string;
  composition_date: string;
  description?: string;
  notes_count: number;
}

interface UnifiedBulletinProps {
  childId: string | undefined;
  schoolYear: string;
  showBreadcrumbs?: boolean;
  onBack?: () => void;
  isAdminView?: boolean;
  studentName?: string;
  className?: string;
  levelName?: string;
}

const UnifiedBulletin: React.FC<UnifiedBulletinProps> = ({ 
  childId, 
  schoolYear, 
  showBreadcrumbs = false, 
  onBack,
  isAdminView = false,
  studentName,
  className,
  levelName
}) => {
  const [bulletinData, setBulletinData] = useState<BulletinData | null>(null);
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrimester, setSelectedTrimester] = useState('1er trimestre');
  const [selectedComposition, setSelectedComposition] = useState<string>('');
  const [viewMode, setViewMode] = useState<'trimester' | 'composition'>('trimester');

  const trimesters = ['1er trimestre', '2e trimestre', '3e trimestre'];

  // Récupérer les compositions disponibles
  useEffect(() => {
    if (childId && schoolYear) {
      fetchCompositions();
    }
  }, [childId, schoolYear]);

  // Récupérer le bulletin quand les paramètres changent
  useEffect(() => {
    if (childId && schoolYear) {
      if (viewMode === 'trimester') {
        fetchBulletin();
      } else if (viewMode === 'composition' && selectedComposition) {
        fetchBulletin();
      }
    }
  }, [childId, schoolYear, selectedTrimester, selectedComposition, viewMode]);

  const fetchCompositions = async () => {
    if (!childId) return;

    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(
        `https://saintefamilleexcellence.ci/api/students/${childId}/compositions?school_year=${schoolYear}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('🎯 [UNIFIED BULLETIN] Compositions récupérées:', data);
      setCompositions(data);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des compositions:', err);
      setCompositions([]);
    }
  };

  const fetchBulletin = async () => {
    if (!childId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      let url = `https://saintefamilleexcellence.ci/api/students/${childId}/bulletin?school_year=${schoolYear}`;
      
      if (viewMode === 'trimester') {
        url += `&trimester=${encodeURIComponent(selectedTrimester)}`;
      } else if (viewMode === 'composition' && selectedComposition) {
        url += `&composition_id=${selectedComposition}`;
      }

      console.log('🎯 [UNIFIED BULLETIN] URL API:', url);

      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('🎯 [UNIFIED BULLETIN] Données reçues:', data);
      setBulletinData(data);
    } catch (err: any) {
      console.error('Erreur lors de la récupération du bulletin:', err);
      if (err.response?.status === 404) {
        if (isAdminView) {
          setError('Aucune note trouvée pour cette période. Vérifiez que des notes ont été saisies et publiées.');
        } else {
          setError('Aucun bulletin disponible pour cette période.');
        }
      } else if (err.response?.status === 403) {
        if (isAdminView) {
          setError('Aucune note publiée trouvée. Utilisez la gestion des notes pour publier les évaluations.');
        } else {
          setError('Le bulletin n\'est pas encore publié pour cette période.');
        }
      } else {
        if (isAdminView) {
          setError(`Erreur technique lors du chargement du bulletin: ${err.response?.data?.message || err.message}`);
        } else {
          setError('Erreur lors du chargement du bulletin. Veuillez réessayer.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (average: number) => {
    if (average >= 16) return '#4caf50'; // Vert
    if (average >= 14) return '#8bc34a'; // Vert clair
    if (average >= 12) return '#ffeb3b'; // Jaune
    if (average >= 10) return '#ff9800'; // Orange
    return '#f44336'; // Rouge
  };

  const getGradeLabel = (average: number) => {
    if (average >= 16) return 'Très Bien';
    if (average >= 14) return 'Bien';
    if (average >= 12) return 'Assez Bien';
    if (average >= 10) return 'Passable';
    return 'Insuffisant';
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Chargement du bulletin...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity={isAdminView ? "info" : "warning"} sx={{ mb: 2 }}>
          {error}
        </Alert>
        {!isAdminView && (
          <Typography variant="body1" color="text.secondary">
            Le bulletin sera disponible une fois publié par l'administration.
          </Typography>
        )}
        {isAdminView && (
          <Typography variant="body1" color="text.secondary">
            Consultez la gestion des notes pour saisir et publier les évaluations.
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ p: isAdminView ? 0 : 3 }}>
      {/* Breadcrumbs pour l'administration */}
      {showBreadcrumbs && (
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
            <Link color="inherit" onClick={onBack} sx={{ cursor: 'pointer' }}>
              {levelName}
            </Link>
            <Typography color="text.primary">
              Bulletin - {studentName}
            </Typography>
          </Breadcrumbs>
        </Box>
      )}

      {/* En-tête avec contrôles */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center">
          <Avatar sx={{ bgcolor: '#673ab7', mr: 2 }}>
            <DescriptionIcon />
          </Avatar>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            Bulletin de Notes
          </Typography>
        </Box>
        
        {bulletinData && (
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ ml: 2 }}
          >
            Imprimer
          </Button>
        )}
      </Box>

      {/* Contrôles de filtrage */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          {/* Mode de vue */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Type de bulletin</InputLabel>
              <Select
                value={viewMode}
                label="Type de bulletin"
                onChange={(e) => {
                  setViewMode(e.target.value as 'trimester' | 'composition');
                  setBulletinData(null);
                  setError(null);
                }}
              >
                <MenuItem value="trimester">Par Trimestre</MenuItem>
                <MenuItem value="composition">Par Composition</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Sélecteur de trimestre */}
          {viewMode === 'trimester' && (
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Trimestre</InputLabel>
                <Select
                  value={selectedTrimester}
                  label="Trimestre"
                  onChange={(e) => setSelectedTrimester(e.target.value)}
                >
                  {trimesters.map((trimester) => (
                    <MenuItem key={trimester} value={trimester}>
                      {trimester}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Sélecteur de composition */}
          {viewMode === 'composition' && (
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Composition</InputLabel>
                <Select
                  value={selectedComposition}
                  label="Composition"
                  onChange={(e) => setSelectedComposition(e.target.value)}
                >
                  <MenuItem value="">Sélectionner une composition</MenuItem>
                  {compositions.map((composition) => (
                    <MenuItem key={composition.id} value={composition.id.toString()}>
                      {composition.name} ({new Date(composition.composition_date).toLocaleDateString('fr-FR')})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          {/* Informations sur les compositions disponibles */}
          {viewMode === 'composition' && (
            <Grid item xs={12} sm={6} md={3}>
              <Chip 
                label={`${compositions.length} composition${compositions.length > 1 ? 's' : ''} disponible${compositions.length > 1 ? 's' : ''}`}
                color="info"
                variant="outlined"
              />
            </Grid>
          )}
        </Grid>
      </Paper>

      {bulletinData ? (
        <Paper elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {/* Alerte pour bulletin vide (admin seulement) */}
          {bulletinData.is_empty && isAdminView && (
            <Alert severity="info" sx={{ m: 2 }}>
              <Typography variant="body2">
                <strong>Bulletin vide :</strong> Aucune note n'a encore été saisie pour cette période. 
                Utilisez la gestion des notes pour ajouter des évaluations.
              </Typography>
            </Alert>
          )}

          {/* En-tête du bulletin */}
          <Box sx={{ bgcolor: '#673ab7', color: 'white', p: 3, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} mb={1}>
              BULLETIN DE NOTES
            </Typography>
            <Typography variant="h6">
              {bulletinData.student_info.first_name} {bulletinData.student_info.last_name}
            </Typography>
            <Typography variant="body1">
              Classe: {bulletinData.student_info.class_name} • {bulletinData.school_year}
            </Typography>
            {bulletinData.bulletin_type === 'composition' && bulletinData.composition ? (
              <Typography variant="body1" sx={{ mt: 1 }}>
                Composition: {bulletinData.composition.name}
                {bulletinData.composition.date && (
                  <> • {new Date(bulletinData.composition.date).toLocaleDateString('fr-FR')}</>
                )}
              </Typography>
            ) : (
              <Typography variant="body1">
                {bulletinData.trimester}
              </Typography>
            )}
          </Box>

          {/* Résumé général */}
          <Box sx={{ p: 3, bgcolor: '#f5f5f5' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card sx={{ textAlign: 'center', height: '100%' }}>
                  <CardContent>
                    <SchoolIcon sx={{ fontSize: 40, color: '#673ab7', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      Moyenne Générale
                    </Typography>
                    <Typography 
                      variant="h3" 
                      fontWeight={700} 
                      sx={{ color: bulletinData.general_average > 0 ? getGradeColor(bulletinData.general_average) : 'text.secondary' }}
                    >
                      {bulletinData.general_average > 0 ? `${bulletinData.general_average.toFixed(2)}/20` : '-'}
                    </Typography>
                    {bulletinData.general_average > 0 ? (
                      <Chip
                        label={getGradeLabel(bulletinData.general_average)}
                        sx={{ 
                          bgcolor: getGradeColor(bulletinData.general_average), 
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    ) : (
                      <Chip
                        label="Non évalué"
                        sx={{ 
                          bgcolor: '#e0e0e0', 
                          color: '#666',
                          fontWeight: 600
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ textAlign: 'center', height: '100%' }}>
                  <CardContent>
                    <TrendingUpIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      Rang de Classe
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color={bulletinData.general_rank > 0 ? "#ff9800" : "text.secondary"}>
                      {bulletinData.general_rank > 0 ? bulletinData.general_rank : '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {bulletinData.total_class_students > 0 ? `sur ${bulletinData.total_class_students} élèves` : 'Aucun classement'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ textAlign: 'center', height: '100%' }}>
                  <CardContent>
                    <GradeIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
                    <Typography variant="h6" fontWeight={600}>
                      Nombre de Matières
                    </Typography>
                    <Typography variant="h3" fontWeight={700} color="#4caf50">
                      {bulletinData.subjects.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      matières évaluées
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          {/* Détail par matière */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={2}>
              Détail par Matière
            </Typography>
            <Table>
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#f4f6f8', fontWeight: 'bold' } }}>
                  <TableCell>Matière</TableCell>
                  <TableCell align="center">
                    {bulletinData.bulletin_type === 'composition' ? 'Note' : 'Moyenne'}
                  </TableCell>
                  <TableCell align="center">Coefficient</TableCell>
                  <TableCell align="center">
                    {bulletinData.bulletin_type === 'composition' ? 'Note Coef.' : 'Moyenne Coef.'}
                  </TableCell>
                  <TableCell align="center">Rang</TableCell>
                  <TableCell>Professeur</TableCell>
                  <TableCell align="center">Appréciation</TableCell>
                  {bulletinData.bulletin_type === 'trimester' && (
                    <TableCell align="center">Détail des Notes</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {bulletinData.subjects.map((subject, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {subject.subject_name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography 
                        fontWeight={600} 
                        sx={{ color: subject.average > 0 ? getGradeColor(subject.average) : 'text.secondary' }}
                      >
                        {subject.average > 0 ? `${subject.average.toFixed(2)}/20` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={subject.coefficient} 
                        size="small" 
                        color="primary"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={600}>
                        {subject.weighted_average > 0 ? subject.weighted_average.toFixed(2) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={600} color={subject.rank > 0 ? "#ff9800" : "text.secondary"}>
                        {subject.rank > 0 ? `${subject.rank}/${subject.total_students}` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {subject.teacher_name || 'Non assigné'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {subject.average > 0 ? (
                        <Chip
                          label={getGradeLabel(subject.average)}
                          size="small"
                          sx={{ 
                            bgcolor: getGradeColor(subject.average), 
                            color: 'white',
                            fontSize: '0.75rem'
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Non évalué
                        </Typography>
                      )}
                    </TableCell>
                    {bulletinData.bulletin_type === 'trimester' && (
                      <TableCell align="center">
                        {subject.notes && subject.notes.length > 0 ? (
                          <Box>
                            {subject.notes.map((note, noteIndex) => (
                              <Chip
                                key={noteIndex}
                                label={`${note.composition_name}: ${note.grade}/20`}
                                size="small"
                                variant="outlined"
                                sx={{ m: 0.25, fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Aucune note détaillée
                          </Typography>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {/* Pied de page */}
          <Box sx={{ p: 3, bgcolor: '#f5f5f5', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Bulletin généré le {new Date().toLocaleDateString('fr-FR')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              École Primaire • Année Scolaire {bulletinData.school_year}
            </Typography>
            {bulletinData.bulletin_type === 'composition' && bulletinData.composition && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Composition: {bulletinData.composition.name}
              </Typography>
            )}
          </Box>
        </Paper>
      ) : (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <DescriptionIcon sx={{ fontSize: 60, color: '#673ab7', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} color="primary.main" mb={2}>
            Sélectionnez les paramètres
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {viewMode === 'trimester' 
              ? 'Choisissez un trimestre pour voir le bulletin correspondant.'
              : 'Choisissez une composition pour voir le bulletin correspondant.'
            }
          </Typography>
          {viewMode === 'composition' && compositions.length === 0 && (
            <Alert severity="info" sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
              Aucune composition avec des notes publiées trouvée pour cet élève.
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
};

export default UnifiedBulletin;

