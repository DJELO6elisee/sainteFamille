import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Chip,
  Avatar,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  IconButton,
  Tooltip
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Person as PersonIcon, School as SchoolIcon, Payments as PaymentsIcon, Print as PrintIcon, LocalOffer as LocalOfferIcon } from '@mui/icons-material';
import SecretarySidebar from '../../components/SecretarySidebar';
import { format } from 'date-fns';
import fr from 'date-fns/locale/fr';

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

const StudentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [discounts, setDiscounts] = useState<any[]>([]);
  // Ajout pour le filtre année scolaire
  const [schoolYear, setSchoolYear] = useState<string>(getCurrentSchoolYear());
  const availableYears = ['2023-2024', '2024-2025', '2025-2026'];

  useEffect(() => {
    let isMounted = true;
    
    const fetchStudentDetails = async () => {
      if (!isMounted) return;
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const [studentData, discountsData] = await Promise.all([
          axios.get(`https://saintefamilleexcellence.ci/api/students/${id}/details?school_year=${schoolYear}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`https://saintefamilleexcellence.ci/api/discounts/student/${id}`)
        ]);
        if (isMounted) {
          console.log('Student data received:', studentData.data);
          console.log('Parent code:', studentData.data?.parent_code);
          console.log('Student code:', studentData.data?.student_code);
          console.log('Full student object keys:', Object.keys(studentData.data || {}));
          setStudent(studentData.data);
          setDiscounts(discountsData.data);
        }
      } catch (err: any) {
        if (isMounted) setError(err.response?.data?.message || "Erreur lors de la récupération des détails de l'élève.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id) {
      fetchStudentDetails();
    }
    
    return () => {
      isMounted = false;
    };
  }, [id, schoolYear]);

  const handlePrint = () => {
    window.print();
  };
  
  const DetailItem = ({ label, value, icon }: { label: string; value: any; icon?: React.ReactElement }) => (
    <Grid item xs={12} sm={6} md={4}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5 }}>
            {icon && <Avatar sx={{ bgcolor: 'primary.light', mr: 2 }}>{icon}</Avatar>}
            <Box>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{value || 'N/A'}</Typography>
            </Box>
        </Box>
    </Grid>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: theme.palette.background.default }}>
      <SecretarySidebar />
      <Container maxWidth="lg" sx={{ p: 3, '@media print': { p: 0 } }}>
        {/* Sélecteur d'année scolaire */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Typography variant="body2" sx={{ mr: 2, fontWeight: 600 }}>Année scolaire :</Typography>
          <select value={schoolYear} onChange={e => setSchoolYear(e.target.value)} style={{ fontSize: 16, padding: '4px 12px', borderRadius: 6, border: '1px solid #1976d2' }}>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </Box>
        <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 3, '@media print': { boxShadow: 'none', p: 2 } }}>
          {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>}
          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
          {student && (
            <>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, borderBottom: `2px solid ${theme.palette.primary.main}`, pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {student.child_photo ? (
                    <Box sx={{ position: 'relative', mr: 2 }}>
                      <img
                        src={`https://saintefamilleexcellence.ci/api/students/photo/${student.child_photo}`}
                        alt="Photo de l'enfant"
                        style={{ 
                          width: 120, 
                          height: 120, 
                          objectFit: 'cover', 
                          borderRadius: '50%',
                          border: `3px solid ${theme.palette.primary.main}`,
                          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                        }}
                        onError={(e) => {
                          console.error('❌ Erreur de chargement de la photo:', student.child_photo);
                          console.error('🔗 URL tentée:', `https://saintefamilleexcellence.ci/api/students/photo/${student.child_photo}`);
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.setAttribute('style', 'display: block');
                        }}
                        onLoad={() => {
                          console.log('✅ Photo chargée avec succès:', student.child_photo);
                        }}
                      />
                      <Avatar 
                        sx={{ 
                          width: 120, 
                          height: 120, 
                          bgcolor: 'primary.main', 
                          fontSize: '3rem',
                          display: 'none',
                          border: `3px solid ${theme.palette.primary.main}`,
                          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        {student.first_name?.[0]}{student.last_name?.[0]}
                      </Avatar>
                    </Box>
                  ) : (
                    <Avatar sx={{ 
                      width: 120, 
                      height: 120, 
                      bgcolor: 'primary.main', 
                      mr: 2, 
                      fontSize: '3rem',
                      border: `3px solid ${theme.palette.primary.main}`,
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}>
                      {student.first_name?.[0]}{student.last_name?.[0]}
                    </Avatar>
                  )}
                  <Box>
                    <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                      {student.first_name} {student.last_name}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                      Matricule: {student.registration_number || 'Non défini'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, '@media print': { display: 'none' } }}>
                  <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
                    Retour
                  </Button>
                   <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>
                    Imprimer
                  </Button>
                </Box>
              </Box>

              {/* Personal Info */}
              <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                    <PersonIcon /> Informations Personnelles
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  
                  {/* Photo de l'enfant */}
                  {student.child_photo && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <img
                          src={`https://saintefamilleexcellence.ci/api/students/photo/${student.child_photo}`}
                          alt="Photo de l'enfant"
                          style={{ 
                            width: 200, 
                            height: 200, 
                            objectFit: 'cover', 
                            borderRadius: '10px',
                            border: `3px solid ${theme.palette.primary.main}`,
                            boxShadow: '0 6px 12px rgba(0,0,0,0.15)'
                          }}
                          onError={(e) => {
                            console.error('❌ Erreur de chargement de la photo:', student.child_photo);
                            console.error('🔗 URL tentée:', `https://saintefamilleexcellence.ci/api/students/photo/${student.child_photo}`);
                            e.currentTarget.style.display = 'none';
                          }}
                          onLoad={() => {
                            console.log('✅ Photo chargée avec succès:', student.child_photo);
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          Photo de l'enfant
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  <Grid container spacing={1}>
                    <DetailItem label="Date de naissance" value={student.date_of_birth ? (() => {
                      try {
                        // Si c'est au format DD/MM/YYYY (format du backend)
                        if (/^\d{2}\/\d{2}\/\d{4}$/.test(student.date_of_birth)) {
                          const [day, month, year] = student.date_of_birth.split('/');
                          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          return format(date, 'dd MMMM yyyy', { locale: fr });
                        }
                        // Si c'est déjà au format YYYY-MM-DD, le formater directement
                        if (/^\d{4}-\d{2}-\d{2}$/.test(student.date_of_birth)) {
                          const [year, month, day] = student.date_of_birth.split('-');
                          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          return format(date, 'dd MMMM yyyy', { locale: fr });
                        }
                        // Si c'est une date ISO avec timezone, extraire seulement la partie date
                        if (student.date_of_birth.includes('T')) {
                          const datePart = student.date_of_birth.split('T')[0];
                          if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                            const [year, month, day] = datePart.split('-');
                            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            return format(date, 'dd MMMM yyyy', { locale: fr });
                          }
                        }
                        // Sinon, utiliser les méthodes locales
                        const date = new Date(student.date_of_birth);
                        if (isNaN(date.getTime())) return 'N/A';
                        return format(date, 'dd MMMM yyyy', { locale: fr });
                      } catch (error) {
                        return 'N/A';
                      }
                    })() : 'N/A'} />
                    <DetailItem label="Genre" value={student.gender} />
                    <DetailItem label="Adresse" value={student.address} />
                    <DetailItem label="Ville" value={student.city} />
                    
                    {/* Ajout mange à la cantine */}
                    {student.cantine ? (
                      <DetailItem label="L'enfant mange à la cantine" value={student.eats_at_cantine === 1 || student.eats_at_cantine === true || student.eats_at_cantine === '1' ? 'Oui' : 'Non'} />
                    ) : null}
                    {/* Allergie éventuelle */}
                    {student.cantine && student.allergy && (
                      <DetailItem label="Allergie(s) éventuelle(s)" value={<span style={{ color: '#d32f2f', fontWeight: 500 }}>{student.allergy}</span>} />
                    )}
                  </Grid>
                </CardContent>
              </Card>

              {/* Academic Info */}
              <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                    <SchoolIcon /> Informations Académiques
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={1}>
                    <DetailItem label="Classe actuelle" value={<Chip label={student.classe_name || 'Non assigné'} color="primary" />} />
                    <DetailItem label="Code Élève" value={<Chip label={student.student_code || 'N/A'} color="secondary" variant="outlined" />} />
                    <DetailItem label="Code Parent" value={<Chip label={student.parent_code && student.parent_code !== 'null' && student.parent_code !== 'NULL' ? String(student.parent_code) : 'N/A'} color="secondary" variant="outlined" />} />
                  </Grid>
                </CardContent>
              </Card>

              {/* Financial Info */}
              <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                    <PaymentsIcon /> Informations Financières
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                   <Grid container spacing={3} sx={{ my: 2 }}>
                        <Grid item xs={12} sm={4}>
                           <Paper sx={{p: 2, textAlign: 'center', background: 'linear-gradient(45deg, #e3f2fd, #bbdefb)'}}>
                                <Typography variant="h6">Total à Payer</Typography>
                                <Typography variant="h5" sx={{fontWeight: 'bold'}}>{(student.total_due || 0).toLocaleString('fr-FR')} F CFA</Typography>
                           </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Paper sx={{p: 2, textAlign: 'center', background: 'linear-gradient(45deg, #e8f5e9, #c8e6c9)'}}>
                                <Typography variant="h6">Total Payé</Typography>
                                <Typography variant="h5" sx={{fontWeight: 'bold', color: 'success.dark'}}>{(student.total_paid || 0).toLocaleString('fr-FR')} F CFA</Typography>
                           </Paper>
                        </Grid>
                         <Grid item xs={12} sm={4}>
                            <Paper sx={{p: 2, textAlign: 'center', background: 'linear-gradient(45deg, #ffebee, #ffcdd2)'}}>
                                <Typography variant="h6">Solde Restant</Typography>
                                <Typography variant="h5" sx={{fontWeight: 'bold', color: 'error.dark'}}>{((student.total_due || 0) - (student.total_paid || 0)).toLocaleString('fr-FR')} F CFA</Typography>
                           </Paper>
                        </Grid>
                    </Grid>

                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 3, mb: 1 }}>Historique des paiements</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{backgroundColor: 'grey.200'}}>
                          <TableCell sx={{fontWeight: 'bold'}}>Date</TableCell>
                          <TableCell sx={{fontWeight: 'bold'}} align="right">Montant</TableCell>
                          <TableCell sx={{fontWeight: 'bold'}}>Statut</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {student.payments && student.payments.length > 0 ? (
                          student.payments.map((p: any) => (
                            <TableRow key={p.id}>
                              <TableCell>{format(new Date(p.payment_date), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                              <TableCell align="right">{p.amount.toLocaleString('fr-FR')} F CFA</TableCell>
                              <TableCell>
                                <Chip label={p.status} color={p.status === 'completed' || p.status === 'paid' ? 'success' : 'warning'} size="small" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} align="center">Aucun paiement enregistré</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default StudentDetails; 

