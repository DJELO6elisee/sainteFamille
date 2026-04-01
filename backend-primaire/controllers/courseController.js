const pool = require('../config/database');

const courseController = {
    // Obtenir tous les cours
    getAllCourses: async(req, res) => {
        try {
            const [courses] = await pool.query(`
                SELECT c.*, s.name as subject_name, t.first_name as teacher_first_name, 
                t.last_name as teacher_last_name, cl.name as class_name
                FROM courses c
                JOIN subjects s ON c.subject_id = s.id
                JOIN teachers t ON c.teacher_id = t.id
                JOIN classes cl ON c.class_id = cl.id
                ORDER BY c.name
            `);
            res.json(courses);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir un cours par ID
    getCourseById: async(req, res) => {
        try {
            const [course] = await pool.query(`
                SELECT c.*, s.name as subject_name, t.first_name as teacher_first_name, 
                t.last_name as teacher_last_name, cl.name as class_name
                FROM courses c
                JOIN subjects s ON c.subject_id = s.id
                JOIN teachers t ON c.teacher_id = t.id
                JOIN classes cl ON c.class_id = cl.id
                WHERE c.id = ?
            `, [req.params.id]);

            if (course.length === 0) {
                return res.status(404).json({ message: 'Cours non trouvé' });
            }

            // Récupérer les élèves inscrits
            const [students] = await pool.query(`
                SELECT s.*, 
                (SELECT AVG(grade) FROM evaluation_grades eg 
                JOIN evaluations e ON eg.evaluation_id = e.id 
                WHERE e.course_id = ? AND eg.student_id = s.id) as average_grade
                FROM students s
                JOIN student_courses sc ON s.id = sc.student_id
                WHERE sc.course_id = ?
            `, [req.params.id, req.params.id]);

            res.json({...course[0], students });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Créer un nouveau cours
    createCourse: async(req, res) => {
        const { name, subject_id, teacher_id, class_id, description, credits, schedule } = req.body;
        try {
            const [result] = await pool.query(
                'INSERT INTO courses (name, subject_id, teacher_id, class_id, description, credits, schedule) VALUES (?, ?, ?, ?, ?, ?, ?)', [name, subject_id, teacher_id, class_id, description, credits, schedule]
            );
            res.status(201).json({ id: result.insertId, message: 'Cours créé avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Mettre à jour un cours
    updateCourse: async(req, res) => {
        const { name, subject_id, teacher_id, class_id, description, credits, schedule } = req.body;
        try {
            await pool.query(
                'UPDATE courses SET name = ?, subject_id = ?, teacher_id = ?, class_id = ?, description = ?, credits = ?, schedule = ? WHERE id = ?', [name, subject_id, teacher_id, class_id, description, credits, schedule, req.params.id]
            );
            res.json({ message: 'Cours mis à jour avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Supprimer un cours
    deleteCourse: async(req, res) => {
        try {
            // Vérifier si le cours a des élèves inscrits
            const [enrollments] = await pool.query('SELECT COUNT(*) as count FROM student_courses WHERE course_id = ?', [req.params.id]);

            if (enrollments[0].count > 0) {
                return res.status(400).json({ message: 'Impossible de supprimer le cours car il a des élèves inscrits' });
            }

            await pool.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
            res.json({ message: 'Cours supprimé avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Inscrire un élève à un cours
    enrollStudent: async(req, res) => {
        const { student_id, course_id } = req.body;
        try {
            // Vérifier si l'élève est déjà inscrit
            const [existing] = await pool.query(
                'SELECT * FROM student_courses WHERE student_id = ? AND course_id = ?', [student_id, course_id]
            );

            if (existing.length > 0) {
                return res.status(400).json({ message: 'L\'élève est déjà inscrit à ce cours' });
            }

            await pool.query(
                'INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)', [student_id, course_id]
            );
            res.status(201).json({ message: 'Élève inscrit avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Désinscrire un élève d'un cours
    unenrollStudent: async(req, res) => {
        const { student_id, course_id } = req.body;
        try {
            await pool.query(
                'DELETE FROM student_courses WHERE student_id = ? AND course_id = ?', [student_id, course_id]
            );
            res.json({ message: 'Élève désinscrit avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les cours d'un enseignant
    getTeacherCourses: async(req, res) => {
        try {
            const [courses] = await pool.query(`
                SELECT c.*, s.name as subject_name, cl.name as class_name,
                COUNT(DISTINCT sc.student_id) as total_students
                FROM courses c
                JOIN subjects s ON c.subject_id = s.id
                JOIN classes cl ON c.class_id = cl.id
                LEFT JOIN student_courses sc ON c.id = sc.course_id
                WHERE c.teacher_id = ?
                GROUP BY c.id
                ORDER BY c.name
            `, [req.params.teacherId]);
            res.json(courses);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les cours d'une classe
    getClassCourses: async(req, res) => {
        try {
            const [courses] = await pool.query(`
                SELECT c.*, s.name as subject_name, t.first_name as teacher_first_name, 
                t.last_name as teacher_last_name,
                COUNT(DISTINCT sc.student_id) as total_students
                FROM courses c
                JOIN subjects s ON c.subject_id = s.id
                JOIN teachers t ON c.teacher_id = t.id
                LEFT JOIN student_courses sc ON c.id = sc.course_id
                WHERE c.class_id = ?
                GROUP BY c.id
                ORDER BY c.name
            `, [req.params.classId]);
            res.json(courses);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = courseController;