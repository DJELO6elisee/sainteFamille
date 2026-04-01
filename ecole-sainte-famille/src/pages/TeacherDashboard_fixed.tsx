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
import { useNavigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';

interface Class {
  id: number;
  name: string;
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
  reason: string;
  status: 'excused' | 'unexcused';
  duration_hours?: number;
}

type AbsenceState = Map<number, { 
  status: 'present' | 'absent'; 
  reason: string; 
  justified: boolean; 
  initialStatus: 'present' | 'absent'; 
  duration_hours: number 
}>;

// Composant modal pour créer l'emploi du temps hebdomadaire par domaines
const CreateScheduleModal = ({ 
  open, 
  onClose, 
  selectedClass, 
  onSubmit 
}: {
  open: boolean;
  onClose: () => void;
  selectedClass: Class | null;
  onSubmit: (startDate: Date, endDate: Date, description: string, dayOfWeek: string, domain: string) => void;
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [description, setDescription] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('Saturday');
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
    
    // Calculer les dates selon la semaine sélectionnée (samedi-dimanche)
    const today = new Date();
    let saturday: Date;
    
    if (week === 'current') {
      // Semaine courante
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -1 : 6);
      saturday = new Date(today);
      saturday.setDate(diff);
    } else {
      // Semaine suivante
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -1 : 6);
      saturday = new Date(today);
      saturday.setDate(diff + 7); // Ajouter 7 jours pour la semaine suivante
    }
    
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    
    setStartDate(saturday);
    setEndDate(sunday);
  };

  // Initialiser les dates quand le modal s'ouvre
  useEffect(() => {
    if (open) {
      handleWeekChange('current');
      setDescription('');
      setDayOfWeek('Saturday');
      setSelectedDomain('');
    }
  }, [open]);

  const handleDomainChange = (domainKey: string) => {
    setSelectedDomain(domainKey);
    // Suggérer une activité basée sur le domaine
    const examples = domainExamples[domainKey as keyof typeof domainExamples] || [];
    if (examples.length > 0) {
      setDescription(examples[0]);
    }
  };

  const handleSubmit = () => {
    if (startDate && endDate) {
      onSubmit(startDate, endDate, description, dayOfWeek, selectedDomain);
    }
  };

  const handleClose = () => {
    setStartDate(null);
    setEndDate(null);
    setDescription('');
    setDayOfWeek('Saturday');
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
                  label="Date de début (Samedi)"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: 'Sélectionnez le samedi de la semaine'
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
                <MenuItem value="Saturday">Samedi</MenuItem>
                <MenuItem value="Sunday">Dimanche</MenuItem>
              </Select>
            </FormControl>

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
            disabled={!startDate || !endDate || !description.trim() || !dayOfWeek}
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
  const [absenceChanges, setAbsenceChanges] = useState<{ [key: number]: { reason: string; status: 'present' | 'excused' | 'unexcused'; duration: number } }>({});
  const [openAbsenceDialog, setOpenAbsenceDialog] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceData, setAbsenceData] = useState<AbsenceState>(new Map());
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedClassForSchedule, setSelectedClassForSchedule] = useState<Class | null>(null);
  const [weeklySchedules, setWeeklySchedules] = useState<{[key: number]: any[]}>({});
  const [showWeeklyScheduleDialog, setShowWeeklyScheduleDialog] = useState(false);
  const [selectedWeekForView, setSelectedWeekForView] = useState<'current' | 'next'>('current');
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
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingOfficialSchedule, setLoadingOfficialSchedule] = useState(false);
  const [loadingAbsences, setLoadingAbsences] = useState(false);
  const [weeklySchedule, setWeeklySchedule] = useState<any[]>([]);
  const [loadingWeeklySchedule, setLoadingWeeklySchedule] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
  const [loadingTeacherClasses, setLoadingTeacherClasses] = useState(false);
  const navigate = useNavigate();

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
    
    if (teacher?.id) {
      console.log('Chargement des matières pour teacher.id =', teacher.id);
      fetchMySubjects();
      loadTeacherSchedule(); // Charger l'emploi du temps officiel
      loadTeacherClasses(); // Charger les classes du professeur
    }
    
    return () => {
      isMounted = false;
    };
  }, [teacher?.id]);



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
      const absencesPromise = axios.get(`https://saintefamilleexcellence.ci/api/absences?class_id=${classe.id}&subject_id=${selectedSubject}`, { 
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
    if (!selectedClass || !selectedSubject) {
      setSnackbar({ open: true, message: 'Classe et matière requises', severity: 'error' });
      return;
    }

    setLoadingAbsences(true);

    try {
      const token = localStorage.getItem('token');
      const absencesToSubmit = Object.entries(absenceChanges).map(([studentId, data]) => ({
        student_id: parseInt(studentId),
        class_id: selectedClass.id,
        subject_id: selectedSubject,
        teacher_id: teacher.id,
        date: new Date().toISOString().split('T')[0],
        reason: data.reason,
        status: data.status,
        duration_hours: data.duration
      }));

      await axios.post('https://saintefamilleexcellence.ci/api/absences/bulk', absencesToSubmit, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSnackbar({ open: true, message: 'Absences enregistrées avec succès !', severity: 'success' });
      setOpenAbsenceDialog(false);
      setAbsenceChanges({});
      
      // Recharger les absences
      if (selectedClass) {
        await handleSelectClass(selectedClass);
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
      if (!teacher?.id) return;

      setLoadingOfficialSchedule(true);
      console.log('Chargement de l\'emploi du temps officiel pour le professeur:', teacher.id);
      
      const { data } = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/teacher/${teacher.id}`, {
        headers: { Authorization: `Bearer ${token}` }
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
        params: { school_year: getCurrentSchoolYear() }
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
        params: { school_year: getCurrentSchoolYear() }
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
        headers: { Authorization: `Bearer ${token}` }
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
        params: { school_year: getCurrentSchoolYear() }
      });

      console.log(`[handleViewWeeklySchedule] Données reçues:`, data);

      // Définir d'abord selectedClass, puis les données
      setSelectedClass(classe);
      setWeeklySchedule(data || []);
      setSelectedWeekForView('current'); // Réinitialiser à la semaine courante
      
      // Mettre à jour le state weeklySchedules
      setWeeklySchedules(prev => ({
        ...prev,
        [classe.id]: data || []
      }));

      // Ouvrir le dialogue
      setTimeout(() => {
        setShowWeeklyScheduleDialog(true);
        console.log(`[handleViewWeeklySchedule] Dialogue ouvert avec selectedClass:`, classe);
      }, 100);

      if (!data || data.length === 0) {
        setSnackbar({ 
          open: true, 
          message: 'Aucun emploi du temps hebdomadaire trouvé pour cette classe', 
          severity: 'info' 
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement des emplois du temps hebdomadaires:', err);
      setSnackbar({ 
        open: true, 
        message: 'Erreur lors du chargement des emplois du temps hebdomadaires', 
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

      // Récupérer les emplois du temps non publiés pour cette classe
      const { data: weeklySchedules } = await axios.get(`https://saintefamilleexcellence.ci/api/schedules/weekly-schedule/${classe.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { school_year: getCurrentSchoolYear() }
      });

      // Filtrer les emplois non publiés
      const unpublishedSchedules = weeklySchedules.filter((schedule: any) => !schedule.is_published);
      
      if (unpublishedSchedules.length === 0) {
        setSnackbar({ open: true, message: 'Aucun emploi du temps à publier', severity: 'info' });
        return;
      }

              // Grouper par semaine (start_date et end_date)
        const weeks = [...new Set(unpublishedSchedules.map((s: any) => `${s.start_date}_${s.end_date}`))] as string[];
        
        if (weeks.length > 1) {
          // Demander à l'utilisateur quelle semaine publier
          const weekOptions = weeks.map(week => {
            const [startDate, endDate] = week.split('_');
            // Extraire la date du format JavaScript (ex: "Mon Aug 04 2025 00:00:00 GMT+0200")
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
            return {
              key: week,
              label: `${startDateObj.toLocaleDateString('fr-FR')} au ${endDateObj.toLocaleDateString('fr-FR')}`,
              startDate: startDateObj.toISOString().split('T')[0], // Format YYYY-MM-DD
              endDate: endDateObj.toISOString().split('T')[0]     // Format YYYY-MM-DD
            };
          });
          
          // Pour l'instant, publier la première semaine (on pourrait ajouter un dialogue de sélection plus tard)
          const selectedWeek = weekOptions[0];
          console.log(`Publication de la semaine: ${selectedWeek.startDate} au ${selectedWeek.endDate}`);
          
          // Publier seulement les emplois du temps de la semaine sélectionnée
          const response = await axios.post('https://saintefamilleexcellence.ci/api/schedules/publish-weekly-schedule', {
            teacher_id: teacher.id,
            class_id: classe.id,
            school_year: getCurrentSchoolYear(),
            week_start_date: selectedWeek.startDate,
            week_end_date: selectedWeek.endDate
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setSnackbar({ 
            open: true, 
            message: `Emploi du temps publié pour la semaine du ${selectedWeek.label}`, 
            severity: 'success' 
          });
        } else {
          // Une seule semaine, publier directement
          const [startDate, endDate] = weeks[0].split('_');
          const startDateObj = new Date(startDate);
          const endDateObj = new Date(endDate);
          
          const response = await axios.post('https://saintefamilleexcellence.ci/api/schedules/publish-weekly-schedule', {
            teacher_id: teacher.id,
            class_id: classe.id,
            school_year: getCurrentSchoolYear(),
            week_start_date: startDateObj.toISOString().split('T')[0],
            week_end_date: endDateObj.toISOString().split('T')[0]
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setSnackbar({ 
            open: true, 
            message: `Emploi du temps publié pour la semaine du ${startDateObj.toLocaleDateString('fr-FR')} au ${endDateObj.toLocaleDateString('fr-FR')}`, 
            severity: 'success' 
          });
        }
      
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
  const getFilteredSchedule = () => {
    // Analyser les dates existantes pour déterminer les semaines
    const existingDates = weeklySchedule
      .filter(entry => entry.start_date)
      .map(entry => {
        const date = new Date(entry.start_date);
        // Convertir en date locale pour éviter les problèmes de fuseau horaire
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      })
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (existingDates.length === 0) {
      console.log('Aucune date trouvée dans les données');
      return weeklySchedule;
    }
    
    // Trouver les deux semaines distinctes (format YYYY-MM-DD)
    const uniqueDates = [...new Set(existingDates.map(date => 
      date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0')
    ))];
    console.log('Dates uniques trouvées:', uniqueDates);
    
    // Déterminer quelle semaine correspond à "courante" vs "suivante"
    const week1Start = new Date(uniqueDates[0]);
    const week2Start = new Date(uniqueDates[1] || uniqueDates[0]);
    
    console.log('Semaine 1 (courante):', uniqueDates[0]);
    console.log('Semaine 2 (suivante):', uniqueDates[1] || uniqueDates[0]);
    console.log('Semaine sélectionnée:', selectedWeekForView);
    
    return weeklySchedule.filter(entry => {
      if (!entry.start_date) return false;
      const entryStartDate = new Date(entry.start_date);
      // Convertir en date locale pour la comparaison
      const entryDateLocal = new Date(entryStartDate.getFullYear(), entryStartDate.getMonth(), entryStartDate.getDate());
      const entryDateStr = entryDateLocal.getFullYear() + '-' + 
        String(entryDateLocal.getMonth() + 1).padStart(2, '0') + '-' + 
        String(entryDateLocal.getDate()).padStart(2, '0');
      
      console.log(`Comparaison: ${entryDateStr} vs ${selectedWeekForView === 'current' ? uniqueDates[0] : uniqueDates[1] || uniqueDates[0]}`);
      
      if (selectedWeekForView === 'current') {
        return entryDateStr === uniqueDates[0];
      } else {
        return entryDateStr === (uniqueDates[1] || uniqueDates[0]);
      }
    });
  };

  const handleCreateSchedule = async (startDate: Date, endDate: Date, description: string, dayOfWeek: string, domain: string) => {
    if (!selectedClassForSchedule || !description.trim() || !dayOfWeek || !domain) {
      setSnackbar({ open: true, message: 'Veuillez remplir tous les champs', severity: 'error' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const payload = {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        course_description: description,
        day_of_week: dayOfWeek,
        domain: domain,
        subject_id: null, // Pas de matière spécifique pour les domaines
        class_id: selectedClassForSchedule.id,
        teacher_id: teacher?.id,
        school_year: getCurrentSchoolYear(),
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
        loadWeeklySchedulesForClass(selectedClassForSchedule.id);
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
          <SchoolIcon sx={{ fontSize: { xs: 28, md: 32 } }} />
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: 1, display: { xs: 'none', md: 'block' } }}>
            Espace Enseignant
          </Typography>
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
            {/* Section Emploi du temps officiel */}
            <Paper elevation={2} sx={{ p: 3, borderRadius: 4, borderTop: '4px solid #1976d2', mb: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                <ScheduleIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  Mon emploi du temps officiel
                </Typography>
              </Stack>
              {loadingOfficialSchedule ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : schedule.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ '& .MuiTableCell-root': { bgcolor: '#f4f6f8', fontWeight: 'bold' } }}>
                        <TableCell>Jour</TableCell>
                        <TableCell>Heure</TableCell>
                        <TableCell>Classe</TableCell>
                        <TableCell>Matière</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schedule.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Typography fontWeight={600}>
                              {(() => {
                                const day = item.day_of_week || item.day;
                                const dayMap: { [key: string]: string } = {
                                  'Saturday': 'Samedi',
                                  'Sunday': 'Dimanche'
                                };
                                return dayMap[day] || day;
                              })()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography>
                              {formatHour(item.start_time)} - {formatHour(item.end_time)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={item.class_name || 'N/A'} 
                              color="primary" 
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={item.subject_name || 'N/A'} 
                              color="secondary" 
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  Aucun emploi du temps officiel disponible
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            {viewStep === 'subjects' && (
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
            )}

            {/* Section Classes avec boutons d'action - visible dès l'arrivée */}
            {viewStep === 'subjects' && (
              <Paper elevation={2} sx={{ p: 3, borderRadius: 4, borderTop: '4px solid #ff9800', mt: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                  <ApartmentIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Mes classes
                  </Typography>
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
                            onClick={() => {
                              // Trouver la première matière pour cette classe
                              const firstSubject = subjects.find(s => s.id);
                              if (firstSubject) {
                                setSelectedSubject(firstSubject.id);
                                setCameFromClassesList(true); // Marquer qu'on vient de la liste des classes
                                handleSelectClass(classe);
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
                          </Button>
                          <Button
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
                          </Button>
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
                    Élèves de {selectedClass.name} - {subjects.find(s => s.id === selectedSubject)?.name}
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
            Sélectionnez les élèves absents et indiquez les détails
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Élève</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Raison</TableCell>
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
                        placeholder="Raison de l'absence"
                        value={absenceChanges[student.id]?.reason || ''}
                        onChange={(e) => handleAbsenceChange(student.id, 'reason', e.target.value)}
                        disabled={absenceChanges[student.id]?.status === 'present'}
                      />
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
        onSubmit={(startDate, endDate, description, dayOfWeek, domain) => 
          handleCreateSchedule(startDate, endDate, description, dayOfWeek, domain)
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
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
          }}
          onClick={() => setShowWeeklyScheduleDialog(false)}
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
              {selectedClass ? `Emploi du temps hebdomadaire - ${selectedClass.name}` : 'Mon emploi du temps officiel'}
            </Typography>
            
            {/* Sélecteur de semaine pour l'affichage */}
            {selectedClass && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                  Sélectionner la semaine à afficher :
                </Typography>
                <ToggleButtonGroup
                  value={selectedWeekForView}
                  exclusive
                  onChange={(e, newValue) => newValue && setSelectedWeekForView(newValue)}
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
              </Box>
            )}
            
            {/* Afficher les données filtrées selon la semaine */}
            {(() => {
              const filteredSchedule = getFilteredSchedule();
              
              return (
                <>
                  {/* Indicateur de la semaine affichée */}
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', color: 'white', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight={600} align="center">
                      {selectedWeekForView === 'current' ? 'Semaine courante' : 'Semaine suivante'} - 
                      {(() => {
                        // Analyser les dates existantes pour déterminer les semaines
                        const existingDates = weeklySchedule
                          .filter(entry => entry.start_date)
                          .map(entry => {
                            const date = new Date(entry.start_date);
                            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
                          })
                          .sort((a, b) => a.getTime() - b.getTime());
                        
                        if (existingDates.length === 0) {
                          return 'Aucune date disponible';
                        }
                        
                        const uniqueDates = [...new Set(existingDates.map(date => 
                          date.getFullYear() + '-' + 
                          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(date.getDate()).padStart(2, '0')
                        ))];
                        
                        if (selectedWeekForView === 'current') {
                          const weekStart = new Date(uniqueDates[0]);
                          const weekEnd = new Date(weekStart);
                          weekEnd.setDate(weekStart.getDate() + 4);
                          return `${weekStart.toLocaleDateString('fr-FR')} au ${weekEnd.toLocaleDateString('fr-FR')}`;
                        } else {
                          const weekStart = new Date(uniqueDates[1] || uniqueDates[0]);
                          const weekEnd = new Date(weekStart);
                          weekEnd.setDate(weekStart.getDate() + 4);
                          return `${weekStart.toLocaleDateString('fr-FR')} au ${weekEnd.toLocaleDateString('fr-FR')}`;
                        }
                      })()}
                    </Typography>
                  </Box>
                  
                  {filteredSchedule.length > 0 ? (
                    <Box sx={{ overflowX: 'auto', width: '100%' }}>
                      <TableContainer component={Paper} elevation={0}>
                        <Table size="small" sx={{ minWidth: { xs: 600, sm: 700, md: 800 } }}>
                          <TableHead>
                            <TableRow>
                              <TableCell
                                sx={{
                                  backgroundColor: '#f5f5f5',
                                  fontWeight: 600,
                                  textAlign: 'center',
                                  border: '1px solid #ddd',
                                  width: { xs: '25%', sm: '20%' },
                                  minWidth: { xs: 100, sm: 120 }
                                }}
                              >
                                <Typography variant="body2" fontWeight="bold">
                                  JOURS
                                </Typography>
                                <Typography variant="body2" fontWeight="bold">
                                  DOMAINE
                                </Typography>
                              </TableCell>
                              {[
                                { key: 'Saturday', label: 'SAMEDI', color: '#e1bee7' },
                                { key: 'Sunday', label: 'DIMANCHE', color: '#c8e6c9' }
                              ].map((day) => (
                                <TableCell
                                  key={day.key}
                                  sx={{
                                    backgroundColor: day.color,
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    border: '1px solid #ddd',
                                    width: { xs: '18.75%', sm: '20%' },
                                    minWidth: { xs: 80, sm: 100 },
                                    px: { xs: 0.5, sm: 1 }
                                  }}
                                >
                                  <Typography 
                                    variant="body2" 
                                    fontWeight="bold" 
                                    color="text.primary"
                                    sx={{ 
                                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                      lineHeight: 1.2
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
                              const organizedData: { [day: string]: any[] } = {};
                              ['Saturday', 'Sunday'].forEach(dayKey => {
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
                                      width: { xs: '25%', sm: '20%' },
                                      minWidth: { xs: 100, sm: 120 }
                                    }}
                                  >
                                    <Typography 
                                      variant="body2" 
                                      fontWeight="bold"
                                      sx={{ 
                                        fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                        lineHeight: 1.2
                                      }}
                                    >
                                      {domain.label}
                                    </Typography>
                                  </TableCell>
                                  {[
                                    { key: 'Saturday', label: 'SAMEDI', color: '#e1bee7' },
                                    { key: 'Sunday', label: 'DIMANCHE', color: '#c8e6c9' }
                                  ].map((day) => {
                                    const entries = organizedData[day.key] || [];
                                    return (
                                      <TableCell
                                        key={`${domain.key}-${day.key}`}
                                        sx={{
                                          border: '1px solid #ddd',
                                          verticalAlign: 'top',
                                          minHeight: { xs: 60, sm: 80 },
                                          width: { xs: '18.75%', sm: '20%' },
                                          minWidth: { xs: 80, sm: 100 },
                                          px: { xs: 0.5, sm: 1 }
                                        }}
                                      >
                                        {entries.length > 0 ? (
                                          entries.map((entry, index) => (
                                            <Box key={index} sx={{ mb: 1 }}>
                                              <Typography
                                                variant="body2"
                                                sx={{
                                                  fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                                  lineHeight: 1.2
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
                                                    mt: 0.5, 
                                                    fontSize: { xs: '0.55rem', sm: '0.6rem' },
                                                    height: { xs: 16, sm: 20 }
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
                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      {selectedClass 
                        ? `Aucun emploi du temps hebdomadaire trouvé pour la classe ${selectedClass.name} (${selectedWeekForView === 'current' ? 'semaine courante' : 'semaine suivante'})`
                        : 'Aucun emploi du temps hebdomadaire disponible'
                      }
                    </Typography>
                  )}
                  
                  {/* Bas du tableau avec statistiques */}
                  <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {selectedClass && `Classe: ${selectedClass.name}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {filteredSchedule.filter((entry: any) => entry.is_published).length} activités publiées sur {filteredSchedule.length} total
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={2}>
                      {selectedClass && (
                        <Button 
                          variant="contained" 
                          color="primary"
                          onClick={() => handlePublishWeeklySchedule(selectedClass)}
                          disabled={filteredSchedule.filter((entry: any) => !entry.is_published).length === 0}
                        >
                          Publier l'emploi du temps
                        </Button>
                      )}
                      <Button onClick={() => setShowWeeklyScheduleDialog(false)}>Fermer</Button>
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

