const express = require('express');
const router = express.Router();
const annexeFeesController = require('../controllers/annexeFeesController');
const { auth, checkRole } = require('../middleware/authMiddleware');

// Configuration globale (frais annexes + zones car) pour une année
router.get('/config', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), annexeFeesController.getConfigBySchoolYear);

// Frais annexes (payables une fois par élève et par année)
router.get('/annexe-fees', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), annexeFeesController.getAnnexeFees);
router.post('/annexe-fees', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), annexeFeesController.createAnnexeFee);
router.put('/annexe-fees/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), annexeFeesController.updateAnnexeFee);
router.delete('/annexe-fees/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), annexeFeesController.deleteAnnexeFee);

// Zones car (chaque zone a un montant, payables plusieurs fois)
router.get('/car-zones', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), annexeFeesController.getCarZones);
router.post('/car-zones', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), annexeFeesController.createCarZone);
router.put('/car-zones/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), annexeFeesController.updateCarZone);
router.delete('/car-zones/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), annexeFeesController.deleteCarZone);

// Paiements par élève
router.get('/payments', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), annexeFeesController.getPaymentsByStudent);
router.post('/payments', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), annexeFeesController.createPayment);

module.exports = router;
