const express = require('express');
const router = express.Router();
const controller = require('../controllers/bulletinSubjectController');
const { auth, checkRole } = require('../middleware/auth');

// Public read access could be allowed, but keep it authenticated like other endpoints
router.use(auth);

// Admin/secretary/teacher/parent can read
router.get('/', checkRole(['admin', 'secretary', 'directrice', 'teacher', 'informaticien', 'parent']), controller.getAll);
router.get('/class/:classId', checkRole(['admin', 'secretary', 'directrice', 'teacher', 'informaticien', 'parent']), controller.getByClassId);

module.exports = router;