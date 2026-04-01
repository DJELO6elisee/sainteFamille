import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SchoolIcon from '@mui/icons-material/School';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SecretarySidebar from '../components/SecretarySidebar';

interface Class {
  id: number;
  name: string;
  level: string;
  academic_year?: string;
  teacher?: string;
  studentsCount?: number;
  amount?: number;
  amount_old_students?: number;
  cantine_amount?: number;
}

const Classes = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [newClass, setNewClass] = useState<Omit<Class, 'id'>>({
    name: '',
    level: '',
    teacher: '',
    studentsCount: 0,
    amount: 0,
    amount_old_students: 0,
    cantine_amount: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    const fetchClasses = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) setClasses(res.data);
      } catch (err: any) {
        if (isMounted) setError(err.response?.data?.message || 'Erreur lors du chargement des classes');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchClasses();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditMode(false);
    setEditingClassId(null);
    setNewClass({ name: '', level: '', teacher: '', studentsCount: 0, amount: 0, amount_old_students: 0, cantine_amount: 0 });
  };

  const handleAddClass = async () => {
    try {
      const token = localStorage.getItem('token');
      const classData = {
        name: newClass.name,
        level: newClass.level,
        academic_year: new Date().getFullYear().toString(),
        amount: newClass.amount,
        amount_old_students: newClass.amount_old_students,
        cantine_amount: newClass.cantine_amount,
      };

      if (editMode && editingClassId) {
        await axios.put(`https://saintefamilleexcellence.ci/api/classes/${editingClassId}`, classData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('https://saintefamilleexcellence.ci/api/classes', classData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      const res = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClasses(res.data);
      handleClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de l\'opération');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #f8fbff 100%)', p: { xs: 1, md: 4 } }}>
          {/* Header coloré avec bouton retour */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
            <IconButton onClick={() => navigate(-1)} sx={{ mr: 2, bgcolor: 'primary.light', color: 'primary.main', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" fontWeight={700} sx={{ color: 'primary.main', letterSpacing: 1 }}>
              Gestion des Classes
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleClickOpen}
              sx={{ borderRadius: 3, fontWeight: 600, boxShadow: '0 4px 16px rgba(2,119,189,0.08)' }}
            >
              Ajouter une classe
            </Button>
          </Box>

          {/* Affichage sous forme de cartes modernes */}
          {loading ? (
            <Typography align="center" color="text.secondary">Chargement...</Typography>
          ) : error ? (
            <Typography align="center" color="error.main">{error}</Typography>
          ) : (
            <Grid container spacing={3}>
              {classes.map((classItem) => (
                <Grid item xs={12} sm={6} md={4} key={classItem.id}>
                  <Card sx={{ borderRadius: 4, boxShadow: '0 4px 24px rgba(2,119,189,0.07)', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-6px) scale(1.03)', boxShadow: '0 8px 32px rgba(2,119,189,0.13)' } }}>
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                        <SchoolIcon color="primary" />
                        <Typography variant="h6" fontWeight={700}>{classItem.name}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" mb={0.5}>Niveau : <b>{classItem.level}</b></Typography>
                      <Typography variant="body2" color="text.secondary" mb={0.5}>Année scolaire : <b>{classItem.academic_year || ''}</b></Typography>
                      {classItem.amount && (
                        <Typography variant="body2" color="text.secondary" mb={0.5}>
                          Montant nouveaux : <b>{classItem.amount?.toLocaleString()} FCFA</b>
                        </Typography>
                      )}
                      {classItem.amount_old_students && (
                        <Typography variant="body2" color="text.secondary" mb={0.5}>
                          Montant anciens : <b>{classItem.amount_old_students?.toLocaleString()} FCFA</b>
                        </Typography>
                      )}
                      {classItem.cantine_amount && (
                        <Typography variant="body2" color="text.secondary" mb={0.5}>
                          Cantine : <b>{classItem.cantine_amount?.toLocaleString()} FCFA</b>
                        </Typography>
                      )}
                      {classItem.studentsCount !== undefined && (
                        <Typography variant="body2" color="text.secondary">Nombre d'élèves : <b>{classItem.studentsCount}</b></Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end', pb: 2, pr: 2 }}>
                      <Tooltip title="Modifier">
                        <IconButton 
                          color="primary"
                          onClick={() => {
                            setEditMode(true);
                            setEditingClassId(classItem.id);
                            setNewClass({
                              name: classItem.name,
                              level: classItem.level,
                              teacher: classItem.teacher || '',
                              studentsCount: classItem.studentsCount || 0,
                              amount: classItem.amount || 0,
                              amount_old_students: classItem.amount_old_students || 0,
                              cantine_amount: classItem.cantine_amount || 0,
                            });
                            setOpen(true);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Dialog d'ajout/modification */}
          <Dialog open={open} onClose={handleClose} PaperProps={{ sx: { borderRadius: 4 } }}>
            <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>
              {editMode ? 'Modifier la classe' : 'Ajouter une nouvelle classe'}
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Nom de la classe"
                fullWidth
                value={newClass.name}
                onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Niveau"
                fullWidth
                value={newClass.level}
                onChange={(e) => setNewClass({ ...newClass, level: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Montant nouveaux élèves (FCFA)"
                type="number"
                fullWidth
                value={newClass.amount}
                onChange={(e) => setNewClass({ ...newClass, amount: parseFloat(e.target.value) || 0 })}
                sx={{ mb: 2 }}
                helperText="Montant pour les nouveaux élèves"
              />
              <TextField
                margin="dense"
                label="Montant anciens élèves (FCFA)"
                type="number"
                fullWidth
                value={newClass.amount_old_students}
                onChange={(e) => setNewClass({ ...newClass, amount_old_students: parseFloat(e.target.value) || 0 })}
                sx={{ mb: 2 }}
                helperText="Montant pour les élèves déjà inscrits"
              />
              <TextField
                margin="dense"
                label="Montant cantine (FCFA)"
                type="number"
                fullWidth
                value={newClass.cantine_amount}
                onChange={(e) => setNewClass({ ...newClass, cantine_amount: parseFloat(e.target.value) || 0 })}
                sx={{ mb: 2 }}
                helperText="Montant pour la cantine"
              />
              <TextField
                margin="dense"
                label="Professeur (optionnel)"
                fullWidth
                value={newClass.teacher}
                onChange={(e) => setNewClass({ ...newClass, teacher: e.target.value })}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                label="Nombre d'élèves (optionnel)"
                type="number"
                fullWidth
                value={newClass.studentsCount}
                onChange={(e) => setNewClass({ ...newClass, studentsCount: parseInt(e.target.value) })}
                sx={{ mb: 2 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} sx={{ fontWeight: 600 }}>Annuler</Button>
              <Button onClick={handleAddClass} variant="contained" sx={{ fontWeight: 600 }}>
                {editMode ? 'Modifier' : 'Ajouter'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default Classes; 

