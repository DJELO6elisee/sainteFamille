const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

// Routes principales pour les cours
router.get('/', courseController.getAllCourses);
router.get('/:id', courseController.getCourseById);
router.get('/teacher/:teacherId', courseController.getTeacherCourses);
router.get('/class/:classId', courseController.getClassCourses);

// Routes pour la gestion des cours
router.post('/', courseController.createCourse);
router.put('/:id', courseController.updateCourse);
router.delete('/:id', courseController.deleteCourse);

// Routes pour la gestion des inscriptions
router.post('/enroll', courseController.enrollStudent);
router.post('/unenroll', courseController.unenrollStudent);

module.exports = router;