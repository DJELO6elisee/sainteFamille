const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { auth, checkRole } = require('../middleware/auth');

// Routes protégées par authentification
router.use(auth);

// Route pour récupérer les infos du professeur connecté
router.get('/me', checkRole(['teacher']), teacherController.getMe);

// Route pour obtenir les classes du professeur connecté (doit être AVANT les routes dynamiques)
router.get('/classes', checkRole(['teacher']), teacherController.getMyClasses);

// Routes accessibles par tous les utilisateurs authentifiés
router.get('/', checkRole(['admin', 'secretary', 'directrice']), teacherController.getAllTeachers);
router.get('/:id', checkRole(['admin', 'secretary', 'directrice']), teacherController.getTeacherById);
router.get('/:id/courses', checkRole(['admin', 'secretary', 'teacher']), teacherController.getTeacherCourses);
router.get('/:id/schedule', checkRole(['admin', 'secretary', 'teacher']), teacherController.getTeacherSchedule);
router.get('/:id/subjects', checkRole(['admin', 'secretary', 'teacher']), teacherController.getSubjectsForTeacher);
// router.get('/:id/evaluations', checkRole(['admin', 'secretary', 'teacher']), teacherController.getTeacherEvaluations);
router.get('/:id/teaching-schedule', checkRole(['admin', 'secretary', 'teacher']), teacherController.getTeachingSchedule);

// Route pour récupérer l'emploi du temps hebdomadaire créé par le professeur
router.get('/:id/weekly-schedule', checkRole(['teacher']), teacherController.getWeeklySchedule);

// Routes accessibles uniquement par l'admin et le secrétariat
router.post('/', checkRole(['admin', 'secretary', 'directrice']), teacherController.createTeacher);
router.put('/:id', checkRole(['admin', 'secretary', 'directrice']), teacherController.updateTeacher);
router.delete('/:id', checkRole(['admin', 'secretary', 'directrice']), teacherController.deleteTeacher);

// Route pour ajouter une note à un élève pour une classe (sans évaluation)
router.post('/grades', checkRole(['teacher', 'admin', 'secretary', 'directrice', 'informaticien']), teacherController.addGrade);

// Route pour récupérer les notes d'une classe/matière/trimestre
router.get('/grades', checkRole(['teacher', 'admin', 'secretary', 'directrice', 'informaticien']), teacherController.getGradesByClassSubject);

// Modifier une note
router.put('/grades/:id', checkRole(['teacher', 'admin', 'informaticien']), teacherController.updateGrade);
// Supprimer une note
router.delete('/grades/:id', checkRole(['teacher', 'admin', 'informaticien']), teacherController.deleteGrade);

// Route pour récupérer les classes où le prof enseigne une matière donnée
router.get('/:id/subjects/:subjectId/classes', checkRole(['teacher']), teacherController.getClassesForSubject);

// Route pour récupérer les matières autorisées pour une classe donnée
router.get('/authorized-subjects/:classId', checkRole(['teacher', 'admin', 'secretary', 'directrice', 'informaticien']), teacherController.getAuthorizedSubjectsForClass);

// Route pour publier les notes
router.post('/publish-grades', checkRole(['teacher', 'admin', 'secretary', 'directrice', 'informaticien']), teacherController.publishGrades);

// Route de debug pour vérifier les notes
router.get('/debug-grades', checkRole(['teacher']), teacherController.debugGrades);

// Route temporaire sans vérification de permissions
router.get('/grades-no-auth', checkRole(['teacher']), teacherController.getGradesNoAuth);

module.exports = router;