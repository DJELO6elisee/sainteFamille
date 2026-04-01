const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { auth } = require('../middleware/auth');

// Routes pour le tableau de bord
router.get('/stats', auth, dashboardController.getDashboardStats);
router.get('/payments/stats', auth, dashboardController.getPaymentStats);
router.get('/students/stats', auth, dashboardController.getStudentStats);
router.get('/classes/stats', auth, dashboardController.getClassStats);

module.exports = router;