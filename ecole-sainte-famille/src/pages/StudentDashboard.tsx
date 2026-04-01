import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Avatar,
  Snackbar,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Stack
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PaymentIcon from '@mui/icons-material/Payment';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { useNavigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import axios from 'axios';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import UpdateButton from '../components/UpdateButton';

interface Notification {
  id: number;
  title: string;
  message: string;
  event_date: string | null;
  created_at: string;
  is_read: number;
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

// Fonction utilitaire pour parser la moyenne
function parseMoyenne(val: any) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.includes(':')) {
    // "14:00:00" => 14
    return parseFloat(val.split(':')[0]);
  }
  return Number(val) || 0;
}

const StudentDashboard = () => {
  const [student, setStudent] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'info' | 'success' | 'error' });
  const navigate = useNavigate();
  const [openNotesDialog, setOpenNotesDialog] = useState(false);
  const [grades, setGrades] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [selectedSemester, setSelectedSemester] = useState('1er trimestre');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [loadingRecentGrades, setLoadingRecentGrades] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trimesterRank, setTrimesterRank] = useState<{ rank: number; total: number; moyenne: number | null } | null>(null);
  const [annualAverage, setAnnualAverage] = useState<{ moyenne_annuelle: number, rank: number, total: number } | null>(null);
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());
  const [publishedTrimesters, setPublishedTrimesters] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    let isMounted = true;
    
    const fetchStudentAndNotifications = async () => {
      console.log('[StudentDashboard] Début du chargement des données initiales.');
      if (!isMounted) return;
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
          console.error('[StudentDashboard] Aucun token trouvé, déconnexion.');
          if (isMounted) handleLogout();
          return;
      }
      
      try {
        // Étape 1: Récupérer les données de l'élève (priorité haute)
        console.log('[StudentDashboard] Étape 1: Récupération des données élève...');
        const studentResponse = await axios.get('https://saintefamilleexcellence.ci/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000 // Augmenté à 15 secondes pour le debug
        });
        
        if (!isMounted) return;
        
        console.log('[StudentDashboard] Réponse complète de /api/auth/me:', studentResponse.data);
        console.log('[StudentDashboard] studentResponse.data.student:', studentResponse.data.student);
        setStudent(studentResponse.data.student);
        console.log('[StudentDashboard] Données élève reçues:', studentResponse.data.student);
        
        // Afficher l'interface dès que l'élève est chargé
        if (isMounted) setLoading(false);
        
        // Étape 2: Charger les notifications et notes en arrière-plan (non bloquant)
        console.log('[StudentDashboard] Étape 2: Chargement en arrière-plan...');
        
        // Charger les notifications
        axios.get('https://saintefamilleexcellence.ci/api/events/my-notifications', {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 3000
        }).then(response => {
            if (isMounted) setNotifications(response.data);
        }).catch(err => {
            console.error("[StudentDashboard] Erreur lors du chargement des notifications:", err);
        });

        // Charger les notes récentes seulement si l'élève existe
        if (studentResponse.data.student && isMounted) {
          console.log(`[StudentDashboard] Chargement des notes récentes pour l'élève ID: ${studentResponse.data.student.id}`);
          setLoadingRecentGrades(true);
          
          axios.get(`https://saintefamilleexcellence.ci/api/students/${studentResponse.data.student.id}/grades?school_year=${schoolYear}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000 // Réduit à 8 secondes
          }).then(response => {
            if (isMounted) {
              console.log('[StudentDashboard] Notes récentes reçues de l\'API:', response.data);
              setRecentGrades(response.data);
            }
          }).catch(err => {
            if (isMounted) {
              console.error("[StudentDashboard] ERREUR lors du chargement des notes récentes:", err);
              setRecentGrades([]);
            }
          }).finally(() => {
            if (isMounted) setLoadingRecentGrades(false);
          });
        }

        // Ajout récupération moyenne annuelle
        if (studentResponse.data.student) {
          const fetchAnnualAverage = async () => {
            const token = localStorage.getItem('token');
            try {
              const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/${studentResponse.data.student.id}/annual-average?school_year=${schoolYear}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setAnnualAverage(data);
            } catch (err) {
              if (axios.isAxiosError(err) && err.response && err.response.status === 404) {
                setAnnualAverage(null);
                setSnackbar({ open: true, message: "Aucune moyenne annuelle trouvée pour cette année scolaire.", severity: 'info' });
              } else {
                setAnnualAverage(null);
                setSnackbar({ open: true, message: "Erreur lors du chargement de la moyenne annuelle.", severity: 'error' });
              }
            }
          };
          fetchAnnualAverage();
        }

        // Récupérer l'état de publication des bulletins pour chaque trimestre
        if (studentResponse.data.student && studentResponse.data.student.class_id) {
          const token = localStorage.getItem('token');
          const pub: { [key: string]: boolean } = {};
          for (const t of ['1er trimestre', '2e trimestre', '3e trimestre']) {
            try {
              const res = await axios.get(`https://saintefamilleexcellence.ci/api/report-cards/published?class_id=${studentResponse.data.student.class_id}&trimester=${encodeURIComponent(t)}&school_year=${schoolYear}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              pub[t] = !!res.data.published;
            } catch {
              pub[t] = false;
            }
          }
          if (isMounted) setPublishedTrimesters(pub);
        }

      } catch (err) {
        if (!isMounted) return;
        
        console.error("[StudentDashboard] ERREUR FATALE lors de la récupération des données initiales:", err);
        
        // Typer l'erreur pour TypeScript
        if (err && typeof err === 'object' && 'isAxiosError' in err) {
          const axiosError = err as any;
          console.error("[StudentDashboard] Détails de l'erreur Axios:", {
            message: axiosError.message,
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
            config: {
              url: axiosError.config?.url,
              method: axiosError.config?.method,
              headers: axiosError.config?.headers
            }
          });
        } else {
          console.error("[StudentDashboard] Erreur non-Axios:", err);
        }
        
        setStudent(null);
        setRecentGrades([]);
        setNotifications([]);
        setLoading(false);
      }
    };
    
    fetchStudentAndNotifications();
    
    return () => {
      isMounted = false;
    };
  }, [schoolYear]);

  useEffect(() => {
    let isMounted = true;
    
    console.log('useEffect rang global', { openNotesDialog, student, selectedSemester });
    if (!openNotesDialog || !student || !selectedSemester) return;
    
    const fetchRank = async () => {
      if (!isMounted) return;
      
      try {
        const token = localStorage.getItem('token');
        const url = `https://saintefamilleexcellence.ci/api/students/${student.id}/trimester-rank?semester=${encodeURIComponent(selectedSemester)}&school_year=${schoolYear}`;
        console.log('Appel API rang global:', url, 'semester:', selectedSemester);
        const { data } = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (isMounted) {
          console.log('Rang global reçu :', data);
          setTrimesterRank(data);
        }
      } catch (err) {
        if (isMounted) {
          setTrimesterRank(null);
        }
      }
    };
    
    fetchRank();
    
    return () => {
      isMounted = false;
    };
  }, [openNotesDialog, student, selectedSemester, schoolYear]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleComingSoon = (msg: string) => {
    setSnackbar({
      open: true,
      message: msg,
      severity: 'info',
    });
  };

  const handlePaymentClick = () => {
    navigate('/student/payment');
  };

  const handleShowSchedule = () => {
    if (!student) {
      console.error('[handleShowSchedule] Tentative d\'ouverture de l\'emploi du temps sans données élève.');
      return;
    }
    navigate(`/student/schedule/${student.id}`);
  };

  const handleShowNotes = async () => {
    console.log('handleShowNotes appelé');
    if (!student) {
        console.error('[handleShowNotes] Tentative d\'ouverture de la modale sans données élève.');
        return;
    };
    console.log(`[handleShowNotes] Ouverture de la modale des notes pour l'élève ID: ${student.id}`);
    setOpenNotesDialog(true);
    setLoadingNotes(true);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/students/${student.id}/grades?school_year=${schoolYear}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 20000 // 20 secondes de timeout pour les notes complètes
      });
      console.log('[handleShowNotes] Toutes les notes reçues de l\'API:', data);
      setGrades(data);
    } catch (err) {
      console.error("[handleShowNotes] ERREUR lors du chargement de toutes les notes:", err);
      
      // Typer l'erreur pour TypeScript
      if (err && typeof err === 'object' && 'isAxiosError' in err) {
        const axiosError = err as any;
        console.error("[handleShowNotes] Détails de l'erreur Axios:", {
          message: axiosError.message,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data
        });
      }
      
      setGrades([]);
      // Afficher un message d'erreur à l'utilisateur
      setSnackbar({ 
        open: true, 
        message: 'Erreur lors du chargement des notes. Veuillez réessayer.', 
        severity: 'error' 
      });
    }
    setLoadingNotes(false);
    setSelectedSemester('1er trimestre');
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
        const token = localStorage.getItem('token');
        await axios.put(`https://saintefamilleexcellence.ci/api/events/notifications/${notificationId}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: 1 } : n));
        setSnackbar({ open: true, message: 'Notification marquée comme lue.', severity: 'success' });
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la notification", error);
        setSnackbar({ open: true, message: 'Erreur lors de la mise à jour.', severity: 'error' });
    }
  };

  if (loading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
                Chargement de votre espace...
            </Typography>
        </Box>
    );
  }
  
  return (
    <Box sx={{
      minHeight: '100vh',
      background: '#f5faff',
      fontFamily: "'Poppins', 'Roboto', 'Arial', sans-serif"
    }}>
      {/* Header sticky */}
      <Box sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1100,
        background: '#1976d2',
        color: '#fff',
        boxShadow: '0 4px 24px 0 rgba(25, 118, 210, 0.10)',
        width: '100%',
        py: { xs: 2, md: 3 },
        px: { xs: 2, md: 8 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Typography variant="h4" fontWeight={900} sx={{
            letterSpacing: 1,
            fontSize: { xs: 22, md: 32 },
            color: '#fff',
            textShadow: '0 2px 12px #1565c0',
        }}>
          Mon Espace Élève
        </Typography>
        <Box display="flex" alignItems="center">
          <Avatar sx={{ bgcolor: '#fff', color: '#1976d2', mr: 1.5, boxShadow: '0 2px 8px #1976d2', border: '2px solid #fff' }}>
            <PersonIcon />
          </Avatar>
          <Typography variant="h6" fontWeight={700} sx={{ mr: 2, fontSize: { xs: 15, md: 18 }, display: { xs: 'none', md: 'block' }, color: '#fff' }}>
            {student?.first_name ? `${student.first_name} ${student.last_name}` : student?.name}
          </Typography>
          <IconButton color="primary" onClick={handleLogout} title="Déconnexion" sx={{
            bgcolor: '#fff',
            color: '#1976d2',
            border: '2px solid #1976d2',
            '&:hover': { bgcolor: '#d32f2f', color: '#fff', borderColor: '#d32f2f' }
          }}>
            <LogoutIcon />
          </IconButton>
        </Box>
      </Box>
      {/* Titre dashboard */}
      <Box sx={{ width: '100%', textAlign: 'center', my: 5 }}>
        <Typography variant="h3" fontWeight={900} sx={{ color: '#1976d2', fontSize: { xs: 28, md: 44 }, letterSpacing: 1, textShadow: '0 2px 12px #e3e0ff' }}>
          Tableau de bord
        </Typography>
        <Typography variant="h6" fontWeight={400} sx={{ color: '#1565c0', mt: 1, fontSize: { xs: 16, md: 20 } }}>
          Bienvenue, {student?.first_name || 'cher élève'} !
        </Typography>
        {/* Sélecteur d'année scolaire */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <FormControl sx={{ minWidth: 180 }} size="small">
            <InputLabel id="school-year-label" sx={{ color: '#1976d2' }}>Année scolaire</InputLabel>
            <Select
              labelId="school-year-label"
              value={schoolYear}
              label="Année scolaire"
              onChange={e => setSchoolYear(e.target.value)}
              sx={{ bgcolor: '#fff', borderRadius: 2, boxShadow: '0 2px 8px #1976d2', color: '#1976d2', fontWeight: 700 }}
            >
              {SCHOOL_YEARS.map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Section Notifications */}
      <Container maxWidth="lg" sx={{ mb: 4 }}>
        {notifications.filter(n => n.is_read === 0).length > 0 && (
            <Paper elevation={2} sx={{ p: 2, borderRadius: '16px', background: 'rgba(255, 255, 255, 0.7)' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <NotificationsIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                        Notifications importantes
                    </Typography>
                </Stack>
                <Stack spacing={2}>
                    {notifications.filter(n => n.is_read === 0).map((notif) => (
                        <Alert 
                            key={notif.id}
                            severity="info"
                            variant="filled"
                            sx={{ borderRadius: '12px' }}
                            action={
                                <Button 
                                    color="inherit" 
                                    size="small"
                                    startIcon={<MarkEmailReadIcon />}
                                    onClick={() => handleMarkAsRead(notif.id)}
                                >
                                    Marquer comme lu
                                </Button>
                            }
                        >
                            <Typography fontWeight="bold">{notif.title}</Typography>
                            {notif.event_date && (
                                <Typography variant="body2" sx={{ fontStyle: 'italic', my: 0.5, opacity: 0.9 }}>
                                    <b>Date de l'événement :</b> {new Date(notif.event_date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                            )}
                            {notif.message}
                        </Alert>
                    ))}
                </Stack>
            </Paper>
        )}
      </Container>

      {/* Section Aperçu des notes récentes */}
      <Container maxWidth="lg" sx={{ mb: 4 }}>
        {loadingRecentGrades ? (
          <Paper elevation={2} sx={{ p: 3, borderRadius: '16px', background: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">Chargement de vos notes...</Typography>
          </Paper>
        ) : recentGrades.length > 0 ? (
          <Paper elevation={2} sx={{ p: 3, borderRadius: '16px', background: 'rgba(255, 255, 255, 0.7)' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AssignmentIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  Aperçu de vos notes
                </Typography>
              </Stack>
              <Button 
                variant="outlined" 
                color="primary" 
                size="small"
                onClick={handleShowNotes}
              >
                Voir toutes mes notes
              </Button>
            </Stack>
            
            <Grid container spacing={2}>
              {recentGrades.slice(0, 3).map((grade: any) => (
                <Grid item xs={12} sm={6} md={4} key={grade.subject_id + '_' + grade.semester}>
                  <Paper 
                    elevation={1} 
                    sx={{ 
                      p: 2, 
                      borderRadius: '12px', 
                      border: '1px solid #e0e0e0',
                      bgcolor: 'rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                      {grade.subject_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {grade.semester}
                    </Typography>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="h5" fontWeight={700} color={parseMoyenne(grade.moyenne) >= 10 ? 'success.main' : 'error.main'}>
                          {grade.moyenne != null ? parseMoyenne(grade.moyenne).toFixed(2) : '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Moyenne
                        </Typography>
                      </Box>
                      {grade.rang && (
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" fontWeight={700} color="primary.main">
                            {grade.rang}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Rang / {grade.total_eleves}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            
            {recentGrades.length > 3 && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Et {recentGrades.length - 3} autres matières...
                </Typography>
              </Box>
            )}
          </Paper>
        ) : (
          <Paper elevation={2} sx={{ p: 3, borderRadius: '16px', background: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
            <AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              Aucune note publiée
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vos professeurs n'ont pas encore publié de notes. Elles apparaîtront ici une fois publiées.
            </Typography>
          </Paper>
        )}
      </Container>

      {/* Affichage de la moyenne annuelle */}
      {(annualAverage !== null && annualAverage.moyenne_annuelle !== null && publishedTrimesters['1er trimestre'] && publishedTrimesters['2e trimestre'] && publishedTrimesters['3e trimestre']) ? (
        <Container maxWidth="lg" sx={{ mb: 4 }}>
          <Paper
            elevation={8}
            sx={{
              p: { xs: 2, md: 4 },
              borderRadius: '32px',
              background: '#fff',
              boxShadow: '0 8px 32px 0 rgba(25, 118, 210, 0.15)',
              textAlign: 'center',
              mt: 3,
              transition: 'box-shadow 0.3s',
              '&:hover': {
                boxShadow: '0 16px 40px 0 rgba(25, 118, 210, 0.25)',
                transform: 'scale(1.02)'
              },
            }}
          >
            <Typography
              variant="h5"
              fontWeight={900}
              sx={{
                color: '#1976d2',
                mb: 1,
                letterSpacing: 1,
                fontSize: { xs: 22, md: 32 },
                textShadow: '0 2px 8px #e3e0ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1
              }}
            >
              <AssignmentIcon sx={{ color: '#1565c0', fontSize: 36, mr: 1 }} />
              Moyenne annuelle&nbsp;:
              <span style={{
                color: annualAverage.moyenne_annuelle >= 10 ? '#2e7d32' : '#d32f2f',
                fontWeight: 900,
                fontSize: '1.7em',
                marginLeft: 8,
                textShadow: '0 2px 8px #e0ffe8',
              }}>
                {annualAverage.moyenne_annuelle?.toFixed(2)} / 20
              </span>
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
              {annualAverage.moyenne_annuelle >= 10 ? (
                <Chip
                  label="Admis en classe supérieure"
                  color="success"
                  icon={<span style={{ fontSize: 20, fontWeight: 700 }}>✔</span>}
                  sx={{ fontWeight: 700, fontSize: 18, px: 2, py: 1, mr: 1, bgcolor: '#e0ffe8', color: '#2e7d32', boxShadow: '0 2px 8px #1976d2' }}
                />
              ) : (
                <Chip
                  label="Non admis"
                  color="error"
                  icon={<span style={{ fontSize: 20, fontWeight: 700 }}>✖</span>}
                  sx={{ fontWeight: 700, fontSize: 18, px: 2, py: 1, mr: 1, bgcolor: '#ffe0e0', color: '#d32f2f', boxShadow: '0 2px 8px #d32f2f' }}
                />
              )}
            </Box>
            <Typography
              variant="body1"
              sx={{
                color: '#1565c0',
                fontWeight: 700,
                fontSize: 20,
                mt: 1,
                letterSpacing: 0.5,
              }}
            >
              Rang dans la classe&nbsp;:
              <span style={{
                color: '#1976d2',
                fontWeight: 900,
                fontSize: 22,
                marginLeft: 8,
              }}>
                {annualAverage.rank} / {annualAverage.total}
              </span>
            </Typography>
          </Paper>
        </Container>
      ) : (
        <Container maxWidth="lg" sx={{ mb: 4 }}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: '16px', background: '#fff', textAlign: 'center', boxShadow: '0 2px 8px #1976d2' }}>
            <Typography variant="h6" color="#d32f2f">
              La moyenne annuelle sera affichée dès que les bulletins des trois trimestres seront publiés.
            </Typography>
          </Paper>
        </Container>
      )}

      {/* Actions principales */}
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="center">
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                borderRadius: '16px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.5)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                '&:hover': loading
                  ? {}
                  : {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 20px -8px rgba(0, 123, 255, 0.3)',
                    },
              }}
              onClick={() => !loading && handleShowNotes()}
            >
              <Avatar sx={{ bgcolor: 'primary.light', width: 70, height: 70, mb: 2 }}>
                <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Avatar>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Mes notes</Typography>
              <Typography variant="body2" color="text.secondary">Consultez vos notes et moyennes</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                borderRadius: '16px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.5)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                '&:hover': loading
                  ? {}
                  : {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 20px -8px rgba(0, 123, 255, 0.3)',
                    },
              }}
              onClick={() => !loading && handleShowSchedule()}
            >
              <Avatar sx={{ bgcolor: 'primary.light', width: 70, height: 70, mb: 2 }}>
                <CalendarTodayIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Avatar>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Mon emploi du temps</Typography>
              <Typography variant="body2" color="text.secondary">Visualisez votre planning de cours</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                borderRadius: '16px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.5)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                '&:hover': loading
                  ? {}
                  : {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 20px -8px rgba(0, 123, 255, 0.3)',
                    },
              }}
              onClick={() => !loading && navigate('/student/choose-trimester')}
            >
              <Avatar sx={{ bgcolor: 'primary.light', width: 70, height: 70, mb: 2 }}>
                <ReceiptLongIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Avatar>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Mes bulletins</Typography>
              <Typography variant="body2" color="text.secondary">Téléchargez vos bulletins scolaires</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                borderRadius: '16px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.5)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                '&:hover': loading
                  ? {}
                  : {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 20px -8px rgba(0, 123, 255, 0.3)',
                    },
              }}
              onClick={() => !loading && handlePaymentClick()}
            >
              <Avatar sx={{ bgcolor: 'primary.light', width: 70, height: 70, mb: 2 }}>
                <PaymentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Avatar>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>Payer ma scolarité</Typography>
              <Typography variant="body2" color="text.secondary">Réglez vos frais de scolarité en ligne</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
      {/* Dialog des notes */}
      <Dialog open={openNotesDialog} onClose={() => setOpenNotesDialog(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.5rem', borderBottom: '1px solid #eee' }}>Mes notes</DialogTitle>
        <DialogContent sx={{ py: 3, background: '#fcfcfc' }}>
          {/* Sélecteur de trimestre */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="semester-label">Trimestre</InputLabel>
            <Select
              labelId="semester-label"
              value={selectedSemester}
              label="Trimestre"
              onChange={e => setSelectedSemester(e.target.value)}
            >
              <MenuItem value="1er trimestre">1er trimestre</MenuItem>
              <MenuItem value="2e trimestre">2e trimestre</MenuItem>
              <MenuItem value="3e trimestre">3e trimestre</MenuItem>
            </Select>
          </FormControl>
          {loadingNotes ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 150 }}>
              <CircularProgress size={50} />
            </Box>
          ) : grades.filter((g: any) => g.semester === selectedSemester).length === 0 ? (
            <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: '#f0f4f8', borderRadius: '12px' }}>
              <Typography variant="h6">Aucune note publiée pour ce trimestre</Typography>
              <Typography color="text.secondary">Vos professeurs n'ont pas encore publié les notes pour ce trimestre.</Typography>
            </Paper>
          ) : (
            <>
              {/* Résumé global */}
              <Paper elevation={0} sx={{ p: 3, mb: 3, bgcolor: '#e3f2fd', borderRadius: '16px', boxShadow: '0 2px 12px 0 rgba(33,150,243,0.08)', border: '1px solid #bbdefb', textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#1565c0', fontWeight: 700, mb: 2, letterSpacing: 1 }}>
                  Résumé du {selectedSemester}
                </Typography>
                <Grid container spacing={3} justifyContent="center" alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">Matières évaluées</Typography>
                    <Typography variant="h6" fontWeight={600}>
                      {grades.filter((g: any) => g.semester === selectedSemester).length}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">Moyenne générale</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
                      <Typography
                        variant="h2"
                        fontWeight={900}
                        sx={{
                          color: (() => {
                            const semesterGrades = grades.filter((g: any) => g.semester === selectedSemester);
                            if (semesterGrades.length === 0) return '#888';
                            const totalMoyenne = semesterGrades.reduce((sum, g) => sum + parseMoyenne(g.moyenne), 0);
                            const moyenne = totalMoyenne / semesterGrades.length;
                            return moyenne >= 10 ? '#2e7d32' : '#d32f2f';
                          })(),
                          fontSize: { xs: 36, md: 54 },
                          lineHeight: 1.1,
                          letterSpacing: 1,
                          px: 2
                        }}
                      >
                        {(() => {
                          const semesterGrades = grades.filter((g: any) => g.semester === selectedSemester);
                          if (semesterGrades.length === 0) return '-';
                          const totalMoyenne = semesterGrades.reduce((sum, g) => sum + parseMoyenne(g.moyenne), 0);
                          return (totalMoyenne / semesterGrades.length).toFixed(2);
                        })()}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">Meilleur rang</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
                      <Chip
                        label={(() => {
                          const semesterGrades = grades.filter((g: any) => g.semester === selectedSemester);
                          if (semesterGrades.length === 0) return '-';
                          const bestRank = Math.min(...semesterGrades.map((g: any) => g.rang || 999));
                          return bestRank === 999 ? '-' : bestRank;
                        })()}
                        color="primary"
                        sx={{ fontWeight: 700, fontSize: 18, px: 2, py: 1, borderRadius: 2 }}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              {/* Tableau détaillé */}
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e0e0e0' }}>
                <Table size="medium" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #eee' } }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50', '& .MuiTableCell-root': { fontWeight: 'bold' } }}>
                      <TableCell>Matière</TableCell>
                      <TableCell>Notes détaillées</TableCell>
                      <TableCell align="center">Moyenne</TableCell>
                      <TableCell align="center">Rang</TableCell>
                      <TableCell align="center">Classe</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {grades.filter((g: any) => g.semester === selectedSemester).map((row: any) => (
                      <TableRow key={row.subject_id + '_' + row.class_id + '_' + row.semester} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'grey.100' } }}>
                        <TableCell sx={{ fontWeight: 500 }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {row.subject_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {row.notes.map((n: any, i: number) => (
                              <Chip 
                                key={i}
                                label={`${n.grade}${n.coefficient && n.coefficient !== 1 ? ` (x${n.coefficient})` : ''}`} 
                                size="small"
                                color={n.grade >= 10 ? 'success' : 'error'}
                                variant="outlined"
                                sx={{ fontWeight: 600 }}
                              />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography 
                            variant="h6" 
                            fontWeight={700} 
                            color={Number(row.moyenne) >= 10 ? 'success.main' : 'error.main'}
                            sx={{ 
                              bgcolor: Number(row.moyenne) >= 10 ? 'success.light' : 'error.light',
                              borderRadius: '8px',
                              px: 1,
                              py: 0.5,
                              display: 'inline-block'
                            }}
                          >
                            {row.moyenne != null ? Number(row.moyenne).toFixed(2) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {row.rang != null ? (
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" fontWeight={700} color="primary.main">
                                {row.rang}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                sur {row.total_eleves}
                              </Typography>
                            </Box>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={row.class_name} 
                            size="small" 
                            variant="outlined"
                            color="primary"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Rang global du trimestre */}
              {trimesterRank && trimesterRank.total > 0 && (
                <Paper elevation={0} sx={{ p: 3, mt: 3, bgcolor: '#f8f9fa', borderRadius: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#495057', fontWeight: 600 }}>
                    Rang dans la classe pour le trimestre
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                    Classe : {student?.class_name || (grades.find(g => g.semester === selectedSemester)?.class_name ?? '-')}
                  </Typography>
                  <Typography variant="h3" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
                    {trimesterRank.rank} <span style={{ fontSize: 22, color: '#888' }}>/ {trimesterRank.total}</span>
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                    Moyenne trimestrielle : {trimesterRank.moyenne ? Number(trimesterRank.moyenne).toFixed(2) : '-'} / 20
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {trimesterRank.rank === 1
                      ? 'Félicitations, vous êtes premier !'
                      : trimesterRank.rank <= 5
                      ? 'Très bon classement'
                      : trimesterRank.rank <= 10
                      ? 'Bon classement'
                      : 'Classement à améliorer'}
                  </Typography>
                </Paper>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #eee', background: '#fcfcfc' }}>
          <Button onClick={() => setOpenNotesDialog(false)} variant="contained">Fermer</Button>
        </DialogActions>
      </Dialog>
      {/* Footer */}
      <Box sx={{ mt: 8, py: 3, textAlign: 'center', background: '#1976d2', color: '#fff', fontSize: 16, letterSpacing: 1, fontWeight: 700, boxShadow: '0 -2px 12px #1565c0' }}>
        © {new Date().getFullYear()} Mon Établissement — Tous droits réservés.
      </Box>
      <UpdateButton position="fixed" />
    </Box>
  );
};

export default StudentDashboard;

