const express = require('express');
const router = express.Router();
const {
    getAllCompositions,
    getCompositionsByClass,
    getClassCompositionReport,
    getSchoolCompositionReport,
    getCompositionStatistics
} = require('../controllers/reportController');
const { auth, checkRole } = require('../middleware/auth');

// Middleware d'authentification pour toutes les routes
router.use(auth);

// Middleware de vérification des rôles pour toutes les routes de rapport
router.use(checkRole(['admin', 'secretary', 'directrice', 'informaticien']));

// Routes pour les compositions
router.get('/compositions', getAllCompositions);
router.get('/compositions/:classId', getCompositionsByClass);

// Routes pour les rapports
router.get('/composition/:compositionId/class/:classId', getClassCompositionReport);
router.get('/composition/:compositionId/school', getSchoolCompositionReport);

// Route pour les statistiques générales
router.get('/statistics', getCompositionStatistics);

module.exports = router;