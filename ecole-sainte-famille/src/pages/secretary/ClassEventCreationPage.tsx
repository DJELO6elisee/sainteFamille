import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Paper, CircularProgress, Snackbar, Alert, Stack, Grid,
  List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, Container, InputAdornment
} from '@mui/material';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CampaignIcon from '@mui/icons-material/Campaign';
import GroupIcon from '@mui/icons-material/Group';
import SendIcon from '@mui/icons-material/Send';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SecretarySidebar from '../../components/SecretarySidebar';

function stringToColor(string: string) {
  let hash = 0;
  let i;

  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = '#';

  for (i = 0; i < 3; i += 1) {
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
        color: 'white !important',
        fontWeight: 'bold'
        },
        children: `${nameParts[0][0]}${nameParts[1] ? nameParts[1][0] : ''}`.toUpperCase(),
    };
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
}

interface ClassDetails {
    id: number;
    name: string;
}

const ClassEventCreationPage = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const classRes = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!isMounted) return;
        setClassDetails(classRes.data);

        const studentsRes = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classId}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (isMounted) setStudents(studentsRes.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        if (isMounted) setSnackbar({ open: true, message: 'Impossible de charger les données de la classe.', severity: 'error' });
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (classId) {
        fetchData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [classId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message || !eventDate || !classId) {
      setSnackbar({ open: true, message: 'Tous les champs, y compris la date, sont requis.', severity: 'error' });
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'https://saintefamilleexcellence.ci/api/events/class',
        { title, message, event_date: eventDate, class_id: classId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSnackbar({ open: true, message: 'Événement pour la classe envoyé avec succès !', severity: 'success' });
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

  const pageTitle = classDetails ? `Annonce pour la classe : ${classDetails.name}` : 'Chargement...';

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
                {pageTitle}
              </Typography>
              <Button 
                  variant="outlined" 
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/secretary/events/class')}
              >
                  Retour à la liste des classes
              </Button>
          </Stack>

          <Grid container spacing={4}>
            <Grid item xs={12} lg={5}>
            <Paper component="form" onSubmit={handleSubmit} sx={{ p: {xs: 3, md: 4}, borderRadius: 5, boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.05)', height: '100%' }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', color: 'white' }}><CampaignIcon /></Avatar>
                    <Typography variant="h6" fontWeight="600">Détails de l'annonce</Typography>
                </Stack>
                <TextField label="Titre" fullWidth variant="outlined" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 3 }} required />
                <TextField label="Message" fullWidth multiline variant="outlined" rows={8} value={message} onChange={(e) => setMessage(e.target.value)} sx={{ mb: 3 }} required />
                <TextField label="Date et heure" type="datetime-local" variant="outlined" fullWidth value={eventDate} onChange={(e) => setEventDate(e.target.value)} sx={{ mb: 3 }} InputLabelProps={{ shrink: true }} InputProps={{ startAdornment: (<InputAdornment position="start"><CalendarTodayIcon /></InputAdornment>) }} required />
                <Button type="submit" variant="contained" disabled={loading || students.length === 0} fullWidth size="large" endIcon={<SendIcon />} sx={{ py: 1.5, fontWeight: 'bold', mt: 2, color: 'white' }}>
                    {loading ? <CircularProgress size={24} color="inherit" /> : `Envoyer à ${students.length} élèves`}
                </Button>
            </Paper>
            </Grid>
            <Grid item xs={12} lg={7}>
                <Paper sx={{ p: {xs: 2, md: 3}, borderRadius: 5, boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, px: 1 }}>
                        <Avatar sx={{ bgcolor: 'secondary.main', color: 'white' }}><GroupIcon/></Avatar>
                        <Typography variant="h6" fontWeight="600">Destinataires ({students.length})</Typography>
                    </Stack>
                    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
                    ) : students.length === 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', p: 3, color: 'text.secondary' }}>
                            <GroupIcon sx={{ fontSize: 52, mb: 2 }} />
                            <Typography variant="h6">Aucun élève dans cette classe</Typography>
                        </Box>
                    ) : (
                    <List disablePadding>
                        {students.map((student, index) => (
                        <React.Fragment key={student.id}>
                            <ListItem>
                              <ListItemAvatar><Avatar {...stringAvatar(`${student.first_name} ${student.last_name}`)} /></ListItemAvatar>
                              <ListItemText primary={`${student.first_name} ${student.last_name}`} />
                            </ListItem>
                            {index < students.length - 1 && <Divider variant="inset" component="li" />}
                        </React.Fragment>
                        ))}
                    </List>
                    )}
                    </Box>
                </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClassEventCreationPage; 

