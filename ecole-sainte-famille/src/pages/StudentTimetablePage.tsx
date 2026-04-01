import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert, Stack,
  Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Interfaces
interface ScheduleEntry {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_first_name: string;
  teacher_last_name: string;
}

interface StudentInfo {
    class_id: number;
    class_name: string;
}

// Helpers
const getSubjectColors = (str: string) => {
  let hash = 0;
  if (str.length === 0) return { bg: 'hsl(210, 20%, 98%)', border: 'hsl(210, 20%, 90%)', text: 'hsl(210, 20%, 40%)' };
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return {
    bg: `hsl(${h}, 80%, 96%)`,
    border: `hsl(${h}, 60%, 86%)`,
    text: `hsl(${h}, 50%, 45%)`,
  };
};

const daysOfWeek = ["Saturday", "Sunday"];
const frenchDays: { [key: string]: string } = {
  "Saturday": "Samedi",
  "Sunday": "Dimanche",
};
const timeSlots = [
  "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
  "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00"
];

// Helpers pour l'année scolaire
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
function getSchoolYears(count = 5) {
  const current = getCurrentSchoolYear();
  const startYear = parseInt(current.split('-')[0], 10);
  return Array.from({ length: count }, (_, i) => {
    const start = startYear - i;
    return `${start}-${start + 1}`;
  });
}
const SCHOOL_YEARS = getSchoolYears(5);

const StudentTimetablePage = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());

  const fetchTimetable = useCallback(async (token: string, classId: number) => {
    try {
      const scheduleRes = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/class/${classId}?school_year=${schoolYear}`, { headers: { Authorization: `Bearer ${token}` } });
      setSchedule(scheduleRes.data);
    } catch (scheduleErr) {
      console.warn("Avertissement: Impossible de charger l'emploi du temps.", scheduleErr);
      setError("L'emploi du temps de votre classe n'est pas encore disponible. Veuillez revenir plus tard.");
      setSchedule([]);
    }
  }, [schoolYear]);

  useEffect(() => {
    let isMounted = true;
    
    const token = localStorage.getItem('token');
    if (!token) {
        if (isMounted) navigate('/login');
        return;
    }
    
    const fetchStudentInfo = async () => {
        try {
            const res = await axios.get(`https://saintefamilleexcellence.ci/api/auth/me?school_year=${schoolYear}`, { headers: { Authorization: `Bearer ${token}` } });
            if (!isMounted) return;
            
            if (res.data.student && res.data.student.class_id) {
                setStudentInfo({ class_id: res.data.student.class_id, class_name: res.data.student.class_name });
                await fetchTimetable(token, res.data.student.class_id);
            } else {
                if (isMounted) setError("Informations sur la classe non trouvées. Impossible de charger l'emploi du temps.");
            }
        } catch (err) {
            if (isMounted) setError("Erreur lors de la récupération de vos informations.");
        } finally {
            if (isMounted) setLoading(false);
        }
    };

    fetchStudentInfo();
    
    return () => {
      isMounted = false;
    };
  }, [navigate, fetchTimetable]);

  const renderCellContent = (day: string, timeSlot: string) => {
    const [start_time] = timeSlot.split(' - ');
    const entry = schedule.find(e => e.day_of_week === day && e.start_time.startsWith(start_time));

    if (entry) {
      const colors = getSubjectColors(entry.subject_name);
      return (
        <Paper 
            elevation={0}
            sx={{ p: 1, height: '100%', bgcolor: colors.bg, borderLeft: `4px solid ${colors.border}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRadius: '4px' }}
        >
            <Typography variant="body2" fontWeight="bold" sx={{color: colors.text, lineHeight: 1.25}} noWrap>{entry.subject_name}</Typography>
            <Typography variant="caption" sx={{color: colors.text, opacity: 0.8}}>{entry.teacher_first_name} {entry.teacher_last_name}</Typography>
        </Paper>
      );
    }
    return null;
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress size={60} /></Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: '#f7f9fc' }}>
      <Box component="main" sx={{ p: 3, flexGrow: 1 }}>
        <Container maxWidth="xl">
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }} flexWrap="wrap" gap={2}>
            <Typography variant="h4" fontWeight="bold">Mon Emploi du temps : <span style={{ color: '#0277bd' }}>{studentInfo?.class_name}</span></Typography>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/student/dashboard')}>Retour au tableau de bord</Button>
          </Stack>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <FormControl sx={{ minWidth: 160 }} size="small">
              <InputLabel id="school-year-label">Année scolaire</InputLabel>
              <Select
                labelId="school-year-label"
                value={schoolYear}
                label="Année scolaire"
                onChange={e => setSchoolYear(e.target.value)}
              >
                {SCHOOL_YEARS.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

          {!error && (
            <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Table stickyHeader sx={{ minWidth: 900, borderCollapse: 'separate', borderSpacing: 0 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f1f3f5', border: '1px solid #dee2e6' }}>Heure</TableCell>
                            {daysOfWeek.map(day => (
                                <TableCell key={day} align="center" sx={{ fontWeight: 'bold', bgcolor: '#f1f3f5', textTransform: 'uppercase', fontSize: '0.8rem', border: '1px solid #dee2e6' }}>
                                    {frenchDays[day]}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {timeSlots.map((ts) => (
                            <TableRow key={ts}>
                                <TableCell component="th" scope="row" sx={{ fontWeight: 'bold', bgcolor: '#fff', border: '1px solid #dee2e6' }}>
                                    {ts}
                                </TableCell>
                                {daysOfWeek.map(day => (
                                    <TableCell key={day} sx={{ p: 0.5, height: '95px', border: '1px solid #e9ecef' }}>
                                        {renderCellContent(day, ts)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
          )}
        </Container>
      </Box>
    </Box>
  );
};

export default StudentTimetablePage; 

