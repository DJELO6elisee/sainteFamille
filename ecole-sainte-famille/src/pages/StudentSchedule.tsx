import React, { useEffect, useState, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ScheduleItem {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  subject_name: string;
  teacher_first_name: string;
  teacher_last_name: string;
  subject_id: number;
  teacher_id: number;
}

interface ScheduleData {
  class_name: string;
  schedule: ScheduleItem[];
  message?: string;
}

const daysOfWeek = ['SAMEDI', 'DIMANCHE'];
const timeSlots = [
  { start: '08:00', end: '09:00' },
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:00', end: '12:00' },
  { start: '12:00', end: '13:00' },
  { start: '13:00', end: '14:00' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
  { start: '16:00', end: '17:00' },
  { start: '17:00', end: '18:00' }
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

const StudentSchedule = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());

  useEffect(() => {
    let isMounted = true;
    
    const fetchSchedule = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`https://saintefamilleexcellence.ci/api/students/${studentId}/schedule?school_year=${schoolYear}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) {
          setScheduleData(response.data);
          console.log('Données emploi du temps reçues:', response.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Erreur lors de la récupération de l\'emploi du temps');
          console.error('Erreur:', err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchSchedule();
    
    return () => {
      isMounted = false;
    };
  }, [studentId, schoolYear]);

  const handleDownload = async () => {
    if (!scheduleRef.current) return;
    try {
      const canvas = await html2canvas(scheduleRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      const imgData = canvas.toDataURL('image/png');
      // Conversion px -> mm : 1px = 0.264583 mm
      const pdf = new jsPDF('landscape', 'mm', [canvas.width * 0.264583, canvas.height * 0.264583]);
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width * 0.264583, canvas.height * 0.264583);
      pdf.save(`emploi-du-temps-${scheduleData?.class_name}.pdf`);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Fonction de normalisation pour comparer les jours
  const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Mapping des jours pour la normalisation
  const dayMapping: { [key: string]: string } = {
    'monday': 'lundi',
    'tuesday': 'mardi', 
    'wednesday': 'mercredi',
    'thursday': 'jeudi',
    'friday': 'vendredi',
    'saturday': 'samedi',
    'sunday': 'dimanche'
  };

  // Trouver le cours pour un créneau et un jour (plus souple)
  const getCourseForCell = (day: string, slot: { start: string; end: string }) => {
    if (!scheduleData) return null;
    return scheduleData.schedule.find(
      (item) => {
        // Normalisation du jour avec mapping
        const itemDay = normalize(item.day_of_week);
        const gridDay = normalize(day);
        const mappedItemDay = dayMapping[itemDay] || itemDay;
        
        // Gestion des formats d'heure (08:00 ou 08:00:00)
        const itemStart = item.start_time.substring(0, 5);
        const itemEnd = item.end_time.substring(0, 5);
        
        console.log(`[getCourseForCell] Comparaison: ${mappedItemDay} vs ${gridDay}, ${itemStart} vs ${slot.start}, ${itemEnd} vs ${slot.end}`);
        
        return mappedItemDay === gridDay && itemStart === slot.start && itemEnd === slot.end;
      }
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/student/dashboard')}>
          Retour au dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)', fontFamily: "'Poppins', sans-serif" }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: { xs: 2, sm: 4 } }} spacing={{ xs: 2, sm: 0 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: { xs: 1, sm: 0 } }}>
            <IconButton onClick={() => navigate('/student/dashboard')} sx={{ color: 'primary.main' }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" fontWeight={700} sx={{ color: 'primary.main', fontSize: { xs: 22, sm: 32 } }}>
                Mon Emploi du Temps
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" sx={{ fontSize: { xs: 15, sm: 20 } }}>
                {scheduleData?.class_name}
              </Typography>
            </Box>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: { sm: 'flex-end' } }}>
            <Button variant="outlined" startIcon={<DownloadIcon sx={{ fontSize: 26 }} />} onClick={handleDownload} sx={{ borderRadius: 3, fontWeight: 700, fontSize: { xs: 15, sm: 17 }, boxShadow: '0 2px 8px #e3f2fd', px: 3, py: 1.2, transition: 'all 0.2s', '&:hover': { bgcolor: '#e3f2fd' } }}>
              Télécharger PDF
            </Button>
            <Button variant="contained" startIcon={<PrintIcon sx={{ fontSize: 26 }} />} onClick={handlePrint} sx={{ borderRadius: 3, fontWeight: 700, fontSize: { xs: 15, sm: 17 }, boxShadow: '0 2px 8px #e3f2fd', px: 3, py: 1.2, transition: 'all 0.2s', '&:hover': { bgcolor: 'primary.light' } }}>
              Imprimer
            </Button>
          </Stack>
        </Stack>
        {scheduleData?.message && (
          <Alert severity="info" sx={{ mb: 3 }}>{scheduleData.message}</Alert>
        )}
        {/* Message d'info mobile */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
          <Alert severity="info" icon={false} sx={{ fontSize: 13, p: 1.2 }}>
            Faites défiler horizontalement pour voir tout l'emploi du temps.
          </Alert>
        </Box>
        {/* Grille emploi du temps */}
        <Box ref={scheduleRef} sx={{
          background: 'white',
          borderRadius: 4,
          p: { xs: 1, sm: 4 },
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          overflowX: 'auto',
          width: '100%',
          maxWidth: '100vw',
          border: '1.5px solid #e3e8f0',
          '@media print': { boxShadow: 'none', borderRadius: 0, overflowX: 'visible', width: '100%' }
        }}>
          {/* Logo stylisé */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mb: 2 }}>
            <Box sx={{
              width: 120,
              height: 60,
              bgcolor: 'white',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 22,
              color: 'primary.main',
              border: '2px solid #1976d2',
              boxShadow: '0 2px 12px rgba(25, 118, 210, 0.10)',
              letterSpacing: 1,
              px: 2,
              py: 1,
              '@media print': { bgcolor: 'white !important' }
            }}>
              LOGO ÉCOLE
            </Box>
          </Box>
          {/* Titre principal stylisé */}
          <Typography variant="h4" fontWeight={800} sx={{ mb: 1, textAlign: 'center', color: 'primary.main', letterSpacing: 1, textShadow: '0 2px 8px #e3f2fd', fontSize: { xs: 22, sm: 32 } }}>
            Emploi du Temps - {scheduleData?.class_name}
          </Typography>
          <Typography variant="subtitle1" sx={{ textAlign: 'center', color: 'secondary.main', mb: 3, fontWeight: 500, fontSize: { xs: 14, sm: 18 } }}>
            Année scolaire 2024-2025
          </Typography>
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
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 900, background: 'white', borderRadius: 12, boxShadow: '0 4px 24px rgba(25,118,210,0.07)' }}>
              <thead>
                <tr>
                  <th style={{ border: '1.5px solid #e0e0e0', background: '#f5f5f5', padding: 10, minWidth: 90, fontWeight: 800, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' }}>Heure</th>
                  {daysOfWeek.map((day) => (
                    <th key={day} style={{ border: '1.5px solid #e0e0e0', background: '#f5f5f5', padding: 10, minWidth: 120, fontWeight: 800, fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' }}>{day.charAt(0) + day.slice(1).toLowerCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot.start + '-' + slot.end}>
                    <td style={{ border: '1.5px solid #e0e0e0', background: '#fafafa', padding: 10, fontWeight: 700, minWidth: 90, fontSize: 15, letterSpacing: 1 }}>{slot.start} - {slot.end}</td>
                    {daysOfWeek.map((day) => {
                      const course = getCourseForCell(day, slot);
                      return (
                        <td key={day + slot.start} style={{ border: '1.5px solid #e0e0e0', minWidth: 120, padding: 0, background: '#fff' }}>
                          {course ? (
                            <Box sx={{
                              bgcolor: '#f8bbd0',
                              borderRadius: 2.5,
                              m: 0.7,
                              p: 1.2,
                              minHeight: 50,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              justifyContent: 'center',
                              fontWeight: 700,
                              boxShadow: '0 2px 8px #f8bbd0',
                              border: '1.5px solid #ad1457',
                              transition: 'transform 0.15s',
                              '&:hover': { transform: 'scale(1.04)', boxShadow: '0 4px 16px #f8bbd0' }
                            }}>
                              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#ad1457', mb: 0.5, fontSize: 15, letterSpacing: 0.5 }}>
                                {course.subject_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: 13 }}>
                                {course.teacher_first_name} {course.teacher_last_name}
                              </Typography>
                            </Box>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      </Container>
      <style>
        {`
          @media print {
            body { margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .MuiContainer-root { max-width: none !important; }
            .MuiButton-root, .MuiIconButton-root, .MuiStack-root[role='toolbar'], .MuiAppBar-root, .MuiToolbar-root, nav, header { display: none !important; }
            table { width: 100% !important; min-width: 1000px !important; table-layout: fixed !important; }
            th, td { min-width: 120px !important; max-width: 200px !important; word-break: break-word; font-size: 13px !important; padding: 8px !important; }
            .MuiBox-root { overflow-x: visible !important; width: 100% !important; }
          }
          @media (max-width: 900px) {
            table { min-width: 600px !important; font-size: 11px !important; }
            th, td { min-width: 70px !important; font-size: 11px !important; padding: 3px !important; }
            .MuiTypography-h5 { font-size: 18px !important; }
            .MuiTypography-subtitle1 { font-size: 13px !important; }
          }
        `}
      </style>
    </Box>
  );
};

export default StudentSchedule; 

