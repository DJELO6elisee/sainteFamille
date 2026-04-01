const express = require('express');
const router = express.Router();
const { mediaController, upload } = require('../controllers/mediaController');
const { auth, checkRole } = require('../middleware/auth');

// Routes pour l'admin
router.post('/upload', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), upload.single('media'), mediaController.uploadMedia);
router.get('/admin/all', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), mediaController.getAllMedia);
router.delete('/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), mediaController.deleteMedia);
router.post('/:id/send-to-parents', auth, checkRole(['admin', 'secretary', 'directrice', 'informaticien']), mediaController.sendMediaToParents);

// Route pour servir les médias protégés (accessible avec token)
router.get('/:id', mediaController.getProtectedMedia);

// Routes existantes pour les médias élèves
router.post('/student/upload', auth, checkRole(['admin', 'secretary', 'teacher', 'informaticien']), upload.single('file'), mediaController.uploadStudentMedia);
router.post('/student/bulk-upload', auth, checkRole(['admin', 'secretary', 'teacher', 'informaticien']), upload.single('file'), mediaController.uploadBulkStudentMedia);
router.post('/bulk-upload', auth, checkRole(['admin', 'secretary', 'teacher', 'informaticien']), upload.single('file'), mediaController.uploadBulkStudentMedia);
router.get('/student/:student_id', auth, checkRole(['admin', 'secretary', 'directrice', 'teacher', 'parent', 'informaticien']), mediaController.getStudentMedia);


module.exports = router;