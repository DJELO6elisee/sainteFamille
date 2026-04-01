const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, checkRole } = require('../middleware/auth');

// Route d'inscription
router.post('/register', authController.register);

// Route d'inscription d'administrateur (réservé aux secrétaires et admins)
router.post('/register-admin', auth, checkRole(['admin', 'secretary', 'directrice', 'comunicateur', 'informaticien']), authController.registerAdmin);

// Routes pour la gestion des administrateurs
router.get('/admins', auth, checkRole(['admin', 'secretary', 'directrice', 'comunicateur', 'informaticien']), authController.getAdmins);
router.put('/admins/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'comunicateur', 'informaticien']), authController.updateAdmin);
router.delete('/admins/:id', auth, checkRole(['admin', 'secretary', 'directrice', 'comunicateur', 'informaticien']), authController.deleteAdmin);

// Route de connexion
router.post('/login', authController.login);

// Route de connexion avec code et nom (élève ou professeur)
router.post('/login-code', authController.loginWithCode);

// Route de connexion parent avec code et nom
router.post('/login-parent-code', authController.loginParentWithCode);

// Route de vérification du token
router.get('/verify', auth, checkRole(['student', 'teacher', 'parent', 'admin', 'secretary', 'directrice', 'comptable', 'comunicateur', 'informaticien']), authController.verifyToken);

// Route de changement de mot de passe
router.post('/change-password', auth, checkRole(['student', 'teacher', 'parent', 'admin', 'secretary', 'directrice', 'comptable', 'comunicateur', 'informaticien']), authController.changePassword);

// Route pour obtenir le profil de l'utilisateur connecté
router.get('/profile', auth, checkRole(['student', 'teacher', 'parent', 'admin', 'secretary', 'directrice', 'comptable', 'comunicateur', 'informaticien']), authController.getProfile);

// Route pour modifier son propre profil (admin/secretary/comptable/comunicateur/informaticien)
router.put('/profile', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'comunicateur', 'informaticien']), authController.updateOwnProfile);

// Route pour récupérer le mot de passe actuel (admin/secretary/comptable/comunicateur/informaticien)
router.get('/current-password', auth, checkRole(['admin', 'secretary', 'directrice', 'comptable', 'comunicateur', 'informaticien']), authController.getCurrentPassword);

// GET /api/auth/me
router.get('/me', auth, checkRole(['student', 'teacher', 'parent', 'admin', 'secretary', 'directrice', 'comptable', 'comunicateur', 'informaticien']), authController.getProfile);

// Route de débogage pour diagnostiquer les problèmes de parent (sans authentification pour faciliter le test)
router.get('/debug-parent-children', authController.debugParentChildren);

// Route pour créer automatiquement un compte parent manquant
router.post('/create-parent-account', authController.createParentAccount);

// Route de test pour vérifier les enfants d'un parent connecté
router.get('/test-parent-children', authController.testParentChildren);

module.exports = router;