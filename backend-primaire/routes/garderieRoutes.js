const express = require('express');
const router = express.Router();
const garderieController = require('../controllers/garderieController');
const { auth, checkRole } = require('../middleware/auth');

// Route pour servir les photos de la garderie (sans authentification)
router.get('/photo/:filename', garderieController.serveGarderiePhoto);

// Routes protégées par authentification
router.use(auth);

// Route pour sauvegarder une inscription avec upload de photo
router.post('/save-inscription',
    checkRole(['admin', 'secretary', 'directrice', 'informaticien']),
    garderieController.upload.single('childPhoto'),
    garderieController.saveGarderieInscription
);

// Route pour réinscription avec upload de photo
router.post('/reinscription',
    checkRole(['admin', 'secretary', 'directrice', 'informaticien']),
    garderieController.upload.single('childPhoto'),
    garderieController.reinscription
);

// Route pour modifier une inscription avec upload de photo
router.put('/inscription/:id',
    checkRole(['admin', 'secretary', 'directrice', 'informaticien']),
    garderieController.upload.single('childPhoto'),
    garderieController.updateInscription
);

// Route pour récupérer la liste des enfants
router.get('/children',
    checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']),
    garderieController.getChildren
);

// Route pour rechercher un enfant
router.get('/search',
    checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']),
    garderieController.searchChild
);

// Route pour supprimer une inscription
router.delete('/inscription/:id',
    checkRole(['admin', 'secretary', 'directrice', 'informaticien']),
    garderieController.deleteInscription
);

// Route pour récupérer une inscription par ID
router.get('/inscription/:id',
    checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']),
    garderieController.getInscriptionById
);

// Route pour effectuer un paiement de scolarité
router.post('/payment',
    checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']),
    garderieController.makePayment
);

// Routes pour l'historique des reçus
router.get('/:id/receipt-history',
    checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']),
    garderieController.getReceiptHistory
);

router.get('/:id/inscription-receipt',
    checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']),
    garderieController.getInscriptionReceipt
);

router.get('/:id/payment-receipt/:paymentId',
    checkRole(['admin', 'secretary', 'directrice', 'comptable', 'informaticien']),
    garderieController.getPaymentReceipt
);

// Route de test pour vérifier les photos disponibles
router.get('/debug/photos', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(__dirname, '../uploads/garderie');

        if (!fs.existsSync(uploadDir)) {
            return res.status(404).json({
                success: false,
                message: 'Dossier uploads/garderie non trouvé',
                path: uploadDir
            });
        }

        const files = fs.readdirSync(uploadDir);
        const photoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
        });

        // Tester l'accès à une photo spécifique
        const testPhoto = photoFiles[0];
        let testPhotoAccess = false;
        let testPhotoPath = '';

        if (testPhoto) {
            testPhotoPath = path.join(uploadDir, testPhoto);
            testPhotoAccess = fs.existsSync(testPhotoPath);
        }

        res.status(200).json({
            success: true,
            uploadDir: uploadDir,
            totalFiles: files.length,
            photoFiles: photoFiles,
            testPhoto: testPhoto,
            testPhotoPath: testPhotoPath,
            testPhotoAccess: testPhotoAccess,
            message: 'Liste des photos disponibles'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la vérification des photos',
            error: error.message
        });
    }
});

// Route de test pour une photo spécifique
router.get('/debug/test-photo/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const fs = require('fs');
        const path = require('path');
        const uploadDir = path.join(__dirname, '../uploads/garderie');
        const filePath = path.join(uploadDir, filename);

        const exists = fs.existsSync(filePath);
        const stats = exists ? fs.statSync(filePath) : null;

        res.status(200).json({
            success: true,
            filename: filename,
            filePath: filePath,
            exists: exists,
            size: stats ? stats.size : null,
            message: exists ? 'Photo accessible' : 'Photo non trouvée'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erreur lors du test de la photo',
            error: error.message
        });
    }
});

module.exports = router;