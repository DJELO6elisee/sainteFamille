const express = require('express');
const router = express.Router();
const path = require('path');

// Charger le contrôleur avec vérification du chemin
const fs = require('fs');
const bulletinControllerPath = path.join(__dirname, '../controllers/bulletinController.js');
console.log('[bulletinRoutes] __dirname:', __dirname);
console.log('[bulletinRoutes] Chemin attendu du contrôleur:', bulletinControllerPath);

// Vérifier que le fichier existe avant de le charger
if (!fs.existsSync(bulletinControllerPath)) {
    console.error('[bulletinRoutes] ❌ ERREUR: Le fichier bulletinController.js n\'existe pas à:', bulletinControllerPath);
    console.error('[bulletinRoutes] Liste des fichiers dans controllers/:');
    const controllersDir = path.join(__dirname, '../controllers');
    try {
        const files = fs.readdirSync(controllersDir);
        console.error('[bulletinRoutes] Fichiers trouvés:', files.filter(f => f.endsWith('.js')));
    } catch (e) {
        console.error('[bulletinRoutes] Impossible de lire le répertoire controllers:', e.message);
    }
    console.error('[bulletinRoutes] Le serveur démarrera mais les routes /api/bulletins retourneront des erreurs 503');
    // Ne pas throw, continuer pour permettre au serveur de démarrer
}

// Lire le contenu du fichier pour vérifier qu'il contient bien bulletinController
let fileContent = '';
try {
    fileContent = fs.readFileSync(bulletinControllerPath, 'utf8');
    if (!fileContent.includes('getBulletinPublicationStatus')) {
        console.error('[bulletinRoutes] ⚠️ ATTENTION: Le fichier bulletinController.js existe mais ne contient pas getBulletinPublicationStatus');
        console.error('[bulletinRoutes] Le fichier semble incorrect ou incomplet');
        if (fileContent.includes('getAllStudents')) {
            console.error('[bulletinRoutes] ⚠️ Le fichier contient getAllStudents - il s\'agit probablement de studentController.js !');
        }
        if (fileContent.includes('getAllClasses')) {
            console.error('[bulletinRoutes] ⚠️ Le fichier contient getAllClasses - il s\'agit probablement de classController.js !');
        }
    }
} catch (error) {
    console.error('[bulletinRoutes] Erreur lors de la lecture du fichier:', error.message);
}

// Résoudre le chemin exact du module
let resolvedPath;
try {
    resolvedPath = require.resolve('../controllers/bulletinController');
    console.log('[bulletinRoutes] Chemin résolu du module:', resolvedPath);

    // Vérifier que le chemin résolu correspond bien au fichier attendu
    if (!resolvedPath.includes('bulletinController')) {
        console.error('[bulletinRoutes] ⚠️ ATTENTION: Le chemin résolu ne contient pas "bulletinController":', resolvedPath);
        console.error('[bulletinRoutes] Node.js a peut-être résolu vers un autre fichier');
    }
} catch (error) {
    console.error('[bulletinRoutes] ERREUR: Impossible de résoudre le chemin du module:', error);
    resolvedPath = null;
}

// Vider le cache si le fichier existe pour forcer le rechargement
if (resolvedPath && require.cache[resolvedPath]) {
    console.log('[bulletinRoutes] Nettoyage du cache pour:', resolvedPath);
    delete require.cache[resolvedPath];
}

// Vider aussi le cache pour bulletinControllerPath au cas où
if (require.cache[bulletinControllerPath]) {
    console.log('[bulletinRoutes] Nettoyage du cache pour:', bulletinControllerPath);
    delete require.cache[bulletinControllerPath];
}

let bulletinController;
let controllerLoadError = null;

// Ne pas essayer de charger si le fichier n'existe pas
if (fs.existsSync(bulletinControllerPath)) {
    try {
        // Charger avec le chemin absolu pour être sûr
        bulletinController = require(bulletinControllerPath);
        console.log('[bulletinRoutes] ✅ Contrôleur chargé avec succès depuis:', resolvedPath || bulletinControllerPath);
        console.log('[bulletinRoutes] Type du contrôleur:', typeof bulletinController);
        console.log('[bulletinRoutes] Méthodes disponibles:', Object.keys(bulletinController || {}));
    } catch (error) {
        console.error('[bulletinRoutes] ERREUR lors du chargement du contrôleur:', error);
        console.error('[bulletinRoutes] Stack trace:', error.stack);
        controllerLoadError = error;
        bulletinController = null;
    }
} else {
    controllerLoadError = new Error(`Le fichier bulletinController.js n'existe pas à: ${bulletinControllerPath}`);
    bulletinController = null;
}

const { checkRole } = require('../middleware/authMiddleware');

// Fonction helper pour créer un handler d'erreur
const createErrorHandler = (errorMessage) => {
    const safeMessage = typeof errorMessage === 'string' ? errorMessage : 'Erreur de configuration du contrôleur';
    return (req, res) => {
        res.status(503).json({
            error: 'Service Temporairement Indisponible',
            message: 'Le contrôleur bulletinController n\'est pas correctement configuré sur le serveur.',
            details: 'Veuillez contacter l\'administrateur pour corriger le fichier bulletinController.js'
        });
    };
};

// Vérification que le contrôleur et ses méthodes sont bien chargés
if (controllerLoadError || !bulletinController) {
    // Extraire le message d'erreur de manière sécurisée pour éviter la récursion
    let errorMsgText = 'bulletinController n\'est pas défini';
    if (controllerLoadError) {
        try {
            const errorMsg = controllerLoadError.message || String(controllerLoadError);
            // Limiter la longueur pour éviter les problèmes de stack
            errorMsgText = errorMsg.length > 200 ? errorMsg.substring(0, 200) + '...' : errorMsg;
        } catch (e) {
            errorMsgText = 'Erreur lors du chargement du contrôleur';
        }
    }

    console.error('[bulletinRoutes] ERREUR: Impossible de charger bulletinController');
    console.error('[bulletinRoutes] Détails:', errorMsgText);
    console.error('[bulletinRoutes] Le serveur démarrera mais les routes /api/bulletins retourneront des erreurs 503');
    console.error('[bulletinRoutes] Veuillez corriger le fichier bulletinController.js sur le serveur');

    // Créer des handlers d'erreur pour toutes les routes
    const errorHandler = createErrorHandler(errorMsgText);
    router.get('/class/:classId/status', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.get('/class/:classId/students', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.post('/class/:classId/publish', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.post('/class/:classId/unpublish', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    module.exports = router;
    return; // Sortir tôt si le contrôleur n'est pas chargé
}

// Vérifier si on a chargé accidentellement studentController (erreur commune)
const hasStudentMethods = bulletinController.getAllStudents || bulletinController.getStudentById;
if (hasStudentMethods) {
    console.error('[bulletinRoutes] ⚠️ ATTENTION: Il semble que studentController ait été chargé au lieu de bulletinController');
    console.error('[bulletinRoutes] Le fichier bulletinController.js pourrait être incorrect ou manquant');
    const errorHandler = createErrorHandler('Le fichier bulletinController.js contient du code incorrect');
    router.get('/class/:classId/status', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.get('/class/:classId/students', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.post('/class/:classId/publish', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.post('/class/:classId/unpublish', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    module.exports = router;
    return;
}

// Vérifier si on a chargé accidentellement classController (erreur commune)
const hasClassMethods = bulletinController.getAllClasses || bulletinController.getClassById;
if (hasClassMethods) {
    console.error('[bulletinRoutes] ⚠️ ATTENTION: Il semble que classController ait été chargé au lieu de bulletinController');
    console.error('[bulletinRoutes] Le fichier bulletinController.js contient probablement du code de classController');
    console.error('[bulletinRoutes] Méthodes trouvées:', Object.keys(bulletinController || {}));
    const errorHandler = createErrorHandler('Le fichier bulletinController.js contient du code de classController');
    router.get('/class/:classId/status', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.get('/class/:classId/students', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.post('/class/:classId/publish', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.post('/class/:classId/unpublish', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    module.exports = router;
    return;
}

// Vérifier que les méthodes requises existent
if (!bulletinController.getBulletinPublicationStatus) {
    console.error('[bulletinRoutes] ERREUR: getBulletinPublicationStatus n\'est pas défini dans bulletinController');
    console.error('[bulletinRoutes] Méthodes disponibles:', Object.keys(bulletinController || {}));
    const errorHandler = createErrorHandler('Méthodes requises manquantes dans bulletinController');
    router.get('/class/:classId/status', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.get('/class/:classId/students', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.post('/class/:classId/publish', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    router.post('/class/:classId/unpublish', checkRole(['admin', 'secretary', 'directrice', 'informaticien']), errorHandler);
    module.exports = router;
    return;
}

if (!checkRole) {
    console.error('[bulletinRoutes] ERREUR: checkRole middleware n\'est pas défini');
    throw new Error('checkRole middleware n\'est pas défini');
}

// Routes pour la gestion des bulletins (admin/secretary seulement)

// Récupérer le statut de publication des bulletins pour une classe
router.get('/class/:classId/status',
    checkRole(['admin', 'secretary', 'directrice', 'informaticien']),
    bulletinController.getBulletinPublicationStatus
);

// Récupérer les élèves d'une classe avec leurs bulletins
router.get('/class/:classId/students',
    checkRole(['admin', 'secretary', 'directrice', 'informaticien']),
    bulletinController.getClassStudentsWithBulletins
);

// Publier un bulletin pour une classe
router.post('/class/:classId/publish',
    checkRole(['admin', 'secretary', 'directrice', 'informaticien']),
    bulletinController.publishBulletin
);

// Dépublier un bulletin pour une classe
router.post('/class/:classId/unpublish',
    checkRole(['admin', 'secretary', 'directrice', 'informaticien']),
    bulletinController.unpublishBulletin
);

module.exports = router;