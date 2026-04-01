const express = require('express');
const router = express.Router();
const installmentController = require('../controllers/installmentController');
const { auth, checkRole } = require('../middleware/authMiddleware');

// Routes pour les versements
router.get('/student/:studentId', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), installmentController.getStudentInstallments);
router.post('/payment', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), installmentController.recordInstallmentPayment);
router.get('/:installmentId/payments', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), installmentController.getInstallmentPaymentHistory);
router.get('/student/:studentId/summary', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), installmentController.getStudentFinancialSummary);
router.post('/mark-overdue', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), installmentController.markOverdueInstallments);

// Nouvelle route pour le paiement intelligent
router.post('/intelligent-payment', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), installmentController.processIntelligentPaymentRoute);

module.exports = router;