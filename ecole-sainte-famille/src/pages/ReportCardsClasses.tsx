import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, List, ListItemButton, ListItemText, CircularProgress, Alert, Stack, Card, CardContent } from '@mui/material';
import axios from 'axios';
import SecretarySidebar from '../components/SecretarySidebar';

const ReportCardsClasses = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    const fetchClasses = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('https://saintefamilleexcellence.ci/api/classes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) setClasses(res.data);
      } catch (err: any) {
        if (isMounted) setError(err.response?.data?.message || 'Erreur lors du chargement des classes.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchClasses();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #e3f0ff 0%, #f8e1ff 100%)' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 8px 32px rgba(80, 36, 204, 0.10)', background: 'rgba(255,255,255,0.95)' }}>
            <Typography variant="h4" fontWeight={800} sx={{ color: 'primary.main', mb: 3, letterSpacing: 1 }} gutterBottom>
              Gestion des bulletins <span style={{ color: '#8e24aa' }}>- Choisissez une classe</span>
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
                <CircularProgress size={40} thickness={5} sx={{ color: 'primary.main' }} />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <Stack spacing={3} direction="column" sx={{ mt: 2 }}>
                {classes.map((classe) => (
                  <Card
                    key={classe.id}
                    elevation={3}
                    sx={{
                      borderRadius: 4,
                      background: 'linear-gradient(90deg, #e3f0ff 60%, #f8e1ff 100%)',
                      boxShadow: '0 4px 16px rgba(80,36,204,0.07)',
                      transition: 'transform 0.18s, box-shadow 0.18s',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'translateY(-4px) scale(1.03)',
                        boxShadow: '0 8px 32px rgba(142,36,170,0.13)',
                        background: 'linear-gradient(90deg, #d1c4e9 60%, #b39ddb 100%)',
                      },
                    }}
                    onClick={() => navigate(`/secretary/report-cards/${classe.id}`)}
                  >
                    <CardContent>
                      <Typography variant="h6" fontWeight={700} color="primary.main">
                        {classe.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Niveau : <b>{classe.level || ''}</b>
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default ReportCardsClasses; 

