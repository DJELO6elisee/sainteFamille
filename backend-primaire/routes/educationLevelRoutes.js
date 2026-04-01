const express = require('express');
const router = express.Router();
const educationLevelController = require('../controllers/educationLevelController');
const { auth, checkRole } = require('../middleware/authMiddleware');

// Routes pour les niveaux d'études
router.get('/', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), educationLevelController.getAllEducationLevels);
router.get('/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), educationLevelController.getEducationLevelById);
router.get('/:id/usage', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), educationLevelController.getEducationLevelUsage);
router.get('/:levelId/installments', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), educationLevelController.getLevelInstallmentsDetails);
router.post('/', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), educationLevelController.createEducationLevel);
router.put('/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), educationLevelController.updateEducationLevel);
router.delete('/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), educationLevelController.deleteEducationLevel);
router.get('/:levelId/calculate', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), educationLevelController.calculateLevelInstallments);

module.exports = router;