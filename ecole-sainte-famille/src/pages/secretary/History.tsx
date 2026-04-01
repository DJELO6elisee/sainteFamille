import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Pagination,
  SelectChangeEvent,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Payment as PaymentIcon,
  PersonAdd as PersonAddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restaurant as RestaurantIcon,
  ChildCare as ChildCareIcon,
  School as SchoolIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import frLocale from 'date-fns/locale/fr';
import SecretarySidebar from '../../components/SecretarySidebar';
import axios from 'axios';

// Fonction pour obtenir l'année scolaire courante
function getCurrentSchoolYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 9) {
    return `${year}-${year + 1}`;
  } else {
    return `${year - 1}-${year}`;
  }
}

// Fonction pour générer les années scolaires disponibles
function getSchoolYears(count = 5) {
  const current = getCurrentSchoolYear();
  const startYear = parseInt(current.split('-')[0], 10);
  return Array.from({ length: count }, (_, i) => {
    const start = startYear - i;
    return `${start}-${start + 1}`;
  }).reverse();
}

interface HistoryEntry {
  id: number;
  action_type: string;
  action_description: string;
  amount: number | null;
  student_name: string | null;
  created_at: string;
  user_name: string;
  user_role: string;
}

interface User {
  id: number;
  name: string;
  role: string;
}

const History: React.FC = () => {
  const theme = useTheme();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [searchDate, setSearchDate] = useState<Date | null>(null);
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());
  
  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Types d'actions disponibles
  const actionTypes = [
    { value: 'all', label: 'Toutes les actions' },
    { value: 'paiement', label: 'Paiements' },
    { value: 'inscription', label: 'Inscriptions' },
    { value: 'modification', label: 'Modifications' },
    { value: 'suppression', label: 'Suppressions' },
    { value: 'cantine', label: 'Cantine' },
    { value: 'garderie', label: 'Garderie' }
  ];

  // Fonction pour récupérer l'historique
  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Token d\'authentification manquant');
        setLoading(false);
        return;
      }

      console.log('Token trouvé:', token.substring(0, 20) + '...');

      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedUser !== 'all') params.append('user', selectedUser);
      if (selectedActionType !== 'all') params.append('actionType', selectedActionType);
      if (searchDate) {
        const dateStr = searchDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
        params.append('searchDate', dateStr);
      }
      if (schoolYear !== 'all') {
        params.append('school_year', schoolYear);
      }
      params.append('page', page.toString());
      params.append('limit', rowsPerPage.toString());

      console.log('URL de la requête:', `https://saintefamilleexcellence.ci/api/history?${params}`);
      console.log('Paramètres envoyés:', Object.fromEntries(params.entries()));

      const response = await axios.get(`https://saintefamilleexcellence.ci/api/history?${params}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Réponse de l\'API:', response.data);

      setHistory(response.data.history || []);
      setUsers(response.data.users || []);
      setTotalPages(Math.ceil((response.data.total || 0) / rowsPerPage));
    } catch (error: any) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      console.error('Détails de l\'erreur:', error.response?.data);
      setError(error.response?.data?.message || 'Erreur lors de la récupération de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, searchTerm, selectedUser, selectedActionType, searchDate, schoolYear]);

  // Fonction pour obtenir l'icône selon le type d'action
  const getActionIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'paiement':
        return <PaymentIcon fontSize="small" />;
      case 'inscription':
        return <PersonAddIcon fontSize="small" />;
      case 'modification':
        return <EditIcon fontSize="small" />;
      case 'suppression':
        return <DeleteIcon fontSize="small" />;
      case 'cantine':
        return <RestaurantIcon fontSize="small" />;
      case 'garderie':
        return <ChildCareIcon fontSize="small" />;
      default:
        return <HistoryIcon fontSize="small" />;
    }
  };

  // Fonction pour obtenir la couleur du chip selon le type d'action
  const getActionColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'paiement':
        return 'success';
      case 'inscription':
        return 'primary';
      case 'modification':
        return 'warning';
      case 'suppression':
        return 'error';
      case 'cantine':
        return 'info';
      case 'garderie':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fonction pour formater le montant
  const formatAmount = (amount: number | null) => {
    if (amount === null || amount === undefined || amount === 0) return '-';
    const numAmount = parseFloat(amount.toString());
    if (isNaN(numAmount)) return '-';
    return `${numAmount.toLocaleString('fr-FR')} FCFA`;
  };

  // Statistiques
  const getStats = () => {
    const totalActions = history.length;
    const totalPayments = history.filter(h => h.action_type.toLowerCase().includes('paiement')).length;
    const totalRegistrations = history.filter(h => 
      h.action_type.toLowerCase().includes('inscription') || 
      h.action_type.toLowerCase().includes('garderie')
    ).length;
    const totalAmount = history.reduce((sum, h) => {
      const amount = parseFloat(h.amount?.toString() || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    return { totalActions, totalPayments, totalRegistrations, totalAmount };
  };

  const stats = getStats();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: theme.palette.background.default }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
        <Paper sx={{ p: 2, borderRadius: 2, boxShadow: 2 }}>
          <Box sx={{ mb: 3, borderBottom: `2px solid ${theme.palette.primary.main}`, pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <HistoryIcon sx={{ fontSize: 30, color: 'primary.main' }} />
              <Box>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                  Historique des Actions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Suivi de toutes les activités des utilisateurs
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Statistiques */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                color: 'white'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HistoryIcon sx={{ fontSize: 30 }} />
                    <Box>
                      <Typography variant="body2">Total Actions</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {stats.totalActions}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%)',
                color: 'white'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PaymentIcon sx={{ fontSize: 30 }} />
                    <Box>
                      <Typography variant="body2">Paiements</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {stats.totalPayments}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #f57c00 0%, #ffb74d 100%)',
                color: 'white'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonAddIcon sx={{ fontSize: 30 }} />
                    <Box>
                      <Typography variant="body2">Inscriptions</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {stats.totalRegistrations}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ 
                background: 'linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%)',
                color: 'white'
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PaymentIcon sx={{ fontSize: 30 }} />
                    <Box>
                      <Typography variant="body2">Montant Total</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        {formatAmount(stats.totalAmount)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filtres */}
          <Paper sx={{ p: 2, mb: 3, background: 'rgba(25, 118, 210, 0.04)' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Filtres
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Année scolaire</InputLabel>
                  <Select
                    value={schoolYear}
                    onChange={(e: SelectChangeEvent) => setSchoolYear(e.target.value)}
                    label="Année scolaire"
                  >
                    <MenuItem value="all">Toutes les années</MenuItem>
                    {getSchoolYears(5).map((year) => (
                      <MenuItem key={year} value={year}>{year}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Rechercher"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Utilisateur</InputLabel>
                  <Select
                    value={selectedUser}
                    onChange={(e: SelectChangeEvent) => setSelectedUser(e.target.value)}
                    label="Utilisateur"
                  >
                    <MenuItem value="all">Tous les utilisateurs</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.role})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type d'action</InputLabel>
                  <Select
                    value={selectedActionType}
                    onChange={(e: SelectChangeEvent) => setSelectedActionType(e.target.value)}
                    label="Type d'action"
                  >
                    {actionTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="Actualiser">
                    <IconButton onClick={fetchHistory} color="primary">
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
            
            {/* Filtre de date */}
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={frLocale}>
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <DatePicker
                    label="Rechercher par date"
                    value={searchDate}
                    onChange={(newValue) => setSearchDate(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: 'small',
                        placeholder: 'Sélectionner une date'
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
          </Paper>

          {/* Message d'erreur */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Tableau d'historique */}
          <Paper sx={{ overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'primary.main' }}>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Action</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Description</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Élève</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Montant</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Utilisateur</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 600 }}>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography variant="body1" color="text.secondary">
                              Aucune action trouvée
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        history.map((entry) => (
                          <TableRow key={entry.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {getActionIcon(entry.action_type)}
                                <Chip
                                  label={entry.action_type}
                                  color={getActionColor(entry.action_type) as any}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {entry.action_description}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {entry.student_name || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {formatAmount(entry.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {entry.user_name}
                                </Typography>
                                <Chip
                                  label={entry.user_role}
                                  color="primary"
                                  variant="outlined"
                                  size="small"
                                />
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(entry.created_at)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={(_, newPage) => setPage(newPage)}
                      color="primary"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Paper>
      </Box>
    </Box>
  );
};

export default History;

