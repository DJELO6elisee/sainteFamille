import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Container, Typography, Paper, CircularProgress, Alert, Stack, Card, CardContent, Button, FormControl, InputLabel, Select, MenuItem, Alert as MuiAlert, Snackbar } from '@mui/material';
import SecretarySidebar from '../components/SecretarySidebar';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import BulletinPDF from './BulletinPDF';
import { useReactToPrint } from 'react-to-print';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';

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

type TrimesterData = {
  label: string;
  color: string;
  icon: string;
  moyenne: number | null;
  matieres: number;
  loading: boolean;
  bulletin: any[];
  rang: string | number | null;
  appreciation: string;
  show: boolean;
};

const ReportCardsStudents = () => {
  const { classId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Récupère l'année scolaire depuis l'URL ou par défaut l'année courante
  const queryParams = new URLSearchParams(location.search);
  const initialSchoolYear = queryParams.get('school_year') || getCurrentSchoolYear();
  const [schoolYear, setSchoolYear] = useState(initialSchoolYear);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [selectedTrimester, setSelectedTrimester] = useState<string>('1er trimestre');
  const trimesters = ['1er trimestre', '2e trimestre', '3e trimestre'];
  const [bulletin, setBulletin] = useState<any[]>([]);
  const [rangClasse, setRangClasse] = useState<string | number | null>(null);
  const [appreciation, setAppreciation] = useState<string>('');
  const [moyenneClasse, setMoyenneClasse] = useState<number | null>(null);
  const [loadingBulletin, setLoadingBulletin] = useState(false);
  const [trimestersData, setTrimestersData] = useState<TrimesterData[]>([
    { label: '1er trimestre', color: '#1976d2', icon: '🎓', moyenne: null, matieres: 0, loading: false, bulletin: [], rang: null, appreciation: '', show: false },
    { label: '2e trimestre', color: '#388e3c', icon: '📈', moyenne: null, matieres: 0, loading: false, bulletin: [], rang: null, appreciation: '', show: false },
    { label: '3e trimestre', color: '#f57c00', icon: '📊', moyenne: null, matieres: 0, loading: false, bulletin: [], rang: null, appreciation: '', show: false },
  ]);
  const [openTrimester, setOpenTrimester] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bulletin_${selectedStudent?.last_name || ''}_${selectedStudent?.first_name || ''}_${openTrimester || ''}`,
  });
  const [publishedTrimesters, setPublishedTrimesters] = useState<{ [trimester: string]: boolean }>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [openNotesModal, setOpenNotesModal] = useState(false);
  const [notesStudent, setNotesStudent] = useState<any | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [notesTrimester, setNotesTrimester] = useState('1er trimestre');
  const [notesYear, setNotesYear] = useState(schoolYear);
  const [editNote, setEditNote] = useState<any | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editCoeff, setEditCoeff] = useState(1);
  const [editLoading, setEditLoading] = useState(false);

  // Vérifie la publication d'un trimestre
  const checkPublication = async (trimester: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get('https://saintefamilleexcellence.ci/api/report-cards/published', {
        params: {
          class_id: classId,
          trimester,
          school_year: schoolYear
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      setPublishedTrimesters(prev => ({ ...prev, [trimester]: !!res.data.published }));
    } catch (err) {
      setPublishedTrimesters(prev => ({ ...prev, [trimester]: false }));
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const checkAllPublications = async () => {
      if (!isMounted) return;
      for (const trim of trimesters) {
        if (!isMounted) return;
        await checkPublication(trim);
      }
    };
    
    checkAllPublications();
    
    return () => {
      isMounted = false;
    };
  }, [classId, schoolYear]);

  const handlePublish = async (trimester: string) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post('https://saintefamilleexcellence.ci/api/report-cards/publish', {
        class_id: classId,
        trimester,
        school_year: schoolYear
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPublishedTrimesters(prev => ({ ...prev, [trimester]: true }));
      setSnackbar({ open: true, message: `Bulletin du ${trimester} publié !`, severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.message || "Erreur lors de la publication.", severity: 'error' });
    }
  };

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
        // Récupérer la classe
        const classRes = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!isMounted) return;
        setClassName(classRes.data.name);
        // Récupérer les élèves de la classe pour l'année scolaire sélectionnée
        const res = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}/students?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) setStudents(res.data);
      } catch (err: any) {
        if (isMounted) setError(err.response?.data?.message || 'Erreur lors du chargement des élèves.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [classId, navigate, schoolYear]);

  useEffect(() => {
    let isMounted = true;
    
    if (!selectedStudent || !isMounted) return;
    
    setTrimestersData(prev => prev.map(t => ({ ...t, loading: true, moyenne: null, matieres: 0, bulletin: [], rang: null, appreciation: '' })));
    const token = localStorage.getItem('token');
    
    Promise.all(trimesters.map(trim =>
      axios.get(`https://saintefamilleexcellence.ci/api/students/${selectedStudent.id}/grades?school_year=${schoolYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        if (!isMounted) return null;
        const notesTrim = res.data.filter((n: any) => n.semester === trim);
        const moy = notesTrim.length ? (notesTrim.map((n: any) => Number(n.moyenne)).filter((m: number) => !isNaN(m)).reduce((a: number, b: number) => a + b, 0) / notesTrim.length) : null;
        return {
          label: trim,
          moyenne: moy,
          matieres: notesTrim.length,
          bulletin: notesTrim,
          rang: notesTrim[0]?.rang || null,
          appreciation: notesTrim[0]?.appreciation || '',
          loading: false,
          show: false,
        };
      })
    )).then(results => {
      if (isMounted) {
        // Filter out null results and map the valid ones
        const validResults = results.filter((t): t is NonNullable<typeof t> => t !== null);
        setTrimestersData(validResults.map((t, i) => ({ 
          ...trimestersData[i], 
          ...t, 
          matieres: Number(t.matieres) || 0, 
          moyenne: t.moyenne !== undefined ? t.moyenne : null, 
          bulletin: Array.isArray(t.bulletin) ? t.bulletin : [] 
        })));
      }
    });
    
    return () => {
      isMounted = false;
    };
  }, [selectedStudent, schoolYear]);

  // Quand on change d'année scolaire, on met à jour l'URL (query string)
  const handleSchoolYearChange = (e: any) => {
    setSchoolYear(e.target.value);
    navigate(`/secretary/report-cards/${classId}?school_year=${e.target.value}`);
  };

  const handleOpenNotesModal = (student: any) => {
    setNotesStudent(student);
    setOpenNotesModal(true);
    fetchStudentNotes(student.id, notesYear, notesTrimester);
  };

  const fetchStudentNotes = async (studentId: number, year: string, trimester: string) => {
    const token = localStorage.getItem('token');
    const res = await axios.get(
      `https://saintefamilleexcellence.ci/api/students/${studentId}/grades?school_year=${year}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setNotes(res.data.filter((n: any) => n.semester === trimester));
  };

  const handleEditNote = (note: any) => {
    setEditNote(note);
    setEditValue(note.moyenne != null ? note.moyenne : note.grade);
    setEditCoeff(note.coefficient || 1);
  };

  const handleSaveEditNote = async () => {
    if (!editNote) return;
    setEditLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`https://saintefamilleexcellence.ci/api/teachers/grades/${editNote.id}`, {
        grade: parseFloat(editValue),
        coefficient: editCoeff,
        subject_id: editNote.subject_id,
        class_id: editNote.class_id,
        semester: editNote.semester,
        academic_year: notesYear
      }, { headers: { Authorization: `Bearer ${token}` } });
      setSnackbar({ open: true, message: 'Note modifiée avec succès', severity: 'success' });
      fetchStudentNotes(notesStudent.id, notesYear, notesTrimester);
      setEditNote(null);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Erreur lors de la modification', severity: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteNote = async (note: any) => {
    if (!window.confirm('Supprimer cette note ?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://saintefamilleexcellence.ci/api/teachers/grades/${note.id}`, { headers: { Authorization: `Bearer ${token}` } });
      setSnackbar({ open: true, message: 'Note supprimée', severity: 'success' });
      fetchStudentNotes(notesStudent.id, notesYear, notesTrimester);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Erreur lors de la suppression', severity: 'error' });
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #f8e1ff 100%)' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 8px 32px rgba(80, 36, 204, 0.10)', background: 'rgba(255,255,255,0.95)' }}>
            <Typography variant="h4" fontWeight={800} sx={{ color: 'primary.main', mb: 3, letterSpacing: 1 }} gutterBottom>
              Gestion des bulletins - <span style={{ color: '#8e24aa' }}>{className}</span> <span style={{ color: '#888', fontSize: 18 }}>({schoolYear})</span>
            </Typography>
            <Box sx={{ mb: 2 }}>
              <FormControl sx={{ minWidth: 160 }} size="small">
                <InputLabel id="school-year-label">Année scolaire</InputLabel>
                <Select
                  labelId="school-year-label"
                  value={schoolYear}
                  label="Année scolaire"
                  onChange={handleSchoolYearChange}
                >
                  {SCHOOL_YEARS.map(year => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} sx={{ mb: 3 }} onClick={() => navigate('/secretary/report-cards')}>
              Retour aux classes
            </Button>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
                <CircularProgress size={40} thickness={5} sx={{ color: 'primary.main' }} />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <Stack spacing={3} direction="column" sx={{ mt: 2 }}>
                {students.map((student) => (
                  <Card
                    key={student.id}
                    elevation={2}
                    sx={{
                      borderRadius: 4,
                      background: 'linear-gradient(90deg, #e3f0ff 60%, #f8e1ff 100%)',
                      boxShadow: '0 4px 16px rgba(80,36,204,0.07)',
                      transition: 'transform 0.18s, box-shadow 0.18s',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px) scale(1.03)',
                        boxShadow: '0 8px 32px rgba(142,36,170,0.13)',
                        background: 'linear-gradient(90deg, #d1c4e9 60%, #b39ddb 100%)',
                      },
                    }}
                    onClick={() => setSelectedStudent({ ...student, classe_name: className })}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <PersonIcon color="primary" sx={{ fontSize: 36 }} />
                        <Box>
                          <Typography variant="h6" fontWeight={700} color="primary.main">
                            {student.last_name} {student.first_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Matricule : {student.registration_number}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={e => { e.stopPropagation(); handleOpenNotesModal(student); }}
                      >
                        Voir les notes
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
            {/* Section d'affichage des trimestres et du bulletin */}
            {selectedStudent && (
              <Box sx={{ mt: 4, mb: 2 }}>
                <Typography variant="h5" fontWeight={700} color="primary.main" gutterBottom>
                  Bulletins de {selectedStudent.last_name} {selectedStudent.first_name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'nowrap', justifyContent: 'center', mb: 2 }}>
                  {trimestersData.map((trim, idx) => (
                    <Paper key={trim.label} sx={{ flex: 1, minWidth: 260, p: 3, borderRadius: 4, boxShadow: 2, borderTop: `6px solid ${trim.color}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" fontWeight={700} color={trim.color}>{trim.label}</Typography>
                        <span style={{ fontSize: 24 }}>{trim.icon}</span>
                      </Box>
                      <Button
                        variant={publishedTrimesters[trim.label] ? "outlined" : "contained"}
                        color={publishedTrimesters[trim.label] ? "success" : "primary"}
                        disabled={publishedTrimesters[trim.label]}
                        onClick={() => handlePublish(trim.label)}
                        sx={{ mb: 1, borderRadius: 2, fontSize: 12, px: 2, py: 0.5, minWidth: 0 }}
                      >
                        {publishedTrimesters[trim.label] ? "Déjà publié" : "Publier le bulletin"}
                      </Button>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Bulletin du {trim.label.toLowerCase()} de l'année scolaire
                      </Typography>
                      <Typography variant="h4" fontWeight={800} color={trim.color} sx={{ mb: 0.5 }}>
                        {trim.loading ? <CircularProgress size={24} /> : (typeof trim.moyenne === 'number' ? trim.moyenne.toFixed(2) : '--')}
                      </Typography>
                      <Typography fontSize={14} color="text.secondary" sx={{ mb: 1 }}>Moyenne générale</Typography>
                      <Box sx={{ bgcolor: `${trim.color}22`, borderRadius: 2, px: 1, py: 0.5, mb: 2, textAlign: 'center' }}>
                        <Typography fontSize={13} color={trim.color}>{trim.matieres} matière{trim.matieres > 1 ? 's' : ''}</Typography>
                      </Box>
                      <Button
                        variant="contained"
                        fullWidth
                        sx={{ bgcolor: trim.color, color: '#fff', fontWeight: 700, mt: 1, borderRadius: 2 }}
                        onClick={() => setOpenTrimester(trim.label)}
                      >
                        CONSULTER LE BULLETIN
                      </Button>
                    </Paper>
                  ))}
                </Box>
                {openTrimester && (
                  <Box sx={{ mt: 3 }}>
                    <BulletinPDF
                      student={selectedStudent}
                      bulletin={trimestersData.find(t => t.label === openTrimester)?.bulletin || []}
                      trimester={openTrimester}
                      rangClasse={trimestersData.find(t => t.label === openTrimester)?.rang || null}
                      appreciation={trimestersData.find(t => t.label === openTrimester)?.appreciation || ''}
                      moyenneClasse={trimestersData.find(t => t.label === openTrimester)?.moyenne || null}
                      showDownloadButton={true}
                      onDownload={handlePrint}
                    />
                    <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setOpenTrimester(null)}>
                      Fermer le bulletin
                    </Button>
                  </Box>
                )}
                {/* Bulletin caché pour impression ciblée */}
                <div style={{ display: 'none' }}>
                  {openTrimester && (
                    <BulletinPDF
                      ref={printRef}
                      student={selectedStudent}
                      bulletin={trimestersData.find(t => t.label === openTrimester)?.bulletin || []}
                      trimester={openTrimester}
                      rangClasse={trimestersData.find(t => t.label === openTrimester)?.rang || null}
                      appreciation={trimestersData.find(t => t.label === openTrimester)?.appreciation || ''}
                      moyenneClasse={trimestersData.find(t => t.label === openTrimester)?.moyenne || null}
                      showDownloadButton={false}
                    />
                  )}
                </div>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setSelectedStudent(null)}>
                  Fermer les bulletins
                </Button>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <MuiAlert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</MuiAlert>
      </Snackbar>
      {/* Modale de gestion des notes */}
      <Dialog open={openNotesModal} onClose={() => setOpenNotesModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Notes de {notesStudent?.last_name} {notesStudent?.first_name}
        </DialogTitle>
        <DialogContent>
          <FormControl sx={{ minWidth: 160, mr: 2, mt: 1 }}>
            <InputLabel>Année scolaire</InputLabel>
            <Select
              value={notesYear}
              label="Année scolaire"
              onChange={e => {
                setNotesYear(e.target.value);
                fetchStudentNotes(notesStudent.id, e.target.value, notesTrimester);
              }}
            >
              {SCHOOL_YEARS.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 160, mt: 1 }}>
            <InputLabel>Trimestre</InputLabel>
            <Select
              value={notesTrimester}
              label="Trimestre"
              onChange={e => {
                setNotesTrimester(e.target.value);
                fetchStudentNotes(notesStudent.id, notesYear, e.target.value);
              }}
            >
              {trimesters.map(trim => (
                <MenuItem key={trim} value={trim}>{trim}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ mt: 2 }}>
            {notes.length === 0 ? (
              <Typography color="text.secondary">Aucune note pour ce trimestre.</Typography>
            ) : (
              notes.map((matiere, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>{matiere.subject_name}</Typography>
                  {Array.isArray(matiere.notes) && matiere.notes.length > 0 ? (
                    matiere.notes.map((n: any, i: number) => (
                      <Paper key={n.id} sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography>
                            Note : <b>{n.grade != null ? Number(n.grade).toFixed(2) : '-'}</b> | Date : {new Date(n.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Box>
                          <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => handleEditNote({ ...n, subject_name: matiere.subject_name, subject_id: matiere.subject_id, class_id: matiere.class_id, semester: matiere.semester })}>Modifier</Button>
                          <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteNote(n)}>Supprimer</Button>
                        </Box>
                      </Paper>
                    ))
                  ) : (
                    <Typography color="text.secondary">Aucune note individuelle.</Typography>
                  )}
                </Box>
              ))
            )}
          </Box>
          {/* Edition d'une note */}
          {editNote && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography fontWeight={700} mb={1}>Modifier la note de {editNote.subject_name}</Typography>
              <TextField
                label="Note"
                type="number"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                sx={{ mr: 2 }}
                inputProps={{ min: 0, max: 20, step: 0.1 }}
              />
              <TextField
                label="Coefficient"
                type="number"
                value={editCoeff}
                onChange={e => setEditCoeff(Number(e.target.value))}
                sx={{ mr: 2 }}
                inputProps={{ min: 1, step: 1 }}
              />
              <Button variant="contained" color="primary" onClick={handleSaveEditNote} disabled={editLoading} sx={{ mr: 1 }}>
                Enregistrer
              </Button>
              <Button variant="outlined" onClick={() => setEditNote(null)} disabled={editLoading}>
                Annuler
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNotesModal(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportCardsStudents; 

