const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { auth, checkRole } = require('../middleware/auth');

// Routes pour les paiements (admin, secrétaire et comptable)
router.get('/', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getAllPayments);
router.get('/list', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getAllPayments);
router.post('/', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.createPayment);
router.put('/:id/status', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.updatePaymentStatus);

// Routes pour les rapports et statistiques (admin, secrétaire et comptable) - DOIVENT ÊTRE AVANT LES ROUTES AVEC PARAMÈTRES
router.get('/financial-summary', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getFinancialSummary);
router.get('/daily-states', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getDailyFinancialStates);
router.get('/custom-date-range', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getCustomDateRangeStates);
router.get('/payment-details', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getPaymentDetailsByPeriod);
router.get('/student/:studentId', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getStudentPayments);
router.get('/stats/completed', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getPaymentStats);
router.get('/pending', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getPendingPayments);

// Route de test temporaire (sans authentification) - DOIT ÊTRE AVANT LES ROUTES AVEC PARAMÈTRES
router.get('/test-financial-summary', paymentController.getFinancialSummary);

// Routes avec paramètres - DOIVENT ÊTRE EN DERNIER
router.get('/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getPaymentById);
router.get('/:id/receipt', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.generateReceipt);
router.get('/student/:id/inscription-receipt', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getInscriptionReceipt);
router.get('/student/:id/payment-receipt/:paymentId', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), paymentController.getPaymentReceipt);

// Vérification du statut d'un paiement Monnaie Fusion
router.get('/fusion-status/:token', paymentController.checkPaymentStatus);

// Webhook pour notifications Monnaie Fusion
router.post('/fusion-webhook', paymentController.handleWebhook);
router.post('/fusion-init', paymentController.initiatePayment);

module.exports = router;