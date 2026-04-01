const pool = require('../config/database');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Générateur de code unique (8 caractères alphanumériques)
function generateUniqueCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Utiliser le service email centralisé
const emailService = require('../services/emailService');

// Normalise les libellés (supprime accents, met en majuscules, trim)
function normalizeLabel(input) {
    if (input === null || input === undefined) return '';
    return String(input)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .trim();
}

// Canonicalise pour l'autorisation (ex: "LECTURE 3" -> "LECTURE", "E.P.S" -> "EPS")
function canonicalizeForAuth(input) {
    const normalized = normalizeLabel(input)
        .replace(/[\./]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return normalized.replace(/\s*[-–—]?\s*\d+$/, '').trim();
}

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

const teacherController = {
    // Obtenir tous les professeurs
    getAllTeachers: async(req, res) => {
        console.log('[getAllTeachers] Appel reçu');
        try {
            const [teachers] = await pool.query(`
                SELECT 
                    t.id, t.first_name, t.last_name, t.email, t.phone, 
                    t.qualification, t.address, t.city, t.status, t.hire_date,
                    t.aide_first_name, t.aide_last_name, t.aide_contact
                FROM teachers t
            `);
            console.log(`[getAllTeachers] Nombre de professeurs trouvés : ${teachers.length}`);
            // Pour chaque professeur, récupérer ses matières et ses classes
            for (const teacher of teachers) {
                const [subjects] = await pool.query(`
                    SELECT s.id, s.name FROM teacher_subjects ts
                    JOIN subjects s ON ts.subject_id = s.id
                    WHERE ts.teacher_id = ?
                `, [teacher.id]);
                teacher.subjects = subjects;
                const [classes] = await pool.query(`
                    SELECT DISTINCT c.id, c.name
                    FROM schedules s
                    JOIN classes c ON s.class_id = c.id
                    WHERE s.teacher_id = ?
                `, [teacher.id]);
                teacher.classes = classes;
                console.log(`[getAllTeachers] Professeur ${teacher.id} - ${teacher.last_name} ${teacher.first_name} : ${subjects.length} matières, ${classes.length} classes`);
            }
            res.json(teachers);
        } catch (error) {
            console.error('[getAllTeachers] Erreur :', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir un professeur par ID
    getTeacherById: async(req, res) => {
        try {
            const [teacherArr] = await pool.query(`
                SELECT 
                    t.id, t.first_name, t.last_name, t.email, t.phone, 
                    t.qualification, t.address, t.city, t.status, t.hire_date, t.user_id,
                    t.aide_first_name, t.aide_last_name, t.aide_contact
                FROM teachers t
                WHERE t.id = ?
            `, [req.params.id]);

            if (teacherArr.length === 0) {
                return res.status(404).json({ message: 'Professeur non trouvé' });
            }
            const teacher = teacherArr[0];
            const schoolYear = req.query.school_year;
            if (schoolYear) {
                // Matières enseignées cette année (via schedules)
                const [subjects] = await pool.query(`
                    SELECT DISTINCT s.id, s.name
                    FROM schedules sch
                    JOIN subjects s ON sch.subject_id = s.id
                    WHERE sch.teacher_id = ? AND sch.school_year = ?
                `, [teacher.id, schoolYear]);
                teacher.subjects = subjects;
                // Classes enseignées cette année
                const [classes] = await pool.query(`
                    SELECT DISTINCT c.id, c.name
                    FROM schedules sch
                    JOIN classes c ON sch.class_id = c.id
                    WHERE sch.teacher_id = ? AND sch.school_year = ?
                `, [teacher.id, schoolYear]);
                teacher.classes = classes;
            } else {
                // Toutes matières
                const [subjects] = await pool.query(`
                SELECT s.id, s.name FROM teacher_subjects ts
                JOIN subjects s ON ts.subject_id = s.id
                WHERE ts.teacher_id = ?
            `, [teacher.id]);
                teacher.subjects = subjects;
                // Toutes classes
                const [classes] = await pool.query(`
                SELECT DISTINCT c.id, c.name
                FROM schedules s
                JOIN classes c ON s.class_id = c.id
                WHERE s.teacher_id = ?
            `, [teacher.id]);
                teacher.classes = classes;
            }
            res.json(teacher);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Créer un nouveau professeur
    createTeacher: async(req, res) => {
        const {
            first_name,
            last_name,
            email,
            phone,
            subject_ids, // tableau d'ids
            qualification,
            address,
            city,
            aide_first_name,
            aide_last_name,
            aide_contact
        } = req.body;

        // Génération d'un mot de passe par défaut (ex: nomdefamille123)
        const default_password = `${last_name.toLowerCase().replace(/\s/g, '')}123`;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(default_password, salt);

        // Génération du code unique
        let code;
        let isUnique = false;
        while (!isUnique) {
            code = generateUniqueCode();
            const [existing] = await pool.query('SELECT id FROM teachers WHERE code = ?', [code]);
            if (existing.length === 0) isUnique = true;
        }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // Créer l'utilisateura
            const [userResult] = await connection.query(
                'INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [email, hashedPassword, 'teacher']
            );

            // Créer le professeur avec le code unique
            const [teacherResult] = await connection.query(
                `INSERT INTO teachers (
                    user_id, code, first_name, last_name, email, phone, 
                    qualification, address, city, hire_date, status,
                    aide_first_name, aide_last_name, aide_contact
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'active', ?, ?, ?)`, [
                    userResult.insertId, code, first_name, last_name, email, phone,
                    qualification, address, city, aide_first_name, aide_last_name, aide_contact
                ]
            );
            const teacherId = teacherResult.insertId;

            // Insérer les matières dans teacher_subjects
            if (Array.isArray(subject_ids)) {
                for (const sid of subject_ids) {
                    await connection.query('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)', [teacherId, sid]);
                }
            }

            await connection.commit();

            // Envoi du code par email avec gestion d'erreur robuste
            try {
                const emailConfig = require('../config/emailConfig');
                const schoolName = emailConfig.schoolName || 'LA MAISON DES ENFANTS LA PETITE ACADEMIE';
                const mailUser = emailConfig.emailConfig.auth.user || 'binate@lapetiteacademie.ci';

                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa;">
                        <div style="background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; font-size: 24px;">Bienvenue dans ${schoolName}</h1>
                        </div>
                        
                        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <h2 style="color: #1976d2; margin-bottom: 20px;">Votre code d'accès à la plateforme</h2>
                            
                            <p>Bonjour ${first_name} ${last_name},</p>
                            
                            <p>Bienvenue dans l'équipe pédagogique de <strong>${schoolName}</strong> !</p>
                            
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1976d2;">
                                <h3 style="color: #1976d2; margin-top: 0;">Votre code d'accès personnel :</h3>
                                <p style="font-size: 24px; font-weight: bold; color: #1976d2; text-align: center; padding: 10px; background-color: #e3f2fd; border-radius: 4px;">${code}</p>
                            </div>
                            
                            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                                <h4 style="color: #856404; margin-top: 0;">📋 Instructions de connexion :</h4>
                                <ol style="color: #856404; margin: 10px 0;">
                                    <li>Rendez-vous sur la plateforme de l'école</li>
                                    <li>Utilisez votre Nom : <strong>${last_name}</strong></li>
                                    <li>ET</li>
                                    <li>Utilisez ce code comme identifiant de connexion</li>
                                </ol>
                            </div>
                            
                            <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                                <h4 style="color: #155724; margin-top: 0;">🔒 Sécurité :</h4>
                                <ul style="color: #155724; margin: 10px 0;">
                                    <li>Conservez ce code précieusement</li>
                                    <li>Ne le communiquez à personne</li>
                                    <li>Changez votre mot de passe après votre première connexion</li>
                                </ul>
                            </div>
                            
                            <p>Si vous avez la moindre question ou difficulté, n'hésitez pas à contacter le secrétariat.</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${emailConfig.frontendUrl || 'bethaniemiracle.com'}/login" style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                    Se connecter maintenant
                                </a>
                            </div>
                            
                            <p style="color: #666; font-size: 14px; margin-top: 30px;">
                                Cordialement,<br>
                                L'administration<br>
                                <strong>${schoolName}</strong>
                            </p>
                        </div>
                    </div>
                `;

                const mailOptions = {
                    from: mailUser,
                    to: email,
                    subject: `Votre code d'accès à la plateforme - ${schoolName}`,
                    html: htmlContent
                };

                const emailResult = await emailService.sendEmailWithRetry(mailOptions);

                if (emailResult.success) {
                    console.log(`[createTeacher] Email envoyé avec succès à ${email}`);
                    res.status(201).json({
                        message: 'Professeur créé avec succès. Le code a été envoyé par email.',
                        teacher_code: code
                    });
                } else {
                    console.error('[createTeacher] Erreur lors de l\'envoi de l\'email:', emailResult.error);
                    res.status(201).json({
                        message: 'Professeur créé avec succès.',
                        warning: 'Le code d\'accès n\'a pas pu être envoyé par email. Veuillez communiquer manuellement le code.',
                        teacher_code: code
                    });
                }
            } catch (emailError) {
                console.error('[createTeacher] Erreur lors de l\'envoi de l\'email:', emailError);
                // Ne pas faire échouer la création du professeur si l'email échoue
                res.status(201).json({
                    message: 'Professeur créé avec succès.',
                    warning: 'Le code d\'accès n\'a pas pu être envoyé par email. Veuillez communiquer manuellement le code.',
                    teacher_code: code
                });
            }
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('[createTeacher] Erreur détaillée:', error);

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ message: 'Un utilisateur avec cet email existe déjà.' });
            }

            // Log détaillé pour le débogage
            console.error('[createTeacher] Stack trace:', error.stack);
            console.error('[createTeacher] Code d\'erreur:', error.code);
            console.error('[createTeacher] Message d\'erreur:', error.message);

            res.status(500).json({
                message: "Erreur lors de la création du professeur.",
                details: process.env.NODE_ENV === 'development' ? error.message : 'Erreur interne du serveur'
            });
        } finally {
            if (connection) connection.release();
        }
    },

    // Mettre à jour un professeur
    updateTeacher: async(req, res) => {
        const { id } = req.params;
        const {
            first_name,
            last_name,
            email,
            phone,
            subject_ids, // tableau d'ids
            qualification,
            address,
            city,
            aide_first_name,
            aide_last_name,
            aide_contact
        } = req.body;

        try {
            await pool.query(
                `UPDATE teachers SET 
                    first_name = ?, last_name = ?, email = ?, phone = ?,
                    qualification = ?, address = ?, city = ?,
                    aide_first_name = ?, aide_last_name = ?, aide_contact = ?
                 WHERE id = ?`, [
                    first_name, last_name, email, phone, qualification,
                    address, city, aide_first_name, aide_last_name, aide_contact, id
                ]
            );

            // Mettre à jour les matières dans teacher_subjects
            await pool.query('DELETE FROM teacher_subjects WHERE teacher_id = ?', [id]);
            if (Array.isArray(subject_ids)) {
                for (const sid of subject_ids) {
                    await pool.query('INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)', [id, sid]);
                }
            }

            // Optionnel : Mettre aussi à jour l'email dans la table users si nécessaire
            const [teacher] = await pool.query('SELECT user_id FROM teachers WHERE id = ?', [id]);
            if (teacher.length > 0) {
                await pool.query('UPDATE users SET email = ? WHERE id = ?', [email, teacher[0].user_id]);
            }

            res.json({ message: 'Professeur mis à jour avec succès' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Erreur lors de la mise à jour du professeur." });
        }
    },

    // Supprimer un professeur
    deleteTeacher: async(req, res) => {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [teacher] = await connection.query('SELECT user_id FROM teachers WHERE id = ?', [req.params.id]);

            if (teacher.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Professeur non trouvé' });
            }

            await connection.query('DELETE FROM teachers WHERE id = ?', [req.params.id]);
            await connection.query('DELETE FROM users WHERE id = ?', [teacher[0].user_id]);

            await connection.commit();
            res.json({ message: 'Professeur supprimé avec succès' });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error(error);
            res.status(500).json({ message: "Erreur lors de la suppression du professeur." });
        } finally {
            if (connection) connection.release();
        }
    },

    // Obtenir les cours d'un professeur
    getTeacherCourses: async(req, res) => {
        try {
            console.log(`[teacherController] Récupération des cours pour l'enseignant ID: ${req.params.id}`);
            const [courses] = await pool.query(`
                SELECT 
                    s.id, s.day_of_week, s.start_time, s.end_time,
                    sub.name as subject_name, 
                    cl.name as class_name
                FROM schedules s
                JOIN subjects sub ON s.subject_id = sub.id
                JOIN classes cl ON s.class_id = cl.id
                WHERE s.teacher_id = ?
            `, [req.params.id]);
            console.log(`[teacherController] Cours trouvés dans la BDD:`, courses);
            res.json(courses);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir l'emploi du temps d'un professeur
    getTeacherSchedule: async(req, res) => {
        try {
            const [schedule] = await pool.query(`
                    SELECT 
                        s.id, s.day_of_week, s.start_time, s.end_time,
                        sub.name as subject_name, 
                        cl.name as class_name
                    FROM schedules s
                    JOIN subjects sub ON s.subject_id = sub.id
                    JOIN classes cl ON s.class_id = cl.id
                    WHERE s.teacher_id = ?
                    ORDER BY s.day_of_week, s.start_time
                `, [req.params.id]);
            res.json(schedule);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir la classe du professeur connecté depuis son emploi du temps
    getMyClasses: async(req, res) => {
        console.log('[getMyClasses] Appel reçu avec user.id =', req.user.id);
        try {
            // Trouver l'id du professeur à partir de l'user_id
            const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
            console.log('[getMyClasses] Résultat de la recherche du teacher:', teacherRows);

            if (teacherRows.length === 0) {
                console.log('[getMyClasses] Aucun professeur trouvé pour user_id =', req.user.id);
                return res.status(404).json({ message: 'Professeur non trouvé' });
            }

            const teacherId = teacherRows[0].id;
            const schoolYear = req.query.school_year || '2025-2026';

            console.log('[getMyClasses] Recherche de la classe pour teacherId =', teacherId, 'et schoolYear =', schoolYear);

            // Récupérer la classe DIRECTEMENT depuis l'emploi du temps
            const [scheduleClasses] = await pool.query(`
                SELECT DISTINCT 
                    c.id, 
                    c.name, 
                    c.created_at,
                    COUNT(s.id) as course_count
                FROM classes c
                JOIN schedules s ON c.id = s.class_id
                WHERE s.teacher_id = ? AND s.school_year = ?
                GROUP BY c.id, c.name, c.created_at
                ORDER BY course_count DESC
            `, [teacherId, schoolYear]);

            console.log(`[getMyClasses] ${scheduleClasses.length} classe(s) trouvée(s) dans l'emploi du temps`);
            scheduleClasses.forEach(cls => {
                console.log(`  - ${cls.name} (${cls.course_count} cours)`);
            });

            return res.json(scheduleClasses);
        } catch (error) {
            console.error('[getMyClasses] Erreur:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Ajouter une note à un élève pour une classe (avec matière et composition)
    addGrade: async(req, res) => {
        const { student_id, class_id, subject_id, grade, composition_id, academic_year, coefficient } = req.body;
        console.log('[addGrade] Requête reçue avec :', { student_id, class_id, subject_id, grade, composition_id, academic_year, coefficient });

        if (!student_id || !class_id || !subject_id || grade === undefined || !composition_id) {
            console.warn('[addGrade] Paramètres manquants');
            return res.status(400).json({ message: 'student_id, class_id, subject_id, grade et composition_id sont requis.' });
        }

        try {
            // Préparer classe et matière pour tous les rôles
            const [classInfo] = await pool.query('SELECT name FROM classes WHERE id = ?', [class_id]);
            if (classInfo.length === 0) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }
            const className = classInfo[0].name;
            console.log(`[addGrade] Vérification pour classe: ${className}`);

            let subjectName = null;
            let subjectLevelGroups = null;
            let isLegacySubject = false;
            const [subjectInfo] = await pool.query('SELECT name, type, level_groups FROM subjects WHERE id = ? LIMIT 1', [subject_id]);
            if (subjectInfo.length > 0) {
                subjectName = subjectInfo[0].name;
                subjectLevelGroups = subjectInfo[0].level_groups;
                isLegacySubject = true;
            } else {
                const [bsInfo] = await pool.query('SELECT name, level_group FROM bulletin_subjects WHERE id = ? LIMIT 1', [subject_id]);
                if (bsInfo.length === 0) {
                    return res.status(404).json({ message: 'Matière non trouvée' });
                }
                subjectName = bsInfo[0].name;
                subjectLevelGroups = bsInfo[0].level_group;
            }

            // Les admins, secrétaires et informaticiens ont tous les droits, pas besoin de vérifier les autorisations
            if (req.user.role === 'admin' || req.user.role === 'secretary' || req.user.role === 'informaticien') {
                console.log('[addGrade] Accès admin/secretary/informaticien détecté - toutes les autorisations accordées');
            } else {
                // Vérifier que l'enseignant a le droit d'enseigner cette matière dans cette classe
                const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
                if (teacherRows.length === 0) {
                    return res.status(404).json({ message: 'Professeur non trouvé' });
                }
                const teacherId = teacherRows[0].id;
                let isAuthorized = false;

                // Logique d'autorisation selon la classe
                const upperClass = String(className || '').toUpperCase();
                if (upperClass.startsWith('CP1') || upperClass.startsWith('CP2') || upperClass === 'CP') {
                    // CP1-CP2: seulement les matières de base
                    const cp1cp2Subjects = ['Lecture', 'Expression Écrite', 'Orthographe/Dictée', 'Mathématiques', 'Chant/Poésie', 'E.P.S'];
                    const normSet = new Set(cp1cp2Subjects.map(canonicalizeForAuth));
                    const normSubject = canonicalizeForAuth(subjectName);
                    isAuthorized = normSet.has(normSubject) ||
                        subjectLevelGroups === 'cp1_cp2' ||
                        subjectLevelGroups === 'cp' // bulletin level group
                        ||
                        subjectLevelGroups === 'all';
                } else if (upperClass.startsWith('CE1') || upperClass.startsWith('CE2') || upperClass.startsWith('CM1') || upperClass.startsWith('CM2')) {
                    // CE1-CM2: toutes les matières complètes
                    const ce1cm2Subjects = ['Lecture', 'Expression Écrite', 'Orthographe/Dictée', 'Grammaire/Conjugaison', 'Vocabulaire', 'Exploitation de Textes', 'Histoire/Géographie', 'Sciences', 'EDHC', 'Anglais', 'Mathématiques', 'Chant/Poésie', 'E.P.S', 'Leçon/Problème'];
                    const normSet = new Set(ce1cm2Subjects.map(canonicalizeForAuth));
                    const normSubject = canonicalizeForAuth(subjectName);
                    isAuthorized = normSet.has(normSubject) ||
                        subjectLevelGroups === 'ce1_cm2' ||
                        subjectLevelGroups === 'ce_cm' // bulletin level group
                        ||
                        subjectLevelGroups === 'all';
                } else {
                    // Autres classes: toutes les matières autorisées
                    isAuthorized = true;
                }

                if (!isAuthorized) {
                    console.warn(`[addGrade] Matière ${subjectName} non autorisée pour la classe ${className}`);
                    return res.status(403).json({
                        message: `La matière "${subjectName}" n'est pas autorisée pour la classe ${className}`
                    });
                }

                console.log(`[addGrade] Enseignant ID ${teacherId} - Accès autorisé temporairement pour debug`);
            }

            // Vérifier que la composition existe, est active et que sa date permet la saisie
            const [compositionCheck] = await pool.query(`
                SELECT name, composition_date, is_active, school_year,
                       CASE 
                           WHEN CURDATE() < composition_date THEN 'À venir'
                           WHEN CURDATE() = composition_date THEN 'Aujourd\\'hui'
                           WHEN CURDATE() > composition_date THEN 'Terminée'
                           ELSE 'Non défini'
                       END as status,
                       -- Date de début du délai: composition_date + 1 jour
                       DATE_ADD(composition_date, INTERVAL 1 DAY) as grade_entry_start_date,
                       -- Date de fin du délai: composition_date + 6 jours (1 + 5)
                       DATE_ADD(composition_date, INTERVAL 6 DAY) as grade_entry_end_date,
                       -- Jours restants pour saisir les notes
                       DATEDIFF(DATE_ADD(composition_date, INTERVAL 6 DAY), CURDATE()) as days_remaining_for_grades,
                       -- Indique si la saisie est encore ouverte
                       CASE 
                           WHEN CURDATE() < DATE_ADD(composition_date, INTERVAL 1 DAY) THEN 0
                           WHEN CURDATE() <= DATE_ADD(composition_date, INTERVAL 6 DAY) THEN 1
                           ELSE 0
                       END as can_enter_grades
                FROM compositions 
                WHERE id = ?
            `, [composition_id]);

            if (compositionCheck.length === 0) {
                return res.status(404).json({ message: 'Composition non trouvée' });
            }

            const composition = compositionCheck[0];

            if (!composition.is_active) {
                return res.status(400).json({ message: 'Cette composition n\'est pas active' });
            }

            // Empêcher l'ajout de notes pour les compositions futures
            if (composition.status === 'À venir') {
                const compositionDate = new Date(composition.composition_date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });

                return res.status(400).json({
                    message: `Impossible d'ajouter des notes pour la composition "${composition.name}". Cette composition aura lieu le ${compositionDate}.`,
                    error_type: 'COMPOSITION_FUTURE',
                    composition_date: composition.composition_date,
                    composition_name: composition.name
                });
            }

            // ============================================
            // VÉRIFICATION DU DÉLAI DE SAISIE - DÉSACTIVÉE
            // Pour réactiver, décommenter le code ci-dessous
            // ============================================
            // Vérifier le délai de saisie (5 jours à partir du jour +1 après la date de composition)
            // Les admins, secrétaires et informaticiens peuvent toujours saisir
            // const isAdmin = req.user.role === 'admin' || req.user.role === 'secretary' || req.user.role === 'informaticien';

            // if (!isAdmin && composition.can_enter_grades === 0) {
            //     const startDate = new Date(composition.grade_entry_start_date).toLocaleDateString('fr-FR', {
            //         day: 'numeric',
            //         month: 'long',
            //         year: 'numeric'
            //     });
            //     const endDate = new Date(composition.grade_entry_end_date).toLocaleDateString('fr-FR', {
            //         day: 'numeric',
            //         month: 'long',
            //         year: 'numeric'
            //     });

            //     let message = '';
            //     if (composition.days_remaining_for_grades < 0) {
            //         message = `Le délai de saisie des notes pour la composition "${composition.name}" est expiré. ` +
            //             `Le délai était du ${startDate} au ${endDate}. ` +
            //             `Veuillez contacter l'administration pour toute modification.`;
            //     } else {
            //         message = `Le délai de saisie des notes pour la composition "${composition.name}" n'a pas encore commencé. ` +
            //             `La saisie sera possible du ${startDate} au ${endDate}.`;
            //     }

            //     return res.status(403).json({
            //         message: message,
            //         error_type: 'GRADE_ENTRY_DEADLINE',
            //         composition_date: composition.composition_date,
            //         composition_name: composition.name,
            //         grade_entry_start_date: composition.grade_entry_start_date,
            //         grade_entry_end_date: composition.grade_entry_end_date,
            //         days_remaining_for_grades: composition.days_remaining_for_grades,
            //         can_enter_grades: false
            //     });
            // }

            // Utiliser l'année scolaire courante si academic_year n'est pas fourni
            let currentSchoolYear = academic_year || composition.school_year;
            if (!currentSchoolYear) {
                try {
                    currentSchoolYear = require('../config/schoolYear').getCurrentSchoolYear();
                } catch (_) {
                    currentSchoolYear = '2025-2026';
                }
            }

            // Vérifier s'il existe déjà une note pour cet élève dans cette composition/matière
            let bulletinSubjectId = null;

            // Si c'est une matière legacy (subjects table), il faut résoudre vers bulletin_subject
            if (isLegacySubject) {
                // S'assurer qu'une correspondance subject -> bulletin_subject existe pour le groupe de niveau de la classe
                try {
                    const [classRow] = await pool.query('SELECT name FROM classes WHERE id = ? LIMIT 1', [class_id]);
                    if (classRow.length > 0) {
                        const upperName = String(classRow[0].name || '').toUpperCase();
                        const levelGroup = (upperName.startsWith('CP1') || upperName.startsWith('CP2') || upperName.startsWith('CP')) ? 'cp' : 'ce_cm';

                        // Vérifier si un mapping existe déjà
                        const [existingMap] = await pool.query(
                            'SELECT id FROM subject_bulletin_mappings WHERE subject_id = ? AND level_group = ? LIMIT 1', [subject_id, levelGroup]
                        );

                        if (existingMap.length === 0) {
                            // Essayer de retrouver un bulletin_subject_id via la vue si disponible
                            let foundBulletinSubjectId = null;
                            try {
                                const [viaView] = await pool.query(
                                    'SELECT bulletin_subject_id FROM v_bulletin_subjects_with_subject_id WHERE subject_id = ? AND level_group = ? LIMIT 1', [subject_id, levelGroup]
                                );
                                if (viaView.length > 0) {
                                    foundBulletinSubjectId = viaView[0].bulletin_subject_id;
                                }
                            } catch (_) {
                                // La vue peut ne pas exister; on tentera la correspondance par nom
                            }

                            if (!foundBulletinSubjectId) {
                                // Correspondance par nom entre subjects et bulletin_subjects pour le level_group
                                const [byName] = await pool.query(
                                    `SELECT bs.id AS bulletin_subject_id
                                     FROM subjects s
                                     JOIN bulletin_subjects bs ON bs.name = s.name AND bs.level_group = ?
                                     WHERE s.id = ?
                                     LIMIT 1`, [levelGroup, subject_id]
                                );
                                if (byName.length > 0) {
                                    foundBulletinSubjectId = byName[0].bulletin_subject_id;
                                }
                            }

                            if (foundBulletinSubjectId) {
                                await pool.query(
                                    'INSERT IGNORE INTO subject_bulletin_mappings (subject_id, bulletin_subject_id, level_group) VALUES (?, ?, ?)', [subject_id, foundBulletinSubjectId, levelGroup]
                                );
                            }
                        }
                    }
                } catch (mapErr) {
                    console.warn('[addGrade] Avertissement: échec de la vérification/creation du mapping bulletin_subject:', mapErr ? mapErr.message : 'Erreur inconnue');
                }

                // Résoudre le bulletin_subject_id depuis la matière legacy
                bulletinSubjectId = await resolveBulletinSubjectId(subject_id, class_id);
            } else {
                // Si ce n'est PAS une matière legacy, alors subject_id EST déjà un bulletin_subject_id
                bulletinSubjectId = subject_id;
            }

            // Filet de sécurité: si non résolu, essayer par nom + level_group, sinon renvoyer 400
            if (!bulletinSubjectId) {
                try {
                    const [classRow2] = await pool.query('SELECT name FROM classes WHERE id = ? LIMIT 1', [class_id]);
                    const upperName = String((classRow2[0] && classRow2[0].name) || '').toUpperCase();
                    const levelGroup = (upperName.startsWith('CP1') || upperName.startsWith('CP2') || upperName.startsWith('CP')) ? 'cp' : 'ce_cm';
                    const [byNameLevel] = await pool.query(
                        'SELECT id FROM bulletin_subjects WHERE name = ? AND level_group = ? LIMIT 1', [subjectName, levelGroup]
                    );
                    if (byNameLevel.length > 0) {
                        bulletinSubjectId = byNameLevel[0].id;
                    }
                } catch (_) {}
            }

            if (!bulletinSubjectId) {
                return res.status(400).json({
                    message: 'Impossible de déterminer la matière du bulletin pour cet enregistrement.',
                    hint: 'Vérifiez les correspondances subject_bulletin_mappings et bulletin_subjects',
                });
            }
            const [existingGrade] = await pool.query(`
                SELECT id, is_published FROM grades 
                WHERE student_id = ? AND class_id = ? AND bulletin_subject_id = ? AND composition_id = ?
            `, [student_id, class_id, bulletinSubjectId, composition_id]);

            if (existingGrade.length > 0) {
                // Vérifier si la note est déjà publiée (sauf pour les admins/informaticiens)
                if (existingGrade[0].is_published && req.user.role !== 'admin' && req.user.role !== 'secretary' && req.user.role !== 'informaticien') {
                    return res.status(403).json({
                        message: 'Cette note est déjà publiée et ne peut plus être modifiée.'
                    });
                }

                // Mettre à jour la note existante (seulement si non publiée)
                await pool.query(`
                    UPDATE grades 
                    SET grade = ?, coefficient = ?
                    WHERE id = ?
                `, [grade, coefficient !== undefined ? coefficient : 1, existingGrade[0].id]);

                console.log('[addGrade] Note mise à jour pour élève', student_id, 'composition', compositionCheck[0].name);
                res.json({
                    message: `Note mise à jour avec succès pour ${subjectName} - ${compositionCheck[0].name}.`,
                    grade_id: existingGrade[0].id,
                    action: 'updated'
                });
            } else {
                // Créer une nouvelle note
                const result = await pool.query(`
                    INSERT INTO grades (student_id, class_id, bulletin_subject_id, grade, composition_id, academic_year, coefficient, created_at, school_year) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
                `, [student_id, class_id, bulletinSubjectId, grade, composition_id, currentSchoolYear, coefficient !== undefined ? coefficient : 1, currentSchoolYear]);

                console.log('[addGrade] Note ajoutée avec succès pour élève', student_id, 'composition', compositionCheck[0].name);
                res.status(201).json({
                    message: `Note ajoutée avec succès pour ${subjectName} - ${compositionCheck[0].name}.`,
                    grade_id: result.insertId,
                    action: 'created'
                });
            }
        } catch (error) {
            console.error('[addGrade] Erreur SQL :', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Modifier une note
    updateGrade: async(req, res) => {
        const { grade, semester, academic_year, coefficient, subject_id } = req.body;
        if (!subject_id) {
            return res.status(400).json({ message: 'subject_id requis.' });
        }
        try {
            // Vérifier si la note est déjà publiée (sauf pour les admins)
            const [gradeCheck] = await pool.query(
                'SELECT is_published FROM grades WHERE id = ?', [req.params.id]
            );

            if (gradeCheck.length === 0) {
                return res.status(404).json({ message: 'Note non trouvée.' });
            }

            if (gradeCheck[0].is_published && req.user.role !== 'admin' && req.user.role !== 'secretary' && req.user.role !== 'informaticien') {
                return res.status(403).json({
                    message: 'Cette note est déjà publiée et ne peut plus être modifiée.'
                });
            }

            // Utiliser l'année scolaire courante si academic_year n'est pas fourni
            const currentSchoolYear = academic_year || require('../config/schoolYear').getCurrentSchoolYear();

            await pool.query(
                'UPDATE grades SET grade = ?, semester = ?, academic_year = ?, coefficient = ?, bulletin_subject_id = ? WHERE id = ?', [grade, semester || null, currentSchoolYear, coefficient !== undefined ? coefficient : 1, await resolveBulletinSubjectId(subject_id, null), req.params.id]
            );
            res.json({ message: 'Note modifiée avec succès.' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Supprimer une note
    deleteGrade: async(req, res) => {
        try {
            // Vérifier si la note est déjà publiée (sauf pour les admins)
            const [gradeCheck] = await pool.query(
                'SELECT is_published FROM grades WHERE id = ?', [req.params.id]
            );

            if (gradeCheck.length === 0) {
                return res.status(404).json({ message: 'Note non trouvée.' });
            }

            if (gradeCheck[0].is_published && req.user.role !== 'admin' && req.user.role !== 'secretary' && req.user.role !== 'informaticien') {
                return res.status(403).json({
                    message: 'Cette note est déjà publiée et ne peut plus être supprimée.'
                });
            }

            await pool.query('DELETE FROM grades WHERE id = ?', [req.params.id]);
            res.json({ message: 'Note supprimée avec succès.' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Debug : Vérifier les notes directement
    debugGrades: async(req, res) => {
        try {
            const { class_id, subject_id, composition_id } = req.query;

            console.log('[debugGrades] Paramètres reçus:', { class_id, subject_id, composition_id });

            // Récupérer les informations sur les matières disponibles
            const [subjects] = await pool.query(`
                SELECT id, name FROM subjects ORDER BY name
            `);

            // Requête simple pour voir toutes les notes de cette composition
            const [allGrades] = await pool.query(`
                SELECT g.*, s.first_name, s.last_name, bs.name as subject_name, c.name as composition_name
                FROM grades g
                LEFT JOIN students s ON g.student_id = s.id
                LEFT JOIN bulletin_subjects bs ON g.bulletin_subject_id = bs.id
                LEFT JOIN compositions c ON g.composition_id = c.id
                WHERE g.composition_id = ?
            `, [composition_id]);

            console.log('[debugGrades] Toutes les notes pour composition', composition_id, ':', allGrades);

            // Requête avec les filtres exacts
            const [filteredGrades] = await pool.query(`
                SELECT g.*, s.first_name, s.last_name, bs.name as subject_name
                FROM grades g
                JOIN students s ON g.student_id = s.id
                JOIN bulletin_subjects bs ON g.bulletin_subject_id = bs.id
                WHERE g.class_id = ? AND g.bulletin_subject_id = ? AND g.composition_id = ?
            `, [class_id, await resolveBulletinSubjectId(subject_id, class_id), composition_id]);

            console.log('[debugGrades] Notes filtrées:', filteredGrades);

            // Vérifier l'emploi du temps de l'enseignant
            const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
            const teacherId = teacherRows[0] ? teacherRows[0].id : null;

            const [teacherSchedule] = await pool.query(`
                SELECT s.*, sub.name as subject_name, c.name as class_name
                FROM schedules s
                JOIN subjects sub ON s.subject_id = sub.id
                JOIN classes c ON s.class_id = c.id
                WHERE s.teacher_id = ?
            `, [teacherId]);

            console.log('[debugGrades] Emploi du temps enseignant:', teacherSchedule);

            res.json({
                subjects_available: subjects,
                all_grades: allGrades,
                filtered_grades: filteredGrades,
                teacher_schedule: teacherSchedule,
                search_params: { class_id, subject_id, composition_id },
                teacher_id: teacherId
            });
        } catch (error) {
            console.error('[debugGrades] Erreur:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Endpoint temporaire sans vérification de permissions pour récupérer les notes
    getGradesNoAuth: async(req, res) => {
        try {
            const { class_id, subject_id, composition_id } = req.query;

            console.log('[getGradesNoAuth] Paramètres reçus:', { class_id, subject_id, composition_id });

            if (!class_id || !subject_id || !composition_id) {
                return res.status(400).json({
                    message: 'class_id, subject_id et composition_id sont requis'
                });
            }

            // Récupérer directement les notes sans vérification de permissions
            const [grades] = await pool.query(`
                SELECT 
                    g.id,
                    g.student_id,
                    g.grade,
                    g.composition_id,
                    g.coefficient,
                    g.created_at,
                    g.is_published,
                    g.school_year,
                    s.first_name,
                    s.last_name,
                    c.name as composition_name
                FROM grades g
                JOIN students s ON g.student_id = s.id
                JOIN compositions c ON g.composition_id = c.id
                WHERE g.class_id = ? AND g.bulletin_subject_id = ? AND g.composition_id = ?
                ORDER BY s.last_name, s.first_name
            `, [class_id, await resolveBulletinSubjectId(subject_id, class_id), composition_id]);

            console.log(`[getGradesNoAuth] ${grades.length} notes trouvées`);
            console.log('[getGradesNoAuth] Notes détaillées:', grades);

            res.json({
                grades: grades,
                total_students: grades.length
            });

        } catch (error) {
            console.error('[getGradesNoAuth] Erreur:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les matières d'un professeur
    getMySubjects: async(req, res) => {
        const teacherId = req.params.id;
        const schoolYear = req.query.school_year;
        console.log("API /api/teachers/:id/subjects appelée pour teacherId =", teacherId, "année =", schoolYear);
        try {
            let subjects;
            if (schoolYear) {
                // Matières enseignées cette année (via schedules)
                [subjects] = await pool.query(
                    `SELECT DISTINCT s.id, s.name
                     FROM schedules sch
                     JOIN subjects s ON sch.subject_id = s.id
                     WHERE sch.teacher_id = ? AND sch.school_year = ?`, [teacherId, schoolYear]
                );
            } else {
                // Toutes matières
                [subjects] = await pool.query(
                    `SELECT DISTINCT s.id, s.name
                     FROM teacher_subjects ts
                     JOIN subjects s ON ts.subject_id = s.id
                     WHERE ts.teacher_id = ?`, [teacherId]
                );
            }
            console.log("Matières trouvées pour teacherId", teacherId, "année", schoolYear, ":", subjects);
            res.json(subjects);
        } catch (error) {
            console.error("Erreur SQL getMySubjects :", error);
            res.status(500).json({ message: error.message });
        }
    },

    // Ajouter l'endpoint pour récupérer le professeur connecté
    getMe: async(req, res) => {
        try {
            const [rows] = await pool.query(`
                SELECT t.*, u.role AS user_role
                FROM teachers t
                JOIN users u ON t.user_id = u.id
                WHERE t.user_id = ?
            `, [req.user.id]);
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Professeur non trouvé' });
            }
            const teacher = rows[0];
            const schoolYear = req.query.school_year;
            if (schoolYear) {
                // Matières enseignées cette année (via schedules)
                const [subjects] = await pool.query(`
                    SELECT DISTINCT s.id, s.name
                    FROM schedules sch
                    JOIN subjects s ON sch.subject_id = s.id
                    WHERE sch.teacher_id = ? AND sch.school_year = ?
                `, [teacher.id, schoolYear]);
                teacher.subjects = subjects;
                // Classes enseignées cette année
                const [classes] = await pool.query(`
                    SELECT DISTINCT c.id, c.name
                    FROM schedules sch
                    JOIN classes c ON sch.class_id = c.id
                    WHERE sch.teacher_id = ? AND sch.school_year = ?
                `, [teacher.id, schoolYear]);
                teacher.classes = classes;
            } else {
                // Toutes matières
                const [subjects] = await pool.query(`
                    SELECT s.id, s.name FROM teacher_subjects ts
                    JOIN subjects s ON ts.subject_id = s.id
                    WHERE ts.teacher_id = ?
                `, [teacher.id]);
                teacher.subjects = subjects;
                // Toutes classes
                const [classes] = await pool.query(`
                    SELECT DISTINCT c.id, c.name
                    FROM schedules s
                    JOIN classes c ON s.class_id = c.id
                    WHERE s.teacher_id = ?
                `, [teacher.id]);
                teacher.classes = classes;
            }
            res.json(teacher);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Retourner les classes où le prof enseigne une matière donnée (basé sur l'emploi du temps)
    getClassesForSubject: async(req, res) => {
        const teacherId = req.params.id;
        const subjectId = req.params.subjectId;
        console.log("API getClassesForSubject appelée avec teacherId =", teacherId, "subjectId =", subjectId);
        try {
            const [classes] = await pool.query(
                `SELECT DISTINCT c.id, c.name
                 FROM schedules s
                 JOIN classes c ON s.class_id = c.id
                 WHERE s.teacher_id = ? AND s.subject_id = ?`, [teacherId, subjectId]
            );
            console.log("Classes trouvées (schedules) :", classes);
            res.json(classes);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Publier les notes d'une classe/matière/trimestre
    publishGrades: async(req, res) => {
        const { class_id, subject_id, composition_id } = req.body;

        if (!class_id || !subject_id || !composition_id) {
            return res.status(400).json({ message: 'class_id, subject_id et composition_id sont requis.' });
        }

        try {
            // Vérifier que le professeur enseigne bien cette matière dans cette classe
            const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
            if (teacherRows.length === 0) {
                return res.status(404).json({ message: 'Professeur non trouvé' });
            }
            const teacherId = teacherRows[0].id;

            console.log(`[publishGrades] Enseignant ID ${teacherId} - Accès autorisé temporairement pour debug`);

            // Déterminer le bulletin_subject_id: accepter subject_id déjà bulletin, sinon résoudre depuis legacy
            let bulletinSubjectId = null;
            const [bsCheck] = await pool.query('SELECT id FROM bulletin_subjects WHERE id = ? LIMIT 1', [subject_id]);
            if (bsCheck.length > 0) {
                bulletinSubjectId = subject_id;
            } else {
                bulletinSubjectId = await resolveBulletinSubjectId(subject_id, class_id);
            }

            // Publier les notes pour cette composition spécifique
            const [result] = await pool.query(
                `UPDATE grades SET is_published = 1 
                 WHERE class_id = ? AND bulletin_subject_id = ? AND composition_id = ? AND is_published = 0`, [class_id, bulletinSubjectId, composition_id]
            );

            console.log('[publishGrades] Notes publiées:', {
                class_id,
                subject_id,
                composition_id,
                affectedRows: result.affectedRows
            });

            res.json({
                message: `${result.affectedRows} note(s) publiée(s) avec succès.`,
                affectedRows: result.affectedRows
            });
        } catch (error) {
            console.error('Erreur lors de la publication des notes:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir le détail des cours d'un professeur (classes, matières, horaires)
    getTeachingSchedule: async(req, res) => {
        try {
            const teacherId = req.params.id;
            const schoolYear = req.query.school_year;

            console.log(`[getTeachingSchedule] Récupération pour teacher ${teacherId}, school_year: ${schoolYear}`);

            let query = `
                SELECT 
                    c.name as class_name,
                    COALESCE(sub.name, 'Sans matière') as subject_name,
                    s.day_of_week,
                    s.start_time,
                    s.end_time
                FROM schedules s
                JOIN classes c ON s.class_id = c.id
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                WHERE s.teacher_id = ? 
                AND (s.is_weekly_schedule = 0 OR s.is_weekly_schedule IS NULL)`;
            const params = [teacherId];
            if (schoolYear) {
                query += ' AND s.school_year = ?';
                params.push(schoolYear);
            }
            query += ' ORDER BY s.day_of_week, s.start_time';

            console.log(`[getTeachingSchedule] Requête SQL: ${query}`);
            console.log(`[getTeachingSchedule] Paramètres:`, params);

            const [courses] = await pool.query(query, params);
            console.log(`[getTeachingSchedule] Résultats trouvés: ${courses.length}`);

            res.json(courses);
        } catch (error) {
            console.error('[getTeachingSchedule] Erreur:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir l'emploi du temps hebdomadaire créé par le professeur
    getWeeklySchedule: async(req, res) => {
        try {
            const teacherId = req.params.id;
            const schoolYear = req.query.school_year;

            console.log(`[getWeeklySchedule] Récupération pour teacher ${teacherId}, school_year: ${schoolYear}`);

            // Récupérer les emplois du temps créés par ce professeur
            let query = `
                SELECT 
                    s.id,
                    c.name as class_name,
                    sub.name as subject_name,
                    s.day_of_week,
                    s.start_time,
                    s.end_time,
                    s.course_description,
                    s.title,
                    s.domain,
                    s.is_published
                FROM schedules s
                JOIN classes c ON s.class_id = c.id
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                WHERE s.teacher_id = ? 
                AND s.is_weekly_schedule = 1`;
            const params = [teacherId];
            if (schoolYear) {
                query += ' AND s.school_year = ?';
                params.push(schoolYear);
            }
            query += ' ORDER BY s.day_of_week, s.start_time';

            console.log(`[getWeeklySchedule] Requête SQL: ${query}`);
            console.log(`[getWeeklySchedule] Paramètres:`, params);

            const [courses] = await pool.query(query, params);
            console.log(`[getWeeklySchedule] Résultats trouvés: ${courses.length}`);

            res.json(courses);
        } catch (error) {
            console.error('[getWeeklySchedule] Erreur:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Récupérer les matières RÉELLEMENT enseignées par un professeur selon son emploi du temps
    getSubjectsForTeacher: async(req, res) => {
        try {
            const teacherId = req.params.id;
            const schoolYear = req.query.school_year || '2025-2026';

            console.log(`[getSubjectsForTeacher] Recherche pour teacherId: ${teacherId}, schoolYear: ${schoolYear}`);

            // Récupérer les matières UNIQUEMENT depuis l'emploi du temps réel
            const [subjects] = await pool.query(`
                SELECT DISTINCT s.id, s.name, s.created_at, s.type, s.level_groups
                FROM schedules sch
                JOIN subjects s ON sch.subject_id = s.id
                WHERE sch.teacher_id = ? AND sch.school_year = ?
                ORDER BY s.name
            `, [teacherId, schoolYear]);

            console.log(`[getSubjectsForTeacher] ${subjects.length} matières trouvées dans l'emploi du temps`);
            subjects.forEach(subject => {
                console.log(`  - ${subject.name} (ID: ${subject.id})`);
            });

            res.json(subjects);
        } catch (err) {
            console.error('Erreur lors de la récupération des matières du professeur:', err);
            res.status(500).json({ message: 'Erreur serveur lors de la récupération des matières.' });
        }
    },

    // Récupérer les matières autorisées pour un enseignant dans une classe donnée
    getAuthorizedSubjectsForClass: async(req, res) => {
        try {
            const { classId } = req.params;

            // Si l'utilisateur est admin, secretary ou informaticien, retourner toutes les matières de la classe
            if (req.user.role === 'admin' || req.user.role === 'secretary' || req.user.role === 'informaticien') {
                console.log(`[getAuthorizedSubjectsForClass] Accès admin détecté, récupération de toutes les matières de la classe ${classId}`);

                const schoolYear = req.query.school_year || '2025-2026';
                const [subjects] = await pool.query(`
                    SELECT DISTINCT 
                        s.id, 
                        s.name, 
                        s.type, 
                        s.level_groups
                    FROM subjects s
                    JOIN schedules sch ON s.id = sch.subject_id
                    WHERE sch.class_id = ? 
                    AND sch.school_year = ?
                    ORDER BY s.name
                `, [classId, schoolYear]);

                console.log(`[getAuthorizedSubjectsForClass] ${subjects.length} matières trouvées pour l'admin`);
                return res.json({ authorized_subjects: subjects });
            }

            // Récupérer l'ID du professeur connecté
            const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
            if (teacherRows.length === 0) {
                return res.status(404).json({ message: 'Professeur non trouvé' });
            }
            const teacherId = teacherRows[0].id;

            // Vérifier que l'enseignant enseigne bien dans cette classe (via l'emploi du temps)
            const schoolYear = req.query.school_year || '2025-2026';
            const [scheduleCheck] = await pool.query(`
                SELECT DISTINCT c.name as class_name, COUNT(s.id) as course_count
                FROM schedules s
                JOIN classes c ON s.class_id = c.id
                WHERE s.teacher_id = ? AND s.class_id = ? AND s.school_year = ?
                GROUP BY c.id, c.name
            `, [teacherId, classId, schoolYear]);

            if (scheduleCheck.length === 0) {
                return res.status(403).json({
                    message: 'Vous n\'enseignez pas dans cette classe selon votre emploi du temps'
                });
            }

            const className = scheduleCheck[0].class_name;
            const courseCount = scheduleCheck[0].course_count;
            console.log(`[getAuthorizedSubjectsForClass] Classe: ${className}, Enseignant: ${teacherId}, Année: ${schoolYear}, Cours: ${courseCount}`);

            // MODIFICATION CLÉE: Récupérer SEULEMENT les matières que l'enseignant enseigne RÉELLEMENT dans cette classe
            // via l'emploi du temps (table schedules) ET qui sont compatibles avec le niveau de la classe
            let query = `
                SELECT DISTINCT s.id, s.name, s.type, s.level_groups
                FROM subjects s
                JOIN schedules sch ON s.id = sch.subject_id
                WHERE sch.teacher_id = ? 
                AND sch.class_id = ?
                AND sch.school_year = ?
            `;
            let params = [teacherId, classId, schoolYear];

            // Ajouter le filtre par niveau de classe pour la sécurité
            if (['CP1', 'CP2'].includes(className)) {
                // CP1-CP2: vérifier que les matières sont bien autorisées pour ce niveau
                query += ` AND (s.level_groups IN ('cp1_cp2', 'all') 
                         OR s.name IN ('Lecture', 'Expression Écrite', 'Orthographe/Dictée', 'Mathématiques', 'Chant/Poésie', 'E.P.S'))`;
            } else if (['CE1', 'CE2', 'CM1', 'CM2'].includes(className)) {
                // CE1-CM2: vérifier que les matières sont bien autorisées pour ce niveau
                query += ` AND (s.level_groups IN ('ce1_cm2', 'all') 
                         OR s.name IN ('Lecture', 'Expression Écrite', 'Orthographe/Dictée', 'Grammaire/Conjugaison', 
                                      'Vocabulaire', 'Exploitation de Textes', 'Histoire/Géographie', 'Sciences', 
                                      'EDHC', 'Anglais', 'Mathématiques', 'Chant/Poésie', 'E.P.S', 'Leçon/Problème'))`;
            }

            query += ' ORDER BY s.name';

            console.log(`[getAuthorizedSubjectsForClass] Requête CORRIGÉE: ${query}`);
            console.log(`[getAuthorizedSubjectsForClass] Paramètres: [${params.join(', ')}]`);

            const [subjects] = await pool.query(query, params);

            console.log(`[getAuthorizedSubjectsForClass] ${subjects.length} matières RÉELLEMENT enseignées trouvées`);
            subjects.forEach(subject => {
                console.log(`  - ${subject.name} (${subject.type}) [${subject.level_groups || 'non défini'}]`);
            });

            // Si aucune matière trouvée, donner des informations de debug
            if (subjects.length === 0) {
                console.log(`[getAuthorizedSubjectsForClass] AUCUNE MATIÈRE TROUVÉE - Vérifications:`);

                // Vérifier si l'enseignant a des matières assignées
                const [teacherSubjects] = await pool.query(`
                    SELECT s.id, s.name FROM teacher_subjects ts
                    JOIN subjects s ON ts.subject_id = s.id
                    WHERE ts.teacher_id = ?
                `, [teacherId]);
                console.log(`  - Matières assignées à l'enseignant: ${teacherSubjects.length}`);
                teacherSubjects.forEach(subject => {
                    console.log(`    * ${subject.name}`);
                });

                // Vérifier si l'enseignant a un emploi du temps pour cette classe
                const [schedules] = await pool.query(`
                    SELECT sch.id, s.name as subject_name FROM schedules sch
                    LEFT JOIN subjects s ON sch.subject_id = s.id
                    WHERE sch.teacher_id = ? AND sch.class_id = ?
                `, [teacherId, classId]);
                console.log(`  - Emplois du temps dans cette classe: ${schedules.length}`);
                schedules.forEach(schedule => {
                    console.log(`    * ${schedule.subject_name || 'Activité sans matière'}`);
                });
            }

            res.json({
                class_name: className,
                class_id: classId,
                authorized_subjects: subjects
            });

        } catch (error) {
            console.error('[getAuthorizedSubjectsForClass] Erreur:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Récupérer les notes d'une classe/matière/composition
    getGradesByClassSubject: async(req, res) => {
        try {
            const { class_id, subject_id, composition_id } = req.query;

            console.log('[getGradesByClassSubject] Paramètres reçus:', {
                class_id,
                subject_id,
                composition_id,
                user_id: req.user.id,
                user_role: req.user.role
            });

            if (!class_id || !subject_id || !composition_id) {
                return res.status(400).json({
                    message: 'class_id, subject_id et composition_id sont requis'
                });
            }

            // Vérifier que l'enseignant existe (permissions simplifiées pour le debug)
            const [teacherRows] = await pool.query('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
            if (teacherRows.length === 0) {
                return res.status(404).json({ message: 'Professeur non trouvé' });
            }
            const teacherId = teacherRows[0].id;

            console.log('[getGradesByClassSubject] Enseignant trouvé, ID:', teacherId);
            console.log('[getGradesByClassSubject] Accès autorisé temporairement pour debug');

            // Vérifier que la composition existe et est active
            const [compositionCheck] = await pool.query(`
                SELECT name, start_date, end_date, is_active, description
                FROM compositions 
                WHERE id = ?
            `, [composition_id]);

            if (compositionCheck.length === 0) {
                return res.status(404).json({ message: 'Composition non trouvée' });
            }

            if (!compositionCheck[0].is_active) {
                return res.status(400).json({ message: 'Cette composition n\'est pas active' });
            }

            // Récupérer les notes
            const currentSchoolYear = require('../config/schoolYear').getCurrentSchoolYear();

            console.log('[getGradesByClassSubject] Année scolaire courante:', currentSchoolYear);

            const query = `
                SELECT 
                    g.id,
                    g.student_id,
                    g.grade,
                    g.composition_id,
                    g.coefficient,
                    g.created_at,
                    g.is_published,
                    g.school_year,
                    s.first_name,
                    s.last_name,
                    c.name as composition_name
                FROM grades g
                JOIN students s ON g.student_id = s.id
                JOIN compositions c ON g.composition_id = c.id
                WHERE g.class_id = ? AND g.bulletin_subject_id = ? AND g.composition_id = ?
                ORDER BY s.last_name, s.first_name
            `;

            console.log('[getGradesByClassSubject] Requête SQL:', query);
            console.log('[getGradesByClassSubject] Paramètres:', [class_id, await resolveBulletinSubjectId(subject_id, class_id), composition_id]);

            const [grades] = await pool.query(query, [class_id, await resolveBulletinSubjectId(subject_id, class_id), composition_id]);

            console.log(`[getGradesByClassSubject] ${grades.length} notes trouvées pour la composition ${compositionCheck[0].name}`);
            console.log('[getGradesByClassSubject] Notes détaillées:', grades);

            res.json({
                grades: grades,
                composition: compositionCheck[0],
                total_students: grades.length
            });

        } catch (error) {
            console.error('[getGradesByClassSubject] Erreur:', error);
            res.status(500).json({ message: error.message });
        }
    },
};

module.exports = teacherController;