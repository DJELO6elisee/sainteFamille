import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Button, TextField, InputAdornment, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Alert, Card,
  CardContent, Grid, useTheme, Tooltip, Zoom, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Print as PrintIcon, LibraryBooks as LibraryBooksIcon,
} from '@mui/icons-material';
import SecretarySidebar from '../../components/SecretarySidebar';
import { blue, green } from '@mui/material/colors';
import axios from 'axios';

const Subjects = () => {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [subjectTypes, setSubjectTypes] = useState<any[]>([]);
  const [levelGroups, setLevelGroups] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    level_groups: 'all',
  });
  const [submitting, setSubmitting] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('https://saintefamilleexcellence.ci/api/subjects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjects(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des matières');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      await fetchSubjects();
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [fetchSubjects]);

  const filteredSubjects = subjects.filter((subject) =>
    (subject.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenModal = (subject: any = null) => {
    if (subject) {
      setIsEditMode(true);
      setSelectedSubject(subject);
      setFormData({
        name: subject.name || '',
        type: subject.type || '',
        level_groups: subject.level_groups || 'all',
      });
    } else {
      setIsEditMode(false);
      setSelectedSubject(null);
      setFormData({ name: '', type: '', level_groups: 'all' });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('Le nom de la matière est obligatoire.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      if (isEditMode && selectedSubject) {
        await axios.put(`https://saintefamilleexcellence.ci/api/subjects/${selectedSubject.id}`, formData, config);
      } else {
        await axios.post('https://saintefamilleexcellence.ci/api/subjects', formData, config);
      }
      
      handleCloseModal();
      fetchSubjects();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (subjectId: number) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette matière ? Cette action est irréversible.')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`https://saintefamilleexcellence.ci/api/subjects/${subjectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchSubjects();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Erreur lors de la suppression. Vérifiez si la matière n\'est pas déjà utilisée.');
      }
    }
  };

  const handlePrint = () => {
    if (tableRef.current) {
      const printContents = tableRef.current.innerHTML;
      const printWindow = window.open('', '', 'height=600,width=900');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Liste des Matières</title>');
        printWindow.document.write('<style>body{font-family:sans-serif;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ccc;padding:8px;text-align:left;} th{background:#1976d2;color:#fff;} </style>');
        printWindow.document.write('</head><body><h2>Liste des Matières</h2>');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%)' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LibraryBooksIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
              <Typography variant="h4" component="h1" sx={{ 
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Gestion des Matières
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained" color="primary" startIcon={<AddIcon />}
                onClick={() => handleOpenModal()}
                sx={{
                  background: `linear-gradient(45deg, ${green[500]} 30%, ${green[700]} 90%)`,
                  color: 'white', '&:hover': { background: `linear-gradient(45deg, ${green[600]} 30%, ${green[800]} 90%)` },
                  px: 3, py: 1,
                }}
              >
                Nouvelle Matière
              </Button>
              <Button
                variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}
                sx={{
                  background: `linear-gradient(45deg, ${blue[500]} 30%, ${blue[700]} 90%)`,
                  color: 'white', '&:hover': { background: `linear-gradient(45deg, ${blue[600]} 30%, ${blue[800]} 90%)` },
                  px: 3, py: 1,
                }}
              >
                Imprimer
              </Button>
            </Box>
          </Box>

          <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <TextField
                fullWidth variant="outlined" placeholder="Rechercher une matière..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>
                  ),
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
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Nom</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Type</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Niveau</TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading && <TableRow><TableCell colSpan={4} align="center">Chargement...</TableCell></TableRow>}
                    {error && <TableRow><TableCell colSpan={4} align="center" sx={{ color: 'error.main' }}>{error}</TableCell></TableRow>}
                    {filteredSubjects.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((subject, index) => (
                      <Zoom in={true} style={{ transitionDelay: `${index * 50}ms` }} key={subject.id}>
                        <TableRow hover>
                          <TableCell sx={{ fontWeight: 500 }}>{subject.name}</TableCell>
                          <TableCell sx={{ 
                            color: subject.type === 'francais' ? '#1976d2' : 
                                   subject.type === 'mathematiques' ? '#d32f2f' : 
                                   subject.type === 'aem' ? '#388e3c' : 
                                   subject.type === 'langues' ? '#f57c00' : 
                                   subject.type === 'autres' ? '#7b1fa2' : '#666',
                            fontWeight: 500
                          }}>
                            {subject.type === 'francais' ? 'Français' : 
                             subject.type === 'mathematiques' ? 'Mathématiques' : 
                             subject.type === 'aem' ? 'AEM' : 
                             subject.type === 'langues' ? 'Langues' : 
                             subject.type === 'autres' ? 'Autres' : 
                             subject.type || 'Non défini'}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ 
                              display: 'inline-block',
                              px: 1.5, 
                              py: 0.5, 
                              borderRadius: 1, 
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              backgroundColor: subject.level_groups === 'cp1_cp2' ? '#e3f2fd' : 
                                             subject.level_groups === 'ce1_cm2' ? '#f3e5f5' : '#e8f5e8',
                              color: subject.level_groups === 'cp1_cp2' ? '#1976d2' : 
                                     subject.level_groups === 'ce1_cm2' ? '#7b1fa2' : '#388e3c'
                            }}>
                              {subject.level_groups === 'cp1_cp2' ? 'CP1-CP2' : 
                               subject.level_groups === 'ce1_cm2' ? 'CE1-CM2' : 
                               'Tous niveaux'}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                              <Tooltip title="Modifier">
                                <IconButton color="primary" size="small" onClick={() => handleOpenModal(subject)}><EditIcon /></IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer">
                                <IconButton color="error" size="small" onClick={() => handleDeleteSubject(subject.id)}><DeleteIcon /></IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      </Zoom>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredSubjects.length}
                rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          </div>

          <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: `1px solid ${theme.palette.divider}`}}>
              <LibraryBooksIcon color="primary" />
              {isEditMode ? 'Modifier la matière' : 'Ajouter une nouvelle matière'}
            </DialogTitle>
            <DialogContent sx={{ background: theme.palette.grey[50], pt: '20px !important' }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField 
                    label="Nom de la matière" 
                    required 
                    fullWidth 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Type de matière</InputLabel>
                    <Select
                      value={formData.type}
                      label="Type de matière"
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <MenuItem value="">..........</MenuItem>
                      <MenuItem value="francais">Français</MenuItem>
                      <MenuItem value="mathematiques">Mathématiques</MenuItem>
                      <MenuItem value="aem">AEM (Activités d'Éveil et de Mémorisation)</MenuItem>
                      <MenuItem value="langues">Langues</MenuItem>
                      <MenuItem value="autres">Autres</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Niveau scolaire</InputLabel>
                    <Select
                      value={formData.level_groups}
                      label="Niveau scolaire"
                      onChange={(e) => setFormData({ ...formData, level_groups: e.target.value })}
                    >
                      <MenuItem value="all">Tous niveaux</MenuItem>
                      <MenuItem value="cp1_cp2">CP1-CP2 uniquement</MenuItem>
                      <MenuItem value="ce1_cm2">CE1-CM2 uniquement</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: '16px 24px', borderTop: `1px solid ${theme.palette.divider}`}}>
              <Button onClick={handleCloseModal} color="secondary">Annuler</Button>
              <Button onClick={handleSubmit} color="primary" variant="contained" disabled={submitting} startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}>
                {submitting ? 'Enregistrement...' : (isEditMode ? 'Enregistrer' : 'Ajouter')}
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </Box>
  );
};

export default Subjects; 

