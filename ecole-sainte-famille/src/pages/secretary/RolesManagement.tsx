import React, { useState, useEffect } from 'react';
import { 
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Paper, Grid, Divider, MenuItem, Select, InputLabel, FormControl, SelectChangeEvent, Alert, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, Tooltip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import SecretarySidebar from '../../components/SecretarySidebar';
import axios from 'axios';

interface Admin {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  contact: string;
  civilité: string;
  role: string;
  fonction: string;
  created_at: string;
}

const RolesManagement = () => {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    contact: '',
    civilité: 'M.',
    fonction: '',
    role: 'secretary',
  });
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contact: '',
    civilité: 'M.',
    fonction: '',
    role: '',
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Charger la liste des administrateurs
  const loadAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://saintefamilleexcellence.ci/api/auth/admins', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setAdmins(response.data.data);
    } catch (error: any) {
      console.error('Erreur lors du chargement des administrateurs:', error);
      setError('Erreur lors du chargement des administrateurs');
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadAdminsData = async () => {
      if (!isMounted) return;
      await loadAdmins();
    };
    
    loadAdminsData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Réinitialiser le formulaire quand le dialog s'ouvre
  useEffect(() => {
    let isMounted = true;
    
    if (open && isMounted) {
      // Réinitialiser complètement le formulaire
      setTimeout(() => {
        if (isMounted) {
          setForm({
            first_name: '',
            last_name: '',
            email: '',
            password: '',
            contact: '',
            civilité: 'M.',
            fonction: '',
            role: 'secretary',
          });
          setError('');
          setSuccess(false);
        }
      }, 0);
    }
    
    return () => {
      isMounted = false;
    };
  }, [open]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name as string]: value }));
  };

  const handleEditSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name as string]: value }));
  };

  // Fonction pour réinitialiser le formulaire
  const resetForm = () => {
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      contact: '',
      civilité: 'M.',
      fonction: '',
      role: 'secretary',
    });
    setError('');
    setSuccess(false);
  };

  // Fonction pour ouvrir le dialog d'ajout avec un formulaire vide
  const handleOpenAddDialog = () => {
    // Réinitialiser complètement le formulaire
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      contact: '',
      civilité: 'M.',
      fonction: '',
      role: 'secretary',
    });
    setError('');
    setSuccess(false);
    setOpen(true);
  };

  // Fonction pour fermer le dialog et réinitialiser le formulaire
  const handleCloseDialog = () => {
    setOpen(false);
    setForm({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      contact: '',
      civilité: 'M.',
      fonction: '',
      role: 'secretary',
    });
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('https://saintefamilleexcellence.ci/api/auth/register-admin', form, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 'success') {
        setSuccess(true);
        
        // Réinitialiser le formulaire
        setForm({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          contact: '',
          civilité: 'M.',
          fonction: '',
          role: 'secretary',
        });
        
        // Afficher un message de succès avec information sur l'email
        const successMessage = response.data.warning 
          ? `Administrateur inscrit avec succès ! ${response.data.warning}`
          : 'Administrateur inscrit avec succès ! Un email avec les identifiants a été envoyé.';
        
        setTimeout(() => {
          handleCloseDialog();
          setSuccess(false);
          loadAdmins(); // Recharger la liste
        }, 3000); // Plus de temps pour lire le message
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'inscription:', error);
      setError(error.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (admin: Admin) => {
    setEditingAdmin(admin);
    setEditForm({
      first_name: admin.first_name,
      last_name: admin.last_name,
      email: admin.email,
      contact: admin.contact || '',
      civilité: admin.civilité || 'M.',
      fonction: admin.fonction || '',
      role: admin.role,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`https://saintefamilleexcellence.ci/api/auth/admins/${editingAdmin.id}`, editForm, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          setEditOpen(false);
          setSuccess(false);
          loadAdmins(); // Recharger la liste
        }, 2000);
      }
    } catch (error: any) {
      console.error('Erreur lors de la modification:', error);
      setError(error.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (admin: Admin) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${admin.first_name} ${admin.last_name} ?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`https://saintefamilleexcellence.ci/api/auth/admins/${admin.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          loadAdmins(); // Recharger la liste
        }, 2000);
      }
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      setError(error.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'secretary': return 'Secrétaire';
      case 'directrice': return 'Directrice';
      case 'éducateur': return 'Éducateur';
      case 'comptable': return 'Comptable';
      case 'comunicateur': return 'Comunicateur';
      case 'informaticien': return 'Informaticien';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'secretary': return 'primary';
      case 'directrice': return 'info';
      case 'éducateur': return 'success';
      case 'comptable': return 'warning';
      case 'comunicateur': return 'info';
      case 'informaticien': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <SecretarySidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', py: 6, px: 2 }}>
        <Typography variant="h3" fontWeight={900} color="primary.main" mb={4} sx={{ letterSpacing: 1 }}>
          Gestion des rôles
        </Typography>
        
        {/* Liste des administrateurs */}
        <Paper elevation={4} sx={{ p: 3, mb: 3, width: '100%', maxWidth: 1200, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight={700} color="primary.main">
              Liste des administrateurs
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Nouvel administrateur
            </Button>
          </Box>
          
          {loadingAdmins ? (
            <Typography align="center">Chargement...</Typography>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Civilité</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Nom complet</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Fonction</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Rôle</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date de création</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>{admin.civilité || 'M.'}</TableCell>
                      <TableCell>{`${admin.first_name} ${admin.last_name}`}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{admin.contact || '-'}</TableCell>
                      <TableCell>{admin.fonction || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getRoleLabel(admin.role)} 
                          color={getRoleColor(admin.role) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(admin.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Modifier">
                          <IconButton 
                            onClick={() => handleEdit(admin)}
                            color="primary"
                            size="small"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton 
                            onClick={() => handleDelete(admin)}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Dialog d'ajout */}
        <Dialog 
          key={open ? 'add-dialog' : 'closed'} 
          open={open} 
          onClose={handleCloseDialog} 
          maxWidth="xs" 
          fullWidth 
          PaperProps={{
            sx: { borderRadius: 4, boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)', p: 0 }
          }}
        >
          <DialogTitle sx={{ fontWeight: 900, color: 'primary.main', fontSize: 24, letterSpacing: 1, pb: 0 }}>
            Inscription d'un administrateur
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2, bgcolor: '#f7fafd', borderRadius: 3 }}>
              <TextField label="Nom *" name="last_name" value={form.last_name} onChange={handleTextChange} required fullWidth
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 18, py: 1.5 } }}
                InputLabelProps={{ sx: { fontWeight: 700, color: '#1976d2' } }}
                autoFocus
              />
              <TextField label="Prénom *" name="first_name" value={form.first_name} onChange={handleTextChange} required fullWidth
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 18, py: 1.5 } }}
                InputLabelProps={{ sx: { fontWeight: 700, color: '#1976d2' } }}
              />
              <TextField label="Email *" name="email" type="email" value={form.email} onChange={handleTextChange} required fullWidth
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 18, py: 1.5 } }}
                InputLabelProps={{ sx: { fontWeight: 700, color: '#1976d2' } }}
              />
              <TextField label="Mot de passe *" name="password" type="password" value={form.password} onChange={handleTextChange} required fullWidth
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 18, py: 1.5 } }}
                InputLabelProps={{ sx: { fontWeight: 700, color: '#1976d2' } }}
              />
              <TextField label="Contact" name="contact" value={form.contact} onChange={handleTextChange} fullWidth
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 18, py: 1.5 } }}
                InputLabelProps={{ sx: { fontWeight: 700, color: '#1976d2' } }}
              />
              <TextField label="Fonction" name="fonction" value={form.fonction} onChange={handleTextChange} fullWidth
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 18, py: 1.5 } }}
                InputLabelProps={{ sx: { fontWeight: 700, color: '#1976d2' } }}
              />
              <FormControl fullWidth required>
                <InputLabel sx={{ fontWeight: 700, color: '#1976d2' }}>Civilité *</InputLabel>
                <Select
                  name="civilité"
                  value={form.civilité}
                  label="Civilité *"
                  onChange={handleSelectChange}
                  sx={{ borderRadius: 2, fontSize: 18, py: 1.5 }}
                >
                  <MenuItem value="M.">M.</MenuItem>
                  <MenuItem value="Mme.">Mme.</MenuItem>
                  <MenuItem value="Mlle.">Mlle.</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel sx={{ fontWeight: 700, color: '#1976d2' }}>Rôle *</InputLabel>
                <Select
                  name="role"
                  value={form.role}
                  label="Rôle *"
                  onChange={handleSelectChange}
                  sx={{ borderRadius: 2, fontSize: 18, py: 1.5 }}
                >
                  <MenuItem value="admin">Administrateur</MenuItem>
                  {/* <MenuItem value="secretary">Secrétaire</MenuItem> */}
                  <MenuItem value="directrice">Directrice</MenuItem>
                  {/* <MenuItem value="éducateur">Éducateur</MenuItem> */}
                  <MenuItem value="comptable">Comptable</MenuItem>
                  {/* <MenuItem value="comunicateur">Comunicateur</MenuItem> */}
                  {/* <MenuItem value="informaticien">Informaticien</MenuItem> */}
                </Select>
              </FormControl>

              {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Administrateur inscrit avec succès !
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Un email avec les identifiants de connexion a été envoyé à l'adresse fournie.
                  </Typography>
                </Alert>
              )}
              {error && <Alert severity="error">{error}</Alert>}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, pt: 2, gap: 2, justifyContent: 'center' }}>
              <Button
                onClick={handleCloseDialog}
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, px: 4, py: 1.5 }}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !form.first_name || !form.last_name || !form.email || !form.password || !form.role}
                sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, px: 4, py: 1.5 }}
              >
                {loading ? 'Inscription...' : 'Inscrire'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Dialog de modification */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth PaperProps={{
          sx: { borderRadius: 4, boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)', p: 0 }
        }}>
          <DialogTitle sx={{ fontWeight: 900, color: 'primary.main', fontSize: 24, letterSpacing: 1, pb: 0 }}>
            Modifier l'administrateur
          </DialogTitle>
          <form onSubmit={handleEditSubmit}>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2, bgcolor: '#f7fafd', borderRadius: 3 }}>
              <TextField label="Nom *" name="last_name" value={editForm.last_name} onChange={handleEditTextChange} required fullWidth
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 18, py: 1.5 } }}
                InputLabelProps={{ sx: { fontWeight: 700, color: '#1976d2' } }}
              />
              <TextField label="Prénom *" name="first_name" value={editForm.first_name} onChange={handleEditTextChange} required fullWidth
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 18, py: 1.5 } }}
                InputLabelProps={{ sx: { fontWeight: 700, color: '#1976d2' } }}
              />
              <TextField label="Email *" name="email" type="email" value={editForm.email} onChange={handleEditTextChange} required fullWidth
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 18, py: 1.5 } }}
                InputLabelProps={{ sx: { fontWeight: 700, color: '#1976d2' } }}
              />
              <TextField label="Contact" name="contact" value={editForm.contact} onChange={handleEditTextChange} fullWidth
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 18, py: 1.5 } }}
                InputLabelProps={{ sx: { fontWeight: 700, color: '#1976d2' } }}
              />
              <TextField label="Fonction" name="fonction" value={editForm.fonction} onChange={handleEditTextChange} fullWidth
                InputProps={{ sx: { borderRadius: 2, bgcolor: 'white', fontSize: 18, py: 1.5 } }}
                InputLabelProps={{ sx: { fontWeight: 700, color: '#1976d2' } }}
              />
              <FormControl fullWidth required>
                <InputLabel sx={{ fontWeight: 700, color: '#1976d2' }}>Civilité *</InputLabel>
                <Select
                  name="civilité"
                  value={editForm.civilité}
                  label="Civilité *"
                  onChange={handleEditSelectChange}
                  sx={{ borderRadius: 2, fontSize: 18, py: 1.5 }}
                >
                  <MenuItem value="M.">M.</MenuItem>
                  <MenuItem value="Mme.">Mme.</MenuItem>
                  <MenuItem value="Mlle.">Mlle.</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel sx={{ fontWeight: 700, color: '#1976d2' }}>Rôle *</InputLabel>
                <Select
                  name="role"
                  value={editForm.role}
                  label="Rôle *"
                  onChange={handleEditSelectChange}
                  sx={{ borderRadius: 2, fontSize: 18, py: 1.5 }}
                >
                  <MenuItem value="admin">Administrateur</MenuItem>
                  {/* <MenuItem value="secretary">Secrétaire</MenuItem> */}
                  <MenuItem value="directrice">Directrice</MenuItem>
                  {/* <MenuItem value="éducateur">Éducateur</MenuItem> */}
                  <MenuItem value="comptable">Comptable</MenuItem>
                  {/* <MenuItem value="comunicateur">Comunicateur</MenuItem> */}
                  {/* <MenuItem value="informaticien">Informaticien</MenuItem> */}
                </Select>
              </FormControl>

              {success && <Typography color="success.main" fontWeight={700} align="center">Administrateur modifié avec succès !</Typography>}
              {error && <Alert severity="error">{error}</Alert>}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, pt: 2, gap: 2, justifyContent: 'center' }}>
              <Button
                onClick={() => setEditOpen(false)}
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, px: 4, py: 1.5 }}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !editForm.first_name || !editForm.last_name || !editForm.email || !editForm.role}
                sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, px: 4, py: 1.5 }}
              >
                {loading ? 'Modification...' : 'Modifier'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    </Box>
  );
};

export default RolesManagement; 

