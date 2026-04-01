import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Container, Typography, Button, Alert, CircularProgress } from '@mui/material';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CreditCardIcon from '@mui/icons-material/CreditCard';

const StudentPaymentReturn = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [redirectTimeout, setRedirectTimeout] = useState<NodeJS.Timeout | null>(null);
  const receiptRef = React.useRef<HTMLDivElement>(null);

  // Récupère le token dans l'URL si présent
  const params = new URLSearchParams(location.search);
  const token = params.get('token');

  const handleCheck = async () => {
    if (!token) return;
    setChecking(true);
    setMsg(null);
    try {
      const res = await axios.get(`https://saintefamilleexcellence.ci/api/payments/fusion-status/${token}`);
      setStatus(res.data.statut);
      setMsg(res.data.message || '');
      setPaymentDetails(res.data.details || null);
      // Si paiement validé, rafraîchir les infos de paiement et rediriger
      if (res.data.statut === 'paid') {
        setRefreshing(true);
        // Attendre 2 secondes puis rediriger
        const timeout = setTimeout(() => {
          setRefreshing(false);
          navigate('/student/payment');
        }, 2000);
        setRedirectTimeout(timeout);
      }
    } catch (err: any) {
      setMsg(err.response?.data?.message || 'Erreur lors de la vérification du paiement.');
      setPaymentDetails(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    // Optionnel : vérifier automatiquement si token présent
    if (token && isMounted) {
      const checkPayment = async () => {
        if (!token) return;
        setChecking(true);
        setMsg(null);
        try {
          const res = await axios.get(`https://saintefamilleexcellence.ci/api/payments/fusion-status/${token}`);
          if (isMounted) {
            setStatus(res.data.statut);
            setMsg(res.data.message || '');
            setPaymentDetails(res.data.details || null);
            if (res.data.statut === 'paid') {
              setRefreshing(true);
              const timeout = setTimeout(() => {
                setRefreshing(false);
                navigate('/student/payment');
              }, 2000);
              setRedirectTimeout(timeout);
            }
          }
        } catch (err: any) {
          if (isMounted) {
            setMsg(err.response?.data?.message || 'Erreur lors de la vérification du paiement.');
            setPaymentDetails(null);
          }
        } finally {
          if (isMounted) setChecking(false);
        }
      };
      checkPayment();
    }
    
    return () => {
      isMounted = false;
      if (redirectTimeout) clearTimeout(redirectTimeout);
    };
  }, [token]);

  // Fonction pour télécharger le reçu PDF
  const downloadReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
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
      const fileName = `recu_paiement_${paymentDetails?.tokenPay || Date.now()}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      alert('Erreur lors du téléchargement du reçu');
    }
  };

  // Composant badge stylisé pour le montant payé
  const PaymentBadge = ({ amount }: { amount: number }) => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#2ecc40', // vert plus vif
        color: '#fff',
        borderRadius: 16,
        px: 5,
        py: 3,
        minWidth: 180,
        minHeight: 90,
        boxShadow: '0 6px 24px 0 rgba(46,204,64,0.18)',
        fontWeight: 900,
        fontSize: 24,
        mb: 3,
        mt: 1,
        mx: 'auto',
        gap: 0.5,
        transition: 'box-shadow 0.2s, background 0.2s',
        '&:hover': {
          boxShadow: '0 12px 32px 0 rgba(46,204,64,0.28)',
          bgcolor: '#27ae60',
        },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="center" width="100%" gap={1}>
        <CreditCardIcon sx={{ fontSize: 36, mr: 1 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 900, letterSpacing: 1, fontSize: 26, lineHeight: 1, textTransform: 'lowercase' }}>
          payer
        </Typography>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1, mt: 1, fontSize: 36 }}>
        {Number(amount).toLocaleString('fr-FR', { minimumFractionDigits: 0 })} F CFA
      </Typography>
    </Box>
  );

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Box sx={{ p: 4, bgcolor: '#f8f9fa', borderRadius: 3, boxShadow: 2 }}>
        <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
          Retour de paiement Monnaie Fusion
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Merci d'avoir tenté d'effectuer un paiement. Cliquez sur le bouton ci-dessous pour vérifier le statut de votre paiement.
        </Typography>
        {token && (
          <Button variant="contained" color="primary" onClick={handleCheck} disabled={checking} sx={{ mb: 2 }}>
            {checking ? <CircularProgress size={20} color="inherit" /> : 'Vérifier le paiement'}
          </Button>
        )}
        {status && (
          <Alert severity={status === 'paid' ? 'success' : status === 'pending' ? 'info' : 'error'} sx={{ mt: 2 }}>
            Statut du paiement : <b>{status}</b>
            {msg && <div>{msg}</div>}
          </Alert>
        )}
        {refreshing && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Paiement validé ! Redirection vers la page de paiement...
          </Alert>
        )}
        {paymentDetails && (
          <>
            <PaymentBadge amount={Number(paymentDetails.amount || paymentDetails.original_amount || 0)} />
            <Box ref={receiptRef} sx={{ mt: 2, p: 2, bgcolor: '#fff', borderRadius: 2, boxShadow: 1 }}>
              {/* Logo de l'école */}
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <img 
                  src="/img/pages/434000183.jpg" 
                  alt="Logo École" 
                  style={{ 
                    height: 60, 
                    maxWidth: '100%', 
                    objectFit: 'contain',
                    marginBottom: '8px'
                  }} 
                />
              </Box>
              <Typography variant="subtitle1" fontWeight={700}>Détails du paiement :</Typography>
              <Typography>Montant demandé : <b>{paymentDetails.amount || paymentDetails.original_amount} FCFA</b></Typography>
              <Typography>Numéro : <b>{paymentDetails.numeroSend}</b></Typography>
              <Typography>Nom client : <b>{paymentDetails.nomclient}</b></Typography>
              <Typography>Statut : <b>{paymentDetails.statut}</b></Typography>
              <Typography>Moyen : <b>{paymentDetails.moyen}</b></Typography>
              <Typography>Date : <b>{paymentDetails.createdAt ? new Date(paymentDetails.createdAt).toLocaleString('fr-FR') : ''}</b></Typography>
            </Box>
          </>
        )}
        {status && !paymentDetails && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Aucun détail de paiement trouvé pour ce token.<br />
            Si vous avez été débité, contactez l'administration avec la référence de la transaction ou le numéro utilisé.
          </Alert>
        )}
        {paymentDetails && (
          <Button variant="contained" color="secondary" sx={{ mt: 2 }} onClick={downloadReceipt}>
            Télécharger le reçu (PDF)
          </Button>
        )}
        <Button variant="outlined" sx={{ mt: 4 }} onClick={() => navigate('/student/payment')}>Retour au paiement</Button>
      </Box>
    </Container>
  );
};

export default StudentPaymentReturn; 

