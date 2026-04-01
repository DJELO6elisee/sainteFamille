import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  LinearProgress,
  Fade,
  Zoom,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  TextField,
  Button,
  Divider,
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Euro as EuroIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Payment as PaymentIcon,
  Schedule as ScheduleIcon,
  CalendarMonth as CalendarMonthIcon,
  BarChart as BarChartIcon,
  Security as SecurityIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  Timeline as TimelineIcon,
  AccessTime as AccessTimeIcon,
  Search as SearchIcon,
  CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import axios from 'axios';
import SecretarySidebar from '../../components/SecretarySidebar';

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

// Fonction utilitaire pour générer les années scolaires
function getSchoolYears(count = 5) {
  const now = new Date();
  const currentYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: count }, (_, i) => {
    const start = currentYear - (count - 1 - i);
    return `${start}-${start + 1}`;
  }).reverse();
}

const Payments = () => {
  const theme = useTheme();
  const [schoolYear, setSchoolYear] = useState(getCurrentSchoolYear());
  const [availableYears, setAvailableYears] = useState<string[]>(getSchoolYears(5));
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [dailyStates, setDailyStates] = useState<any>(null);
  const [statesLoading, setStatesLoading] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<any>(null);
  const [customRangeLoading, setCustomRangeLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Récupérer le rôle de l'utilisateur depuis le token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role);
        
        // Vérifier si l'utilisateur est autorisé (admin, secretary, comptable, informaticien)
        if (['admin', 'secretary', 'directrice', 'comptable', 'informaticien'].includes(payload.role)) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Erreur lors du décodage du token:', error);
        setIsAuthorized(false);
      }
    } else {
      setIsAuthorized(false);
    }
  }, []);

  // Fetch des résumés financiers (seulement si autorisé)
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchFinancialSummary = async () => {
      setSummaryLoading(true);
      try {
        // Utiliser la route authentifiée avec le token
        const token = localStorage.getItem('token');
        const response = await axios.get(`https://saintefamilleexcellence.ci/api/payments/financial-summary?school_year=${schoolYear}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log('Réponse API:', response.data); // Debug
        setFinancialSummary(response.data);
        
        // Debug: Afficher les valeurs de calcul
        if (response.data) {
          console.log('=== DÉBOGAGE SOLDE RESTANT ===');
          console.log('Total dû (backend):', response.data.total_due);
          console.log('Total payé (backend):', response.data.total_paid);
          console.log('Réductions (backend):', response.data.total_discounts);
          console.log('Solde restant (backend):', response.data.remaining_balance);
          
          // Calcul côté frontend
          const calculatedRemaining = response.data.total_due - response.data.total_paid - response.data.total_discounts;
          console.log('Solde restant (calculé frontend):', calculatedRemaining);
          console.log('Différence:', response.data.remaining_balance - calculatedRemaining);
        }
      } catch (error: any) {
        console.error('Erreur lors du chargement du résumé financier:', error);
        console.error('Détails de l\'erreur:', error.response?.data);
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchFinancialSummary();
  }, [schoolYear, isAuthorized]);

  // Fetch des états financiers par période (seulement si autorisé)
  useEffect(() => {
    if (!isAuthorized) return;

    const fetchDailyStates = async () => {
      setStatesLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`https://saintefamilleexcellence.ci/api/payments/daily-states?school_year=${schoolYear}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        console.log('États financiers par période:', response.data);
        setDailyStates(response.data);
        
      } catch (error: any) {
        console.error('Erreur lors du chargement des états financiers par période:', error);
        console.error('Détails de l\'erreur:', error.response?.data);
      } finally {
        setStatesLoading(false);
      }
    };

    fetchDailyStates();
  }, [schoolYear, isAuthorized]);

  // Fonction pour récupérer les états financiers pour une période personnalisée
  const fetchCustomDateRangeStates = async (start: string, end: string) => {
    if (!isAuthorized || !start || !end) return;

    setCustomRangeLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`https://saintefamilleexcellence.ci/api/payments/custom-date-range?start_date=${start}&end_date=${end}&school_year=${schoolYear}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('États financiers période personnalisée:', response.data);
      setCustomDateRange(response.data);
      
    } catch (error: any) {
      console.error('Erreur lors du chargement des états financiers période personnalisée:', error);
      console.error('Détails de l\'erreur:', error.response?.data);
    } finally {
      setCustomRangeLoading(false);
    }
  };

  // Gestionnaire pour la recherche par dates personnalisées
  const handleCustomDateSearch = () => {
    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        alert('La date de début doit être antérieure à la date de fin');
        return;
      }
      fetchCustomDateRangeStates(startDate, endDate);
    } else {
      alert('Veuillez sélectionner une date de début et une date de fin');
    }
  };

  // Fonction pour réinitialiser les dates personnalisées
  const handleResetCustomRange = () => {
    setStartDate('');
    setEndDate('');
    setCustomDateRange(null);
    setShowCustomRange(false);
  };

  // Calculer le pourcentage de paiement
  const getPaymentPercentage = () => {
    if (!financialSummary || !financialSummary.total_due) return 0;
    const totalDue = Number(financialSummary.total_due) || 0;
    const totalPaid = Number(financialSummary.total_paid) || 0;
    if (totalDue === 0) return 0;
    return Math.round((totalPaid / totalDue) * 100);
  };

  // Calculer le pourcentage de réduction
  const getDiscountPercentage = () => {
    if (!financialSummary || !financialSummary.total_due) return 0;
    const totalDue = Number(financialSummary.total_due) || 0;
    const totalDiscounts = Number(financialSummary.total_discounts) || 0;
    if (totalDue === 0) return 0;
    return Math.round((totalDiscounts / totalDue) * 100);
  };

  // Calculer le total des 3 derniers mois
  const getLastThreeMonthsTotal = () => {
    if (!financialSummary || !financialSummary.last_three_months) return 0;
    return financialSummary.last_three_months.reduce((total: number, month: any) => total + (Number(month.amount) || 0), 0);
  };

  // Calculer le solde restant côté frontend pour vérification
  const calculateRemainingBalance = () => {
    if (!financialSummary) return 0;
    const totalDue = Number(financialSummary.total_due) || 0;
    const totalPaid = Number(financialSummary.total_paid) || 0;
    const totalDiscounts = Number(financialSummary.total_discounts) || 0;
    return totalDue - totalPaid - totalDiscounts;
  };

  // Obtenir le solde restant (backend ou calculé)
  const getRemainingBalance = () => {
    if (!financialSummary) return 0;
    
    // Si le backend retourne un solde restant, l'utiliser
    if (financialSummary.remaining_balance !== undefined) {
      return financialSummary.remaining_balance;
    }
    
    // Sinon, le calculer côté frontend
    return calculateRemainingBalance();
  };

  // Si l'utilisateur n'est pas autorisé, afficher un message d'accès refusé
  if (isAuthorized === false) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
        <SecretarySidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
          <Card 
            elevation={3}
            sx={{ 
              maxWidth: 600, 
              mx: 'auto', 
              mt: 4,
              borderRadius: 3,
              background: 'white'
            }}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <SecurityIcon sx={{ fontSize: 80, color: 'error.main', mb: 3 }} />
              <Typography variant="h4" component="h1" color="error.main" sx={{ fontWeight: 700, mb: 2 }}>
                Accès Refusé
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                Cette page est réservée aux administrateurs uniquement
              </Typography>
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body1">
                  <strong>Rôle détecté :</strong> {userRole || 'Non défini'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Seuls les administrateurs peuvent accéder aux informations financières de l'établissement.
                </Typography>
              </Alert>
              <Typography variant="body2" color="text.secondary">
                Veuillez contacter votre administrateur si vous pensez qu'il s'agit d'une erreur.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  // Si l'autorisation est en cours de vérification, afficher un chargement
  if (isAuthorized === null) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
        <SecretarySidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
          <Card 
            elevation={3}
            sx={{ 
              maxWidth: 400, 
              mx: 'auto', 
              mt: 4,
              borderRadius: 3,
              background: 'white'
            }}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Vérification des permissions...
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      <SecretarySidebar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%' }}>
        {/* Sélecteur d'année scolaire */}
        <Box sx={{ mb: 3 }}>
          <FormControl size="small" sx={{ minWidth: 180, mr: 2 }}>
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
          
          <Button
            variant="outlined"
            startIcon={<CalendarTodayIcon />}
            onClick={() => setShowCustomRange(!showCustomRange)}
            sx={{ ml: 2 }}
          >
            {showCustomRange ? 'Masquer' : 'Période personnalisée'}
          </Button>
        </Box>

        {/* Sélecteur de dates personnalisées */}
        {showCustomRange && (
          <Card elevation={1} sx={{ mb: 3, p: 3, bgcolor: alpha(theme.palette.info.main, 0.02) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SearchIcon sx={{ color: 'info.main', mr: 1 }} />
              <Typography variant="h6" color="info.main" sx={{ fontWeight: 600 }}>
                Recherche par période personnalisée
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              <TextField
                type="date"
                label="Date de début"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 160 }}
              />
              
              <TextField
                type="date"
                label="Date de fin"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 160 }}
              />
              
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleCustomDateSearch}
                disabled={customRangeLoading || !startDate || !endDate}
                sx={{ minWidth: 120 }}
              >
                {customRangeLoading ? 'Recherche...' : 'Rechercher'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleResetCustomRange}
                disabled={customRangeLoading}
              >
                Réinitialiser
              </Button>
            </Box>
            
            {customDateRange && (
              <Box sx={{ mt: 2 }}>
                <Divider sx={{ mb: 2 }} />
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Période analysée :</strong> {customDateRange.custom_range?.period?.label} 
                    ({customDateRange.custom_range?.period?.duration_days} jour(s))
                  </Typography>
                </Alert>
              </Box>
            )}
          </Card>
        )}
        {/* Header avec gradient */}
        <Paper 
          elevation={0}
          sx={{
            mb: 4,
            p: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.3,
            }
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
              💰 Suivi de la comptabilité de l'établissement
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Suivi financier complet de l'établissement scolaire
          </Typography>
        </Box>
        </Paper>

        {/* Résumés Financiers avec animations */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Carte Montant Total */}
          <Grid item xs={12} sm={6} md={3}>
              <Zoom in={!summaryLoading} style={{ transitionDelay: '100ms' }}>
                <Card 
                  elevation={3}
                  sx={{
                    height: '100%',
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                    color: 'white',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: theme.shadows[8],
                    }
                  }}
                >
              <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <ReceiptIcon sx={{ fontSize: 40, mr: 2, opacity: 0.9 }} />
                  <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {summaryLoading ? '...' : financialSummary ? `${(Number(financialSummary.total_due) || 0).toLocaleString()} FCFA` : '0 FCFA'}
                    </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Montant total dû
                    </Typography>
                  </Box>
                </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={100} 
                      sx={{ 
                        height: 6, 
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.common.white, 0.3),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: 'white',
                        }
                      }} 
                    />
              </CardContent>
            </Card>
              </Zoom>
            </Grid>

          
          {/* Carte Montant Payé */}
          <Grid item xs={12} sm={6} md={3}>
              <Zoom in={!summaryLoading} style={{ transitionDelay: '200ms' }}>
                <Card 
                  elevation={3}
                  sx={{
                    height: '100%',
                    background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
                    color: 'white',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: theme.shadows[8],
                    }
                  }}
                >
              <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CheckCircleIcon sx={{ fontSize: 40, mr: 2, opacity: 0.9 }} />
                  <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {summaryLoading ? '...' : financialSummary ? `${(Number(financialSummary.total_paid) || 0).toLocaleString()} FCFA` : '0 FCFA'}
                    </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                          Montant total versé
                    </Typography>
                  </Box>
                </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={getPaymentPercentage()} 
                      sx={{ 
                        height: 6, 
                        borderRadius: 3,
                        bgcolor: alpha(theme.palette.common.white, 0.3),
                        '& .MuiLinearProgress-bar': {
                          bgcolor: 'white',
                        }
                      }} 
                    />
              </CardContent>
            </Card>
              </Zoom>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Zoom in={!summaryLoading} style={{ transitionDelay: '300ms' }}>
              <Card 
                elevation={3}
                sx={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.light} 100%)`,
                  color: 'white',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: theme.shadows[8],
                  }
                }}
              >
              <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TrendingUpIcon sx={{ fontSize: 40, mr: 2, opacity: 0.9 }} />
                  <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {summaryLoading ? '...' : financialSummary ? `${(Number(financialSummary.current_month_paid) || 0).toLocaleString()} FCFA` : '0 FCFA'}
                    </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Paiements du mois
                    </Typography>
                  </Box>
                </Box>
                  <Chip 
                    label={`${getPaymentPercentage()}% collecté`}
                    size="small"
                    sx={{ 
                      bgcolor: 'white', 
                      color: theme.palette.warning.main,
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }} 
                  />
              </CardContent>
            </Card>
            </Zoom>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Zoom in={!summaryLoading} style={{ transitionDelay: '400ms' }}>
              <Card 
                elevation={3}
                sx={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.light} 100%)`,
                  color: 'white',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: theme.shadows[8],
                  }
                }}
              >
              <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <WarningIcon sx={{ fontSize: 40, mr: 2, opacity: 0.9 }} />
                  <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {summaryLoading ? '...' : financialSummary ? `${(Number(getRemainingBalance()) || 0).toLocaleString()} FCFA` : '0 FCFA'}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Solde restant
                      </Typography>
                    </Box>
                  </Box>
                  <Chip 
                    label="À recouvrer"
                    size="small"
                    sx={{ 
                      bgcolor: 'white', 
                      color: theme.palette.error.main,
                      fontWeight: 600,
                      fontSize: '0.75rem'
                    }} 
                  />
                </CardContent>
              </Card>
            </Zoom>
          </Grid>
        </Grid>

        {/* Section des 3 derniers mois */}
        <Fade in={!summaryLoading}>
          <Card 
            elevation={2}
            sx={{ 
              mb: 4, 
              borderRadius: 3,
              background: 'white',
              border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <BarChartIcon sx={{ fontSize: 32, color: 'info.main', mr: 2 }} />
                <Typography variant="h5" fontWeight="bold" color="info.main">
                  Évolution des paiements - 3 derniers mois
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3, 
                      bgcolor: alpha(theme.palette.info.main, 0.05),
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.info.main, 0.08),
                        transform: 'scale(1.02)',
                      }
                    }}
                  >
                    <CalendarMonthIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                    <Typography variant="h4" color="info.main" sx={{ fontWeight: 700, mb: 1 }}>
                      {summaryLoading ? '...' : `${(Number(getLastThreeMonthsTotal()) || 0).toLocaleString()} FCFA`}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold" color="info.main" sx={{ mb: 1 }}>
                      Total 3 derniers mois
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Somme des paiements des 3 derniers mois
                    </Typography>
                  </Paper>
                </Grid>

                {financialSummary?.last_three_months?.map((month: any, index: number) => (
                  <Grid item xs={12} md={4} key={`${month.year}-${month.month}`}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 3, 
                        bgcolor: alpha(theme.palette.secondary.main, 0.05),
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.secondary.main, 0.08),
                          transform: 'scale(1.02)',
                        }
                      }}
                    >
                      <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 600, mb: 1 }}>
                        {month.month_name}
                      </Typography>
                      <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 700, mb: 1 }}>
                        {(Number(month.amount) || 0).toLocaleString()} FCFA
                      </Typography>
                      <Chip 
                        label={`${Math.round(((Number(month.amount) || 0) / (Number(getLastThreeMonthsTotal()) || 1)) * 100)}% du total`}
                        size="small"
                        sx={{ 
                          bgcolor: alpha(theme.palette.secondary.main, 0.2),
                          color: theme.palette.secondary.main,
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }} 
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Fade>

        {/* Section des états financiers par période */}
        <Fade in={!statesLoading}>
          <Card 
            elevation={2}
            sx={{ 
              mb: 4, 
              borderRadius: 3,
              background: 'white',
              border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TimelineIcon sx={{ fontSize: 32, color: 'success.main', mr: 2 }} />
                <Typography variant="h5" fontWeight="bold" color="success.main">
                  États financiers par période
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                {/* Aujourd'hui */}
                <Grid item xs={12} md={3}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3, 
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        transform: 'scale(1.02)',
                      }
                    }}
                  >
                    <TodayIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600, mb: 1 }}>
                      Aujourd'hui
                    </Typography>
                    <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
                      {statesLoading ? '...' : `${(dailyStates?.states?.today?.total_amount || 0).toLocaleString()} FCFA`}
                    </Typography>
                    <Chip 
                      label={`${dailyStates?.states?.today?.payment_count || 0} paiement(s)`}
                      size="small"
                      sx={{ 
                        bgcolor: alpha(theme.palette.primary.main, 0.2),
                        color: theme.palette.primary.main,
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }} 
                    />
                  </Paper>
                </Grid>

                {/* 2 derniers jours */}
                <Grid item xs={12} md={3}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3, 
                      bgcolor: alpha(theme.palette.secondary.main, 0.05),
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.secondary.main, 0.08),
                        transform: 'scale(1.02)',
                      }
                    }}
                  >
                    <DateRangeIcon sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
                    <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 600, mb: 1 }}>
                      2 derniers jours
                    </Typography>
                    <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 700, mb: 1 }}>
                      {statesLoading ? '...' : `${(dailyStates?.states?.lastTwoDays?.total_amount || 0).toLocaleString()} FCFA`}
                    </Typography>
                    <Chip 
                      label={`${dailyStates?.states?.lastTwoDays?.payment_count || 0} paiement(s)`}
                      size="small"
                      sx={{ 
                        bgcolor: alpha(theme.palette.secondary.main, 0.2),
                        color: theme.palette.secondary.main,
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }} 
                    />
                  </Paper>
                </Grid>

                {/* 3 derniers jours */}
                <Grid item xs={12} md={3}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3, 
                      bgcolor: alpha(theme.palette.warning.main, 0.05),
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.warning.main, 0.08),
                        transform: 'scale(1.02)',
                      }
                    }}
                  >
                    <AccessTimeIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                    <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600, mb: 1 }}>
                      3 derniers jours
                    </Typography>
                    <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700, mb: 1 }}>
                      {statesLoading ? '...' : `${(dailyStates?.states?.lastThreeDays?.total_amount || 0).toLocaleString()} FCFA`}
                    </Typography>
                    <Chip 
                      label={`${dailyStates?.states?.lastThreeDays?.payment_count || 0} paiement(s)`}
                      size="small"
                      sx={{ 
                        bgcolor: alpha(theme.palette.warning.main, 0.2),
                        color: theme.palette.warning.main,
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }} 
                    />
                  </Paper>
                </Grid>

                {/* Cette semaine */}
                <Grid item xs={12} md={3}>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3, 
                      bgcolor: alpha(theme.palette.success.main, 0.05),
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                      textAlign: 'center',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.success.main, 0.08),
                        transform: 'scale(1.02)',
                      }
                    }}
                  >
                    <CalendarMonthIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" color="success.main" sx={{ fontWeight: 600, mb: 1 }}>
                      Cette semaine
                    </Typography>
                    <Typography variant="h4" color="success.main" sx={{ fontWeight: 700, mb: 1 }}>
                      {statesLoading ? '...' : `${(dailyStates?.states?.thisWeek?.total_amount || 0).toLocaleString()} FCFA`}
                    </Typography>
                    <Chip 
                      label={`${dailyStates?.states?.thisWeek?.payment_count || 0} paiement(s)`}
                      size="small"
                      sx={{ 
                        bgcolor: alpha(theme.palette.success.main, 0.2),
                        color: theme.palette.success.main,
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }} 
                    />
                  </Paper>
                </Grid>
              </Grid>

              {/* Détails par jour pour la semaine */}
              {dailyStates?.states?.thisWeek?.details && dailyStates.states.thisWeek.details.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" color="success.main" sx={{ fontWeight: 600, mb: 2 }}>
                    Détails de cette semaine
                  </Typography>
                  <Grid container spacing={2}>
                    {dailyStates.states.thisWeek.details.map((day: any, index: number) => (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={day.date}>
                        <Paper 
                          elevation={1}
                          sx={{ 
                            p: 2, 
                            bgcolor: alpha(theme.palette.info.main, 0.05),
                            borderRadius: 1,
                            border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
                            textAlign: 'center'
                          }}
                        >
                          <Typography variant="body2" color="info.main" sx={{ fontWeight: 600, mb: 1 }}>
                            {new Date(day.date).toLocaleDateString('fr-FR', { 
                              weekday: 'short', 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </Typography>
                          <Typography variant="h6" color="info.main" sx={{ fontWeight: 700 }}>
                            {day.amount.toLocaleString()} FCFA
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {day.count} paiement(s)
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Fade>

        {/* Section des résultats de la période personnalisée */}
        {customDateRange && (
          <Fade in={!customRangeLoading}>
            <Card 
              elevation={2}
              sx={{ 
                mb: 4, 
                borderRadius: 3,
                background: 'white',
                border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <CalendarTodayIcon sx={{ fontSize: 32, color: 'info.main', mr: 2 }} />
                  <Typography variant="h5" fontWeight="bold" color="info.main">
                    Résultats - {customDateRange.custom_range?.period?.label}
                  </Typography>
                </Box>
                
                {/* Résumé de la période personnalisée */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {/* Total de la période */}
                  <Grid item xs={12} md={3}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 3, 
                        bgcolor: alpha(theme.palette.info.main, 0.05),
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.info.main, 0.08),
                          transform: 'scale(1.02)',
                        }
                      }}
                    >
                      <ReceiptIcon sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
                      <Typography variant="h6" color="info.main" sx={{ fontWeight: 600, mb: 1 }}>
                        Total période
                      </Typography>
                      <Typography variant="h4" color="info.main" sx={{ fontWeight: 700, mb: 1 }}>
                        {(customDateRange.custom_range?.summary?.total_amount || 0).toLocaleString()} FCFA
                      </Typography>
                      <Chip 
                        label={`${customDateRange.custom_range?.summary?.payment_count || 0} paiement(s)`}
                        size="small"
                        sx={{ 
                          bgcolor: alpha(theme.palette.info.main, 0.2),
                          color: theme.palette.info.main,
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }} 
                      />
                    </Paper>
                  </Grid>

                  {/* Moyenne quotidienne */}
                  <Grid item xs={12} md={3}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 3, 
                        bgcolor: alpha(theme.palette.success.main, 0.05),
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.success.main, 0.08),
                          transform: 'scale(1.02)',
                        }
                      }}
                    >
                      <TrendingUpIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                      <Typography variant="h6" color="success.main" sx={{ fontWeight: 600, mb: 1 }}>
                        Moyenne/jour
                      </Typography>
                      <Typography variant="h4" color="success.main" sx={{ fontWeight: 700, mb: 1 }}>
                        {(customDateRange.custom_range?.summary?.daily_average || 0).toLocaleString()} FCFA
                      </Typography>
                      <Chip 
                        label={`${customDateRange.custom_range?.summary?.active_days || 0} jour(s) actif(s)`}
                        size="small"
                        sx={{ 
                          bgcolor: alpha(theme.palette.success.main, 0.2),
                          color: theme.palette.success.main,
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }} 
                      />
                    </Paper>
                  </Grid>

                  {/* Meilleur jour */}
                  <Grid item xs={12} md={3}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 3, 
                        bgcolor: alpha(theme.palette.warning.main, 0.05),
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.warning.main, 0.08),
                          transform: 'scale(1.02)',
                        }
                      }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
                      <Typography variant="h6" color="warning.main" sx={{ fontWeight: 600, mb: 1 }}>
                        Meilleur jour
                      </Typography>
                      <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700, mb: 1 }}>
                        {(customDateRange.custom_range?.statistics?.best_day?.amount || 0).toLocaleString()} FCFA
                      </Typography>
                      <Chip 
                        label={customDateRange.custom_range?.statistics?.best_day?.date ? 
                          new Date(customDateRange.custom_range.statistics.best_day.date).toLocaleDateString('fr-FR') : 
                          'Aucun'
                        }
                        size="small"
                        sx={{ 
                          bgcolor: alpha(theme.palette.warning.main, 0.2),
                          color: theme.palette.warning.main,
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }} 
                      />
                    </Paper>
                  </Grid>

                  {/* Durée */}
                  <Grid item xs={12} md={3}>
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 3, 
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        borderRadius: 2,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          transform: 'scale(1.02)',
                        }
                      }}
                    >
                      <DateRangeIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600, mb: 1 }}>
                        Durée
                      </Typography>
                      <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700, mb: 1 }}>
                        {customDateRange.custom_range?.period?.duration_days || 0}
                      </Typography>
                      <Chip 
                        label="jour(s)"
                        size="small"
                        sx={{ 
                          bgcolor: alpha(theme.palette.primary.main, 0.2),
                          color: theme.palette.primary.main,
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }} 
                      />
                    </Paper>
                  </Grid>
                </Grid>

                {/* Détails quotidiens */}
                {customDateRange.custom_range?.daily_details && customDateRange.custom_range.daily_details.length > 0 && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" color="info.main" sx={{ fontWeight: 600, mb: 2 }}>
                      Détails quotidiens
                    </Typography>
                    <Grid container spacing={2}>
                      {customDateRange.custom_range.daily_details.map((day: any, index: number) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={day.date}>
                          <Paper 
                            elevation={1}
                            sx={{ 
                              p: 2, 
                              bgcolor: alpha(theme.palette.secondary.main, 0.05),
                              borderRadius: 1,
                              border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                              textAlign: 'center',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                bgcolor: alpha(theme.palette.secondary.main, 0.08),
                                transform: 'scale(1.02)',
                              }
                            }}
                          >
                            <Typography variant="body2" color="secondary.main" sx={{ fontWeight: 600, mb: 1 }}>
                              {new Date(day.date).toLocaleDateString('fr-FR', { 
                                weekday: 'short', 
                                day: 'numeric', 
                                month: 'short' 
                              })}
                            </Typography>
                            <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 700 }}>
                              {day.amount.toLocaleString()} FCFA
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {day.count} paiement(s) • {day.percentage}%
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Fade>
        )}

      {/* Section détaillée des paiements */}
      <Fade in={!summaryLoading}>
        <Card 
          elevation={2}
          sx={{ 
            mb: 4, 
            borderRadius: 3,
            background: 'white',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <AccountBalanceIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
              <Typography variant="h5" fontWeight="bold" color="primary">
                Résumé détaillé des paiements
              </Typography>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      transform: 'scale(1.02)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ReceiptIcon sx={{ color: 'primary.main', mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold" color="primary">
                      Montant total de scolarité dû
                    </Typography>
                  </Box>
                  <Typography variant="h4" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                    {summaryLoading ? '...' : financialSummary ? `${(Number(financialSummary.total_due) || 0).toLocaleString()} FCFA` : '0 FCFA'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Montant total que tous les élèves doivent payer
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    bgcolor: alpha(theme.palette.success.main, 0.05),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.success.main, 0.08),
                      transform: 'scale(1.02)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PaymentIcon sx={{ color: 'success.main', mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                      Montant total de scolarité versé
                    </Typography>
                  </Box>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 700, mb: 1 }}>
                    {summaryLoading ? '...' : financialSummary ? `${(Number(financialSummary.total_paid) || 0).toLocaleString()} FCFA` : '0 FCFA'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Montant total déjà payé par tous les élèves
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3, 
                    bgcolor: alpha(theme.palette.warning.main, 0.05),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.warning.main, 0.08),
                      transform: 'scale(1.02)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ScheduleIcon sx={{ color: 'warning.main', mr: 1 }} />
                    <Typography variant="subtitle1" fontWeight="bold" color="warning.main">
                      Paiements du mois en cours
                    </Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700, mb: 1 }}>
                    {summaryLoading ? '...' : financialSummary ? `${(Number(financialSummary.current_month_paid) || 0).toLocaleString()} FCFA` : '0 FCFA'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Montant total payé ce mois-ci
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Fade>
      </Box>
    </Box>
  );
};

export default Payments; 

