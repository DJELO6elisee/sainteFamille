import React, { useState } from 'react';
import { Box, Typography, Grid, Card, Avatar, Button, List, ListItem, ListItemAvatar, ListItemText, Chip, Paper, useTheme } from '@mui/material';
import { blue, green, orange, purple } from '@mui/material/colors';
import GroupsIcon from '@mui/icons-material/Groups';
import SchoolIcon from '@mui/icons-material/School';
import PaymentIcon from '@mui/icons-material/Payment';
import EventIcon from '@mui/icons-material/Event';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import EmailIcon from '@mui/icons-material/Email';
import TimelineIcon from '@mui/icons-material/Timeline';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { useNavigate } from 'react-router-dom';
import SecretarySidebar from '../components/SecretarySidebar';
// Supprime l'import direct de InscriptionPre
// import InscriptionPre from '/InscriptionPre';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CardContent,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import frLocale from 'date-fns/locale/fr';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';
import { useEffect } from 'react';
import UpdateButton from '../components/UpdateButton';

type DocumentStatus = 'pending' | 'uploaded' | 'verified' | 'rejected';
interface Document {
  id: string;
  name: string;
  file: File | null;
  status: DocumentStatus;
}

// Fonction utilitaire pour générer les 5 dernières années scolaires
function getSchoolYears(count = 5) {
  const now = new Date();
  const currentYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: count }, (_, i) => {
    const start = currentYear - (count - 1 - i);
    return `${start}-${start + 1}`;
  }).reverse();
}

const SecretaryDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  // Année scolaire sélectionnée (à adapter si tu as un sélecteur global)
  const [schoolYear, setSchoolYear] = useState(() => {
    const now = new Date();
    const currentYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return `${currentYear}-${currentYear + 1}`;
  });

  const [stats, setStats] = useState({
    students: 0, // nombre d'élèves ayant soldé
    totalStudents: 0, // nombre total d'élèves inscrits pour l'année sélectionnée
    classes: 0,
    paymentsPercent: 0,
    events: 0,
    soldedPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [availableYears] = useState(getSchoolYears(5));

  useEffect(() => {
    let isMounted = true;
    
    const fetchStats = async () => {
      if (!isMounted) return;
      
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      setLoading(true);
      
      try {
        const [studentsRes, totalStudentsRes, classesRes, paymentsRes, eventsRes] = await Promise.all([
          axios.get(`https://saintefamilleexcellence.ci/api/students?school_year=${schoolYear}`, { headers }), // inscrits
          axios.get(`https://saintefamilleexcellence.ci/api/students`, { headers }), // total
          axios.get(`https://saintefamilleexcellence.ci/api/classes?school_year=${schoolYear}`, { headers }),
          axios.get(`https://saintefamilleexcellence.ci/api/payments?school_year=${schoolYear}`, { headers }),
          axios.get(`https://saintefamilleexcellence.ci/api/events/all?school_year=${schoolYear}`, { headers }),
        ]);
        
        if (!isMounted) return;
        
        const students = studentsRes.data;
        const totalStudents = totalStudentsRes.data;
        const totalDue = students.reduce((sum: number, s: any) => sum + (s.total_due || 0), 0);
        const totalPaid = students.reduce((sum: number, s: any) => sum + (s.total_paid || 0), 0);
        const payments = paymentsRes.data;
        const soldedPayments = Array.isArray(payments) ? payments.filter((p: any) => p.status === 'completed' || p.status === 'paid').length : 0;
        const paymentsPercent = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;
        // Un élève a soldé si total_paid >= total_due (et total_due > 0)
        const studentsSolded = Array.isArray(students)
          ? students.filter((s: any) => Number(s.total_due) > 0 && Number(s.total_paid) >= Number(s.total_due))
          : [];
        
        if (isMounted) {
          setStats({
            students: studentsSolded.length, // nombre d'élèves soldés pour l'année sélectionnée
            totalStudents: students.length, // nombre total d'élèves inscrits pour l'année sélectionnée
            classes: classesRes.data.length,
            paymentsPercent,
            events: eventsRes.data.length,
            soldedPayments,
          });
          setLoading(false);
          setLoadingStats(false);
        }
      } catch (err) {
        if (isMounted) {
          setLoading(false);
          setLoadingStats(false);
        }
      }
    };
    
    fetchStats();
    
    return () => {
      isMounted = false;
    };
  }, [schoolYear]);

  // Ajout de l'état pour afficher/masquer le formulaire
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);

  // --- État et logique du formulaire d'inscription (issu de Registration.tsx) ---
  const steps = ['Informations personnelles', 'Informations académiques', 'Documents requis', 'Paiement'];
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<{
    matricule: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date | null;
    gender: string;
    address: string;
    city: string;
    postalCode: string;
    phone: string;
    email: string;
    previousSchool: string;
    previousClass: string;
    desiredClass: string;
    specialNeeds: string;
    additionalInfo: string;
    documents: Array<{
      id: string;
      name: string;
      file: File | null;
      status: DocumentStatus;
    }>;
    paymentStatus: 'pending' | 'completed' | 'failed';
    paymentAmount: number;
  }>({
    matricule: '',
    firstName: '',
    lastName: '',
    dateOfBirth: null,
    gender: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    email: '',
    previousSchool: '',
    previousClass: '',
    desiredClass: '',
    specialNeeds: '',
    additionalInfo: '',
    documents: [
      { id: 'birth', name: 'Acte de naissance', file: null, status: 'pending' },
      { id: 'report', name: 'Bulletin scolaire', file: null, status: 'pending' },
      { id: 'id', name: "Carte d'identité", file: null, status: 'pending' },
      { id: 'vaccine', name: 'Carnet de vaccination', file: null, status: 'pending' },
    ],
    paymentStatus: 'pending',
    paymentAmount: 150,
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const handleNext = () => {
    if (activeStep === 2 && !formData.documents.every(doc => doc.file)) {
      setSnackbar({ open: true, message: 'Veuillez télécharger tous les documents requis', severity: 'error' });
      return;
    }
    setActiveStep((prev) => prev + 1);
  };
  const handleBack = () => setActiveStep((prev) => prev - 1);
  const handleFileUpload = (documentId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        documents: prev.documents.map(doc =>
          doc.id === documentId ? { ...doc, file, status: 'uploaded' } : doc
        ),
      }));
    }
  };
  const handleDeleteFile = (documentId: string) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === documentId ? { ...doc, file: null, status: 'pending' } : doc
      ),
    }));
  };
  const handlePayment = () => {
    setFormData(prev => ({ ...prev, paymentStatus: 'completed' }));
    setSnackbar({ open: true, message: 'Paiement effectué avec succès !', severity: 'success' });
  };
  const handleSubmit = () => {
    if (formData.paymentStatus !== 'completed') {
      setSnackbar({ open: true, message: 'Veuillez compléter le paiement avant de soumettre', severity: 'error' });
      return;
    }
    setSnackbar({ open: true, message: 'Inscription soumise avec succès !', severity: 'success' });
    setShowRegistrationForm(false);
    setActiveStep(0);
    setFormData({
      matricule: '', firstName: '', lastName: '', dateOfBirth: null, gender: '', address: '', city: '', postalCode: '', phone: '', email: '', previousSchool: '', previousClass: '', desiredClass: '', specialNeeds: '', additionalInfo: '', documents: [
        { id: 'birth', name: 'Acte de naissance', file: null, status: 'pending' },
        { id: 'report', name: 'Bulletin scolaire', file: null, status: 'pending' },
        { id: 'id', name: "Carte d'identité", file: null, status: 'pending' },
        { id: 'vaccine', name: 'Carnet de vaccination', file: null, status: 'pending' },
      ], paymentStatus: 'pending', paymentAmount: 150,
    });
  };
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
  const getDocumentStatusIcon = (status: DocumentStatus) => {
    switch (status) {
      case 'verified': return <CheckCircleIcon color="success" />;
      case 'uploaded': return <PendingIcon color="primary" />;
      case 'rejected': return <ErrorIcon color="error" />;
      default: return null;
    }
  };
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField required fullWidth label="Matricule" value={formData.matricule} onChange={(e) => setFormData({ ...formData, matricule: e.target.value })} helperText="Numéro d'identification unique de l'élève" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField required fullWidth label="Prénom" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField required fullWidth label="Nom" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={frLocale}>
                <DatePicker label="Date de naissance" value={formData.dateOfBirth} onChange={(date) => setFormData({ ...formData, dateOfBirth: date })} slotProps={{ textField: { fullWidth: true } }} />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Genre</InputLabel>
                <Select value={formData.gender} label="Genre" onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                  <MenuItem value="M">Masculin</MenuItem>
                  <MenuItem value="F">Féminin</MenuItem>
                  <MenuItem value="A">Autre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField required fullWidth label="Adresse" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField required fullWidth label="Ville" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField required fullWidth label="Code postal" value={formData.postalCode} onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField required fullWidth label="Téléphone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField required fullWidth label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField required fullWidth label="École précédente" value={formData.previousSchool} onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField required fullWidth label="Classe précédente" value={formData.previousClass} onChange={(e) => setFormData({ ...formData, previousClass: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Classe souhaitée</InputLabel>
                <Select value={formData.desiredClass} label="Classe souhaitée" onChange={(e) => setFormData({ ...formData, desiredClass: e.target.value })}>
                  <MenuItem value="6eme">6ème</MenuItem>
                  <MenuItem value="5eme">5ème</MenuItem>
                  <MenuItem value="4eme">4ème</MenuItem>
                  <MenuItem value="3eme">3ème</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Besoins particuliers" multiline rows={2} value={formData.specialNeeds} onChange={(e) => setFormData({ ...formData, specialNeeds: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Informations supplémentaires" multiline rows={3} value={formData.additionalInfo} onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })} />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Documents requis</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>Veuillez télécharger les documents suivants. Format accepté : PDF, JPG, PNG (max 5MB)</Typography>
            </Grid>
            {formData.documents.map((doc) => (
              <Grid item xs={12} key={doc.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{doc.name}</Typography>
                        {getDocumentStatusIcon(doc.status as DocumentStatus)}
                      </Box>
                      <Box>
                        {!doc.file ? (
                          <Button component="label" startIcon={<CloudUploadIcon />} variant="outlined">
                            Télécharger
                            <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(doc.id, e)} />
                          </Button>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {doc.file ? (
                              <Typography variant="body2" color="text.secondary">{doc.file.name}</Typography>
                            ) : null}
                            <IconButton size="small" color="error" onClick={() => handleDeleteFile(doc.id)}><DeleteIcon /></IconButton>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );
      case 3:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Paiement des frais d'inscription</Typography>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography>Frais d'inscription</Typography>
                                            <Typography>{formData.paymentAmount} FCFA</Typography>
                  </Box>
                  {formData.paymentStatus === 'pending' ? (
                    <Button variant="contained" startIcon={<PaymentIcon />} onClick={handlePayment} fullWidth>Procéder au paiement</Button>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon color="success" />
                      <Typography color="success.main">Paiement effectué</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      default:
        return null;
    }
  };

  // Mapping explicite pour les couleurs de statut
  const statusColorMap: Record<string, string> = {
    success: theme.palette.success.main,
    info: theme.palette.info.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    default: theme.palette.primary.main,
  };

  // Actions rapides avec navigation réelle
  const quickActions = [
    { label: 'Nouvelle inscription', icon: <AddIcon color="primary" />, path: '/secretary/inscription-pre' },
    { label: 'Rechercher élève', icon: <SearchIcon color="action" />, path: '/secretary/students' },
    { label: 'Imprimer documents', icon: <PrintIcon sx={{ color: orange[500] }} />, path: '/secretary/print' },
  ];

  const tasks = [
    { label: 'Validation des inscriptions', status: 'En attente', date: '15/03/2024', color: 'warning', icon: <PendingActionsIcon /> },
    { label: 'Mise à jour des notes', status: 'En cours', date: '14/03/2024', color: 'info', icon: <TimelineIcon /> },
    { label: 'Envoi des relevés', status: 'Terminé', date: '13/03/2024', color: 'success', icon: <DoneAllIcon /> },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, width: '100%', p: { xs: 1, md: 4 }, bgcolor: '#f6f8fa', minHeight: '100vh' }}>
        {/* Header */}
        <Paper elevation={2} sx={{ p: { xs: 2, md: 4 }, mb: 4, borderRadius: 3, background: `linear-gradient(90deg, ${theme.palette.primary.light} 0%, #fff 100%)` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h3" fontWeight={700} gutterBottom sx={{ letterSpacing: 1 }}>
            Tableau de bord Administrateur
          </Typography>
            <FormControl size="small" sx={{ minWidth: 180, bgcolor: '#fff', borderRadius: 1 }}>
              <InputLabel id="school-year-label">Année scolaire</InputLabel>
              <Select
                labelId="school-year-label"
                value={schoolYear}
                label="Année scolaire"
                onChange={e => setSchoolYear(e.target.value)}
              >
                {availableYears.map(year => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Affichage du formulaire d'inscription si demandé */}
        {showRegistrationForm && (
          <Paper sx={{ p: 3, mb: 4, borderRadius: 3, background: '#fff' }}>
            <Typography variant="h5" gutterBottom align="center">Reçu d'inscription d'un nouvel élève</Typography>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {renderStepContent(activeStep)}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
              <Button onClick={() => setShowRegistrationForm(false)} color="error">Annuler</Button>
              <Button variant="contained" onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}>
                {activeStep === steps.length - 1 ? 'Soumettre' : 'Suivant'}
              </Button>
            </Box>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
              <Alert onClose={handleCloseSnackbar} severity={snackbar.severity as 'success' | 'info' | 'warning' | 'error'} sx={{ width: '100%' }}>
                {snackbar.message}
              </Alert>
            </Snackbar>
          </Paper>
        )}

        {/* Statistiques */}
        {loadingStats ? (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}><LinearProgress /></Grid>
          </Grid>
        ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3} key="students">
              <Card
                elevation={4}
                sx={{
                  borderRadius: 3,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.04)',
                    boxShadow: 8,
                  },
                  textAlign: 'center',
                  py: 2,
                }}
              >
                <Avatar sx={{ bgcolor: blue[500], width: 56, height: 56, mx: 'auto', mb: 1 }}>
                  <GroupsIcon fontSize="large" />
                </Avatar>
                <Typography variant="h5" fontWeight={700}>
                  {stats.totalStudents}
                </Typography>
                <Typography color="text.secondary" fontSize={16}>Élèves</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3} key="classes">
              <Card
                elevation={4}
                sx={{
                  borderRadius: 3,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.04)',
                    boxShadow: 8,
                  },
                  textAlign: 'center',
                  py: 2,
                }}
              >
                <Avatar sx={{ bgcolor: green[500], width: 56, height: 56, mx: 'auto', mb: 1 }}>
                  <SchoolIcon fontSize="large" />
                </Avatar>
                <Typography variant="h5" fontWeight={700}>{stats.classes}</Typography>
                <Typography color="text.secondary" fontSize={16}>Classes</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3} key="payments">
              <Card sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 0, borderRadius: 3 }}>
                <Avatar sx={{ bgcolor: orange[500], width: 56, height: 56, mb: 2 }}>
                  <PaymentIcon fontSize="large" />
                </Avatar>
                <Typography variant="h5" fontWeight={700}>
                  {stats.students} / {stats.totalStudents} soldés
                </Typography>
                <Typography color="text.secondary" fontSize={16}>Paiements</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3} key="events">
              <Card
                elevation={4}
                sx={{
                  borderRadius: 3,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.04)',
                    boxShadow: 8,
                  },
                  textAlign: 'center',
                  py: 2,
                }}
              >
                <Avatar sx={{ bgcolor: purple[400], width: 56, height: 56, mx: 'auto', mb: 1 }}>
                  <EventIcon fontSize="large" />
                </Avatar>
                <Typography variant="h5" fontWeight={700}>{stats.events}</Typography>
                <Typography color="text.secondary" fontSize={16}>Événements</Typography>
              </Card>
            </Grid>
        </Grid>
        )}

        <Grid container spacing={3}>
          {/* Actions rapides */}
          <Grid item xs={12} md={5}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Actions rapides
              </Typography>
              <List>
                {quickActions.map((action: any) => (
                  <ListItem key={action.label} disablePadding sx={{ mb: 1 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#e3eafc', color: theme.palette.primary.main }}>{action.icon}</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={action.label} />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(action.path)}
                      sx={{ ml: 2 }}
                    >
                      ACCÉDER
                    </Button>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

        </Grid>
      </Box>
      <UpdateButton position="fixed" />
    </Box>
  );
};

export default SecretaryDashboard; 

