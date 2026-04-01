import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Snackbar,
  IconButton,
  InputAdornment,
  useTheme,
  Fade,
  Zoom,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SchoolIcon from '@mui/icons-material/School';
import { blue, green, purple } from '@mui/material/colors';
import axios from 'axios';
import ReportCardTab from './ReportCardTab';

const Login = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error' as 'error' | 'success',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      setSnackbar({
        open: true,
        message: 'Veuillez remplir tous les champs',
        severity: 'error',
      });
      return;
    }
    try {
      // Connexion élève/prof
      const response = await axios.post('https://saintefamilleexcellence.ci/api/auth/login-code', {
        code: formData.code,
        name: formData.name,
      });
      setSnackbar({
        open: true,
        message: 'Connexion réussie !',
        severity: 'success',
      });
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      // Réinitialiser le timeout d'inactivité après connexion
      const activityEvent = new Event('userActivity');
      document.dispatchEvent(activityEvent);
      setTimeout(() => {
        if (response.data.data.user.role === 'student') {
          navigate('/student/dashboard');
        } else if (response.data.data.user.role === 'teacher') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/');
        }
      }, 1000);
    } catch (error: any) {
      // Connexion parent si échec
      try {
        const response = await axios.post('https://saintefamilleexcellence.ci/api/auth/login-parent-code', {
          code: formData.code,
          name: formData.name,
        });
        setSnackbar({
          open: true,
          message: 'Connexion parent réussie !',
          severity: 'success',
        });
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        // Réinitialiser le timeout d'inactivité après connexion
        const activityEvent = new Event('userActivity');
        document.dispatchEvent(activityEvent);
        setTimeout(() => {
          navigate('/parent/dashboard');
        }, 1000);
      } catch (err: any) {
        setSnackbar({
          open: true,
          message: err.response?.data?.message || 'Erreur lors de la connexion',
          severity: 'error',
        });
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${blue[50]} 0%, ${purple[50]} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Fade in={true} timeout={600}>
          <Paper
            elevation={6}
            sx={{
              p: 5,
              borderRadius: 4,
              boxShadow: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Zoom in={true} timeout={800}>
              <Box
                sx={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 120,
                  height: 120,
                  background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${blue[100]})`,
                  borderRadius: '50%',
                  opacity: 0.2,
                  zIndex: 0,
                }}
              />
            </Zoom>
            <SchoolIcon sx={{ fontSize: 56, color: theme.palette.primary.main, mb: 2, zIndex: 1 }} />
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              align="center"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                zIndex: 1,
              }}
            >
              Connexion
            </Typography>
            <Typography align="center" sx={{ mb: 4 }}>
              Accédez à votre espace
            </Typography>
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <TextField
                required
                fullWidth
                label="Code *"
                name="code"
                value={formData.code}
                onChange={handleChange}
                sx={{ mb: 3 }}
              />
              <TextField
                required
                fullWidth
                label="Nom *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                sx={{ mb: 4 }}
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ fontWeight: 700, fontSize: 18, py: 1.5 }}
              >
                SE CONNECTER
              </Button>
            </form>
          </Paper>
        </Fade>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
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
      </Container>
    </Box>
  );
};

export default Login; 

