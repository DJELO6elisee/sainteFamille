const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { auth, checkRole } = require('../middleware/auth');
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// Route pour servir les photos des élèves (sans authentification)
router.get('/photo/:filename', (req, res) => {
    try {
        let { filename } = req.params;
        console.log('=== DÉBUT DE LA FONCTION serveStudentPhoto ===');
        console.log('Nom du fichier demandé (encodé):', filename);

        // Décoder l'URL pour gérer les caractères spéciaux
        try {
            filename = decodeURIComponent(filename);
            console.log('Nom du fichier décodé:', filename);
        } catch (decodeError) {
            console.log('❌ Erreur lors du décodage du nom de fichier:', decodeError.message);
            // Continuer avec le nom de fichier original
        }

        // Vérifier que le nom de fichier est valide
        if (!filename || filename.includes('..') || filename.includes('/')) {
            console.log('❌ Nom de fichier invalide');
            return res.status(400).json({ message: 'Nom de fichier invalide' });
        }

        // Nouvelle structure : protected_uploads/[filename]
        const filePath = path.join(__dirname, '../protected_uploads', filename);
        console.log('Chemin complet du fichier:', filePath);

        if (fs.existsSync(filePath)) {
            console.log('✅ Fichier trouvé, envoi...');

            // Obtenir les informations du fichier
            const stats = fs.statSync(filePath);
            console.log(`📊 Taille du fichier: ${stats.size} bytes`);

            // Définir le type de contenu approprié
            const ext = path.extname(filename).toLowerCase();
            console.log(`📋 Extension du fichier: ${ext}`);

            if (ext === '.jpg' || ext === '.jpeg') {
                res.setHeader('Content-Type', 'image/jpeg');
            } else if (ext === '.png') {
                res.setHeader('Content-Type', 'image/png');
            } else if (ext === '.gif') {
                res.setHeader('Content-Type', 'image/gif');
            } else if (ext === '.webp') {
                res.setHeader('Content-Type', 'image/webp');
            }

            // Ajouter des headers pour éviter la mise en cache
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            console.log('📤 Envoi du fichier...');
            res.sendFile(filePath, (err) => {
                if (err) {
                    console.error('❌ Erreur lors de l\'envoi du fichier:', err);
                } else {
                    console.log('✅ Fichier envoyé avec succès');
                }
            });
        } else {
            console.log('❌ Fichier non trouvé:', filePath);

            // Essayer de trouver le fichier avec une recherche insensible à la casse
            const protectedUploadsDir = path.join(__dirname, '../protected_uploads');
            if (fs.existsSync(protectedUploadsDir)) {
                const files = fs.readdirSync(protectedUploadsDir);
                console.log('📋 Fichiers disponibles dans le dossier protected_uploads:');

                // Recherche insensible à la casse
                const matchingFile = files.find(file =>
                    file.toLowerCase() === filename.toLowerCase() ||
                    file.toLowerCase().includes(filename.toLowerCase()) ||
                    filename.toLowerCase().includes(file.toLowerCase())
                );

                if (matchingFile) {
                    console.log(`🔍 Fichier similaire trouvé: ${matchingFile}`);
                    const correctedPath = path.join(protectedUploadsDir, matchingFile);
                    console.log('📤 Tentative d\'envoi avec le nom corrigé...');

                    const ext = path.extname(matchingFile).toLowerCase();
                    if (ext === '.jpg' || ext === '.jpeg') {
                        res.setHeader('Content-Type', 'image/jpeg');
                    } else if (ext === '.png') {
                        res.setHeader('Content-Type', 'image/png');
                    } else if (ext === '.gif') {
                        res.setHeader('Content-Type', 'image/gif');
                    } else if (ext === '.webp') {
                        res.setHeader('Content-Type', 'image/webp');
                    }

                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'GET');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

                    res.sendFile(correctedPath, (err) => {
                        if (err) {
                            console.error('❌ Erreur lors de l\'envoi du fichier corrigé:', err);
                            res.status(404).json({ message: 'Photo non trouvée' });
                        } else {
                            console.log('✅ Fichier envoyé avec succès (nom corrigé)');
                        }
                    });
                    return;
                }

                files.slice(0, 10).forEach(file => console.log(`  - ${file}`));
                if (files.length > 10) {
                    console.log(`  ... et ${files.length - 10} autres`);
                }
            }

            res.status(404).json({ message: 'Photo non trouvée' });
        }
    } catch (error) {
        console.error('❌ Erreur lors du service de la photo:', error);
        res.status(500).json({ message: 'Erreur lors du service de la photo' });
    }
});

// Route de connexion parent (publique, AVANT router.use(auth))
router.post('/auth/parent-login-code', authController.loginParentWithCode);

// Route publique pour inscription en ligne (pas d'authentification)
router.post('/public-register', upload.single('child_photo'), studentController.createStudent);

// Routes protégées par authentification
router.use(auth);

// Route pour obtenir les détails de l'élève lié à l'utilisateur connecté (doit être avant /:id)
router.get('/me', checkRole(['student']), require('../controllers/studentController').getMyDetails);

// Route pour obtenir les détails de l'élève connecté (toutes infos paiement, classe, etc.)
router.get('/me/details', auth, checkRole(['student']), require('../controllers/studentController').getMyDetails);

// Routes accessibles par tous les utilisateurs authentifiés
// Ajout de 'teacher' pour l'envoi de médias et consultation basique
router.get('/', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'parent', 'teacher', 'informaticien']), studentController.getAllStudents);
router.get('/list', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'parent', 'teacher', 'informaticien']), studentController.getAllStudents);

// Récupérer tous les élèves inscrits à la cantine (DOIT être avant /:id)
router.get('/cantine', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), studentController.getCantineStudents);

router.get('/:id', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'teacher', 'parent']), studentController.getStudentById);
router.get('/:id/grades', checkRole(['admin', 'secretary', 'directrice', 'teacher', 'student', 'parent', 'informaticien']), studentController.getStudentGrades);
router.get('/:id/annual-average', checkRole(['admin', 'secretary', 'directrice', 'teacher', 'student', 'parent', 'informaticien']), studentController.getAnnualAverage);
router.get('/:id/schedule', checkRole(['admin', 'secretary', 'directrice', 'teacher', 'student', 'parent', 'informaticien']), studentController.getStudentSchedule);
router.get('/:id/weekly-schedule', checkRole(['admin', 'secretary', 'directrice', 'teacher', 'student', 'parent', 'informaticien']), studentController.getStudentWeeklySchedule);
router.get('/:id/payments', checkRole(['admin', 'secretary', 'directrice', 'informaticien', 'comptable', 'parent']), studentController.getStudentPayments);
router.get('/:id/classes', checkRole(['admin', 'secretary', 'directrice', 'teacher', 'parent', 'informaticien']), studentController.getStudentClasses);
router.get('/:id/trimester-rank', auth, studentController.getTrimesterRank);
router.get('/:id/absences', checkRole(['admin', 'secretary', 'directrice', 'teacher', 'parent', 'informaticien']), studentController.getStudentAbsences);

// Route pour récupérer les médias d'un élève (photos et vidéos)
router.get('/:id/media', checkRole(['admin', 'secretary', 'directrice', 'teacher', 'parent', 'informaticien']), studentController.getStudentMedia);

// Route pour récupérer le résumé de paiement d'un élève
router.get('/:id/payment-summary', checkRole(['admin', 'secretary', 'directrice', 'informaticien', 'comptable', 'parent']), studentController.getStudentPaymentSummary);

// Route pour récupérer l'historique des reçus d'un élève
router.get('/:id/receipt-history', checkRole(['admin', 'secretary', 'directrice', 'informaticien', 'comptable', 'parent']), studentController.getReceiptHistory);
router.get('/:id/inscription-receipt', checkRole(['admin', 'secretary', 'directrice', 'informaticien', 'comptable', 'parent']), studentController.getInscriptionReceipt);
router.get('/:id/payment-receipt/:paymentId', checkRole(['admin', 'secretary', 'directrice', 'informaticien', 'comptable', 'parent']), studentController.getPaymentReceipt);

// Route pour récupérer le bulletin d'un élève
router.get('/:id/bulletin', checkRole(['admin', 'secretary', 'directrice', 'teacher', 'parent', 'informaticien']), studentController.getStudentBulletin);
router.get('/:id/compositions', checkRole(['admin', 'secretary', 'directrice', 'teacher', 'parent', 'comptable', 'informaticien']), studentController.getStudentCompositions);

// Routes accessibles uniquement par l'admin et le secrétariat
router.post('/', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), upload.single('child_photo'), studentController.createStudent);
router.put('/:id', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), upload.single('child_photo'), studentController.updateStudent);
router.delete('/:id', checkRole(['admin']), studentController.deleteStudent);

// Route pour récupérer les inscriptions en ligne (accessible par l'admin et la secrétaire)
router.get('/online-registrations', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), studentController.getOnlineRegistrations);

// Route pour finaliser une inscription (accessible par l'admin et la secrétaire)
router.post('/:id/finalize', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), studentController.finalizeRegistration);

// Route pour obtenir les détails d'un élève (accessible par l'admin, la secrétaire et le comptable)
router.get('/:id/details', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), studentController.getStudentDetails);

// Route pour la réinscription (accessible par admin et secrétaire)
router.post('/:id/reinscription', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), studentController.reinscribeStudent);

// Route pour rechercher un élève par matricule pour réinscription (accessible par admin et secrétaire)
router.get('/search/registration/:registration_number', checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']), studentController.searchStudentByRegistration);

module.exports = router;