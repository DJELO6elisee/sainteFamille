import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  Fade,
  Zoom,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  School as SchoolIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import SecretarySidebar from '../../components/SecretarySidebar';
import { blue, green, orange, purple } from '@mui/material/colors';
import axios from 'axios';

const Teachers = () => {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any | null>(null);
  const [formData, setFormData] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    subject_ids: string[];
    qualification: string;
    address: string;
    city: string;
    aide_first_name: string;
    aide_last_name: string;
    aide_contact: string;
  }>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    subject_ids: [],
    qualification: '',
    address: '',
    city: '',
    aide_first_name: '',
    aide_last_name: '',
    aide_contact: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [teacherView, setTeacherView] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [absencesLoading, setAbsencesLoading] = useState(false);
  const [teacherAbsencesView, setTeacherAbsencesView] = useState<any[]>([]);
  const [showAllAbsencesView, setShowAllAbsencesView] = useState(false);
  const [absencesModalOpen, setAbsencesModalOpen] = useState(false);
  const [selectedTeacherForAbsences, setSelectedTeacherForAbsences] = useState<any | null>(null);
  const [teacherAbsences, setTeacherAbsences] = useState<any[]>([]);
  const [showAllAbsences, setShowAllAbsences] = useState(false);
  const [savingAbsence, setSavingAbsence] = useState(false);
  const [absenceForm, setAbsenceForm] = useState({
    date: '',
    status: 'unexcused',
    duration_hours: 1,
    days: '' as any,
    reason: ''
  });
  const tableRef = useRef<HTMLDivElement>(null);

  const formatDate = (value: any) => {
    try {
      if (!value) return '-';
      // Si c'est une chaîne de type YYYY-MM-DD..., on reformate sans décalage
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        const y = value.slice(0, 4);
        const m = value.slice(5, 7);
        const d = value.slice(8, 10);
        return `${d}/${m}/${y}`;
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
    } catch {
      return String(value);
    }
  };

  const toInt = (val: any) => {
    const n = Number(val);
    return isNaN(n) ? 0 : Math.round(n);
  };

  const hoursToDaysInt = (hours: any) => {
    return toInt(Number(hours) / 8);
  };

  const qualifications = [
    'Licence',
    'Master',
    'Doctorat',
    'CAPES',
    'Agrégation',
    'Certification',
    'Autre',
  ];

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://saintefamilleexcellence.ci/api/teachers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des professeurs');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://saintefamilleexcellence.ci/api/subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjects(res.data);
    } catch (err) {
      console.error("Erreur lors du chargement des matières", err);
      setError('Erreur lors du chargement des matières. Assurez-vous d\'être connecté.');
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(res.data);
    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      await fetchTeachers();
      await fetchSubjects();
      await fetchClasses();
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [fetchTeachers, fetchSubjects, fetchClasses]);

  const filteredTeachers = teachers.filter((teacher) =>
    (teacher.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.subject_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddTeacher = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      subject_ids: [],
      qualification: '',
      address: '',
      city: '',
      aide_first_name: '',
      aide_last_name: '',
      aide_contact: '',
    });
    setAddModalOpen(true);
  };

  const handleEditTeacher = (teacher: any) => {
    setSelectedTeacher(teacher);
    setFormData({
      first_name: teacher.first_name || '',
      last_name: teacher.last_name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      subject_ids: teacher.subjects ? teacher.subjects.map((s: any) => String(s.id)) : [],
      qualification: teacher.qualification || '',
      address: teacher.address || '',
      city: teacher.city || '',
      aide_first_name: teacher.aide_first_name || '',
      aide_last_name: teacher.aide_last_name || '',
      aide_contact: teacher.aide_contact || '',
    });
    setEditModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('Veuillez remplir les champs obligatoires (Nom, Prénoms, Email)');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const dataToSend = {
        ...formData,
        subject_ids: formData.subject_ids.map((id: string) => Number(id)),
      };
      if (editModalOpen && selectedTeacher) {
        await axios.put(`https://saintefamilleexcellence.ci/api/teachers/${selectedTeacher.id}`, dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('https://saintefamilleexcellence.ci/api/teachers', dataToSend, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setAddModalOpen(false);
      setEditModalOpen(false);
      setSelectedTeacher(null);
      fetchTeachers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTeacher = async (teacherId: number) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce professeur ?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`https://saintefamilleexcellence.ci/api/teachers/${teacherId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchTeachers();
      } catch (err) {
        alert('Erreur lors de la suppression');
      }
    }
  };

  const openViewTeacher = useCallback(async (teacher: any) => {
    setViewModalOpen(true);
    setLoadingDetails(true);
    setAbsencesLoading(true);
    setTeacherAbsencesView([]);
    setShowAllAbsencesView(false);
    try {
      const token = localStorage.getItem('token');
      const [resTeacher, resAbsences] = await Promise.all([
        axios.get(`https://saintefamilleexcellence.ci/api/teachers/${teacher.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`https://saintefamilleexcellence.ci/api/teacher-absences/teacher/${teacher.id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setTeacherView(resTeacher.data);
      setTeacherAbsencesView(resAbsences.data || []);
    } catch (err) {
      // Fallback: afficher au moins les infos de la ligne
      setTeacherView(teacher);
    } finally {
      setLoadingDetails(false);
      setAbsencesLoading(false);
    }
  }, []);

  const fetchTeacherAbsences = useCallback(async (teacherId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`https://saintefamilleexcellence.ci/api/teacher-absences/teacher/${teacherId}` , {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeacherAbsences(res.data);
    } catch (err) {
      // ignore for now
    }
  }, []);

  const openAbsences = async (teacher: any) => {
    setSelectedTeacherForAbsences(teacher);
    setAbsencesModalOpen(true);
    setShowAllAbsences(false);
    await fetchTeacherAbsences(teacher.id);
  };

  const handleCreateTeacherAbsence = async () => {
    if (!selectedTeacherForAbsences || !absenceForm.date) {
      alert('La date est obligatoire.');
      return;
    }
    try {
      setSavingAbsence(true);
      const token = localStorage.getItem('token');
      const hasDays = absenceForm.days !== '' && !isNaN(Number(absenceForm.days)) && Number(absenceForm.days) > 0;
      const durationHoursToSend = hasDays ? Number(absenceForm.days) * 8 : (Number(absenceForm.duration_hours) || 1);
      await axios.post('https://saintefamilleexcellence.ci/api/teacher-absences', {
        teacher_id: selectedTeacherForAbsences.id,
        date: absenceForm.date,
        status: absenceForm.status,
        duration_hours: durationHoursToSend,
        reason: absenceForm.reason || null,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // reset minimal
      setAbsenceForm({ ...absenceForm, reason: '', days: '' });
      await fetchTeacherAbsences(selectedTeacherForAbsences.id);
    } catch (err: any) {
      alert(err.response?.data?.message || "Erreur lors de l'enregistrement de l'absence");
    } finally {
      setSavingAbsence(false);
    }
  };

  const handleDeleteTeacherAbsence = async (id: number) => {
    if (!window.confirm('Supprimer cette absence ?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://saintefamilleexcellence.ci/api/teacher-absences/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedTeacherForAbsences) await fetchTeacherAbsences(selectedTeacherForAbsences.id);
    } catch (err) {
      alert('Erreur lors de la suppression');
    }
  };

  const handlePrint = () => {
    if (tableRef.current) {
      const printContents = tableRef.current.innerHTML;
      const printWindow = window.open('', '', 'height=600,width=900');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Liste des professeurs</title>');
        printWindow.document.write('<style>body{font-family:sans-serif;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} th{background:#1976d2;color:#fff;} </style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<h2>Liste des professeurs</h2>');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%)' }}>
      <SecretarySidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
              <Typography variant="h4" component="h1" sx={{ 
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Gestion des Enseignants
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddTeacher}
                sx={{
                  background: `linear-gradient(45deg, ${green[500]} 30%, ${green[700]} 90%)`,
                  color: 'white',
                  '&:hover': {
                    background: `linear-gradient(45deg, ${green[600]} 30%, ${green[800]} 90%)`,
                  },
                  px: 3,
                  py: 1,
                }}
              >
                Nouveau Enseignant
              </Button>
              <Button
                variant="contained"
                startIcon={<PrintIcon />}
                onClick={handlePrint}
                sx={{
                  background: `linear-gradient(45deg, ${blue[500]} 30%, ${blue[700]} 90%)`,
                  color: 'white',
                  '&:hover': {
                    background: `linear-gradient(45deg, ${blue[600]} 30%, ${blue[800]} 90%)`,
                  },
                  px: 3,
                  py: 1,
                }}
              >
                Imprimer
              </Button>
            </Box>
          </Box>

          <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Rechercher un professeur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
            </CardContent>
          </Card>

          <div ref={tableRef}>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)` }}>
                      <TableCell sx={{ color: 'white', fontWeight: 600, width: '60px' }}>N°</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Nom</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Prénoms</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Email</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Téléphone</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Matière</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Qualification</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Classes</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Aide Enseignant</TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={11} align="center">Chargement...</TableCell>
                      </TableRow>
                    )}
                    {error && (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ color: 'error.main' }}>{error}</TableCell>
                      </TableRow>
                    )}
                    {filteredTeachers.length === 0 && !loading && !error && (
                      <TableRow>
                        <TableCell colSpan={11} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            Aucun enseignant trouvé
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredTeachers
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((teacher, index) => {
                        const rowNumber = page * rowsPerPage + index + 1;
                        return (
                        <Zoom in={true} style={{ transitionDelay: `${index * 50}ms` }} key={teacher.id}>
                          <TableRow 
                            hover 
                            sx={{ 
                              '&:hover': { 
                                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                cursor: 'pointer',
                              },
                            }}
                          >
                            <TableCell sx={{ fontWeight: 600, color: theme.palette.primary.main }}>{rowNumber}</TableCell>
                            <TableCell>{teacher.last_name}</TableCell>
                            <TableCell>{teacher.first_name}</TableCell>
                            <TableCell>{teacher.email}</TableCell>
                            <TableCell>{teacher.phone}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {teacher.subjects.map((s: any) => (
                                  <Chip key={s.id} label={s.name} size="small" />
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell>{teacher.qualification}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(teacher.classes || []).map((c: any) => (
                                  <Chip key={c.id} label={c.name} size="small" color="info" />
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {teacher.aide_first_name && teacher.aide_last_name ? (
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {teacher.aide_first_name} {teacher.aide_last_name}
                                  </Typography>
                                  {teacher.aide_contact && (
                                    <Typography variant="caption" color="text.secondary">
                                      {teacher.aide_contact}
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  Aucun aide
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                <Tooltip title="Gérer les absences">
                                  <IconButton color="secondary" size="small" onClick={() => openAbsences(teacher)}>
                                    <PersonIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Voir détails">
                                  <IconButton color="primary" size="small" onClick={() => openViewTeacher(teacher)}>
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Modifier">
                                  <IconButton color="primary" size="small" onClick={() => handleEditTeacher(teacher)}>
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Supprimer">
                                  <IconButton color="error" size="small" onClick={() => handleDeleteTeacher(teacher.id)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        </Zoom>
                      );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.grey[50] }}>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={filteredTeachers.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage="Enseignants par page:"
                  labelDisplayedRows={({ from, to, count }) => 
                    `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
                  }
                  sx={{
                    '.MuiTablePagination-select': {
                      borderRadius: 1,
                    },
                    '.MuiTablePagination-selectIcon': {
                      color: theme.palette.primary.main,
                    },
                    '.MuiTablePagination-toolbar': {
                      px: 2,
                    },
                  }}
                />
              </Box>
            </Paper>
          </div>

          {/* Modal d'ajout/édition */}
          <Dialog open={addModalOpen || editModalOpen} onClose={() => { setAddModalOpen(false); setEditModalOpen(false); }} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${theme.palette.divider}`}}>
              <PersonIcon color="primary" />
              {editModalOpen ? 'Modifier les informations du Enseignant' : 'Inscrire un nouveau Enseignant'}
            </DialogTitle>
            <DialogContent sx={{ background: theme.palette.grey[50], pt: '20px !important' }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Prénoms"
                    required
                    fullWidth
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Nom"
                    required
                    fullWidth
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    required
                    type="email"
                    fullWidth
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Téléphone"
                    fullWidth
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Matière(s) enseignée(s)</InputLabel>
                    <Select
                      multiple
                      value={formData.subject_ids}
                      label="Matière(s) enseignée(s)"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          subject_ids: e.target.value as string[],
                        })
                      }
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {(selected as string[]).map((id) => {
                            const subj = subjects.find((s) => String(s.id) === id);
                            return subj ? <Chip key={id} label={subj.name} size="small" /> : null;
                          })}
                        </Box>
                      )}
                    >
                      {subjects.map((s) => (
                        <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Plus haute qualification</InputLabel>
                    <Select
                      value={formData.qualification}
                      label="Plus haute qualification"
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    >
                      {qualifications.map((qual) => (
                        <MenuItem key={qual} value={qual}>{qual}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                 <Grid item xs={12} sm={6}>
                  <TextField
                    label="Ville"
                    fullWidth
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Adresse"
                    fullWidth
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </Grid>
                
                {/* Section Aide Enseignant */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1, color: theme.palette.primary.main, borderBottom: `2px solid ${theme.palette.primary.main}`, pb: 0.5 }}>
                    Aide Enseignant
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Prénoms de l'aide"
                    fullWidth
                    value={formData.aide_first_name}
                    onChange={(e) => setFormData({ ...formData, aide_first_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Nom de l'aide"
                    fullWidth
                    value={formData.aide_last_name}
                    onChange={(e) => setFormData({ ...formData, aide_last_name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Contact de l'aide"
                    fullWidth
                    value={formData.aide_contact}
                    onChange={(e) => setFormData({ ...formData, aide_contact: e.target.value })}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px', borderTop: `1px solid ${theme.palette.divider}`}}>
              <Button onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }} color="secondary">
                Annuler
              </Button>
              <Button onClick={handleSubmit} color="primary" variant="contained" disabled={submitting} startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}>
                {submitting ? 'Enregistrement...' : (editModalOpen ? 'Enregistrer les modifications' : 'Ajouter l\'enseignant')}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Modal détails enseignant */}
          <Dialog open={viewModalOpen} onClose={() => { setViewModalOpen(false); setTeacherView(null); setTeacherAbsencesView([]); }} maxWidth="md" fullWidth>
            <DialogTitle>Détails de l'enseignant</DialogTitle>
            <DialogContent dividers>
              {loadingDetails ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress />
                </Box>
              ) : teacherView ? (
                <Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="h6">{teacherView.first_name} {teacherView.last_name}</Typography>
                      <Typography variant="body2" color="text.secondary">{teacherView.email} {teacherView.phone ? `• ${teacherView.phone}` : ''}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Matières</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {(teacherView.subjects || []).length === 0 ? (
                          <Typography variant="body2" color="text.secondary">Aucune</Typography>
                        ) : (
                          (teacherView.subjects || []).map((s: any) => <Chip key={s.id} label={s.name} size="small" />)
                        )}
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">Classes</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {(teacherView.classes || []).length === 0 ? (
                          <Typography variant="body2" color="text.secondary">Aucune</Typography>
                        ) : (
                          (teacherView.classes || []).map((c: any) => <Chip key={c.id} label={c.name} size="small" color="info" />)
                        )}
                      </Box>
                    </Grid>
                    {(teacherView.address || teacherView.city) && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">Adresse</Typography>
                        <Typography variant="body2" color="text.secondary">{teacherView.address || '-'} {teacherView.city ? `(${teacherView.city})` : ''}</Typography>
                      </Grid>
                    )}
                    {(teacherView.aide_first_name || teacherView.aide_last_name) && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">Aide enseignant</Typography>
                        <Typography variant="body2" color="text.secondary">{teacherView.aide_first_name} {teacherView.aide_last_name} {teacherView.aide_contact ? `• ${teacherView.aide_contact}` : ''}</Typography>
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="h6">Historique des absences</Typography>
                        {absencesLoading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                            <CircularProgress size={22} />
                          </Box>
                        ) : (
                          <>
                            <Box sx={{ display: 'flex', gap: 2, my: 1, flexWrap: 'wrap' }}>
                              <Chip label={`Total heures: ${toInt(teacherAbsencesView.reduce((s, a) => s + Number(a.duration_hours || 0), 0))}`} />
                              <Chip label={`Total jours (8h/j): ${toInt(teacherAbsencesView.reduce((s, a) => s + Number(a.duration_hours || 0), 0) / 8)}`} />
                            </Box>
                            <TableContainer component={Paper}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Statut</TableCell>
                                    <TableCell>Durée (h)</TableCell>
                                    <TableCell>Jour</TableCell>
                                    <TableCell>Motif</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {teacherAbsencesView.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={5} align="center">Aucune absence</TableCell>
                                    </TableRow>
                                  ) : (showAllAbsencesView ? teacherAbsencesView : teacherAbsencesView.slice(0, 4)).map((a) => (
                                    <TableRow key={a.id}>
                                      <TableCell>{formatDate(a.date)}</TableCell>
                                      <TableCell>{a.status === 'excused' ? 'Justifiée' : 'Non justifiée'}</TableCell>
                                      <TableCell>{toInt(a.duration_hours)}</TableCell>
                                      <TableCell>{hoursToDaysInt(a.duration_hours)}</TableCell>
                                      <TableCell>
                                        <Typography noWrap title={a.reason || ''}>{a.reason || '-'}</Typography>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                            {teacherAbsencesView.length > 4 && (
                              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                                <Button size="small" onClick={() => setShowAllAbsencesView((v) => !v)}>
                                  {showAllAbsencesView ? 'Voir moins' : 'Voir plus'}
                                </Button>
                              </Box>
                            )}
                          </>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Typography>Aucune donnée</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setViewModalOpen(false); setTeacherView(null); }}>Fermer</Button>
            </DialogActions>
          </Dialog>

          {/* Modal gestion des absences enseignants */}
          <Dialog open={absencesModalOpen} onClose={() => { setAbsencesModalOpen(false); setSelectedTeacherForAbsences(null); }} maxWidth="md" fullWidth>
            <DialogTitle>
              Gérer les absences {selectedTeacherForAbsences ? `- ${selectedTeacherForAbsences.first_name} ${selectedTeacherForAbsences.last_name}` : ''}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    value={absenceForm.date}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, date: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Statut</InputLabel>
                    <Select
                      label="Statut"
                      value={absenceForm.status}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, status: e.target.value as 'excused' | 'unexcused' })}
                    >
                      <MenuItem value="excused">Justifiée</MenuItem>
                      <MenuItem value="unexcused">Non justifiée</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Durée (heures)"
                    type="number"
                    fullWidth
                    inputProps={{ step: 0.5, min: 0.5 }}
                    value={absenceForm.days !== '' ? '' : absenceForm.duration_hours}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, duration_hours: Number(e.target.value), days: '' })}
                    disabled={absenceForm.days !== ''}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Durée (jours)"
                    type="number"
                    fullWidth
                    inputProps={{ step: 0.5, min: 0.5 }}
                    value={absenceForm.days}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, days: e.target.value })}
                    helperText="1 jour = 8 heures (si renseigné, remplace les heures)"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Motif (optionnel)"
                    fullWidth
                    multiline
                    minRows={2}
                    value={absenceForm.reason}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" onClick={handleCreateTeacherAbsence} disabled={savingAbsence}>
                      {savingAbsence ? 'Enregistrement...' : 'Ajouter l\'absence'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', gap: 2, my: 1, flexWrap: 'wrap' }}>
                <Chip label={`Total heures: ${toInt(teacherAbsences.reduce((s, a) => s + Number(a.duration_hours || 0), 0))}`} />
                <Chip label={`Total jours (8h/j): ${toInt(teacherAbsences.reduce((s, a) => s + Number(a.duration_hours || 0), 0) / 8)}`} />
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Durée (h)</TableCell>
                      <TableCell>Jour</TableCell>
                      <TableCell>Motif</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teacherAbsences.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">Aucune absence</TableCell>
                      </TableRow>
                    ) : (showAllAbsences ? teacherAbsences : teacherAbsences.slice(0, 4)).map((a) => (
                      <TableRow key={a.id}>
                                      <TableCell>{formatDate(a.date)}</TableCell>
                        <TableCell>{a.status === 'excused' ? 'Justifiée' : 'Non justifiée'}</TableCell>
                        <TableCell>{toInt(a.duration_hours)}</TableCell>
                        <TableCell>{hoursToDaysInt(a.duration_hours)}</TableCell>
                        <TableCell sx={{ maxWidth: 250 }}>
                          <Typography noWrap title={a.reason || ''}>{a.reason || '-'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton color="error" size="small" onClick={() => handleDeleteTeacherAbsence(a.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {teacherAbsences.length > 4 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <Button size="small" onClick={() => setShowAllAbsences((v) => !v)}>
                    {showAllAbsences ? 'Voir moins' : 'Voir plus'}
                  </Button>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setAbsencesModalOpen(false); setSelectedTeacherForAbsences(null); }}>Fermer</Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </Box>
  );
};

export default Teachers; 

