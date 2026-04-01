import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import SecretarySidebar from '../../components/SecretarySidebar';
import axios from 'axios';

// Fonction pour obtenir l'année scolaire courante
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

// Fonction pour générer les années scolaires disponibles
function getSchoolYears(count = 5) {
  const current = getCurrentSchoolYear();
  const startYear = parseInt(current.split('-')[0], 10);
  return Array.from({ length: count }, (_, i) => {
    const start = startYear - i;
    return `${start}-${start + 1}`;
  }).reverse();
}

const Classes = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [educationLevels, setEducationLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [newClass, setNewClass] = useState({
    name: '',
    education_level_id: '',
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editClass, setEditClass] = useState<any | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' | 'info' });
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        
        // Récupérer les classes
        const classesRes = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
          headers: { Authorization: `Bearer ${token}` },
          params: { school_year: schoolYear }
        });
        
        // Récupérer les niveaux d'études
        const levelsRes = await axios.get('https://saintefamilleexcellence.ci/api/education-levels', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (isMounted) {
          console.log('📚 [Classes] Données reçues du serveur:', classesRes.data);
          console.log('📚 [Classes] Année scolaire demandée:', schoolYear);
          
          // Normaliser les données des classes
          const normalized = classesRes.data.map((c: any) => ({ 
            ...c, 
            id: c.id || c._id,
            // S'assurer que les propriétés essentielles existent
            name: c.name || c.nom || '',
            level: c.level_name || c.level || c.niveau || '',
            niveau: c.level_name || c.level || c.niveau || '',
            students_count: c.students_count || 0
          }));
          
          console.log('📚 [Classes] Classes normalisées:', normalized);
          setClasses(normalized);
          setEducationLevels(levelsRes.data.data || levelsRes.data);
        }
      } catch (err: any) {
        if (isMounted) setError(err.response?.data?.message || 'Erreur lors du chargement des données');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [schoolYear]);


  const filteredClasses = classes.filter((classe) => {
    const nom = classe.nom || classe.name || '';
    const niveau = classe.niveau || classe.level || '';
    return (
      nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      niveau.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Ajout d'une classe
  const handleAddClass = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('https://saintefamilleexcellence.ci/api/classes', {
        name: newClass.name,
        education_level_id: newClass.education_level_id,
        school_year: schoolYear,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Recharge la liste
      const res = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: schoolYear }
      });
      setClasses(res.data);
      setOpen(false);
      setNewClass({ name: '', education_level_id: '' });
      setSnackbar({ open: true, message: 'Classe ajoutée avec succès', severity: 'success' });
    } catch (err: any) {
      console.error("Erreur lors de l'ajout de la classe :", err, err?.response);
      setSnackbar({ open: true, message: err.response?.data?.message || "Erreur lors de l'ajout de la classe", severity: 'error' });
    }
  };

  // Suppression
  const handleDelete = async (id: number | string) => {
    if (!id) {
      console.error('Impossible de supprimer : id manquant');
      setSnackbar({ open: true, message: 'ID de classe manquant', severity: 'error' });
      return;
    }
    
    if (window.confirm('Voulez-vous vraiment supprimer cette classe ?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`https://saintefamilleexcellence.ci/api/classes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Si la suppression réussit, mettre à jour la liste
        setClasses(classes.filter(c => c.id !== id));
        setSnackbar({ open: true, message: response.data.message || 'Classe supprimée avec succès', severity: 'success' });
      } catch (err: any) {
        console.error('Erreur lors de la suppression de la classe :', err, err?.response);
        
        let errorMessage = 'Erreur lors de la suppression';
        
        if (err.response) {
          switch (err.response.status) {
            case 400:
              errorMessage = err.response.data.message || 'Impossible de supprimer cette classe : elle est utilisée';
              break;
            case 404:
              errorMessage = 'Classe non trouvée';
              break;
            case 403:
              errorMessage = 'Vous n\'avez pas les permissions pour supprimer cette classe';
              break;
            default:
              errorMessage = err.response.data.message || 'Erreur serveur lors de la suppression';
          }
        } else if (err.request) {
          errorMessage = 'Erreur de connexion au serveur';
        }
        
        setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      }
    }
  };

  // Edition
  const handleEditOpen = (classe: any) => {
    if (!classe.id) {
      console.error('Impossible de modifier : id manquant', classe);
      setSnackbar({ open: true, message: 'Erreur : ID de classe manquant', severity: 'error' });
      return;
    }
    setEditClass({
      ...classe,
      name: classe.nom || classe.name || '',
      education_level_id: classe.education_level_id || '',
    });
    setEditOpen(true);
  };
  const handleEditClose = () => {
    setEditOpen(false);
    setEditClass(null);
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string, value: any } }) => {
    setEditClass((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };
  const handleEditSubmit = async () => {
    if (!editClass) {
      setSnackbar({ open: true, message: 'Aucune classe sélectionnée', severity: 'error' });
      return;
    }

    // Validation des champs obligatoires
    if (!editClass.name || !editClass.education_level_id) {
      setSnackbar({ open: true, message: 'Veuillez remplir tous les champs obligatoires', severity: 'error' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const response = await axios.put(`https://saintefamilleexcellence.ci/api/classes/${editClass.id}`, {
        name: editClass.name,
        education_level_id: editClass.education_level_id,
        school_year: schoolYear,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Recharge la liste avec les paramètres actuels
      const res = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: schoolYear }
      });
      
      setClasses(res.data);
      setEditOpen(false);
      setEditClass(null);
      setSnackbar({ open: true, message: 'Classe modifiée avec succès', severity: 'success' });
    } catch (err: any) {
      console.error('Erreur lors de la modification de la classe :', err, err?.response);
      
      let errorMessage = 'Erreur lors de la modification';
      
      if (err.response) {
        switch (err.response.status) {
          case 400:
            errorMessage = err.response.data.message || 'Données invalides';
            break;
          case 404:
            errorMessage = 'Classe non trouvée';
            break;
          case 403:
            errorMessage = 'Vous n\'avez pas les permissions pour modifier cette classe';
            break;
          default:
            errorMessage = err.response.data.message || 'Erreur serveur lors de la modification';
        }
      } else if (err.request) {
        errorMessage = 'Erreur de connexion au serveur';
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };


  console.log(classes);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4" component="h1">
              Gestion des Classes
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setOpen(true)}
            >
              Nouvelle Classe
            </Button>
          </Box>

          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Année scolaire :</Typography>
            <FormControl size="small">
              <Select value={schoolYear} onChange={e => setSchoolYear(e.target.value)}>
                {getSchoolYears(5).map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Rechercher une classe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Grid container spacing={3}>
            {loading && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>Chargement...</Paper>
              </Grid>
            )}
            {error && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center', color: 'red' }}>{error}</Paper>
              </Grid>
            )}
            {filteredClasses.map((classe) => {
              console.log('Classe affichée:', classe);
              return (
                <Grid item xs={12} md={6} lg={4} key={classe.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <SchoolIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                        <Box>
                          <Typography variant="h5" component="div">
                            {classe.nom || classe.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Niveau: {classe.niveau || classe.level}
                          </Typography>
                        </Box>
                      </Box>

                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Effectif"
                            secondary={`${classe.students_count || 0} élèves`}
                          />
                        </ListItem>
                        {(() => {
                          const level = educationLevels.find(l => l.id === classe.education_level_id);
                          return level ? (
                            <>
                              <ListItem>
                                <ListItemText
                                  primary="Scolarité"
                                  secondary={`${Number(level.tuition_amount).toLocaleString('fr-FR')} F CFA`}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemText
                                  primary="Frais d'inscription"
                                  secondary={`${Number(level.registration_fee).toLocaleString('fr-FR')} F CFA`}
                                />
                              </ListItem>
                              <ListItem>
                                <ListItemText
                                  primary="Cantine"
                                  secondary={`${Number(level.cantine_amount).toLocaleString('fr-FR')} F CFA`}
                                />
                              </ListItem>
                            </>
                          ) : null;
                        })()}
                      </List>

                      <Box sx={{ mt: 2 }}>
                        <Chip
                          label={classe.statut || 'Active'}
                          color="success"
                          size="small"
                        />
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                      <Button 
                        size="small" 
                        variant="outlined"
                        startIcon={<EditIcon />} 
                        onClick={() => handleEditOpen(classe)}
                        sx={{ minWidth: 100 }}
                      >
                        Modifier
                      </Button>
                      <Button 
                        size="small" 
                        variant="outlined"
                        color="error" 
                        startIcon={<DeleteIcon />} 
                        onClick={() => handleDelete(classe.id)}
                        sx={{ minWidth: 100 }}
                      >
                        Supprimer
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Container>
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Ajouter une nouvelle classe</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Nom de la classe"
              fullWidth
              value={newClass.name}
              onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
              name="name"
              placeholder="Ex: 6ème A, 5ème B"
              helperText="Nom de la classe"
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="niveau-label">Niveau d'études *</InputLabel>
              <Select
                labelId="niveau-label"
                value={newClass.education_level_id}
                label="Niveau d'études *"
                onChange={(e) => setNewClass({ ...newClass, education_level_id: e.target.value })}
                name="education_level_id"
              >
                {educationLevels.map((level) => (
                  <MenuItem key={level.id} value={level.id}>
                    {level.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {newClass.education_level_id && (() => {
              const selectedLevel = educationLevels.find(l => l.id === newClass.education_level_id);
              return selectedLevel ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Informations du niveau :</strong><br/>
                    Scolarité: {Number(selectedLevel.tuition_amount).toLocaleString('fr-FR')} F CFA<br/>
                    Frais d'inscription: {Number(selectedLevel.registration_fee).toLocaleString('fr-FR')} F CFA<br/>
                    Cantine: {Number(selectedLevel.cantine_amount).toLocaleString('fr-FR')} F CFA
                  </Typography>
                </Alert>
              ) : null;
            })()}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Annuler</Button>
            <Button 
              variant="contained" 
              onClick={handleAddClass} 
              disabled={!newClass.name || !newClass.education_level_id}
            >
              Ajouter
            </Button>
          </DialogActions>
        </Dialog>
        {/* Modale d'édition */}
        <Dialog open={editOpen} onClose={handleEditClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditIcon color="primary" />
              Modifier la classe
            </Box>
          </DialogTitle>
          <DialogContent>
            {editClass && (
              <Box sx={{ pt: 1 }}>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Nom de la classe"
                  fullWidth
                  value={editClass.name}
                  onChange={handleEditChange}
                  name="name"
                  required
                  helperText="Nom de la classe (ex: 6ème A, 5ème B)"
                />
                <FormControl fullWidth margin="dense">
                  <InputLabel id="edit-niveau-label">Niveau d'études *</InputLabel>
                  <Select
                    labelId="edit-niveau-label"
                    value={editClass.education_level_id}
                    label="Niveau d'études *"
                    onChange={(e) => handleEditChange({ target: { name: 'education_level_id', value: e.target.value } })}
                    name="education_level_id"
                    required
                  >
                    {educationLevels.map((level) => (
                      <MenuItem key={level.id} value={level.id}>
                        {level.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {editClass.education_level_id && (() => {
                  const selectedLevel = educationLevels.find(l => l.id === editClass.education_level_id);
                  return selectedLevel ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Informations du niveau :</strong><br/>
                        Scolarité: {Number(selectedLevel.tuition_amount).toLocaleString('fr-FR')} F CFA<br/>
                        Frais d'inscription: {Number(selectedLevel.registration_fee).toLocaleString('fr-FR')} F CFA<br/>
                        Cantine: {Number(selectedLevel.cantine_amount).toLocaleString('fr-FR')} F CFA
                      </Typography>
                    </Alert>
                  ) : null;
                })()}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditClose} color="inherit">
              Annuler
            </Button>
            <Button 
              variant="contained" 
              onClick={handleEditSubmit}
              disabled={!editClass?.name || !editClass?.education_level_id}
            >
              Enregistrer les modifications
            </Button>
          </DialogActions>
        </Dialog>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default Classes; 

