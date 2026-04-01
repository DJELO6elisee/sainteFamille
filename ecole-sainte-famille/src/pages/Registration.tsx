import React, { useState, useRef } from 'react';
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
  Alert,
  Snackbar,
  Card,
  CardContent,
  IconButton,
  useTheme,
  Fade,
  Zoom,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import frLocale from 'date-fns/locale/fr';
import { green } from '@mui/material/colors';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneIcon from '@mui/icons-material/Phone';

const steps = ['Informations personnelles', 'Vérification'];

interface RegistrationForm {
  matricule: string; // AJOUTÉ - optionnel
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  gender: string;
  address: string;
  commune: string;
  childPhoto: File | null; // AJOUTÉ
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentContact: string;
  emergencyContact: string;
  // SUPPRIME: documents
}

const Receipt = ({ data, onClose, receiptRef, handleDownload }: {
  data: any,
  onClose: () => void,
  receiptRef: React.RefObject<HTMLDivElement>,
  handleDownload: () => void,
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      justifyContent: 'flex-start',
      background: '#f5f7fa',
      py: 4,
      overflow: 'auto',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        backgroundColor: '#f1f1f1',
        borderRadius: '4px',
      },
      '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#1976d2',
        borderRadius: '4px',
        '&:hover': {
          backgroundColor: '#1565c0',
        },
      },
    }}
  >
      <Paper
        ref={receiptRef}
        sx={{
          p: 3,
          borderRadius: 3,
          boxShadow: 4,
          maxWidth: 500,
          width: '100%',
          mx: 'auto',
          mb: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <img src="/img/pages/vrailogo.jpg" alt="Logo École" style={{ width: 150, height: 90, objectFit: 'contain' }} />
      </Box>
      
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1976d2', mb: 0.5 }}>
          GS GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE
        </Typography>
        <Typography variant="body1" sx={{ color: '#666', mb: 0.5 }}>
          École Primaire Privée
        </Typography>
        <Typography variant="body2" sx={{ color: '#888', mb: 2 }}>
          Cocody - Abidjan, Côte d'Ivoire
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5 }}>
          REÇU DE PRÉ-INSCRIPTION
        </Typography>
        <Typography variant="body2" sx={{ color: '#666' }}>
          Année Scolaire 2025-2026
        </Typography>
      </Box>
      <Box sx={{ width: '100%' }}>
        <Typography sx={{ mb: 1 }}>
          <b>Nom :</b> {data.last_name} {data.first_name}
        </Typography>
        {data.registration_number && (
          <Typography sx={{ mb: 1 }}>
            <b>Matricule :</b> {data.registration_number}
          </Typography>
        )}
        <Typography sx={{ mb: 1 }}>
          <b>Date de naissance :</b> {data.date_of_birth}
        </Typography>
        <Typography sx={{ mb: 1 }}>
          <b>Genre :</b> {data.gender}
        </Typography>
        <Typography sx={{ mb: 1 }}>
          <b>Adresse :</b> {data.address}
        </Typography>
        <Typography sx={{ mb: 1 }}>
          <b>Commune :</b> {data.city}
        </Typography>
        <Divider sx={{ my: 2, width: '100%' }} />
        <Typography sx={{ mb: 1 }}>
          <b>Parent :</b> {data.parent_first_name} {data.parent_last_name}
        </Typography>
        <Typography sx={{ mb: 1 }}>
          <b>Email parent :</b> {data.parent_email}
        </Typography>
        <Typography sx={{ mb: 1 }}>
          <b>Contact du parent (WhatsApp) :</b> {data.father_contact}
        </Typography>
        <Typography sx={{ mb: 1 }}>
          <b>Contact à joindre en cas d'urgence :</b> {data.emergency_contact}
        </Typography>
        {/* Affichage miniature de la photo si possible */}
        {data.child_photo && typeof data.child_photo === 'string' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Photo de l'enfant :</Typography>
            <img
              src={typeof data.child_photo === 'string' && data.child_photo.startsWith('http')
                ? data.child_photo
                : `/api/students/photo/${data.child_photo}`}
              alt="Photo de l'enfant"
              style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', border: '1px solid #ccc' }}
            />
          </Box>
        )}
        <Divider sx={{ my: 2, width: '100%' }} />
        <Typography sx={{ mb: 1 }}>
          <b>Date et heure :</b> {data.date}
        </Typography>
      </Box>
      <Divider sx={{ my: 2, width: '100%' }} />
      <Typography variant="body1" align="center" color="primary" sx={{ mt: 2, fontWeight: 500 }}>
        Veuillez vous présenter à l'établissement avec ce reçu pour finaliser votre inscription et obtenir vos codes d'accès. Le code parent vous sera fourni lors de la finalisation.
      </Typography>
    </Paper>
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', width: '100%', maxWidth: 500 }}>
      <Button
        variant="outlined"
        color="secondary"
        fullWidth
        onClick={handleDownload}
        sx={{ fontWeight: 600, py: 1, fontSize: 14 }}
      >
        Télécharger le reçu
      </Button>
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={onClose}
        sx={{ fontWeight: 600, py: 1, fontSize: 14 }}
      >
        Fermer
      </Button>
    </Box>
  </Box>
);

const Registration = ({ onClose, isMobile = false }: { onClose: () => void; isMobile?: boolean }) => {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [formData, setFormData] = useState<RegistrationForm>({
    matricule: '', // AJOUTÉ - optionnel
    firstName: '',
    lastName: '',
    dateOfBirth: null,
    gender: '',
    address: '',
    commune: '',
    childPhoto: null, // AJOUTÉ
    parentFirstName: '',
    parentLastName: '',
    parentEmail: '',
    parentContact: '',
    emergencyContact: '',
    // SUPPRIME: documents
  });

  // Gestion du montage/démontage du composant
  React.useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [showVerification, setShowVerification] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);
  const handleDownload = () => {
    if (receiptRef.current) {
      html2pdf().from(receiptRef.current).save('recu-inscription.pdf');
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Validation des champs de la première étape
      if (!formData.firstName || !formData.lastName || 
          !formData.dateOfBirth || !formData.gender || !formData.address || 
          !formData.commune || !formData.parentFirstName || !formData.parentLastName || 
          !formData.parentEmail || !formData.parentContact || !formData.emergencyContact) {
        setSnackbar({
          open: true,
          message: 'Veuillez remplir tous les champs obligatoires',
          severity: 'error',
        });
        return;
      }
      // Passer à l'étape de vérification
      setActiveStep(1);
      setShowVerification(true);
    } else if (activeStep === 1) {
      // Soumettre le formulaire
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (activeStep === 1) {
      setActiveStep(0);
      setShowVerification(false);
    } else {
      setActiveStep((prevStep) => prevStep - 1);
    }
  };

  // SUPPRIME : handleFileUpload, handleDeleteFile, getDocumentStatusIcon
  // SUPPRIME : tout appel à formData.documents, Document, ou gestion de fichiers

  const handleSubmit = async () => {
    try {
      // Validation finale avant soumission
      if (!formData.firstName || !formData.lastName || 
          !formData.dateOfBirth || !formData.gender || !formData.address || 
          !formData.commune || !formData.parentFirstName || !formData.parentLastName || 
          !formData.parentEmail || !formData.parentContact || !formData.emergencyContact) {
        setSnackbar({
          open: true,
          message: 'Veuillez remplir tous les champs obligatoires',
          severity: 'error',
        });
        return;
      }
      // Construction du FormData pour multipart/form-data
      const data = new FormData();
      data.append('registration_number', formData.matricule); // Matricule optionnel
      data.append('first_name', formData.firstName);
      data.append('last_name', formData.lastName);
      data.append('date_of_birth', formData.dateOfBirth
          ? formData.dateOfBirth instanceof Date
            ? formData.dateOfBirth.toISOString().split('T')[0]
            : formData.dateOfBirth
        : '');
      data.append('gender', formData.gender);
      data.append('address', formData.address);
      data.append('city', formData.commune);
      data.append('phone', '');
      data.append('password', '');
      data.append('registration_mode', 'online');
      data.append('parent_first_name', formData.parentFirstName);
      data.append('parent_last_name', formData.parentLastName);
      data.append('parent_email', formData.parentEmail);
      data.append('parent_phone', '');
      data.append('parent_contact', formData.parentContact);
      data.append('father_contact', formData.parentContact);
      data.append('mother_contact', '');
      data.append('emergency_contact', formData.emergencyContact);
      if (formData.childPhoto) {
        data.append('child_photo', formData.childPhoto);
      }
      // Envoi du formulaire
      const response = await axios.post('https://saintefamilleexcellence.ci/api/students/public-register', data);
      const now = new Date();
      setReceiptData({
        ...Object.fromEntries(data),
        date: now.toLocaleString(),
        student_code: response.data.student_code,
        parent_code: null,
      });
      setSnackbar({
        open: true,
        message: 'Inscription soumise avec succès !',
        severity: 'success',
      });
    } catch (error: any) {
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

  // SUPPRIME : getDocumentStatusIcon

  const renderStepContent = (step: number) => {
    if (step === 0) {
      return (
        <Grid container spacing={isMobile ? 2 : 3} key={`step-0`}>
        {/* Champ Matricule optionnel */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Matricule (optionnel)"
            value={formData.matricule}
            onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
            placeholder="Ex: M123456"
            size={isMobile ? "small" : "medium"}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Prénom"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                size={isMobile ? "small" : "medium"}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Nom"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                size={isMobile ? "small" : "medium"}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={frLocale}>
                <DatePicker
                  label="Date de naissance"
                  value={formData.dateOfBirth}
                  onChange={(date) => setFormData({ ...formData, dateOfBirth: date })}
                  slotProps={{
                    textField: { 
                      fullWidth: true,
                      size: isMobile ? "small" : "medium"
                    },
                    popper: { disablePortal: true }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="genre-label">Genre</InputLabel>
                <Select
                  labelId="genre-label"
                  value={formData.gender}
                  label="Genre"
                  size={isMobile ? "small" : "medium"}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  MenuProps={{ disablePortal: true }}
                >
                  <MenuItem value=""><em>Choisir...</em></MenuItem>
                  <MenuItem value="Masculin">Masculin</MenuItem>
                  <MenuItem value="Féminin">Féminin</MenuItem>
                  <MenuItem value="Autre">Autre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Adresse"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                size={isMobile ? "small" : "medium"}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
            label="Commune"
            value={formData.commune}
            onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                size={isMobile ? "small" : "medium"}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                }}
              />
            </Grid>
        {/* SUPPRIME Téléphone élève et Email élève */}
        {/* Champs parentaux */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mt: 2, mb: 1 }}>
            Photo de l'enfant
          </Typography>
          <Button
            variant="outlined"
            component="label"
            sx={{ mr: 2 }}
          >
            {formData.childPhoto ? 'Changer la photo' : 'Télécharger une photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              hidden
              onChange={e => {
                const file = e.target.files && e.target.files[0];
                if (file) setFormData(prev => ({ ...prev, childPhoto: file }));
                }}
              />
          </Button>
          {formData.childPhoto && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">{formData.childPhoto.name}</Typography>
              <IconButton size="small" color="error" onClick={() => setFormData(prev => ({ ...prev, childPhoto: null }))}>
                <span style={{ fontWeight: 'bold', fontSize: 18 }}>&times;</span>
              </IconButton>
            </Box>
          )}
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main', mt: 2, mb: 1 }}>
                Informations du parent
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Prénom du parent"
                value={formData.parentFirstName}
                onChange={(e) => setFormData({ ...formData, parentFirstName: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Nom du parent"
                value={formData.parentLastName}
                onChange={(e) => setFormData({ ...formData, parentLastName: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Email du parent"
            type="email"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
            label="Contact du parent (WhatsApp)"
            value={formData.parentContact}
            onChange={(e) => setFormData({ ...formData, parentContact: e.target.value })}
            size={isMobile ? "small" : "medium"}
            InputProps={{
              startAdornment: (
                <WhatsAppIcon sx={{ color: '#25D366', mr: 1 }} />
              ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
            label="Contact à joindre en cas d'urgence"
            value={formData.emergencyContact}
            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            size={isMobile ? "small" : "medium"}
            InputProps={{
              startAdornment: (
                <PhoneIcon sx={{ color: '#1976d2', mr: 1 }} />
              ),
                }}
              />
            </Grid>
          </Grid>
        );
    } else if (step === 1) {
      return (
        <Box sx={{ p: isMobile ? 1 : 2 }}>
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            sx={{ 
              fontWeight: 700, 
              color: 'primary.main', 
              mb: 3,
              textAlign: 'center'
            }}
          >
            Vérification des informations
          </Typography>
          
          <Card sx={{ mb: 3, bgcolor: '#f8f9fa' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                Informations de l'enfant
              </Typography>
              <Grid container spacing={2}>
                {formData.matricule && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>Matricule :</Typography>
                    <Typography variant="body1">{formData.matricule}</Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Prénom :</Typography>
                  <Typography variant="body1">{formData.firstName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Nom :</Typography>
                  <Typography variant="body1">{formData.lastName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Date de naissance :</Typography>
                  <Typography variant="body1">
                    {formData.dateOfBirth ? formData.dateOfBirth.toLocaleDateString('fr-FR') : 'Non renseigné'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Genre :</Typography>
                  <Typography variant="body1">{formData.gender}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Adresse :</Typography>
                  <Typography variant="body1">{formData.address}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Commune :</Typography>
                  <Typography variant="body1">{formData.commune}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3, bgcolor: '#f8f9fa' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                Informations du parent
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Prénom :</Typography>
                  <Typography variant="body1">{formData.parentFirstName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Nom :</Typography>
                  <Typography variant="body1">{formData.parentLastName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Email :</Typography>
                  <Typography variant="body1">{formData.parentEmail}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Contact WhatsApp :</Typography>
                  <Typography variant="body1">{formData.parentContact}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Contact d'urgence :</Typography>
                  <Typography variant="body1">{formData.emergencyContact}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Veuillez vérifier que toutes les informations sont correctes avant de soumettre le formulaire.
            </Typography>
          </Alert>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 700,
        mx: 'auto',
        p: isMobile ? 1 : { xs: 1, sm: 3 },
        borderRadius: isMobile ? 0 : 5,
        boxShadow: isMobile ? 0 : 6,
        background: 'white',
        position: 'relative',
        transition: 'box-shadow 0.3s',
        animation: 'fadeInUp 0.5s',
        minHeight: isMobile ? '100vh' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(40px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      {receiptData ? (
        <Receipt data={receiptData} onClose={onClose} receiptRef={receiptRef} handleDownload={handleDownload} />
      ) : (
        <Fade in={isMounted} timeout={500}>
          <Paper sx={{
            p: isMobile ? 2 : { xs: 1, sm: 4 },
            borderRadius: isMobile ? 0 : 4,
            boxShadow: isMobile ? 0 : 3,
            background: 'white',
            minWidth: isMobile ? '100%' : { xs: '100%', sm: 500 },
            maxWidth: isMobile ? '100%' : 700,
            mx: 'auto',
            mb: isMobile ? 0 : 2,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible',
          }}>
            <Typography 
              variant={isMobile ? "h5" : "h4"}
              gutterBottom 
              align="center"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: isMobile ? 2 : 4,
                fontSize: isMobile ? '1.2rem' : undefined,
                position: 'sticky',
                top: 0,
                backgroundColor: 'white',
                zIndex: 10,
                py: 1,
              }}
            >
              Formulaire de pré-inscription
            </Typography>

            <Stepper 
              activeStep={activeStep} 
              sx={{ 
                mb: isMobile ? 2 : 4,
                '& .MuiStepLabel-label': {
                  fontWeight: 600,
                  fontSize: isMobile ? '0.8rem' : undefined,
                },
                '& .MuiStepIcon-root': {
                  color: theme.palette.primary.main,
                  fontSize: isMobile ? '1.2rem' : undefined,
                },
                '& .MuiStepIcon-root.Mui-active': {
                  color: theme.palette.primary.main,
                },
                '& .MuiStepIcon-root.Mui-completed': {
                  color: green[500],
                },
              }}
            >
              {steps.map((label, index) => (
                <Step key={`step-${index}-${label}`}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Zoom in={isMounted} timeout={500}>
              <Box 
                key={`step-content-${activeStep}`}
                sx={{
                  flex: 1,
                  overflow: 'visible',
                  minHeight: 0,
                }}
              >
                {renderStepContent(activeStep)}
              </Box>
            </Zoom>

            <Box sx={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between', 
              mt: isMobile ? 2 : 4,
              pt: 3,
              borderTop: '1px solid',
              borderColor: 'divider',
              gap: isMobile ? 2 : 0,
            }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                variant="outlined"
                fullWidth={isMobile}
                sx={{
                  borderColor: theme.palette.primary.main,
                  color: theme.palette.primary.main,
                  '&:hover': {
                    borderColor: theme.palette.primary.dark,
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                  },
                }}
              >
                {activeStep === 1 ? 'Modifier' : 'Retour'}
              </Button>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 1 : 2,
                width: isMobile ? '100%' : 'auto'
              }}>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={onClose}
                  fullWidth={isMobile}
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
                  onClick={handleNext}
                  fullWidth={isMobile}
                  sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
                    color: 'white',
                    '&:hover': {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark} 30%, ${theme.palette.primary.main} 90%)`,
                    },
                    px: isMobile ? 2 : 4,
                  }}
                >
                  {activeStep === 0 ? 'Vérifier' : 'Soumettre'}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Fade>
      )}

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
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Registration; 

