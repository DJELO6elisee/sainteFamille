import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, CircularProgress, Alert, Paper, Stack, Chip } from '@mui/material';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';

const AbsencesTab = ({ childId, schoolYear }: { childId: string | undefined, schoolYear: string }) => {
  const [absences, setAbsences] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllNotifs, setShowAllNotifs] = useState(false);
  const [showAllAbsences, setShowAllAbsences] = useState(false);
  const notifsToShow = showAllNotifs ? notifications : notifications.slice(0, 5);
  const absencesToShow = showAllAbsences ? absences : absences.slice(0, 5);

  useEffect(() => {
    const fetchAbsencesAndNotifications = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      // 1. Récupère les absences brutes
      const absReq = axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}/absences?school_year=${schoolYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // 2. Récupère les notifications du parent connecté
      const notifReq = axios.get('https://saintefamilleexcellence.ci/api/events/my-notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const [{ data: absData }, { data: notifData }] = await Promise.all([absReq, notifReq]);
      setAbsences(absData);
      // Filtre les notifications d'absence pour cet enfant via le titre et le nom dans le message
      const absNotifs = notifData.filter(
        (n: any) =>
          n.title &&
          n.title.startsWith('Absence de') &&
          (n.student_id === Number(childId) || (n.message && n.message.includes(childId)))
      );
      setNotifications(absNotifs);
      setLoading(false);
    };
    if (childId && schoolYear) fetchAbsencesAndNotifications();
  }, [childId, schoolYear]);

  if (loading) return <CircularProgress />;

  if (!loading && absences.length === 0) return (
    <Typography color="error" fontWeight={700} align="center" sx={{ my: 3 }}>
      Aucune information disponible pour votre enfant en cette année scolaire.
    </Typography>
  );

  // Trie les absences par date décroissante
  const sortedAbsences = [...absences].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Box>
      <Typography variant="h5" mb={2} sx={{ color: '#1976d2', fontWeight: 700, letterSpacing: 1 }}>
        <EventBusyIcon sx={{ mb: -0.5, mr: 1, color: '#ff9800' }} /> Absences
      </Typography>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 4, mb: 3, background: '#fff8e1' }}>
        <Typography variant="subtitle1" color="primary" fontWeight={700} mb={2}>
          <InfoIcon sx={{ mr: 1, color: '#ff9800' }} /> Avis d'absence :
        </Typography>
        {notifications.length > 0 ? (
          <Stack spacing={2}>
            {notifsToShow.map((n: any, i: number) => {
              return (
                <Alert key={i} severity="warning" sx={{ mb: 1, bgcolor: '#fff3e0', borderRadius: 3, boxShadow: 1 }} icon={<EventBusyIcon color="warning" />}>
              <b>{n.title}</b><br />
                  {n.event_date && (
                    <span>Date : <b>{new Date(n.event_date).toLocaleDateString('fr-FR')}</b><br /></span>
                  )}
                  <span>{n.message}</span>
            </Alert>
              );
            })}
            {notifications.length > 5 && !showAllNotifs && (
              <Box textAlign="center">
                <Chip
                  label="Voir plus de notifications"
                  color="primary"
                  variant="outlined"
                  sx={{ mt: 1, cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setShowAllNotifs(true)}
                />
              </Box>
            )}
            {showAllNotifs && notifications.length > 5 && (
              <Box textAlign="center">
                <Chip
                  label="Réduire"
                  color="secondary"
                  variant="outlined"
                  sx={{ mt: 1, cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setShowAllNotifs(false)}
                />
        </Box>
      )}
          </Stack>
        ) : (
          <Typography color="text.secondary">Aucune notification d'absence.</Typography>
        )}
      </Paper>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 4, background: '#f4f6fa' }}>
        <Typography variant="subtitle1" color="primary" fontWeight={700} mb={2}>
          <EventBusyIcon sx={{ mr: 1, color: '#ff9800' }} /> Liste détaillée des absences
        </Typography>
        <Typography variant="subtitle1" color="primary" sx={{ mt: 3, mb: 1 }}>
          Liste détaillée des absences
        </Typography>
        <Box
          sx={{
            width: '100%',
            overflowX: 'auto',
            '@media (max-width:600px)': {
              pb: 1,
              mb: 2,
              borderRadius: 2,
              background: '#fff',
              boxShadow: 1,
            },
          }}
        >
          {absencesToShow.length === 0 ? (
        <Typography>Aucune absence enregistrée.</Typography>
      ) : (
            <Stack spacing={1} direction="column" minWidth={400}>
              {absencesToShow.map((a: any, i: number) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1, borderRadius: 2, bgcolor: a.status === 'excused' ? '#e8f5e9' : '#ffebee', minWidth: 350 }}>
                  <EventBusyIcon color={a.status === 'excused' ? 'success' : 'error'} sx={{ fontSize: 22 }} />
                  <Typography sx={{ fontWeight: 600, minWidth: 120 }}>{new Date(a.date).toLocaleDateString('fr-FR')}</Typography>
                  <Chip label={a.status === 'excused' ? 'Justifiée' : 'Non justifiée'} color={a.status === 'excused' ? 'success' : 'error'} size="small" />
                </Box>
              ))}
            </Stack>
          )}
        </Box>
        {sortedAbsences.length > 5 && !showAllAbsences && (
          <Box textAlign="center">
            <Chip
              label="Voir plus d'absences"
              color="primary"
              variant="outlined"
              sx={{ mt: 1, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setShowAllAbsences(true)}
            />
          </Box>
        )}
        {showAllAbsences && sortedAbsences.length > 5 && (
          <Box textAlign="center">
            <Chip
              label="Réduire"
              color="secondary"
              variant="outlined"
              sx={{ mt: 1, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setShowAllAbsences(false)}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default AbsencesTab; 

