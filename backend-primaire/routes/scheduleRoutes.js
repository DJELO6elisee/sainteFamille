const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const { auth, checkRole } = require('../middleware/auth');
const pool = require('../config/database');

// Routes principales pour les emplois du temps
router.get('/', scheduleController.getAllSchedules);
router.get('/class/:classId', scheduleController.getClassSchedule);
router.get('/teacher/:teacherId', scheduleController.getTeacherSchedule);

// Routes pour la gestion des emplois du temps
router.post('/', scheduleController.createSchedule);
router.put('/:id', scheduleController.updateSchedule);
router.delete('/:id', scheduleController.deleteSchedule);

// Route pour créer un emploi du temps hebdomadaire
router.post('/create-weekly', auth, checkRole(['teacher', 'admin', 'secretary', 'directrice', 'informaticien']), scheduleController.createWeeklySchedule);

// Route pour publier l'emploi du temps hebdomadaire pour les parents
router.post('/publish-weekly', auth, checkRole(['teacher', 'admin', 'secretary', 'directrice', 'informaticien']), scheduleController.publishWeeklySchedule);

// Route pour modifier un emploi du temps hebdomadaire
router.put('/update-weekly/:id', auth, checkRole(['teacher', 'admin', 'secretary', 'directrice', 'informaticien']), async(req, res) => {
    try {
        const { id } = req.params;
        const { teacher_id, class_id, subject_id, start_date, end_date, course_description, school_year } = req.body;

        // Vérifier que l'emploi du temps existe et appartient au professeur
        const [existingSchedule] = await pool.query(
            'SELECT * FROM schedules WHERE id = ? AND teacher_id = ? AND is_weekly_schedule = 1', [id, teacher_id]
        );

        if (existingSchedule.length === 0) {
            return res.status(404).json({ message: 'Emploi du temps non trouvé ou non autorisé' });
        }

        // Mettre à jour l'emploi du temps
        await pool.query(
            `UPDATE schedules 
       SET class_id = ?, subject_id = ?, start_date = ?, end_date = ?, course_description = ?, school_year = ?
       WHERE id = ?`, [class_id, subject_id, start_date, end_date, course_description, school_year, id]
        );

        // Récupérer l'emploi du temps mis à jour
        const [updatedSchedule] = await pool.query(
            `SELECT s.*, c.name as class_name, sub.name as subject_name, 
              CONCAT(t.first_name, ' ', t.last_name) as teacher_name
       FROM schedules s
       JOIN classes c ON s.class_id = c.id
       JOIN subjects sub ON s.subject_id = sub.id
       JOIN teachers t ON s.teacher_id = t.id
       WHERE s.id = ?`, [id]
        );

        res.json(updatedSchedule[0]);
    } catch (error) {
        console.error('Erreur lors de la modification de l\'emploi du temps:', error);
        res.status(500).json({ message: 'Erreur lors de la modification de l\'emploi du temps' });
    }
});

// Route pour supprimer un emploi du temps hebdomadaire
router.delete('/delete-weekly/:id', auth, checkRole(['teacher', 'admin', 'secretary', 'directrice', 'informaticien']), async(req, res) => {
    try {
        const { id } = req.params;
        const teacher_id = req.user.id;

        // Vérifier que l'emploi du temps existe et appartient au professeur
        const [existingSchedule] = await pool.query(
            'SELECT * FROM schedules WHERE id = ? AND teacher_id = ? AND is_weekly_schedule = 1', [id, teacher_id]
        );

        if (existingSchedule.length === 0) {
            return res.status(404).json({ message: 'Emploi du temps non trouvé ou non autorisé' });
        }

        // Supprimer l'emploi du temps
        await pool.query('DELETE FROM schedules WHERE id = ?', [id]);

        res.json({ message: 'Emploi du temps supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'emploi du temps:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression de l\'emploi du temps' });
    }
});

// Route pour récupérer l'emploi du temps hebdomadaire d'une classe spécifique
router.get('/weekly-schedule/:classId', auth, checkRole(['teacher', 'admin', 'secretary', 'directrice', 'informaticien']), async(req, res) => {
    try {
        const { classId } = req.params;
        const { school_year } = req.query;
        const teacher_id = req.user.id;

        // Récupérer l'ID du professeur depuis la table teachers
        const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [teacher_id]);
        if (teacherRows.length === 0) {
            return res.status(404).json({ message: 'Professeur non trouvé' });
        }
        const actualTeacherId = teacherRows[0].id;

        console.log(`[weekly-schedule] Recherche pour teacher_id=${actualTeacherId}, class_id=${classId}, school_year=${school_year}`);

        // Vérifier d'abord si des emplois du temps hebdomadaires existent pour cette classe
        const [checkWeekly] = await pool.query(
            `SELECT COUNT(*) as count FROM schedules 
             WHERE teacher_id = ? AND class_id = ? AND is_weekly_schedule = 1 AND school_year = ?`, [actualTeacherId, classId, school_year]
        );
        console.log(`[weekly-schedule] Nombre d'emplois hebdomadaires trouvés: ${checkWeekly[0].count}`);

        // ROUTE ENSEIGNANTS : Récupérer TOUS les emplois du temps hebdomadaires (pas filtrés par semaine)
        // Les enseignants ont besoin de voir tous leurs emplois du temps pour les gérer
        // Les parents voient seulement la semaine en cours via /students/:id/weekly-schedule
        const query = `
            SELECT
                s.id, s.day_of_week, s.start_time, s.end_time,
                s.start_date, s.end_date, s.course_description,
                s.title, s.domain, s.subject_id, s.is_published,
                c.name as class_name, 
                s.is_weekly_schedule
            FROM schedules s
            JOIN classes c ON s.class_id = c.id
            WHERE s.teacher_id = ? 
            AND s.class_id = ? 
            AND s.is_weekly_schedule = 1 
            AND s.school_year = ?
            ORDER BY s.day_of_week, s.start_time
        `;

        console.log(`[weekly-schedule] Requête SQL:`, query);
        console.log(`[weekly-schedule] Paramètres:`, [actualTeacherId, classId, school_year]);

        const [schedules] = await pool.query(query, [actualTeacherId, classId, school_year]);

        console.log(`[weekly-schedule] Résultats trouvés: ${schedules.length}`, schedules);
        res.json(schedules);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'emploi du temps hebdomadaire:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'emploi du temps' });
    }
});

// Route pour publier l'emploi du temps hebdomadaire
router.post('/publish-weekly-schedule', auth, checkRole(['teacher', 'admin', 'secretary', 'directrice', 'informaticien']), async(req, res) => {
    try {
        const { teacher_id, class_id, school_year, week_start_date, week_end_date, schedule_ids } = req.body;

        console.log(`[publish-weekly-schedule] Publication pour teacher_id=${teacher_id}, class_id=${class_id}, school_year=${school_year}`);
        console.log(`[publish-weekly-schedule] Semaine: ${week_start_date} au ${week_end_date}`);

        // Publier seulement les emplois du temps hebdomadaires de la semaine spécifiée
        // Utiliser les dates exactes stockées dans la base de données
        console.log(`[publish-weekly-schedule] Recherche avec: teacher_id=${teacher_id}, class_id=${class_id}, school_year=${school_year}`);
        console.log(`[publish-weekly-schedule] Dates: week_start_date=${week_start_date}, week_end_date=${week_end_date}`);

        // Si des IDs spécifiques sont fournis, les utiliser directement
        let schedulesToPublish = [];

        if (schedule_ids && schedule_ids.length > 0) {
            console.log(`[publish-weekly-schedule] Utilisation des IDs fournis: ${schedule_ids.join(', ')}`);

            // Récupérer les emplois par leurs IDs
            const [matchingSchedules] = await pool.query(`
                SELECT id, start_date, end_date, is_published
                FROM schedules 
                WHERE id IN (${schedule_ids.map(() => '?').join(',')})
                AND teacher_id = ? 
                AND class_id = ? 
                AND school_year = ? 
                AND is_weekly_schedule = 1 
                AND is_published = 0
            `, [...schedule_ids, teacher_id, class_id, school_year]);

            schedulesToPublish = matchingSchedules;
            console.log(`[publish-weekly-schedule] ${schedulesToPublish.length} emplois trouvés par IDs`);
        } else {
            // Ancienne logique de filtrage par date (fallback)
            console.log(`[publish-weekly-schedule] Aucun ID fourni, utilisation du filtrage par date`);

            const [matchingSchedules] = await pool.query(`
                SELECT id, start_date, end_date, is_published
                FROM schedules 
                WHERE teacher_id = ? 
                AND class_id = ? 
                AND school_year = ? 
                AND is_weekly_schedule = 1 
                AND is_published = 0
            `, [teacher_id, class_id, school_year]);

            console.log(`[publish-weekly-schedule] ${matchingSchedules.length} emplois trouvés avant filtrage par date`);

            // Filtrer par date côté application
            schedulesToPublish = matchingSchedules.filter(schedule => {
                const startDateObj = new Date(schedule.start_date);
                const endDateObj = new Date(schedule.end_date);

                // Convertir en format YYYY-MM-DD (en heure locale)
                const startDateStr = `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, '0')}-${String(startDateObj.getDate()).padStart(2, '0')}`;
                const endDateStr = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

                console.log(`[publish-weekly-schedule] Comparaison: ${startDateStr} >= ${week_start_date} && ${endDateStr} <= ${week_end_date}`);

                // Vérifier si l'activité appartient à la semaine sélectionnée
                return startDateStr >= week_start_date && endDateStr <= week_end_date;
            });
        }

        console.log(`[publish-weekly-schedule] ${schedulesToPublish.length} emplois à publier après filtrage`);

        // Publier les emplois filtrés
        let result = { affectedRows: 0 };
        if (schedulesToPublish.length > 0) {
            const scheduleIds = schedulesToPublish.map(s => s.id);
            [result] = await pool.query(`
                UPDATE schedules 
                SET is_published = 1 
                WHERE id IN (${scheduleIds.map(() => '?').join(',')})
            `, scheduleIds);
        }

        console.log(`[publish-weekly-schedule] ${result.affectedRows} emplois publiés`);

        // Créer des notifications pour les parents
        const [studentsResult] = await pool.query(`
            SELECT DISTINCT s.id as student_id 
            FROM students s 
            JOIN enrollments e ON s.id = e.student_id 
            WHERE e.class_id = ? AND (e.school_year = ? OR e.school_year = ?)
        `, [class_id, school_year, school_year.split('-')[1]]);

        // Créer une notification pour chaque parent
        const notificationPromises = studentsResult.map(async(student) => {
            return pool.query(
                'INSERT INTO notifications (title, message, type, student_id, class_id, sender_id) VALUES (?, ?, ?, ?, ?, ?)', [
                    'Nouvel emploi du temps hebdomadaire',
                    'L\'emploi du temps hebdomadaire a été publié par votre enseignant.',
                    'private',
                    student.student_id,
                    class_id,
                    teacher_id
                ]
            );
        });

        await Promise.all(notificationPromises);

        res.json({
            message: "Emploi du temps hebdomadaire publié avec succès !",
            publishedCount: result.affectedRows,
            notificationsSent: studentsResult.length
        });
    } catch (error) {
        console.error('Erreur lors de la publication de l\'emploi du temps hebdomadaire:', error);
        res.status(500).json({ message: 'Erreur lors de la publication' });
    }
});

// Route pour nettoyer les doublons dans les emplois du temps hebdomadaires
router.post('/clean-duplicates', auth, checkRole(['admin', 'informaticien']), async(req, res) => {
    try {
        console.log('Nettoyage des doublons dans les emplois du temps hebdomadaires...');

        // Supprimer les doublons en gardant seulement la première occurrence
        const [result] = await pool.query(`
            DELETE s1 FROM schedules s1
            INNER JOIN schedules s2 
            WHERE s1.id > s2.id 
            AND s1.class_id = s2.class_id 
            AND s1.subject_id = s2.subject_id 
            AND s1.teacher_id = s2.teacher_id 
            AND s1.day_of_week = s2.day_of_week 
            AND s1.start_time = s2.start_time 
            AND s1.end_time = s2.end_time 
            AND s1.is_weekly_schedule = 1 
            AND s2.is_weekly_schedule = 1
        `);

        console.log(`Doublons supprimés: ${result.affectedRows}`);
        res.json({
            message: `Nettoyage terminé. ${result.affectedRows} doublons supprimés.`
        });
    } catch (error) {
        console.error('Erreur lors du nettoyage des doublons:', error);
        res.status(500).json({ message: 'Erreur lors du nettoyage des doublons' });
    }
});

// Route pour nettoyer automatiquement les emplois du temps hebdomadaires expirés
router.post('/cleanup-expired', auth, checkRole(['admin', 'secretary', 'informaticien']), scheduleController.cleanupExpiredWeeklySchedules);

// Route pour obtenir les statistiques des emplois du temps expirés
router.get('/expired-stats', auth, checkRole(['admin', 'secretary', 'informaticien']), scheduleController.getExpiredSchedulesStats);

module.exports = router;