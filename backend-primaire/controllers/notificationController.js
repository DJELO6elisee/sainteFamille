const pool = require('../config/database');

// Récupérer les notifications d'un parent
exports.getParentNotifications = async(req, res) => {
    const userId = req.params.userId;
    try {
        // Vérifier que l'utilisateur est bien un parent
        const [
            [user]
        ] = await pool.query('SELECT id, role FROM users WHERE id = ?', [userId]);
        if (!user || user.role !== 'parent') {
            return res.status(400).json({ message: 'L\'ID fourni ne correspond pas à un parent.' });
        }

        let notifications = [];

        // 1. Notifications publiques et privées adressées au parent
        const [publicAndPrivate] = await pool.query(`
            SELECT 
                n.id,
                n.title,
                n.message,
                n.event_date,
                n.type,
                n.student_id,
                n.created_at,
                un.is_read
            FROM notifications n
            JOIN user_notifications un ON n.id = un.notification_id
            WHERE un.user_id = ?
        `, [userId]);
        console.log('[NOTIF][parent] Privées/publiques pour parent', userId, ':', publicAndPrivate.map(n => ({ id: n.id, type: n.type, title: n.title })));
        notifications = publicAndPrivate;

        // 1b. Notifications privées envoyées à ses enfants (même si le parent n'est pas explicitement notifié)
        // Trouver les enfants du parent
        const [children] = await pool.query('SELECT id, user_id FROM students WHERE parent_email = (SELECT email FROM users WHERE id = ?)', [userId]);
        if (children.length > 0) {
            const childUserIds = children.map(c => c.user_id);
            // Récupérer les notifications privées envoyées à ces enfants
            if (childUserIds.length > 0) {
                const [privateForChildren] = await pool.query(`
                    SELECT 
                        n.id,
                        n.title,
                        n.message,
                        n.event_date,
                        n.type,
                        n.student_id,
                        n.created_at,
                        un.is_read
                    FROM notifications n
                    JOIN user_notifications un ON n.id = un.notification_id
                    WHERE n.type = 'private' AND un.user_id IN (?)
                `, [childUserIds]);
                console.log('[NOTIF][parent] Privées pour enfants', userId, ':', privateForChildren.map(n => ({ id: n.id, type: n.type, title: n.title })));
                notifications = notifications.concat(privateForChildren);
            }
        }

        // 2. Notifications de classe pour les classes de ses enfants
        if (children.length > 0) {
            const childIds = children.map(c => c.id);
            // Récupérer les classes des enfants
            const [enrollments] = await pool.query('SELECT class_id FROM enrollments WHERE student_id IN (?) AND status = "active"', [childIds]);
            const classIds = enrollments.map(e => e.class_id);
            if (classIds.length > 0) {
                // Récupérer les notifications de classe pour ces classes
                const [classNotifs] = await pool.query(`
                    SELECT 
                        n.id,
                        n.title,
                        n.message,
                        n.event_date,
                        n.type,
                        n.class_id,
                        n.created_at,
                        NULL as is_read
                    FROM notifications n
                    WHERE n.type = 'class' AND n.class_id IN (?)
                `, [classIds]);
                console.log('[NOTIF][parent] Classe pour parent', userId, ':', classNotifs.map(n => ({ id: n.id, type: n.type, title: n.title })));
                notifications = notifications.concat(classNotifs);
            }
        }

        // Dédupliquer les notifications basées sur l'ID
        const seenIds = new Set();
        notifications = notifications.filter(notif => {
            if (seenIds.has(notif.id)) {
                return false;
            }
            seenIds.add(notif.id);
            return true;
        });

        // Trier par date de création décroissante et limiter à 20
        notifications = notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20);
        console.log('[NOTIF][parent] Notifications finales renvoyées:', notifications.map(n => ({ id: n.id, type: n.type, title: n.title })));

        res.json(notifications);
    } catch (err) {
        console.error('Erreur lors de la récupération des notifications:', err);
        res.status(500).json({ message: 'Erreur lors de la récupération des notifications.' });
    }
};

// Marquer une notification comme lue
exports.markNotificationAsRead = async(req, res) => {
    const { userId, notificationId } = req.body;
    try {
        await pool.query(
            `UPDATE user_notifications SET is_read = 1, read_at = NOW()
       WHERE user_id = ? AND notification_id = ?`, [userId, notificationId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour.' });
    }
};