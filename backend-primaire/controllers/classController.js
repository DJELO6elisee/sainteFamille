const pool = require('../config/database');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// Helper: map legacy subject_id to bulletin_subject_id
const resolveBulletinSubjectId = async(subjectId, classId) => {
    // First check if subjectId is already a bulletin_subject_id
    const [bsCheck] = await pool.query('SELECT id FROM bulletin_subjects WHERE id = ? LIMIT 1', [subjectId]);
    if (bsCheck.length > 0) {
        console.log(`[resolveBulletinSubjectId] subjectId ${subjectId} est déjà un bulletin_subject_id`);
        return subjectId;
    }

    // Try mapping by class level_group via class name, then fallback to any mapping by subject
    let levelGroup = null;
    if (classId) {
        const [classRow] = await pool.query('SELECT name FROM classes WHERE id = ? LIMIT 1', [classId]);
        if (classRow.length > 0) {
            const upperName = String(classRow[0].name || '').toUpperCase();
            levelGroup = (upperName.startsWith('CP1') || upperName.startsWith('CP2') || upperName.startsWith('CP')) ? 'cp' : 'ce_cm';
        }
    }
    if (levelGroup) {
        const [byLevel] = await pool.query(
            'SELECT bulletin_subject_id FROM subject_bulletin_mappings WHERE subject_id = ? AND level_group = ? LIMIT 1', [subjectId, levelGroup]
        );
        if (byLevel.length > 0) return byLevel[0].bulletin_subject_id;
    }
    const [anyMap] = await pool.query(
        'SELECT bulletin_subject_id FROM subject_bulletin_mappings WHERE subject_id = ? LIMIT 1', [subjectId]
    );
    if (anyMap.length > 0) return anyMap[0].bulletin_subject_id;
    // Fallback by name match
    const [byName] = await pool.query(
        `SELECT bs.id AS bulletin_subject_id
         FROM subjects s
         JOIN bulletin_subjects bs ON bs.name = s.name
         WHERE s.id = ?
         LIMIT 1`, [subjectId]
    );
    return byName.length > 0 ? byName[0].bulletin_subject_id : null;
};

const classController = {
    // Obtenir toutes les classes
    getAllClasses: async(req, res) => {
        try {
            const { school_year, education_level_id } = req.query;
            let query = `
                SELECT 
                    c.*,
                    el.name as level_name,
                    el.tuition_amount,
                    el.registration_fee,
                    el.cantine_amount,
                    COUNT(CASE WHEN e.status = 'active' AND (? IS NULL OR e.school_year = ?) THEN e.student_id END) as students_count,
                    COUNT(DISTINCT CASE WHEN (? IS NULL OR e.school_year = ?) THEN e.student_id END) as total_students_all_statuses
                FROM classes c
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                LEFT JOIN enrollments e ON c.id = e.class_id`;
            const params = [];
            const whereConditions = [];

            // Toujours ajouter school_year comme paramètre pour le COUNT (4 fois pour les 4 CASE)
            params.push(school_year, school_year, school_year, school_year);

            if (school_year) {
                whereConditions.push('c.school_year = ?');
                params.push(school_year);
            }

            if (education_level_id) {
                whereConditions.push('c.education_level_id = ?');
                params.push(education_level_id);
            }

            // Log les paramètres reçus
            console.log('REQ QUERY getAllClasses:', req.query);
            // Ajout filtrage robustifié pour tous les noms CE, CP, CM (ignore les espaces)
            if (req.query.class_name_prefix) {
                const prefix = String(req.query.class_name_prefix).trim().toUpperCase();
                whereConditions.push(`UPPER(REPLACE(c.name, ' ', '')) LIKE ?`);
                params.push(prefix + '%');
            }

            if (whereConditions.length > 0) {
                query += ' WHERE ' + whereConditions.join(' AND ');
            }

            query += `
                GROUP BY c.id
                ORDER BY c.name
            `;
            const [classes] = await pool.query(query, params);

            // Activer automatiquement tous les élèves inactifs pour l'année scolaire spécifiée
            // Si un élève est dans enrollments, il est considéré comme inscrit et doit être actif
            if (school_year) {
                try {
                    const [inactiveEnrollments] = await pool.query(`
                        SELECT id FROM enrollments 
                        WHERE school_year = ? AND status != 'active' AND status IS NOT NULL
                    `, [school_year]);

                    if (inactiveEnrollments.length > 0) {
                        const enrollmentIds = inactiveEnrollments.map(e => e.id);
                        await pool.query(`
                            UPDATE enrollments 
                            SET status = 'active' 
                            WHERE id IN (${enrollmentIds.map(() => '?').join(',')})
                        `, enrollmentIds);
                        console.log(`✅ [classController] ${enrollmentIds.length} élève(s) inactif(s) activé(s) automatiquement pour l'année ${school_year}`);
                    }
                } catch (activationError) {
                    console.error('⚠️ [classController] Erreur lors de l\'activation automatique des élèves:', activationError);
                    // Ne pas bloquer la réponse si l'activation échoue
                }
            }

            // Formater les classes avec les informations des niveaux
            const formattedClasses = classes.map(cls => {
                const amount = cls.tuition_amount ? Number(cls.tuition_amount) : 0;
                const studentsCountActive = Number(cls.students_count) || 0;
                const totalStudentsAllStatuses = Number(cls.total_students_all_statuses) || 0;

                console.log(`📚 [classController] Classe ${cls.name} (ID: ${cls.id}):`, {
                    education_level_id: cls.education_level_id,
                    level_name: cls.level_name,
                    tuition_amount: cls.tuition_amount,
                    amount: amount,
                    students_count_active: studentsCountActive,
                    total_students_all_statuses: totalStudentsAllStatuses,
                    difference: totalStudentsAllStatuses - studentsCountActive
                });

                // Vérification si différence entre actifs et tous les statuts
                if (totalStudentsAllStatuses > studentsCountActive) {
                    console.warn(`⚠️ [classController] Classe ${cls.name}: ${totalStudentsAllStatuses} élèves inscrits (tous statuts) mais seulement ${studentsCountActive} actifs`);
                }

                return {
                    ...cls,
                    level: cls.level_name, // Pour la compatibilité avec l'ancien code
                    niveau: cls.level_name, // Pour la compatibilité avec l'ancien code
                    amount: amount, // Utiliser 0 au lieu de null
                    cantine_amount: cls.cantine_amount ? Number(cls.cantine_amount) : 0,
                    // Si un élève est dans enrollments pour cette classe et année, il est considéré comme inscrit
                    students_count: totalStudentsAllStatuses, // Utiliser le total (tous les statuts) car tous les élèves dans enrollments sont inscrits
                    total_students_all_statuses: totalStudentsAllStatuses // Nombre total tous statuts
                };
            });

            res.json(formattedClasses);
        } catch (error) {
            console.error('Erreur lors de la récupération des classes:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir une classe par ID
    getClassById: async(req, res) => {
        try {
            const [class_] = await pool.query(`
                SELECT 
                    c.*,
                    el.name as level_name,
                    el.tuition_amount,
                    el.registration_fee,
                    el.cantine_amount
                FROM classes c
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE c.id = ?
            `, [req.params.id]);

            if (class_.length === 0) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            // Formater la classe avec les informations du niveau
            const amount = class_[0].tuition_amount ? Number(class_[0].tuition_amount) : 0;
            console.log(`📚 [getClassById] Classe ${class_[0].name} (ID: ${class_[0].id}):`, {
                education_level_id: class_[0].education_level_id,
                level_name: class_[0].level_name,
                tuition_amount: class_[0].tuition_amount,
                amount: amount
            });

            const formattedClass = {
                ...class_[0],
                level: class_[0].level_name, // Pour la compatibilité avec l'ancien code
                niveau: class_[0].level_name, // Pour la compatibilité avec l'ancien code
                amount: amount, // Utiliser 0 au lieu de null
                cantine_amount: class_[0].cantine_amount ? Number(class_[0].cantine_amount) : 0
            };

            res.json(formattedClass);
        } catch (error) {
            console.error('Erreur lors de la récupération de la classe:', error);
            res.status(500).json({ message: error.message });
        }
    },


    // Créer une nouvelle classe
    createClass: async(req, res) => {
        const { name, education_level_id, school_year } = req.body;
        try {
            // Vérifier que le niveau d'études existe
            const [levelExists] = await pool.query(
                'SELECT id, name FROM education_levels WHERE id = ? AND is_active = 1', [education_level_id]
            );
            if (levelExists.length === 0) {
                return res.status(400).json({
                    message: 'Niveau d\'études non trouvé ou inactif'
                });
            }

            // Vérifier si une classe avec le même nom existe déjà pour cette année scolaire
            const [existingClass] = await pool.query(
                'SELECT id, name FROM classes WHERE name = ? AND school_year = ?', [name, school_year]
            );
            if (existingClass.length > 0) {
                return res.status(400).json({
                    message: `Une classe avec le nom "${name}" existe déjà pour l'année scolaire ${school_year}`
                });
            }

            const [result] = await pool.query(
                'INSERT INTO classes (name, education_level_id, school_year) VALUES (?, ?, ?)', [name, education_level_id, school_year]
            );
            res.status(201).json({ id: result.insertId, message: 'Classe créée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la création de la classe:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Mettre à jour une classe
    updateClass: async(req, res) => {
        const { name, education_level_id, school_year } = req.body;
        try {
            // Vérifier que le niveau d'études existe
            const [levelExists] = await pool.query(
                'SELECT id, name FROM education_levels WHERE id = ? AND is_active = 1', [education_level_id]
            );
            if (levelExists.length === 0) {
                return res.status(400).json({
                    message: 'Niveau d\'études non trouvé ou inactif'
                });
            }

            // Vérifier si une classe avec le même nom existe déjà pour cette année scolaire (exclure la classe actuelle)
            const [existingClass] = await pool.query(
                'SELECT id, name FROM classes WHERE name = ? AND school_year = ? AND id != ?', [name, school_year, req.params.id]
            );
            if (existingClass.length > 0) {
                return res.status(400).json({
                    message: `Une classe avec le nom "${name}" existe déjà pour l'année scolaire ${school_year}`
                });
            }

            await pool.query(
                'UPDATE classes SET name = ?, education_level_id = ?, school_year = ? WHERE id = ?', [name, education_level_id, school_year, req.params.id]
            );
            res.json({ message: 'Classe mise à jour avec succès' });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la classe:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Publier l'emploi du temps pour une classe
    publishTimetable: async(req, res) => {
        const classId = req.params.id;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Mettre à jour la classe pour marquer l'emploi du temps comme publié
            await connection.query(
                'UPDATE classes SET timetable_published = 1 WHERE id = ?', [classId]
            );

            // 2. Récupérer le nom de la classe pour la notification
            const [classInfo] = await connection.query('SELECT name FROM classes WHERE id = ?', [classId]);
            const className = classInfo.length > 0 ? classInfo[0].name : 'votre classe';

            // 3. Créer une notification unique pour la classe
            const notificationTitle = `Emploi du temps publié`;
            const notificationMessage = `L'emploi du temps pour la classe de ${className} est maintenant disponible.`;

            await connection.query(
                'INSERT INTO notifications (title, message, type, class_id) VALUES (?, ?, ?, ?)', [notificationTitle, notificationMessage, 'class', classId]
            );

            await connection.commit();
            res.json({ message: `Emploi du temps publié et notifié à la classe.` });
        } catch (error) {
            await connection.rollback();
            console.error("Erreur lors de la publication de l'emploi du temps:", error);
            res.status(500).json({ message: "Erreur lors de la publication de l'emploi du temps." });
        } finally {
            connection.release();
        }
    },

    // Supprimer une classe
    deleteClass: async(req, res) => {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const classId = req.params.id;

            // Vérifier si la classe existe
            const [classExists] = await connection.query('SELECT id, name FROM classes WHERE id = ?', [classId]);
            if (classExists.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            // Vérifier s'il y a des élèves inscrits
            const [enrolledStudents] = await connection.query(
                'SELECT COUNT(*) as count FROM enrollments WHERE class_id = ? AND status = "active"', [classId]
            );
            if (enrolledStudents[0].count > 0) {
                await connection.rollback();
                return res.status(400).json({
                    message: `Impossible de supprimer cette classe : ${enrolledStudents[0].count} étudiant(s) inscrit(s)`
                });
            }

            // Vérifier s'il y a des cours associés (table optionnelle)
            try {
                const [courses] = await connection.query(
                    'SELECT COUNT(*) as count FROM courses WHERE class_id = ?', [classId]
                );
                if (courses[0].count > 0) {
                    await connection.rollback();
                    return res.status(400).json({
                        message: `Impossible de supprimer cette classe : ${courses[0].count} cours associé(s)`
                    });
                }
            } catch (error) {
                // Si la table courses n'existe pas, on ignore cette vérification
                console.log('Table courses non trouvée, vérification ignorée');
            }

            // Vérifier s'il y a des emplois du temps (tables optionnelles)
            try {
                const [schedules] = await connection.query(`
                    SELECT COUNT(*) as count FROM schedules s 
                    JOIN courses c ON s.course_id = c.id 
                    WHERE c.class_id = ?`, [classId]);
                if (schedules[0].count > 0) {
                    await connection.rollback();
                    return res.status(400).json({
                        message: `Impossible de supprimer cette classe : emploi du temps associé`
                    });
                }
            } catch (error) {
                // Si les tables schedules ou courses n'existent pas, on ignore cette vérification
                console.log('Tables schedules/courses non trouvées, vérification ignorée');
            }

            // Si toutes les vérifications passent, supprimer la classe
            await connection.query('DELETE FROM classes WHERE id = ?', [classId]);

            await connection.commit();
            res.json({ message: 'Classe supprimée avec succès' });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('Erreur lors de la suppression de la classe:', error);

            // Gérer les erreurs de contrainte de clé étrangère
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                res.status(400).json({
                    message: 'Impossible de supprimer cette classe : elle est référencée par d\'autres données'
                });
            } else {
                res.status(500).json({ message: error.message });
            }
        } finally {
            if (connection) connection.release();
        }
    },

    // Obtenir les élèves d'une classe
    // Retourne TOUS les élèves inscrits (peu importe le statut)
    // Si un élève est dans enrollments pour cette classe et année, il est considéré comme inscrit
    getClassStudents: async(req, res) => {
        let connection;
        try {
            const classId = req.params.id;
            const school_year = req.query.school_year || null;

            console.log('[CLASS CONTROLLER] getClassStudents:', { classId, school_year });

            // APPROCHE ROBUSTE: Utiliser une transaction pour activer TOUS les élèves inactifs
            connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Étape 1: Activer TOUS les élèves inactifs ou sans statut pour cette classe
                let updateQuery = `
                    UPDATE enrollments 
                    SET status = 'active' 
                    WHERE class_id = ? 
                    AND student_id IS NOT NULL
                    AND (status != 'active' OR status IS NULL)
                `;
                let updateParams = [classId];

                if (school_year) {
                    updateQuery += ' AND school_year = ?';
                    updateParams.push(school_year);
                }

                const [updateResult] = await connection.query(updateQuery, updateParams);
                const activatedCount = updateResult.affectedRows || 0;

                if (activatedCount > 0) {
                    console.log(`[CLASS CONTROLLER] ✅ ${activatedCount} élève(s) activé(s) automatiquement pour la classe ${classId}, année ${school_year || 'toutes'}`);
                }

                await connection.commit();
            } catch (activationError) {
                await connection.rollback();
                console.error('⚠️ [CLASS CONTROLLER] Erreur lors de l\'activation des élèves:', activationError);
                // Continuer quand même pour récupérer les élèves
            } finally {
                if (connection) {
                    connection.release();
                }
            }

            // Étape 2: Récupérer TOUS les élèves avec LEFT JOIN pour être sûr de ne perdre aucun élève
            let query = `
                SELECT DISTINCT
                  s.*,
                  COALESCE(u.email, '') as email,
                  e.status as enrollment_status
                FROM enrollments e
                LEFT JOIN students s ON e.student_id = s.id
                LEFT JOIN users u ON s.user_id = u.id
                WHERE e.class_id = ?
                  AND e.student_id IS NOT NULL
            `;
            const params = [classId];

            if (school_year) {
                query += ' AND e.school_year = ?';
                params.push(school_year);
            }

            query += ' ORDER BY COALESCE(s.last_name, ""), COALESCE(s.first_name, "")';

            const [students] = await pool.query(query, params);

            console.log(`[CLASS CONTROLLER] Nombre d'élèves récupérés: ${students.length} pour la classe ${classId}, année ${school_year || 'toutes'}`);

            // Vérification: Compter tous les élèves dans enrollments pour cette classe
            let countQuery = `
                SELECT COUNT(DISTINCT student_id) as total_count
                FROM enrollments
                WHERE class_id = ? AND student_id IS NOT NULL
            `;
            let countParams = [classId];

            if (school_year) {
                countQuery += ' AND school_year = ?';
                countParams.push(school_year);
            }

            const [countResult] = await pool.query(countQuery, countParams);
            const totalEnrolled = (countResult[0] && countResult[0].total_count) || 0;

            console.log(`[CLASS CONTROLLER] Total dans enrollments: ${totalEnrolled}, élèves retournés: ${students.length}`);

            if (totalEnrolled !== students.length) {
                console.warn(`[CLASS CONTROLLER] ⚠️ ATTENTION: ${totalEnrolled} élèves dans enrollments mais seulement ${students.length} retournés. Vérifiez les jointures.`);
            }

            res.json(students);
        } catch (error) {
            console.error('[CLASS CONTROLLER] Erreur lors de la récupération des élèves:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les cours d'une classe
    getClassCourses: async(req, res) => {
        try {
            const [courses] = await pool.query(`
                SELECT c.*, s.name as subject_name, t.first_name, t.last_name
                FROM courses c
                JOIN subjects s ON c.subject_id = s.id
                JOIN teachers t ON c.teacher_id = t.id
                WHERE c.class_id = ?
            `, [req.params.id]);
            res.json(courses);
        } catch (error) {
            // Si la table courses n'existe pas, retourner un tableau vide
            if (error.message.includes("doesn't exist")) {
                res.json([]);
            } else {
                res.status(500).json({ message: error.message });
            }
        }
    },

    // Obtenir toutes les matières enseignées dans une classe (pour les admins)
    getClassSubjects: async(req, res) => {
        try {
            const { id: classId } = req.params;
            const schoolYear = req.query.school_year || '2025-2026';

            console.log(`[getClassSubjects] Récupération des matières pour classe ${classId}, année ${schoolYear}`);

            // Récupérer toutes les matières qui ont des cours programmés dans cette classe
            const [subjects] = await pool.query(`
                SELECT DISTINCT 
                    s.id, 
                    s.name, 
                    s.type, 
                    s.level_groups,
                    COUNT(sch.id) as schedule_count
                FROM subjects s
                JOIN schedules sch ON s.id = sch.subject_id
                WHERE sch.class_id = ? 
                AND sch.school_year = ?
                GROUP BY s.id, s.name, s.type, s.level_groups
                ORDER BY s.name
            `, [classId, schoolYear]);

            console.log(`[getClassSubjects] ${subjects.length} matières trouvées pour la classe ${classId}`);
            console.log(`[getClassSubjects] Matières:`, subjects.map(s => s.name));

            res.json(subjects);
        } catch (error) {
            console.error('Erreur lors de la récupération des matières de la classe:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des matières de la classe' });
        }
    },

    // Obtenir l'emploi du temps d'une classe
    getClassSchedule: async(req, res) => {
        try {
            const [schedule] = await pool.query(`
                SELECT s.*, c.name as course_name, sub.name as subject_name, t.first_name, t.last_name
                FROM schedules s
                JOIN courses c ON s.course_id = c.id
                JOIN subjects sub ON c.subject_id = sub.id
                JOIN teachers t ON c.teacher_id = t.id
                WHERE c.class_id = ?
                ORDER BY s.day_of_week, s.start_time
            `, [req.params.id]);
            res.json(schedule);
        } catch (error) {
            // Si les tables schedules ou courses n'existent pas, retourner un tableau vide
            if (error.message.includes("doesn't exist")) {
                res.json([]);
            } else {
                res.status(500).json({ message: error.message });
            }
        }
    },

    // Inscrire un élève à une classe
    enrollStudent: async(req, res) => {
        const { student_id } = req.body;
        try {
            await pool.query(
                'INSERT INTO enrollments (student_id, class_id, enrollment_date) VALUES (?, ?, CURRENT_DATE)', [student_id, req.params.id]
            );
            res.status(201).json({ message: 'Élève inscrit avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Désinscrire un élève d'une classe
    unenrollStudent: async(req, res) => {
        const { student_id } = req.body;
        try {
            await pool.query(
                'UPDATE enrollments SET status = "dropped" WHERE student_id = ? AND class_id = ?', [student_id, req.params.id]
            );
            res.json({ message: 'Élève désinscrit avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les professeurs d'une classe (via teacher_classes)
    getClassTeachers: async(req, res) => {
        try {
            const classId = req.params.id;
            const [teachers] = await pool.query(`
                SELECT t.id, t.first_name, t.last_name, t.email, tc.academic_year, tc.semester
                FROM teacher_classes tc
                JOIN teachers t ON tc.teacher_id = t.id
                WHERE tc.class_id = ?
            `, [classId]);
            res.json(teachers);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les notes d'une classe pour une matière donnée
    getGradesForClass: async(req, res) => {
        const classId = req.params.id;
        const subjectId = req.query.subject_id;
        const schoolYear = req.query.school_year;

        try {
            let query = `SELECT * FROM grades WHERE class_id = ? AND bulletin_subject_id = ?`;
            const params = [classId, await resolveBulletinSubjectId(subjectId, classId)];

            if (schoolYear) {
                query += ' AND school_year = ?';
                params.push(schoolYear);
            }

            const [grades] = await pool.query(query, params);
            res.json(grades);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Notifier les élèves d'une classe (notification interne, pas d'email)
    notifyStudents: async(req, res) => {
        const classId = req.params.id;
        const { semester } = req.body; // Optionnel
        try {
            // Ici tu pourrais créer une notification dans la table notifications, ou simplement répondre OK
            // Exemple : rien à faire, juste un accusé de réception
            res.json({ message: 'Notification interne : les élèves verront leurs notes sur leur dashboard.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Erreur lors de la notification.' });
        }
    },

    // Transmettre notes & moyennes à l'admin
    submitToAdmin: async(req, res) => {
        const classId = req.params.id;
        try {
            // Récupérer les notes et moyennes de la classe
            const [grades] = await pool.query(`
                SELECT s.first_name, s.last_name, g.grade, g.semester, g.coefficient
                FROM grades g
                JOIN students s ON g.student_id = s.id
                WHERE g.class_id = ?
            `, [classId]);

            // Récupérer l'email de l'admin
            const [admins] = await pool.query(`SELECT email FROM users WHERE role = 'admin' LIMIT 1`);
            if (admins.length === 0) {
                return res.status(404).json({ message: "Aucun administrateur trouvé." });
            }
            const adminEmail = admins[0].email;

            let content = 'Notes et moyennes de la classe :\n\n';
            grades.forEach(g => {
                content += `${g.first_name} ${g.last_name} - Note: ${g.grade} (Coeff: ${g.coefficient || 1}) - ${g.semester}\n`;
            });

            await transporter.sendMail({
                from: `${process.env.SCHOOL_NAME || 'École Mon Établissement'} <${process.env.MAIL_USER}>`,
                to: adminEmail,
                subject: 'Transmission des notes et moyennes',
                text: content
            });

            res.json({ success: true, message: "Notes et moyennes transmises à l'administration." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Erreur lors de la transmission à l'administration." });
        }
    }
};

module.exports = classController;