import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';
import { useEffect } from 'react';

const steps = ['Informations', 'Confirmation', 'Paiement'];

const PaymentCard = styled(Card)(({ theme }) => ({
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
  '& .MuiCardContent-root': {
    padding: theme.spacing(3),
  },
}));

const StudentPayment = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenom: '',
    niveau: '',
    montant: '',
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const [student, setStudent] = useState<any>(null);
  const [totalDue, setTotalDue] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [montantRestant, setMontantRestant] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    
    const fetchStudent = async () => {
      if (!isMounted) return;
      
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await axios.get('https://saintefamilleexcellence.ci/api/students/me/details', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!isMounted) return;
        
        const s = res.data.student || res.data;
        setStudent(s);
        setFormData(prev => ({
          ...prev,
          matricule: s.registration_number || '',
          nom: s.last_name || '',
          prenom: s.first_name || '',
          niveau: s.class_name || s.classe_name || s.niveau || '',
        }));
        setTotalDue(Number(s.total_due) || 0);
        setTotalPaid(Number(s.total_paid) || 0);
        setMontantRestant(Math.max(0, (Number(s.total_due) || 0) - (Number(s.total_paid) || 0)));
      } catch (err) {
        if (isMounted) {
          setSnackbar({ open: true, message: "Erreur lors du chargement des infos de l'élève", severity: 'error' });
        }
      }
    };
    
    fetchStudent();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const niveaux = [
    { value: '6eme', label: '6ème' },
    { value: '5eme', label: '5ème' },
    { value: '4eme', label: '4ème' },
    { value: '3eme', label: '3ème' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNext = () => {
    if (activeStep === 0) {
      // Validation des champs
      if (!formData.matricule || !formData.nom || !formData.prenom || !formData.niveau || !formData.montant) {
        setSnackbar({
          open: true,
          message: 'Veuillez remplir tous les champs',
          severity: 'error',
        });
        return;
      }
    }
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handlePayment = () => {
    // Simuler un paiement
    setSnackbar({
      open: true,
      message: 'Paiement effectué avec succès !',
      severity: 'success',
    });
    setActiveStep(2);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Informations de paiement
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Matricule"
                name="matricule"
                value={formData.matricule}
                onChange={handleChange}
                helperText="Votre numéro d'identification"
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Nom"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Prénom"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                select
                label="Niveau"
                name="niveau"
                value={formData.niveau}
                onChange={handleChange}
                disabled
              >
                {niveaux.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Montant à payer (FCFA)"
                name="montant"
                type="number"
                value={formData.montant}
                onChange={handleChange}
                inputProps={{ min: 200, max: montantRestant, step: 1000 }}
                helperText={`Déjà payé : ${totalPaid} FCFA | Reste à payer : ${montantRestant} FCFA | Total dû : ${totalDue} FCFA`}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Confirmation du paiement
            </Typography>
            <PaymentCard>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" color="text.secondary">
                      Matricule
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {formData.matricule}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" color="text.secondary">
                      Nom
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {formData.nom}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" color="text.secondary">
                      Prénom
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {formData.prenom}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      Classe : <b style={{ color: '#1976d2' }}>{student.class_name || student.classe_name || student.niveau || '-'}</b>
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" color="text.secondary">
                      Montant
                    </Typography>
                    <Typography variant="h6" color="primary" gutterBottom>
                                              {formData.montant} FCFA
                    </Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  En cliquant sur "Procéder au paiement", vous serez redirigé vers notre plateforme de paiement sécurisée.
                </Typography>
              </CardContent>
            </PaymentCard>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Paiement effectué avec succès !
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Un reçu de paiement a été envoyé à votre adresse email.
            </Typography>
            <Button
              variant="contained"
              startIcon={<ReceiptIcon />}
              onClick={() => window.print()}
              sx={{ mt: 2 }}
            >
              Télécharger le reçu
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
          Paiement de la scolarité
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            Retour
          </Button>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.href = '/student/dashboard'}
            >
              Retour au tableau de bord
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={activeStep === 1 ? handlePayment : handleNext}
              startIcon={activeStep === 1 ? <PaymentIcon /> : undefined}
            >
              {activeStep === 1 ? 'Procéder au paiement' : 'Suivant'}
            </Button>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StudentPayment; 

