const pool = require('../config/database');

const subjectController = {
    // Obtenir toutes les matières
    getAllSubjects: async(req, res) => {
        try {
            const [subjects] = await pool.query(`
                SELECT id, name, type, level_groups, created_at
                FROM subjects
                ORDER BY 
                    CASE type 
                        WHEN 'francais' THEN 1
                        WHEN 'aem' THEN 2
                        WHEN 'mathematiques' THEN 3
                        WHEN 'langues' THEN 4
                        WHEN 'autres' THEN 5
                        ELSE 6
                    END,
                    name
            `);
            res.json(subjects);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir une matière par ID
    getSubjectById: async(req, res) => {
        try {
            const [subject] = await pool.query(`
                SELECT id, name, type, level_groups, created_at
                FROM subjects
                WHERE id = ?
            `, [req.params.id]);

            if (subject.length === 0) {
                return res.status(404).json({ message: 'Matière non trouvée' });
            }

            res.json(subject[0]);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Créer une nouvelle matière
    createSubject: async(req, res) => {
        const { name, type, level_groups } = req.body;
        try {
            const [result] = await pool.query(
                'INSERT INTO subjects (name, type, level_groups, created_at) VALUES (?, ?, ?, NOW())', [name, type || null, level_groups || 'all']
            );
            res.status(201).json({ id: result.insertId, message: 'Matière créée avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Mettre à jour une matière
    updateSubject: async(req, res) => {
        const { name, type, level_groups } = req.body;
        try {
            await pool.query(
                'UPDATE subjects SET name = ?, type = ?, level_groups = ? WHERE id = ?', [name, type || null, level_groups || 'all', req.params.id]
            );
            res.json({ message: 'Matière mise à jour avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Supprimer une matière
    deleteSubject: async(req, res) => {
        try {
            // Vérifier si la matière est utilisée dans des emplois du temps
            const [schedules] = await pool.query('SELECT COUNT(*) as count FROM schedules WHERE subject_id = ?', [req.params.id]);

            if (schedules[0].count > 0) {
                return res.status(400).json({ message: 'Impossible de supprimer la matière car elle est utilisée dans un emploi du temps' });
            }

            await pool.query('DELETE FROM subjects WHERE id = ?', [req.params.id]);
            res.json({ message: 'Matière supprimée avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les matières par département
    getSubjectsByDepartment: async(req, res) => {
        try {
            const [subjects] = await pool.query(`
                SELECT s.id, s.name,
                (SELECT COUNT(DISTINCT ts.teacher_id) FROM teacher_subjects ts WHERE ts.subject_id = s.id) as total_teachers
                FROM subjects s
                /* WHERE s.department = ? */
                GROUP BY s.id
                ORDER BY s.name
            `, [req.params.department]);
            res.json(subjects);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les statistiques des matières
    getSubjectStats: async(req, res) => {
        try {
            const [stats] = await pool.query(`
                SELECT 
                    COUNT(*) as total_subjects
                FROM subjects
            `);
            res.json(stats[0]);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getTeachersForSubject: async(req, res) => {
        const subjectId = req.params.subjectId;
        try {
            const [teachers] = await pool.query(
                `SELECT t.id, t.first_name, t.last_name
                 FROM teacher_subjects ts
                 JOIN teachers t ON ts.teacher_id = t.id
                 WHERE ts.subject_id = ?`, [subjectId]
            );
            res.json(teachers);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les matières selon la classe
    getSubjectsByClass: async(req, res) => {
        try {
            const { classId } = req.params;
            console.log(`[getSubjectsByClass] Récupération des matières pour la classe ID: ${classId}`);

            // Récupérer d'abord le nom de la classe
            const [classInfo] = await pool.query('SELECT name FROM classes WHERE id = ?', [classId]);
            if (classInfo.length === 0) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            const className = classInfo[0].name;
            console.log(`[getSubjectsByClass] Nom de la classe: ${className}`);

            // Déterminer le groupe de matières selon la classe
            let subjectGroup = 'all';
            let whereClause = '';

            if (['CP1', 'CP2'].includes(className)) {
                subjectGroup = 'cp1_cp2';
                // Pour CP1-CP2: matières de base uniquement
                whereClause = `WHERE (level_groups IN ('cp1_cp2', 'all') OR name IN ('Lecture', 'Expression Écrite', 'Orthographe/Dictée', 'Mathématiques', 'Chant/Poésie', 'E.P.S'))`;
            } else if (['CE1', 'CE2', 'CM1', 'CM2'].includes(className)) {
                subjectGroup = 'ce1_cm2';
                // Pour CE1-CM2: toutes les matières sauf celles exclusives à CP1-CP2
                whereClause = `WHERE (level_groups IN ('ce1_cm2', 'all') OR level_groups IS NULL OR name NOT IN ('Lecture', 'Expression Écrite', 'Orthographe/Dictée') OR name IN ('Lecture', 'Expression Écrite', 'Orthographe/Dictée', 'Grammaire/Conjugaison', 'Vocabulaire', 'Exploitation de Textes', 'Histoire/Géographie', 'Sciences', 'EDHC', 'Anglais', 'Mathématiques', 'Chant/Poésie', 'E.P.S', 'Leçon/Problème'))`;
            } else {
                // Autres classes: toutes les matières
                whereClause = '';
            }

            const query = `SELECT * FROM subjects ${whereClause} ORDER BY 
                CASE type 
                    WHEN 'francais' THEN 1
                    WHEN 'aem' THEN 2
                    WHEN 'mathematiques' THEN 3
                    WHEN 'langues' THEN 4
                    WHEN 'autres' THEN 5
                    ELSE 6
                END, name`;

            console.log(`[getSubjectsByClass] Requête SQL: ${query}`);
            const [subjects] = await pool.query(query);

            console.log(`[getSubjectsByClass] ${subjects.length} matières trouvées pour ${className}`);
            subjects.forEach(subject => {
                console.log(`  - ${subject.name} (${subject.type}) [${subject.level_groups || 'non défini'}]`);
            });

            res.json({
                class_name: className,
                subject_group: subjectGroup,
                subjects: subjects
            });

        } catch (error) {
            console.error('[getSubjectsByClass] Erreur:', error);
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = subjectController;