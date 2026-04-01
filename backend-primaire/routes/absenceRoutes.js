const express = require('express');
const router = express.Router();
const absenceController = require('../controllers/absenceController');

// Route pour créer ou mettre à jour une absence
router.post('/', absenceController.createAbsence);

// Route pour marquer un élève comme présent (supprime son absence)
router.post('/present', absenceController.setStudentPresent);

// Obtenir les absences pour un contexte donné (classe, matière, date)
router.get('/class/:classId/subject/:subjectId/date/:date', absenceController.getAbsencesByContext);

// Routes de base
router.get('/', absenceController.getAllAbsences);
router.get('/student/:studentId', absenceController.getStudentAbsences);

// Route pour supprimer une absence par son ID (admin)
router.delete('/:id', absenceController.deleteAbsenceById);

module.exports = router;