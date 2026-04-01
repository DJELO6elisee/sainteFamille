const pool = require('../config/database');

const absenceController = {
    // Obtenir toutes les absences avec tous les détails, avec filtres optionnels
    getAllAbsences: async(req, res) => {
        try {
            const { class_id, subject_id, student_id, school_year, semester } = req.query;

            let query = `
                SELECT 
                    a.id, a.date, a.status, a.duration_hours, a.semester,
                    a.student_id as student_id, s.first_name as student_first_name, s.last_name as student_last_name,
                    c.id as class_id, c.name as class_name,
                    sub.id as subject_id, sub.name as subject_name,
                    t.id as teacher_id, t.first_name as teacher_first_name, t.last_name as teacher_last_name
                FROM absences a
                JOIN students s ON a.student_id = s.id
                JOIN classes c ON a.class_id = c.id
                JOIN subjects sub ON a.subject_id = sub.id
                JOIN teachers t ON a.teacher_id = t.id
            `;
            const params = [];
            const whereClauses = [];

            if (class_id) {
                whereClauses.push('a.class_id = ?');
                params.push(class_id);
            }
            if (subject_id) {
                whereClauses.push('a.subject_id = ?');
                params.push(subject_id);
            }
            if (student_id) {
                whereClauses.push('a.student_id = ?');
                params.push(student_id);
            }
            if (school_year) {
                whereClauses.push('a.school_year = ?');
                params.push(school_year);
            }
            if (semester) {
                whereClauses.push('a.semester = ?');
                params.push(semester);
            }

            if (whereClauses.length > 0) {
                query += ' WHERE ' + whereClauses.join(' AND ');
            }

            query += ' ORDER BY a.date DESC';

            console.log('[getAllAbsences] requête SQL:', query, 'params:', params);

            const [absences] = await pool.query(query, params);
            res.json(absences);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les absences d'un élève spécifique
    getStudentAbsences: async(req, res) => {
        try {
            const { studentId } = req.params;
            const [absences] = await pool.query(`
                SELECT 
                    a.*, 
                    c.name as class_name, 
                    sub.name as subject_name,
                    t.first_name as teacher_first_name, t.last_name as teacher_last_name
                FROM absences a
                JOIN classes c ON a.class_id = c.id
                JOIN subjects sub ON a.subject_id = sub.id
                JOIN teachers t ON a.teacher_id = t.id
                WHERE a.student_id = ?
                ORDER BY a.date DESC
            `, [studentId]);
            res.json(absences);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les absences pour un cours (classe+matière) à une date donnée
    getAbsencesByContext: async(req, res) => {
        const { classId, subjectId, date } = req.params;
        try {
            const [absences] = await pool.query(`
                SELECT * FROM absences 
                WHERE class_id = ? AND subject_id = ? AND date = ?
            `, [classId, subjectId, date]);
            res.json(absences);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Créer une absence (toujours un nouvel enregistrement)
    createAbsence: async(req, res) => {
        const { student_id, class_id, subject_id, teacher_id, date, status, duration_hours, school_year, semester } = req.body;
        if (!student_id || !class_id || !subject_id || !teacher_id || !date) {
            return res.status(400).json({ message: 'Les champs student_id, class_id, subject_id, teacher_id et date sont requis.' });
        }

        try {
            const currentSchoolYear = req.body.school_year || require('../config/schoolYear').getCurrentSchoolYear();

            // Créer une nouvelle absence
            const [result] = await pool.query(
                'INSERT INTO absences (student_id, class_id, subject_id, teacher_id, date, status, duration_hours, school_year, semester) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [student_id, class_id, subject_id, teacher_id, date, status, duration_hours || 1, currentSchoolYear, semester || null]
            );

            console.log('✅ Absence créée avec succès, ID:', result.insertId);

            // Récupérer les infos de l'élève, de la matière et du professeur
            const [
                [student]
            ] = await pool.query('SELECT s.first_name, s.last_name, s.parent_email FROM students s WHERE s.id = ?', [student_id]);
            const [
                [subject]
            ] = await pool.query('SELECT name FROM subjects WHERE id = ?', [subject_id]);
            const [
                [teacher]
            ] = await pool.query('SELECT first_name, last_name FROM teachers WHERE id = ?', [teacher_id]);

            console.log('📋 Informations récupérées:', {
                student: student ? `${student.first_name} ${student.last_name}` : 'Non trouvé',
                parent_email: student ? student.parent_email || 'Non défini' : 'Non défini',
                subject: subject ? subject.name || 'Non trouvé' : 'Non trouvé',
                teacher: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Non trouvé'
            });

            // Créer la notification pour le parent
            if (student && student.parent_email) {
                console.log('🔍 Recherche du parent avec email:', student.parent_email);

                // Récupérer le user_id du parent via son email
                const [
                    [parentUser]
                ] = await pool.query('SELECT id FROM users WHERE email = ?', [student.parent_email]);

                if (parentUser) {
                    console.log('✅ Parent trouvé, user_id:', parentUser.id);

                    const justification = status === 'excused' ? 'justifiée' : 'non justifiée';
                    const notifTitle = `Absence de ${student.first_name} ${student.last_name}`;
                    const notifMessage = `Votre enfant ${student.first_name} ${student.last_name} a été noté absent le ${new Date(date).toLocaleDateString('fr-FR')} pour le cours de ${subject ? subject.name : ''} dispensé par ${teacher ? teacher.first_name + ' ' + teacher.last_name : ''}. Absence ${justification}.`;

                    console.log('📝 Création de la notification:', {
                        title: notifTitle,
                        message: notifMessage
                    });

                    // Créer la notification
                    const [notifResult] = await pool.query(
                        'INSERT INTO notifications (title, message, type, student_id, subject_id, event_date) VALUES (?, ?, ?, ?, ?, NOW())', [notifTitle, notifMessage, 'private', student_id, subject_id]
                    );

                    const notificationId = notifResult.insertId;
                    console.log('✅ Notification créée, ID:', notificationId);

                    // Lier la notification au parent
                    await pool.query(
                        'INSERT INTO user_notifications (user_id, notification_id) VALUES (?, ?)', [parentUser.id, notificationId]
                    );

                    console.log('✅ Notification liée au parent, user_id:', parentUser.id);
                } else {
                    console.log('❌ Parent non trouvé dans la table users avec l\'email:', student.parent_email);
                }
            } else {
                console.log('❌ Pas d\'email parent défini pour l\'élève:', student_id);
            }

            res.status(201).json({
                id: result.insertId,
                message: 'Absence enregistrée avec succès.',
                notification_created: student && student.parent_email ? 'Oui' : 'Non'
            });
        } catch (error) {
            console.error('❌ Erreur lors de la création de l\'absence:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Marquer un élève comme présent (supprime l'enregistrement d'absence)
    setStudentPresent: async(req, res) => {
        const { student_id, class_id, subject_id, teacher_id, date } = req.body;
        if (!student_id || !class_id || !subject_id || !teacher_id || !date) {
            return res.status(400).json({ message: 'Les champs student_id, class_id, subject_id, teacher_id et date sont requis.' });
        }

        try {
            await pool.query(
                'DELETE FROM absences WHERE student_id = ? AND class_id = ? AND subject_id = ? AND teacher_id = ? AND date = ?', [student_id, class_id, subject_id, teacher_id, date]
            );
            res.json({ message: 'Élève marqué comme présent (absence annulée).' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Supprimer une absence par son ID (pour la gestion administrative)
    deleteAbsenceById: async(req, res) => {
        try {
            await pool.query('DELETE FROM absences WHERE id = ?', [req.params.id]);
            res.json({ message: 'Absence supprimée avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les statistiques des absences
    getAbsenceStats: async(req, res) => {
        try {
            const [stats] = await pool.query(`
                SELECT 
                    COUNT(*) as total_absences,
                    COUNT(CASE WHEN justified = 1 THEN 1 END) as justified_absences,
                    COUNT(CASE WHEN justified = 0 THEN 1 END) as unjustified_absences,
                    COUNT(DISTINCT student_id) as total_students_absent
                FROM absences
                WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            `);
            res.json(stats[0]);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = absenceController;