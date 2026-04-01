import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  Event as EventIcon,
  ToggleOff as ToggleOffIcon,
  ToggleOn as ToggleOnIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import axios from 'axios';
import SecretarySidebar from '../../components/SecretarySidebar';

interface Composition {
  id: number;
  name: string;
  description: string;
  composition_date: string;
  school_year: string;
  is_active: boolean;
  status: string;
  days_until_composition?: number;
  created_at: string;
  updated_at: string;
}

interface CompositionFormData {
  name: string;
  description: string;
  composition_date: Date | null;
  school_year: string;
}

const CompositionManagement: React.FC = () => {
  const [compositions, setCompositions] = useState<Composition[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingComposition, setEditingComposition] = useState<Composition | null>(null);
  const [formData, setFormData] = useState<CompositionFormData>({
    name: '',
    description: '',
    composition_date: null,
    school_year: getCurrentSchoolYear()
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>(getCurrentSchoolYear());

  // Fonction pour obtenir l'année scolaire actuelle
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

  // Générer les années scolaires disponibles
  function getSchoolYears(count = 5) {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < count; i++) {
      const year = currentYear - i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  }

  // Charger les compositions
  const fetchCompositions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('https://saintefamilleexcellence.ci/api/compositions', {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: selectedSchoolYear }
      });
      setCompositions(response.data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des compositions:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors du chargement des compositions',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Charger les compositions au montage et quand l'année change
  useEffect(() => {
    fetchCompositions();
  }, [selectedSchoolYear]);

  // Ouvrir le dialog pour créer une nouvelle composition
  const handleCreateNew = () => {
    setEditingComposition(null);
    setFormData({
      name: '',
      description: '',
      composition_date: null,
      school_year: selectedSchoolYear
    });
    setOpenDialog(true);
  };

  // Ouvrir le dialog pour modifier une composition
  const handleEdit = (composition: Composition) => {
    setEditingComposition(composition);
    
    // Parser la date de manière sécurisée
    let parsedDate: Date | null = null;
    if (composition.composition_date) {
      // Essayer de parser la date
      const dateValue = new Date(composition.composition_date);
      // Vérifier que la date est valide
      if (!isNaN(dateValue.getTime())) {
        parsedDate = dateValue;
      } else {
        // Si le parsing échoue, essayer avec un format alternatif
        console.warn('Date invalide lors de l\'édition:', composition.composition_date);
        // Tenter de parser avec un format YYYY-MM-DD
        const parts = String(composition.composition_date).split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Les mois sont 0-indexés
          const day = parseInt(parts[2], 10);
          const alternativeDate = new Date(year, month, day);
          if (!isNaN(alternativeDate.getTime())) {
            parsedDate = alternativeDate;
          }
        }
      }
    }
    
    setFormData({
      name: composition.name,
      description: composition.description || '',
      composition_date: parsedDate,
      school_year: composition.school_year
    });
    setOpenDialog(true);
  };

  // Fermer le dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingComposition(null);
    setFormData({
      name: '',
      description: '',
      composition_date: null,
      school_year: selectedSchoolYear
    });
  };

  // Sauvegarder une composition (création ou modification)
  const handleSave = async () => {
    if (!formData.name.trim() || !formData.composition_date) {
      setSnackbar({
        open: true,
        message: 'Veuillez remplir tous les champs obligatoires',
        severity: 'error'
      });
      return;
    }

    // Vérifier que la date est valide
    if (isNaN(formData.composition_date.getTime())) {
      setSnackbar({
        open: true,
        message: 'La date sélectionnée est invalide. Veuillez sélectionner une date valide.',
        severity: 'error'
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Formater la date au format YYYY-MM-DD de manière sécurisée
      const year = formData.composition_date.getFullYear();
      const month = String(formData.composition_date.getMonth() + 1).padStart(2, '0');
      const day = String(formData.composition_date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      const compositionData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        composition_date: formattedDate,
        school_year: formData.school_year
      };

      if (editingComposition) {
        // Modification
        await axios.put(`https://saintefamilleexcellence.ci/api/compositions/${editingComposition.id}`, compositionData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSnackbar({
          open: true,
          message: 'Composition modifiée avec succès',
          severity: 'success'
        });
      } else {
        // Création
        await axios.post('https://saintefamilleexcellence.ci/api/compositions', compositionData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSnackbar({
          open: true,
          message: 'Composition créée avec succès',
          severity: 'success'
        });
      }

      handleCloseDialog();
      fetchCompositions();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors de la sauvegarde',
        severity: 'error'
      });
    }
  };

  // Supprimer une composition
  const handleDelete = async (composition: Composition) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la composition "${composition.name}" ?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://saintefamilleexcellence.ci/api/compositions/${composition.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSnackbar({
        open: true,
        message: 'Composition supprimée avec succès',
        severity: 'success'
      });
      
      fetchCompositions();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors de la suppression',
        severity: 'error'
      });
    }
  };

  // Activer/Désactiver une composition
  const handleToggleStatus = async (composition: Composition) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`https://saintefamilleexcellence.ci/api/compositions/toggle-status/${composition.id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSnackbar({
        open: true,
        message: `Composition ${composition.is_active ? 'désactivée' : 'activée'} avec succès`,
        severity: 'success'
      });
      
      fetchCompositions();
    } catch (error: any) {
      console.error('Erreur lors du changement de statut:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors du changement de statut',
        severity: 'error'
      });
    }
  };

  // Obtenir la couleur du chip selon le statut
  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'Aujourd\'hui':
        return 'error';
      case 'À venir':
        return 'info';
      case 'Terminée':
        return 'success';
      default:
        return 'default';
    }
  };

  // Formater la date pour l'affichage
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Obtenir les suggestions de noms de compositions
  const getCompositionSuggestions = () => {
    return [
      '1ère Composition',
      '2ème Composition',
      '3ème Composition',
      '4ème Composition',
      '5ème Composition',
      'Composition de Noël',
      'Composition de Pâques',
      'Composition de fin d\'année'
    ];
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: 3, // Remettre un peu de padding pour la lisibilité
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
        overflow: 'auto'
      }}>
          {/* En-tête */}
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, mb: 3, mx: -3, mt: -3 }}>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
              <AssignmentIcon fontSize="large" sx={{ color: '#1976d2' }} />
              <Box>
                <Typography variant="h4" component="h1" sx={{ 
                  fontWeight: 'bold',
                  color: '#1976d2'
                }}>
                  Gestion des Compositions
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Créer, modifier et gérer les compositions scolaires
                </Typography>
              </Box>
            </Stack>

            {/* Sélecteur d'année scolaire et bouton d'ajout */}
            <Stack direction="row" alignItems="center" spacing={3} sx={{ mt: 3 }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Année scolaire</InputLabel>
                <Select
                  value={selectedSchoolYear}
                  onChange={(e) => setSelectedSchoolYear(e.target.value)}
                  label="Année scolaire"
                >
                  {getSchoolYears().map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateNew}
                sx={{ 
                  minHeight: 48,
                  fontWeight: 600,
                  px: 3
                }}
              >
                Nouvelle Composition
              </Button>
            </Stack>
          </Paper>

          {/* Tableau des compositions */}
          <Paper elevation={2} sx={{ borderRadius: 3, mx: -3 }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <EventIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Compositions - {selectedSchoolYear}
                </Typography>
                {compositions.length > 0 && (
                  <Chip 
                    label={`${compositions.length} composition(s)`}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : compositions.length > 0 ? (
              <Table>
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#f5f5f5', fontWeight: 'bold' } }}>
                    <TableCell>Nom</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>État</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {compositions.map((composition) => (
                    <TableRow key={composition.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>
                          {composition.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {formatDate(composition.composition_date)}
                          </Typography>
                          {composition.days_until_composition !== undefined && (
                            <Typography variant="caption" color="text.secondary">
                              {composition.days_until_composition > 0 
                                ? `Dans ${composition.days_until_composition} jour(s)`
                                : composition.days_until_composition === 0
                                ? 'Aujourd\'hui'
                                : `Il y a ${Math.abs(composition.days_until_composition)} jour(s)`
                              }
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={composition.status}
                          color={getStatusChipColor(composition.status)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={composition.is_active ? 'Active' : 'Inactive'}
                          color={composition.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {composition.description || 'Aucune description'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Modifier">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(composition)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title={composition.is_active ? 'Désactiver' : 'Activer'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleStatus(composition)}
                              color={composition.is_active ? 'warning' : 'success'}
                            >
                              {composition.is_active ? <ToggleOffIcon /> : <ToggleOnIcon />}
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(composition)}
                              color="error"
                              disabled={composition.status === 'Terminée'} // Empêcher la suppression des compositions terminées
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  Aucune composition trouvée
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Créez votre première composition pour l'année {selectedSchoolYear}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateNew}
                >
                  Créer une composition
                </Button>
              </Box>
            )}
          </Paper>

          {/* Statistiques */}
          {compositions.length > 0 && (
            <Paper elevation={2} sx={{ p: 3, borderRadius: 3, mt: 3, mx: -3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Statistiques - {selectedSchoolYear}
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#e3f2fd', borderRadius: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      {compositions.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total compositions
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#fff3e0', borderRadius: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {compositions.filter(c => c.status === 'À venir').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      À venir
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#ffebee', borderRadius: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="error.main">
                      {compositions.filter(c => c.status === 'Aujourd\'hui').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Aujourd'hui
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#e8f5e8', borderRadius: 2 }}>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {compositions.filter(c => c.status === 'Terminée').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Terminées
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}
      </Box>

      {/* Dialog de création/modification */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <CalendarIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              {editingComposition ? 'Modifier la composition' : 'Nouvelle composition'}
            </Typography>
          </Stack>
        </DialogTitle>
        
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
            <Stack spacing={3} sx={{ mt: 2 }}>
              {/* Nom de la composition */}
              <Box>
                <TextField
                  label="Nom de la composition *"
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: 1ère Composition, Composition de Noël..."
                />
                
                {/* Suggestions de noms */}
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Suggestions :
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {getCompositionSuggestions().map((suggestion, index) => (
                      <Chip
                        key={index}
                        label={suggestion}
                        size="small"
                        variant="outlined"
                        onClick={() => setFormData({ ...formData, name: suggestion })}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                </Box>
              </Box>

              {/* Date de la composition */}
              <DatePicker
                label="Date de la composition *"
                value={formData.composition_date}
                onChange={(newValue) => {
                  // Vérifier que la nouvelle valeur est valide avant de la définir
                  if (newValue && !isNaN(newValue.getTime())) {
                    setFormData({ ...formData, composition_date: newValue });
                  } else if (newValue === null) {
                    // Permettre de réinitialiser la date
                    setFormData({ ...formData, composition_date: null });
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: 'Sélectionnez le jour où aura lieu la composition',
                    error: formData.composition_date !== null && isNaN(formData.composition_date.getTime())
                  }
                }}
                minDate={new Date()} // Empêcher la sélection de dates passées
                format="dd/MM/yyyy"
              />

              {/* Année scolaire */}
              <FormControl fullWidth>
                <InputLabel>Année scolaire</InputLabel>
                <Select
                  value={formData.school_year}
                  onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                  label="Année scolaire"
                >
                  {getSchoolYears().map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Description */}
              <TextField
                label="Description"
                multiline
                rows={3}
                fullWidth
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description optionnelle de la composition..."
                helperText="Description facultative pour donner plus de contexte"
              />

              {/* Informations sur la date */}
              {formData.composition_date && !isNaN(formData.composition_date.getTime()) && (
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Date sélectionnée :</strong> {formData.composition_date.toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Cette composition sera automatiquement associée à toutes les classes primaires (CP1, CP2, CE1, CE2, CM1, CM2).
                  </Typography>
                </Alert>
              )}
            </Stack>
          </LocalizationProvider>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Annuler
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!formData.name.trim() || !formData.composition_date}
          >
            {editingComposition ? 'Modifier' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CompositionManagement;

