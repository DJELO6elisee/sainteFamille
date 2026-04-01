const pool = require('../config/database');
const { getCurrentSchoolYear } = require('../config/schoolYear');

const teacherAbsenceController = {
    // Lister toutes les absences enseignants (avec filtres optionnels)
    getAll: async(req, res) => {
        try {
            const { teacher_id, date, school_year, status } = req.query;
            let query = `
        SELECT ta.id, ta.teacher_id, t.first_name, t.last_name,
               ta.date, ta.reason, ta.status, ta.duration_hours, ta.school_year,
               ta.class_id, c.name AS class_name,
               ta.subject_id, s.name AS subject_name,
               ta.created_at
        FROM teacher_absences ta
        JOIN teachers t ON ta.teacher_id = t.id
        LEFT JOIN classes c ON ta.class_id = c.id
        LEFT JOIN subjects s ON ta.subject_id = s.id`;
            const where = [];
            const params = [];
            if (teacher_id) { where.push('ta.teacher_id = ?');
                params.push(teacher_id); }
            if (date) { where.push('ta.date = ?');
                params.push(date); }
            if (school_year) { where.push('ta.school_year = ?');
                params.push(school_year); }
            if (status) { where.push('ta.status = ?');
                params.push(status); }
            if (where.length) query += ' WHERE ' + where.join(' AND ');
            query += ' ORDER BY ta.date DESC, ta.created_at DESC';
            const [rows] = await pool.query(query, params);
            res.json(rows);
        } catch (err) {
            console.error('[teacherAbsences.getAll] Error:', err);
            res.status(500).json({ message: 'Erreur lors de la récupération des absences enseignants' });
        }
    },

    // Absences d'un enseignant
    getByTeacher: async(req, res) => {
        try {
            const { id } = req.params;
            const { school_year } = req.query;
            let query = `
        SELECT ta.*, c.name AS class_name, s.name AS subject_name
        FROM teacher_absences ta
        LEFT JOIN classes c ON ta.class_id = c.id
        LEFT JOIN subjects s ON ta.subject_id = s.id
        WHERE ta.teacher_id = ?`;
            const params = [id];
            if (school_year) { query += ' AND ta.school_year = ?';
                params.push(school_year); }
            query += ' ORDER BY ta.date DESC, ta.created_at DESC';
            const [rows] = await pool.query(query, params);
            res.json(rows);
        } catch (err) {
            console.error('[teacherAbsences.getByTeacher] Error:', err);
            res.status(500).json({ message: 'Erreur lors de la récupération des absences de cet enseignant' });
        }
    },

    // Créer une absence pour un enseignant
    create: async(req, res) => {
        try {
            const { teacher_id, date, reason, status = 'unexcused', duration_hours = 1, class_id = null, subject_id = null, school_year } = req.body;
            if (!teacher_id || !date) {
                return res.status(400).json({ message: 'teacher_id et date sont requis.' });
            }
            const schoolYear = school_year || getCurrentSchoolYear();
            const [result] = await pool.query(
                `INSERT INTO teacher_absences (teacher_id, date, reason, status, duration_hours, class_id, subject_id, school_year)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [teacher_id, date, reason || null, status, duration_hours, class_id, subject_id, schoolYear]
            );
            res.status(201).json({ id: result.insertId, message: 'Absence enseignant créée avec succès.' });
        } catch (err) {
            console.error('[teacherAbsences.create] Error:', err);
            res.status(500).json({ message: "Erreur lors de l'enregistrement de l'absence enseignant" });
        }
    },

    // Supprimer une absence enseignant
    remove: async(req, res) => {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM teacher_absences WHERE id = ?', [id]);
            res.json({ message: 'Absence enseignant supprimée avec succès' });
        } catch (err) {
            console.error('[teacherAbsences.remove] Error:', err);
            res.status(500).json({ message: "Erreur lors de la suppression de l'absence enseignant" });
        }
    },
};

module.exports = teacherAbsenceController;

