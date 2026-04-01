import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, TextField, Paper, CircularProgress, Snackbar, Alert, Stack, Grid,
  List, ListItem, ListItemButton, ListItemAvatar, Avatar, ListItemText, Divider, Container, InputAdornment,
  Card, CardHeader, CardContent
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CampaignIcon from '@mui/icons-material/Campaign';
import GroupIcon from '@mui/icons-material/Group';
import SendIcon from '@mui/icons-material/Send';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import SecretarySidebar from '../../components/SecretarySidebar';

// Helpers
function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

function stringAvatar(name: string) {
  const nameParts = name.split(' ');
  return {
    sx: { bgcolor: stringToColor(name), color: 'white !important', fontWeight: 'bold' },
    children: `${nameParts[0][0]}${nameParts[1] ? nameParts[1][0] : ''}`.toUpperCase(),
  };
}

interface Student {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  registration_number: string;
  classe: string;
}

const PrivateEventPage = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    setLoading(true);
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('https://saintefamilleexcellence.ci/api/students', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isMounted) setStudents(response.data);
      } catch (error) {
        console.error('Erreur:', error);
        if (isMounted) setSnackbar({ open: true, message: 'Impossible de charger la liste des élèves.', severity: 'error' });
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStudents();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  const filteredStudents = useMemo(() =>
    students.filter(student =>
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.registration_number?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [students, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message || !selectedStudent) {
      setSnackbar({ open: true, message: 'Veuillez sélectionner un élève et remplir le titre et le message.', severity: 'error' });
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'https://saintefamilleexcellence.ci/api/events/private',
        { title, message, event_date: eventDate || null, recipient_user_id: selectedStudent.user_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSnackbar({ open: true, message: `Message privé envoyé à ${selectedStudent.first_name} !`, severity: 'success' });
      setTitle('');
      setMessage('');
      setEventDate('');
      setSelectedStudent(null);
    } catch (error) {
      console.error(error);
      setSnackbar({ open: true, message: 'Erreur lors de l\'envoi du message.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ p: 3, flexGrow: 1, bgcolor: '#f7f9fc', minHeight: '100vh' }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1c2536' }}>Message Privé</Typography>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/secretary/events')}>Retour</Button>
          </Stack>

          <Grid container spacing={4}>
            <Grid item xs={12} md={5} lg={4}>
              <Paper sx={{ p: 2, borderRadius: 4, height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Chercher par nom ou matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
                  }}
                />
                <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                  {loading ? <CircularProgress /> : (
                    <List disablePadding>
                      {filteredStudents.map((student) => (
                        <ListItemButton key={student.id} selected={selectedStudent?.id === student.id} onClick={() => setSelectedStudent(student)} sx={{ borderRadius: 2, mb: 0.5 }}>
                          <ListItemAvatar><Avatar {...stringAvatar(`${student.first_name} ${student.last_name}`)} /></ListItemAvatar>
                          <ListItemText primary={`${student.first_name} ${student.last_name}`} secondary={student.registration_number} />
                        </ListItemButton>
                      ))}
                    </List>
                  )}
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7} lg={8}>
              <Paper component="form" onSubmit={handleSubmit} sx={{ p: {xs: 2, md: 4}, borderRadius: 4 }}>
                {selectedStudent ? (
                  <>
                    <CardHeader
                      avatar={<Avatar {...stringAvatar(`${selectedStudent.first_name} ${selectedStudent.last_name}`)} sx={{ width: 56, height: 56 }} />}
                      title={<Typography variant="h5" fontWeight={600}>Message pour {selectedStudent.first_name} {selectedStudent.last_name}</Typography>}
                      subheader={`Classe: ${selectedStudent.classe || 'Non spécifiée'} - Matricule: ${selectedStudent.registration_number}`}
                    />
                    <CardContent>
                      <Stack spacing={3} sx={{ mt: 2 }}>
                        <TextField label="Titre du message" fullWidth variant="outlined" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        <TextField label="Contenu du message" fullWidth multiline variant="outlined" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} required />
                        <TextField label="Date et heure de l'événement (optionnel)" type="datetime-local" variant="outlined" fullWidth value={eventDate} onChange={(e) => setEventDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                        <Button type="submit" variant="contained" disabled={loading} size="large" endIcon={<SendIcon />} sx={{ py: 1.5, fontWeight: 'bold', color: 'white' }}>
                          {loading ? <CircularProgress size={24} color="inherit" /> : 'Envoyer le Message'}
                        </Button>
                      </Stack>
                    </CardContent>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 200px)', color: 'text.secondary', textAlign: 'center' }}>
                    <PersonIcon sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h6">Sélectionnez un élève</Typography>
                    <Typography>Choisissez un destinataire dans la liste de gauche pour commencer à écrire un message.</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default PrivateEventPage; 

