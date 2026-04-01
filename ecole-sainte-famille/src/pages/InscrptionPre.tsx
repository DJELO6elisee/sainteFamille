import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Snackbar,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  Fade,
  Zoom,
  Divider,
  Table,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import frLocale from 'date-fns/locale/fr';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ErrorIcon from '@mui/icons-material/Error';
import PhoneIcon from '@mui/icons-material/Phone';
import { blue, green, orange, purple, pink } from '@mui/material/colors';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import SecretarySidebar from '../components/SecretarySidebar';
import { formatDateForAPI, formatDateForDisplay, formatDateForReceipt, convertDDMMYYYYToDate } from '../utils/dateUtils';

// Étapes du formulaire : uniquement "Informations personnelles" pour le présentiel
const steps = ['Informations personnelles'];

interface Document {
  id: string;
  name: string;
  file: File | null;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
}

// Modifie RegistrationForm : ajoute matricule manuel optionnel, cantine et eatsAtCantine
interface RegistrationForm {
  // Informations personnelles
  matricule?: string; // ajouté pour saisie manuelle optionnelle
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  gender: string;
  address?: string; // Rendu optionnel
  city?: string; // Rendu optionnel
  // phone: string; // Champ téléphone retiré
  // email: string; // supprimé
  cantine: boolean; // ajouté
  eatsAtCantine?: boolean; // ajouté
  allergy?: string; // ajouté

  // Informations parent
  parentFirstName: string;
  parentLastName: string;
  parentPhone: string;
  parentEmail?: string; // Rendu optionnel
  parentContact?: string; // Rendu optionnel
  emergencyContact: string; // Ajouté

  // Informations académiques (conservées pour payload, mais plus d'étape dédiée)
  previousSchool: string;
  previousClass: string;
  desiredClass: string | number;
  desiredClassName: string;

  // Champ de paiement retiré
  // paymentAmount: string;
}

// Les fonctions de formatage des dates sont maintenant importées depuis dateUtils.ts

// Ajoute ce type pour éviter l'erreur TypeScript si besoin
declare global {
  interface Window {
    MonnaieFusion?: any;
  }
}

const Receipt = ({ data, onClose, receiptRef, handleDownload }: {
  data: any,
  onClose: () => void,
  receiptRef: React.RefObject<HTMLDivElement>,
  handleDownload: () => void,
}) => {
  const remaining = (data.total_due || 0) - (data.payment_amount || 0);

  const handlePrint = () => {
    if (receiptRef.current) {
      const printContents = receiptRef.current.innerHTML;
      const printWindow = window.open('', '', 'height=700,width=900');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Reçu d\'inscription - GS GROUPE SCOLAIRE SAINTE FAMILLE L\'EXECELLENCE</title>');
        printWindow.document.write(`
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 20px; 
              line-height: 1.6;
              color: #333;
            }
            .receipt-container { padding: 30px; }
            h3, h4, h6 { color: #1976d2; }
            .MuiChip-root { 
              background-color: #1976d2 !important; 
              color: white !important;
              padding: 4px 8px;
              border-radius: 4px;
              font-weight: bold;
            }
            img { 
              display: block; 
              margin: 0 auto 15px auto;
              max-width: 150px;
              height: auto;
            }
            .signature-area {
              border-bottom: 1px solid #333;
              height: 60px;
              margin-bottom: 10px;
            }
            @media print {
              body { margin: 10px; }
              .no-print { display: none !important; }
            }
          </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContents);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        justifyContent: 'center',
        background: '#f5f7fa',
        py: 4,
      }}
    >
      <Paper
        ref={receiptRef}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          boxShadow: 4,
          maxWidth: 600,
          width: '100%',
          mx: 'auto',
          background: 'white',
          mb: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <img src="/img/pages/vrailogo.jpg" alt="Logo École" style={{ width: 180, height: 110, objectFit: 'contain' }} />
        </Box>
        
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
            GS GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE
          </Typography>
          <Typography variant="body1" sx={{ color: '#666', mb: 1 }}>
            École Primaire Privée
          </Typography>
          <Typography variant="body2" sx={{ color: '#888', mb: 2 }}>
            Cocody - Abidjan, Côte d'Ivoire
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#1976d2' }}>
            REÇU D'INSCRIPTION 2025-2026
          </Typography>
        </Box>

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1976d2', borderBottom: '2px solid #1976d2', pb: 1 }}>
          INFORMATIONS DE L'ÉLÈVE
        </Typography>
        <Grid container spacing={2} sx={{ width: '100%', mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Typography sx={{ mb: 1 }}><b>Nom & Prénoms:</b> {data.last_name} {data.first_name}</Typography>
            <Typography sx={{ mb: 1 }}><b>Matricule:</b> {data.registration_number || 'En cours de génération...'}</Typography>
            <Typography sx={{ mb: 1 }}><b>Classe:</b> {data.desiredClassName}</Typography>
            <Typography sx={{ mb: 1 }}><b>Cantine:</b> {data.cantine ? <Chip label="Oui" color="success" size="small" sx={{ ml: 1 }} /> : <Chip label="Non" color="default" size="small" sx={{ ml: 1 }} />}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography sx={{ mb: 1 }}><b>Date d'inscription:</b> {data.date}</Typography>
            <Typography sx={{ mb: 1 }}><b>Genre:</b> {data.gender === 'M' ? 'Masculin' : data.gender === 'F' ? 'Féminin' : 'N/A'}</Typography>
            <Typography sx={{ mb: 1 }}><b>Date de naissance:</b> {formatDateForReceipt(data.date_of_birth)}</Typography>
          </Grid>
        </Grid>
        
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1976d2', borderBottom: '2px solid #1976d2', pb: 1 }}>
          INFORMATIONS DES PARENTS
        </Typography>
        <Grid container spacing={2} sx={{ width: '100%', mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <Typography sx={{ mb: 1 }}><b>Nom du parent:</b> {data.parent_first_name} {data.parent_last_name}</Typography>
            <Typography sx={{ mb: 1 }}><b>Contact principal:</b> {data.parent_contact}</Typography>
            <Typography sx={{ mb: 1 }}><b>Téléphone:</b> {data.parent_phone}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography sx={{ mb: 1 }}><b>Email:</b> {data.parent_email}</Typography>
            <Typography sx={{ mb: 1 }}><b>Code Parent:</b> <Chip label={data.parent_code} color="primary" size="medium" sx={{ fontWeight: 'bold' }} /></Typography>
            <Typography sx={{ mb: 1 }}><b>Contact d'urgence:</b> {data.emergency_contact || 'N/A'}</Typography>
          </Grid>
        </Grid>
        
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1976d2', borderBottom: '2px solid #1976d2', pb: 1 }}>
          FRAIS DE SCOLARITÉ
        </Typography>
        <Box sx={{ width: '100%', mb: 3, bgcolor: '#f5f5f5', p: 2, borderRadius: 2, border: '1px solid #ddd' }}>
          <Typography sx={{ fontSize: '1.2rem', fontWeight: 600 }}>
            <b>Montant:</b> {data.class_amount ? Number(data.class_amount).toLocaleString('fr-FR') : 'N/A'} FCFA
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
            Frais de scolarité pour l'année 2025-2026
          </Typography>
        </Box>

        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #ddd', textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#666', fontStyle: 'italic' }}>
            Ce reçu confirme l'inscription de l'élève pour l'année scolaire 2025-2026
          </Typography>
          <Typography variant="body2" sx={{ color: '#1976d2', fontWeight: 600, mt: 1 }}>
            Parent: {data.parent_first_name} {data.parent_last_name}
          </Typography>
        </Box>
      </Paper>
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', width: '100%', maxWidth: 600, mt: 2 }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleDownload}
          sx={{ fontWeight: 600, px: 4, py: 1.5, fontSize: 16 }}
        >
          Télécharger le reçu
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handlePrint}
          sx={{ fontWeight: 600, px: 4, py: 1.5, fontSize: 16 }}
        >
          Imprimer le reçu
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', width: '100%', maxWidth: 600, mt: 1 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={onClose}
          sx={{ fontWeight: 600, px: 4, py: 1.5, fontSize: 16 }}
        >
          Fermer
        </Button>
      </Box>
    </Box>
  );
};



// Fonction utilitaire pour convertir un élève backend en RegistrationForm
function mapStudentToRegistrationForm(student: any): RegistrationForm {
  student = student || {};
  return {
    matricule: student.registration_number || undefined, // Optionnel - sera généré automatiquement si non fourni
    firstName: student.first_name || student.firstName || '',
    lastName: student.last_name || student.lastName || '',
    dateOfBirth: student.date_of_birth ? convertDDMMYYYYToDate(student.date_of_birth) : (student.dateOfBirth || null),
    gender: student.gender || '',
    address: student.address || undefined, // Rendu optionnel
    city: student.city || undefined, // Rendu optionnel
    // phone: student.phone || '', // Champ téléphone retiré
    // email: student.email || '', // supprimé
    cantine: typeof student.cantine === 'boolean' ? student.cantine : false, // corrigé
    eatsAtCantine: typeof student.eatsAtCantine === 'boolean' ? student.eatsAtCantine : undefined, // ajouté
    allergy: student.allergy || '', // ajouté
    previousSchool: student.previous_school || student.previousSchool || '',
    previousClass: student.previous_class || student.previousClass || '',
    desiredClass: '',
    desiredClassName: '',
    parentFirstName: student.parent_first_name || student.parentFirstName || '',
    parentLastName: student.parent_last_name || student.parentLastName || '',
    parentPhone: student.parent_phone || student.parentPhone || '',
    parentEmail: student.parent_email || student.parentEmail || undefined, // Rendu optionnel
    parentContact: student.parent_contact || student.parentContact || undefined, // Rendu optionnel
    emergencyContact: student.emergency_contact || '',
  };
}

const InscrptionPre = ({ onClose, initialData }: { onClose: () => void, initialData?: any }) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  // Initialisation du formulaire avec initialData si présente
  const [formData, setFormData] = useState<RegistrationForm>(mapStudentToRegistrationForm(initialData));

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const [receiptData, setReceiptData] = useState<any | null>(null);

  // Correction : ref et download ici
  const receiptRef = useRef<HTMLDivElement>(null);
  const handleDownload = () => {
    if (receiptRef.current) {
      html2pdf().from(receiptRef.current).save('recu-inscription.pdf');
    }
  };

  // Ajoute un état pour la photo de l'élève
  const [childPhoto, setChildPhoto] = useState<File | null>(null);

  const [classes, setClasses] = useState<any[]>([]);
  useEffect(() => {
    let isMounted = true;
    
    axios.get('https://saintefamilleexcellence.ci/api/classes', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => {
        if (isMounted) {
          console.log('📚 Classes récupérées depuis classController:', res.data);
          setClasses(res.data);
        }
      })
      .catch((error) => {
        console.error('Erreur récupération classes:', error);
        if (isMounted) setClasses([]);
      });
      
    return () => {
      isMounted = false;
    };
  }, []);

  // Supprime la gestion des documents et des étapes multiples
  // Validation simplifiée sans paiement
  const selectedClass = classes.find(c => c.id === Number(formData.desiredClass));
  const eatsAtCantineRequired = formData.cantine;
  const eatsAtCantineValid = !eatsAtCantineRequired || typeof formData.eatsAtCantine === 'boolean';
  const isFormValid = selectedClass && eatsAtCantineValid;

  const handleNext = () => {
    // This function is no longer needed as there's only one step
    // setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    // This function is no longer needed as there's only one step
    // setActiveStep((prevStep) => prevStep - 1);
  };

  const handleFileUpload = (documentId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    // This function is no longer needed as there's no document management
    // const file = event.target.files?.[0];
    // if (file) {
    //   setFormData(prev => ({
    //     ...prev,
    //     documents: prev.documents.map(doc =>
    //       doc.id === documentId
    //         ? { ...doc, file, status: 'uploaded' }
    //         : doc
    //     ),
    //   }));
    // }
  };

  const handleSubmit = async () => {
    try {
      // Validation des champs requis
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.gender ||
          !formData.parentFirstName || !formData.parentLastName || !formData.parentPhone || !formData.emergencyContact) {
        setSnackbar({
          open: true,
          message: 'Veuillez remplir tous les champs obligatoires',
          severity: 'error',
        });
        return;
      }
      
      if (!formData.gender) {
        setSnackbar({
          open: true,
          message: 'Veuillez sélectionner le genre',
          severity: 'error',
        });
        return;
      }
      if (eatsAtCantineRequired && typeof formData.eatsAtCantine !== 'boolean') {
        setSnackbar({
          open: true,
          message: 'Veuillez indiquer si l\'enfant mange à la cantine',
          severity: 'error',
        });
        return;
      }
      // Utilisation de FormData pour multipart/form-data
      const form = new FormData();
      form.append('first_name', formData.firstName);
      form.append('last_name', formData.lastName);
      form.append('date_of_birth', formatDateForAPI(formData.dateOfBirth));
      form.append('gender', formData.gender);
      // Envoyer les champs optionnels (vides ou remplis)
      form.append('address', formData.address || '');
      form.append('city', formData.city || '');
      form.append('registration_number', formData.matricule || ''); // Ajouté pour saisie manuelle (vide si non fourni)
      // form.append('phone', formData.phone); // Champ téléphone retiré
      // form.append('email', formData.email); // supprimé
      form.append('password', formData.lastName); // ou un champ mot de passe saisi (remplace matricule)
      form.append('previous_school', formData.previousSchool);
      form.append('previous_class', formData.previousClass);
      form.append('desired_class', String(formData.desiredClass));
      form.append('special_needs', '');
      form.append('additional_info', '');
      form.append('registration_mode', 'onsite'); // mode présentiel
      form.append('parent_first_name', formData.parentFirstName);
      form.append('parent_last_name', formData.parentLastName);
      form.append('parent_phone', formData.parentPhone);
      // Envoyer les champs optionnels (vides ou remplis)
      form.append('parent_email', formData.parentEmail || '');
      form.append('parent_contact', formData.parentContact || '');
      form.append('emergency_contact', formData.emergencyContact);
      
      // Debug: afficher les valeurs des champs requis
      console.log('🔍 Debug champs requis:');
      console.log('first_name:', formData.firstName);
      console.log('last_name:', formData.lastName);
      console.log('date_of_birth (objet Date):', formData.dateOfBirth);
      console.log('date_of_birth (formaté pour API):', formatDateForAPI(formData.dateOfBirth));
      console.log('gender:', formData.gender);
      console.log('parent_first_name:', formData.parentFirstName);
      console.log('parent_last_name:', formData.parentLastName);
      console.log('parent_phone:', formData.parentPhone);
      console.log('emergency_contact:', formData.emergencyContact);
      // Correction : log et conversion stricte du booléen cantine
      console.log('Valeur cantine avant envoi:', formData.cantine, typeof formData.cantine);
      form.append('cantine', formData.cantine === true ? '1' : '0');
      form.append('eats_at_cantine', eatsAtCantineRequired ? (formData.eatsAtCantine ? '1' : '0') : '');
      form.append('allergy', formData.cantine ? (formData.allergy || '') : ''); // ajouté
      if (childPhoto) {
        form.append('child_photo', childPhoto);
      }

      await axios.post(
        'https://saintefamilleexcellence.ci/api/students',
        form,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
        .then(async (response) => {
          console.log('✅ Réponse de création d\'élève:', response.data);
          const now = new Date();
          
          // Récupère les infos complètes de l'élève nouvellement créé
          const { data: studentData } = await axios.get(
            `https://saintefamilleexcellence.ci/api/students/${response.data.id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            }
          );
          console.log('✅ Données complètes de l\'élève:', studentData);
          
          const selectedClassData = classes.find(c => c.id === Number(formData.desiredClass));
          console.log('🔍 Classe sélectionnée:', selectedClassData);
          console.log('🔍 ID recherché:', Number(formData.desiredClass));
          console.log('🔍 Toutes les classes:', classes);
          
          // Récupérer le montant depuis le contrôleur des classes (corrigé)
          let classAmount = 0;
          if (selectedClassData && selectedClassData.amount) {
            classAmount = Number(selectedClassData.amount);
            console.log('💰 Montant depuis classController:', classAmount);
          }
          
          // Si pas de montant trouvé, essayer de récupérer depuis studentData
          if (!classAmount && studentData.class_amount) {
            classAmount = Number(studentData.class_amount);
            console.log('💰 Montant depuis studentData:', classAmount);
          }
          
          console.log('💰 Montant final calculé:', classAmount);
          
          const receiptDataToSet = {
            ...studentData,
            date: now.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
            student_code: response.data.student_code,
            parent_code: response.data.parent_code,
            desiredClassName: selectedClassData?.name || '',
            class_amount: classAmount,
            cantine: formData.cantine, // Ajouté pour le reçu
          };
          
          console.log('📄 Données du reçu à définir:', receiptDataToSet);
          setReceiptData(receiptDataToSet);
          
          setSnackbar({
            open: true,
            message: 'Inscription soumise avec succès !',
            severity: 'success',
          });
        });
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'inscription:', error);
      console.error('❌ Détails de l\'erreur:', error.response?.data);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erreur lors de l\'inscription',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getDocumentStatusIcon = (status: Document['status']) => {
    // This function is no longer needed as there's no document management
    // switch (status) {
    //   case 'verified':
    //     return <CheckCircleIcon color="success" />;
    //   case 'uploaded':
    //     return <PendingIcon color="primary" />;
    //   case 'rejected':
    //     return <ErrorIcon color="error" />;
    //   default:
    //     return null;
    // }
    return null; // No document status to display
  };

  // Remplace renderStepContent par le contenu unique de "Informations personnelles"
  const renderStepContent = () => {
    return (
      <Grid container spacing={3}>
        {/* Informations de l'élève */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
            Informations de l'élève
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Matricule (optionnel)"
            value={formData.matricule || ''}
            onChange={(e) => setFormData({ ...formData, matricule: e.target.value || undefined })}
            placeholder="Laissez vide pour génération automatique (BM + 6 chiffres)"
            helperText="Si non renseigné, un matricule sera généré automatiquement"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            required
            fullWidth
            label="Prénom"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            required
            fullWidth
            label="Nom"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={frLocale}>
            <DatePicker
              label="Date de naissance"
              value={formData.dateOfBirth}
              onChange={(date) => setFormData({ ...formData, dateOfBirth: date })}
              slotProps={{
                textField: { fullWidth: true },
                popper: { disablePortal: true }
              }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel id="genre-label">Genre</InputLabel>
            <Select
              labelId="genre-label"
              value={formData.gender}
              label="Genre"
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              MenuProps={{ disablePortal: true }}
            >
              <MenuItem value=""><em>Choisir...</em></MenuItem>
              <MenuItem value="M">Masculin</MenuItem>
              <MenuItem value="F">Féminin</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Adresse"
            value={formData.address || ''}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            helperText="(Optionnel)"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Ville"
            value={formData.city || ''}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            helperText="(Optionnel)"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
        </Grid>
        {/* Champ téléphone de l'élève retiré */}

        {/* Informations du parent */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
            Informations du parent
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            required
            fullWidth
            label="Prénom du parent"
            value={formData.parentFirstName}
            onChange={(e) => setFormData({ ...formData, parentFirstName: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            required
            fullWidth
            label="Nom du parent"
            value={formData.parentLastName}
            onChange={(e) => setFormData({ ...formData, parentLastName: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            required
            fullWidth
            label="Téléphone du parent"
            value={formData.parentPhone}
            onChange={(e) => {
              const value = e.target.value;
              // N'accepter que les chiffres, +, -, (, ), et espaces
              const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
              setFormData({ ...formData, parentPhone: filteredValue });
            }}
            inputProps={{ 
              pattern: "[0-9+\\s\\-\\(\\)]*",
              title: "Veuillez saisir un numéro de téléphone valide"
            }}
            helperText="Format: +225 0123456789 ou 0123456789"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email du parent"
            value={formData.parentEmail || ''}
            onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
            helperText="(Optionnel)"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Contact du parent"
            value={formData.parentContact || ''}
            onChange={(e) => {
              const value = e.target.value;
              // N'accepter que les chiffres, +, -, (, ), et espaces
              const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
              setFormData({ ...formData, parentContact: filteredValue });
            }}
            inputProps={{ 
              pattern: "[0-9+\\s\\-\\(\\)]*",
              title: "Veuillez saisir un numéro de téléphone valide"
            }}
            helperText="(Optionnel) Format: +225 0123456789 ou 0123456789"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            required
            fullWidth
            label="Contact à joindre en cas d'urgence"
            value={formData.emergencyContact}
            onChange={(e) => {
              const value = e.target.value;
              // N'accepter que les chiffres, +, -, (, ), et espaces
              const filteredValue = value.replace(/[^0-9+\-\(\)\s]/g, '');
              setFormData({ ...formData, emergencyContact: filteredValue });
            }}
            inputProps={{ 
              pattern: "[0-9+\\s\\-\\(\\)]*",
              title: "Veuillez saisir un numéro de téléphone valide"
            }}
            helperText="Format: +225 0123456789 ou 0123456789"
            InputProps={{
              startAdornment: (
                <PhoneIcon sx={{ color: '#1976d2', mr: 1 }} />
              ),
            }}
          />
        </Grid>

        {/* Informations académiques */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
            Informations académiques
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel id="desired-class-label">Classe souhaitée</InputLabel>
            <Select
              labelId="desired-class-label"
              value={formData.desiredClass}
              label="Classe souhaitée"
              onChange={e => {
                const classId = e.target.value;
                setFormData({ ...formData, desiredClass: classId, desiredClassName: classes.find(c => c.id === Number(classId))?.name || '' });
              }}
            >
              {classes.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {/* Affichage discret du montant de scolarité */}
          {selectedClass && (
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.75rem',
                color: 'primary.main',
                mt: 0.5,
                display: 'block',
                fontWeight: 600
              }}
            >
              Frais de scolarité: {selectedClass && selectedClass.amount ? Number(selectedClass.amount).toLocaleString('fr-FR') : 'Non défini'} FCFA
            </Typography>
          )}
        </Grid>

        {/* Photo de l'élève */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
            Photo de l'élève
          </Typography>
        </Grid>
        <Grid item xs={12}>
          {childPhoto ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">{childPhoto.name}</Typography>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => setChildPhoto(null)}
              >
                Retirer
              </Button>
            </Box>
          ) : (
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              sx={{ mt: 1 }}
            >
              Sélectionner une photo
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/jpg"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setChildPhoto(file);
                }}
              />
            </Button>
          )}
        </Grid>


        {/* Cantine */}
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mt: 3, mb: 2, pb: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
            Cantine
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.cantine}
                onChange={e => setFormData({ ...formData, cantine: e.target.checked, eatsAtCantine: undefined, allergy: '' })}
                color="primary"
              />
            }
            label="Inscrire à la cantine"
          />
        </Grid>
        {formData.cantine && (
          <>
            <Grid item xs={12} md={6}>
              <FormControl component="fieldset" required>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>L'enfant mange à la cantine ?</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControlLabel
                    control={<Checkbox checked={formData.eatsAtCantine === true} onChange={() => setFormData({ ...formData, eatsAtCantine: true })} />}
                    label="Oui"
                  />
                  <FormControlLabel
                    control={<Checkbox checked={formData.eatsAtCantine === false} onChange={() => setFormData({ ...formData, eatsAtCantine: false })} />}
                    label="Non"
                  />
                </Box>
                {!eatsAtCantineValid && <Typography color="error" variant="caption">Veuillez indiquer si l'enfant mange à la cantine</Typography>}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Allergie(s) éventuelle(s)"
                value={formData.allergy || ''}
                onChange={e => setFormData({ ...formData, allergy: e.target.value })}
                placeholder="Ex : arachide, lait, oeuf..."
                helperText="Laisser vide si aucune allergie connue."
              />
            </Grid>
          </>
        )}
      </Grid>
    );
  };

  if (receiptData) {
    return (
      <Box sx={{ display: 'flex' }}>
        <SecretarySidebar />
        <Box component="main" sx={{ flexGrow: 1, width: '100%', p: { xs: 1, md: 4 }, bgcolor: '#f6f8fa', minHeight: '100vh' }}>
          {<Receipt data={receiptData} onClose={onClose} receiptRef={receiptRef} handleDownload={handleDownload} />}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, width: '100%', p: { xs: 1, md: 3 }, bgcolor: '#f6f8fa', minHeight: '100vh' }}>
        <Box
          sx={{
            width: '100%',
            maxWidth: '100%', // Utilise toute la largeur disponible
            mx: 'auto',
            p: { xs: 2, sm: 4 },
            borderRadius: 3,
            boxShadow: 3,
            background: 'white',
            position: 'relative',
            transition: 'box-shadow 0.3s',
            animation: 'fadeInUp 0.5s',
            '@keyframes fadeInUp': {
              from: { opacity: 0, transform: 'translateY(40px)' },
              to: { opacity: 1, transform: 'translateY(0)' },
            },
          }}
        >
          <Fade in={true} timeout={500}>
            <Paper sx={{
              p: { xs: 2, sm: 4, md: 6 },
              borderRadius: 3,
              boxShadow: 2,
              background: 'white',
              width: '100%',
              mx: 'auto',
              mb: 2,
            }}>
              <Typography 
                variant="h4" 
                gutterBottom 
                align="center"
                sx={{
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 4,
                }}
              >
                Formulaire d'inscription
              </Typography>

              {/* Plus de Stepper ici */}

              <Zoom in={true} timeout={500}>
                <Box>
                  {renderStepContent()}
                </Box>
              </Zoom>

              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                mt: 4,
                pt: 3,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={onClose}
                  sx={{
                    borderColor: theme.palette.error.main,
                    color: theme.palette.error.main,
                    '&:hover': {
                      borderColor: theme.palette.error.dark,
                      backgroundColor: 'rgba(211, 47, 47, 0.04)',
                    },
                  }}
                >
                  Annuler
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  onClick={handleSubmit}
                  disabled={!isFormValid}
                  sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
                    color: 'white',
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.primary.main} 90%)`,
                    },
                    px: 4,
                    ml: 2,
                  }}
                >
                  Soumettre
                </Button>
              </Box>
            </Paper>
          </Fade>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity={snackbar.severity}
              sx={{ 
                width: '100%',
                boxShadow: 3,
                '& .MuiAlert-icon': {
                  fontSize: 24,
                },
              }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Box>
      </Box>
    </Box>
  );
};

export default InscrptionPre; 

