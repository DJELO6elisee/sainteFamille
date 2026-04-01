import React, { useState } from 'react';
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
import AddIcon from '@mui/icons-material/Add';
import Registration from './Registration';

const steps = ['Informations personnelles', 'Informations académiques', 'Documents requis'];

interface Document {
  id: string;
  name: string;
  file: File | null;
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
}

interface RegistrationForm {
  // Informations personnelles
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

  // Informations académiques
  previousSchool: string;
  previousClass: string;
  desiredClass: string;
  specialNeeds: string;
  additionalInfo: string;

  // Documents
  documents: Document[];
  
  // Paiement retiré
  // paymentStatus: 'pending' | 'completed' | 'failed';
  // paymentAmount: number;
}

const Students = () => {
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<RegistrationForm>({
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
      { id: 'id', name: 'Carte d\'identité', file: null, status: 'pending' },
      { id: 'vaccine', name: 'Carnet de vaccination', file: null, status: 'pending' },
    ],
    // paymentStatus: 'pending', // Retiré
    // paymentAmount: 150, // Retiré
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const handleNext = () => {
    if (activeStep === 2 && !formData.documents.every(doc => doc.file)) {
      setSnackbar({
        open: true,
        message: 'Veuillez télécharger tous les documents requis',
        severity: 'error',
      });
      return;
    }
    setActiveStep((prevStep) => prevStep + 1);
  };
  const handleBack = () => setActiveStep((prevStep) => prevStep - 1);
  const handleFileUpload = (documentId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        documents: prev.documents.map(doc =>
          doc.id === documentId
            ? { ...doc, file, status: 'uploaded' }
            : doc
        ),
      }));
    }
  };
  const handleDeleteFile = (documentId: string) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === documentId
          ? { ...doc, file: null, status: 'pending' }
          : doc
      ),
    }));
  };
  // Fonction de paiement retirée
  // const handlePayment = () => {
  //   setFormData(prev => ({ ...prev, paymentStatus: 'completed' }));
  //   setSnackbar({
  //     open: true,
  //     message: 'Paiement effectué avec succès !',
  //     severity: 'success',
  //   });
  // };
  const handleSubmit = () => {
    setSnackbar({
      open: true,
      message: 'Inscription soumise avec succès !',
      severity: 'success',
    });
    setShowRegistrationForm(false);
    setActiveStep(0);
    setFormData({
      matricule: '', firstName: '', lastName: '', dateOfBirth: null, gender: '', address: '', city: '', postalCode: '', phone: '', email: '', previousSchool: '', previousClass: '', desiredClass: '', specialNeeds: '', additionalInfo: '', documents: [
        { id: 'birth', name: 'Acte de naissance', file: null, status: 'pending' },
        { id: 'report', name: 'Bulletin scolaire', file: null, status: 'pending' },
        { id: 'id', name: 'Carte d\'identité', file: null, status: 'pending' },
        { id: 'vaccine', name: 'Carnet de vaccination', file: null, status: 'pending' },
      ], // paymentStatus: 'pending', paymentAmount: 150, // Retiré
    });
  };
  const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });
  const getDocumentStatusIcon = (status: Document['status']) => {
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
                        {getDocumentStatusIcon(doc.status)}
                      </Box>
                      <Box>
                        {!doc.file ? (
                          <Button component="label" startIcon={<CloudUploadIcon />} variant="outlined">
                            Télécharger
                            <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileUpload(doc.id, e)} />
                          </Button>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">{doc.file.name}</Typography>
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
      // case 3: // Section de paiement retirée
      //   return (
      //     <Grid container spacing={2}>
      //       <Grid item xs={12}>
      //         <Typography variant="h6" gutterBottom>Paiement des frais d'inscription</Typography>
      //         <Card variant="outlined">
      //           <CardContent>
      //             <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
      //               <Typography>Frais d'inscription</Typography>
      //               <Typography>{formData.paymentAmount} FCFA</Typography>
      //             </Box>
      //             {formData.paymentStatus === 'pending' ? (
      //               <Button variant="contained" startIcon={<PaymentIcon />} onClick={handlePayment} fullWidth>Procéder au paiement</Button>
      //             ) : (
      //               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      //                 <CheckCircleIcon color="success" />
      //                 <Typography color="success.main">Paiement effectué</Typography>
      //               </Box>
      //             )}
      //           </CardContent>
      //         </Card>
      //       </Grid>
      //     </Grid>
      //   );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Gestion des Élèves</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowRegistrationForm(true)}
        >
          Nouvel élève
        </Button>
      </Box>

      {showRegistrationForm ? (
        <Registration onClose={() => setShowRegistrationForm(false)} />
      ) : (
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3, background: '#fff' }}>
          <Typography variant="h6">Liste des élèves</Typography>
          {/* ... ici le tableau des élèves, etc. ... */}
        </Paper>
      )}
    </Box>
  );
};

export default Students; 
