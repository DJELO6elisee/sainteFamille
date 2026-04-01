import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Container, Typography, Paper, Button, TextField, Alert, Stack, Table, TableHead, TableRow, TableCell, TableBody, CircularProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Snackbar
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
// import logo from '../assets/logo192.png'; // Décommente si tu as le logo dans src/assets/

const StudentPaymentPage = () => {
  const [student, setStudent] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amountToPay, setAmountToPay] = useState('');
  const [status, setStatus] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const navigate = useNavigate();
  const MIN_AMOUNT = 200;
  const [monnaieFusionAccount, setMonnaieFusionAccount] = useState('');
  const [fusionUrl, setFusionUrl] = useState<string | null>(null);
  const [fusionToken, setFusionToken] = useState<string | null>(null);
  const [fusionStatus, setFusionStatus] = useState<string | null>(null);
  const [fusionStatusMsg, setFusionStatusMsg] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [fusionLoading, setFusionLoading] = useState(false);
  const [fusionError, setFusionError] = useState<string | null>(null);
  const [fusionReceipt, setFusionReceipt] = useState<any | null>(null);
  const [numeroSend, setNumeroSend] = useState('');
  // Ajoute un état pour le message d'erreur
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      setLoading(true);
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get('https://saintefamilleexcellence.ci/api/students/me/details', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) {
          setStudent(res.data.student);
          setPayments(res.data.student.payments || []);
        }
      } catch (err) {
        if (isMounted) setError("Erreur lors du chargement des informations de paiement.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchData();
    
    const handleFocus = () => {
      if (isMounted) fetchData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Calculs avec tous les paiements
  const totalDue = student?.total_due || 150000;
  const totalDiscount = student?.total_discount || 0;
  // Ne compter que les paiements validés
  const totalPaid = payments
    .filter(p => p.status === 'completed' || p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const montantRestant = Math.max(0, totalDue - totalDiscount - totalPaid);
  const isPaid = montantRestant === 0;

  useEffect(() => {
    if (student && payments.length > 0) {
      setAmountToPay(montantRestant > 0 ? montantRestant.toString() : '');
      setStatus(isPaid ? 'Soldé' : 'En attente de paiement');
    }
  }, [student, payments, montantRestant, isPaid]);

  // Vérifie le montant à chaque changement
  useEffect(() => {
    if (Number(amountToPay) > montantRestant) {
      setAmountError('Le montant saisi dépasse le montant restant à payer.');
    } else {
      setAmountError(null);
    }
  }, [amountToPay, montantRestant]);

  // Génération du reçu PDF
  const downloadReceipt = async () => {
    if (!receiptRef.current) return;
    setDownloadingReceipt(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#fff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const fileName = `recu_paiement_${receiptData?.transaction_id || Date.now()}.pdf`;
      pdf.save(fileName);
      setSnackbar({ open: true, message: 'Reçu téléchargé avec succès !', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Erreur lors du téléchargement du reçu', severity: 'error' });
    } finally {
      setDownloadingReceipt(false);
    }
  };

  // Paiement avec reçu automatique
  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setPaymentProcessing(true);
    const amount = Number(amountToPay);
    if (!amount || amount < MIN_AMOUNT || amount > montantRestant) {
      setError('Le montant minimum est de 200 FCFA et ne peut pas dépasser le reste à payer.');
      setPaymentProcessing(false);
      return;
    }
    if (!monnaieFusionAccount) {
      setError('Veuillez renseigner votre compte Monnaie Fusion.');
      setPaymentProcessing(false);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      // Enregistrement du paiement dans la base de données
      const response = await axios.post(
        'https://saintefamilleexcellence.ci/api/payments',
        {
          student_id: student.id,
          amount: amount,
          monnaie_fusion_account: monnaieFusionAccount
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      // Si paiement Monnaie Fusion, proposer la redirection
      if (response.data.fusion && response.data.fusion.url) {
        setFusionUrl(response.data.fusion.url);
        setFusionToken(response.data.fusion.token);
        setFusionStatus(null);
        setFusionStatusMsg(null);
      } else {
        setFusionUrl(null);
        setFusionToken(null);
        setFusionStatus(null);
        setFusionStatusMsg(null);
      }
      // Rafraîchir la liste des paiements
      const payRes = await axios.get('https://saintefamilleexcellence.ci/api/students/me/details', { headers: { Authorization: `Bearer ${token}` } });
      setStudent(payRes.data.student);
      setPayments(payRes.data.student.payments || []);
      // Afficher le reçu avec les données du backend
      setReceiptData({
        ...response.data.receiptData,
        payment_method: 'Monnaie Fusion',
        transaction_id: response.data.receiptData?.transaction_id || `MF_${Date.now()}`
      });
      // setShowReceipt(true); // Désormais, le reçu ne s'affiche qu'après vérification du paiement
      // setSuccess('Paiement effectué avec succès !');
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors du paiement. Veuillez réessayer.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Fonction de redirection vers Monnaie Fusion
  const handleFusionPayment = async () => {
    setFusionError(null);
    if (!student || !amountToPay || Number(amountToPay) <= 0 || !numeroSend) {
      setFusionError('Veuillez saisir un montant et un numéro de téléphone valides.');
      return;
    }
    setFusionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('https://saintefamilleexcellence.ci/api/payments/fusion-init', {
        student_id: student.id,
        amount: amountToPay,
        numeroSend: numeroSend
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.redirect_url) {
        window.location.href = res.data.redirect_url;
      } else {
        setFusionError('Erreur lors de la génération du paiement Monnaie Fusion.');
      }
    } catch (err: any) {
      setFusionError(err.response?.data?.message || 'Erreur lors de la génération du paiement.');
    }
    setFusionLoading(false);
  };

  // Fonction pour vérifier le statut du paiement Monnaie Fusion
  const handleCheckFusionStatus = async () => {
    if (!fusionToken) return;
    setCheckingStatus(true);
    setFusionStatusMsg(null);
    try {
      const res = await axios.get(`https://saintefamilleexcellence.ci/api/payments/fusion-status/${fusionToken}`);
      setFusionStatus(res.data.statut);
      setFusionStatusMsg(res.data.message || '');
      // Si payé, rafraîchir les paiements
      if (res.data.statut === 'paid') {
        const token = localStorage.getItem('token');
        const payRes = await axios.get('https://saintefamilleexcellence.ci/api/students/me/details', { headers: { Authorization: `Bearer ${token}` } });
        setStudent(payRes.data.student);
        setPayments(payRes.data.student.payments || []);
        setShowReceipt(true); // Affiche le reçu seulement si payé
        setSuccess('Paiement effectué avec succès !');
      }
    } catch (err: any) {
      setFusionStatusMsg(err.response?.data?.message || 'Erreur lors de la vérification du paiement.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const formatAmount = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount);

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!student) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <Alert severity="error" sx={{ fontSize: '1.1rem', p: 3 }}>
          Impossible de charger les informations de l'élève.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)', 
      fontFamily: "'Poppins', sans-serif",
      pt: 2
    }}>
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
            <PaymentIcon color="primary" sx={{ fontSize: 40 }} />
            <Typography variant="h4" fontWeight={800} color="primary.main">
              Paiement de la scolarité
            </Typography>
          </Stack>
          
          {/* Résumé de la scolarité */}
          <Box sx={{ 
            mb: 4, 
            p: 3, 
            bgcolor: '#f8f9fa', 
            borderRadius: 2, 
            border: '1px solid #e9ecef' 
          }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#1976d2' }}>
              Résumé de votre scolarité
            </Typography>
            <Stack spacing={1.5}>
              <Typography variant="subtitle1" fontWeight={600}>
                Classe : <b style={{ color: '#1976d2' }}>{student.class_name || ''}</b>
              </Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                Montant total : <b style={{ color: '#2e7d32' }}>{formatAmount(totalDue)} FCFA</b>
              </Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                Réduction : <b style={{ color: '#388e3c' }}>- {formatAmount(totalDiscount)} FCFA</b>
              </Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                Déjà payé : <b style={{ color: '#1976d2' }}>{formatAmount(totalPaid)} FCFA</b>
              </Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                Reste à payer : <b style={{ color: montantRestant > 0 ? '#d32f2f' : '#2e7d32' }}>
                  {formatAmount(montantRestant)} FCFA
                </b>
              </Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                Statut : <b style={{ color: isPaid ? '#2e7d32' : '#d32f2f' }}>
                  {isPaid ? '✅ Soldé' : '⏳ En attente'}
                </b>
              </Typography>
            </Stack>
          </Box>

          {/* Historique des paiements */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#1976d2' }}>
              Historique des paiements
            </Typography>
            {payments.length === 0 ? (
              <Alert severity="info" sx={{ fontSize: '1rem' }}>
                Aucun paiement enregistré pour le moment.
              </Alert>
            ) : (
              <Table size="small" sx={{ bgcolor: 'white', borderRadius: 1 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Montant</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Heure</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Moyen de paiement</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((p, i) => (
                    <TableRow key={i} sx={{ '&:hover': { bgcolor: '#f8f9fa' } }}>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {formatAmount(p.amount)} FCFA
                      </TableCell>
                      <TableCell>
                        {new Date(p.payment_date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        {new Date(p.payment_date).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </TableCell>
                      <TableCell>
                        {p.payment_method ? p.payment_method : '-'}
                      </TableCell>
                      <TableCell>
                        {p.status === 'completed' || p.status === 'paid' ? (
                          <span style={{ color: '#2e7d32', fontWeight: 600 }}>✅ Payé</span>
                        ) : (
                          <span style={{ color: '#d32f2f', fontWeight: 600 }}>⏳ En attente</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>

          {/* Formulaire de paiement */}
          {!isPaid && (
            <form onSubmit={e => e.preventDefault()}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#1976d2' }}>
                Effectuer un paiement
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ mb: 3 }}>
                <TextField
                  label="Montant à payer (FCFA)"
                  type="number"
                  value={amountToPay}
                  onChange={e => setAmountToPay(e.target.value)}
                  inputProps={{ 
                    min: MIN_AMOUNT, 
                    max: montantRestant,
                    step: 1000
                  }}
                  required
                  sx={{ flex: 1 }}
                  helperText={`Montant minimum : 200 FCFA | Maximum : ${formatAmount(montantRestant)} FCFA`}
                  error={Boolean(amountToPay) && Number(amountToPay) < MIN_AMOUNT}
                />
                <TextField
                  label="Numéro de téléphone (Mobile Money)"
                  value={numeroSend}
                  onChange={e => setNumeroSend(e.target.value)}
                  required
                  sx={{ flex: 1 }}
                />
                <Button
                  type="button"
                  variant="contained"
                  color="primary"
                  onClick={handleFusionPayment}
                  disabled={fusionLoading || !amountToPay || Number(amountToPay) < MIN_AMOUNT || Number(amountToPay) > montantRestant || !numeroSend}
                  size="large"
                  sx={{ 
                    fontWeight: 700, 
                    px: 4, 
                    py: 1.5,
                    minWidth: 150
                  }}
                >
                  {fusionLoading ? <CircularProgress size={22} /> : 'PAYER'}
                </Button>
              </Stack>
              {amountError && (
                <Typography color="error" sx={{ mt: 1 }}>{amountError}</Typography>
              )}
              {fusionError && <Typography color="error" sx={{ mt: 1 }}>{fusionError}</Typography>}
            </form>
          )}

          {/* Messages de succès/erreur */}
          {success && (
            <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />} sx={{ mb: 2, fontSize: '1rem' }}>
              {success}
            </Alert>
          )}
          {error && (
            <Alert severity="error" icon={<ErrorIcon fontSize="inherit" />} sx={{ mb: 2, fontSize: '1rem' }}>
              {error}
            </Alert>
          )}

          {/* Affichage de la redirection Monnaie Fusion */}
          {fusionUrl && (
            <Alert severity="info" sx={{ my: 2 }}>
              Paiement initié via Monnaie Fusion. <Button variant="contained" color="primary" href={fusionUrl} target="_blank" sx={{ ml: 2 }}>Payer maintenant via Monnaie Fusion</Button>
              {fusionToken && (
                <Button variant="outlined" color="secondary" onClick={handleCheckFusionStatus} sx={{ ml: 2 }} disabled={checkingStatus}>
                  {checkingStatus ? 'Vérification...' : 'Vérifier le paiement'}
                </Button>
              )}
              {fusionStatus && (
                <span style={{ marginLeft: 16, fontWeight: 700 }}>
                  Statut : {fusionStatus === 'paid' ? '✅ Payé' : fusionStatus}
                </span>
              )}
              {fusionStatusMsg && (
                <div style={{ marginTop: 8, color: '#d32f2f' }}>{fusionStatusMsg}</div>
              )}
            </Alert>
          )}

          {/* Bouton retour */}
          <Button 
            variant="outlined" 
            color="primary" 
            sx={{ mt: 3, fontWeight: 600 }} 
            onClick={() => navigate('/student/dashboard')}
          >
            ← Retour au tableau de bord
          </Button>
        </Paper>
      </Container>
      {/* Dialog du reçu de paiement */}
      <Dialog open={showReceipt} onClose={() => setShowReceipt(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ textAlign: 'center', borderBottom: '2px solid #1976d2', pb: 2, background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)', color: 'white' }}>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
            {/* <img src={logo} alt="Logo Collège" style={{ height: 60, marginRight: 16 }} /> */}
            <ReceiptIcon sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight={700}>Reçu de Paiement</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box ref={receiptRef} sx={{ p: 4, bgcolor: 'white' }}>
            {/* Logo de l'école */}
            <Box sx={{
              textAlign: 'center',
              mb: 2
            }}>
              <img 
                src="/img/pages/434000183.jpg" 
                alt="Logo École" 
                style={{ 
                  height: 80, 
                  maxWidth: '100%', 
                  objectFit: 'contain',
                  marginBottom: '8px'
                }} 
              />
            </Box>
            <Box sx={{ textAlign: 'center', mb: 4, pb: 3, borderBottom: '2px solid #e0e0e0' }}>
              <Typography variant="h4" component="h1" sx={{ color: '#1976d2', fontWeight: 'bold', mb: 1 }}>Collège Excellence</Typography>
              <Typography variant="h6" sx={{ color: '#666', fontWeight: 500 }}>Reçu de Paiement de Scolarité</Typography>
              <Typography variant="body2" sx={{ color: '#888', mt: 1 }}>Transaction sécurisée via Monnaie Fusion</Typography>
            </Box>
            {/* Détails du paiement */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: '#1976d2' }}>
                Détails du Paiement
              </Typography>
              <Table size="small" sx={{ bgcolor: '#f8f9fa', borderRadius: 1, mb: 2 }}>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Classe</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{receiptData?.class_name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Montant total de la scolarité</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{formatAmount(receiptData?.total_due || 0)} FCFA</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Total des réductions / bons</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: 'green' }}>- {formatAmount(receiptData?.totalDiscounts || 0)} FCFA</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Montant total versé</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{formatAmount(payments.reduce((sum, p) => sum + Number(p.amount), 0))} FCFA</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#1976d2' }}><b>Montant de ce versement</b></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, color: '#1976d2', fontSize: '1.2rem', letterSpacing: 1 }}><b>{formatAmount(receiptData?.payment_amount || 0)} FCFA</b></TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* Historique des versements */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1, color: '#1976d2' }}>Historique des versements</Typography>
              <Table size="small" sx={{ bgcolor: '#fff', borderRadius: 1, mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Montant</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Ligne pour la prise en charge par bons/réductions */}
                  {receiptData?.totalDiscounts > 0 && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600, color: 'green' }}>Pris en charge par bons/réductions</TableCell>
                      <TableCell>{formatAmount(receiptData?.totalDiscounts)} FCFA</TableCell>
                    </TableRow>
                  )}
                  {payments.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontWeight: 600 }}>{formatAmount(p.amount)} FCFA</TableCell>
                      <TableCell>{new Date(p.payment_date).toLocaleString('fr-FR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Statut stylisé : soldé ou reste à payer */}
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                {receiptData?.resteAPayer === 0 ? (
                  <Alert
                    severity="success"
                    icon={<CheckCircleIcon sx={{ color: '#2e7d32', fontSize: 36 }} />}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.5rem',
                      px: 6,
                      py: 2,
                      borderRadius: 3,
                      bgcolor: '#e8f5e9',
                      color: '#2e7d32',
                      boxShadow: 3,
                      letterSpacing: 1
                    }}
                  >
                    Statut : <span style={{ color: '#2e7d32', fontWeight: 900, marginLeft: 8 }}>Soldé</span>
                  </Alert>
                ) : (
                  <Alert
                    severity="warning"
                    icon={<ErrorIcon sx={{ color: '#f57c00', fontSize: 36 }} />}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '1.5rem',
                      px: 6,
                      py: 2,
                      borderRadius: 3,
                      bgcolor: '#fff3e0',
                      color: '#f57c00',
                      boxShadow: 3,
                      letterSpacing: 1
                    }}
                  >
                    Reste à payer : <span style={{ color: '#f57c00', fontWeight: 900, marginLeft: 8 }}>{formatAmount(receiptData?.resteAPayer || 0)} FCFA</span>
                  </Alert>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0', justifyContent: 'center' }}>
          <Button variant="contained" color="primary" startIcon={downloadingReceipt ? <CircularProgress size={20} /> : <DownloadIcon />} onClick={downloadReceipt} disabled={downloadingReceipt} sx={{ fontWeight: 600, px: 4, py: 1.5 }}>
            {downloadingReceipt ? 'Téléchargement...' : 'Télécharger le reçu (PDF)'}
          </Button>
          <Button variant="outlined" onClick={() => setShowReceipt(false)} sx={{ fontWeight: 600, px: 4, py: 1.5 }}>Fermer</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentPaymentPage; 

