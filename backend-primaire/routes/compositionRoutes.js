const express = require('express');
const router = express.Router();
const compositionController = require('../controllers/compositionController');
const { checkRole } = require('../middleware/authMiddleware');

// Routes pour les compositions

// Routes accessibles par tous les utilisateurs authentifiés
router.get('/', compositionController.getAllCompositions);
router.get('/class/:classId', compositionController.getCompositionsForClass);
router.get('/stats', compositionController.getCompositionStats);

// Routes accessibles uniquement par l'admin et le secrétariat
router.post('/', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), compositionController.createComposition);
router.put('/:id', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), compositionController.updateComposition);
router.delete('/:id', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), compositionController.deleteComposition);
router.patch('/:id/toggle', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), compositionController.toggleComposition);

module.exports = router;