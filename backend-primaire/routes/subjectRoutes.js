const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { auth, checkRole } = require('../middleware/authMiddleware');

// Routes principales pour les matières
// Autoriser les parents à lire les matières pour voir les bulletins
router.get('/', auth, checkRole(['admin', 'secretary', 'directrice', 'teacher', 'informaticien', 'parent']), subjectController.getAllSubjects);
router.get('/class/:classId', auth, checkRole(['admin', 'secretary', 'directrice', 'teacher', 'informaticien', 'parent']), subjectController.getSubjectsByClass);
router.get('/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'teacher', 'informaticien']), subjectController.getSubjectById);
router.get('/department/:department', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), subjectController.getSubjectsByDepartment);
router.get('/stats', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), subjectController.getSubjectStats);
router.get('/:subjectId/teachers', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), subjectController.getTeachersForSubject);

// Routes pour la gestion des matières
router.post('/', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), subjectController.createSubject);
router.put('/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), subjectController.updateSubject);
router.delete('/:id', auth, checkRole(['admin', 'informaticien']), subjectController.deleteSubject);

module.exports = router;