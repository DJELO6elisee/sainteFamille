import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  IconButton,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Card,
  CardContent,
  Chip,
  Avatar,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import frLocale from 'date-fns/locale/fr';
import { green, blue } from '@mui/material/colors';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PhoneIcon from '@mui/icons-material/Phone';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import SchoolIcon from '@mui/icons-material/School';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

const steps = ['Informations de l\'enfant', 'Informations du parent', 'Confirmation'];

interface RegistrationForm {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  gender: string;
  address: string;
  commune: string;
  childPhoto: File | null;
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentContact: string;
  emergencyContact: string;
}

const MobileReceipt = ({ data, onClose, receiptRef, handleDownload }: {
  data: any,
  onClose: () => void,
  receiptRef: React.RefObject<HTMLDivElement>,
  handleDownload: () => void,
}) => (
  <Box
    sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      p: 2,
    }}
  >
    <AppBar position="static" sx={{ background: 'transparent', boxShadow: 'none', mb: 2 }}>
      <Toolbar>
        <IconButton edge="start" color="inherit" onClick={onClose}>
          <CloseIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 600 }}>
          Reçu de pré-inscription
        </Typography>
      </Toolbar>
    </AppBar>

    <Paper
      ref={receiptRef}
      sx={{
        p: 3,
        borderRadius: 3,
        boxShadow: 6,
        background: 'white',
        mb: 2,
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: blue[500] }}>
          <SchoolIcon sx={{ fontSize: 40 }} />
        </Avatar>
        <Typography variant="h5" sx={{ fontWeight: 700, color: blue[600], mb: 1 }}>
          GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Reçu de pré-inscription
        </Typography>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: blue[600] }}>
          Informations de l'enfant
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Nom complet:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {data.last_name} {data.first_name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Date de naissance:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{data.date_of_birth}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Genre:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{data.gender}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Adresse:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{data.address}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Commune:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{data.city}</Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: blue[600] }}>
          Informations du parent
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Nom complet:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {data.parent_first_name} {data.parent_last_name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Email:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{data.parent_email}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Contact WhatsApp:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{data.father_contact}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">Contact d'urgence:</Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{data.emergency_contact}</Typography>
          </Box>
        </Box>
      </Box>

      {data.child_photo && typeof data.child_photo === 'string' && (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Photo de l'enfant</Typography>
          <Avatar
            src={typeof data.child_photo === 'string' && data.child_photo.startsWith('http')
              ? data.child_photo
              : `/api/students/photo/${data.child_photo}`}
            sx={{ width: 100, height: 100, mx: 'auto', border: '3px solid', borderColor: blue[200] }}
          />
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Date et heure: {data.date}
        </Typography>
        <Chip
          icon={<CheckCircleIcon />}
          label="Pré-inscription validée"
          color="success"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <Box sx={{ mt: 3, p: 2, bgcolor: blue[50], borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Veuillez vous présenter à l'établissement avec ce reçu pour finaliser votre inscription 
          et obtenir vos codes d'accès. Le code parent vous sera fourni lors de la finalisation.
        </Typography>
      </Box>
    </Paper>

    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button
        variant="outlined"
        fullWidth
        onClick={handleDownload}
        startIcon={<PhotoCameraIcon />}
        sx={{ fontWeight: 600 }}
      >
        Télécharger
      </Button>
      <Button
        variant="contained"
        fullWidth
        onClick={onClose}
        sx={{ fontWeight: 600 }}
      >
        Fermer
      </Button>
    </Box>
  </Box>
);

const MobileRegistration = ({ onClose }: { onClose: () => void }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<RegistrationForm>({
    firstName: '',
    lastName: '',
    dateOfBirth: null,
    gender: '',
    address: '',
    commune: '',
    childPhoto: null,
    parentFirstName: '',
    parentLastName: '',
    parentEmail: '',
    parentContact: '',
    emergencyContact: '',
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const [receiptData, setReceiptData] = useState<any | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    if (receiptRef.current) {
      html2pdf().from(receiptRef.current).save('recu-inscription.pdf');
    }
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Validation étape 1
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth || 
          !formData.gender || !formData.address || !formData.commune) {
        setSnackbar({
          open: true,
          message: 'Veuillez remplir tous les champs de l\'enfant',
          severity: 'error',
        });
        return;
      }
    } else if (activeStep === 1) {
      // Validation étape 2
      if (!formData.parentFirstName || !formData.parentLastName || 
          !formData.parentEmail || !formData.parentContact || !formData.emergencyContact) {
        setSnackbar({
          open: true,
          message: 'Veuillez remplir tous les champs du parent',
          severity: 'error',
        });
        return;
      }
    } else if (activeStep === 2) {
      // Soumission finale
      handleSubmit();
      return;
    }
    
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const data = new FormData();
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

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: blue[600] }}>
              Informations de l'enfant
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                required
                fullWidth
                label="Prénom"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                size="small"
              />
              
              <TextField
                required
                fullWidth
                label="Nom"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                size="small"
              />
              
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={frLocale}>
                <DatePicker
                  label="Date de naissance"
                  value={formData.dateOfBirth}
                  onChange={(date) => setFormData({ ...formData, dateOfBirth: date })}
                  slotProps={{
                    textField: { 
                      fullWidth: true, 
                      size: "small",
                      required: true 
                    }
                  }}
                />
              </LocalizationProvider>
              
              <FormControl fullWidth size="small">
                <InputLabel>Genre</InputLabel>
                <Select
                  value={formData.gender}
                  label="Genre"
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  <MenuItem value=""><em>Choisir...</em></MenuItem>
                  <MenuItem value="Masculin">Masculin</MenuItem>
                  <MenuItem value="Féminin">Féminin</MenuItem>
                  <MenuItem value="Autre">Autre</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                required
                fullWidth
                label="Adresse"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                size="small"
              />
              
              <TextField
                required
                fullWidth
                label="Commune"
                value={formData.commune}
                onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                size="small"
              />
              
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, color: blue[600] }}>
                  Photo de l'enfant (optionnel)
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<PhotoCameraIcon />}
                  size="small"
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Typography variant="caption">{formData.childPhoto.name}</Typography>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => setFormData(prev => ({ ...prev, childPhoto: null }))}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        );
        
      case 1:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: blue[600] }}>
              Informations du parent
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                required
                fullWidth
                label="Prénom du parent"
                value={formData.parentFirstName}
                onChange={(e) => setFormData({ ...formData, parentFirstName: e.target.value })}
                size="small"
              />
              
              <TextField
                required
                fullWidth
                label="Nom du parent"
                value={formData.parentLastName}
                onChange={(e) => setFormData({ ...formData, parentLastName: e.target.value })}
                size="small"
              />
              
              <TextField
                required
                fullWidth
                label="Email du parent"
                type="email"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                size="small"
              />
              
              <TextField
                required
                fullWidth
                label="Contact WhatsApp"
                value={formData.parentContact}
                onChange={(e) => setFormData({ ...formData, parentContact: e.target.value })}
                InputProps={{
                  startAdornment: <WhatsAppIcon sx={{ color: '#25D366', mr: 1 }} />,
                }}
                size="small"
              />
              
              <TextField
                required
                fullWidth
                label="Contact d'urgence"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                InputProps={{
                  startAdornment: <PhoneIcon sx={{ color: blue[500], mr: 1 }} />,
                }}
                size="small"
              />
            </Box>
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: blue[600] }}>
              Confirmation
            </Typography>
            
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: blue[600] }}>
                  Informations de l'enfant
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Nom:</strong> {formData.lastName} {formData.firstName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Date de naissance:</strong> {formData.dateOfBirth?.toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Genre:</strong> {formData.gender}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Adresse:</strong> {formData.address}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Commune:</strong> {formData.commune}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: blue[600] }}>
                  Informations du parent
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Nom:</strong> {formData.parentLastName} {formData.parentFirstName}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Email:</strong> {formData.parentEmail}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Contact WhatsApp:</strong> {formData.parentContact}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Contact d'urgence:</strong> {formData.emergencyContact}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: blue[50], borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Vérifiez toutes les informations avant de soumettre votre pré-inscription.
              </Typography>
            </Box>
          </Box>
        );
        
      default:
        return null;
    }
  };

  if (receiptData) {
    return (
      <MobileReceipt 
        data={receiptData} 
        onClose={onClose} 
        receiptRef={receiptRef} 
        handleDownload={handleDownload} 
      />
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <AppBar position="static" sx={{ background: 'transparent', boxShadow: 'none' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 600 }}>
            Pré-inscription
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 2 }}>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 2 }}>
          <Stepper 
            activeStep={activeStep} 
            sx={{ 
              p: 2,
              '& .MuiStepLabel-label': {
                fontSize: '0.875rem',
                fontWeight: 600,
              },
              '& .MuiStepIcon-root': {
                color: blue[300],
              },
              '& .MuiStepIcon-root.Mui-active': {
                color: blue[600],
              },
              '& .MuiStepIcon-root.Mui-completed': {
                color: green[500],
              },
            }}
          >
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {renderStepContent(activeStep)}
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
              size="small"
            >
              Retour
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              size="small"
              sx={{ 
                background: `linear-gradient(45deg, ${blue[600]} 30%, ${blue[400]} 90%)`,
                '&:hover': {
                  background: `linear-gradient(45deg, ${blue[700]} 30%, ${blue[500]} 90%)`,
                },
              }}
            >
              {activeStep === steps.length - 1 ? 'Soumettre' : 'Suivant'}
            </Button>
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MobileRegistration;

