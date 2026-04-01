const pool = require('../config/database');

const scheduleController = {
        // Obtenir tous les emplois du temps
        getAllSchedules: async(req, res) => {
            try {
                const [schedules] = await pool.query(`
                SELECT 
                    s.id, s.day_of_week, s.start_time, s.end_time,
                    cl.name as class_name,
                    sub.name as subject_name, 
                    t.first_name as teacher_first_name, 
                    t.last_name as teacher_last_name
                FROM schedules s
                JOIN classes cl ON s.class_id = cl.id
                JOIN subjects sub ON s.subject_id = sub.id
                JOIN teachers t ON s.teacher_id = t.id
                ORDER BY s.day_of_week, s.start_time
            `);
                res.json(schedules);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Erreur lors de la récupération des emplois du temps." });
            }
        },

        // Obtenir l'emploi du temps d'une classe
        getClassSchedule: async(req, res) => {
            try {
                const schoolYear = req.query.school_year || '2024-2025';
                const [schedules] = await pool.query(`
                SELECT 
                    s.id, s.day_of_week, s.start_time, s.end_time,
                    s.subject_id, s.teacher_id,
                    COALESCE(sub.name, 'Sans matière') as subject_name, 
                    t.first_name as teacher_first_name, 
                    t.last_name as teacher_last_name,
                    s.school_year
                FROM schedules s
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                JOIN teachers t ON s.teacher_id = t.id
                WHERE s.class_id = ? AND s.school_year = ?
                ORDER BY s.day_of_week, s.start_time
            `, [req.params.classId, schoolYear]);
                res.json(schedules);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Erreur lors de la récupération de l'emploi du temps." });
            }
        },

        // Obtenir l'emploi du temps d'un enseignant
        getTeacherSchedule: async(req, res) => {
            try {
                const [schedules] = await pool.query(`
                SELECT 
                    s.id, s.day_of_week, s.start_time, s.end_time,
                    cl.name as class_name,
                    COALESCE(sub.name, 'Sans matière') as subject_name
                FROM schedules s
                JOIN classes cl ON s.class_id = cl.id
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                WHERE s.teacher_id = ? 
                AND (s.is_weekly_schedule = 0 OR s.is_weekly_schedule IS NULL)
                ORDER BY s.day_of_week, s.start_time
            `, [req.params.teacherId]);
                res.json(schedules);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Erreur lors de la récupération de l'emploi du temps de l'enseignant." });
            }
        },

        // Créer une nouvelle entrée dans l'emploi du temps
        createSchedule: async(req, res) => {
            const { class_id, subject_id, teacher_id, day_of_week, start_time, end_time, school_year, coefficient } = req.body;

            console.log('--- CREATE SCHEDULE REQUEST BODY ---');
            console.log(req.body);
            console.log('------------------------------------');

            try {
                // Vérifier les conflits d'horaire uniquement si le professeur est dans une AUTRE classe
                // Permettre plusieurs cours dans la même classe avec différentes matières
                const [conflicts] = await pool.query(`
                SELECT 
                    (SELECT COUNT(*) FROM schedules 
                     WHERE teacher_id = ? 
                     AND day_of_week = ? 
                     AND start_time < ? 
                     AND end_time > ?
                     AND class_id != ?) as teacher_conflict
            `, [
                    teacher_id, day_of_week, end_time, start_time, class_id
                ]);

                const { teacher_conflict } = conflicts[0];

                if (teacher_conflict > 0) return res.status(409).json({ message: "Conflit d'horaire : Le professeur est déjà occupé dans une autre classe sur ce créneau." });

                // Insérer la nouvelle entrée
                const [result] = await pool.query(
                    'INSERT INTO schedules (class_id, subject_id, teacher_id, day_of_week, start_time, end_time, school_year) VALUES (?, ?, ?, ?, ?, ?, ?)', [class_id, subject_id, teacher_id, day_of_week, start_time, end_time, school_year || '2024-2025']
                );

                // Vérifier/ajouter l'association matière-classe dans class_subjects seulement si subject_id n'est pas null
                if (subject_id !== null && subject_id !== undefined) {
                    const [existing] = await pool.query(
                        'SELECT * FROM class_subjects WHERE class_id = ? AND subject_id = ?', [class_id, subject_id]
                    );
                    if (existing.length === 0) {
                        await pool.query(
                            'INSERT INTO class_subjects (class_id, subject_id, coefficient) VALUES (?, ?, ?)', [class_id, subject_id, coefficient || 1]
                        );
                    }
                }

                res.status(201).json({ id: result.insertId, message: 'Cours ajouté avec succès à l\'emploi du temps.' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Erreur lors de la création de l'entrée dans l'emploi du temps." });
            }
        },

        // Mettre à jour une entrée de l'emploi du temps
        updateSchedule: async(req, res) => {
            const { class_id, subject_id, teacher_id, day_of_week, start_time, end_time, school_year, coefficient } = req.body;
            const { id } = req.params;

            console.log(`--- UPDATE SCHEDULE REQUEST BODY (ID: ${id}) ---`);
            console.log(req.body);
            console.log('-------------------------------------------');

            try {
                // Vérification des conflits, en excluant l'entrée actuelle
                // Permettre plusieurs cours dans la même classe avec différentes matières
                // Empêcher seulement les conflits dans d'autres classes
                const [conflicts] = await pool.query(`
                 SELECT 
                    (SELECT COUNT(*) FROM schedules 
                     WHERE id != ? 
                     AND teacher_id = ? 
                     AND day_of_week = ? 
                     AND start_time < ? 
                     AND end_time > ?
                     AND class_id != ?) as teacher_conflict
            `, [
                    id, teacher_id, day_of_week, end_time, start_time, class_id
                ]);

                const { teacher_conflict } = conflicts[0];

                if (teacher_conflict > 0) return res.status(409).json({ message: "Conflit d'horaire : Le professeur est déjà occupé dans une autre classe sur ce créneau." });

                // Mettre à jour l'entrée
                await pool.query(
                    'UPDATE schedules SET class_id = ?, subject_id = ?, teacher_id = ?, day_of_week = ?, start_time = ?, end_time = ?, school_year = ? WHERE id = ?', [class_id, subject_id, teacher_id, day_of_week, start_time, end_time, school_year || '2024-2025', id]
                );
                // Mettre à jour le coefficient si fourni et si subject_id n'est pas null
                if (coefficient !== undefined && subject_id !== null && subject_id !== undefined) {
                    await pool.query(
                        'UPDATE class_subjects SET coefficient = ? WHERE class_id = ? AND subject_id = ?', [coefficient, class_id, subject_id]
                    );
                }
                res.json({ message: 'Emploi du temps mis à jour avec succès.' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Erreur lors de la mise à jour de l'emploi du temps." });
            }
        },

        // Supprimer une entrée de l'emploi du temps
        deleteSchedule: async(req, res) => {
            try {
                await pool.query('DELETE FROM schedules WHERE id = ?', [req.params.id]);
                res.json({ message: 'Cours supprimé avec succès de l\'emploi du temps.' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Erreur lors de la suppression de l'entrée." });
            }
        },

        createWeeklySchedule: async(req, res) => {
            console.log('[createWeeklySchedule] Appel reçu avec body:', req.body);
            try {
                const { teacher_id, class_id, subject_id, start_date, end_date, course_description, school_year, day_of_week, domain, is_weekly_schedule, is_published, title } = req.body;

                console.log('[createWeeklySchedule] Données extraites:', {
                    teacher_id,
                    class_id,
                    subject_id,
                    start_date,
                    end_date,
                    course_description,
                    school_year,
                    day_of_week,
                    domain,
                    is_weekly_schedule,
                    is_published,
                    title
                });

                // Vérifier que tous les champs requis sont présents
                if (!teacher_id || !class_id || !start_date || !end_date || !course_description || !school_year || !day_of_week) {
                    console.log('[createWeeklySchedule] Champs manquants détectés');
                    return res.status(400).json({
                        message: "Tous les champs sont requis: teacher_id, class_id, start_date, end_date, course_description, school_year, day_of_week"
                    });
                }

                console.log('[createWeeklySchedule] Vérification d\'activité existante...');

                // Heures par défaut (8h-9h)
                const startTime = '08:00:00';
                const endTime = '09:00:00';

                // Créer une nouvelle activité (sans vérification de remplacement)
                console.log('[createWeeklySchedule] Création d\'une nouvelle activité...');

                const [result] = await pool.query(
                    'INSERT INTO schedules (teacher_id, class_id, subject_id, day_of_week, start_time, end_time, school_year, is_weekly_schedule, start_date, end_date, course_description, title, domain, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [teacher_id, class_id, subject_id, day_of_week, startTime, endTime, school_year, is_weekly_schedule || 1, start_date, end_date, course_description, title || null, domain, is_published || 0]
                );

                console.log('[createWeeklySchedule] Nouvelle activité créée avec succès, résultat:', result);

                res.status(201).json({
                    message: "Activité créée avec succès ! (Non publiée)",
                    createdEntry: result.insertId,
                    period: `${start_date} au ${end_date}`,
                    dayOfWeek: day_of_week,
                    courseDescription: course_description,
                    domain: domain,
                    action: 'created'
                });
            } catch (error) {
                console.error('[createWeeklySchedule] Erreur détaillée:', error);
                console.error('[createWeeklySchedule] Stack trace:', error.stack);
                res.status(500).json({
                    message: error.message,
                    details: error.sqlMessage || error.code || 'Erreur inconnue'
                });
            }
        },

        // Publier l'emploi du temps hebdomadaire pour les parents
        publishWeeklySchedule: async(req, res) => {
                console.log('[publishWeeklySchedule] Appel reçu avec body:', req.body);
                try {
                    const { teacher_id, class_name, schedule_data, school_year } = req.body;

                    console.log('[publishWeeklySchedule] Données extraites:', {
                        teacher_id,
                        class_name,
                        schedule_data: schedule_data.length,
                        school_year
                    });

                    // Vérifier que tous les champs requis sont présents
                    if (!teacher_id || !class_name || !schedule_data || !school_year) {
                        console.log('[publishWeeklySchedule] Champs manquants détectés');
                        return res.status(400).json({
                            message: "Tous les champs sont requis: teacher_id, class_name, schedule_data, school_year"
                        });
                    }

                    // Récupérer l'ID de la classe
                    console.log(`[publishWeeklySchedule] Recherche de la classe "${class_name}" avec school_year="${school_year}"`);
                    console.log(`[publishWeeklySchedule] Format court de l'année: "${school_year.split('-')[1]}"`);

                    const [classResult] = await pool.query(
                        'SELECT id FROM classes WHERE name = ? AND (academic_year = ? OR academic_year = ?)', [class_name, school_year, school_year.split('-')[1]]
                    );

                    console.log(`[publishWeeklySchedule] Résultat de la recherche de classe:`, classResult);

                    if (classResult.length === 0) {
                        // Essayer de trouver toutes les classes avec ce nom pour diagnostiquer
                        const [allClassesWithName] = await pool.query(
                            'SELECT id, name, academic_year FROM classes WHERE name = ?', [class_name]
                        );
                        console.log(`[publishWeeklySchedule] Toutes les classes avec le nom "${class_name}":`, allClassesWithName);

                        return res.status(404).json({
                                    message: `Classe "${class_name}" non trouvée pour l'année scolaire ${school_year}. Classes disponibles: ${allClassesWithName.map(c => `${c.name} (${c.academic_year})`).join(', ')}`
                });
            }

            const classId = classResult[0].id;

            // Créer une notification pour tous les parents de cette classe
            const [studentsResult] = await pool.query(
                'SELECT DISTINCT s.id as student_id FROM students s JOIN enrollments e ON s.id = e.student_id WHERE e.class_id = ? AND (e.school_year = ? OR e.school_year = ?)',
                [classId, school_year, school_year.split('-')[1]]
            );
            
            console.log(`[publishWeeklySchedule] ${studentsResult.length} élèves trouvés pour la classe ${class_name}`);

            // Créer une notification pour chaque parent
            const notificationPromises = studentsResult.map(async (student) => {
                return pool.query(
                    'INSERT INTO notifications (title, message, type, student_id, class_id, sender_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        `Nouvel emploi du temps - ${class_name}`,
                        `L'emploi du temps hebdomadaire de la classe ${class_name} a été mis à jour par votre enseignant.`,
                        'private',
                        student.student_id, // Utiliser student_id au lieu de recipient_id
                        classId,
                        teacher_id
                    ]
                );
            });

            await Promise.all(notificationPromises);

            console.log('[publishWeeklySchedule] Notifications créées avec succès');

            res.status(200).json({
                message: "Emploi du temps publié avec succès !",
                publishedFor: studentsResult.length,
                class: class_name,
                schoolYear: school_year
            });

        } catch (error) {
            console.error('[publishWeeklySchedule] Erreur détaillée:', error);
            console.error('[publishWeeklySchedule] Stack trace:', error.stack);
            res.status(500).json({
                message: error.message,
                details: error.sqlMessage || error.code || 'Erreur inconnue'
            });
        }
    },

    // Nettoyer automatiquement les emplois du temps hebdomadaires expirés
    cleanupExpiredWeeklySchedules: async(req, res) => {
        console.log('[cleanupExpiredWeeklySchedules] Début du nettoyage des emplois du temps expirés');
        try {
            const currentDate = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
            
            // Supprimer les emplois du temps hebdomadaires dont la date de fin est dépassée
            const [result] = await pool.query(
                `DELETE FROM schedules 
                 WHERE is_weekly_schedule = 1 
                 AND end_date < ? 
                 AND end_date IS NOT NULL`,
                [currentDate]
            );

            console.log(`[cleanupExpiredWeeklySchedules] ${result.affectedRows} emplois du temps hebdomadaires expirés supprimés`);

            res.json({
                message: `Nettoyage terminé. ${result.affectedRows} emplois du temps hebdomadaires expirés supprimés.`,
                deletedCount: result.affectedRows,
                currentDate: currentDate
            });
        } catch (error) {
            console.error('[cleanupExpiredWeeklySchedules] Erreur:', error);
            res.status(500).json({
                message: "Erreur lors du nettoyage des emplois du temps expirés.",
                error: error.message
            });
        }
    },

    // Fonction pour obtenir les statistiques des emplois du temps expirés
    getExpiredSchedulesStats: async(req, res) => {
        try {
            const currentDate = new Date().toISOString().split('T')[0];
            
            // Compter les emplois du temps hebdomadaires expirés
            const [expiredCount] = await pool.query(
                `SELECT COUNT(*) as count 
                 FROM schedules 
                 WHERE is_weekly_schedule = 1 
                 AND end_date < ? 
                 AND end_date IS NOT NULL`,
                [currentDate]
            );

            // Compter tous les emplois du temps hebdomadaires
            const [totalCount] = await pool.query(
                `SELECT COUNT(*) as count 
                 FROM schedules 
                 WHERE is_weekly_schedule = 1`
            );

            res.json({
                expiredCount: expiredCount[0].count,
                totalWeeklySchedules: totalCount[0].count,
                currentDate: currentDate
            });
        } catch (error) {
            console.error('[getExpiredSchedulesStats] Erreur:', error);
            res.status(500).json({
                message: "Erreur lors de la récupération des statistiques.",
                error: error.message
            });
        }
    },
};

module.exports = scheduleController;