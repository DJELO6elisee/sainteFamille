const express = require('express');
const router = express.Router();
const { getHistory } = require('../controllers/historyController');
const { getHistorySimple } = require('../controllers/historyController_simple');
const { auth, checkRole } = require('../middleware/auth');

// Route pour récupérer l'historique (admin et secrétaires)
router.get('/', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), getHistory);

// Route temporaire pour tester la version simplifiée
router.get('/simple', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), getHistorySimple);

module.exports = router;