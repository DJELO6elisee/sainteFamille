import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert, MenuItem, Select, InputLabel, FormControl, Container, Stack, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Grid, IconButton, Chip, FormControlLabel, Switch, ToggleButtonGroup, ToggleButton, Fade, Badge, Popover, List, ListItem, ListItemText, ListItemSecondaryAction, CircularProgress
} from '@mui/material';
import axios from 'axios';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ApartmentIcon from '@mui/icons-material/Apartment';
import ScheduleIcon from '@mui/icons-material/Schedule';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PublishIcon from '@mui/icons-material/Publish';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoIcon from '@mui/icons-material/Photo';
import VideoIcon from '@mui/icons-material/Videocam';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import GradeIcon from '@mui/icons-material/Grade';
import { useNavigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import UpdateButton from '../components/UpdateButton';

interface Class {
  id: number;
  name: string;
  level_name?: string;
  level?: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
}

interface Grade {
  id: number;
  grade: number;
  semester: string;
  academic_year: string;
  created_at: string;
  class_id: number;
  student_id: number;
  subject_id: number;
  coefficient?: number;
  is_published: boolean;
}

interface Subject { 
  id: number; 
  name: string; 
  created_at?: string; 
}

interface Absence {
  id?: number;
  student_id: number;
  class_id: number;
  subject_id: number;
  teacher_id: number;
  date: string;
  status: 'excused' | 'unexcused';
  duration_hours?: number;
}

type AbsenceState = Map<number, { 
  status: 'present' | 'absent'; 
  justified: boolean; 
  initialStatus: 'present' | 'absent'; 
  duration_hours: number 
}>;

interface ScheduleEntry {
  id: number;
  day_of_week: string;
  start_time?: string;
  end_time?: string;
  start_date: string;
  end_date: string;
  course_description: string;
  title?: string;
  domain?: string;
  subject_id?: number;
  is_published: boolean;
  class_name?: string;
  subject_name?: string;
  is_weekly_schedule: boolean;
}

interface WeeklyScheduleEntry extends ScheduleEntry {
  teacher_id: number;
  class_id: number;
  school_year: string;
}




// Composant modal pour créer l'emploi du temps hebdomadaire par domaines
const CreateScheduleModal = ({ 
  open, 
  onClose, 
  selectedClass, 
  selectedSchoolYear,
  onSubmit 
}: {
  open: boolean;
  onClose: () => void;
  selectedClass: Class | null;
  selectedSchoolYear: string;
  onSubmit: (startDate: Date, endDate: Date, description: string, dayOfWeek: string, domain: string, title: string) => void;
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('Monday');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'next'>('current');

  // Domaines d'activités
  const domains = [
    { key: 'rituel', label: 'RITUEL', color: '#f5f5f5' },
    { key: 'langage_oral', label: 'LANGAGE ORAL', color: '#ff9800' },
    { key: 'langage_ecrit', label: 'LANGAGE ÉCRIT', color: '#2196f3' },
    { key: 'activite_motrice', label: 'ACTIVITÉ MOTRICE', color: '#4caf50' },
    { key: 'activite_artistique', label: 'ACTIVITÉ ARTISTIQUE', color: '#ffeb3b' },
    { key: 'eveil_mathematique', label: 'ÉVEIL MATHÉMATIQUE', color: '#f44336' },
    { key: 'explorer_monde', label: 'EXPLORER LE MONDE', color: '#9c27b0' }
  ];

  // Exemples d'activités par domaine
  const domainExamples = {
    rituel: ['Rituel du matin', 'Rituel de fin de journée', 'Rituel de transition'],
    langage_oral: ['Exploitation d\'un livre', 'Débat philosophique', 'Comptine', 'Histoire racontée'],
    langage_ecrit: ['Les traits verticaux', 'Le trait oblique', 'Ecrire la lettre A', 'Les lignes brisées'],
    activite_motrice: ['Jeu de course', 'Parcours d\'obstacles', 'Danse', 'Jeu de ballon'],
    activite_artistique: ['Peinture', 'Collage', 'Réalisation du cahier de vie', 'Dessin libre'],
    eveil_mathematique: ['Dénombrement', 'Reconnaissance des couleurs', 'Comparaison de tailles', 'Tri d\'objets'],
    explorer_monde: ['Découverte de la nature', 'Expérience scientifique', 'Observation d\'objets', 'Manipulation']
  };

  const handleWeekChange = (week: 'current' | 'next') => {
    setSelectedWeek(week);
    
    // Calculer les dates selon la semaine sélectionnée
    const today = new Date();
    let monday: Date;
    
    if (week === 'current') {
      // Semaine courante (lundi au dimanche)
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lundi = 1
      monday = new Date(today);
      monday.setDate(diff);
    } else {
      // Semaine suivante
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      monday = new Date(today);
      monday.setDate(diff + 7); // Ajouter 7 jours pour la semaine suivante
    }
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // Dimanche = lundi + 6 jours
    
    setStartDate(monday);
    setEndDate(sunday);
    
    // Charger le titre existant pour cette nouvelle semaine
    const loadTitleForWeek = async () => {
      if (!selectedClass) return;
      
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/weekly-schedule/${selectedClass.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { school_year: selectedSchoolYear }
        });
        
        // Trouver les activités pour cette semaine
        const startDateStr = monday.toISOString().split('T')[0];
        const endDateStr = sunday.toISOString().split('T')[0];
        
        const existingForWeek = data.filter((schedule: any) => {
          const scheduleStart = new Date(schedule.start_date);
          const scheduleEnd = new Date(schedule.end_date);
          const scheduleStartStr = `${scheduleStart.getFullYear()}-${String(scheduleStart.getMonth() + 1).padStart(2, '0')}-${String(scheduleStart.getDate()).padStart(2, '0')}`;
          const scheduleEndStr = `${scheduleEnd.getFullYear()}-${String(scheduleEnd.getMonth() + 1).padStart(2, '0')}-${String(scheduleEnd.getDate()).padStart(2, '0')}`;
          return scheduleStartStr === startDateStr && scheduleEndStr === endDateStr;
        });
        
        if (existingForWeek.length > 0 && existingForWeek[0].title) {
          setTitle(existingForWeek[0].title);
          console.log('Titre chargé pour la semaine:', existingForWeek[0].title);
        } else {
          setTitle(''); // Réinitialiser le titre si aucune activité n'existe pour cette semaine
        }
      } catch (err) {
        console.error('Erreur lors du chargement du titre pour la semaine:', err);
      }
    };
    
    loadTitleForWeek();
  };

  // Initialiser les dates quand le modal s'ouvre
  useEffect(() => {
    if (open) {
      handleWeekChange('current');
      setDescription('');
      setTitle('');
      setDayOfWeek('Monday');
      setSelectedDomain('');
      
      // Charger le titre existant pour cette semaine si des activités existent déjà
      const loadExistingTitle = async () => {
        if (!selectedClass) return;
        
        try {
          const token = localStorage.getItem('token');
          const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/weekly-schedule/${selectedClass.id}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { school_year: selectedSchoolYear }
          });
          
          // Trouver les activités pour la semaine sélectionnée
          const startDateStr = startDate?.toISOString().split('T')[0];
          const endDateStr = endDate?.toISOString().split('T')[0];
          
          if (startDateStr && endDateStr) {
            const existingForWeek = data.filter((schedule: any) => {
              const scheduleStart = new Date(schedule.start_date);
              const scheduleEnd = new Date(schedule.end_date);
              const scheduleStartStr = `${scheduleStart.getFullYear()}-${String(scheduleStart.getMonth() + 1).padStart(2, '0')}-${String(scheduleStart.getDate()).padStart(2, '0')}`;
              const scheduleEndStr = `${scheduleEnd.getFullYear()}-${String(scheduleEnd.getMonth() + 1).padStart(2, '0')}-${String(scheduleEnd.getDate()).padStart(2, '0')}`;
              return scheduleStartStr === startDateStr && scheduleEndStr === endDateStr;
            });
            
            if (existingForWeek.length > 0 && existingForWeek[0].title) {
              setTitle(existingForWeek[0].title);
              console.log('Titre existant chargé:', existingForWeek[0].title);
            }
          }
        } catch (err) {
          console.error('Erreur lors du chargement du titre existant:', err);
        }
      };
      
      loadExistingTitle();
    }
  }, [open, selectedClass]);

  const handleDomainChange = (domainKey: string) => {
    setSelectedDomain(domainKey);
    // Suggérer une activité basée sur le domaine
    const examples = domainExamples[domainKey as keyof typeof domainExamples] || [];
    if (examples.length > 0) {
      setDescription(examples[0]);
    }
  };

  // Fonction locale pour obtenir l'année scolaire actuelle
  const getCurrentSchoolYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // Si on est après août, l'année scolaire commence cette année
    if (month >= 9) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  };



  const handleSubmit = () => {
    if (startDate && endDate) {
      onSubmit(startDate, endDate, description, dayOfWeek, selectedDomain, title);
    }
  };

  const handleClose = () => {
    setStartDate(null);
    setEndDate(null);
    setDescription('');
    setTitle('');
    setDayOfWeek('Monday');
    setSelectedDomain('');
    setSelectedWeek('current');
    onClose();
  };

  if (!open) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
      onClick={handleClose}
    >
      <Paper
        sx={{
          maxWidth: 800,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          p: 3
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography variant="h6" fontWeight={700} mb={3}>
          Créer un emploi du temps hebdomadaire pour {selectedClass?.name}
        </Typography>
        
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
          <Stack spacing={3}>
            {/* Sélection de la semaine */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Sélectionner la semaine :
              </Typography>
              <ToggleButtonGroup
                value={selectedWeek}
                exclusive
                onChange={(e, newValue) => newValue && handleWeekChange(newValue)}
                fullWidth
                sx={{ mb: 2 }}
              >
                <ToggleButton value="current" sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Semaine courante
                  </Typography>
                </ToggleButton>
                <ToggleButton value="next" sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    Semaine suivante
                  </Typography>
                </ToggleButton>
              </ToggleButtonGroup>
              
              {startDate && endDate && (
                <Paper sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
                  <Typography variant="body2" fontWeight={600} align="center">
                    {selectedWeek === 'current' ? 'Semaine courante' : 'Semaine suivante'} : 
                    {startDate.toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })} - {endDate.toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })} {endDate.getFullYear()}
                  </Typography>
                </Paper>
              )}
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date de début (Lundi)"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: 'Sélectionnez le lundi de la semaine'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date de fin (Dimanche)"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: 'Sélectionnez le dimanche de la semaine'
                    }
                  }}
                />
              </Grid>
            </Grid>

            <FormControl fullWidth>
              <InputLabel>Jour de la semaine</InputLabel>
              <Select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                label="Jour de la semaine"
              >
                <MenuItem value="Monday">Lundi</MenuItem>
                <MenuItem value="Tuesday">Mardi</MenuItem>
                <MenuItem value="Wednesday">Mercredi</MenuItem>
                <MenuItem value="Thursday">Jeudi</MenuItem>
                <MenuItem value="Friday">Vendredi</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Titre de l'emploi du temps"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Emploi du temps de la semaine du 11 au 17 août"
              helperText="Ce titre sera unique pour toute la semaine et s'appliquera à toutes les activités créées"
              fullWidth
            />

            <Box>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Sélectionner un domaine d'activité :
              </Typography>
              <Grid container spacing={1}>
                {domains.map((domain) => (
                  <Grid item xs={12} sm={6} md={4} key={domain.key}>
                    <Paper
                      elevation={selectedDomain === domain.key ? 4 : 1}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: selectedDomain === domain.key ? '2px solid #1976d2' : '2px solid transparent',
                        backgroundColor: selectedDomain === domain.key ? `${domain.color}20` : 'white',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2
                        }
                      }}
                      onClick={() => handleDomainChange(domain.key)}
                    >
                      <Typography variant="body2" fontWeight={600} align="center">
                        {domain.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {selectedDomain && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                  Exemples d'activités pour {domains.find(d => d.key === selectedDomain)?.label} :
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {domainExamples[selectedDomain as keyof typeof domainExamples]?.map((example, index) => (
                    <Chip
                      key={index}
                      label={example}
                      size="small"
                      onClick={() => setDescription(example)}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <TextField
              label="Description de l'activité"
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'activité spécifique pour ce jour et ce domaine..."
              helperText="Cette description sera automatiquement classée dans le bon domaine"
            />
          </Stack>
        </LocalizationProvider>
        
        <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'flex-end' }}>
          <Button onClick={handleClose} color="inherit">
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={!startDate || !endDate || !description.trim() || !dayOfWeek || !title.trim()}
          >
            Créer l'activité
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

const TeacherDashboard = () => {
  const [teacher, setTeacher] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' 
  });
  const [coefficient, setCoefficient] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [subjectClasses, setSubjectClasses] = useState<Class[]>([]);
  const [viewStep, setViewStep] = useState<'subjects' | 'classes' | 'students'>('subjects');
  const [cameFromClassesList, setCameFromClassesList] = useState(false);
  const [classAbsences, setClassAbsences] = useState<Absence[]>([]);
  const [absenceChanges, setAbsenceChanges] = useState<{ [key: number]: { status: 'present' | 'excused' | 'unexcused'; duration: number } }>({});
  const [openAbsenceDialog, setOpenAbsenceDialog] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceData, setAbsenceData] = useState<AbsenceState>(new Map());
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedClassForSchedule, setSelectedClassForSchedule] = useState<Class | null>(null);
  const [weeklySchedules, setWeeklySchedules] = useState<{[key: number]: WeeklyScheduleEntry[]}>({});
  const [showWeeklyScheduleDialog, setShowWeeklyScheduleDialog] = useState(false);
  const [selectedWeekForView, setSelectedWeekForView] = useState<'current' | 'next'>('current');
  const [showWeeklyScheduleMobile, setShowWeeklyScheduleMobile] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: number;
    title: string;
    message: string;
    date: Date;
    read: boolean;
  }>>([]);
  const [anchorNotif, setAnchorNotif] = useState<null | HTMLElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaDescription, setMediaDescription] = useState('');
  const [openMediaModal, setOpenMediaModal] = useState(false);
  const [selectedStudentForMedia, setSelectedStudentForMedia] = useState<number | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSuccess, setMediaSuccess] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [openBulkMediaModal, setOpenBulkMediaModal] = useState(false);
  const [bulkMediaType, setBulkMediaType] = useState<'photo' | 'video'>('photo');
  const [bulkMediaFile, setBulkMediaFile] = useState<File | null>(null);
  const [bulkMediaCaption, setBulkMediaCaption] = useState('');
  const [bulkMediaLoading, setBulkMediaLoading] = useState(false);
  const [selectedStudentsForBulk, setSelectedStudentsForBulk] = useState<number[]>([]);
  const [selectAllStudents, setSelectAllStudents] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingOfficialSchedule, setLoadingOfficialSchedule] = useState(false);
  const [loadingAbsences, setLoadingAbsences] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleEntry[]>([]);
  const [loadingWeeklySchedule, setLoadingWeeklySchedule] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
  const [loadingTeacherClasses, setLoadingTeacherClasses] = useState(false);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState<string>('');
  const navigate = useNavigate();

  // Initialiser l'année scolaire par défaut
  useEffect(() => {
    const currentYear = getCurrentSchoolYear();
    setSelectedSchoolYear(currentYear);
  }, []);

  // Charger les informations du professeur
  useEffect(() => {
    let isMounted = true;
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'teacher') {
      const token = localStorage.getItem('token');
      axios.get('https://saintefamilleexcellence.ci/api/teachers/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        if (isMounted) {
          setTeacher(res.data);
          console.log('Professeur connecté:', res.data);
        }
      })
      .catch(err => {
        if (isMounted) {
          setTeacher(null);
          console.error('Erreur lors de la récupération du professeur:', err);
        }
      });
    }
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Charger les matières et classes du professeur
  useEffect(() => {
    let isMounted = true;
    
    if (teacher?.id && selectedSchoolYear) {
      console.log('Chargement des matières pour teacher.id =', teacher.id, 'année scolaire =', selectedSchoolYear);
      fetchMySubjects();
      loadTeacherSchedule(); // Charger l'emploi du temps officiel
      loadTeacherClasses(); // Charger les classes du professeur
      
      // Réinitialiser les données quand l'année scolaire change
      setStudents([]);
      setClassAbsences([]);
      setWeeklySchedule([]);
      setWeeklySchedules({});
      setSelectedClass(null);
      setViewStep('subjects');
    }
    
    return () => {
      isMounted = false;
    };
  }, [teacher?.id, selectedSchoolYear]);



  const fetchMySubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/teachers/${teacher?.id}/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Matières récupérées:', data);
      setSubjects(data);
      
      // Sélectionner automatiquement la première matière si aucune n'est sélectionnée
      if (data.length > 0 && !selectedSubject) {
        setSelectedSubject(data[0].id);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des matières:', err);
      setSubjects([]);
    }
  };

  const loadTeacherClasses = async () => {
    try {
      setLoadingTeacherClasses(true);
      const token = localStorage.getItem('token');
      
      // Charger toutes les classes du professeur connecté
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/teachers/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Classes du professeur récupérées:', data);
      setTeacherClasses(data || []);
    } catch (err) {
      console.error('Erreur lors de la récupération des classes:', err);
      setTeacherClasses([]);
    } finally {
      setLoadingTeacherClasses(false);
    }
  };

  const handleSelectSubject = async (subject: Subject) => {
    setSelectedSubject(subject.id);
    setSelectedClass(null);
    setStudents([]);
    setViewStep('classes');
    
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/teachers/${teacher?.id}/subjects/${subject.id}/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubjectClasses(data);
    } catch (err) {
      console.error('Erreur lors du chargement des classes:', err);
      setSubjectClasses([]);
    }
  };

  const handleSelectClass = async (classe: Class) => {
    console.log('handleSelectClass appelé avec :', classe);
    setSelectedClass(classe);
    setViewStep('students');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSnackbar({ open: true, message: 'Token d\'authentification manquant', severity: 'error' });
        return;
      }
      if (!selectedSubject) {
        setSnackbar({ open: true, message: 'Aucune matière sélectionnée', severity: 'error' });
        return;
      }
      console.log('Chargement des données pour la classe:', classe.id, 'matière:', selectedSubject);
      const studentsPromise = axios.get(`https://saintefamilleexcellence.ci/api/classes/${classe.id}/students`, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      const absencesPromise = axios.get(`https://saintefamilleexcellence.ci/api/absences?class_id=${classe.id}&subject_id=${selectedSubject}&school_year=${selectedSchoolYear}`, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const [studentsRes, absencesRes] = await Promise.all([studentsPromise, absencesPromise]);
      console.log('Élèves chargés :', studentsRes.data);
      setStudents(studentsRes.data);
      setClassAbsences(absencesRes.data);
    } catch (err: any) {
      console.error('Erreur lors du chargement des données:', err);
      const errorMessage = err.response?.data?.message || 'Erreur lors du chargement des élèves';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
      setStudents([]);
      setClassAbsences([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };



  const handleOpenNotif = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorNotif(event.currentTarget);
  };

  const handleCloseNotif = () => {
    setAnchorNotif(null);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleMarkRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMediaUpload = async () => {
    if (!selectedStudentForMedia || !mediaFile) {
      setSnackbar({ open: true, message: 'Veuillez sélectionner un élève et un fichier', severity: 'error' });
      return;
    }

    setMediaLoading(true);
    setMediaError('');
    setMediaSuccess('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', mediaFile);
      formData.append('student_id', selectedStudentForMedia.toString());
      formData.append('type', mediaType);
      formData.append('caption', mediaCaption);

      const response = await axios.post('https://saintefamilleexcellence.ci/api/media/upload', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setMediaSuccess('Média publié avec succès !');
      setOpenMediaModal(false);
      setMediaFile(null);
      setMediaCaption('');
      setSelectedStudentForMedia(null);
    } catch (err: any) {
      console.error('Erreur lors de l\'upload:', err);
      setMediaError(err.response?.data?.message || 'Erreur lors de l\'upload');
    } finally {
      setMediaLoading(false);
    }
  };

  const handleBulkMediaUpload = async () => {
    if (!bulkMediaFile || selectedStudentsForBulk.length === 0) {
      setSnackbar({ open: true, message: 'Veuillez sélectionner un fichier et au moins un élève', severity: 'error' });
      return;
    }

    setBulkMediaLoading(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', bulkMediaFile);
      formData.append('student_ids', JSON.stringify(selectedStudentsForBulk));
      formData.append('type', bulkMediaType);
      formData.append('caption', bulkMediaCaption);

      const response = await axios.post('https://saintefamilleexcellence.ci/api/media/bulk-upload', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSnackbar({ open: true, message: 'Médias publiés avec succès !', severity: 'success' });
      setOpenBulkMediaModal(false);
      setBulkMediaFile(null);
      setBulkMediaCaption('');
      setSelectedStudentsForBulk([]);
    } catch (err: any) {
      console.error('Erreur lors de l\'upload en masse:', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'Erreur lors de l\'upload en masse', severity: 'error' });
    } finally {
      setBulkMediaLoading(false);
    }
  };

  const handleSelectAllStudents = (checked: boolean) => {
    if (checked) {
      setSelectedStudentsForBulk(students.map(s => s.id));
    } else {
      setSelectedStudentsForBulk([]);
    }
    setSelectAllStudents(checked);
  };

  const handleSelectStudent = (studentId: number, checked: boolean) => {
    if (checked) {
      setSelectedStudentsForBulk(prev => [...prev, studentId]);
    } else {
      setSelectedStudentsForBulk(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleOpenAbsenceDialog = () => {
    // Initialiser les absences pour tous les élèves
    const initialAbsences: { [key: number]: { status: 'present' | 'excused' | 'unexcused'; duration: number } } = {};
    
    students.forEach(student => {
      initialAbsences[student.id] = {
        status: 'present',
        duration: 0
      };
    });
    
    setAbsenceChanges(initialAbsences);
    setOpenAbsenceDialog(true);
  };

  const handleAbsenceChange = (studentId: number, field: string, value: any) => {
    setAbsenceChanges(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleSubmitAbsences = async () => {
    if (!selectedClass) {
      setSnackbar({ open: true, message: 'Classe requise', severity: 'error' });
      return;
    }

    setLoadingAbsences(true);

    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      let successCount = 0;
      let errorCount = 0;

      // Traiter chaque élève individuellement
      for (const [studentId, data] of Object.entries(absenceChanges)) {
        try {
          if (data.status === 'present') {
            // Pour les élèves présents, on ne fait rien (pas d'absence à enregistrer)
            // On pourrait supprimer une absence existante si nécessaire
            console.log(`Élève ${studentId} marqué comme présent`);
          } else {
            // Créer une absence
            console.log(`Création d'absence pour l'élève ${studentId}:`, data);
            await axios.post('https://saintefamilleexcellence.ci/api/absences', {
              student_id: parseInt(studentId),
              class_id: selectedClass.id,
              subject_id: selectedSubject || null, // Permettre null si pas de matière spécifique
              teacher_id: teacher.id,
              date: today,
              status: data.status, // 'excused' ou 'unexcused'
              duration_hours: data.duration || 1,
              school_year: selectedSchoolYear
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            successCount++;
          }
        } catch (err: any) {
          console.error(`Erreur pour l'élève ${studentId}:`, err);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        setSnackbar({ open: true, message: `${successCount} absence(s) enregistrée(s) avec succès !`, severity: 'success' });
      } else if (successCount > 0) {
        setSnackbar({ open: true, message: `${successCount} absence(s) enregistrée(s), ${errorCount} erreur(s)`, severity: 'info' });
      } else {
        setSnackbar({ open: true, message: 'Erreur lors de l\'enregistrement des absences', severity: 'error' });
      }

      setOpenAbsenceDialog(false);
      setAbsenceChanges({});
      
      // Recharger les absences
      if (selectedClass) {
        try {
          const { data: absencesData } = await axios.get(`https://saintefamilleexcellence.ci/api/absences?class_id=${selectedClass.id}&school_year=${selectedSchoolYear}`, { 
            headers: { Authorization: `Bearer ${token}` }
          });
          setClassAbsences(absencesData);
        } catch (err) {
          console.error('Erreur lors du rechargement des absences:', err);
        }
      }
    } catch (err: any) {
      console.error('Erreur lors de l\'enregistrement des absences:', err);
      setSnackbar({ open: true, message: err.response?.data?.message || 'Erreur lors de l\'enregistrement des absences', severity: 'error' });
    } finally {
      setLoadingAbsences(false);
    }
  };

  const loadTeacherSchedule = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!teacher?.id || !selectedSchoolYear) return;

      setLoadingOfficialSchedule(true);
      console.log('Chargement de l\'emploi du temps officiel pour le professeur:', teacher.id, 'année scolaire:', selectedSchoolYear);
      
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/teacher/${teacher.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: selectedSchoolYear }
      });
      
      console.log('Emploi du temps officiel récupéré:', data);
      setSchedule(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'emploi du temps:', err);
      setSchedule([]);
    } finally {
      setLoadingOfficialSchedule(false);
    }
  };

  const loadClassWeeklySchedule = async (classId: number) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/weekly-schedule/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: selectedSchoolYear }
      });
      setWeeklySchedule(data);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'emploi du temps hebdomadaire:', err);
    }
  };

  const loadWeeklySchedulesForClass = async (classId: number) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/weekly-schedule/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: selectedSchoolYear }
      });
      setWeeklySchedules(prev => ({
        ...prev,
        [classId]: data
      }));
    } catch (err) {
      console.error('Erreur lors du chargement des emplois du temps hebdomadaires:', err);
    }
  };

  function getCurrentSchoolYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // Si on est après août, l'année scolaire commence cette année
    if (month >= 9) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  function getSchoolYears(count = 5) {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < count; i++) {
      const year = currentYear - i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  }

  function formatHour(time: string) {
    if (!time) return '';
    return time.substring(0, 5);
  }

  const handleOpenScheduleDialog = () => {
    setIsScheduleDialogOpen(true);
  };

  const handleViewAllWeeklySchedules = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!teacher?.id) {
        setSnackbar({ open: true, message: 'Informations du professeur non disponibles', severity: 'error' });
        return;
      }

      // Charger l'emploi du temps officiel du professeur
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/teacher/${teacher.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: selectedSchoolYear }
      });

      if (data && data.length > 0) {
        setWeeklySchedule(data);
        setSelectedClass(null); // Pas de classe spécifique sélectionnée pour l'emploi du temps officiel
        setShowWeeklyScheduleDialog(true);
      } else {
        setSnackbar({ 
          open: true, 
          message: 'Aucun emploi du temps officiel trouvé pour ce professeur', 
          severity: 'info' 
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement de l\'emploi du temps officiel:', err);
      setSnackbar({ 
        open: true, 
        message: 'Erreur lors du chargement de l\'emploi du temps officiel', 
        severity: 'error' 
      });
    }
  };

  const handleViewWeeklySchedule = async (classe: Class) => {
    try {
      const token = localStorage.getItem('token');
      if (!teacher?.id) {
        setSnackbar({ open: true, message: 'Informations du professeur non disponibles', severity: 'error' });
        return;
      }

      console.log(`[handleViewWeeklySchedule] Chargement pour classe ${classe.id}, teacher ${teacher.id}, school_year ${getCurrentSchoolYear()}`);
      
      // Charger les emplois du temps hebdomadaires de cette classe spécifique
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/weekly-schedule/${classe.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: selectedSchoolYear }
      });

      console.log(`[handleViewWeeklySchedule] Données reçues:`, data);
      console.log(`[handleViewWeeklySchedule] Nombre d'entrées:`, data?.length || 0);
      console.log(`[handleViewWeeklySchedule] Type de données:`, typeof data);
      console.log(`[handleViewWeeklySchedule] Est un tableau:`, Array.isArray(data));
      
      // Vérifier que les données sont bien un tableau
      const scheduleData = Array.isArray(data) ? data : [];
      
      // Log détaillé de chaque entrée
      if (scheduleData.length > 0) {
        scheduleData.forEach((entry: any, index: number) => {
          console.log(`[handleViewWeeklySchedule] Entrée ${index + 1}:`, {
            id: entry.id,
            course_description: entry.course_description,
            title: entry.title,
            day_of_week: entry.day_of_week,
            start_date: entry.start_date,
            end_date: entry.end_date,
            domain: entry.domain,
            is_published: entry.is_published,
            is_weekly_schedule: entry.is_weekly_schedule
          });
        });
        
        // Log spécifique pour le titre
        console.log(`[handleViewWeeklySchedule] Titres trouvés:`, scheduleData.map((entry: any) => entry.title));
        console.log(`[handleViewWeeklySchedule] Premier titre:`, scheduleData[0]?.title);
        
        // Log des dates pour vérification
        console.log(`[handleViewWeeklySchedule] Dates des activités:`, scheduleData.map((entry: any) => ({
          description: entry.course_description,
          start_date: entry.start_date,
          end_date: entry.end_date,
          day: entry.day_of_week
        })));
      }

      // Définir d'abord selectedClass, puis les données
      setSelectedClass(classe);
      setWeeklySchedule(scheduleData);
      setSelectedWeekForView('current'); // Réinitialiser à la semaine courante
      
      // Mettre à jour le state weeklySchedules
      setWeeklySchedules(prev => ({
        ...prev,
        [classe.id]: scheduleData
      }));

      // Détecter si c'est un mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        console.log('[handleViewWeeklySchedule] Mode mobile détecté - affichage direct dans la page');
        setShowWeeklyScheduleMobile(true);
        setShowWeeklyScheduleDialog(false);
        
        // Scroll vers le haut de la page pour voir l'emploi du temps
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        console.log('[handleViewWeeklySchedule] Mode desktop - ouverture du modal');
        setShowWeeklyScheduleDialog(true);
        setShowWeeklyScheduleMobile(false);
      }

      console.log(`[handleViewWeeklySchedule] Dialogue ouvert avec selectedClass:`, classe);
      console.log(`[handleViewWeeklySchedule] weeklySchedule state défini avec ${scheduleData.length} entrées`);

      if (scheduleData.length === 0) {
        setSnackbar({ 
          open: true, 
          message: 'Aucun emploi du temps hebdomadaire trouvé pour cette classe', 
          severity: 'info' 
        });
      } else {
        setSnackbar({ 
          open: true, 
          message: `${scheduleData.length} activité(s) trouvée(s) pour cette classe`, 
          severity: 'success' 
        });
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des emplois du temps hebdomadaires:', err);
      console.error('Détails de l\'erreur:', err.response?.data || err.message);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || 'Erreur lors du chargement des emplois du temps hebdomadaires', 
        severity: 'error' 
      });
    }
  };

  const handleCreateScheduleForClass = (classe: Class) => {
    setSelectedClassForSchedule(classe);
    setIsScheduleDialogOpen(true);
  };

  const handleCloseScheduleDialog = () => {
    setIsScheduleDialogOpen(false);
    setSelectedClassForSchedule(null);
  };

  const handlePublishWeeklySchedule = async (classe: Class) => {
    try {
      const token = localStorage.getItem('token');
      if (!teacher?.id) {
        setSnackbar({ open: true, message: 'Informations du professeur non disponibles', severity: 'error' });
        return;
      }

      // Récupérer les emplois du temps pour cette classe
      const { data: weeklySchedules } = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/weekly-schedule/${classe.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: selectedSchoolYear }
      });

      // Calculer les dates de la semaine sélectionnée (en heure locale)
      const today = new Date();
      const currentWeekStart = new Date(today);
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lundi = 1
      currentWeekStart.setDate(diff);
      
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Dimanche
      
      const nextWeekStart = new Date(currentWeekStart);
      nextWeekStart.setDate(currentWeekStart.getDate() + 7);
      
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);

      // Convertir en format YYYY-MM-DD pour la comparaison (en heure locale)
      const currentWeekStartStr = `${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, '0')}-${String(currentWeekStart.getDate()).padStart(2, '0')}`;
      const currentWeekEndStr = `${currentWeekEnd.getFullYear()}-${String(currentWeekEnd.getMonth() + 1).padStart(2, '0')}-${String(currentWeekEnd.getDate()).padStart(2, '0')}`;
      const nextWeekStartStr = `${nextWeekStart.getFullYear()}-${String(nextWeekStart.getMonth() + 1).padStart(2, '0')}-${String(nextWeekStart.getDate()).padStart(2, '0')}`;
      const nextWeekEndStr = `${nextWeekEnd.getFullYear()}-${String(nextWeekEnd.getMonth() + 1).padStart(2, '0')}-${String(nextWeekEnd.getDate()).padStart(2, '0')}`;

      // Déterminer quelle semaine publier selon la sélection
      let weekStartDate: string, weekEndDate: string, weekLabel: string;
      
      if (selectedWeekForView === 'current') {
        weekStartDate = currentWeekStartStr;
        weekEndDate = currentWeekEndStr;
        weekLabel = `${currentWeekStart.toLocaleDateString('fr-FR')} au ${currentWeekEnd.toLocaleDateString('fr-FR')}`;
      } else {
        weekStartDate = nextWeekStartStr;
        weekEndDate = nextWeekEndStr;
        weekLabel = `${nextWeekStart.toLocaleDateString('fr-FR')} au ${nextWeekEnd.toLocaleDateString('fr-FR')}`;
      }

      console.log(`Publication de la semaine: ${weekStartDate} au ${weekEndDate}`);
      console.log('Emplois du temps disponibles:', weeklySchedules);
      
      // Filtrer les emplois du temps de la semaine sélectionnée
      // Le backend compare start_date et end_date avec week_start_date et week_end_date
      const schedulesToPublish = weeklySchedules.filter((schedule: any) => {
        if (!schedule.start_date || !schedule.end_date) return false;
        
        // Convertir les dates de début et fin en format YYYY-MM-DD (en heure locale)
        const startDate = new Date(schedule.start_date);
        const endDate = new Date(schedule.end_date);
        
        const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        
        console.log('Vérification publication:', schedule.course_description, 'start_date:', startDateStr, 'end_date:', endDateStr, 'semaine:', selectedWeekForView);
        console.log('Comparaison avec semaine:', weekStartDate, 'au', weekEndDate);
        
        // Le backend compare exactement start_date == week_start_date && end_date == week_end_date
        return startDateStr === weekStartDate && endDateStr === weekEndDate;
      });

      console.log('Emplois du temps à publier:', schedulesToPublish);
      
      if (schedulesToPublish.length === 0) {
        setSnackbar({ open: true, message: 'Aucun emploi du temps à publier pour cette semaine', severity: 'info' });
        return;
      }

      // Publier les emplois du temps de la semaine sélectionnée
      const response = await axios.post('https://saintefamilleexcellence.ci/api/schedules/publish-weekly-schedule', {
        teacher_id: teacher.id,
        class_id: classe.id,
        school_year: selectedSchoolYear,
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
        schedule_ids: schedulesToPublish.map((s: any) => s.id) // Envoyer les IDs des emplois à publier
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSnackbar({ 
        open: true, 
        message: `${schedulesToPublish.length} emploi(s) du temps publié(s) pour la semaine du ${weekLabel}`, 
        severity: 'success' 
      });
      
      // Recharger les données
      await handleViewWeeklySchedule(classe);
    } catch (err: any) {
      console.error('Erreur lors de la publication:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || 'Erreur lors de la publication', 
        severity: 'error' 
      });
    }
  };

  // Fonction pour filtrer les données selon la semaine sélectionnée
  const getFilteredSchedule = (): WeeklyScheduleEntry[] => {
    console.log('[getFilteredSchedule] Début du filtrage');
    console.log('[getFilteredSchedule] Données hebdomadaires disponibles:', weeklySchedule);
    console.log('[getFilteredSchedule] Type de weeklySchedule:', typeof weeklySchedule);
    console.log('[getFilteredSchedule] Est un tableau:', Array.isArray(weeklySchedule));
    
    // Si pas de données, retourner un tableau vide
    if (!weeklySchedule || !Array.isArray(weeklySchedule) || weeklySchedule.length === 0) {
      console.log('[getFilteredSchedule] Aucune donnée hebdomadaire disponible ou données invalides');
      return [];
    }
    
    // OPTION 1: Afficher toutes les données sans filtrage (pour debug)
    const showAllData = true; // Temporairement activé pour corriger le problème
    
    if (showAllData) {
      console.log('[getFilteredSchedule] Mode debug: affichage de toutes les données sans filtrage');
      console.log('[getFilteredSchedule] Retour de toutes les données:', weeklySchedule.length, 'entrées');
      return weeklySchedule;
    }
    
    // OPTION 2: Filtrage par semaine (logique originale)
    // Calculer les dates de la semaine courante et suivante (en heure locale)
    const today = new Date();
    const currentWeekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lundi = 1
    currentWeekStart.setDate(diff);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Dimanche
    
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(currentWeekStart.getDate() + 7);
    
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
    
    // Convertir en format YYYY-MM-DD pour la comparaison (en heure locale)
    const currentWeekStartStr = `${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, '0')}-${String(currentWeekStart.getDate()).padStart(2, '0')}`;
    const currentWeekEndStr = `${currentWeekEnd.getFullYear()}-${String(currentWeekEnd.getMonth() + 1).padStart(2, '0')}-${String(currentWeekEnd.getDate()).padStart(2, '0')}`;
    const nextWeekStartStr = `${nextWeekStart.getFullYear()}-${String(nextWeekStart.getMonth() + 1).padStart(2, '0')}-${String(nextWeekStart.getDate()).padStart(2, '0')}`;
    const nextWeekEndStr = `${nextWeekEnd.getFullYear()}-${String(nextWeekEnd.getMonth() + 1).padStart(2, '0')}-${String(nextWeekEnd.getDate()).padStart(2, '0')}`;
    
    console.log('[getFilteredSchedule] Semaine courante (string):', currentWeekStartStr, 'au', currentWeekEndStr);
    console.log('[getFilteredSchedule] Semaine suivante (string):', nextWeekStartStr, 'au', nextWeekEndStr);
    console.log('[getFilteredSchedule] Semaine sélectionnée:', selectedWeekForView);
    
    // Déterminer quelle semaine utiliser pour le filtrage
    let targetWeekStartStr: string, targetWeekEndStr: string;
    if (selectedWeekForView === 'current') {
      targetWeekStartStr = currentWeekStartStr;
      targetWeekEndStr = currentWeekEndStr;
    } else {
      targetWeekStartStr = nextWeekStartStr;
      targetWeekEndStr = nextWeekEndStr;
    }
    
    console.log('[getFilteredSchedule] Semaine cible pour filtrage:', targetWeekStartStr, 'au', targetWeekEndStr);
    console.log('[getFilteredSchedule] Nombre d\'entrées à filtrer:', weeklySchedule.length);
    
    const filteredResults = weeklySchedule.filter(entry => {
      if (!entry.start_date || !entry.end_date) {
        console.log('[getFilteredSchedule] Entrée sans start_date ou end_date:', entry);
        return false;
      }
      
      // Convertir les dates de début et fin de l'entrée en format YYYY-MM-DD (en heure locale)
      const entryStartDate = new Date(entry.start_date);
      const entryEndDate = new Date(entry.end_date);
      
      const entryStartStr = `${entryStartDate.getFullYear()}-${String(entryStartDate.getMonth() + 1).padStart(2, '0')}-${String(entryStartDate.getDate()).padStart(2, '0')}`;
      const entryEndStr = `${entryEndDate.getFullYear()}-${String(entryEndDate.getMonth() + 1).padStart(2, '0')}-${String(entryEndDate.getDate()).padStart(2, '0')}`;
      
      console.log('[getFilteredSchedule] Comparaison entrée:', entry.course_description, 'start_date:', entryStartStr, 'end_date:', entryEndStr);
      
      // Vérifier si l'activité appartient à la semaine sélectionnée
      // Une activité appartient à une semaine si ses dates de début et fin correspondent exactement
      const isInTargetWeek = entryStartStr === targetWeekStartStr && entryEndStr === targetWeekEndStr;
      
      console.log('[getFilteredSchedule] Dans semaine cible?', isInTargetWeek);
      return isInTargetWeek;
    });
    
    console.log('[getFilteredSchedule] Résultats filtrés:', filteredResults.length, 'entrées');
    console.log('[getFilteredSchedule] Fin du filtrage');
    
    return filteredResults;
  };

  const handleCreateSchedule = async (startDate: Date, endDate: Date, description: string, dayOfWeek: string, domain: string, title: string) => {
    if (!selectedClassForSchedule || !description.trim() || !dayOfWeek || !domain || !title.trim()) {
      setSnackbar({ open: true, message: 'Veuillez remplir tous les champs', severity: 'error' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Vérifier s'il existe déjà des activités pour cette semaine avec un titre différent
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const existingSchedules = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/weekly-schedule/${selectedClassForSchedule.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: selectedSchoolYear }
      });
      
      // Trouver les activités existantes pour cette semaine
      const existingForWeek = existingSchedules.data.filter((schedule: any) => {
        const scheduleStart = new Date(schedule.start_date);
        const scheduleEnd = new Date(schedule.end_date);
        const scheduleStartStr = `${scheduleStart.getFullYear()}-${String(scheduleStart.getMonth() + 1).padStart(2, '0')}-${String(scheduleStart.getDate()).padStart(2, '0')}`;
        const scheduleEndStr = `${scheduleEnd.getFullYear()}-${String(scheduleEnd.getMonth() + 1).padStart(2, '0')}-${String(scheduleEnd.getDate()).padStart(2, '0')}`;
        return scheduleStartStr === startDateStr && scheduleEndStr === endDateStr;
      });
      
      // Si des activités existent pour cette semaine, utiliser le même titre
      let finalTitle = title;
      if (existingForWeek.length > 0) {
        // Prendre le premier titre non vide trouvé
        const existingTitle = existingForWeek.find((schedule: WeeklyScheduleEntry) => schedule.title && schedule.title.trim() !== '')?.title;
        if (existingTitle) {
          finalTitle = existingTitle;
          console.log('Utilisation du titre existant pour la semaine:', finalTitle);
        } else {
          console.log('Aucun titre existant trouvé, utilisation du nouveau titre:', title);
        }
      } else {
        console.log('Nouvelle semaine, utilisation du titre:', title);
      }
      
      const payload = {
        start_date: startDateStr,
        end_date: endDateStr,
        course_description: description,
        title: finalTitle,
        day_of_week: dayOfWeek,
        domain: domain,
        subject_id: null, // Pas de matière spécifique pour les domaines
        class_id: selectedClassForSchedule.id,
        teacher_id: teacher?.id,
        school_year: selectedSchoolYear,
        is_weekly_schedule: true,
        is_published: false // Ne pas publier automatiquement
      };

      console.log('Création d\'emploi du temps avec payload:', payload);

      const response = await axios.post('https://saintefamilleexcellence.ci/api/schedules/create-weekly', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Emploi du temps créé/mis à jour:', response.data);
      
      // Adapter le message selon l'action effectuée
      const message = response.data.action === 'updated' 
        ? 'Activité mise à jour avec succès ! (Statut: Non publié)'
        : 'Activité créée avec succès ! (Non publiée)';
      
      setSnackbar({ open: true, message: message, severity: 'success' });
      handleCloseScheduleDialog();
      
      // Recharger les emplois du temps hebdomadaires pour cette classe
      if (selectedClassForSchedule) {
        console.log('[handleCreateSchedule] Rechargement des données pour la classe:', selectedClassForSchedule.id);
        await loadWeeklySchedulesForClass(selectedClassForSchedule.id);
        
        // Si on a une classe sélectionnée pour l'affichage, recharger aussi ces données
        if (selectedClass && selectedClass.id === selectedClassForSchedule.id) {
          console.log('[handleCreateSchedule] Rechargement des données d\'affichage');
          const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/weekly-schedule/${selectedClass.id}`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { school_year: selectedSchoolYear }
          });
          setWeeklySchedule(data || []);
          console.log('[handleCreateSchedule] Données d\'affichage rechargées:', data?.length || 0, 'entrées');
        }
      }
    } catch (err: any) {
      console.error('Erreur lors de la création de l\'emploi du temps:', err);
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || 'Erreur lors de la création de l\'emploi du temps', 
        severity: 'error' 
      });
    }
  };

  const processedStudents = useMemo(() => {
    if (!students) return [];
    return students
      .map(student => {
        const absenceCount = classAbsences
          .filter(a => a.student_id === student.id)
          .reduce((sum, current) => sum + (Number(current.duration_hours) || 0), 0);
        console.log('MAPPING processedStudent:', { nom: student.first_name + ' ' + student.last_name, absenceCount });
        return { student, absenceCount };
      })
      .sort((a, b) => {
        return a.student.last_name.localeCompare(b.student.last_name);
      });
  }, [students, classAbsences]);



  console.log('viewStep:', viewStep, 'selectedClass:', selectedClass, 'students:', students, 'subjects:', subjects, 'selectedSubject:', selectedSubject);
  console.log('Nombre de matières chargées:', subjects.length);

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#f4f6f8',
      '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
      }
    }}>
      <Box sx={{
        width: '100%',
        background: 'linear-gradient(45deg, #0d47a1 30%, #1976d2 90%)',
        color: 'white',
        py: 2,
        px: { xs: 2, md: 4 },
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1100
      }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            component="img"
            src="/img/pages/vrailogo.jpg"
            alt="Logo GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE"
            sx={{
              width: { xs: 32, md: 40 },
              height: { xs: 32, md: 40 },
              borderRadius: 1,
              objectFit: 'cover',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
          />
          <Box>
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: 1, display: { xs: 'none', md: 'block' } }}>
              Espace Enseignant
            </Typography>
            {teacher && (
              <Typography variant="body2" sx={{ 
                opacity: 0.9, 
                fontSize: { xs: '0.6rem', md: '0.8rem' },
                display: 'block'
              }}>
                Bienvenue, {teacher.first_name} {teacher.last_name}
              </Typography>
            )}
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton color="inherit" onClick={handleOpenNotif} sx={{ position: 'relative' }}>
            <Badge badgeContent={unreadCount} color="error" invisible={unreadCount === 0}>
              <NotificationsIcon sx={{ color: 'white', fontSize: 28 }} />
            </Badge>
          </IconButton>
          <Popover
            open={Boolean(anchorNotif)}
            anchorEl={anchorNotif}
            onClose={handleCloseNotif}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { width: { xs: '90vw', sm: 350 }, maxWidth: 400, p: 2, borderRadius: 3 } }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" fontWeight={700}>Notifications</Typography>
              <Button size="small" onClick={handleMarkAllRead} disabled={unreadCount === 0}>Tout marquer lu</Button>
            </Box>
            {notifications.length === 0 && (
              <Typography color="text.secondary">Aucune notification.</Typography>
            )}
            <Stack spacing={1}>
              {notifications.map(n => (
                <Paper key={n.id} sx={{ p: 1.5, bgcolor: n.read ? '#f5f5f5' : '#e3f2fd', borderLeft: n.read ? '4px solid #bdbdbd' : '4px solid #1976d2', boxShadow: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography fontWeight={700} fontSize={15}>{n.title}</Typography>
                      <Typography fontSize={14} color="text.secondary">{n.message}</Typography>
                      <Typography fontSize={12} color="text.secondary" sx={{ mt: 0.5 }}>
                        {new Date(n.date).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Box>
                    {!n.read && (
                      <IconButton size="small" onClick={() => handleMarkRead(n.id)}>
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Popover>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon sx={{ fontSize: 28 }} />
          </IconButton>
        </Stack>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {/* Sélecteur d'année scolaire */}
            <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, borderTop: '4px solid #ff9800', mb: 3 }}>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                alignItems={{ xs: 'flex-start', sm: 'center' }} 
                spacing={{ xs: 2, sm: 2 }}
                sx={{ mb: 2 }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    color: 'text.secondary',
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                    width: { xs: '100%', sm: 'auto' }
                  }}
                >
                  Année scolaire
                </Typography>
                <FormControl 
                  size="small" 
                  sx={{ 
                    minWidth: { xs: '100%', sm: 200 },
                    width: { xs: '100%', sm: 'auto' }
                  }}
                >
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
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    width: { xs: '100%', sm: 'auto' },
                    mt: { xs: 0, sm: 0 }
                  }}
                >
                  Toutes les données sont filtrées par année scolaire
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            {/* Section Emploi du temps officiel */}
            <Paper elevation={2} sx={{ p: 3, borderRadius: 4, borderTop: '4px solid #1976d2', mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <ScheduleIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Mon emploi du temps officiel {selectedSchoolYear && `(${selectedSchoolYear})`}
                  {teacherClasses.length === 1 && (
                    <Chip 
                      label={`Classe: ${teacherClasses[0].name}`}
                      size="small" 
                      color="primary"
                      sx={{ ml: 2 }}
                    />
                  )}
                </Typography>
              </Stack>
              {loadingOfficialSchedule ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : schedule.length > 0 ? (
                <Box sx={{ overflowX: 'auto', width: '100%' }}>
                  <Table sx={{ minWidth: 600 }}>
                    <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#f4f6f8', fontWeight: 'bold' } }}>
                        <TableCell sx={{ 
                          minWidth: 120, 
                          textAlign: 'center',
                          borderRight: '2px solid #ddd',
                          backgroundColor: '#e3f2fd'
                        }}>
                          <Typography variant="body2" fontWeight="bold">
                            HEURES
                          </Typography>
                        </TableCell>
                        {[
                          { key: 'Monday', label: 'LUNDI', color: '#e3f2fd' },
                          { key: 'Tuesday', label: 'MARDI', color: '#f3e5f5' },
                          { key: 'Wednesday', label: 'MERCREDI', color: '#e8f5e8' },
                          { key: 'Thursday', label: 'JEUDI', color: '#fff3e0' },
                          { key: 'Friday', label: 'VENDREDI', color: '#fce4ec' }
                        ].map((day) => (
                          <TableCell
                            key={day.key}
                            sx={{
                              minWidth: 150,
                              textAlign: 'center',
                              backgroundColor: day.color,
                              border: '1px solid #ddd'
                            }}
                          >
                            <Typography variant="body2" fontWeight="bold" color="#1976d2">
                              {day.label}
                            </Typography>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(() => {
                        // Organiser les données par heure et jour
                        const scheduleByTimeAndDay: { [timeSlot: string]: { [day: string]: any[] } } = {};
                        
                        schedule.forEach(item => {
                          const timeSlot = `${formatHour(item.start_time || '')}-${formatHour(item.end_time || '')}`;
                          const day = item.day_of_week;
                          
                          if (!scheduleByTimeAndDay[timeSlot]) {
                            scheduleByTimeAndDay[timeSlot] = {};
                          }
                          if (!scheduleByTimeAndDay[timeSlot][day]) {
                            scheduleByTimeAndDay[timeSlot][day] = [];
                          }
                          scheduleByTimeAndDay[timeSlot][day].push(item);
                        });
                        
                        // Trier les créneaux horaires
                        const sortedTimeSlots = Object.keys(scheduleByTimeAndDay).sort((a, b) => {
                          const timeA = a.split('-')[0];
                          const timeB = b.split('-')[0];
                          return timeA.localeCompare(timeB);
                        });
                        
                        return sortedTimeSlots.map((timeSlot) => (
                          <TableRow key={timeSlot} hover>
                            <TableCell sx={{ 
                              fontWeight: 600,
                              textAlign: 'center',
                              backgroundColor: '#e3f2fd',
                              borderRight: '2px solid #ddd',
                              color: 'primary.main'
                            }}>
                              <Typography variant="body2" fontWeight="bold">
                                {timeSlot}
                              </Typography>
                            </TableCell>
                            {[
                              { key: 'Monday', label: 'LUNDI' },
                              { key: 'Tuesday', label: 'MARDI' },
                              { key: 'Wednesday', label: 'MERCREDI' },
                              { key: 'Thursday', label: 'JEUDI' },
                              { key: 'Friday', label: 'VENDREDI' }
                            ].map((day) => {
                              const daySchedule = scheduleByTimeAndDay[timeSlot][day.key] || [];
                              return (
                                <TableCell
                                  key={`${timeSlot}-${day.key}`}
                                  sx={{
                                    textAlign: 'center',
                                    border: '1px solid #ddd',
                                    verticalAlign: 'middle',
                                    minHeight: 60,
                                    backgroundColor: daySchedule.length > 0 ? '#ffffff' : '#f8f9fa',
                                    padding: 1
                                  }}
                                >
                                  {daySchedule.length > 0 ? (
                                    <Stack spacing={0.5}>
                                      {daySchedule.map((item, index) => (
                                        <Box
                                          key={index}
                                          sx={{
                                            backgroundColor: '#1976d2',
                                            color: 'white',
                                            borderRadius: 1,
                                            px: 1,
                                            py: 0.5,
                                            textAlign: 'center',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                          }}
                                        >
                                          <Typography
                                            variant="body2"
                                            sx={{ 
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              color: 'white'
                                            }}
                                          >
                                            {item.subject_name || 'N/A'}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Stack>
                                  ) : (
                                    <Typography 
                                      variant="body2" 
                                      color="text.secondary"
                                      sx={{ 
                                        fontStyle: 'italic',
                                        opacity: 0.6
                                      }}
                                    >
                                      -
                                    </Typography>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </Box>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Aucun emploi du temps officiel disponible
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            {/* Section "Vos matières" - Commentée */}
            {/* {viewStep === 'subjects' && (
              <Paper elevation={2} sx={{ p: 3, borderRadius: 4, borderTop: '4px solid #4caf50' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                  <MenuBookIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Vos matières
                  </Typography>
                </Stack>
                <Grid container spacing={2}>
                  {subjects.map((subject) => (
                    <Grid item xs={12} sm={6} md={4} key={subject.id}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          cursor: 'pointer', 
                          transition: 'all 0.3s ease',
                          border: selectedSubject === subject.id ? '2px solid #1976d2' : '2px solid transparent',
                          '&:hover': { 
                            transform: 'translateY(-2px)', 
                            boxShadow: '0 8px 25px rgba(0,0,0,0.15)' 
                          }
                        }}
                        onClick={() => handleSelectSubject(subject)}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <MenuBookIcon color="primary" />
                          <Typography variant="h6" fontWeight={600}>
                            {subject.name}
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )} */}

            {/* Section Emploi du temps hebdomadaire mobile - visible uniquement sur mobile */}
            {showWeeklyScheduleMobile && selectedClass && weeklySchedule.length > 0 && (
              <Grid item xs={12}>
                <Paper elevation={3} sx={{ 
                  p: { xs: 2, sm: 3 }, 
                  borderRadius: 3, 
                  borderTop: '4px solid #4caf50',
                  mb: 3,
                  position: 'relative'
                }}>
                  {/* Header avec bouton de fermeture */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 2,
                    pb: 2,
                    borderBottom: '1px solid #e0e0e0'
                  }}>
                    <Typography variant="h6" fontWeight={700} sx={{ 
                      fontSize: { xs: '1.1rem', sm: '1.3rem' },
                      color: 'primary.main'
                    }}>
                      📅 Emploi du temps - {selectedClass.name}
                    </Typography>
                    <IconButton 
                      onClick={() => {
                        setShowWeeklyScheduleMobile(false);
                        setSelectedClass(null);
                        setWeeklySchedule([]);
                      }}
                      sx={{ 
                        backgroundColor: 'error.main',
                        color: 'white',
                        '&:hover': { backgroundColor: 'error.dark' },
                        width: { xs: 36, sm: 40 },
                        height: { xs: 36, sm: 40 }
                      }}
                      title="Fermer"
                    >
                      <DeleteIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
                    </IconButton>
                  </Box>

                  {/* Afficher le titre de l'emploi du temps s'il existe */}
                  {(() => {
                    const filteredSchedule = getFilteredSchedule();
                    const entryWithTitle = filteredSchedule.find(entry => entry.title && entry.title.trim() !== '');
                    
                    if (entryWithTitle && entryWithTitle.title) {
                      return (
                        <Box sx={{ 
                          mb: 2, 
                          p: { xs: 1.5, sm: 2 }, 
                          bgcolor: 'primary.main', 
                          color: 'white', 
                          borderRadius: 2,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                          textAlign: 'center'
                        }}>
                          <Typography variant="body1" fontWeight={700} sx={{ 
                            fontSize: { xs: '0.9rem', sm: '1rem' },
                            mb: 0.5
                          }}>
                            {entryWithTitle.title}
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            opacity: 0.9,
                            fontSize: { xs: '0.7rem', sm: '0.8rem' }
                          }}>
                            Emploi du temps hebdomadaire
                          </Typography>
                        </Box>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Sélecteur de semaine pour l'affichage */}
                  {selectedClass && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={600} mb={1} sx={{
                        fontSize: { xs: '0.8rem', sm: '0.9rem' }
                      }}>
                        Sélectionner la semaine :
                      </Typography>
                      <ToggleButtonGroup
                        value={selectedWeekForView}
                        exclusive
                        onChange={(e, newValue) => newValue && setSelectedWeekForView(newValue)}
                        fullWidth
                        size="small"
                        sx={{ mb: 1 }}
                      >
                        <ToggleButton value="current" sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                            Semaine courante
                          </Typography>
                        </ToggleButton>
                        <ToggleButton value="next" sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                            Semaine suivante
                          </Typography>
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Box>
                  )}
                  
                  {/* Afficher les données filtrées selon la semaine */}
                  {(() => {
                    const filteredSchedule = getFilteredSchedule();
                    const dataToDisplay = filteredSchedule.length > 0 ? filteredSchedule : weeklySchedule;
                    
                    return (
                      <>
                        {/* Indicateur de la semaine affichée */}
                        <Box sx={{ 
                          mb: 2, 
                          p: { xs: 1, sm: 1.5 }, 
                          bgcolor: 'primary.light', 
                          color: 'white', 
                          borderRadius: 1,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                        }}>
                          <Typography variant="body2" fontWeight={600} align="center" sx={{
                            fontSize: { xs: '0.8rem', sm: '0.9rem' },
                            mb: 0.5
                          }}>
                            {selectedWeekForView === 'current' ? 'Semaine courante' : 'Semaine suivante'} - 
                            {(() => {
                              const today = new Date();
                              const currentWeekStart = new Date(today);
                              const dayOfWeek = today.getDay();
                              const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                              currentWeekStart.setDate(diff);
                              
                              const currentWeekEnd = new Date(currentWeekStart);
                              currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
                              
                              const nextWeekStart = new Date(currentWeekStart);
                              nextWeekStart.setDate(currentWeekStart.getDate() + 7);
                              
                              const nextWeekEnd = new Date(nextWeekStart);
                              nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
                              
                              if (selectedWeekForView === 'current') {
                                return `${currentWeekStart.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} au ${currentWeekEnd.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}`;
                              } else {
                                return `${nextWeekStart.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} au ${nextWeekEnd.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}`;
                              }
                            })()}
                          </Typography>
                          {filteredSchedule.length === 0 && weeklySchedule.length > 0 && (
                            <Box sx={{ 
                              mt: 1, 
                              p: { xs: 0.5, sm: 1 }, 
                              bgcolor: 'warning.main', 
                              borderRadius: 1,
                              border: '1px solid rgba(255,255,255,0.3)'
                            }}>
                              <Typography variant="body2" fontWeight={600} align="center" sx={{ 
                                fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                color: 'white'
                              }}>
                                🔧 MODE FORCÉ: {weeklySchedule.length} activité(s)
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        
                        {dataToDisplay.length > 0 ? (
                          <Box sx={{ 
                            overflowX: 'auto', 
                            width: '100%',
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                            bgcolor: 'white'
                          }}>
                            <TableContainer sx={{ 
                              maxHeight: { xs: '45vh', sm: '50vh' },
                              minHeight: { xs: '250px', sm: '300px' }
                            }}>
                              <Table size="small" sx={{ 
                                minWidth: { xs: 500, sm: 600, md: 700 },
                                '& .MuiTableCell-root': {
                                  border: '1px solid #ddd',
                                  verticalAlign: 'top',
                                  padding: { xs: '4px', sm: '8px' }
                                }
                              }}>
                                <TableHead>
                                  <TableRow>
                                    <TableCell
                                      sx={{
                                        backgroundColor: '#f5f5f5',
                                        fontWeight: 600,
                                        textAlign: 'center',
                                        width: { xs: '18%', sm: '15%' },
                                        minWidth: { xs: 80, sm: 100 },
                                        px: { xs: 0.5, sm: 1 },
                                        py: { xs: 0.5, sm: 1 }
                                      }}
                                    >
                                      <Typography variant="body2" fontWeight="bold" sx={{ 
                                        fontSize: { xs: '0.6rem', sm: '0.7rem' } 
                                      }}>
                                        DOMAINE
                                      </Typography>
                                    </TableCell>
                                    {[
                                      { key: 'Monday', label: 'LUNDI', color: '#e3f2fd' },
                                      { key: 'Tuesday', label: 'MARDI', color: '#f3e5f5' },
                                      { key: 'Wednesday', label: 'MERCREDI', color: '#e8f5e8' },
                                      { key: 'Thursday', label: 'JEUDI', color: '#fff3e0' },
                                      { key: 'Friday', label: 'VENDREDI', color: '#fce4ec' }
                                    ].map((day) => (
                                      <TableCell
                                        key={day.key}
                                        sx={{
                                          backgroundColor: day.color,
                                          fontWeight: 600,
                                          textAlign: 'center',
                                          width: { xs: '16.4%', sm: '17%' },
                                          minWidth: { xs: 70, sm: 80 },
                                          px: { xs: 0.5, sm: 1 },
                                          py: { xs: 0.5, sm: 1 }
                                        }}
                                      >
                                        <Typography 
                                          variant="body2" 
                                          fontWeight="bold" 
                                          color="text.primary"
                                          sx={{ 
                                            fontSize: { xs: '0.55rem', sm: '0.65rem' },
                                            lineHeight: 1.1
                                          }}
                                        >
                                          {day.label}
                                        </Typography>
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {[
                                    { key: 'rituel', label: 'RITUEL', color: '#f5f5f5', bgColor: '#fafafa' },
                                    { key: 'langage_oral', label: 'LANGAGE ORAL', color: '#ff9800', bgColor: '#fff3e0' },
                                    { key: 'langage_ecrit', label: 'LANGAGE ÉCRIT', color: '#2196f3', bgColor: '#e3f2fd' },
                                    { key: 'activite_motrice', label: 'ACTIVITÉ MOTRICE', color: '#4caf50', bgColor: '#e8f5e8' },
                                    { key: 'activite_artistique', label: 'ACTIVITÉ ARTISTIQUE', color: '#ffeb3b', bgColor: '#fffde7' },
                                    { key: 'eveil_mathematique', label: 'ÉVEIL MATHÉMATIQUE', color: '#f44336', bgColor: '#ffebee' },
                                    { key: 'explorer_monde', label: 'EXPLORER LE MONDE', color: '#9c27b0', bgColor: '#f3e5f5' }
                                  ].map((domain) => {
                                    const organizedData: { [day: string]: WeeklyScheduleEntry[] } = {};
                                    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(dayKey => {
                                      organizedData[dayKey] = dataToDisplay.filter(entry => 
                                        entry.day_of_week === dayKey && entry.domain === domain.key
                                      );
                                    });

                                    return (
                                      <TableRow key={domain.key}>
                                        <TableCell
                                          sx={{
                                            backgroundColor: domain.color,
                                            fontWeight: 600,
                                            verticalAlign: 'top',
                                            width: { xs: '18%', sm: '15%' },
                                            minWidth: { xs: 80, sm: 100 },
                                            px: { xs: 0.5, sm: 1 },
                                            py: { xs: 0.5, sm: 1 }
                                          }}
                                        >
                                          <Typography 
                                            variant="body2" 
                                            fontWeight="bold"
                                            sx={{ 
                                              fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                              lineHeight: 1.1
                                            }}
                                          >
                                            {domain.label}
                                          </Typography>
                                        </TableCell>
                                        {[
                                          { key: 'Monday', label: 'LUNDI', color: '#e3f2fd' },
                                          { key: 'Tuesday', label: 'MARDI', color: '#f3e5f5' },
                                          { key: 'Wednesday', label: 'MERCREDI', color: '#e8f5e8' },
                                          { key: 'Thursday', label: 'JEUDI', color: '#fff3e0' },
                                          { key: 'Friday', label: 'VENDREDI', color: '#fce4ec' }
                                        ].map((day) => {
                                          const entries = organizedData[day.key] || [];
                                          return (
                                            <TableCell
                                              key={`${domain.key}-${day.key}`}
                                              sx={{
                                                verticalAlign: 'top',
                                                minHeight: { xs: 60, sm: 80 },
                                                width: { xs: '16.4%', sm: '17%' },
                                                minWidth: { xs: 70, sm: 80 },
                                                px: { xs: 0.5, sm: 1 },
                                                py: { xs: 0.5, sm: 1 },
                                                backgroundColor: domain.bgColor
                                              }}
                                            >
                                              {entries.length > 0 ? (
                                                entries.map((entry, index) => (
                                                  <Box 
                                                    key={index} 
                                                    sx={{ 
                                                      mb: index < entries.length - 1 ? 0.5 : 0,
                                                      p: { xs: 0.25, sm: 0.5 },
                                                      backgroundColor: entry.is_published ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 152, 0, 0.15)',
                                                      borderRadius: 0.5,
                                                      border: entry.is_published ? '1px solid rgba(76, 175, 80, 0.4)' : '1px solid rgba(255, 152, 0, 0.4)',
                                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                                      position: 'relative'
                                                    }}
                                                  >
                                                    <Typography
                                                      variant="body2"
                                                      sx={{
                                                        fontSize: { xs: '0.55rem', sm: '0.65rem' },
                                                        lineHeight: 1.2,
                                                        fontWeight: 500,
                                                        color: 'text.primary',
                                                        mb: 0.25
                                                      }}
                                                    >
                                                      {entry.course_description}
                                                    </Typography>
                                                    <Stack direction="row" spacing={0.25}>
                                                      {!entry.is_published && (
                                                        <Chip 
                                                          label="Non publié" 
                                                          size="small" 
                                                          color="warning" 
                                                          sx={{ 
                                                            fontSize: { xs: '0.45rem', sm: '0.5rem' },
                                                            height: { xs: 16, sm: 18 },
                                                            '& .MuiChip-label': {
                                                              px: { xs: 0.25, sm: 0.5 }
                                                            }
                                                          }}
                                                        />
                                                      )}
                                                      {entry.is_published && (
                                                        <Chip 
                                                          label="Publié" 
                                                          size="small" 
                                                          color="success" 
                                                          sx={{ 
                                                            fontSize: { xs: '0.45rem', sm: '0.5rem' },
                                                            height: { xs: 16, sm: 18 },
                                                            '& .MuiChip-label': {
                                                              px: { xs: 0.25, sm: 0.5 }
                                                            }
                                                          }}
                                                        />
                                                      )}
                                                    </Stack>
                                                  </Box>
                                                ))
                                              ) : (
                                                <Box 
                                                  sx={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    height: { xs: 50, sm: 60 },
                                                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                                                    borderRadius: 0.5,
                                                    border: '1px dashed rgba(0, 0, 0, 0.15)',
                                                    opacity: 0.7
                                                  }}
                                                >
                                                  <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ 
                                                      fontSize: { xs: '0.5rem', sm: '0.6rem' },
                                                      fontStyle: 'italic',
                                                      fontWeight: 500
                                                    }}
                                                  >
                                                    Aucune activité
                                                  </Typography>
                                                </Box>
                                              )}
                                            </TableCell>
                                          );
                                        })}
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Box>
                        ) : (
                          <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Typography color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                              {selectedClass 
                                ? `Aucun emploi du temps hebdomadaire trouvé pour la classe ${selectedClass.name} (${selectedWeekForView === 'current' ? 'semaine courante' : 'semaine suivante'})`
                                : 'Aucun emploi du temps hebdomadaire disponible'
                              }
                            </Typography>
                            {selectedClass && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                                Total des activités créées pour cette classe : {weeklySchedule.length}
                              </Typography>
                            )}
                            

                            
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                              Utilisez le bouton "Créer emploi" pour ajouter des activités à cette semaine.
                            </Typography>
                          </Box>
                        )}
                      </>
                    );
                  })()}
                  
                  {/* Footer du modal avec statistiques et actions */}
                  <Box sx={{ 
                    flexShrink: 0,
                    p: { xs: 1, sm: 1.5 },
                    bgcolor: '#f8f9fa',
                    borderTop: '1px solid #e0e0e0',
                    borderRadius: '0 0 8px 8px',
                    mt: 2
                  }}>
                    <Stack direction="row" spacing={1} sx={{ 
                      justifyContent: 'space-between', 
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      alignItems: 'center'
                    }}>
                      <Box sx={{ minWidth: { xs: '100%', sm: 'auto' }, mb: { xs: 1, sm: 0 } }}>
                        <Typography variant="body2" color="text.secondary" sx={{ 
                          fontSize: { xs: '0.7rem', sm: '0.8rem' },
                          fontWeight: 500,
                          mb: 0.25
                        }}>
                          {selectedClass && `Classe: ${selectedClass.name}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ 
                          fontSize: { xs: '0.7rem', sm: '0.8rem' },
                          fontWeight: 500,
                          mb: 0.25
                        }}>
                          {(() => {
                            const filteredSchedule = getFilteredSchedule();
                            const dataToDisplay = filteredSchedule.length > 0 ? filteredSchedule : weeklySchedule;
                            return `${dataToDisplay.filter((entry: any) => entry.is_published).length} activités publiées sur ${dataToDisplay.length} total`;
                          })()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ 
                          fontSize: { xs: '0.7rem', sm: '0.8rem' },
                          fontWeight: 500
                        }}>
                          {(() => {
                            const filteredSchedule = getFilteredSchedule();
                            const dataToDisplay = filteredSchedule.length > 0 ? filteredSchedule : weeklySchedule;
                            return `Semaine: ${selectedWeekForView === 'current' ? 'Courante' : 'Suivante'} (${dataToDisplay.length} activité${dataToDisplay.length > 1 ? 's' : ''})`;
                          })()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} sx={{ 
                        flexWrap: { xs: 'wrap', sm: 'nowrap' }, 
                        gap: { xs: 0.5, sm: 1 },
                        alignItems: 'center'
                      }}>
                        {selectedClass && (
                          <Button 
                            variant="contained" 
                            color="primary"
                            size="small"
                            onClick={() => handlePublishWeeklySchedule(selectedClass)}
                            disabled={(() => {
                              const filteredSchedule = getFilteredSchedule();
                              const dataToDisplay = filteredSchedule.length > 0 ? filteredSchedule : weeklySchedule;
                              return dataToDisplay.filter((entry: any) => !entry.is_published).length === 0;
                            })()}
                            sx={{ 
                              fontSize: { xs: '0.65rem', sm: '0.75rem' },
                              px: { xs: 1, sm: 1.5 },
                              py: { xs: 0.5, sm: 0.75 },
                              fontWeight: 600,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}
                          >
                            Publier l'emploi du temps
                          </Button>
                        )}
                        <Button 
                          size="small"
                          onClick={() => setShowWeeklyScheduleMobile(false)}
                          sx={{ 
                            fontSize: { xs: '0.65rem', sm: '0.75rem' },
                            px: { xs: 1, sm: 1.5 },
                            py: { xs: 0.5, sm: 0.75 },
                            fontWeight: 600
                          }}
                        >
                          Fermer
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Section Classes avec boutons d'action - visible dès l'arrivée */}
            {viewStep === 'subjects' && (
              <Paper elevation={2} sx={{ p: 3, borderRadius: 4, borderTop: '4px solid #ff9800', mt: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                  <ApartmentIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    {teacherClasses.length === 1 ? 'Ma classe' : 'Mes classes'}
                  </Typography>
                  {teacherClasses.length === 1 && (
                    <Chip 
                      label="Classe unique" 
                      size="small" 
                      variant="outlined" 
                      color="primary"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Stack>
                <Grid container spacing={2}>
                  {loadingTeacherClasses ? (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    </Grid>
                  ) : teacherClasses.length > 0 ? (
                    teacherClasses.map((classe: Class) => (
                      <Grid item xs={12} sm={6} md={4} key={classe.id}>
                        <Paper elevation={1} sx={{ 
                          p: 3, 
                          borderRadius: 3,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}>
                          <Typography variant="h6" fontWeight={600} sx={{ mb: 2, textAlign: 'center' }}>
                            {classe.name}
                          </Typography>
                                                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                          <Button
                            variant="contained"
                            startIcon={<PersonAddIcon />}
                            onClick={async () => {
                              try {
                                const token = localStorage.getItem('token');
                                if (!token) {
                                  setSnackbar({ open: true, message: 'Token d\'authentification manquant', severity: 'error' });
                                  return;
                                }
                                
                                // Charger directement les élèves de cette classe
                                const { data: studentsData } = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classe.id}/students`, { 
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                
                                // Charger les absences pour cette classe (sans matière spécifique)
                                const { data: absencesData } = await axios.get(`https://saintefamilleexcellence.ci/api/absences?class_id=${classe.id}&school_year=${selectedSchoolYear}`, { 
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                
                                // Définir les données et passer à la vue des élèves
                                setStudents(studentsData);
                                setClassAbsences(absencesData);
                                setSelectedClass(classe);
                                setCameFromClassesList(true);
                                setViewStep('students');
                                
                                // Sélectionner la première matière disponible pour cette classe
                                if (subjects.length > 0) {
                                  setSelectedSubject(subjects[0].id);
                                }
                                
                                console.log('Élèves chargés pour gestion des absences:', studentsData);
                                console.log('Absences chargées:', absencesData);
                              } catch (err: any) {
                                console.error('Erreur lors du chargement des données:', err);
                                const errorMessage = err.response?.data?.message || 'Erreur lors du chargement des élèves';
                                setSnackbar({ open: true, message: errorMessage, severity: 'error' });
                              }
                            }}
                            sx={{ 
                              minHeight: 48,
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                              fontWeight: 600
                            }}
                          >
                            GÉRER ABSENCES
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<GradeIcon />}
                            onClick={() => {
                              // Naviguer vers la page de gestion des notes
                              navigate(`/teacher/grades/${classe.id}`, {
                                state: {
                                  isAdminAccess: false,
                                  canModifyNotes: true,
                                  className: classe.name,
                                  levelName: classe.level_name || classe.level || undefined
                                }
                              });
                            }}
                            sx={{ 
                              minHeight: 48,
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              borderColor: 'secondary.main',
                              color: 'secondary.main',
                              '&:hover': {
                                borderColor: 'secondary.dark',
                                backgroundColor: 'secondary.light',
                                color: 'secondary.dark'
                              }
                            }}
                          >
                            GÉRER NOTES
                          </Button>
                          {/* <Button
                            variant="outlined"
                            startIcon={<ScheduleIcon />}
                            onClick={() => handleCreateScheduleForClass(classe)}
                            sx={{ 
                              minHeight: 48,
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              borderColor: 'primary.main',
                              color: 'primary.main',
                              '&:hover': {
                                borderColor: 'primary.dark',
                                backgroundColor: 'primary.light',
                                color: 'primary.dark'
                              }
                            }}
                          >
                            CRÉER EMPLOI
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewWeeklySchedule(classe)}
                            sx={{ 
                              minHeight: 48,
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              borderColor: 'success.main',
                              color: 'success.main',
                              '&:hover': {
                                borderColor: 'success.dark',
                                backgroundColor: 'success.light',
                                color: 'success.dark'
                              }
                            }}
                          >
                            VOIR EMPLOI
                          </Button> */}

                          
                          {/* <Button
                            variant="outlined"
                            startIcon={<CloudUploadIcon />}
                            onClick={() => {
                              // Charger les élèves de cette classe pour la publication de médias
                              const loadStudentsForMedia = async () => {
                                try {
                                  const token = localStorage.getItem('token');
                                  const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/classes/${classe.id}/students`, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  });
                                  setStudents(data);
                                  setSelectedClass(classe);
                                  setOpenBulkMediaModal(true);
                                } catch (err) {
                                  console.error('Erreur lors du chargement des élèves:', err);
                                  setSnackbar({ 
                                    open: true, 
                                    message: 'Erreur lors du chargement des élèves', 
                                    severity: 'error' 
                                  });
                                }
                              };
                              loadStudentsForMedia();
                            }}
                            sx={{ 
                              minHeight: 48,
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              borderColor: 'info.main',
                              color: 'info.main',
                              '&:hover': {
                                borderColor: 'info.dark',
                                backgroundColor: 'info.light',
                                color: 'info.dark'
                              }
                            }}
                          >
                            PUBLIER MÉDIAS
                          </Button> */}
                        </Stack>
                        </Paper>
                      </Grid>
                    ))
                  ) : (
                    <Grid item xs={12}>
                      <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        Aucune classe trouvée pour ce professeur
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {viewStep === 'classes' && (
              <Paper elevation={2} sx={{ p: 3, borderRadius: 4, borderTop: '4px solid #ff9800' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                  <ApartmentIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Classes pour {subjects.find(s => s.id === selectedSubject)?.name}
                  </Typography>
                </Stack>
                <Grid container spacing={2}>
                  {subjectClasses.map((classe) => (
                    <Grid item xs={12} sm={6} md={4} key={classe.id}>
                      <Paper elevation={1} sx={{ 
                        p: 3, 
                        borderRadius: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 2, textAlign: 'center' }}>
                          {classe.name}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                          <Button
                            variant="contained"
                            startIcon={<PersonAddIcon />}
                            onClick={() => handleSelectClass({ id: classe.id, name: classe.name })}
                            sx={{ 
                              minHeight: 48,
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                              fontWeight: 600
                            }}
                          >
                            Gérer absences
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<ScheduleIcon />}
                            onClick={() => handleCreateScheduleForClass(classe)}
                            sx={{ 
                              minHeight: 48,
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              borderColor: 'primary.main',
                              color: 'primary.main',
                              '&:hover': {
                                borderColor: 'primary.dark',
                                backgroundColor: 'primary.light',
                                color: 'primary.dark'
                              }
                            }}
                          >
                            Créer emploi
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewWeeklySchedule(classe)}
                            sx={{ 
                              minHeight: 48,
                              whiteSpace: 'nowrap',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              borderColor: 'success.main',
                              color: 'success.main',
                              '&:hover': {
                                borderColor: 'success.dark',
                                backgroundColor: 'success.light',
                                color: 'success.dark'
                              }
                            }}
                          >
                            Voir emploi
                          </Button>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                <Button sx={{ mt: 2, fontWeight: 600 }} onClick={() => setViewStep('subjects')}>
                  RETOUR AUX MATIÈRES
                </Button>
              </Paper>
            )}

            {viewStep === 'students' && selectedClass && (
              <Paper elevation={2} sx={{ p: 3, borderRadius: 4, borderTop: '4px solid #9c27b0' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                  <PersonIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Élèves de {selectedClass.name} {selectedSubject ? `- ${subjects.find(s => s.id === selectedSubject)?.name}` : ''}
                  </Typography>
                </Stack>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body1" color="text.secondary">
                    {students.length} élève(s)
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={handleOpenAbsenceDialog}
                  >
                    Gérer les absences
                  </Button>
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ mt: 1, mb: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#f4f6f8', fontWeight: 'bold' } }}>
                        <TableCell>Élève</TableCell>
                        <TableCell>Heures d'absences</TableCell>
                        <TableCell>Statut</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {processedStudents.map((row) => {
                        return (
                          <TableRow key={row.student.id} hover>
                            <TableCell sx={{fontWeight: 500}}>
                              {row.student.first_name} {row.student.last_name}
                            </TableCell>
                            <TableCell sx={{color: row.absenceCount > 0 ? 'error.main' : 'inherit', fontWeight: 600}}>
                              {row.absenceCount > 0 ? `${row.absenceCount.toFixed(0)} h` : '-'}
                            </TableCell>
                            <TableCell>
                              {row.absenceCount > 0 ? (
                                <Chip 
                                  label="Absences enregistrées" 
                                  color="warning" 
                                  size="small"
                                />
                              ) : (
                                <Chip 
                                  label="Présent" 
                                  color="success" 
                                  size="small"
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Button sx={{ mt: 2, fontWeight: 600 }} onClick={() => {
                  if (cameFromClassesList) {
                    // Si on vient de la liste des classes, retourner aux matières
                    setViewStep('subjects');
                    setCameFromClassesList(false);
                  } else {
                    // Sinon, retourner à la vue des classes
                    setViewStep('classes');
                  }
                }}>
                  {cameFromClassesList ? 'RETOUR AUX MATIÈRES' : 'RETOUR AUX CLASSES'}
                </Button>
              </Paper>
            )}
          </Grid>
        </Grid>


      </Container>

      {/* Dialog pour les absences */}
      <Dialog
        open={openAbsenceDialog}
        onClose={() => setOpenAbsenceDialog(false)}
        fullWidth
        maxWidth="md"
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{fontWeight: 700}}>
          Gérer les absences - {selectedClass?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Sélectionnez les élèves absents et indiquez la durée
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Élève</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Durée (heures)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Typography fontWeight={500}>
                        {student.first_name} {student.last_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small">
                        <Select
                          value={absenceChanges[student.id]?.status || 'present'}
                          onChange={(e) => handleAbsenceChange(student.id, 'status', e.target.value)}
                        >
                          <MenuItem value="present">Présent</MenuItem>
                          <MenuItem value="excused">Absent justifié</MenuItem>
                          <MenuItem value="unexcused">Absent non justifié</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="0"
                        value={absenceChanges[student.id]?.duration || 0}
                        onChange={(e) => handleAbsenceChange(student.id, 'duration', parseFloat(e.target.value) || 0)}
                        disabled={absenceChanges[student.id]?.status === 'present'}
                        inputProps={{ min: 0, step: 0.5 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{p: '16px 24px'}}>
          <Button onClick={() => setOpenAbsenceDialog(false)}>Annuler</Button>
          <Button 
            onClick={handleSubmitAbsences} 
            variant="contained"
            disabled={loadingAbsences}
          >
            {loadingAbsences ? <CircularProgress size={20} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Composant modal simple pour éviter les erreurs de DOM */}
      <CreateScheduleModal
        open={isScheduleDialogOpen}
        onClose={handleCloseScheduleDialog}
        selectedClass={selectedClassForSchedule}
        selectedSchoolYear={selectedSchoolYear}
        onSubmit={(startDate, endDate, description, dayOfWeek, domain, title) => 
          handleCreateSchedule(startDate, endDate, description, dayOfWeek, domain, title)
        }
      />

      {/* Composant séparé pour afficher l'emploi du temps hebdomadaire */}
      {showWeeklyScheduleDialog && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 1, sm: 2 },
            overflow: 'hidden'
          }}
          onClick={() => setShowWeeklyScheduleDialog(false)}
        >
          <Paper
            sx={{
              maxWidth: { xs: '100%', sm: 1200, md: 1400 },
              width: '100%',
              maxHeight: { xs: '100vh', sm: '95vh' },
              height: { xs: '100vh', sm: 'auto' },
              overflow: 'hidden',
              p: { xs: 1.5, sm: 2 },
              borderRadius: { xs: 0, sm: 2 },
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                {selectedClass ? `Emploi du temps hebdomadaire - ${selectedClass.name}` : 'Mon emploi du temps officiel'}
              </Typography>
              {selectedClass && (
                <IconButton 
                  onClick={async () => {
                    console.log('[DIALOGUE] Rafraîchissement manuel des données');
                    await handleViewWeeklySchedule(selectedClass);
                  }}
                  sx={{ 
                    backgroundColor: 'primary.light',
                    color: 'white',
                    '&:hover': { backgroundColor: 'primary.main' },
                    width: { xs: 40, sm: 48 },
                    height: { xs: 40, sm: 48 }
                  }}
                  title="Rafraîchir les données"
                >
                  <RefreshIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                </IconButton>
              )}
            </Box>
            
            {/* Afficher le titre de l'emploi du temps s'il existe */}
            {(() => {
              const filteredSchedule = getFilteredSchedule();
              console.log('[DIALOGUE] Données filtrées pour titre:', filteredSchedule);
              
              // Chercher le premier titre non vide dans les données filtrées
              const entryWithTitle = filteredSchedule.find(entry => entry.title && entry.title.trim() !== '');
              console.log('[DIALOGUE] Entrée avec titre trouvée:', entryWithTitle);
              console.log('[DIALOGUE] Titre trouvé:', entryWithTitle?.title);
              
              if (entryWithTitle && entryWithTitle.title) {
                console.log('[DIALOGUE] Affichage du titre:', entryWithTitle.title);
                return (
                  <Box sx={{ mb: 2, p: 1.5, bgcolor: 'primary.light', color: 'white', borderRadius: 1 }}>
                    <Typography variant="h6" fontWeight={600} align="center" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                      {entryWithTitle.title}
                    </Typography>
                  </Box>
                );
              } else {
                console.log('[DIALOGUE] Aucun titre trouvé');
              }
              return null;
            })()}
            
            {/* Sélecteur de semaine pour l'affichage */}
            {selectedClass && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={1} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                  Sélectionner la semaine à afficher :
                </Typography>
                <ToggleButtonGroup
                  value={selectedWeekForView}
                  exclusive
                  onChange={(e, newValue) => newValue && setSelectedWeekForView(newValue)}
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                >
                  <ToggleButton value="current" sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Semaine courante
                    </Typography>
                  </ToggleButton>
                  <ToggleButton value="next" sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Semaine suivante
                    </Typography>
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}
            
            {/* Afficher les données filtrées selon la semaine */}
            {(() => {
              const filteredSchedule = getFilteredSchedule();
              console.log('[DIALOGUE] Données filtrées pour affichage:', filteredSchedule);
              console.log('[DIALOGUE] Nombre d\'entrées filtrées:', filteredSchedule.length);
              console.log('[DIALOGUE] weeklySchedule complet:', weeklySchedule);
              console.log('[DIALOGUE] selectedWeekForView:', selectedWeekForView);
              
              // Debug spécifique pour mobile
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              if (isMobile) {
                console.log('[DIALOGUE MOBILE] Mode mobile détecté');
                console.log('[DIALOGUE MOBILE] Données complètes:', JSON.stringify(weeklySchedule, null, 2));
                console.log('[DIALOGUE MOBILE] Données filtrées:', JSON.stringify(filteredSchedule, null, 2));
              }
              
              return (
                <>
                  {/* Indicateur de la semaine affichée */}
                  <Box sx={{ mb: 1.5, p: 1.5, bgcolor: 'primary.light', color: 'white', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight={600} align="center" sx={{ fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                      {selectedWeekForView === 'current' ? 'Semaine courante' : 'Semaine suivante'} - 
                      {(() => {
                        // Calculer automatiquement les dates de la semaine courante et suivante
                        const today = new Date();
                        const currentWeekStart = new Date(today);
                        const dayOfWeek = today.getDay();
                        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lundi = 1
                        currentWeekStart.setDate(diff);
                        
                        const currentWeekEnd = new Date(currentWeekStart);
                        currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Dimanche
                        
                        const nextWeekStart = new Date(currentWeekStart);
                        nextWeekStart.setDate(currentWeekStart.getDate() + 7);
                        
                        const nextWeekEnd = new Date(nextWeekStart);
                        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
                        
                        if (selectedWeekForView === 'current') {
                          return `${currentWeekStart.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} au ${currentWeekEnd.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
                        } else {
                          return `${nextWeekStart.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} au ${nextWeekEnd.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`;
                        }
                      })()}
                    </Typography>

                  </Box>
                  
                  {filteredSchedule.length > 0 ? (
                    <Box sx={{ overflowX: 'auto', width: '100%', flex: 1 }}>
                      <TableContainer component={Paper} elevation={0} sx={{ maxHeight: { xs: '55vh', sm: '65vh' } }}>
                        <Table size="small" sx={{ minWidth: { xs: 500, sm: 700, md: 900 } }}>
                          <TableHead>
                            <TableRow>
                                                              <TableCell
                                  sx={{
                                    backgroundColor: '#f5f5f5',
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    border: '1px solid #ddd',
                                    width: { xs: '20%', sm: '15%' },
                                    minWidth: { xs: 70, sm: 100 },
                                    px: { xs: 0.5, sm: 0.75 },
                                    py: { xs: 0.5, sm: 0.75 }
                                  }}
                                >
                                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
                                    JOURS
                                  </Typography>
                                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
                                    DOMAINE
                                  </Typography>
                                </TableCell>
                              {[
                                { key: 'Monday', label: 'LUNDI', color: '#e3f2fd' },
                                { key: 'Tuesday', label: 'MARDI', color: '#f3e5f5' },
                                { key: 'Wednesday', label: 'MERCREDI', color: '#e8f5e8' },
                                { key: 'Thursday', label: 'JEUDI', color: '#fff3e0' },
                                { key: 'Friday', label: 'VENDREDI', color: '#fce4ec' }
                              ].map((day) => (
                                <TableCell
                                  key={day.key}
                                  sx={{
                                    backgroundColor: day.color,
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    border: '1px solid #ddd',
                                    width: { xs: '20%', sm: '17%' },
                                    minWidth: { xs: 50, sm: 80 },
                                    px: { xs: 0.5, sm: 0.75 },
                                    py: { xs: 0.5, sm: 0.75 }
                                  }}
                                >
                                  <Typography 
                                    variant="body2" 
                                    fontWeight="bold" 
                                    color="text.primary"
                                    sx={{ 
                                      fontSize: { xs: '0.55rem', sm: '0.65rem' },
                                      lineHeight: 1.1
                                    }}
                                  >
                                    {day.label}
                                  </Typography>
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {[
                              { key: 'rituel', label: 'RITUEL', color: '#f5f5f5' },
                              { key: 'langage_oral', label: 'LANGAGE ORAL', color: '#ff9800' },
                              { key: 'langage_ecrit', label: 'LANGAGE ÉCRIT', color: '#2196f3' },
                              { key: 'activite_motrice', label: 'ACTIVITÉ MOTRICE', color: '#4caf50' },
                              { key: 'activite_artistique', label: 'ACTIVITÉ ARTISTIQUE', color: '#ffeb3b' },
                              { key: 'eveil_mathematique', label: 'ÉVEIL MATHÉMATIQUE', color: '#f44336' },
                              { key: 'explorer_monde', label: 'EXPLORER LE MONDE', color: '#9c27b0' }
                            ].map((domain) => {
                                                              // Organiser les données par domaine et jour
                                const organizedData: { [day: string]: WeeklyScheduleEntry[] } = {};
                                ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].forEach(dayKey => {
                                organizedData[dayKey] = filteredSchedule.filter(entry => 
                                  entry.day_of_week === dayKey && entry.domain === domain.key
                                );
                              });

                              return (
                                <TableRow key={domain.key}>
                                  <TableCell
                                    sx={{
                                      backgroundColor: domain.color,
                                      fontWeight: 600,
                                      border: '1px solid #ddd',
                                      verticalAlign: 'top',
                                      width: { xs: '20%', sm: '15%' },
                                      minWidth: { xs: 80, sm: 100 },
                                      px: { xs: 0.5, sm: 0.75 },
                                      py: { xs: 0.5, sm: 0.75 }
                                    }}
                                  >
                                    <Typography 
                                      variant="body2" 
                                      fontWeight="bold"
                                      sx={{ 
                                        fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                        lineHeight: 1.1
                                      }}
                                    >
                                      {domain.label}
                                    </Typography>
                                  </TableCell>
                                                                                                            {[
                                        { key: 'Monday', label: 'LUNDI', color: '#e3f2fd' },
                                        { key: 'Tuesday', label: 'MARDI', color: '#f3e5f5' },
                                        { key: 'Wednesday', label: 'MERCREDI', color: '#e8f5e8' },
                                        { key: 'Thursday', label: 'JEUDI', color: '#fff3e0' },
                                        { key: 'Friday', label: 'VENDREDI', color: '#fce4ec' },
                                        
                                      ].map((day) => {
                                    const entries = organizedData[day.key] || [];
                                    return (
                                      <TableCell
                                        key={`${domain.key}-${day.key}`}
                                        sx={{
                                          border: '1px solid #ddd',
                                          verticalAlign: 'top',
                                          minHeight: { xs: 50, sm: 60 },
                                          width: { xs: '20%', sm: '17%' },
                                          minWidth: { xs: 60, sm: 80 },
                                          px: { xs: 0.5, sm: 0.75 },
                                          py: { xs: 0.5, sm: 0.75 }
                                        }}
                                      >
                                        {entries.length > 0 ? (
                                          entries.map((entry, index) => (
                                            <Box key={index} sx={{ mb: 0.5 }}>
                                              <Typography
                                                variant="body2"
                                                sx={{
                                                  fontSize: { xs: '0.6rem', sm: '0.7rem' },
                                                  lineHeight: 1.1
                                                }}
                                              >
                                                {entry.course_description}
                                              </Typography>
                                              {!entry.is_published && (
                                                <Chip 
                                                  label="Non publié" 
                                                  size="small" 
                                                  color="warning" 
                                                  sx={{ 
                                                    mt: 0.25, 
                                                    fontSize: { xs: '0.5rem', sm: '0.55rem' },
                                                    height: { xs: 14, sm: 16 }
                                                  }}
                                                />
                                              )}
                                            </Box>
                                          ))
                                        ) : (
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ 
                                              fontSize: { xs: '0.65rem', sm: '0.75rem' }
                                            }}
                                          >
                                            -
                                          </Typography>
                                        )}
                                      </TableCell>
                                    );
                                  })}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {selectedClass 
                          ? `Aucun emploi du temps hebdomadaire trouvé pour la classe ${selectedClass.name} (${selectedWeekForView === 'current' ? 'semaine courante' : 'semaine suivante'})`
                          : 'Aucun emploi du temps hebdomadaire disponible'
                        }
                      </Typography>
                      {selectedClass && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Total des activités créées pour cette classe : {weeklySchedule.length}
                        </Typography>
                      )}
                      

                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Utilisez le bouton "Créer emploi" pour ajouter des activités à cette semaine.
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Bas du tableau avec statistiques */}
                  <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'space-between', flexShrink: 0, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                    <Box sx={{ minWidth: { xs: '100%', sm: 'auto' }, mb: { xs: 1, sm: 0 } }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                        {selectedClass && `Classe: ${selectedClass.name}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                        {filteredSchedule.filter((entry: any) => entry.is_published).length} activités publiées sur {filteredSchedule.length} total
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }}>
                        Semaine: {selectedWeekForView === 'current' ? 'Courante' : 'Suivante'} ({filteredSchedule.length} activité{filteredSchedule.length > 1 ? 's' : ''})
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' }, gap: { xs: 0.5, sm: 1 } }}>
                      {selectedClass && (
                        <Button 
                          variant="contained" 
                          color="primary"
                          size="small"
                          onClick={() => handlePublishWeeklySchedule(selectedClass)}
                          disabled={filteredSchedule.filter((entry: any) => !entry.is_published).length === 0}
                          sx={{ 
                            fontSize: { xs: '0.7rem', sm: '0.8rem' },
                            px: { xs: 1, sm: 1.5 },
                            py: { xs: 0.5, sm: 0.75 }
                          }}
                        >
                          Publier l'emploi du temps
                        </Button>
                      )}
                      <Button 
                        size="small"
                        onClick={() => setShowWeeklyScheduleDialog(false)}
                        sx={{ 
                          fontSize: { xs: '0.7rem', sm: '0.8rem' },
                          px: { xs: 1, sm: 1.5 },
                          py: { xs: 0.5, sm: 0.75 }
                        }}
                      >
                        Fermer
                      </Button>
                    </Stack>
                  </Stack>
                </>
              );
            })()}
          </Paper>
        </Box>
      )}

      {/* Dialog pour publier un média */}
      <Dialog
        open={openMediaModal}
        onClose={() => setOpenMediaModal(false)}
        fullWidth
        maxWidth="sm"
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{fontWeight: 700}}>
          Publier un média pour un élève
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Élève</InputLabel>
              <Select
                value={selectedStudentForMedia}
                onChange={(e) => setSelectedStudentForMedia(e.target.value as number)}
                label="Élève"
              >
                {students.map((student) => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <ToggleButtonGroup
              value={mediaType}
              exclusive
              onChange={(e, newType) => newType && setMediaType(newType)}
              fullWidth
            >
              <ToggleButton value="photo">
                <PhotoIcon sx={{ mr: 1 }} />
                Photo
              </ToggleButton>
              <ToggleButton value="video">
                <VideoIcon sx={{ mr: 1 }} />
                Vidéo
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              fullWidth
            >
              Sélectionner un fichier
              <input
                type="file"
                hidden
                accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
                onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
              />
            </Button>
            {mediaFile && (
              <Typography variant="body2" color="success.main">
                Fichier sélectionné: {mediaFile.name}
              </Typography>
            )}
            <TextField
              label="Légende"
              multiline
              rows={3}
              value={mediaCaption}
              onChange={(e) => setMediaCaption(e.target.value)}
              placeholder="Ajoutez une description..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{p: '16px 24px'}}>
          <Button onClick={() => setOpenMediaModal(false)}>Annuler</Button>
          <Button 
            onClick={handleMediaUpload} 
            variant="contained"
            disabled={mediaLoading || !mediaFile || !selectedStudentForMedia}
          >
            {mediaLoading ? <CircularProgress size={20} /> : 'Publier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour publier un média en masse */}
      <Dialog
        open={openBulkMediaModal}
        onClose={() => setOpenBulkMediaModal(false)}
        fullWidth
        maxWidth="md"
        TransitionComponent={Fade}
      >
        <DialogTitle sx={{fontWeight: 700}}>
          Publier un média pour tous les élèves
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={selectAllStudents}
                  onChange={(e) => handleSelectAllStudents(e.target.checked)}
                />
              }
              label="Sélectionner tous les élèves"
            />
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {students.map((student) => (
                <FormControlLabel
                  key={student.id}
                  control={
                    <Switch
                      checked={selectedStudentsForBulk.includes(student.id)}
                      onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                    />
                  }
                  label={`${student.first_name} ${student.last_name}`}
                />
              ))}
            </Box>
            <ToggleButtonGroup
              value={bulkMediaType}
              exclusive
              onChange={(e, newType) => newType && setBulkMediaType(newType)}
              fullWidth
            >
              <ToggleButton value="photo">
                <PhotoIcon sx={{ mr: 1 }} />
                Photo
              </ToggleButton>
              <ToggleButton value="video">
                <VideoIcon sx={{ mr: 1 }} />
                Vidéo
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              fullWidth
            >
              Sélectionner un fichier
              <input
                type="file"
                hidden
                accept={bulkMediaType === 'photo' ? 'image/*' : 'video/*'}
                onChange={(e) => setBulkMediaFile(e.target.files?.[0] || null)}
              />
            </Button>
            {bulkMediaFile && (
              <Typography variant="body2" color="success.main">
                Fichier sélectionné: {bulkMediaFile.name}
              </Typography>
            )}
            <TextField
              label="Légende"
              multiline
              rows={3}
              value={bulkMediaCaption}
              onChange={(e) => setBulkMediaCaption(e.target.value)}
              placeholder="Ajoutez une description..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{p: '16px 24px'}}>
          <Button onClick={() => setOpenBulkMediaModal(false)}>Annuler</Button>
          <Button 
            onClick={handleBulkMediaUpload} 
            variant="contained"
            disabled={bulkMediaLoading || !bulkMediaFile || selectedStudentsForBulk.length === 0}
          >
            {bulkMediaLoading ? <CircularProgress size={20} /> : 'Publier'}
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

export default TeacherDashboard; 

