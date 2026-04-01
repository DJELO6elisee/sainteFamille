import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ClassIcon from '@mui/icons-material/Class';
import PaymentIcon from '@mui/icons-material/Payment';
import EventIcon from '@mui/icons-material/Event';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import PrintIcon from '@mui/icons-material/Print';
import FolderIcon from '@mui/icons-material/Folder';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';

interface DashboardStats {
  students: number;
  classes: number;
  payments: {
    total: number;
    paid: number;
  };
  events: number;
}

interface RecentTask {
  id: number;
  title: string;
  description: string;
  date: string;
  status: 'pending' | 'in_progress' | 'completed';
  icon: React.ReactNode;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    students: 0,
    classes: 0,
    payments: { total: 0, paid: 0 },
    events: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolYear, setSchoolYear] = useState('2025-2026');

  // Récupérer les statistiques depuis l'API
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Récupérer toutes les statistiques en une seule requête
      const dashboardResponse = await axios.get(`https://saintefamilleexcellence.ci/api/dashboard/stats?school_year=${schoolYear}`, { headers });
      
      if (dashboardResponse.data.success) {
        setStats({
          students: dashboardResponse.data.stats.students,
          classes: dashboardResponse.data.stats.classes,
          payments: dashboardResponse.data.stats.payments,
          events: dashboardResponse.data.stats.events
        });
      } else {
        setError('Erreur lors de la récupération des données');
      }

    } catch (err) {
      console.error('Erreur lors de la récupération des statistiques:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [schoolYear]);

  // Tâches récentes (exemple)
  const recentTasks: RecentTask[] = [
    {
      id: 1,
      title: 'Validation des inscriptions',
      description: 'Validation des inscriptions',
      date: 'Le 15/03/2024',
      status: 'pending',
      icon: <FolderIcon sx={{ color: 'orange' }} />
    },
    {
      id: 2,
      title: 'Mise à jour des notes',
      description: 'Mise à jour des notes',
      date: 'Le 14/03/2024',
      status: 'in_progress',
      icon: <TrendingUpIcon sx={{ color: 'blue' }} />
    },
    {
      id: 3,
      title: 'Envoi des relevés',
      description: 'Envoi des relevés',
      date: 'Le 13/03/2024',
      status: 'completed',
      icon: <CheckCircleIcon sx={{ color: 'green' }} />
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminé';
      default: return 'Inconnu';
    }
  };

  const quickActions = [
    {
      title: 'Nouvelle inscription',
      icon: <AddIcon sx={{ color: 'lightblue' }} />,
      action: () => console.log('Nouvelle inscription')
    },
    {
      title: 'Rechercher élève',
      icon: <SearchIcon sx={{ color: 'grey' }} />,
      action: () => console.log('Rechercher élève')
    },
    {
      title: 'Imprimer documents',
      icon: <PrintIcon sx={{ color: 'orange' }} />,
      action: () => console.log('Imprimer documents')
    }
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', 
        p: 3, 
        borderRadius: 2, 
        mb: 3,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
          Tableau de bord Administrateur
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1" sx={{ color: 'white' }}>
            Année scolaire:
          </Typography>
          <select 
            value={schoolYear} 
            onChange={(e) => setSchoolYear(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'white',
              color: '#1976d2',
              fontWeight: 'bold'
            }}
          >
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
          </select>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistiques principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: 140 }}>
            <PeopleIcon sx={{ fontSize: 40, color: '#1976d2', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              {stats.students}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Élèves
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: 140 }}>
            <ClassIcon sx={{ fontSize: 40, color: '#2e7d32', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
              {stats.classes}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Classes
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: 140 }}>
            <PaymentIcon sx={{ fontSize: 40, color: '#ed6c02', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ed6c02' }}>
              {stats.payments.paid} / {stats.payments.total} soldés
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Paiements
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, textAlign: 'center', height: 140 }}>
            <EventIcon sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
              {stats.events}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Événements
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Actions rapides et tâches récentes */}
      <Grid container spacing={3}>
        {/* Actions rapides */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Actions rapides
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {quickActions.map((action, index) => (
                  <Box key={index} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: 2,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {action.icon}
                      <Typography variant="body1">
                        {action.title}
                      </Typography>
                    </Box>
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={action.action}
                      sx={{ 
                        backgroundColor: '#1976d2',
                        '&:hover': { backgroundColor: '#1565c0' }
                      }}
                    >
                      ACCÉDER
                    </Button>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Tâches récentes */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Tâches récentes
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentTasks.map((task) => (
                  <Box key={task.id} sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    p: 2,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {task.icon}
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                          {task.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {task.description}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {task.date}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={getStatusText(task.status)} 
                        color={getStatusColor(task.status) as any}
                        size="small"
                      />
                      <Button 
                        variant="outlined" 
                        size="small"
                        sx={{ 
                          borderColor: '#1976d2',
                          color: '#1976d2',
                          '&:hover': { 
                            borderColor: '#1565c0',
                            backgroundColor: 'rgba(25, 118, 210, 0.04)'
                          }
                        }}
                      >
                        VOIR
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 

