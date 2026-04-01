const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const {
    sendRemindersForStudent,
    sendRemindersForClass,
    sendRemindersForLevel,
    sendRemindersForAllSchool,
    getOverdueStatistics,
    getOverdueInstallmentsForStudent,
    getOverdueInstallmentsForClass,
    getOverdueInstallmentsForLevel,
    getAllOverdueInstallments,
    getAllOverdueStudents,
    getOverdueStudentsByLevel,
    getOverdueStudentsByClass
} = require('../controllers/reminderController');

// Middleware d'authentification pour toutes les routes
router.use(auth);

// Routes pour envoyer des relances
router.post('/student/:studentId', sendRemindersForStudent);
router.post('/class/:classId', sendRemindersForClass);
router.post('/level/:levelId', sendRemindersForLevel);
router.post('/all-school', sendRemindersForAllSchool);

// Routes pour obtenir les statistiques
router.get('/statistics', getOverdueStatistics);

// Routes pour consulter les versements en retard (sans envoyer de relances)
router.get('/overdue/student/:studentId', getOverdueInstallmentsForStudent);
router.get('/overdue/class/:classId', getOverdueInstallmentsForClass);
router.get('/overdue/level/:levelId', getOverdueInstallmentsForLevel);
router.get('/overdue/all-school', getAllOverdueInstallments);

// Routes pour récupérer les élèves en retard
router.get('/all-school/overdue', getAllOverdueStudents);
router.get('/level/:levelId/overdue', getOverdueStudentsByLevel);
router.get('/class/:classId/overdue', getOverdueStudentsByClass);

module.exports = router;