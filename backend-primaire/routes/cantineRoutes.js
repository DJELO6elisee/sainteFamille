const express = require('express');
const router = express.Router();
const cantineController = require('../controllers/cantineController');
const { auth, checkRole } = require('../middleware/auth');

// Appliquer le middleware d'authentification à toutes les routes
router.use(auth);

// Créer un paiement de cantine
router.post('/payment', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), cantineController.createPayment);

// Récupérer les paiements d'un élève spécifique
router.get('/student/:student_id/payments', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), cantineController.getStudentPayments);

// Récupérer tous les paiements de cantine
router.get('/payments', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), cantineController.getAllPayments);

// Récupérer les informations de paiement par tranche pour un élève (compatibilité)
router.get('/tranche-info', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), cantineController.getTrancheInfo);

// Récupérer les informations de paiement mensuel pour un élève
router.get('/monthly-info', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), cantineController.getMonthlyCantineInfo);

// Récupérer tous les élèves de cantine avec statut mensuel
router.get('/students', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), cantineController.getCantineStudents);

// Récupérer les statistiques de la cantine
router.get('/stats', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), cantineController.getCantineStats);

// Routes pour l'historique des reçus
router.get('/:id/receipt-history', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), cantineController.getReceiptHistory);

router.get('/:id/payment-receipt/:paymentId', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), cantineController.getPaymentReceipt);

module.exports = router;