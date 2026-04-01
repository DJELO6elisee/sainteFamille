const pool = require('../config/database');
const {
    sendEventNotificationSMS
} = require('../services/smsService');

const normalizeEventDateForSMS = (value) => {
    if (!value) {
        return null;
    }

    try {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        }
    } catch (error) {
        // Ignorer et retourner la valeur brute
    }

    return value;
};



const eventController = {
    createPublicEvent: async(req, res) => {
        const { title, message, event_date } = req.body;
        const sender_id = req.user.id; // Assumes user is authenticated and user id is available

        if (!title || !message || !event_date) {
            return res.status(400).json({ message: 'Le titre, le message et la date de l\'événement sont requis.' });
        }

        let connection;
        let parentPhones = [];
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1. Insert the notification into the 'notifications' table.
            const [notificationResult] = await connection.query(
                'INSERT INTO notifications (title, message, event_date, type, sender_id) VALUES (?, ?, ?, ?, ?)', [title, message, event_date, 'public', sender_id]
            );
            const notificationId = notificationResult.insertId;

            // 2. Get all parent user IDs (parents of all students)
            const [parents] = await connection.query(`
                SELECT DISTINCT u.id 
                FROM users u 
                WHERE u.role = 'parent' 
                AND u.email IN (
                    SELECT DISTINCT parent_email 
                    FROM students 
                    WHERE parent_email IS NOT NULL AND parent_email != ''
                )
            `);

            const [parentPhoneRows] = await connection.query(`
                SELECT DISTINCT parent_phone
                FROM students
                WHERE parent_phone IS NOT NULL AND parent_phone != ''
            `);
            parentPhones = parentPhoneRows.map(row => row.parent_phone);

            if (parents.length === 0) {
                await connection.commit();

                if (parentPhones.length > 0) {
                    try {
                        const smsResult = await sendEventNotificationSMS(parentPhones, {
                            title,
                            message,
                            eventDate: normalizeEventDateForSMS(event_date)
                        });
                        console.log('[SMS][public] Résultat envoi (fallback):', smsResult);
                    } catch (smsError) {
                        console.error('Erreur lors de l\'envoi des SMS pour l\'événement public (sans comptes parents):', smsError);
                    }
                }

                return res.status(200).json({ message: 'Événement créé, mais aucun parent trouvé à notifier.' });
            }

            // 3. Create entries in the 'user_notifications' pivot table for all parents
            const userNotificationValues = parents.map(parent => [parent.id, notificationId]);

            await connection.query(
                'INSERT INTO user_notifications (user_id, notification_id) VALUES ?', [userNotificationValues]
            );

            await connection.commit();

            if (parentPhones.length > 0) {
                try {
                    const smsResult = await sendEventNotificationSMS(parentPhones, {
                        title,
                        message,
                        eventDate: normalizeEventDateForSMS(event_date)
                    });
                    console.log('[SMS][public] Résultat envoi:', smsResult);
                } catch (smsError) {
                    console.error('Erreur lors de l\'envoi des SMS pour l\'événement public:', smsError);
                }
            }

            res.status(201).json({ message: `Événement public créé et ${parents.length} parents notifiés.` });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Erreur lors de la création de l\'événement public:', error);

            if (error.code === 'ER_NO_SUCH_TABLE') {
                return res.status(500).json({
                    message: "Une ou plusieurs tables de base de données ('notifications', 'user_notifications') sont manquantes. Veuillez les créer.",
                    error: error.message
                });
            }
            res.status(500).json({ message: 'Erreur serveur lors de la création de l\'événement.' });
        } finally {
            if (connection) connection.release();
        }
    },

    createClassEvent: async(req, res) => {
        const { title, message, event_date, class_id } = req.body;
        const sender_id = req.user.id;

        if (!title || !message || !event_date || !class_id) {
            return res.status(400).json({ message: 'Tous les champs sont requis.' });
        }

        let connection;
        let parentPhones = [];
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1. Insert the notification
            const [notificationResult] = await connection.query(
                'INSERT INTO notifications (title, message, event_date, type, class_id, sender_id) VALUES (?, ?, ?, ?, ?, ?)', [title, message, event_date, 'class', class_id, sender_id]
            );
            const notificationId = notificationResult.insertId;

            // 2. Get all parent user IDs for students in that class
            const [parents] = await connection.query(`
                SELECT DISTINCT u.id 
                FROM users u 
                JOIN students s ON u.email = s.parent_email
                JOIN enrollments e ON s.id = e.student_id
                WHERE e.class_id = ? 
                AND e.status = 'active'
                AND u.role = 'parent'
                AND s.parent_email IS NOT NULL 
                AND s.parent_email != ''
            `, [class_id]);

            const [parentPhoneRows] = await connection.query(`
                SELECT DISTINCT s.parent_phone
                FROM students s
                JOIN enrollments e ON s.id = e.student_id
                WHERE e.class_id = ?
                AND e.status = 'active'
                AND s.parent_phone IS NOT NULL
                AND s.parent_phone != ''
            `, [class_id]);
            parentPhones = parentPhoneRows.map(row => row.parent_phone);

            if (parents.length === 0) {
                await connection.commit();

                if (parentPhones.length > 0) {
                    try {
                        const smsResult = await sendEventNotificationSMS(parentPhones, {
                            title,
                            message,
                            eventDate: normalizeEventDateForSMS(event_date)
                        });
                        console.log('[SMS][class] Résultat envoi (fallback):', smsResult);
                    } catch (smsError) {
                        console.error('Erreur lors de l\'envoi des SMS pour l\'événement de classe (sans comptes parents):', smsError);
                    }
                }

                return res.status(200).json({ message: 'Événement créé, mais aucun parent trouvé dans cette classe.' });
            }

            // 3. Create user_notifications for all parents
            const userNotificationValues = parents.map(parent => [parent.id, notificationId]);

            await connection.query(
                'INSERT INTO user_notifications (user_id, notification_id) VALUES ?', [userNotificationValues]
            );

            await connection.commit();

            if (parentPhones.length > 0) {
                try {
                    const smsResult = await sendEventNotificationSMS(parentPhones, {
                        title,
                        message,
                        eventDate: normalizeEventDateForSMS(event_date)
                    });
                    console.log('[SMS][class] Résultat envoi:', smsResult);
                } catch (smsError) {
                    console.error('Erreur lors de l\'envoi des SMS pour l\'événement de classe:', smsError);
                }
            }

            res.status(201).json({ message: `Événement pour la classe créé et ${parents.length} parents notifiés.` });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Erreur lors de la création de l\'événement de classe:', error);
            res.status(500).json({ message: 'Erreur serveur lors de la création de l\'événement.' });
        } finally {
            if (connection) connection.release();
        }
    },

    createPrivateEvent: async(req, res) => {
        const { title, message, event_date, recipient_user_id } = req.body;
        const sender_id = req.user.id;

        if (!title || !message || !recipient_user_id) {
            return res.status(400).json({ message: 'Le titre, le message et le destinataire sont requis.' });
        }

        let connection;
        let recipientPhones = [];
        let recipientUser;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [recipientRows] = await connection.query('SELECT id, email, role, contact FROM users WHERE id = ?', [recipient_user_id]);
            if (recipientRows.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Destinataire introuvable.' });
            }
            [recipientUser] = recipientRows;

            // 1. Insert the notification
            const [notificationResult] = await connection.query(
                'INSERT INTO notifications (title, message, event_date, type, sender_id) VALUES (?, ?, ?, ?, ?)', [title, message, event_date || null, 'private', sender_id]
            );
            const notificationId = notificationResult.insertId;

            // 2. Crée la notification pour le destinataire principal
            await connection.query(
                'INSERT INTO user_notifications (user_id, notification_id) VALUES (?, ?)', [recipient_user_id, notificationId]
            );

            // 3. Si le destinataire est un élève, notifie aussi le parent
            const [
                [student]
            ] = await connection.query('SELECT parent_email, parent_phone FROM students WHERE user_id = ?', [recipient_user_id]);
            if (student) {
                if (student.parent_phone) {
                    recipientPhones.push(student.parent_phone);
                }
                if (student.parent_email) {
                    const [
                        [parentUser]
                    ] = await connection.query('SELECT id, email FROM users WHERE email = ?', [student.parent_email]);
                    if (parentUser && parentUser.id) {
                        await connection.query(
                            'INSERT INTO user_notifications (user_id, notification_id) VALUES (?, ?)', [parentUser.id, notificationId]
                        );
                    }
                    const [parentPhoneRows] = await connection.query(`SELECT DISTINCT parent_phone FROM students WHERE parent_email = ? AND parent_phone IS NOT NULL AND parent_phone != ''`, [student.parent_email]);
                    recipientPhones.push(...parentPhoneRows.map(row => row.parent_phone));
                }
            } else if (recipientUser.role === 'parent' && recipientUser.email) {
                const [parentPhoneRows] = await connection.query(`SELECT DISTINCT parent_phone FROM students WHERE parent_email = ? AND parent_phone IS NOT NULL AND parent_phone != ''`, [recipientUser.email]);
                recipientPhones.push(...parentPhoneRows.map(row => row.parent_phone));
            }

            await connection.commit();

            const uniquePhones = Array.from(new Set(recipientPhones.filter(Boolean)));
            if (uniquePhones.length > 0) {
                try {
                    const smsResult = await sendEventNotificationSMS(uniquePhones, {
                        title,
                        message,
                        eventDate: normalizeEventDateForSMS(event_date)
                    });
                    console.log('[SMS][private] Résultat envoi:', smsResult);
                } catch (smsError) {
                    console.error('Erreur lors de l\'envoi des SMS pour l\'événement privé:', smsError);
                }
            }

            res.status(201).json({ message: 'Message privé envoyé avec succès.' });

        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Erreur lors de la création de l\'événement privé:', error);
            res.status(500).json({ message: 'Erreur serveur lors de la création de l\'événement privé.' });
        } finally {
            if (connection) connection.release();
        }
    },

    getNotificationsForUser: async(req, res) => {
        const userId = req.user.id;
        const userRole = req.user.role;
        const userEmail = req.user.email;
        console.log('[getNotificationsForUser] userId:', userId, '| email:', userEmail, '| role:', userRole);
        try {
            // Vérification explicite côté backend
            const [
                [user]
            ] = await pool.query('SELECT id, email, role FROM users WHERE id = ?', [userId]);
            if (!user) {
                console.error('[getNotificationsForUser] Utilisateur non trouvé en base pour id:', userId);
                return res.status(400).json({ message: "Utilisateur non trouvé en base pour cet ID." });
            }
            if (user.role !== 'parent') {
                console.error('[getNotificationsForUser] Utilisateur n\'est pas un parent. Rôle:', user.role);
                return res.status(400).json({ message: "L'utilisateur n'est pas un parent." });
            }
            let notifications = [];
            if (userRole === 'parent') {
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
                // Trier par date de création décroissante et limiter à 10
                notifications = notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
                console.log('[NOTIF][parent] Notifications finales renvoyées:', notifications.map(n => ({ id: n.id, type: n.type, title: n.title })));
                res.json(notifications);
            } else {
                // Comportement par défaut pour les autres rôles
                const [notifs] = await pool.query(`
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
                ORDER BY n.created_at DESC
                LIMIT 10
            `, [userId]);
                res.json(notifs);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des notifications:', error);
            res.status(500).json({ message: 'Erreur serveur lors de la récupération des notifications.' });
        }
    },

    markNotificationAsRead: async(req, res) => {
        const userId = req.user.id;
        const notificationId = req.params.notification_id;
        try {
            await pool.query(
                'UPDATE user_notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND notification_id = ? AND is_read = 0', [userId, notificationId]
            );
            res.status(200).json({ message: 'Notification marquée comme lue.' });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la notification:', error);
            res.status(500).json({ message: 'Erreur serveur.' });
        }
    },

    markAllNotificationsAsRead: async(req, res) => {
        const userId = req.user.id;
        try {
            await pool.query(
                'UPDATE user_notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0', [userId]
            );
            res.status(200).json({ message: 'Toutes les notifications ont été marquées comme lues.' });
        } catch (error) {
            console.error('Erreur lors de la mise à jour des notifications:', error);
            res.status(500).json({ message: 'Erreur serveur.' });
        }
    },

    // Récupérer toutes les notifications/événements pour une année scolaire donnée
    getAllNotifications: async(req, res) => {
        try {
            const { school_year } = req.query;
            let query = `SELECT * FROM notifications`;
            const params = [];
            if (school_year) {
                // On considère qu'une année scolaire va du 1er août de l'année N au 31 juillet de l'année N+1
                const [startYear, endYear] = school_year.split('-');
                const startDate = `${startYear}-08-01`;
                const endDate = `${endYear}-07-31`;
                query += ' WHERE (event_date BETWEEN ? AND ? OR (event_date IS NULL AND created_at BETWEEN ? AND ?))';
                params.push(startDate, endDate, startDate, endDate);
            }
            const [notifs] = await pool.query(query, params);
            res.json(notifs);
        } catch (error) {
            console.error('Erreur lors de la récupération des notifications:', error);
            res.status(500).json({ message: 'Erreur serveur lors de la récupération des notifications.' });
        }
    }
};

module.exports = eventController;