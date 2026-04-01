const express = require('express');
const router = express.Router();
const classSubjectController = require('../controllers/classSubjectController');

// Récupérer toutes les matières d'une classe avec leur coefficient
router.get('/class/:classId/subjects', classSubjectController.getSubjectsForClass);

// Associer une matière à une classe avec coefficient
router.post('/class/:classId/subjects', classSubjectController.addSubjectToClass);

// Modifier le coefficient d'une matière pour une classe
router.put('/class/:classId/subjects/:subjectId', classSubjectController.updateCoefficient);

module.exports = router;