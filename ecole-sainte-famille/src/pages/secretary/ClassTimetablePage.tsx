import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Snackbar, Alert, Stack, Grid,
  Container, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select,
  FormControl, InputLabel, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, keyframes, ButtonGroup
} from '@mui/material';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SecretarySidebar from '../../components/SecretarySidebar';
import ShareIcon from '@mui/icons-material/Share';
import PrintIcon from '@mui/icons-material/Print';

// Interfaces
interface ClassDetails {
  id: number;
  name: string;
  timetable_published: boolean;
}
interface Subject { id: number; name: string; }
interface Teacher { id: number; first_name: string; last_name: string; }
interface ScheduleEntry {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_first_name: string;
  teacher_last_name: string;
  subject_id: number;
  teacher_id: number;
}
interface ScheduleSlot {
  day: string;
  start_time: string;
  end_time: string;
}

// Helpers
const glowingAnimation = keyframes`
  0% { background-color: rgba(25, 118, 210, 0.08); box-shadow: 0 0 4px rgba(25, 118, 210, 0.2); }
  50% { background-color: rgba(25, 118, 210, 0.15); box-shadow: 0 0 12px rgba(25, 118, 210, 0.4); }
  100% { background-color: rgba(25, 118, 210, 0.08); box-shadow: 0 0 4px rgba(25, 118, 210, 0.2); }
`;

// Renvoie l'année scolaire courante sous forme '2024-2025'
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

// Génère dynamiquement les 5 dernières années scolaires (y compris l'année courante)
function getSchoolYears(count = 5) {
  const current = getCurrentSchoolYear();
  const startYear = parseInt(current.split('-')[0], 10);
  return Array.from({ length: count }, (_, i) => {
    const start = startYear - i;
    return `${start}-${start + 1}`;
  });
}

const SCHOOL_YEARS = getSchoolYears(5);

const getSubjectColors = (str: string) => {
  let hash = 0;
  if (str.length === 0) return { bg: 'hsl(210, 20%, 98%)', border: 'hsl(210, 20%, 90%)', text: 'hsl(210, 20%, 40%)' };
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return {
    bg: `hsl(${h}, 80%, 96%)`,
    border: `hsl(${h}, 60%, 86%)`,
    text: `hsl(${h}, 50%, 45%)`,
  };
};

// Toutes les classes utilisent du lundi au vendredi
const getDaysOfWeek = (className: string | null): string[] => {
  return ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
};
const timeSlots = [
  "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
  "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00"
];

const ClassTimetablePage = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  // State
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Partial<ScheduleEntry> & ScheduleSlot | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [subjectTeachers, setSubjectTeachers] = useState<{ [subjectId: number]: Teacher[] }>({});

  const fetchPrerequisites = useCallback(async (token: string) => {
    try {
      // Fetch subjects
      try {
        const subjectsRes = await axios.get('https://saintefamilleexcellence.ci/api/subjects', { headers: { Authorization: `Bearer ${token}` } });
        setSubjects(subjectsRes.data);
      } catch (err) {
        console.error("Erreur fetch subjects:", err);
        throw new Error("Impossible de charger les matières.");
      }
      
      // Fetch teachers
      try {
        const teachersRes = await axios.get('https://saintefamilleexcellence.ci/api/teachers', { headers: { Authorization: `Bearer ${token}` } });
        setTeachers(teachersRes.data);
      } catch (err) {
        console.error("Erreur fetch teachers:", err);
        throw new Error("Impossible de charger les professeurs.");
      }
      
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors du chargement des données.");
    }
  }, []);

  const fetchTimetable = useCallback(async (token: string) => {
    if (!classId) return;

    // Mapping pour lundi au vendredi
    const dayMappingReverse: { [key: string]: string } = {
        "Monday": "Lundi",
        "Tuesday": "Mardi",
        "Wednesday": "Mercredi",
        "Thursday": "Jeudi",
        "Friday": "Vendredi",
    };

    try {
      // 1. Fetch class details (critical)
      const classRes = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}`, { headers: { Authorization: `Bearer ${token}` } });
      setClassDetails(classRes.data);

      // 2. Fetch schedule (non-critical, can be empty)
      try {
        const scheduleRes = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/class/${classId}?school_year=${schoolYear}`,
          { headers: { Authorization: `Bearer ${token}` } });
        const formattedSchedule = scheduleRes.data.map((item: any) => ({
          ...item,
          day_of_week: dayMappingReverse[item.day_of_week] || item.day_of_week,
          subject_name: item.subject_name || 'N/A',
          teacher_first_name: item.teacher_first_name || 'N/A',
          teacher_last_name: item.teacher_last_name || '',
        }));
        setSchedule(formattedSchedule);
      } catch (scheduleErr) {
        console.warn("Avertissement: Impossible de charger l'emploi du temps, la grille sera vide.", scheduleErr);
        setSchedule([]); // Affiche une grille vide en cas d'erreur
      }

    } catch (err) {
       setError("Impossible de charger les détails de la classe.");
    }
  }, [classId, schoolYear]);

  useEffect(() => {
    let isMounted = true;
    
    if (!classId) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    
    axios.get(`/api/class/${classId}/subjects`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (isMounted) {
          // Removed coefficient logic
        }
      })
      .catch(() => {
        if (isMounted) {
          // Removed coefficient logic
        }
      });
    
    return () => {
      isMounted = false;
    };
  }, [classId]);

  useEffect(() => {
    let isMounted = true;
    
    const token = localStorage.getItem('token');
    if (!token) {
        if (isMounted) navigate('/login');
        return;
    }
    if (isMounted) setLoading(true);
    Promise.all([fetchPrerequisites(token), fetchTimetable(token)]).finally(() => {
      if (isMounted) setLoading(false);
    });
    
    return () => {
      isMounted = false;
    };
  }, [classId, navigate, fetchPrerequisites, fetchTimetable, schoolYear]);
  
  // Handlers
  const handleSelectSlot = (slot: ScheduleSlot, entry?: ScheduleEntry) => {
    setSelectedSlot(entry ? { ...entry, ...slot } : slot);
    setIsAddingMode(false);
  };
  
  const handleClearForm = () => {
    setSelectedSlot(null);
    setIsAddingMode(false);
  };

  const handleSave = async () => {
    if(!selectedSlot) return;
    const token = localStorage.getItem('token');

    // Toutes les classes utilisent du lundi au vendredi
    const dayMapping: { [key: string]: string } = {
        "Lundi": "Monday",
        "Mardi": "Tuesday",
        "Mercredi": "Wednesday",
        "Jeudi": "Thursday",
        "Vendredi": "Friday",
    };
    
    const body = {
      class_id: parseInt(classId!, 10),
      subject_id: selectedSlot.subject_id || null,
      teacher_id: selectedSlot.teacher_id,
      day_of_week: dayMapping[selectedSlot.day!] || selectedSlot.day,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      school_year: schoolYear
    };

    try {
        if(selectedSlot.id) { // Update
            const response = await axios.put(`https://saintefamilleexcellence.ci/api/schedules/${selectedSlot.id}`, body, { headers: { Authorization: `Bearer ${token}` } });
            await fetchTimetable(token!); // Refetch on update is fine
            setSuccess(response.data.message || "Opération réussie !");
        } else { // Create
            const response = await axios.post('https://saintefamilleexcellence.ci/api/schedules', body, { headers: { Authorization: `Bearer ${token}` } });
            const newEntry: ScheduleEntry = {
                subject_id: body.subject_id || 0,
                teacher_id: body.teacher_id!,
                start_time: body.start_time!,
                end_time: body.end_time!,
                id: response.data.id,
                day_of_week: selectedSlot.day!, // Utiliser le jour original en français pour l'affichage immédiat
                subject_name: body.subject_id ? (subjects.find(s => s.id === body.subject_id)?.name || 'N/A') : 'Sans matière',
                teacher_first_name: teachers.find(t => t.id === body.teacher_id)?.first_name || 'N/A',
                teacher_last_name: teachers.find(t => t.id === body.teacher_id)?.last_name || '',
            };
            setSchedule(prev => [...prev, newEntry]);
            setSuccess(response.data.message || "Cours ajouté avec succès !");
        }
        handleClearForm();
    } catch(err: any) {
        setError(err.response?.data?.message || "Erreur lors de la sauvegarde.");
        console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
      if(!window.confirm("Êtes-vous sûr de vouloir supprimer ce cours ?")) return;
      const token = localStorage.getItem('token');
      try {
          const response = await axios.delete(`https://saintefamilleexcellence.ci/api/schedules/${id}`, { headers: { Authorization: `Bearer ${token}` } });
          setSchedule(prev => prev.filter(entry => entry.id !== id));
          setSuccess(response.data.message || "Suppression réussie !");
          handleClearForm();
      } catch(err: any) {
          setError(err.response?.data?.message || "Erreur lors de la suppression.");
      }
  }

  const handleShare = async () => {
    if (!classDetails) return;
    const token = localStorage.getItem('token');
    try {
      await axios.put(`https://saintefamilleexcellence.ci/api/classes/${classDetails.id}/publish-timetable`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClassDetails(prev => prev ? { ...prev, timetable_published: true } : null);
      setSuccess('Emploi du temps partagé avec succès !');
    } catch (err) {
      setError('Erreur lors du partage de l\'emploi du temps.');
    }
  };

  const renderCellContent = (day: string, timeSlot: string) => {
    const [start_time] = timeSlot.split(' - ');
    const entries = schedule.filter(e => e.day_of_week === day && e.start_time.startsWith(start_time));
    const slotData = { day, start_time: `${start_time}:00`, end_time: timeSlot.split(' - ')[1] + ':00' };

    return (
      <Box 
        sx={{
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          gap: 0.5,
          p: 0.5
        }}
      >
        {entries.map((entry) => {
          const colors = getSubjectColors(entry.subject_name);
          return (
            <Paper 
              key={entry.id}
              elevation={0}
              sx={{ 
                p: 0.75, 
                bgcolor: colors.bg,
                borderLeft: `3px solid ${colors.border}`,
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  zIndex: 10
                }
              }}
              onClick={() => handleSelectSlot(slotData, entry)}
            >
              <Typography variant="caption" fontWeight="bold" sx={{color: colors.text, lineHeight: 1.2, fontSize: '0.7rem'}} noWrap>
                {entry.subject_name}
              </Typography>
              <Typography variant="caption" sx={{color: colors.text, opacity: 0.75, fontSize: '0.65rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                {entry.teacher_first_name} {entry.teacher_last_name}
              </Typography>
            </Paper>
          );
        })}
        
        <Box 
          onClick={() => handleSelectSlot(slotData)} 
          sx={{
            minHeight: entries.length > 0 ? '24px' : '100%',
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            cursor: 'pointer',
            borderRadius: 1,
            color: entries.length > 0 ? 'grey.300' : 'grey.400',
            transition: 'background-color 0.2s, color 0.2s',
            border: entries.length > 0 ? '1px dashed' : 'none',
            borderColor: 'grey.300',
            '&:hover': { 
              bgcolor: 'primary.lighter',
              color: 'primary.main',
              borderColor: 'primary.main',
              '& .MuiSvgIcon-root': {
                transform: 'scale(1.1)'
              }
            }
          }}
        >
          <AddCircleOutlineIcon sx={{ transition: 'transform 0.2s', fontSize: entries.length > 0 ? '1rem' : '1.3rem' }}/>
        </Box>
      </Box>
    );
  };

  const fetchTeachersForSubject = useCallback(async (subjectId: number) => {
    if (subjectTeachers[subjectId]) return; // déjà chargé
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const { data } = await axios.get(
        `https://saintefamilleexcellence.ci/api/subjects/${subjectId}/teachers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubjectTeachers(prev => ({ ...prev, [subjectId]: data }));
    } catch (err) {
      // Optionnel: afficher une erreur ou ignorer
    }
  }, [setSubjectTeachers]);

  useEffect(() => {
    if (selectedSlot?.subject_id) {
      fetchTeachersForSubject(selectedSlot.subject_id);
    }
  }, [selectedSlot?.subject_id, fetchTeachersForSubject]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress size={60} /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ display: 'flex' }}>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-area, .printable-area * {
              visibility: visible;
            }
            .printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}
      </style>
      <SecretarySidebar />
      <Box component="main" sx={{ p: 3, flexGrow: 1, bgcolor: '#f7f9fc' }}>
        <Container maxWidth={false}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <FormControl sx={{ minWidth: 160 }} size="small">
              <InputLabel id="school-year-label">Année scolaire</InputLabel>
              <Select
                labelId="school-year-label"
                value={schoolYear}
                label="Année scolaire"
                onChange={e => setSchoolYear(e.target.value)}
              >
                {SCHOOL_YEARS.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4, '@media print': { display: 'none' } }} flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h4" fontWeight="bold">
                Emploi du temps : <span style={{ color: '#0277bd' }}>{classDetails?.name}</span>
                <span style={{ marginLeft: 16, fontSize: 18, color: '#888' }}>({schoolYear})</span>
              </Typography>
                             {classDetails?.name && (
                 <Typography 
                   variant="caption" 
                   color="primary" 
                   sx={{ 
                     mt: 1, 
                     display: 'inline-block',
                     px: 1.5,
                     py: 0.5,
                     bgcolor: 'primary.light',
                     color: 'white',
                     borderRadius: 1,
                     fontWeight: 'medium'
                   }}
                 >
                   Lundi-Vendredi
                 </Typography>
               )}
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
                <ButtonGroup variant="contained" aria-label="action buttons">
                    <Button 
                        startIcon={<AddCircleOutlineIcon />} 
                        onClick={() => {
                          setIsAddingMode(true);
                          setSelectedSlot(null);
                        }}
                    >
                        Ajouter un cours
                    </Button>
                    <Button
                        color={classDetails?.timetable_published ? "success" : "secondary"}
                        startIcon={<ShareIcon />}
                        onClick={handleShare}
                        disabled={classDetails?.timetable_published}
                        >
                        {classDetails?.timetable_published ? 'Partagé' : 'Partager'}
                    </Button>
                </ButtonGroup>
                <ButtonGroup variant="outlined" aria-label="navigation buttons">
                    <Button
                        startIcon={<PrintIcon />}
                        onClick={() => window.print()}
                        >
                        Imprimer
                    </Button>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/secretary/timetables')}>Changer de classe</Button>
                </ButtonGroup>
            </Stack>
          </Stack>

          <Grid container spacing={3} className="printable-area">
            <Grid item xs={12} lg={isAddingMode || selectedSlot ? 9 : 12} sx={{ transition: 'all 0.3s ease-in-out'}}>
              <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <Table stickyHeader sx={{ minWidth: 900, borderCollapse: 'separate', borderSpacing: 0 }}>
                      <TableHead>
                          <TableRow>
                              <TableCell sx={{ fontWeight: 'bold', position: 'sticky', left: 0, zIndex: 10, bgcolor: '#f1f3f5', border: '1px solid #dee2e6', borderRightWidth: 2 }}>Heure</TableCell>
                              {getDaysOfWeek(classDetails?.name || null).map(day => (
                                  <TableCell key={day} align="center" sx={{ 
                                    fontWeight: 'bold', 
                                    bgcolor: '#f1f3f5',
                                    textTransform: 'uppercase', 
                                    fontSize: '0.8rem', 
                                    letterSpacing: '0.5px',
                                    border: '1px solid #dee2e6'
                                  }}>
                                      {day}
                                  </TableCell>
                              ))}
                          </TableRow>
                      </TableHead>
                      <TableBody>
                          {timeSlots.map((ts) => (
                              <TableRow key={ts} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                  <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', position: 'sticky', left: 0, bgcolor: '#fff', border: '1px solid #dee2e6', borderRightWidth: 2, zIndex: 9 }}>
                                      {ts}
                                  </TableCell>
                                  {getDaysOfWeek(classDetails?.name || null).map(day => (
                                      <TableCell 
                                          key={day} 
                                          sx={{ p: 0.5, height: '140px', border: '1px solid #e9ecef', verticalAlign: 'top' }}
                                      >
                                          {renderCellContent(day, ts)}
                                      </TableCell>
                                  ))}
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </TableContainer>
            </Grid>
            {(isAddingMode || selectedSlot) && (
            <Grid item xs={12} lg={3} sx={{'@media print': { display: 'none' }}}>
                <Paper sx={{ p: 2, position: 'sticky', top: '80px', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                   <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
                     <SchoolIcon color="primary" />
                     <Typography variant="h6" fontWeight="bold">
                        {selectedSlot?.id ? 'Détails du cours' : 'Nouveau cours'}
                      </Typography>
                   </Stack>
                    
                    {isAddingMode && !selectedSlot && (
                       <Stack alignItems="center" textAlign="center" spacing={2} sx={{p: 2, bgcolor: 'primary.lighter', borderRadius: 2, border: '1px dashed', borderColor: 'primary.light'}}>
                        <AccessTimeIcon sx={{fontSize: 32, color: 'primary.main'}} />
                        <Typography variant="body1" color="primary.dark" fontWeight="medium">
                          Sélectionnez un créneau libre dans la grille.
                        </Typography>
                      </Stack>
                    )}

                    {!isAddingMode && !selectedSlot && (
                      <Stack alignItems="center" textAlign="center" spacing={2} sx={{p: 3, bgcolor: 'grey.50', borderRadius: 2, border: '1px dashed', borderColor: 'grey.300'}}>
                        <AccessTimeIcon sx={{fontSize: 32, color: 'grey.400'}} />
                        <Typography variant="body2" color="text.secondary">
                          Cliquez sur un créneau ou sur "Ajouter un cours" pour commencer.
                        </Typography>
                      </Stack>
                    )}

                    {selectedSlot && (
                      <Stack component="form" spacing={2.5} onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                         <TextField
                            label="Créneau"
                            value={`${selectedSlot.day}, ${selectedSlot.start_time.substring(0,5)} - ${selectedSlot.end_time.substring(0,5)}`}
                            InputProps={{ readOnly: true }}
                            variant="filled"
                            size="small"
                            fullWidth
                         />
                         <FormControl fullWidth>
                            <InputLabel id="subject-select-label">Matière</InputLabel>
                            <Select
                                labelId="subject-select-label"
                                value={selectedSlot?.subject_id || ''}
                                label="Matière"
                                onChange={e => {
                                  const subjectId = e.target.value as number;
                                  if (subjectId) {
                                    fetchTeachersForSubject(subjectId);
                                  }
                                  setSelectedSlot(prev => ({
                                    ...prev!,
                                    subject_id: subjectId,
                                    teacher_id: undefined // reset prof si matière change
                                  }));
                                }}
                                size="small"
                            >
                                <MenuItem value="">Aucune matière</MenuItem>
                                {subjects.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth required>
                            <InputLabel id="teacher-select-label">Enseignant</InputLabel>
                            <Select
                                labelId="teacher-select-label"
                                value={selectedSlot?.teacher_id || ''}
                                label="Professeur"
                                onChange={(e) => setSelectedSlot(prev => ({...prev!, teacher_id: e.target.value as number}))}
                                size="small"
                            >
                                {teachers.map((t: Teacher) => (
                                  <MenuItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Stack direction="row" spacing={1} justifyContent="space-between" sx={{pt: 1}}>
                            {selectedSlot?.id && <IconButton onClick={() => handleDelete(selectedSlot.id!)} color="error" size="small"><DeleteIcon /></IconButton>}
                            <Box sx={{ flexGrow: 1 }} />
                            <Button onClick={handleClearForm} size="small">Annuler</Button>
                            <Button type="submit" variant="contained" size="small" disabled={!selectedSlot.teacher_id}>
                              {selectedSlot.id ? 'Mettre à jour' : 'Sauvegarder'}
                            </Button>
                        </Stack>
                      </Stack>
                    )}
                </Paper>
            </Grid>
            )}
          </Grid>
        </Container>
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
        <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default ClassTimetablePage; 

