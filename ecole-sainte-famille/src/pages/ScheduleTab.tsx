import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, CircularProgress, Table, TableHead, TableRow, TableCell, TableBody, Paper, Alert, Grid, Chip, useTheme, useMediaQuery } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WeeklyScheduleTable from '../components/WeeklyScheduleTable';
import OfficialScheduleTable from '../components/OfficialScheduleTable';

const days = ['SAMEDI', 'DIMANCHE'];
const hours = [
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
];

function getDayIndex(day: string): number {
  const map: Record<string, number> = {
    'SAMEDI': 0, 'SATURDAY': 0,
    'DIMANCHE': 1, 'SUNDAY': 1
  };
  return map[day?.toUpperCase()] ?? -1;
}

function getHourIndex(start_time: string): number {
  const h = start_time.slice(0, 5);
  return hours.findIndex(hr => hr.startsWith(h));
}

const ScheduleTab = ({ childId, schoolYear }: { childId: string | undefined, schoolYear: string }) => {
  const [officialSchedule, setOfficialSchedule] = useState<any[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Debug: Afficher les paramètres reçus
  console.log('🔍 [ScheduleTab] Paramètres reçus:', { childId, schoolYear });
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchSchedules = async () => {
      if (!isMounted) return;
      
      console.log('🔍 ScheduleTab - Début fetchSchedules');
      console.log('🔍 ScheduleTab - childId:', childId);
      console.log('🔍 ScheduleTab - schoolYear:', schoolYear);
      
      setLoading(true);
      const token = localStorage.getItem('token');
      
      try {
        // Récupérer l'emploi du temps officiel
        const officialResponse = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}/schedule?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('=== DEBUG API OFFICIELLE ===');
        console.log('Status:', officialResponse.status);
        console.log('Data:', officialResponse.data);
        
        // Récupérer l'emploi du temps hebdomadaire publié
        console.log('=== DEBUG API HEBDOMADAIRE ===');
        console.log('URL:', `https://saintefamilleexcellence.ci/api/students/${childId}/weekly-schedule?school_year=${schoolYear}`);
        console.log('Token présent:', !!token);
        console.log('Token complet:', token);
        console.log('Child ID:', childId);
        console.log('School Year:', schoolYear);
        
        const weeklyResponse = await axios.get(`https://saintefamilleexcellence.ci/api/students/${childId}/weekly-schedule?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Status hebdomadaire:', weeklyResponse.status);
        console.log('Data hebdomadaire:', weeklyResponse.data);
        console.log('Nombre d\'emplois hebdomadaires:', weeklyResponse.data.length);
        
        if (isMounted) {
          const officialData = officialResponse.data.schedule || [];
          const weeklyData = weeklyResponse.data || [];
          
          console.log('=== DEBUG SCHEDULES ===');
          console.log('Official Schedule:', officialData);
          console.log('Weekly Schedule:', weeklyData);
          console.log('Official Schedule IDs:', officialData.map((s: any) => s.id));
          console.log('Weekly Schedule IDs:', weeklyData.map((s: any) => s.id));
          console.log('hasOfficialSchedule:', officialData.length > 0);
          console.log('hasWeeklySchedule:', weeklyData.length > 0);
          console.log('Official Schedule length:', officialData.length);
          console.log('Weekly Schedule length:', weeklyData.length);
          
          setOfficialSchedule(officialData);
          setWeeklySchedule(weeklyData);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('=== ERREUR API ===');
        console.error('Erreur complète:', err);
        if (err.response) {
          console.error('Status:', err.response.status);
          console.error('Data:', err.response.data);
          console.error('Headers:', err.response.headers);
        } else if (err.request) {
          console.error('Pas de réponse reçue:', err.request);
        } else {
          console.error('Erreur de configuration:', err.message);
        }
        if (isMounted) {
          setOfficialSchedule([]);
          setWeeklySchedule([]);
          setLoading(false);
        }
      }
    };
    
    if (childId && schoolYear) fetchSchedules();
    
    return () => {
      isMounted = false;
    };
  }, [childId, schoolYear]);

  const renderSchedule = (schedule: any[], title: string, color: string) => {
    console.log(`🔍 [renderSchedule] Appelé avec:`, { title, color, scheduleLength: schedule.length });
    
    if (!schedule.length) {
      console.log(`🔍 [renderSchedule] Aucun emploi du temps pour: ${title}`);
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography color="text.secondary">
            Aucun emploi du temps disponible.
          </Typography>
        </Box>
      );
    }

    console.log(`🔍 [renderSchedule] Rendu de ${schedule.length} cours pour: ${title}`);
    
    return (
      <Box>
        <Typography variant="h6" mb={2} align="center" sx={{ color: color, fontWeight: 700, fontSize: isMobile ? '1rem' : '1.25rem' }}>
          {title}
        </Typography>
        <Typography align="center" color="primary" fontWeight={600} fontSize={isMobile ? 18 : 22} mb={1}>
          {schedule[0]?.class_name && `Emploi du Temps - ${schedule[0].class_name}`}
        </Typography>
        <Typography align="center" color="secondary" fontSize={isMobile ? 14 : 16} mb={3}>
          Année scolaire {schoolYear}
        </Typography>
        
        <OfficialScheduleTable 
          schedule={schedule} 
          title={`Emploi du Temps Officiel - ${schedule[0]?.class_name || 'Classe'}`}
        />
      </Box>
    );
  };


  const renderWeeklySchedule = (schedule: any[], title: string, color: string) => {
    console.log(`🔍 [renderWeeklySchedule] Appelé avec:`, { title, color, scheduleLength: schedule.length });
    console.log(`🔍 [renderWeeklySchedule] Premier emploi du temps:`, schedule[0]);
    console.log(`🔍 [renderWeeklySchedule] Titre de l'emploi du temps:`, schedule[0]?.title);
    
    if (!schedule.length) {
      console.log(`🔍 [renderWeeklySchedule] Aucun emploi du temps hebdomadaire pour: ${title}`);
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>
            Aucun emploi du temps hebdomadaire disponible.
          </Typography>
        </Box>
      );
    }

    console.log(`🔍 [renderWeeklySchedule] Rendu de ${schedule.length} cours hebdomadaires pour: ${title}`);
    
    return (
      <Box>
        <Typography variant="h6" mb={2} align="center" sx={{ color: color, fontWeight: 700, fontSize: isMobile ? '1rem' : '1.25rem' }}>
          {title}
        </Typography>
        <Typography align="center" color="primary" fontWeight={600} fontSize={isMobile ? 18 : 22} mb={1}>
          {schedule[0]?.title || (schedule[0]?.class_name && `Emploi du Temps - ${schedule[0].class_name}`)}
        </Typography>
        <Typography align="center" color="secondary" fontSize={isMobile ? 14 : 16} mb={3}>
          Année scolaire {schoolYear}
        </Typography>
        
        <WeeklyScheduleTable 
          schedule={schedule} 
          title={schedule[0]?.title || `Emploi du Temps Hebdomadaire - ${schedule[0]?.class_name || 'Classe'}`}
        />
      </Box>
    );
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  const hasOfficialSchedule = officialSchedule.length > 0;
  const hasWeeklySchedule = weeklySchedule.length > 0;

  console.log('=== DEBUG TABS ===');
  console.log('hasOfficialSchedule:', hasOfficialSchedule);
  console.log('hasWeeklySchedule:', hasWeeklySchedule);
  console.log('Official schedule data:', officialSchedule);
  console.log('Weekly schedule data:', weeklySchedule);

  if (!hasOfficialSchedule && !hasWeeklySchedule) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CalendarTodayIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Aucun emploi du temps disponible
        </Typography>
        <Typography color="text.secondary">
          Aucune information disponible pour votre enfant en cette année scolaire.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Affichage des deux emplois du temps côte à côte */}
      <Grid container spacing={4}>
        {/* Emploi du temps officiel */}
        {hasOfficialSchedule && (
          <Grid item xs={12} lg={6}>
            {renderSchedule(officialSchedule, 'Emploi du Temps Officiel (Administration)', '#1976d2')}
          </Grid>
        )}
        
        {/* Emploi du temps hebdomadaire */}
        {hasWeeklySchedule && (
          <Grid item xs={12} lg={6}>
            {renderWeeklySchedule(weeklySchedule, 'Emploi du Temps Hebdomadaire (Enseignant)', '#7b1fa2')}
          </Grid>
        )}
      </Grid>

      {/* Messages informatifs */}
      {hasWeeklySchedule && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Emploi du temps hebdomadaire :</strong> Cet emploi du temps est créé et publié par les enseignants 
            pour informer les parents des activités spécifiques de la semaine.
          </Typography>
        </Alert>
      )}
      
      {/* Message d'explication quand il n'y a qu'un seul emploi du temps */}
      {hasOfficialSchedule && !hasWeeklySchedule && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Information :</strong> Seul l'emploi du temps officiel est disponible pour le moment. 
            L'emploi du temps hebdomadaire apparaîtra ici quand un enseignant le créera et le publiera.
          </Typography>
        </Alert>
      )}
      
      {/* Message quand aucun emploi du temps hebdomadaire n'est disponible */}
      {!hasWeeklySchedule && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Information :</strong> Aucun emploi du temps hebdomadaire publié n'est disponible pour le moment. 
            Les enseignants peuvent créer et publier des emplois du temps hebdomadaires qui apparaîtront ici.
          </Typography>
        </Alert>
      )}
      
      {/* Message quand aucun emploi du temps officiel n'est disponible */}
      {!hasOfficialSchedule && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Information :</strong> Aucun emploi du temps officiel n'est disponible pour le moment. 
            L'administration peut créer des emplois du temps officiels qui apparaîtront ici.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default ScheduleTab; 

