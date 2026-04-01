const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { auth } = require('../middleware/auth');

// Route pour créer un événement public
// POST /api/events/public
router.post(
    '/public',
    auth,
    eventController.createPublicEvent
);

// Route pour créer un événement par classe
// POST /api/events/class
router.post(
    '/class',
    auth,
    eventController.createClassEvent
);

// Route pour créer un événement privé
// POST /api/events/private
router.post(
    '/private',
    auth,
    eventController.createPrivateEvent
);

// Route pour récupérer les notifications d'un utilisateur
// GET /api/events/my-notifications
router.get(
    '/my-notifications',
    auth,
    eventController.getNotificationsForUser
);

// Route pour marquer une notification comme lue
// PUT /api/events/notifications/:notification_id/read
router.put(
    '/notifications/:notification_id/read',
    auth,
    eventController.markNotificationAsRead
);

// Route pour marquer toutes les notifications comme lues
// PUT /api/events/notifications/read-all
router.put(
    '/notifications/read-all',
    auth,
    eventController.markAllNotificationsAsRead
);

// Route pour récupérer toutes les notifications/événements pour une année scolaire donnée
router.get(
    '/all',
    auth,
    eventController.getAllNotifications
);


/*
 * Note pour le développeur :
 * Pour activer ces routes, ajoutez le code suivant à votre fichier principal du serveur (ex: server.js ou index.js) :
 * 
 * const eventRoutes = require('./routes/eventRoutes');
 * app.use('/api/events', eventRoutes);
 * 
 */

module.exports = router;