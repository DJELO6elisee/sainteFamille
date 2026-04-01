import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Paper, CircularProgress, Snackbar, Alert, Stack, Grid,
  List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, Container, InputAdornment
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CampaignIcon from '@mui/icons-material/Campaign';
import GroupIcon from '@mui/icons-material/Group';
import SendIcon from '@mui/icons-material/Send';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SecretarySidebar from '../../components/SecretarySidebar';

// Helpers pour générer des avatars colorés
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
    sx: {
      bgcolor: stringToColor(name),
      color: 'white !important', // Assurer la lisibilité
      fontWeight: 'bold'
    },
    children: `${nameParts[0][0]}${nameParts[1] ? nameParts[1][0] : ''}`.toUpperCase(),
  };
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  classe: string;
}

const PublicEventPage = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
        if (isMounted) {
          console.error('Erreur lors de la récupération des élèves:', error);
          setSnackbar({ open: true, message: 'Impossible de charger la liste des élèves.', severity: 'error' });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStudents();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message || !eventDate) {
      setSnackbar({ open: true, message: 'Tous les champs, y compris la date, sont requis.', severity: 'error' });
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'https://saintefamilleexcellence.ci/api/events/public',
        { title, message, event_date: eventDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSnackbar({ open: true, message: 'Événement public envoyé avec succès !', severity: 'success' });
      setTitle('');
      setMessage('');
      setEventDate('');
    } catch (error) {
      console.error(error);
      const errorMessage = (error as any).response?.data?.message || 'Erreur lors de l\'envoi de l\'événement.';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <SecretarySidebar />
      <Box 
        component="main"
        sx={{ p: { xs: 2, md: 3 }, flexGrow: 1, bgcolor: '#f7f9fc', minHeight: '100vh' }}
      >
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1c2536' }}>
                Nouvelle Annonce Publique
              </Typography>
              <Button 
                  variant="outlined" 
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/secretary/events')}
                  sx={{
                    color: 'primary.main',
                    borderColor: 'primary.light',
                    '&:hover': {
                      backgroundColor: 'primary.lighter',
                      borderColor: 'primary.main',
                    },
                  }}
              >
                  Retour
              </Button>
          </Stack>

          <Grid container spacing={4}>
              <Grid item xs={12} lg={5}>
              <Paper 
                  component="form" 
                  onSubmit={handleSubmit} 
                  sx={{ 
                    p: {xs: 3, md: 4}, 
                    borderRadius: 5,
                    boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.05)',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                    '&:hover': {
                        boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.1)',
                        transform: 'translateY(-2px)'
                    }
                  }}
              >
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', color: 'white' }}>
                      <CampaignIcon />
                  </Avatar>
                  <Typography variant="h6" fontWeight="600">Détails de l'annonce</Typography>
                  </Stack>
                  <TextField
                    label="Titre de l'annonce"
                    fullWidth
                    variant="outlined"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    sx={{ mb: 3 }}
                    required
                  />
                  <TextField
                    label="Contenu du message"
                    fullWidth
                    multiline
                    variant="outlined"
                    rows={8}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    sx={{ mb: 3 }}
                    required
                  />
                  <TextField
                    label="Date et heure de l'événement"
                    type="datetime-local"
                    variant="outlined"
                    fullWidth
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    sx={{ mb: 3 }}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarTodayIcon sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                    required
                  />
                  
                  <Button 
                      type="submit" 
                      variant="contained" 
                      disabled={loading || students.length === 0} 
                      fullWidth size="large" 
                      endIcon={<SendIcon />}
                      sx={{ 
                        py: 1.5, 
                        fontWeight: 'bold', 
                        mt: 4,
                        borderRadius: 2.5,
                        color: 'white',
                        backgroundColor: 'primary.main',
                        boxShadow: '0 4px 14px 0 rgba(0, 118, 255, 0.39)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            backgroundColor: 'primary.dark',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 20px 0 rgba(0, 118, 255, 0.23)'
                        },
                      }}
                  >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'Envoyer à tous les élèves'}
                  </Button>
              </Paper>
              </Grid>

              <Grid item xs={12} lg={7}>
                  <Paper sx={{ 
                      p: {xs: 2, md: 3}, 
                      borderRadius: 5,
                      boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.05)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                       '&:hover': {
                          boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.1)',
                          transform: 'translateY(-2px)'
                      }
                  }}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, px: 1 }}>
                          <Avatar sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                            <GroupIcon/>
                          </Avatar>
                          <Typography variant="h6" fontWeight="600">
                          Liste des destinataires ({students.length})
                          </Typography>
                      </Stack>
                      {students.length > 10 && (
                          <Typography variant="caption" sx={{ px: 2, pb: 1, color: 'text.secondary', display: 'block' }}>
                              Aperçu des 10 premiers destinataires sur {students.length} au total.
                          </Typography>
                      )}
                      <Box sx={{ 
                          flexGrow: 1,
                          overflowY: 'auto',
                          '&::-webkit-scrollbar': { width: '8px' },
                          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                          '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: '4px' },
                          '&::-webkit-scrollbar-thumb:hover': { bgcolor: 'grey.400' }
                      }}>
                      {loading ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 5 }}><CircularProgress size={50} /></Box>
                      ) : students.length === 0 ? (
                           <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3, color: 'text.secondary', textAlign: 'center', opacity: 0.7 }}>
                              <GroupIcon sx={{ fontSize: 52, mb: 2 }} />
                              <Typography variant="h6">Aucun élève trouvé</Typography>
                              <Typography variant="body2">La liste des destinataires apparaîtra ici.</Typography>
                          </Box>
                      ) : (
                      <List disablePadding>
                          {students.slice(0, 10).map((student, index) => (
                          <React.Fragment key={student.id}>
                              <ListItem sx={{ my: 0.5, borderRadius: 2, transition: 'background-color 0.2s ease', '&:hover': { bgcolor: 'action.hover' } }}>
                                <ListItemAvatar>
                                    <Avatar {...stringAvatar(`${student.first_name} ${student.last_name}`)} />
                                </ListItemAvatar>
                              <ListItemText
                                  primary={`${student.first_name} ${student.last_name}`}
                                  secondary={`Classe: ${student.classe || 'Non spécifiée'}`}
                                  primaryTypographyProps={{ fontWeight: 500 }}
                              />
                              </ListItem>
                              {index < Math.min(students.length, 10) - 1 && <Divider variant="inset" component="li" sx={{ ml: 9 }} />}
                          </React.Fragment>
                          ))}
                      </List>
                      )}
                      </Box>
                  </Paper>
              </Grid>
          </Grid>
        
          <Snackbar
              open={snackbar.open}
              autoHideDuration={6000}
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
              <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, boxShadow: 6 }}>
              {snackbar.message}
              </Alert>
          </Snackbar>
         </Container>
      </Box>
    </Box>
  );
};

export default PublicEventPage; 

