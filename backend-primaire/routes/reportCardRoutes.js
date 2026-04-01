const express = require('express');
const router = express.Router();
const { publishReportCard, isReportCardPublished } = require('../controllers/reportCardController');
const { verifyToken, isAdminOrSecretary } = require('../middleware/authMiddleware');

// Publier un bulletin (admin/secrétaire)
router.post('/publish', verifyToken, isAdminOrSecretary, publishReportCard);

// Vérifier si un bulletin est publié (accessible à tout utilisateur connecté)
router.get('/published', verifyToken, isReportCardPublished);

module.exports = router;