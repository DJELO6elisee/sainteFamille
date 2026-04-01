import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  CircularProgress, 
  Button, 
  Divider, 
  Stack,
  Grid,
  Chip,
  Avatar,
  Fade,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Grade as GradeIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import axios from 'axios';

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

const StudentReportCard = () => {
  const { studentId, classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Récupère l'année scolaire depuis l'URL ou par défaut l'année courante
  const queryParams = new URLSearchParams(location.search);
  const [schoolYear, setSchoolYear] = useState(queryParams.get('school_year') || getCurrentSchoolYear());
  const [student, setStudent] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trimesterRank, setTrimesterRank] = useState<{ rank: number; total: number; moyenne: number | null } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      if (!token) {
        if (isMounted) navigate('/secretary-login');
        return;
      }
      try {
        const studentRes = await axios.get(`https://saintefamilleexcellence.ci/api/students/${studentId}?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!isMounted) return;
        setStudent(studentRes.data);
        const gradesRes = await axios.get(`https://saintefamilleexcellence.ci/api/students/${studentId}/grades?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) {
          setGrades(gradesRes.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Erreur lors du chargement du bulletin.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [studentId, navigate, classId, schoolYear]);

  useEffect(() => {
    if (!student) return;
    if (grades.length === 0) return;
    const semester = grades[0]?.semester;
    if (!semester) return;
    const fetchRank = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(
          `https://saintefamilleexcellence.ci/api/students/${student.id}/trimester-rank?semester=${encodeURIComponent(semester)}&school_year=${schoolYear}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setTrimesterRank(data);
      } catch (err) {
        setTrimesterRank(null);
      }
    };
    fetchRank();
  }, [student, grades, schoolYear]);

  // Calculs totaux
  const totalCoef = grades.reduce((acc, g) => acc + (g.coefficient || 1), 0);
  const totalMoyCoef = grades.reduce((acc, g) => acc + (g.moyenne * (g.coefficient || 1)), 0);
  const moyenneTrimestrielle = totalCoef ? (totalMoyCoef / totalCoef) : 0;

  // Calcul du nombre de matières avec moyenne >= 10
  const matieresReussies = grades.filter(g => g.moyenne >= 10).length;
  const tauxReussite = grades.length > 0 ? (matieresReussies / grades.length) * 100 : 0;

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Fade in={true} timeout={1000}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={80} sx={{ color: 'white', mb: 2 }} />
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
              Chargement du bulletin...
            </Typography>
          </Box>
        </Fade>
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center', maxWidth: 500 }}>
          <Typography color="error" variant="h6" sx={{ mb: 2 }}>{error}</Typography>
          <Button variant="contained" onClick={() => navigate(`/secretary/report-cards/${classId}`)}>
            Retour à la classe
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      py: 4
    }}>
      <Container maxWidth="lg">
        {/* Header avec bouton retour */}
        <Box sx={{ mb: 4 }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/secretary/report-cards/${classId}`)}
            sx={{ 
              mb: 3,
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.3)',
              }
            }}
          >
            ← Retour à la classe
          </Button>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <FormControl sx={{ minWidth: 160 }} size="small">
            <InputLabel id="school-year-label">Année scolaire</InputLabel>
            <Select
              labelId="school-year-label"
              value={schoolYear}
              label="Année scolaire"
              onChange={e => {
                setSchoolYear(e.target.value);
                // Optionnel : mettre à jour l'URL si besoin
                // navigate(`${location.pathname}?school_year=${e.target.value}`);
              }}
            >
              {SCHOOL_YEARS.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Fade in={true} timeout={800}>
          <Paper sx={{ 
            borderRadius: 4, 
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            background: 'white'
          }}>
            {/* En-tête avec logo et nom de l'école */}
            <Box sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              p: 4,
              textAlign: 'center'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                <Avatar sx={{ 
                  width: 80, 
                  height: 80, 
                  mr: 3,
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '3px solid rgba(255, 255, 255, 0.3)'
                }}>
                  <SchoolIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Box>
                  <Typography variant="h3" fontWeight={800} sx={{ mb: 1, letterSpacing: 2 }}>
                    ÉCOLE MON ÉTABLISSEMENT
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500, opacity: 0.9 }}>
                    Excellence • Discipline • Réussite
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                BP 123 • Téléphone: +123 456 789 • Email: contact@monetablissement.com
              </Typography>
            </Box>
            
            {/* Titre du bulletin */}
            <Box sx={{ 
              background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              p: 3,
              textAlign: 'center'
            }}>
              <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                BULLETIN DE NOTES TRIMESTRIEL
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Année scolaire {schoolYear}
              </Typography>
            </Box>

            {/* Informations de l'élève */}
            <Box sx={{ p: 4, background: '#f8f9fa' }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, borderRadius: 3, background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <PersonIcon />
                      </Avatar>
                      <Typography variant="h6" fontWeight={600}>
                        Informations personnelles
                      </Typography>
                    </Stack>
                    <Stack spacing={1}>
                      <Typography><b>Nom :</b> {student?.last_name} {student?.first_name}</Typography>
                      <Typography><b>Civilité :</b> {student?.gender_label === 'Féminin' ? 'Madame' : student?.gender_label === 'Masculin' ? 'Monsieur' : ''}</Typography>
                      <Typography><b>Matricule :</b> {student?.registration_number}</Typography>
                      <Typography><b>Classe :</b> {student?.classe_name}</Typography>
                      <Typography>
                        <b>Date de naissance :</b> {student?.date_of_birth ? (() => {
                          try {
                            // Si c'est au format DD/MM/YYYY (format du backend)
                            if (/^\d{2}\/\d{2}\/\d{4}$/.test(student.date_of_birth)) {
                              return student.date_of_birth;
                            }
                            // Sinon, convertir en date et formater
                            const date = new Date(student.date_of_birth);
                            return isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
                          } catch (error) {
                            return '';
                          }
                        })() : ''}
                      </Typography>
                      {trimesterRank && (
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          <b>Rang dans la classe :</b> {trimesterRank.rank} / {trimesterRank.total}
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, borderRadius: 3, background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        <CalendarIcon />
                      </Avatar>
                      <Typography variant="h6" fontWeight={600}>
                        Informations académiques
                      </Typography>
                    </Stack>
                    <Stack spacing={1}>
                      <Typography><b>Sexe :</b> {student?.gender_label}</Typography>
                      <Typography><b>Nationalité :</b> {student?.nationality || '-'}</Typography>
                      <Typography><b>Matières évaluées :</b> {grades.length}</Typography>
                      <Typography><b>Moyenne générale :</b> {moyenneTrimestrielle.toFixed(2)}/20</Typography>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Statistiques rapides */}
            <Box sx={{ p: 4, background: 'white' }}>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <GradeIcon sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                      {moyenneTrimestrielle.toFixed(2)}
                    </Typography>
                    <Typography variant="body2">Moyenne générale</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white'
                  }}>
                    <TrendingUpIcon sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                      {tauxReussite.toFixed(0)}%
                    </Typography>
                    <Typography variant="body2">Taux de réussite</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    color: 'white'
                  }}>
                    <SchoolIcon sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
                      {grades.length}
                    </Typography>
                    <Typography variant="body2">Matières évaluées</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Tableau des notes */}
            <Box sx={{ p: 4, background: '#f8f9fa' }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 3, color: '#2c3e50' }}>
                Détail des notes par matière
              </Typography>
              <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Discipline</TableCell>
                      <TableCell align="center" sx={{ color: 'white', fontWeight: 700 }}>Moy/20</TableCell>
                      <TableCell align="center" sx={{ color: 'white', fontWeight: 700 }}>Coef.</TableCell>
                      <TableCell align="center" sx={{ color: 'white', fontWeight: 700 }}>Moy x Coef</TableCell>
                      <TableCell align="center" sx={{ color: 'white', fontWeight: 700 }}>Rang</TableCell>
                      <TableCell align="center" sx={{ color: 'white', fontWeight: 700 }}>Appréciation</TableCell>
                      <TableCell align="center" sx={{ color: 'white', fontWeight: 700 }}>Professeur</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary" variant="h6">
                            Aucune note publiée pour cet élève.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      grades.map((g, index) => (
                        <TableRow 
                          key={g.subject_id}
                          sx={{ 
                            '&:nth-of-type(odd)': { backgroundColor: '#f8f9fa' },
                            '&:hover': { backgroundColor: '#e3f2fd' },
                            transition: 'background-color 0.3s ease'
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600 }}>{g.subject_name}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={g.moyenne?.toFixed(2)}
                              color={g.moyenne >= 10 ? 'success' : 'error'}
                              variant="filled"
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={g.coefficient || 1}
                              variant="outlined"
                              color="primary"
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600 }}>
                            {(g.moyenne * (g.coefficient || 1)).toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            {g.rang ? (
                              <Chip 
                                label={`${g.rang}/${grades.length}`}
                                color="primary"
                                variant="outlined"
                                size="small"
                              />
                            ) : '-'}
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" color="text.secondary">
                              {g.appreciation || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" color="text.secondary">
                              {g.teacher_name || '-'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {grades.length > 0 && (
                      <TableRow sx={{ background: 'linear-gradient(90deg, #f093fb 0%, #f5576c 100%)' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 700 }}>TOTAUX</TableCell>
                        <TableCell></TableCell>
                        <TableCell align="center" sx={{ color: 'white', fontWeight: 700 }}>{totalCoef}</TableCell>
                        <TableCell align="center" sx={{ color: 'white', fontWeight: 700 }}>{totalMoyCoef.toFixed(2)}</TableCell>
                        <TableCell colSpan={3}></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>
            </Box>

            {/* Résumé final */}
            <Box sx={{ p: 4, background: 'white' }}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, borderRadius: 3, background: '#e8f5e8', border: '2px solid #4caf50' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#2e7d32' }}>
                      Résumé académique
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <b>Moyenne trimestrielle :</b> {moyenneTrimestrielle.toFixed(2)} / 20
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <b>Matières réussies :</b> {matieresReussies} / {grades.length}
                    </Typography>
                    <Typography variant="body1">
                      <b>Taux de réussite :</b> {tauxReussite.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, borderRadius: 3, background: '#fff3e0', border: '2px solid #ff9800' }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#e65100' }}>
                      Appréciation du conseil
                    </Typography>
                    <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                      {moyenneTrimestrielle >= 16 ? 'Excellent travail ! Continuez ainsi.' :
                       moyenneTrimestrielle >= 14 ? 'Très bon travail. Quelques efforts supplémentaires.' :
                       moyenneTrimestrielle >= 12 ? 'Bon travail. Des progrès sont possibles.' :
                       moyenneTrimestrielle >= 10 ? 'Travail satisfaisant. Des efforts sont nécessaires.' :
                       'Des efforts importants sont nécessaires pour progresser.'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Pied de page avec signatures */}
            <Box sx={{ p: 4, background: '#f8f9fa' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3, textAlign: 'center', color: '#2c3e50' }}>
                Signatures et validations
              </Typography>
              <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderRadius: 3,
                    background: 'white',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    border: '2px dashed #ddd'
                  }}>
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 2, color: '#2c3e50' }}>
                      Signature du Professeur Principal
                    </Typography>
                    <Box sx={{ height: 80, borderBottom: '2px solid #ccc', mb: 2 }}></Box>
                    <Typography variant="caption" color="text.secondary">
                      Cachet et signature
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderRadius: 3,
                    background: 'white',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    border: '2px dashed #ddd'
                  }}>
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 2, color: '#2c3e50' }}>
                      Signature du Directeur
                    </Typography>
                    <Box sx={{ height: 80, borderBottom: '2px solid #ccc', mb: 2 }}></Box>
                    <Typography variant="caption" color="text.secondary">
                      Cachet et signature
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center', 
                    borderRadius: 3,
                    background: 'white',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    border: '2px dashed #ddd'
                  }}>
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 2, color: '#2c3e50' }}>
                      Signature des Parents
                    </Typography>
                    <Box sx={{ height: 80, borderBottom: '2px solid #ccc', mb: 2 }}></Box>
                    <Typography variant="caption" color="text.secondary">
                      Vu et approuvé
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              
              {/* Informations de l'établissement */}
              <Box sx={{ 
                mt: 4, 
                p: 3, 
                textAlign: 'center', 
                borderRadius: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                  École Mon Établissement • BP 123 • Téléphone: +123 456 789 • Email: contact@monetablissement.com
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Bulletin généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default StudentReportCard 

