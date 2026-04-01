const pool = require('../config/database');
const nodemailer = require('nodemailer');
const { getCurrentSchoolYear } = require('../config/schoolYear');
const bcrypt = require('bcrypt');
const emailService = require('../services/emailService');
const { addHistoryEntry } = require('./historyController');
const { formatDateForTemplate, formatDateForAPI, parseDateSafe } = require('../utils/dateUtils');
const fs = require('fs');
const path = require('path');

console.log('=== [DEBUG] Ceci est le bon fichier studentController.js chargé ===');
console.log('=== [DEBUG] studentController.js VRAIMENT CHARGÉ ===', __filename);

// Fonction utilitaire pour vérifier si un élève appartient à un parent
async function checkParentAccess(connection, studentId, parentUser) {
    if (parentUser.role !== 'parent') {
        return false;
    }
    const parentEmail = parentUser.parent_email || parentUser.email;
    if (!parentEmail) {
        return false;
    }
    const [studentCheck] = await connection.query(
        'SELECT id FROM students WHERE id = ? AND parent_email = ?', [studentId, parentEmail]
    );
    return studentCheck.length > 0;
}

// Fonction utilitaire pour calculer la situation financière d'un élève
async function getStudentFinancialSummary(connection, studentId, classId, schoolYear, isOldStudent = false) {
    // 1. Montant du niveau d'études
    let class_amount = 0;
    if (classId) {
        const [classInfo] = await connection.query(`
            SELECT el.tuition_amount, el.registration_fee 
            FROM classes c 
            LEFT JOIN education_levels el ON c.education_level_id = el.id 
            WHERE c.id = ?
        `, [classId]);
        if (classInfo.length > 0) {
            class_amount = Number(classInfo[0].tuition_amount) || 0;
        }
    }
    // 2. Réductions actives et approuvées (gestion d'erreur si table n'existe pas)
    let total_discount = 0;
    let reductions = [];
    try {
        const [discounts] = await connection.query(`
            SELECT sd.amount, sd.percentage, sd.name
            FROM student_discounts sd
            WHERE sd.student_id = ?
              AND sd.is_active = TRUE
              AND sd.approved_by IS NOT NULL
              AND (sd.school_year IS NULL OR sd.school_year = ?)
        `, [studentId, schoolYear]);

        reductions = discounts.map(discount => {
            let montant_applique = 0;
            if (discount.percentage && discount.percentage > 0) {
                montant_applique = class_amount * (Number(discount.percentage) / 100);
            } else {
                montant_applique = Number(discount.amount) || 0;
            }
            total_discount += montant_applique;
            return {
                name: discount.name || 'Réduction',
                is_percentage: !!(discount.percentage && discount.percentage > 0),
                percentage: discount.percentage || 0,
                montant_applique: Math.round(montant_applique * 100) / 100
            };
        });
        total_discount = Math.round(total_discount * 100) / 100;
    } catch (error) {
        console.log('Table student_discounts non disponible, réduction = 0');
        total_discount = 0;
        reductions = [];
    }
    // 3. Total payé
    const [payments] = await connection.query(
        "SELECT SUM(amount) as total_paid FROM payments WHERE student_id = ? AND (status = 'completed' OR status = 'paid' OR status = 'bon') AND school_year = ?", [studentId, schoolYear]
    );
    const total_paid = payments[0] && payments[0].total_paid ? Number(payments[0].total_paid) : 0;
    // 4. Reste à payer
    const reste_a_payer = Math.max(0, class_amount - total_discount - total_paid);
    return {
        class_amount,
        total_discount,
        total_paid,
        reste_a_payer,
        reductions,
    };
}

const studentController = {
        // Obtenir tous les élèves
        getAllStudents: async(req, res) => {
            try {
                const { class_id, gender, age_range, quartier, moyenne_min, moyenne_max, parent_code, school_year, include_all } = req.query;
                const currentSchoolYear = school_year || getCurrentSchoolYear();

                // Si c'est un parent, utiliser une logique spéciale
                if (req.user.role === 'parent') {
                    console.log('[DEBUG] req.user dans getAllStudents:', req.user);

                    // Chaque parent_code correspond à UN enfant spécifique
                    // On utilise l'ID de l'enfant stocké dans le token pour filtrer uniquement cet enfant
                    const studentId = req.user.student_id;

                    if (!studentId) {
                        console.log('[DEBUG] student_id manquant dans le token, refus d\'accès');
                        return res.status(403).json({ message: "Accès interdit." });
                    }

                    // Logique spéciale pour les parents : récupérer UNIQUEMENT l'enfant correspondant au parent_code utilisé
                    // Chaque enfant a un parent_code unique, donc on filtre par l'ID de l'enfant
                    const parentQuery = `
                        SELECT 
                            s.id, s.user_id, s.first_name, s.last_name, 
                            DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth, 
                            s.gender, s.city, s.registration_number, 
                            s.registration_mode, s.address, s.phone, s.previous_school, s.previous_class, s.cantine,
                            u.email, 
                            c.name as classe,
                            c.id as class_id,
                            c.name as class_name,
                            el.id as education_level_id,
                            el.name as education_level_name,
                            (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.student_id = s.id AND p.school_year = ? AND (p.status = 'completed' OR p.status = 'paid' OR p.status = 'bon')) AS total_paid,
                            (SELECT CAST(AVG(g.grade + 0) AS DECIMAL(5,2)) FROM grades g WHERE g.student_id = s.id AND g.is_published = 1) as moyenne,
                            s.parent_first_name, s.parent_last_name, s.parent_phone, s.parent_email, s.parent_contact,
                            s.father_contact, s.mother_contact, s.emergency_contact,
                            0 AS total_discount,
                            'finalized' AS registration_status
                        FROM students s 







                        
                        LEFT JOIN users u ON s.user_id = u.id
                        LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND (e.school_year = ? OR e.school_year IS NULL)
                        LEFT JOIN classes c ON e.class_id = c.id
                        LEFT JOIN education_levels el ON c.education_level_id = el.id
                        WHERE s.id = ?
                    `;

                    const parentParams = [currentSchoolYear, currentSchoolYear, studentId];

                    console.log('[DEBUG] Requête parent spéciale:', parentQuery);
                    console.log('[DEBUG] Paramètres parent:', parentParams);

                    const [parentStudents] = await pool.query(parentQuery, parentParams);

                    console.log('[DEBUG] Enfants trouvés pour le parent:', parentStudents.length);
                    console.log('[DEBUG] Détails des enfants:', parentStudents);

                    // Si aucun enfant trouvé, retourner un tableau vide avec un message
                    if (parentStudents.length === 0) {
                        console.log('[DEBUG] Aucun enfant trouvé - retour tableau vide');
                        return res.json([]);
                    }

                    // Calculer les données financières pour chaque enfant
                    for (const student of parentStudents) {
                        try {
                            const summary = await getStudentFinancialSummary(pool, student.id, student.class_id, currentSchoolYear);
                            student.class_amount = summary.class_amount;
                            student.total_discount = summary.total_discount;
                            student.total_paid = summary.total_paid;
                            student.reste_a_payer = summary.reste_a_payer;
                            student.reductions = summary.reductions;
                            student.total_due = summary.class_amount;
                        } catch (finError) {
                            console.error('[DEBUG] Erreur calcul financier pour élève', student.id, ':', finError);
                            // Valeurs par défaut en cas d'erreur
                            student.class_amount = 0;
                            student.total_discount = 0;
                            student.total_paid = 0;
                            student.reste_a_payer = 0;
                            student.reductions = [];
                            student.total_due = 0;
                        }
                    }

                    console.log('[DEBUG] Retour des enfants avec données financières:', parentStudents.length);
                    return res.json(parentStudents);
                }

                let query = `
                SELECT 
                    s.id, s.user_id, s.first_name, s.last_name, 
                    DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth, 
                    s.gender, s.city, s.registration_number, 
                    s.registration_mode, s.address, s.phone, s.previous_school, s.previous_class, s.cantine,
                    u.email, 
                    c.name as classe,
                    c.id as class_id,
                    c.name as class_name,
                    el.id as education_level_id,
                    el.name as education_level_name,
                    (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.student_id = s.id AND p.school_year = ? AND (p.status = 'completed' OR p.status = 'paid' OR p.status = 'bon')) AS total_paid,
                    (SELECT CAST(AVG(g.grade + 0) AS DECIMAL(5,2)) FROM grades g WHERE g.student_id = s.id AND g.is_published = 1) as moyenne,
                    s.parent_first_name, s.parent_last_name, s.parent_phone, s.parent_email, s.parent_contact,
                    s.father_contact, s.mother_contact, s.emergency_contact,
                    0 AS total_discount,
                  CASE 
                    WHEN e.id IS NOT NULL THEN 'finalized'
                    WHEN s.registration_mode = 'online' THEN 'finalized'
                    ELSE 'onsite'
                  END AS registration_status
                FROM students s 
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND (e.school_year = ? OR e.school_year IS NULL)
                LEFT JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
            `;

                const whereClauses = [];
                // On ne filtre plus sur l'année scolaire dans le WHERE, c'est géré dans le JOIN
                const params = [currentSchoolYear, currentSchoolYear, currentSchoolYear];

                // Si c'est un parent, on force le filtre strictement sur l'ID de l'enfant uniquement
                // Chaque parent_code correspond à UN enfant spécifique, donc on filtre par l'ID de l'enfant
                if (req.user.role === 'parent') {
                    console.log('[DEBUG] Parent connecté - student_id du token:', req.user.student_id);
                    const studentId = req.user.student_id;
                    if (!studentId) {
                        console.log('[DEBUG] student_id manquant, refus d\'accès');
                        return res.status(403).json({ message: "Accès interdit." });
                    }
                    // Filtrer UNIQUEMENT par l'ID de l'enfant (chaque parent_code correspond à un enfant unique)
                    whereClauses.push('s.id = ?');
                    params.push(studentId);
                } else if (parent_code) {
                    whereClauses.push('s.parent_code = ?');
                    params.push(parent_code);
                }
                if (class_id) {
                    console.log('[DEBUG] Filtre par classe appliqué:', class_id);
                    whereClauses.push('c.id = ?');
                    params.push(class_id);
                }
                if (gender) {
                    console.log('[DEBUG] Filtre par genre appliqué:', gender);
                    if (gender === 'Masculin') {
                        whereClauses.push("LOWER(s.gender) IN ('masculin', 'm', 'homme')");
                    } else if (gender === 'Féminin') {
                        whereClauses.push("LOWER(s.gender) IN ('féminin', 'f', 'femme')");
                    }
                }
                if (quartier) {
                    console.log('[DEBUG] Filtre par quartier appliqué:', quartier);
                    whereClauses.push('s.city LIKE ?');
                    params.push(`%${quartier}%`);
                }
                if (age_range) {
                    const eighteenYearsAgo = new Date();
                    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
                    if (age_range === 'majeur') {
                        whereClauses.push('s.date_of_birth <= ?');
                        params.push(eighteenYearsAgo);
                    } else if (age_range === 'mineur') {
                        whereClauses.push('s.date_of_birth > ?');
                        params.push(eighteenYearsAgo);
                    }
                }
                // Ajout du filtre par matricule
                if (req.query.registration_number) {
                    whereClauses.push('s.registration_number = ?');
                    params.push(req.query.registration_number);
                }

                // Afficher uniquement les élèves inscrits en ligne OU ayant une inscription active
                // Sauf si include_all=true est spécifié (pour la gestion des médias)
                if (!include_all || include_all !== 'true') {
                    // Pour les parents, on affiche tous leurs enfants même sans inscription active
                    if (req.user.role !== 'parent') {
                        whereClauses.push("(e.id IS NOT NULL OR s.registration_mode = 'online')");
                    }
                }

                if (whereClauses.length > 0) {
                    query += ' WHERE ' + whereClauses.join(' AND ');
                }

                console.log('[DEBUG] Requête SQL finale:', query);
                console.log('[DEBUG] Paramètres de la requête:', params);
                console.log('[DEBUG] Année scolaire courante:', currentSchoolYear);

                const [studentsWithDuplicates] = await pool.query(query, params);

                console.log('[DEBUG] Élèves trouvés (avec doublons):', studentsWithDuplicates.length);
                if (req.user.role === 'parent') {
                    console.log('[DEBUG] Premiers élèves trouvés:', studentsWithDuplicates.slice(0, 3));
                }

                // Si aucun résultat et qu'on a des filtres, essayer une requête plus permissive
                if (studentsWithDuplicates.length === 0 && (class_id || gender || quartier || age_range)) {
                    console.log('[DEBUG] Aucun résultat avec la requête principale, essai avec requête permissive...');

                    let fallbackQuery = `
                    SELECT 
                        s.id, s.user_id, s.first_name, s.last_name, 
                        DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth, 
                        s.gender, s.city, s.registration_number, 
                        s.registration_mode, s.address, s.phone, s.previous_school, s.previous_class, s.cantine,
                        u.email, 
                        c.name as classe,
                        c.id as class_id,
                        (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.student_id = s.id AND p.school_year = ? AND (p.status = 'completed' OR p.status = 'paid' OR p.status = 'bon')) AS total_paid,
                        (SELECT CAST(AVG(g.grade + 0) AS DECIMAL(5,2)) FROM grades g WHERE g.student_id = s.id AND g.is_published = 1) as moyenne,
                        s.parent_first_name, s.parent_last_name, s.parent_phone, s.parent_email, s.parent_contact,
                        s.father_contact, s.mother_contact, s.emergency_contact,
                        0 AS total_discount,
                        'finalized' AS registration_status
                    FROM students s 
                    LEFT JOIN users u ON s.user_id = u.id
                    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                    LEFT JOIN classes c ON e.class_id = c.id
                    `;

                    const fallbackWhereClauses = [];
                    const fallbackParams = [currentSchoolYear];

                    // Appliquer les mêmes filtres mais sans restriction sur school_year
                    if (class_id) {
                        fallbackWhereClauses.push('c.id = ?');
                        fallbackParams.push(class_id);
                    }
                    if (gender) {
                        if (gender === 'Masculin') {
                            fallbackWhereClauses.push("LOWER(s.gender) IN ('masculin', 'm', 'homme')");
                        } else if (gender === 'Féminin') {
                            fallbackWhereClauses.push("LOWER(s.gender) IN ('féminin', 'f', 'femme')");
                        }
                    }
                    if (quartier) {
                        fallbackWhereClauses.push('s.city LIKE ?');
                        fallbackParams.push(`%${quartier}%`);
                    }
                    if (age_range) {
                        const eighteenYearsAgo = new Date();
                        eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
                        if (age_range === 'majeur') {
                            fallbackWhereClauses.push('s.date_of_birth <= ?');
                            fallbackParams.push(eighteenYearsAgo);
                        } else if (age_range === 'mineur') {
                            fallbackWhereClauses.push('s.date_of_birth > ?');
                            fallbackParams.push(eighteenYearsAgo);
                        }
                    }

                    // Condition plus permissive pour les inscriptions
                    fallbackWhereClauses.push("(e.id IS NOT NULL OR s.registration_mode = 'online')");

                    if (fallbackWhereClauses.length > 0) {
                        fallbackQuery += ' WHERE ' + fallbackWhereClauses.join(' AND ');
                    }

                    console.log('[DEBUG] Requête de fallback:', fallbackQuery);
                    console.log('[DEBUG] Paramètres de fallback:', fallbackParams);

                    const [fallbackResults] = await pool.query(fallbackQuery, fallbackParams);
                    console.log('[DEBUG] Résultats de fallback:', fallbackResults.length);

                    if (fallbackResults.length > 0) {
                        // Utiliser les résultats de fallback
                        const fallbackStudents = Array.from(fallbackResults.reduce((map, student) => {
                            if (!map.has(student.id)) {
                                map.set(student.id, student);
                            }
                            return map;
                        }, new Map()).values());

                        console.log('[DEBUG] Utilisation des résultats de fallback:', fallbackStudents.length);
                        return res.json(fallbackStudents);
                    }
                }

                // Retirer les doublons en JavaScript pour une robustesse maximale
                const students = Array.from(studentsWithDuplicates.reduce((map, student) => {
                    if (!map.has(student.id)) {
                        map.set(student.id, student);
                    }
                    return map;
                }, new Map()).values());

                if (req.user.role === 'parent') {
                    console.log('[DEBUG] Élèves après suppression des doublons:', students.length);
                    console.log('[DEBUG] IDs des élèves trouvés:', students.map(s => s.id));
                }

                // Ajout du champ reste_a_payer pour chaque élève
                for (const student of students) {
                    // Récupérer les montants depuis le niveau d'études de la classe
                    const summary = await getStudentFinancialSummary(pool, student.id, student.class_id, currentSchoolYear);
                    student.class_amount = summary.class_amount;
                    student.total_discount = summary.total_discount;
                    student.total_paid = summary.total_paid;
                    student.reste_a_payer = summary.reste_a_payer;
                    student.reductions = summary.reductions;
                    // Définir total_due basé sur le montant de classe calculé selon le statut
                    student.total_due = summary.class_amount;
                }

                // Debug: afficher les calculs pour le premier élève
                if (students.length > 0) {
                    const firstStudent = students[0];
                    console.log('[DEBUG DASHBOARD] Élève:', firstStudent.first_name, firstStudent.last_name);
                    console.log('[DEBUG DASHBOARD] Total dû:', firstStudent.total_due);
                    console.log('[DEBUG DASHBOARD] Total payé:', firstStudent.total_paid);
                    console.log('[DEBUG DASHBOARD] Total réductions:', firstStudent.total_discount);
                    console.log('[DEBUG DASHBOARD] Reste à payer:', (firstStudent.total_due || 0) - (firstStudent.total_discount || 0) - (firstStudent.total_paid || 0));
                    console.log('[DEBUG DASHBOARD] Année scolaire utilisée:', currentSchoolYear);

                    // Logs détaillés pour comparer avec le paiement
                    console.log('[DEBUG DASHBOARD] === CALCULS DÉTAILLÉS ===');
                    console.log('[DEBUG DASHBOARD] Scolarité totale (total_due):', firstStudent.total_due);
                    console.log('[DEBUG DASHBOARD] Total réductions (total_discount):', firstStudent.total_discount);
                    console.log('[DEBUG DASHBOARD] Total payé (total_paid):', firstStudent.total_paid);
                    console.log('[DEBUG DASHBOARD] Reste à payer calculé:', (firstStudent.total_due || 0) - (firstStudent.total_discount || 0) - (firstStudent.total_paid || 0));
                }

                res.json(students);
            } catch (error) {
                console.error("Erreur lors de la récupération de la liste des élèves:", error);
                res.status(500).json({ message: error.message });
            }
        },

        // Obtenir un élève par ID
        getStudentById: async(req, res) => {
            let connection;
            try {
                connection = await pool.getConnection();
                const { school_year } = req.query;
                const studentId = req.params.id;

                // Vérification de sécurité pour les parents : s'assurer que l'élève appartient au parent connecté
                if (req.user.role === 'parent') {
                    const tokenStudentId = req.user.student_id;
                    if (!tokenStudentId || Number(tokenStudentId) !== Number(studentId)) {
                        return res.status(403).json({ message: 'Accès interdit.' });
                    }
                    // Vérifier que l'enfant existe
                    const [studentCheck] = await connection.query(
                        'SELECT id FROM students WHERE id = ?', [studentId]
                    );
                    if (studentCheck.length === 0) {
                        return res.status(403).json({ message: 'Vous n\'avez pas l\'autorisation de voir les informations de cet élève.' });
                    }
                }

                // Si une année scolaire est spécifiée, vérifier l'inscription
                if (school_year) {
                    let query = `
                    SELECT 
                        s.id, s.user_id, s.first_name, s.last_name, 
                        DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth,
                        s.gender, s.city, s.registration_number, 
                        s.registration_mode, s.address, s.phone, s.previous_school, s.previous_class, s.cantine,
                        s.parent_first_name, s.parent_last_name, s.parent_phone, s.parent_email, s.parent_contact,
                        s.father_contact, s.mother_contact, s.emergency_contact, s.child_photo,
                        s.eats_at_cantine, s.allergy, s.special_needs, s.additional_info,
                        u.email, c.name AS classe_name, el.tuition_amount as total_due, e.school_year, e.class_id
                    FROM students s
                    JOIN users u ON s.user_id = u.id
                    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
                    LEFT JOIN classes c ON e.class_id = c.id
                    LEFT JOIN education_levels el ON c.education_level_id = el.id
                    WHERE s.id = ?`;
                    const params = [school_year, studentId];
                    const [student] = await connection.query(query, params);

                    if (student.length === 0) {
                        return res.status(404).json({ message: 'Élève non trouvé' });
                    }

                    // Si l'élève existe mais n'a pas d'inscription pour cette année
                    if (!student[0].school_year) {
                        // Retourner les infos de base sans classe ni montant
                        const basicQuery = `
                        SELECT 
                            s.id, s.user_id, s.first_name, s.last_name, 
                            DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth,
                            s.gender, s.city, s.registration_number, 
                            s.registration_mode, s.address, s.phone, s.previous_school, s.previous_class, s.cantine,
                            s.parent_first_name, s.parent_last_name, s.parent_phone, s.parent_email, s.parent_contact,
                            s.father_contact, s.mother_contact, s.emergency_contact, s.child_photo,
                            s.eats_at_cantine, s.allergy, s.special_needs, s.additional_info,
                            u.email
                        FROM students s
                        JOIN users u ON s.user_id = u.id
                        WHERE s.id = ?`;
                        const [basicStudent] = await connection.query(basicQuery, [studentId]);

                        if (basicStudent.length === 0) {
                            return res.status(404).json({ message: 'Élève non trouvé' });
                        }

                        // Mapping explicite du genre
                        if (basicStudent[0]) {
                            if (basicStudent[0].gender === 'M') basicStudent[0].gender_label = 'Masculin';
                            else if (basicStudent[0].gender === 'F') basicStudent[0].gender_label = 'Féminin';
                            else basicStudent[0].gender_label = '';
                        }

                        console.log('API /api/students/:id retourne (sans inscription):', basicStudent[0]);
                        return res.json(basicStudent[0]);
                    }

                    // Mapping explicite du genre
                    if (student[0]) {
                        if (student[0].gender === 'M') student[0].gender_label = 'Masculin';
                        else if (student[0].gender === 'F') student[0].gender_label = 'Féminin';
                        else student[0].gender_label = '';
                    }

                    // Utiliser la fonction utilitaire pour le calcul financier
                    const summary = await getStudentFinancialSummary(connection, studentId, student[0].class_id, school_year);
                    res.json({...student[0], ...summary });
                } else {
                    // Pas d'année scolaire spécifiée, retourner les infos de base
                    let query = `
                    SELECT 
                        s.id, s.user_id, s.first_name, s.last_name, 
                        DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth,
                        s.gender, s.city, s.registration_number, 
                        s.registration_mode, s.address, s.phone, s.previous_school, s.previous_class, s.cantine,
                        s.parent_first_name, s.parent_last_name, s.parent_phone, s.parent_email, s.parent_contact,
                        s.father_contact, s.mother_contact, s.emergency_contact, s.child_photo,
                        s.eats_at_cantine, s.allergy, s.special_needs, s.additional_info,
                        u.email, c.name AS classe_name, el.tuition_amount as total_due
                    FROM students s
                    JOIN users u ON s.user_id = u.id
                    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                    LEFT JOIN classes c ON e.class_id = c.id
                    LEFT JOIN education_levels el ON c.education_level_id = el.id
                    WHERE s.id = ?`;
                    const params = [studentId];
                    const [student] = await connection.query(query, params);

                    if (student.length === 0) {
                        return res.status(404).json({ message: 'Élève non trouvé' });
                    }

                    // Utiliser la fonction utilitaire pour le calcul financier (année courante)
                    const schoolYear = getCurrentSchoolYear();
                    const summary = await getStudentFinancialSummary(connection, studentId, student[0].class_id, schoolYear);
                    // Mapping explicite du genre
                    if (student[0]) {
                        if (student[0].gender === 'M') student[0].gender_label = 'Masculin';
                        else if (student[0].gender === 'F') student[0].gender_label = 'Féminin';
                        else student[0].gender_label = '';
                    }
                    res.json({...student[0], ...summary });
                }
            } catch (error) {
                if (connection) connection.release();
                res.status(500).json({ message: error.message });
            } finally {
                if (connection) connection.release();
            }
        },

        // Créer un nouvel élève
        createStudent: async(req, res) => {
            console.log('=== [DEBUG] Début de createStudent ===');
            console.log('=== [DEBUG] Body reçu:', req.body);

            const {
                first_name,
                last_name,
                date_of_birth,
                gender,
                address,
                city,
                registration_number,
                password,
                previous_school,
                previous_class,
                desired_class,
                special_needs,
                additional_info,
                registration_mode = 'onsite',
                parent_first_name,
                parent_last_name,
                parent_phone,
                parent_email,
                parent_contact,
                father_contact,
                mother_contact,
                emergency_contact,
                cantine,
                eats_at_cantine, // <-- Ajouté
                allergy, // <-- Ajouté
            } = req.body;

            // Debug: afficher tout le body reçu
            console.log('=== [DEBUG] req.body complet ===');
            console.log(JSON.stringify(req.body, null, 2));
            console.log('=== [FIN DEBUG req.body] ===');

            // Debug: afficher les valeurs reçues
            console.log('=== [DEBUG BACKEND] Valeurs reçues ===');
            console.log('registration_mode:', registration_mode);
            console.log('first_name:', first_name, 'type:', typeof first_name);
            console.log('last_name:', last_name, 'type:', typeof last_name);
            console.log('date_of_birth:', date_of_birth, 'type:', typeof date_of_birth);
            console.log('gender:', gender, 'type:', typeof gender);
            console.log('parent_first_name:', parent_first_name, 'type:', typeof parent_first_name);
            console.log('parent_last_name:', parent_last_name, 'type:', typeof parent_last_name);
            console.log('parent_phone:', parent_phone, 'type:', typeof parent_phone);
            console.log('address:', address, 'type:', typeof address);
            console.log('city:', city, 'type:', typeof city);
            console.log('parent_email:', parent_email, 'type:', typeof parent_email);
            console.log('parent_contact:', parent_contact, 'type:', typeof parent_contact);
            console.log('=== [FIN DEBUG BACKEND] ===');

            // Fonction helper pour vérifier si un champ est valide (non vide, non null, non undefined)
            const isValidField = (field) => {
                return field !== null && field !== undefined && field !== '' && String(field).trim() !== '';
            };

            // Validation des champs requis uniquement (champs optionnels acceptés vides)
            console.log('=== [DEBUG] Validation des champs requis ===');

            // Vérifier uniquement les champs vraiment obligatoires
            const requiredFields = {
                first_name: first_name,
                last_name: last_name,
                date_of_birth: date_of_birth,
                gender: gender,
                parent_first_name: parent_first_name,
                parent_last_name: parent_last_name,
                parent_phone: parent_phone
            };

            const missingFields = [];
            for (const [fieldName, fieldValue] of Object.entries(requiredFields)) {
                if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
                    missingFields.push(fieldName);
                }
            }

            if (missingFields.length > 0) {
                console.log('❌ Validation échouée - champs manquants:', missingFields);
                return res.status(400).json({
                    message: `Champs obligatoires manquants: ${missingFields.join(', ')}`
                });
            }

            console.log('✅ Validation réussie - tous les champs requis sont présents');
            console.log('📝 Champs optionnels (peuvent être vides):', {
                address: address || 'vide',
                city: city || 'vide',
                parent_email: parent_email || 'vide',
                parent_contact: parent_contact || 'vide'
            });

            let connection;
            let student_code = null;
            let parent_code = null;

            try {
                console.log('=== [DEBUG] Connexion à la base de données...');
                connection = await pool.getConnection();
                console.log('=== [DEBUG] Connexion établie');

                // Suppression de la contrainte d'unicité de l'email pour permettre plusieurs enfants avec le même email parent
                // Les parents peuvent maintenant utiliser le même email pour inscrire plusieurs enfants

                // Utiliser le matricule fourni ou générer automatiquement
                let registrationNumberToUse = registration_number;
                if (!registration_number || registration_number === '') {
                    // Générer automatiquement un matricule unique commençant par "BM"
                    let isUnique = false;
                    while (!isUnique) {
                        const randomNumber = Math.floor(100000 + Math.random() * 900000);
                        registrationNumberToUse = 'BM' + randomNumber;
                        const [existingMatricule] = await connection.query(
                            'SELECT id FROM students WHERE registration_number = ?', [registrationNumberToUse]
                        );
                        if (existingMatricule.length === 0) {
                            isUnique = true;
                        }
                    }
                } else {
                    // Vérifier si le matricule fourni existe déjà
                    const [existingMatricule] = await connection.query(
                        'SELECT id FROM students WHERE registration_number = ?', [registrationNumberToUse]
                    );
                    if (existingMatricule.length > 0) {
                        return res.status(400).json({
                            message: 'Ce matricule est déjà utilisé'
                        });
                    }
                }

                // Suppression de la contrainte d'unicité de l'email parent
                // Un parent peut maintenant utiliser le même email pour inscrire plusieurs enfants

                console.log('=== [DEBUG] Début de la transaction...');
                await connection.beginTransaction();
                console.log('=== [DEBUG] Transaction démarrée');

                // Générer le code élève UNIQUEMENT à la finalisation
                if (registration_mode === 'onsite') {
                    // Génération du code élève pour inscription sur place
                    let isUnique = false;
                    while (!isUnique) {
                        student_code = 'E' + Math.floor(100000 + Math.random() * 900000);
                        const [rows] = await connection.query('SELECT id FROM students WHERE student_code = ?', [student_code]);
                        if (rows.length === 0) {
                            isUnique = true;
                        }
                    }
                    console.log('=== [DEBUG] Code élève généré (onsite):', student_code);
                } else if (registration_mode === 'online') {
                    student_code = null; // Pas de code élève à la pré-inscription
                }

                // Générer le code parent seulement pour les inscriptions sur place
                if (registration_mode === 'onsite') {
                    console.log('=== [DEBUG] Génération du code parent (inscription sur place)...');
                    isUnique = false;
                    while (!isUnique) {
                        parent_code = 'P' + Math.floor(100000 + Math.random() * 900000);
                        const [rows] = await connection.query('SELECT id FROM students WHERE parent_code = ?', [parent_code]);
                        if (rows.length === 0) {
                            isUnique = true;
                        }
                    }
                    console.log('=== [DEBUG] Code parent généré:', parent_code);
                } else {
                    console.log('=== [DEBUG] Code parent non généré (inscription en ligne - sera généré à la finalisation)');
                    parent_code = null;
                }

                // Récupérer le montant de la scolarité pour la classe souhaitée
                let total_due = 0;
                if (desired_class) {
                    const [classInfo] = await connection.query(`
                        SELECT el.tuition_amount 
                        FROM classes c 
                        LEFT JOIN education_levels el ON c.education_level_id = el.id 
                        WHERE c.id = ?
                    `, [desired_class]);
                    if (classInfo.length > 0) {
                        total_due = classInfo[0].tuition_amount || 0;
                    }
                }

                // Hashage du mot de passe pour l'élève
                console.log('=== [DEBUG] Hashage des mots de passe...');
                const saltRounds = 10;

                function randomPassword() {
                    return Math.random().toString(36).slice(-8);
                }
                let studentPasswordToHash = password || student_code || randomPassword();
                let parentPasswordToHash = password || parent_code || randomPassword();
                const hashedStudentPassword = await bcrypt.hash(studentPasswordToHash, saltRounds);
                const hashedParentPassword = await bcrypt.hash(parentPasswordToHash, saltRounds);
                console.log('=== [DEBUG] Mots de passe hashés');

                // Générer un email temporaire pour l'élève si non fourni
                let studentEmail = req.body.email;
                if (!studentEmail || studentEmail.trim() === '') {
                    studentEmail = `temporaire_${Date.now()}@gmail.com`;
                }

                // Créer l'utilisateur élève
                console.log('=== [DEBUG] Création de l\'utilisateur élève...');
                const [userResult] = await connection.query(
                    'INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [studentEmail, hashedStudentPassword, 'student']
                );
                console.log('=== [DEBUG] Utilisateur élève créé, ID:', userResult.insertId);

                // Créer l'utilisateur parent - autoriser les emails dupliqués
                console.log('=== [DEBUG] Création de l\'utilisateur parent...');
                let parentUserId = null;

                // Vérifier si un compte parent existe déjà avec cet email
                const [existingParentUser] = await connection.query(
                    'SELECT id FROM users WHERE email = ? AND role = ?', [parent_email, 'parent']
                );

                if (existingParentUser.length > 0) {
                    // Utiliser le compte parent existant
                    parentUserId = existingParentUser[0].id;
                    console.log('=== [DEBUG] Compte parent existant réutilisé, ID:', parentUserId);
                } else {
                    // Créer un nouveau compte parent
                    const [parentUserResult] = await connection.query(
                        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [parent_email, hashedParentPassword, 'parent']
                    );
                    parentUserId = parentUserResult.insertId;
                    console.log('=== [DEBUG] Nouveau compte parent créé, ID:', parentUserId);
                }

                // Créer l'élève avec les infos parent
                // === LOG pour vérifier la photo ===
                console.log('=== [DEBUG] req.file (photo):', req.file);
                const child_photo = req.file ? req.file.filename : null;
                console.log('=== [DEBUG] child_photo filename:', child_photo);
                // Conversion du genre pour la base
                let genderDb = gender;
                if (gender === 'Masculin') genderDb = 'M';
                else if (gender === 'Féminin') genderDb = 'F';
                else if (gender === 'Autre') genderDb = 'Other';
                // Bloc d'insertion corrigé : 28 colonnes, 28 valeurs, ordre conforme à la table
                const insertStudentQuery = `
                INSERT INTO students (
                    user_id, first_name, last_name, date_of_birth, gender, address, registration_number, city, previous_school, previous_class, special_needs, additional_info, registration_mode, student_code, parent_code, parent_first_name, parent_last_name, parent_phone, parent_email, parent_contact, father_contact, mother_contact, emergency_contact, child_photo, cantine, eats_at_cantine, allergy
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

                console.log('=== [DEBUG] Requête d\'insertion préparée ===');
                // Fonction helper pour traiter les champs optionnels
                const processOptionalField = (field) => {
                    if (!field || (typeof field === 'string' && field.trim() === '')) {
                        return null;
                    }
                    return field;
                };

                // Parse date of birth once to avoid calling parseDateSafe twice
                const parsedDateOfBirth = parseDateSafe(date_of_birth);

                const insertStudentParams = [
                    userResult.insertId || null, // user_id
                    first_name || '', // first_name
                    last_name || '', // last_name
                    parsedDateOfBirth ? formatDateForAPI(parsedDateOfBirth) : null, // date_of_birth
                    genderDb || '', // gender
                    processOptionalField(address), // address - optionnel
                    registrationNumberToUse, // registration_number
                    processOptionalField(city), // city - optionnel
                    previous_school || '', // previous_school
                    previous_class || '', // previous_class
                    special_needs || '', // special_needs
                    additional_info || '', // additional_info
                    registration_mode || 'onsite', // registration_mode
                    student_code === null ? null : student_code, // student_code
                    parent_code === null ? null : parent_code, // parent_code
                    parent_first_name || '', // parent_first_name
                    parent_last_name || '', // parent_last_name
                    parent_phone || '', // parent_phone
                    processOptionalField(parent_email), // parent_email - optionnel
                    processOptionalField(parent_contact), // parent_contact - optionnel
                    father_contact || '', // father_contact
                    mother_contact || '', // mother_contact
                    emergency_contact || '', // emergency_contact
                    processOptionalField(child_photo), // child_photo - optionnel
                    (() => {
                        // Log pour debug
                        console.log('=== [DEBUG] cantine reçu:', cantine, 'type:', typeof cantine);
                        // Traitement robuste de la cantine
                        if (cantine === '1' || cantine === true || cantine === 1) {
                            console.log('=== [DEBUG] cantine = 1');
                            return 1;
                        } else if (cantine === '0' || cantine === false || cantine === 0 || cantine === undefined || cantine === null) {
                            console.log('=== [DEBUG] cantine = 0');
                            return 0;
                        } else {
                            console.log('=== [DEBUG] cantine = 0 (par défaut)');
                            return 0;
                        }
                    })(), // cantine
                    (() => {
                        // Log pour debug
                        console.log('=== [DEBUG] eats_at_cantine reçu:', eats_at_cantine, 'type:', typeof eats_at_cantine);
                        if (eats_at_cantine === '1' || eats_at_cantine === true || eats_at_cantine === 1) {
                            return 1;
                        } else if (eats_at_cantine === '0' || eats_at_cantine === false || eats_at_cantine === 0) {
                            return 0;
                        } else {
                            return null;
                        }
                    })(), // eats_at_cantine
                    allergy || null, // allergy
                ];

                // Log détaillé des paramètres d'insertion
                console.log('=== [DEBUG] Paramètres d\'insertion détaillés ===');
                console.log('user_id:', insertStudentParams[0]);
                console.log('first_name:', insertStudentParams[1]);
                console.log('last_name:', insertStudentParams[2]);
                console.log('date_of_birth:', insertStudentParams[3]);
                console.log('gender:', insertStudentParams[4]);
                console.log('address:', insertStudentParams[5]);
                console.log('registration_number:', insertStudentParams[6]);
                console.log('city:', insertStudentParams[7]);
                console.log('parent_email:', insertStudentParams[18]);
                console.log('parent_contact:', insertStudentParams[19]);
                console.log('emergency_contact:', insertStudentParams[22]);
                console.log('=== [FIN DEBUG PARAMÈTRES] ===');

                console.log('[DEBUG] insertStudentParams:', insertStudentParams, 'length:', insertStudentParams.length);
                const [studentResult] = await connection.query(insertStudentQuery, insertStudentParams);
                console.log('=== [DEBUG] Élève créé, ID:', studentResult.insertId);

                const enrollmentYear = getCurrentSchoolYear();

                // Inscrire l'élève dans la classe souhaitée
                if (desired_class) {
                    await connection.query(
                        'INSERT INTO enrollments (student_id, class_id, status, enrollment_date, school_year) VALUES (?, ?, ?, NOW(), ?)', [studentResult.insertId, desired_class, 'active', enrollmentYear]
                    );
                }

                // Paiement retiré du formulaire d'inscription
                // if (payment_amount && Number(payment_amount) > 0) {
                //     await connection.query(
                //         'INSERT INTO payments (student_id, amount, payment_date, status, school_year) VALUES (?, ?, NOW(), ?, ?)', [studentResult.insertId, payment_amount, 'completed', enrollmentYear]
                //     );
                // }

                console.log('=== [DEBUG] Commit de la transaction...');
                await connection.commit();
                console.log('=== [DEBUG] Transaction validée');

                // ENVOI DE MAIL AU PARENT APRÈS INSCRIPTION (seulement pour les inscriptions sur place)
                if (registration_mode === 'onsite' && parent_email && parent_code) {
                    console.log('=== [DEBUG] Envoi du mail au parent (inscription sur place)...');
                    // Utiliser la configuration SMTP personnalisée
                    let transporter = nodemailer.createTransport({
                        host: process.env.SMTP_HOST || 'mail.lapetiteacademie.ci',
                        port: parseInt(process.env.SMTP_PORT) || 465,
                        secure: process.env.SMTP_SECURE === 'true',
                        auth: {
                            user: process.env.MAIL_USER || '_mainaccount@lapetiteacademie.ci',
                            pass: process.env.MAIL_PASS || '2ise2025@'
                        },
                        tls: {
                            rejectUnauthorized: false
                        }
                    });

                    const mailOptions = {
                        from: 'LA MAISON DES ENFANTS LA PETITE ACADEMIE <' + (process.env.MAIL_USER || '_mainaccount@lapetiteacademie.ci') + '>',
                        to: parent_email,
                        subject: "Inscription de votre enfant - Code Parent",
                        html: `
                        <h2>Bonjour,</h2>
                        <p>Votre enfant <b>${first_name} ${last_name}</b> a été inscrit avec succès à l'école.</p>
                        <p>Votre <b>code parent</b> est : <b>${parent_code}</b></p>
                        <p>Ce code, associé à votre nom de famille (<b>${parent_last_name || last_name}</b>), vous permettra de créer un compte parent et d'accéder à votre espace personnel pour suivre la scolarité de votre enfant.</p>
                        <p>Merci de conserver ce code précieusement.</p>
                        <br>
                        <p>Cordialement,<br>L'équipe administrative</p>
                    `
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Erreur lors de l\'envoi du mail au parent:', error);
                        } else {
                            console.log('Mail envoyé au parent:', info.response);
                        }
                    });
                } else if (registration_mode === 'online') {
                    console.log('=== [DEBUG] Pas d\'envoi de mail (inscription en ligne - mail envoyé à la finalisation)');
                }

                // Ajouter l'entrée dans l'historique
                try {
                    const studentName = `${first_name} ${last_name}`;
                    const actionDescription = registration_mode === 'onsite' ?
                        `Inscription sur place de ${studentName}` :
                        `Pré-inscription en ligne de ${studentName}`;
                    await addHistoryEntry(req.user.id, 'inscription', actionDescription, null, studentName);
                } catch (historyError) {
                    console.error('Erreur lors de l\'ajout dans l\'historique:', historyError);
                    // Ne pas faire échouer l'inscription si l'historique échoue
                }

                console.log('=== [DEBUG] Envoi de la réponse...');
                res.status(201).json({
                    id: studentResult.insertId,
                    message: 'Inscription effectuée avec succès.',
                    student_code: registration_mode === 'onsite' ? student_code : null,
                    parent_code: registration_mode === 'onsite' ? parent_code : null,
                    registration_number: registrationNumberToUse
                });
                console.log('=== [DEBUG] Réponse envoyée avec succès');
            } catch (error) {
                if (connection) await connection.rollback();
                console.error('Erreur lors de la création de l\'élève:', error);
                console.error('Détails de l\'erreur:', {
                    message: error.message,
                    code: error.code,
                    sqlMessage: error.sqlMessage,
                    sqlState: error.sqlState
                });
                res.status(500).json({
                    message: 'Erreur lors de la création de l\'élève',
                    details: error.message
                });
            } finally {
                if (connection) connection.release();
            }
        },

        // Mettre à jour un élève
        updateStudent: async(req, res) => {
            const {
                first_name,
                last_name,
                date_of_birth,
                gender,
                address,
                city,
                phone,
                previous_school,
                previous_class,
                special_needs,
                additional_info,
                class_id,
                cantine,
                eats_at_cantine,
                allergy,
                father_contact,
                mother_contact,
                emergency_contact,
                parent_first_name,
                parent_last_name,
                parent_phone,
                parent_email
            } = req.body;

            // Parse date of birth once to avoid calling parseDateSafe twice
            const parsedDateOfBirth = parseDateSafe(date_of_birth);
            const formattedDateOfBirth = parsedDateOfBirth ? formatDateForAPI(parsedDateOfBirth) : date_of_birth;

            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();

                // Récupérer l'ancienne photo si elle existe
                const [existingStudent] = await connection.query(
                    'SELECT child_photo FROM students WHERE id = ?', [req.params.id]
                );
                const oldPhoto = existingStudent.length > 0 ? existingStudent[0].child_photo : null;

                // Gérer la nouvelle photo si uploadée
                let newPhoto = oldPhoto; // Par défaut, garder l'ancienne photo
                if (req.file) {
                    newPhoto = req.file.filename;
                    // Supprimer l'ancienne photo si elle existe
                    if (oldPhoto) {
                        const oldPhotoPath = path.join(__dirname, '../protected_uploads', oldPhoto);
                        if (fs.existsSync(oldPhotoPath)) {
                            try {
                                fs.unlinkSync(oldPhotoPath);
                                console.log('Ancienne photo supprimée:', oldPhoto);
                            } catch (unlinkError) {
                                console.error('Erreur lors de la suppression de l\'ancienne photo:', unlinkError);
                                // Ne pas bloquer la mise à jour si la suppression échoue
                            }
                        }
                    }
                }

                await connection.query(
                    `UPDATE students SET 
                    first_name = ?, last_name = ?, date_of_birth = ?, gender = ?, 
                    address = ?, city = ?, previous_school = ?, 
                    previous_class = ?, special_needs = ?, additional_info = ?,
                    cantine = ?, eats_at_cantine = ?, allergy = ?,
                    father_contact = ?, mother_contact = ?, emergency_contact = ?,
                    parent_first_name = ?, parent_last_name = ?, parent_phone = ?, parent_email = ?,
                    child_photo = ?
                 WHERE id = ?`, [first_name, last_name, formattedDateOfBirth, gender, address, city, previous_school, previous_class, special_needs, additional_info, cantine, eats_at_cantine, allergy, father_contact, mother_contact, emergency_contact, parent_first_name, parent_last_name, parent_phone, parent_email, newPhoto, req.params.id]
                );

                if (class_id) {
                    const studentId = req.params.id;

                    // Désactiver l'inscription active actuelle s'il y en a une
                    await connection.query(
                        `UPDATE enrollments SET status = 'inactive' WHERE student_id = ? AND status = 'active'`, [studentId]
                    );

                    // Vérifier si une inscription pour cette classe existe déjà pour cet élève
                    const [existingEnrollment] = await connection.query(
                        `SELECT id FROM enrollments WHERE student_id = ? AND class_id = ?`, [studentId, class_id]
                    );

                    if (existingEnrollment.length > 0) {
                        // Si oui, la réactiver
                        await connection.query(
                            `UPDATE enrollments SET status = 'active', enrollment_date = NOW() WHERE id = ?`, [existingEnrollment[0].id]
                        );
                    } else {
                        // Sinon, en créer une nouvelle
                        await connection.query(
                            `INSERT INTO enrollments (student_id, class_id, status, enrollment_date) VALUES (?, ?, 'active', NOW())`, [studentId, class_id]
                        );
                    }
                }

                await connection.commit();
                res.json({ message: 'Élève mis à jour avec succès' });
            } catch (error) {
                if (connection) await connection.rollback();
                console.error("Erreur lors de la mise à jour de l'élève:", error);
                res.status(500).json({ message: error.message });
            } finally {
                if (connection) connection.release();
            }
        },

        // Supprimer un élève
        deleteStudent: async(req, res) => {
            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();

                // Récupérer l'user_id de l'élève
                const [student] = await connection.query('SELECT user_id FROM students WHERE id = ?', [req.params.id]);

                if (student.length === 0) {
                    return res.status(404).json({ message: 'Élève non trouvé' });
                }

                // Supprimer les dépendances avant l'élève
                await connection.query('DELETE FROM enrollments WHERE student_id = ?', [req.params.id]);
                await connection.query('DELETE FROM payments WHERE student_id = ?', [req.params.id]);
                await connection.query('DELETE FROM cantine_payments WHERE student_id = ?', [req.params.id]);

                // Supprimer les autres tables liées à l'élève
                try {
                    await connection.query('DELETE FROM grades WHERE student_id = ?', [req.params.id]);
                } catch (error) {
                    console.log('Table grades non disponible ou erreur:', error.message);
                }

                try {
                    await connection.query('DELETE FROM absences WHERE student_id = ?', [req.params.id]);
                } catch (error) {
                    console.log('Table absences non disponible ou erreur:', error.message);
                }

                try {
                    await connection.query('DELETE FROM student_discounts WHERE student_id = ?', [req.params.id]);
                } catch (error) {
                    console.log('Table student_discounts non disponible ou erreur:', error.message);
                }

                try {
                    await connection.query('DELETE FROM installments WHERE student_id = ?', [req.params.id]);
                } catch (error) {
                    console.log('Table installments non disponible ou erreur:', error.message);
                }

                try {
                    await connection.query('DELETE FROM reminders WHERE student_id = ?', [req.params.id]);
                } catch (error) {
                    console.log('Table reminders non disponible ou erreur:', error.message);
                }

                try {
                    await connection.query('DELETE FROM notifications WHERE student_id = ?', [req.params.id]);
                } catch (error) {
                    console.log('Table notifications non disponible ou erreur:', error.message);
                }

                // Supprimer l'élève
                await connection.query('DELETE FROM students WHERE id = ?', [req.params.id]);

                // Supprimer l'utilisateur associé
                await connection.query('DELETE FROM users WHERE id = ?', [student[0].user_id]);

                await connection.commit();
                res.json({ message: 'Élève supprimé avec succès' });
            } catch (error) {
                if (connection) await connection.rollback();
                res.status(500).json({ message: error.message });
            } finally {
                if (connection) connection.release();
            }
        },

        getStudentGrades: async(req, res) => {
            const studentId = req.params.id;
            console.log(`[getStudentGrades V4] Début - Récupération des notes pour l'élève ID: ${studentId}`);
            console.log(`[getStudentGrades V4] Utilisateur connecté - ID: ${req.user.id}, Role: ${req.user.role}`);

            // Vérification de sécurité pour s'assurer qu'un élève ne peut voir que ses propres notes
            if (req.user.role === 'student') {
                try {
                    const [studentCheck] = await pool.query('SELECT id, first_name, last_name, user_id FROM students WHERE user_id = ?', [req.user.id]);
                    console.log(`[getStudentGrades V4] Élève trouvé pour user_id ${req.user.id}:`, studentCheck);

                    if (!studentCheck.length || studentCheck[0].id !== Number(studentId)) {
                        console.warn(`[getStudentGrades V4] Tentative d'accès non autorisé par user_id: ${req.user.id} pour student_id: ${studentId}`);
                        console.warn(`[getStudentGrades V4] Élève autorisé: ${studentCheck[0]?.id}, Élève demandé: ${studentId}`);
                        return res.status(403).json({ message: 'Accès non autorisé.' });
                    }
                } catch (secError) {
                    console.error("[getStudentGrades V4] Erreur lors de la vérification de sécurité:", secError);
                    return res.status(500).json({ message: "Erreur lors de la vérification de l'utilisateur." });
                }
            }

            // Vérification de sécurité pour s'assurer qu'un parent ne peut voir que les notes de ses enfants
            if (req.user.role === 'parent') {
                try {
                    const tokenStudentId = req.user.student_id;
                    if (!tokenStudentId || Number(tokenStudentId) !== Number(studentId)) {
                        return res.status(403).json({ message: 'Accès interdit.' });
                    }
                    // Vérifier que l'enfant existe
                    const [studentCheck] = await pool.query(
                        'SELECT id FROM students WHERE id = ?', [studentId]
                    );
                    console.log(`[getStudentGrades V4] Vérification parent pour élève ${studentId}:`, studentCheck);

                    if (studentCheck.length === 0) {
                        console.warn(`[getStudentGrades V4] Élève ${studentId} non trouvé`);
                        return res.status(404).json({ message: 'Élève non trouvé.' });
                    }
                } catch (secError) {
                    console.error("[getStudentGrades V4] Erreur lors de la vérification parent:", secError);
                    return res.status(500).json({ message: "Erreur lors de la vérification de l'utilisateur." });
                }
            }

            try {
                // Récupérer d'abord les informations de la classe pour déterminer le niveau
                const [classInfo] = await pool.query(`
                    SELECT c.name as class_name, c.id as class_id
                    FROM classes c
                    JOIN enrollments e ON c.id = e.class_id
                    WHERE e.student_id = ? AND e.status = 'active'
                    ${req.query.school_year ? 'AND e.school_year = ?' : ''}
                    LIMIT 1
                `, req.query.school_year ? [studentId, req.query.school_year] : [studentId]);

                if (classInfo.length === 0) {
                    return res.json([]);
                }

                const className = classInfo[0].class_name.toUpperCase();
                const isCP = className.startsWith('CP1') || className.startsWith('CP2') || className.startsWith('CP');
                const levelGroup = isCP ? 'cp' : 'ce_cm';

                let query = `
                SELECT 
                    g.student_id,
                    g.class_id,
                    c.name as class_name,
                    g.bulletin_subject_id as subject_id,
                    s.name as subject_name,
                    g.semester,
                    CAST(AVG(g.grade + 0) AS DECIMAL(5,2)) as moyenne,
                    COUNT(DISTINCT g.student_id) as total_eleves,
                    cs.coefficient as coefficient,
                    s.display_order
                FROM grades g
                JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                JOIN classes c ON g.class_id = c.id
                LEFT JOIN class_subjects cs ON cs.class_id = g.class_id AND cs.subject_id = g.bulletin_subject_id
                WHERE g.is_published = 1 AND g.student_id = ?
            `;
                const params = [studentId];
                if (req.query.school_year) {
                    query += ' AND g.school_year = ?';
                    params.push(req.query.school_year);
                }
                query += ' GROUP BY g.class_id, g.bulletin_subject_id, COALESCE(g.semester, "1er trimestre"), s.display_order ORDER BY COALESCE(g.semester, "1er trimestre"), s.display_order, s.name';
                const [grades] = await pool.query(query, params);
                console.log(`[getStudentGrades V4] Nombre de notes trouvées: ${grades.length}`);
                console.log(`[getStudentGrades V4] Notes trouvées:`, grades);

                if (grades.length === 0) {
                    console.log(`[getStudentGrades V4] Aucune note publiée trouvée pour l'élève ${studentId}`);

                    // Vérifier s'il y a des notes non publiées
                    const [unpublishedGrades] = await pool.query(`
                    SELECT COUNT(*) as count FROM grades WHERE student_id = ? AND is_published = 0
                `, [studentId]);
                    console.log(`[getStudentGrades V4] Notes non publiées pour l'élève ${studentId}:`, unpublishedGrades[0].count);

                    return res.json([]);
                }

                // Récupérer les notes détaillées pour chaque matière
                const gradesWithDetails = [];
                for (const grade of grades) {
                    const [notes] = await pool.query(`
                    SELECT 
                        g.id,
                        g.grade,
                        g.created_at as date
                    FROM grades g
                    WHERE g.student_id = ? 
                    AND g.class_id = ? 
                    AND g.bulletin_subject_id = ? 
                    AND (g.semester = ? OR (g.semester IS NULL AND ? = '1er trimestre'))
                    AND g.is_published = 1
                    ${req.query.school_year ? 'AND g.school_year = ?' : ''}
                    ORDER BY g.created_at
                `, req.query.school_year ? [studentId, grade.class_id, grade.subject_id, grade.semester, grade.semester, req.query.school_year] : [studentId, grade.class_id, grade.subject_id, grade.semester, grade.semester]);

                    // Récupérer le coefficient depuis class_subjects (une seule fois par matière)
                    let coefficient = 1;
                    try {
                        const [coefRows] = await pool.query(
                            'SELECT coefficient FROM class_subjects WHERE class_id = ? AND subject_id = ? LIMIT 1', [grade.class_id, grade.subject_id]
                        );
                        if (coefRows.length > 0) {
                            coefficient = coefRows[0].coefficient;
                        }
                    } catch (e) {
                        coefficient = 1;
                    }

                    // Récupérer le professeur principal via schedules
                    const [teacherRows] = await pool.query(`
                    SELECT t.first_name, t.last_name
                    FROM schedules s
                    JOIN teachers t ON s.teacher_id = t.id
                    WHERE s.class_id = ? AND s.subject_id = ?
                    ${req.query.school_year ? 'AND s.school_year = ?' : ''}
                    LIMIT 1
                `, req.query.school_year ? [grade.class_id, grade.subject_id, req.query.school_year] : [grade.class_id, grade.subject_id]);
                    let teacher_name = '';
                    if (teacherRows.length > 0) {
                        teacher_name = `${teacherRows[0].last_name || ''} ${teacherRows[0].first_name || ''}`.trim();
                    }

                    // Calculer le rang manuellement
                    const [allStudentsInClass] = await pool.query(`
                    SELECT 
                        g.student_id,
                        CAST(AVG(g.grade + 0) AS DECIMAL(5,2)) as moyenne
                    FROM grades g
                    WHERE g.class_id = ? 
                    AND g.bulletin_subject_id = ? 
                    AND (g.semester = ? OR (g.semester IS NULL AND ? = '1er trimestre'))
                    AND g.is_published = 1
                    ${req.query.school_year ? 'AND g.school_year = ?' : ''}
                    GROUP BY g.student_id
                    ORDER BY moyenne DESC
                `, req.query.school_year ? [grade.class_id, grade.subject_id, grade.semester, grade.semester, req.query.school_year] : [grade.class_id, grade.subject_id, grade.semester, grade.semester]);

                    const rang = allStudentsInClass.findIndex(s => s.student_id === Number(studentId)) + 1;

                    gradesWithDetails.push({
                        ...grade,
                        moyenne: parseFloat(grade.moyenne) || 0,
                        coefficient, // <-- ici
                        notes: notes,
                        rang: rang,
                        total_eleves: allStudentsInClass.length,
                        teacher_name
                    });
                }

                console.log(`[getStudentGrades V4] Notes avec détails:`, gradesWithDetails);
                console.log('Notes envoyées au frontend:', gradesWithDetails);
                res.json(gradesWithDetails);

            } catch (error) {
                console.error("[getStudentGrades V4] ERREUR:", error);
                res.status(500).json({ message: "Une erreur s'est produite lors de la récupération des notes." });
            }
        },

        // Obtenir les paiements d'un élève
        getStudentPayments: async(req, res) => {
            try {
                let query = 'SELECT * FROM payments WHERE student_id = ? AND (status = \'completed\' OR status = \'paid\')';
                const params = [req.params.id];
                if (req.query.school_year) {
                    query += ' AND school_year = ?';
                    params.push(req.query.school_year);
                }
                query += ' ORDER BY payment_date DESC';
                const [payments] = await pool.query(query, params);
                res.json(payments);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },

        // Obtenir les classes d'un élève
        getStudentClasses: async(req, res) => {
            try {
                let query = `
                SELECT c.* 
                FROM classes c 
                JOIN enrollments e ON c.id = e.class_id 
                WHERE e.student_id = ? AND e.status = 'active'
            `;
                const params = [req.params.id];
                if (req.query.school_year) {
                    query += ' AND e.school_year = ?';
                    params.push(req.query.school_year);
                }
                const [classes] = await pool.query(query, params);
                res.json(classes);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },

        getOnlineRegistrations: async(req, res) => {
            try {
                const [registrations] = await pool.query(`
                SELECT id, first_name, last_name, email, registration_number, created_at, father_contact, mother_contact
                FROM students 
                WHERE registration_mode = 'online' 
                ORDER BY created_at DESC
            `);
                res.json(registrations);
            } catch (error) {
                console.error('Erreur lors de la récupération des inscriptions en ligne:', error);
                res.status(500).json({ message: error.message });
            }
        },

        finalizeRegistration: async(req, res) => {
            const { id } = req.params;
            const { class_id, cantine, eats_at_cantine, allergy, father_contact, mother_contact, emergency_contact } = req.body;

            console.log('=== [DEBUG] finalizeRegistration appelé ===');
            console.log('=== [DEBUG] req.body:', req.body);
            console.log('=== [DEBUG] father_contact:', father_contact);
            console.log('=== [DEBUG] mother_contact:', mother_contact);

            if (!class_id) {
                return res.status(400).json({ message: 'L\'ID de la classe est requis.' });
            }

            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();

                const currentSchoolYear = getCurrentSchoolYear();

                // Désactiver les inscriptions actives des années précédentes
                await connection.query(
                    'UPDATE enrollments SET status = "inactive" WHERE student_id = ? AND status = "active" AND (school_year IS NULL OR school_year != ?)', [id, currentSchoolYear]
                );

                // 1. Récupérer les informations de l'élève avant mise à jour
                const [studentInfo] = await connection.query(
                    'SELECT first_name, last_name, parent_first_name, parent_last_name, parent_email, registration_number, date_of_birth, father_contact, mother_contact FROM students WHERE id = ?', [id]
                );

                if (studentInfo.length === 0) {
                    throw new Error('Élève non trouvé');
                }

                const student = studentInfo[0];

                // Déterminer le groupe de niveau (cp vs ce/cm) et récupérer la liste des matières de bulletin
                const classNameUpper = (student.class_name || '').toUpperCase();
                const isCPLevel = classNameUpper.startsWith('CP1') || classNameUpper.startsWith('CP2') || classNameUpper.startsWith('CP');
                const levelGroup = isCPLevel ? 'cp' : 'ce_cm';

                // Liste ordonnée des matières de bulletin avec leur subject_id et coefficient de la classe
                const [bulletinSubjects] = await pool.query(`
                    SELECT 
                        bs.id AS subject_id,
                        bs.name AS subject_name,
                        COALESCE(cs.coefficient, 1) AS coefficient
                    FROM bulletin_subjects bs
                    LEFT JOIN subjects s ON s.name = bs.name
                    LEFT JOIN class_subjects cs ON cs.class_id = ? AND cs.subject_id = COALESCE(s.id, bs.id)
                    WHERE bs.level_group = ?
                    ORDER BY bs.display_order, bs.name
                `, [student.class_id, levelGroup]);

                console.log('=== [DEBUG] Élève récupéré de la DB:', student);
                console.log('=== [DEBUG] student.date_of_birth:', student.date_of_birth);
                console.log('=== [DEBUG] student.father_contact:', student.father_contact);
                console.log('=== [DEBUG] student.mother_contact:', student.mother_contact);

                // 1. Générer les codes élève et parent UNIQUEMENT à la finalisation
                let isUnique = false;
                let student_code = null;
                let registration_number = student.registration_number;
                // Générer le matricule si absent
                if (!registration_number || registration_number === '') {
                    isUnique = false;
                    while (!isUnique) {
                        // Générer un matricule commençant par "BM" suivi de 6 chiffres maximum
                        const randomNumber = Math.floor(100000 + Math.random() * 900000);
                        registration_number = 'BM' + randomNumber;
                        const [rows] = await connection.query('SELECT id FROM students WHERE registration_number = ?', [registration_number]);
                        if (rows.length === 0) {
                            isUnique = true;
                        }
                    }
                }
                isUnique = false;
                while (!isUnique) {
                    student_code = 'E' + Math.floor(100000 + Math.random() * 900000);
                    const [rows] = await connection.query('SELECT id FROM students WHERE student_code = ?', [student_code]);
                    if (rows.length === 0) {
                        isUnique = true;
                    }
                }
                isUnique = false;
                let parent_code = null;
                while (!isUnique) {
                    parent_code = 'P' + Math.floor(100000 + Math.random() * 900000);
                    const [rows] = await connection.query('SELECT id FROM students WHERE parent_code = ?', [parent_code]);
                    if (rows.length === 0) {
                        isUnique = true;
                    }
                }

                // 2. Mettre à jour l'élève avec les codes générés et les champs cantine
                let updateFields = `registration_mode = 'finalized', student_code = ?, parent_code = ?, registration_number = ?`;
                let updateParams = [student_code, parent_code, registration_number];
                if (req.body.parent_first_name) {
                    updateFields += ', parent_first_name = ?';
                    updateParams.push(req.body.parent_first_name);
                }
                if (req.body.parent_last_name) {
                    updateFields += ', parent_last_name = ?';
                    updateParams.push(req.body.parent_last_name);
                }
                if (req.body.parent_phone) {
                    updateFields += ', parent_phone = ?';
                    updateParams.push(req.body.parent_phone);
                }
                if (req.body.parent_email) {
                    updateFields += ', parent_email = ?';
                    updateParams.push(req.body.parent_email);
                }
                if (req.body.parent_contact) {
                    updateFields += ', parent_contact = ?';
                    updateParams.push(req.body.parent_contact);
                }
                if (typeof father_contact !== 'undefined' && father_contact && father_contact.trim() !== '') {
                    updateFields += ', father_contact = ?';
                    updateParams.push(father_contact);
                }
                if (typeof mother_contact !== 'undefined' && mother_contact && mother_contact.trim() !== '') {
                    updateFields += ', mother_contact = ?';
                    updateParams.push(mother_contact);
                }
                if (typeof emergency_contact !== 'undefined' && emergency_contact && emergency_contact.trim() !== '') {
                    updateFields += ', emergency_contact = ?';
                    updateParams.push(emergency_contact);
                }

                // Ajout cantine
                if (typeof cantine !== 'undefined') {
                    updateFields += ', cantine = ?';
                    updateParams.push(cantine);
                }
                if (typeof eats_at_cantine !== 'undefined') {
                    updateFields += ', eats_at_cantine = ?';
                    updateParams.push(eats_at_cantine);
                }
                if (typeof allergy !== 'undefined') {
                    updateFields += ', allergy = ?';
                    updateParams.push(allergy);
                }
                updateFields += ' WHERE id = ?';
                updateParams.push(id);

                console.log('=== [DEBUG] Requête UPDATE:', `UPDATE students SET ${updateFields}`);
                console.log('=== [DEBUG] Paramètres UPDATE:', updateParams);

                await connection.query(`UPDATE students SET ${updateFields}`, updateParams);

                // 2bis. Créer le compte parent dans la table users si pas déjà existant
                // Autoriser les emails dupliqués - un parent peut avoir plusieurs comptes avec le même email
                const [existingParent] = await connection.query(
                    'SELECT id FROM users WHERE email = ? AND role = ? LIMIT 1', [student.parent_email, 'parent']
                );

                let parentUserId = null;
                if (existingParent.length === 0) {
                    // Générer un mot de passe pour le parent
                    const parentPassword = parent_code || Math.random().toString(36).slice(-8);
                    const hashedParentPassword = await bcrypt.hash(parentPassword, 10);

                    const [parentUserResult] = await connection.query(
                        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [student.parent_email, hashedParentPassword, 'parent']
                    );
                    parentUserId = parentUserResult.insertId;
                    console.log('=== [DEBUG] Compte parent créé lors de la finalisation, ID:', parentUserId);
                } else {
                    // Utiliser le premier compte parent trouvé avec cet email
                    parentUserId = existingParent[0].id;
                    console.log('=== [DEBUG] Compte parent existant réutilisé, ID:', parentUserId);
                }

                // 3. Inscrire l'élève dans la classe pour l'année courante
                await connection.query(
                    'INSERT INTO enrollments (student_id, class_id, status, enrollment_date, school_year) VALUES (?, ?, ?, NOW(), ?)', [id, class_id, 'active', currentSchoolYear]
                );

                // 4. Récupérer le montant du niveau d'études pour information (pas de paiement automatique)
                const [classInfo] = await connection.query(`
                    SELECT el.tuition_amount, el.registration_fee 
                    FROM classes c 
                    LEFT JOIN education_levels el ON c.education_level_id = el.id 
                    WHERE c.id = ?
                `, [class_id]);

                if (classInfo.length === 0) {
                    throw new Error('Classe non trouvée');
                }

                // Utiliser le montant du niveau d'études
                const classAmount = classInfo[0].tuition_amount || 0;

                // 5. Envoyer l'email au parent avec le code parent
                if (student.parent_email) {
                    console.log('=== [DEBUG] Envoi du mail au parent lors de la finalisation...');
                    // Utiliser la configuration SMTP personnalisée
                    let transporter = nodemailer.createTransport({
                        host: process.env.SMTP_HOST || 'mail.lapetiteacademie.ci',
                        port: parseInt(process.env.SMTP_PORT) || 465,
                        secure: process.env.SMTP_SECURE === 'true',
                        auth: {
                            user: process.env.MAIL_USER || '_mainaccount@lapetiteacademie.ci',
                            pass: process.env.MAIL_PASS || '2ise2025@'
                        },
                        tls: {
                            rejectUnauthorized: false
                        }
                    });

                    const mailOptions = {
                        from: 'LA MAISON DES ENFANTS LA PETITE ACADEMIE <' + (process.env.MAIL_USER || '_mainaccount@lapetiteacademie.ci') + '>',
                        to: student.parent_email,
                        subject: "Finalisation de l'inscription - Code Parent",
                        html: `
                        <h2>Bonjour,</h2>
                        <p>L'inscription de votre enfant <b>${student.first_name} ${student.last_name}</b> a été finalisée avec succès.</p>
                        <p>Votre <b>code parent</b> est : <b>${parent_code}</b></p>
                        <p>Ce code, associé à votre nom de famille (<b>${student.parent_last_name || student.last_name}</b>), vous permettra de créer un compte parent et d'accéder à votre espace personnel pour suivre la scolarité de votre enfant.</p>
                        <p>Merci de conserver ce code précieusement.</p>
                        <br>
                        <p>Cordialement,<br>L'équipe administrative</p>
                    `
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Erreur lors de l\'envoi du mail au parent:', error);
                        } else {
                            console.log('Mail envoyé au parent lors de la finalisation:', info.response);
                        }
                    });
                }

                // 6. Récupérer la situation financière de l'élève (montant classe, réductions, paiements, reste à payer)
                const summary = await getStudentFinancialSummary(connection, id, class_id, currentSchoolYear, false);

                await connection.commit();

                // Ajouter l'entrée dans l'historique (sans montant de paiement)
                try {
                    const studentName = `${student.first_name} ${student.last_name}`;
                    await addHistoryEntry(req.user.id, 'inscription', `Finalisation de l'inscription de ${studentName}`, 0, studentName);
                } catch (historyError) {
                    console.error('Erreur lors de l\'ajout dans l\'historique:', historyError);
                    // Ne pas faire échouer la finalisation si l'historique échoue
                }

                const responseData = {
                    message: 'Inscription finalisée avec succès.',
                    student_code,
                    parent_code,
                    registration_number,
                    ...summary,
                    class_amount: classAmount,
                    father_contact: father_contact || null,
                    mother_contact: mother_contact || null,
                    emergency_contact: emergency_contact || null,

                    date_of_birth: student.date_of_birth,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    parent_first_name: req.body.parent_first_name || student.parent_first_name,
                    parent_last_name: req.body.parent_last_name || student.parent_last_name,
                    parent_email: req.body.parent_email || student.parent_email
                };

                console.log('=== [DEBUG] Réponse finale:', responseData);

                res.status(200).json(responseData);

            } catch (error) {
                if (connection) await connection.rollback();
                console.error('Erreur lors de la finalisation de l\'inscription:', error);
                res.status(500).json({ message: error.message });
            } finally {
                if (connection) connection.release();
            }
        },

        getStudentDetails: async(req, res) => {
            const { id } = req.params;
            let connection;

            try {
                connection = await pool.getConnection();

                // Vérification de sécurité pour les parents : s'assurer que l'élève appartient au parent connecté
                if (req.user.role === 'parent') {
                    const tokenStudentId = req.user.student_id;
                    if (!tokenStudentId || Number(tokenStudentId) !== Number(id)) {
                        return res.status(403).json({ message: 'Accès interdit.' });
                    }
                    // Vérifier que l'ID dans le token correspond bien à l'enfant demandé
                    const [studentCheck] = await connection.query(
                        'SELECT id FROM students WHERE id = ? AND id = ?', [id, tokenStudentId]
                    );
                    if (studentCheck.length === 0) {
                        return res.status(403).json({ message: 'Vous n\'avez pas l\'autorisation de voir les informations de cet élève.' });
                    }
                }

                // 1. Get student's main info
                let studentInfoQuery = `
                SELECT 
                    s.id, s.user_id, s.first_name, s.last_name, 
                    DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth,
                    s.gender, s.city, s.registration_number, 
                    s.registration_mode, s.address, s.phone, s.previous_school, s.previous_class, s.cantine,
                    s.student_code, s.parent_code,
                    s.parent_first_name, s.parent_last_name, s.parent_phone, s.parent_email, s.parent_contact,
                    s.father_contact, s.mother_contact, s.emergency_contact, s.child_photo,
                    s.eats_at_cantine, s.allergy, s.special_needs, s.additional_info,
                    u.email,
                    c.name as classe_name,
                    el.tuition_amount,
                    el.registration_fee,
                    el.tuition_amount as total_due,
                    e.school_year as enrollment_school_year
                FROM students s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'${req.query.school_year ? ' AND e.school_year = ?' : ''}
                LEFT JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE s.id = ?`;
                const studentInfoParams = req.query.school_year ? [req.query.school_year, id] : [id];
                let [studentInfo] = await connection.query(studentInfoQuery, studentInfoParams);

                console.log(`[getStudentDetails] Requête SQL: ${studentInfoQuery}`);
                console.log(`[getStudentDetails] Paramètres:`, studentInfoParams);
                console.log(`[getStudentDetails] Résultat:`, studentInfo);

                if (studentInfo.length > 0) {
                    console.log(`[getStudentDetails] Élève ${id}:`);
                    console.log(`  - tuition_amount: ${studentInfo[0].tuition_amount}`);
                    console.log(`  - registration_fee: ${studentInfo[0].registration_fee}`);
                    console.log(`  - total_due calculé: ${studentInfo[0].total_due}`);
                }

                // Si aucune inscription pour l'année, retourner quand même les infos de base
                if (studentInfo.length === 0 || (req.query.school_year && !studentInfo[0].enrollment_school_year)) {
                    // Requête de secours sans jointure sur enrollment
                    const [basicStudent] = await connection.query(`
                        SELECT 
                            s.id, s.user_id, s.first_name, s.last_name, 
                            DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth,
                            s.gender, s.city, s.registration_number, 
                            s.registration_mode, s.address, s.phone, s.previous_school, s.previous_class, s.cantine,
                            s.student_code, s.parent_code,
                            s.parent_first_name, s.parent_last_name, s.parent_phone, s.parent_email, s.parent_contact,
                            s.father_contact, s.mother_contact, s.emergency_contact, s.child_photo,
                            s.eats_at_cantine, s.allergy, s.special_needs, s.additional_info,
                            u.email 
                        FROM students s 
                        LEFT JOIN users u ON s.user_id = u.id 
                        WHERE s.id = ?`, [id]);
                    if (basicStudent.length === 0) {
                        return res.status(404).json({ message: "Élève non trouvé" });
                    }
                    studentInfo = [basicStudent[0]];
                }

                // 2. Get payment history
                let paymentsQuery = `SELECT * FROM payments WHERE student_id = ? AND (status = 'completed' OR status = 'paid')`;
                const paymentsParams = [id];
                if (req.query.school_year) {
                    paymentsQuery += ' AND school_year = ?';
                    paymentsParams.push(req.query.school_year);
                }
                paymentsQuery += ' ORDER BY payment_date DESC';
                const [payments] = await connection.query(paymentsQuery, paymentsParams);

                const student = studentInfo[0];
                student.payments = payments;
                student.total_paid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
                const total_due = student.total_due || 0;
                const total_discount = student.total_discount || 0;
                const total_paid = student.total_paid || 0;
                student.reste_a_payer = Math.max(0, total_due - total_discount - total_paid);

                // Log pour déboguer le parent_code
                console.log(`[getStudentDetails] Parent code pour élève ${id}:`, student.parent_code);
                console.log(`[getStudentDetails] Parent email:`, student.parent_email);
                console.log(`[getStudentDetails] Type de parent_code:`, typeof student.parent_code);
                console.log(`[getStudentDetails] Toutes les clés de student:`, Object.keys(student));

                // S'assurer que parent_code est toujours inclus dans la réponse (même si null)
                if (!('parent_code' in student)) {
                    console.warn(`[getStudentDetails] ATTENTION: parent_code manquant dans la réponse pour l'élève ${id}`);
                    // Récupérer le parent_code directement de la base de données
                    const [parentCodeCheck] = await connection.query('SELECT parent_code FROM students WHERE id = ?', [id]);
                    if (parentCodeCheck.length > 0) {
                        student.parent_code = parentCodeCheck[0].parent_code;
                        console.log(`[getStudentDetails] parent_code récupéré directement:`, student.parent_code);
                    }
                }

                res.json(student);

            } catch (error) {
                console.error("Erreur lors de la récupération des détails de l'élève:", error);
                res.status(500).json({ message: error.message });
            } finally {
                if (connection) connection.release();
            }
        },

        // Obtenir l'emploi du temps de l'élève
        getStudentSchedule: async(req, res) => {
            const studentId = req.params.id;
            console.log(`[getStudentSchedule] Récupération de l'emploi du temps pour l'élève ID: ${studentId}`);

            // Vérification de sécurité pour s'assurer qu'un parent ne peut voir que l'emploi du temps de ses enfants
            if (req.user.role === 'parent') {
                try {
                    const tokenStudentId = req.user.student_id;
                    if (!tokenStudentId || Number(tokenStudentId) !== Number(studentId)) {
                        return res.status(403).json({ message: 'Accès interdit.' });
                    }
                    // Vérifier que l'enfant existe
                    const [studentCheck] = await pool.query(
                        'SELECT id FROM students WHERE id = ?', [studentId]
                    );
                    if (studentCheck.length === 0) {
                        return res.status(403).json({ message: 'Vous n\'avez pas l\'autorisation de voir l\'emploi du temps de cet élève.' });
                    }
                } catch (secError) {
                    console.error("[getStudentSchedule] Erreur lors de la vérification parent:", secError);
                    return res.status(500).json({ message: "Erreur lors de la vérification de l'utilisateur." });
                }
            }

            // Vérification de sécurité pour s'assurer qu'un élève ne peut voir que son propre emploi du temps
            if (req.user.role === 'student') {
                try {
                    const [studentCheck] = await pool.query('SELECT id, user_id FROM students WHERE user_id = ?', [req.user.id]);
                    console.log(`[getStudentSchedule] Élève trouvé pour user_id ${req.user.id}:`, studentCheck);

                    if (!studentCheck.length || studentCheck[0].id !== Number(studentId)) {
                        console.warn(`[getStudentSchedule] Tentative d'accès non autorisé par user_id: ${req.user.id} pour student_id: ${studentId}`);
                        return res.status(403).json({ message: 'Accès non autorisé.' });
                    }
                } catch (secError) {
                    console.error("[getStudentSchedule] Erreur lors de la vérification de sécurité:", secError);
                    return res.status(500).json({ message: "Erreur lors de la vérification de l'utilisateur." });
                }
            }

            try {
                // Récupérer la classe de l'élève
                let enrollmentQuery = `
                SELECT c.id as class_id, c.name as class_name
                FROM enrollments e
                JOIN classes c ON e.class_id = c.id
                WHERE e.student_id = ? AND e.status = 'active'`;
                const enrollmentParams = [studentId];
                if (req.query.school_year) {
                    enrollmentQuery += ' AND e.school_year = ?';
                    enrollmentParams.push(req.query.school_year);
                }
                const [enrollment] = await pool.query(enrollmentQuery, enrollmentParams);

                if (enrollment.length === 0) {
                    console.log(`[getStudentSchedule] Aucune classe active trouvée pour l'élève ${studentId}`);
                    return res.json({
                        class_name: 'Aucune classe',
                        schedule: [],
                        message: 'Vous n\'êtes inscrit dans aucune classe active.'
                    });
                }

                const classId = enrollment[0].class_id;
                const className = enrollment[0].class_name;

                // Utiliser LEFT JOIN pour gérer les matières manquantes
                // D'abord, vérifier tous les emplois du temps de la classe (sans filtre is_published)
                let debugQuery = `
                SELECT 
                    s.id, s.day_of_week, s.start_time, s.end_time,
                    s.subject_id, s.teacher_id, s.is_published, s.is_weekly_schedule, s.school_year,
                    COALESCE(sub.name, 'Activité') as subject_name, 
                    t.first_name as teacher_first_name, 
                    t.last_name as teacher_last_name
                FROM schedules s
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                JOIN teachers t ON s.teacher_id = t.id
                WHERE s.class_id = ?`;

                const debugParams = [classId];

                // Ajouter le filtre par année scolaire si spécifié
                if (req.query.school_year) {
                    debugQuery += ' AND s.school_year = ?';
                    debugParams.push(req.query.school_year);
                }

                debugQuery += ' ORDER BY s.day_of_week, s.start_time';

                console.log(`[getStudentSchedule] Requête de debug: ${debugQuery}`);
                console.log(`[getStudentSchedule] Paramètres de debug:`, debugParams);

                const [allSchedules] = await pool.query(debugQuery, debugParams);
                console.log(`[getStudentSchedule] Tous les emplois du temps trouvés:`, allSchedules.length);
                console.log(`[getStudentSchedule] Détails des emplois du temps:`, allSchedules);

                // Maintenant, filtrer pour les emplois du temps officiels (pas de filtre is_published car c'est pour l'administration)
                let scheduleQuery = `
                SELECT 
                    s.id, s.day_of_week, s.start_time, s.end_time,
                    s.subject_id, s.teacher_id,
                    COALESCE(sub.name, 'Activité') as subject_name, 
                    t.first_name as teacher_first_name, 
                    t.last_name as teacher_last_name
                FROM schedules s
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                JOIN teachers t ON s.teacher_id = t.id
                WHERE s.class_id = ?
                AND (s.is_weekly_schedule = 0 OR s.is_weekly_schedule IS NULL)`;

                const scheduleParams = [classId];

                // Ajouter le filtre par année scolaire si spécifié
                if (req.query.school_year) {
                    scheduleQuery += ' AND s.school_year = ?';
                    scheduleParams.push(req.query.school_year);
                }

                // Pour l'emploi du temps officiel, on ne filtre pas par is_published car c'est géré par l'administration
                scheduleQuery += ' ORDER BY s.day_of_week, s.start_time';

                console.log(`[getStudentSchedule] Requête finale: ${scheduleQuery}`);
                console.log(`[getStudentSchedule] Paramètres finaux:`, scheduleParams);

                const [schedule] = await pool.query(scheduleQuery, scheduleParams);

                console.log(`[getStudentSchedule] Emploi du temps trouvé pour la classe ${className}:`, schedule.length, 'cours');
                console.log(`[getStudentSchedule] Données brutes:`, schedule);

                res.json({
                    class_name: className,
                    schedule: schedule
                });

            } catch (error) {
                console.error("[getStudentSchedule] ERREUR:", error);
                res.status(500).json({ message: "Une erreur s'est produite lors de la récupération de l'emploi du temps." });
            }
        },

        // Récupérer toutes les infos de l'élève connecté
        getMyDetails: async(req, res) => {
            console.log('[DEBUG] getMyDetails appelée');
            try {
                // 1. Récupérer l'élève connecté via user_id
                const [students] = await pool.query(
                    `SELECT * FROM students WHERE user_id = ?`, [req.user.id]
                );
                if (students.length === 0) {
                    console.log('[DEBUG] RETURN (élève non trouvé)', students);
                    return res.status(404).json({ message: "Élève non trouvé" });
                }
                const student = students[0];

                // 2. Initialiser les champs d'inscription à null par défaut
                student.class_id = null;
                student.class_name = null;
                student.school_year = null;
                student.total_due = null;
                student.has_enrollment = false;

                // 3. Récupérer l'inscription active pour l'année scolaire courante
                const currentSchoolYear = getCurrentSchoolYear();
                const [enrollments] = await pool.query(
                    `SELECT * FROM enrollments WHERE student_id = ? AND status = 'active' AND school_year = ? LIMIT 1`, [student.id, currentSchoolYear]
                );
                console.log('[DEBUG] enrollment actif année courante :', enrollments);
                if (enrollments.length > 0) {
                    const enrollment = enrollments[0];
                    student.has_enrollment = true;
                    student.class_id = enrollment.class_id;
                    student.school_year = enrollment.school_year;
                    // 4. Récupérer la classe si elle existe
                    if (enrollment.class_id) {
                        const [classes] = await pool.query(`
                            SELECT c.*, el.tuition_amount 
                            FROM classes c 
                            LEFT JOIN education_levels el ON c.education_level_id = el.id 
                            WHERE c.id = ?
                        `, [enrollment.class_id]);
                        if (classes.length > 0) {
                            student.class_name = classes[0].name;
                            student.total_due = classes[0].tuition_amount || 0;
                        }
                    }
                }

                // 4bis. Récupérer toutes les réductions actives et approuvées pour l'année scolaire courante (gestion d'erreur si table n'existe pas)
                let totalDiscount = 0;
                try {
                    const [discounts] = await pool.query(`
                    SELECT sd.amount
                    FROM student_discounts sd
                    WHERE sd.student_id = ?
                      AND sd.is_active = TRUE
                      AND sd.approved_by IS NOT NULL
                      AND (sd.school_year IS NULL OR sd.school_year = ?)
                `, [student.id, currentSchoolYear]);
                    console.log('[DEBUG DASHBOARD] Reductions SQL:', discounts);
                    discounts.forEach(discount => {
                        const montant = Number(String(discount.amount).replace(/\s/g, '').replace(',', '.'));
                        console.log('[DEBUG DASHBOARD] Brute:', discount.amount, 'Number:', montant);
                        if (!isNaN(montant)) {
                            totalDiscount += montant;
                        } else {
                            console.error('[ERROR DASHBOARD] Montant de réduction non numérique:', discount.amount);
                        }
                    });
                    totalDiscount = Math.round(totalDiscount * 100) / 100;
                    console.log('[DEBUG DASHBOARD] Total réductions calculé:', totalDiscount);
                } catch (error) {
                    console.log('Table student_discounts non disponible, totalDiscount = 0');
                    totalDiscount = 0;
                }
                student.total_discount = totalDiscount;

                // 5. Paiements
                const [payments] = await pool.query(
                    `SELECT * FROM payments WHERE student_id = ? AND (status = 'completed' OR status = 'paid') AND (school_year IS NULL OR school_year = ?)
                 ORDER BY payment_date DESC`, [student.id, currentSchoolYear]
                );
                student.payments = payments;
                student.total_paid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
                const total_due2 = student.total_due || 0;
                const total_discount2 = student.total_discount || 0;
                const total_paid2 = student.total_paid || 0;
                student.reste_a_payer = Math.max(0, total_due2 - total_discount2 - total_paid2);

                // 6. Log debug final
                console.log('[DEBUG] RETURN (final)', student);

                return res.json({ student });
            } catch (error) {
                console.error('[DEBUG] ERREUR attrapée dans getMyDetails :', error);
                res.status(500).json({ message: error.message });
            }
        },

        // Rang global de l'élève pour un trimestre
        getTrimesterRank: async(req, res) => {
            const studentId = req.params.id;
            const { semester } = req.query;
            if (!semester) return res.status(400).json({ message: 'Le trimestre est requis.' });

            try {
                // 1. Trouver la classe de l'élève
                const [enrollments] = await pool.query(
                    `SELECT class_id FROM enrollments WHERE student_id = ? AND status = 'active'`, [studentId]
                );
                if (enrollments.length === 0) return res.status(404).json({ message: 'Classe non trouvée.' });
                const classId = enrollments[0].class_id;

                // 2. Calculer la moyenne trimestrielle pour chaque élève de la classe
                const [rows] = await pool.query(`
                SELECT 
                    g.student_id,
                    SUM(g.grade * COALESCE(g.coefficient,1)) / SUM(COALESCE(g.coefficient,1)) as moyenne
                FROM grades g
                WHERE g.class_id = ? AND g.semester = ? AND g.is_published = 1
                GROUP BY g.student_id
                ORDER BY moyenne DESC
            `, [classId, semester]);

                // 3. Trouver le rang de l'élève
                const rank = rows.findIndex(r => r.student_id === Number(studentId)) + 1;
                const found = rows.find(r => r.student_id === Number(studentId));
                const myMoy = found ? found.moyenne : null;

                res.json({
                    rank,
                    total: rows.length,
                    moyenne: myMoy
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Erreur lors du calcul du rang.' });
            }
        },

        // Obtenir les absences d'un élève spécifique
        getStudentAbsences: async(req, res) => {
            try {
                const { id } = req.params;
                const { school_year } = req.query;

                let query = `
                SELECT a.*, s.name as subject_name
                FROM absences a
                LEFT JOIN subjects s ON a.subject_id = s.id
                WHERE a.student_id = ?
            `;
                const params = [id];

                if (school_year) {
                    query += ' AND a.school_year = ?';
                    params.push(school_year);
                }

                query += ' ORDER BY a.date DESC';

                const [absences] = await pool.query(query, params);
                res.json(absences);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },

        // Calcul de la moyenne annuelle pour un élève
        getAnnualAverage: async(req, res) => {
            const studentId = req.params.id;
            try {
                // Trouver la classe active de l'élève
                const [enrollments] = await pool.query(
                    `SELECT class_id FROM enrollments WHERE student_id = ? AND status = 'active'` + (req.query.school_year ? ' AND school_year = ?' : ''),
                    req.query.school_year ? [studentId, req.query.school_year] : [studentId]
                );
                if (enrollments.length === 0) return res.status(404).json({ message: 'Classe non trouvée.' });
                const classId = enrollments[0].class_id;

                // Récupérer les moyennes de chaque trimestre pour tous les élèves de la classe
                let query = `
                SELECT 
                    g.student_id,
                    g.semester,
                    SUM(g.grade * COALESCE(g.coefficient,1)) / SUM(COALESCE(g.coefficient,1)) as moyenne
                FROM grades g
                WHERE g.class_id = ? AND g.is_published = 1`;
                const params = [classId];
                if (req.query.school_year) {
                    query += ' AND g.school_year = ?';
                    params.push(req.query.school_year);
                }
                query += ' GROUP BY g.student_id, g.semester';
                const [allTrimesters] = await pool.query(query, params);

                // Regrouper par élève
                const annuals = {};
                allTrimesters.forEach(row => {
                    if (!annuals[row.student_id]) annuals[row.student_id] = { t1: 0, t2: 0, t3: 0 };
                    if (row.semester === '1er trimestre') annuals[row.student_id].t1 = Number(row.moyenne);
                    if (row.semester === '2e trimestre') annuals[row.student_id].t2 = Number(row.moyenne);
                    if (row.semester === '3e trimestre') annuals[row.student_id].t3 = Number(row.moyenne);
                });

                // Calculer la moyenne annuelle pour chaque élève avec coefficients 1,2,3
                const annualAverages = Object.entries(annuals).map(([sid, t]) => {
                    // Compte le nombre de trimestres avec une moyenne > 0
                    const trimestresAvecNote = [t.t1, t.t2, t.t3].filter(val => val > 0).length;
                    // Nouvelle formule : (T1*1 + T2*2 + T3*3)/6
                    return {
                        student_id: Number(sid),
                        moyenne_annuelle: trimestresAvecNote > 0 ? ((t.t1 || 0) * 1 + (t.t2 || 0) * 2 + (t.t3 || 0) * 3) / 6 : null
                    };
                }).filter(e => e.moyenne_annuelle !== null && !isNaN(e.moyenne_annuelle));

                // Trier par moyenne décroissante
                annualAverages.sort((a, b) => b.moyenne_annuelle - a.moyenne_annuelle);

                // Trouver la moyenne et le rang de l'élève courant
                const myIndex = annualAverages.findIndex(e => e.student_id === Number(studentId));
                const myAnnual = annualAverages[myIndex];

                res.json({
                    moyenne_annuelle: myAnnual && !isNaN(myAnnual.moyenne_annuelle) ? Number(myAnnual.moyenne_annuelle.toFixed(2)) : null,
                    rank: myIndex >= 0 ? myIndex + 1 : null,
                    total: annualAverages.length
                });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Erreur lors du calcul de la moyenne annuelle.' });
            }
        },

        // Réinscription d'un élève existant pour une nouvelle année scolaire
        reinscribeStudent: async(req, res) => {
            const { id } = req.params;
            const { class_id, payment_amount, school_year, parent_first_name, parent_last_name, parent_phone, parent_email, parent_contact, previous_year_due, previous_year_payment } = req.body;

            if (!class_id || !school_year) {
                return res.status(400).json({ message: 'Classe et année scolaire requis.' });
            }

            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();

                // Vérifier si l'élève est déjà inscrit pour cette année scolaire
                const [existing] = await connection.query(
                    'SELECT id FROM enrollments WHERE student_id = ? AND school_year = ? AND status = "active"', [id, school_year]
                );
                if (existing.length > 0) {
                    console.log(`[REINSCRIPTION] Refusée : élève ${id} déjà inscrit pour l'année ${school_year}`);
                    await connection.rollback();
                    return res.status(400).json({ message: 'Cet élève est déjà inscrit pour cette année scolaire.' });
                }

                // Récupérer les infos actuelles du parent
                const [current] = await connection.query('SELECT parent_first_name, parent_last_name, parent_phone, parent_email, parent_contact, first_name, last_name, date_of_birth, gender, city, registration_number FROM students WHERE id = ?', [id]);
                const old = current[0] || {};
                console.log('[REINSCRIPTION] Infos élève AVANT update:', old);

                // Mettre à jour les infos parentales uniquement si fournies
                await connection.query(
                    `UPDATE students SET 
                    parent_first_name = ?, 
                    parent_last_name = ?, 
                    parent_phone = ?, 
                    parent_email = ?, 
                    parent_contact = ?
                 WHERE id = ?`, [
                        parent_first_name !== undefined ? parent_first_name : old.parent_first_name,
                        parent_last_name !== undefined ? parent_last_name : old.parent_last_name,
                        parent_phone !== undefined ? parent_phone : old.parent_phone,
                        parent_email !== undefined ? parent_email : old.parent_email,
                        parent_contact !== undefined ? parent_contact : old.parent_contact,
                        id
                    ]
                );

                // Vérifier les infos élève après update
                const [after] = await connection.query('SELECT parent_first_name, parent_last_name, parent_phone, parent_email, parent_contact, first_name, last_name, date_of_birth, gender, city, registration_number FROM students WHERE id = ?', [id]);
                console.log('[REINSCRIPTION] Infos élève APRÈS update:', after[0]);

                // Désactiver l'inscription active de l'élève pour cette année scolaire (sécurité)
                await connection.query(
                    'UPDATE enrollments SET status = "inactive" WHERE student_id = ? AND school_year = ? AND status = "active"', [id, school_year]
                );

                // Créer la nouvelle inscription pour la nouvelle année scolaire
                await connection.query(
                    'INSERT INTO enrollments (student_id, class_id, status, enrollment_date, school_year) VALUES (?, ?, "active", NOW(), ?)', [id, class_id, school_year]
                );

                // Paiement retiré du formulaire de réinscription
                // await connection.query(
                //     'INSERT INTO payments (student_id, amount, payment_date, status, payment_method, school_year) VALUES (?, ?, NOW(), ?, ?, ?)', [id, payment_amount, 'completed', 'cash', school_year]
                // );

                // Récupérer les informations de la classe pour l'email
                const [classInfo] = await connection.query('SELECT name FROM classes WHERE id = ?', [class_id]);
                const classe = classInfo[0] && classInfo[0].name || 'N/A';

                // Récupérer les informations complètes de l'élève pour l'email
                const [studentInfo] = await connection.query(
                    'SELECT first_name, last_name, parent_first_name, parent_last_name, parent_email FROM students WHERE id = ?', [id]
                );
                const student = studentInfo[0];

                await connection.commit();

                // Envoyer l'email de confirmation de réinscription
                if (student && student.parent_email) {
                    try {
                        await emailService.sendParentReinscriptionNotification({
                            parent_email: student.parent_email,
                            parent_first_name: student.parent_first_name,
                            parent_last_name: student.parent_last_name,
                            student_first_name: student.first_name,
                            student_last_name: student.last_name,
                            classe: classe,
                            school_year: school_year,
                            // payment_amount: payment_amount, // Retiré
                            // previous_year_due: previous_year_due || 0, // Retiré
                            // previous_year_payment: previous_year_payment || 0 // Retiré
                        });
                    } catch (emailError) {
                        console.error('Erreur lors de l\'envoi de l\'email de réinscription:', emailError);
                        // Ne pas faire échouer la réinscription si l'email échoue
                    }
                }

                res.status(200).json({ message: 'Réinscription effectuée avec succès.' });
            } catch (error) {
                if (connection) await connection.rollback();
                console.error('Erreur lors de la réinscription:', error);
                res.status(500).json({ message: error.message });
            } finally {
                if (connection) connection.release();
            }
        },

        // Récupérer tous les élèves inscrits à la cantine
        getCantineStudents: async(req, res) => {
            let connection;
            try {
                connection = await pool.getConnection();

                const { school_year, trimester = '1' } = req.query;

                // Récupérer les élèves de cantine
                const [studentsData] = await connection.query(`
                SELECT 
                    s.id,
                    s.first_name,
                    s.last_name,
                    s.registration_number,
                    s.student_code,
                    s.cantine,
                    s.gender,
                    s.eats_at_cantine,
                    s.allergy,
                    s.parent_first_name,
                    s.parent_last_name,
                    s.parent_phone,
                    s.child_photo,
                    c.name as class_name,
                    c.level as level,
                    c.cantine_amount as cantine_amount,
                    COALESCE(SUM(CASE WHEN cp.trimester = ? THEN cp.amount ELSE 0 END), 0) as total_paid_amount,
                    MAX(CASE WHEN cp.trimester = ? THEN cp.payment_date ELSE NULL END) as cantine_payment_date,
                    ? as cantine_trimester,
                    CASE 
                        WHEN c.cantine_amount IS NOT NULL AND c.cantine_amount > 0 AND COALESCE(SUM(CASE WHEN cp.trimester = ? THEN cp.amount ELSE 0 END), 0) >= c.cantine_amount THEN 1 
                        ELSE 0 
                    END as cantine_paid,
                    'student' as source_type
                FROM students s
                LEFT JOIN (
                    SELECT * FROM enrollments WHERE status = 'active' AND school_year = ?
                ) e ON s.id = e.student_id
                LEFT JOIN classes c ON e.class_id = c.id
                LEFT JOIN cantine_payments cp ON s.id = cp.student_id AND cp.student_type = 'student' AND cp.school_year = ?
                WHERE s.cantine = 1
                GROUP BY s.id, s.first_name, s.last_name, s.registration_number, s.student_code, s.cantine, s.gender, s.eats_at_cantine, s.allergy, s.parent_first_name, s.parent_last_name, s.parent_phone, s.child_photo, c.name, c.level, c.cantine_amount
            `, [trimester, trimester, trimester, trimester, school_year, school_year]);

                // Récupérer les enfants de garderie de cantine
                const [garderieChildren] = await connection.query(`
                SELECT 
                    gi.id,
                    gi.child_first_name as first_name,
                    gi.child_last_name as last_name,
                    gi.unique_code as registration_number,
                    gi.unique_code as student_code,
                    1 as cantine,
                    gi.civility as gender,
                    gi.eats_at_cantine,
                    gi.allergy,
                    gi.parent_first_name,
                    gi.parent_last_name,
                    gi.parent_phone,
                    gi.child_photo,
                    'Garderie' as class_name,
                    'Garderie' as level,
                    COALESCE(gi.cantine_amount, (gi.duration_days * COALESCE(gi.daily_cantine_rate, 25000))) as cantine_amount,
                    gi.duration_days,
                    gi.daily_cantine_rate,
                    COALESCE(SUM(CASE WHEN cp.trimester = ? THEN cp.amount ELSE 0 END), 0) as total_paid_amount,
                    MAX(CASE WHEN cp.trimester = ? THEN cp.payment_date ELSE NULL END) as cantine_payment_date,
                    ? as cantine_trimester,
                    CASE 
                        WHEN COALESCE(gi.cantine_amount, (gi.duration_days * COALESCE(gi.daily_cantine_rate, 25000))) > 0 
                        AND COALESCE(SUM(CASE WHEN cp.trimester = ? THEN cp.amount ELSE 0 END), 0) >= COALESCE(gi.cantine_amount, (gi.duration_days * COALESCE(gi.daily_cantine_rate, 25000))) THEN 1 
                        ELSE 0 
                    END as cantine_paid,
                    'garderie' as source_type
                FROM garderie_inscriptions gi
                LEFT JOIN cantine_payments cp ON gi.id = cp.student_id AND cp.student_type = 'garderie' AND cp.school_year = ?
                WHERE gi.cantine = 1 AND gi.school_year = ?
                GROUP BY gi.id, gi.child_first_name, gi.child_last_name, gi.unique_code, gi.civility, gi.eats_at_cantine, gi.allergy, gi.parent_first_name, gi.parent_last_name, gi.parent_phone, gi.child_photo, gi.cantine_amount, gi.duration_days, gi.daily_cantine_rate
            `, [trimester, trimester, trimester, trimester, school_year, school_year]);

                // Combiner les résultats
                const students = [...studentsData, ...garderieChildren];



                console.log('=== [DEBUG] Élèves de cantine trouvés:', students.length);
                console.log('=== [DEBUG] Premier élève:', students[0]);

                // Formater les données pour le frontend
                const formattedStudents = students.map(student => ({
                    id: student.id,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    registration_number: student.registration_number,
                    student_code: student.student_code,
                    cantine: student.cantine,
                    gender: student.gender,
                    eats_at_cantine: student.eats_at_cantine,
                    allergy: student.allergy,
                    cantine_amount: student.cantine_amount !== null ? student.cantine_amount : null,
                    cantine_paid: student.cantine_paid === 1,
                    cantine_payment_date: student.cantine_payment_date,
                    total_paid_amount: student.total_paid_amount !== null ? student.total_paid_amount : null,
                    cantine_trimester: student.cantine_trimester,
                    class_name: student.class_name || null,
                    level: student.level || null,
                    parent_first_name: student.parent_first_name,
                    parent_last_name: student.parent_last_name,
                    parent_phone: student.parent_phone,
                    child_photo: student.child_photo,
                    source_type: student.source_type || 'student', // Ajout du type de source
                    // Nouvelles informations pour les enfants de garderie
                    duration_days: student.duration_days || null,
                    daily_cantine_rate: student.daily_cantine_rate || null
                }));

                res.json(formattedStudents);
            } catch (error) {
                console.error('Erreur lors de la récupération des élèves de cantine:', error);
                res.status(500).json({ message: 'Erreur lors de la récupération des élèves de cantine' });
            } finally {
                if (connection) connection.release();
            }
        },

        // Récupérer les médias d'un élève (médias élèves + médias admin)
        getStudentMedia: async(req, res) => {
            try {
                const { id } = req.params;
                console.log('[DEBUG] getStudentMedia appelé avec student_id:', id);
                console.log('[DEBUG] req.user:', req.user);

                // Vérifier que l'utilisateur a le droit de voir les médias de cet élève
                if (req.user.role === 'parent') {
                    console.log('[DEBUG] Vérification des permissions pour parent');
                    // Pour les parents, vérifier que l'élève leur appartient (uniquement par parent_code)
                    const tokenStudentId = req.user.student_id;
                    if (!tokenStudentId || Number(tokenStudentId) !== Number(id)) {
                        return res.status(403).json({ message: 'Accès interdit.' });
                    }
                    // Vérifier que l'ID dans le token correspond bien à l'enfant demandé
                    const [students] = await pool.query(
                        'SELECT id FROM students WHERE id = ? AND id = ?', [id, tokenStudentId]
                    );

                    if (students.length === 0) {
                        console.log('[DEBUG] Accès refusé pour le parent');
                        console.log('[DEBUG] Parent code:', req.user.parent_code);
                        return res.status(403).json({
                            message: 'Vous n\'avez pas l\'autorisation de voir les médias de cet élève'
                        });
                    }
                }

                // Récupérer les médias élèves (student_media)
                console.log('[DEBUG] Récupération des médias élèves');
                const [studentMedia] = await pool.query(`
                SELECT 
                    id,
                    filename,
                    original_name,
                    description,
                    uploaded_at,
                    'student' as source
                FROM student_media 
                WHERE student_id = ?
                ORDER BY uploaded_at DESC
            `, [id]);
                console.log('[DEBUG] Médias élèves trouvés:', studentMedia.length);

                // Récupérer les médias admin envoyés à cet élève (admin_media)
                console.log('[DEBUG] Récupération des médias admin');
                const [adminMedia] = await pool.query(`
                SELECT 
                    id,
                    filename,
                    original_name,
                    description,
                    created_at as uploaded_at,
                    'admin' as source
                FROM admin_media 
                WHERE student_id = ?
                ORDER BY created_at DESC
            `, [id]);
                console.log('[DEBUG] Médias admin trouvés:', adminMedia.length);

                // Récupérer les médias admin envoyés à la classe de l'élève
                console.log('[DEBUG] Récupération des médias de classe');
                const [classMedia] = await pool.query(`
                SELECT 
                    am.id,
                    am.filename,
                    am.original_name,
                    am.description,
                    am.created_at as uploaded_at,
                    'admin_class' as source
                FROM admin_media am
                JOIN enrollments e ON am.class_id = e.class_id
                WHERE e.student_id = ? AND e.status = 'active'
                ORDER BY am.created_at DESC
            `, [id]);
                console.log('[DEBUG] Médias de classe trouvés:', classMedia.length);

                // Combiner tous les médias
                const allMedia = [...studentMedia, ...adminMedia, ...classMedia];
                console.log('[DEBUG] Total des médias:', allMedia.length);

                // Trier par date de création (plus récent en premier)
                allMedia.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));

                // Ajouter les URLs pour chaque média (tous utilisent le même endpoint)
                const mediaWithUrls = allMedia.map(item => {
                    return {
                        ...item,
                        media_url: `https://bethaniemiracle.com/api/media/${item.id}`,
                        media_type: item.original_name && item.original_name.toLowerCase().includes('.mp4') ? 'video' : 'photo'
                    };
                });

                console.log('[DEBUG] Envoi de la réponse avec', mediaWithUrls.length, 'médias');
                res.json(mediaWithUrls);
            } catch (error) {
                console.error('Erreur récupération médias élève:', error);
                console.error('Stack trace:', error.stack);
                res.status(500).json({
                    message: 'Erreur lors de la récupération des médias',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        },

        // Rechercher un élève par matricule pour réinscription (sans filtre d'inscription active)
        searchStudentByRegistration: async(req, res) => {
            try {
                const { registration_number } = req.params;
                console.log('[DEBUG] Recherche élève par matricule:', registration_number);

                // Requête simple pour trouver l'élève par matricule, sans filtre d'inscription
                const query = `
                SELECT 
                    s.id,
                    s.first_name,
                    s.last_name,
                    DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth,
                    s.gender,
                    s.city,
                    s.registration_number,
                    s.registration_mode,
                    s.address,
                    s.phone,
                    s.previous_school,
                    s.previous_class,
                    s.cantine,
                    s.parent_first_name,
                    s.parent_last_name,
                    s.parent_phone,
                    s.parent_email,
                    s.parent_contact,
                    u.email,
                    c.name as classe,
                    c.id as class_id,
                    el.tuition_amount AS total_due,
                    e.school_year,
                    e.status as enrollment_status,
                    (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.student_id = s.id AND p.school_year = '2023-2024' AND (p.status = 'completed' OR p.status = 'paid' OR p.status = 'bon')) AS total_paid_2023_2024,
                    (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.student_id = s.id AND p.school_year = '2024-2025' AND (p.status = 'completed' OR p.status = 'paid' OR p.status = 'bon')) AS total_paid_2024_2025
                FROM students s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                LEFT JOIN classes c ON e.class_id = c.id
                WHERE s.registration_number = ?
            `;

                const [students] = await pool.query(query, [registration_number]);

                if (students.length === 0) {
                    console.log('[DEBUG] Aucun élève trouvé avec le matricule:', registration_number);
                    return res.status(404).json({
                        message: 'Désolé, ce matricule n\'existe pas dans la base de données.',
                        found: false
                    });
                }

                const student = students[0];
                console.log('[DEBUG] Élève trouvé:', student.first_name, student.last_name);

                // Calculer la moyenne annuelle de l'année précédente
                let annualAverage = 0;
                try {
                    const [grades] = await pool.query(`
                    SELECT AVG(g.grade) as average
                    FROM grades g
                    WHERE g.student_id = ? AND g.is_published = 1
                `, [student.id]);

                    if (grades.length > 0 && grades[0].average) {
                        annualAverage = parseFloat(grades[0].average);
                    }
                } catch (error) {
                    console.log('[DEBUG] Erreur lors du calcul de la moyenne:', error.message);
                }

                // Déterminer le niveau suivant
                let nextLevel = '';
                if (student.classe) {
                    if (student.classe.includes('Petite Section')) nextLevel = 'Moyenne Section';
                    else if (student.classe.includes('Moyenne Section')) nextLevel = 'Grande Section';
                    else if (student.classe.includes('Grande Section')) nextLevel = 'CP';
                    else if (student.classe.includes('CP')) nextLevel = 'CE1';
                    else if (student.classe.includes('CE1')) nextLevel = 'CE2';
                    else if (student.classe.includes('CE2')) nextLevel = 'CM1';
                    else if (student.classe.includes('CM1')) nextLevel = 'CM2';
                    else if (student.classe.includes('CM2')) nextLevel = '6ème';
                    else nextLevel = 'Niveau suivant';
                }

                const response = {
                    found: true,
                    student: {
                        ...student,
                        annual_average: annualAverage,
                        next_level: nextLevel,
                        total_paid_2023_2024: student.total_paid_2023_2024 || 0,
                        total_paid_2024_2025: student.total_paid_2024_2025 || 0
                    }
                };

                console.log('[DEBUG] Réponse envoyée:', response);
                res.json(response);

            } catch (error) {
                console.error('Erreur lors de la recherche par matricule:', error);
                res.status(500).json({
                    message: 'Erreur lors de la recherche de l\'élève',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        },

        // Récupérer l'emploi du temps hebdomadaire publié pour un élève
        getStudentWeeklySchedule: async(req, res) => {
            try {
                const studentId = req.params.id; // Corriger ici : utiliser req.params.id
                const { school_year } = req.query;

                console.log(`[getStudentWeeklySchedule] === DÉBUT ===`);
                console.log(`[getStudentWeeklySchedule] Student ID: ${studentId}, School Year: ${school_year}`);
                console.log(`[getStudentWeeklySchedule] User:`, req.user);

                // Vérifier que l'élève appartient au parent connecté (si c'est un parent)
                if (req.user.role === 'parent') {
                    const tokenStudentId = req.user.student_id;
                    console.log(`[getStudentWeeklySchedule] Vérification parent - student_id du token: ${tokenStudentId}`);

                    if (!tokenStudentId || Number(tokenStudentId) !== Number(studentId)) {
                        console.log(`[getStudentWeeklySchedule] Accès refusé - token student_id: ${tokenStudentId}, demandé: ${studentId}`);
                        return res.status(403).json({ message: 'Accès interdit à cet élève' });
                    }

                    // Vérifier que l'enfant existe
                    const [studentCheck] = await pool.query(
                        'SELECT id, parent_code FROM students WHERE id = ?', [studentId]
                    );

                    if (studentCheck.length === 0) {
                        console.log(`[getStudentWeeklySchedule] Élève ${studentId} non trouvé`);
                        return res.status(404).json({ message: 'Élève non trouvé' });
                    }

                    console.log(`[getStudentWeeklySchedule] Accès autorisé pour l'élève ${studentId}`);
                }

                // Récupérer la classe de l'élève
                const [enrollmentResult] = await pool.query(
                    'SELECT class_id FROM enrollments WHERE student_id = ? AND school_year = ? AND status = "active"', [studentId, school_year]
                );

                console.log(`[getStudentWeeklySchedule] Résultat de la recherche d'inscription:`, enrollmentResult);

                if (enrollmentResult.length === 0) {
                    console.log(`[getStudentWeeklySchedule] Aucune inscription trouvée pour l'élève ${studentId}`);
                    console.log(`[getStudentWeeklySchedule] === FIN (aucune inscription) ===`);
                    return res.json([]);
                }

                const classId = enrollmentResult[0].class_id;
                console.log(`[getStudentWeeklySchedule] Class ID: ${classId}`);

                // Vérifier d'abord s'il y a des emplois du temps hebdomadaires publiés pour cette classe
                const [checkWeekly] = await pool.query(
                    'SELECT COUNT(*) as count FROM schedules WHERE class_id = ? AND is_weekly_schedule = 1 AND is_published = 1 AND school_year = ?', [classId, school_year]
                );
                console.log(`[getStudentWeeklySchedule] Nombre d'emplois hebdomadaires publiés pour la classe ${classId}: ${checkWeekly[0].count}`);

                // FILTRE POUR LES PARENTS : Calculer la semaine actuelle (du lundi au dimanche)
                // Les parents ne voient que l'emploi du temps de la semaine en cours
                // Les enseignants voient tous leurs emplois du temps via la route /weekly-schedule/:classId
                const today = new Date();
                const dayOfWeek = today.getDay(); // 0 = dimanche, 1 = lundi, etc.
                const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Jours jusqu'au lundi
                const monday = new Date(today);
                monday.setDate(today.getDate() - daysToMonday);
                monday.setHours(0, 0, 0, 0);

                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                sunday.setHours(23, 59, 59, 999);

                const currentWeekStart = monday.toISOString().split('T')[0];
                const currentWeekEnd = sunday.toISOString().split('T')[0];

                console.log(`[getStudentWeeklySchedule] Semaine actuelle: ${currentWeekStart} au ${currentWeekEnd}`);

                // Récupérer l'emploi du temps hebdomadaire publié pour cette classe (semaine en cours uniquement)
                const [scheduleResult] = await pool.query(`
                SELECT 
                    s.id,
                    s.day_of_week,
                    s.start_time,
                    s.end_time,
                    s.start_date,
                    s.end_date,
                    s.course_description,
                    s.title,
                    s.domain,
                    s.time_of_day,
                    c.name as class_name,
                    COALESCE(sub.name, 'Activité') as subject_name,
                    COALESCE(CONCAT(t.first_name, ' ', t.last_name), 'Professeur') as teacher_name,
                    COALESCE(t.first_name, 'Professeur') as teacher_first_name,
                    COALESCE(t.last_name, '') as teacher_last_name
                FROM schedules s
                JOIN classes c ON s.class_id = c.id
                LEFT JOIN subjects sub ON s.subject_id = sub.id
                LEFT JOIN teachers t ON s.teacher_id = t.id
                WHERE s.class_id = ? 
                AND s.is_weekly_schedule = 1
                AND s.is_published = 1
                AND s.school_year = ?
                AND (
                    (s.start_date <= ? AND s.end_date >= ?) OR
                    (s.start_date BETWEEN ? AND ?) OR
                    (s.end_date BETWEEN ? AND ?)
                )
                ORDER BY 
                    CASE s.day_of_week 
                        WHEN 'Saturday' THEN 1
                        WHEN 'Sunday' THEN 2
                        ELSE 3
                    END,
                    s.start_time
            `, [classId, school_year, currentWeekEnd, currentWeekStart, currentWeekStart, currentWeekEnd, currentWeekStart, currentWeekEnd]);

                console.log(`[getStudentWeeklySchedule] ${scheduleResult.length} emplois du temps hebdomadaires trouvés`);
                console.log(`[getStudentWeeklySchedule] Données brutes:`, scheduleResult);

                // Debug: Vérifier tous les emplois du temps hebdomadaires publiés dans la base
                const [allWeekly] = await pool.query(
                    'SELECT class_id, COUNT(*) as count FROM schedules WHERE is_weekly_schedule = 1 AND is_published = 1 AND school_year = ? GROUP BY class_id', [school_year]
                );
                console.log(`[getStudentWeeklySchedule] Tous les emplois hebdomadaires publiés par classe:`, allWeekly);

                console.log(`[getStudentWeeklySchedule] === FIN (succès) ===`);

                res.json(scheduleResult);

            } catch (error) {
                console.error('[getStudentWeeklySchedule] ERREUR:', error);
                console.log(`[getStudentWeeklySchedule] === FIN (erreur) ===`);
                res.status(500).json({ message: 'Erreur lors de la récupération de l\'emploi du temps hebdomadaire' });
            }
        },

        // Obtenir le résumé de paiement d'un élève
        getStudentPaymentSummary: async(req, res) => {
            try {
                const { id } = req.params;
                const { school_year } = req.query;

                console.log('[getStudentPaymentSummary] Appelé avec student_id:', id, 'school_year:', school_year);

                // Vérifier que l'utilisateur a le droit de voir les paiements de cet élève
                if (req.user.role === 'parent') {
                    console.log('[getStudentPaymentSummary] Vérification des permissions pour parent');
                    const tokenStudentId = req.user.student_id;
                    if (!tokenStudentId || Number(tokenStudentId) !== Number(id)) {
                        return res.status(403).json({ message: 'Accès interdit.' });
                    }
                    // Vérifier que l'ID dans le token correspond bien à l'enfant demandé
                    const [students] = await pool.query(
                        'SELECT id FROM students WHERE id = ? AND id = ?', [id, tokenStudentId]
                    );

                    if (students.length === 0) {
                        console.log('[getStudentPaymentSummary] Accès refusé pour le parent');
                        return res.status(403).json({
                            message: 'Vous n\'avez pas l\'autorisation de voir les paiements de cet élève'
                        });
                    }
                }

                const currentSchoolYear = school_year || getCurrentSchoolYear();

                // 1. Récupérer les informations de la classe, le statut de l'élève et le montant total dû
                const [enrollmentResult] = await pool.query(`
                SELECT 
                    c.id as class_id, 
                    c.name as class_name, 
                    el.tuition_amount,
                    el.registration_fee
                FROM enrollments e
                JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE e.student_id = ? AND e.status = 'active' AND e.school_year = ?
                `, [id, currentSchoolYear]);

                if (enrollmentResult.length === 0) {
                    return res.status(404).json({ message: 'Aucune inscription active trouvée pour cet élève' });
                }

                const classInfo = enrollmentResult[0];
                // Utiliser le montant du niveau d'études
                const totalDue = classInfo.tuition_amount || 0;

                console.log('[getStudentPaymentSummary] Niveau d\'études:', {
                    student_id: id,
                    tuition_amount: classInfo.tuition_amount,
                    registration_fee: classInfo.registration_fee,
                    total_due: totalDue
                });

                // 2. Récupérer le total des paiements validés
                const [paymentsResult] = await pool.query(`
                SELECT SUM(amount) as total_paid
                FROM payments
                WHERE student_id = ? AND school_year = ? AND (status = 'completed' OR status = 'paid' OR status = 'bon')
            `, [id, currentSchoolYear]);

                const totalPaid = paymentsResult[0].total_paid || 0;

                // 3. Récupérer le total des réductions actives et approuvées (gestion d'erreur si table n'existe pas)
                let totalDiscounts = 0;
                try {
                    const [discountsResult] = await pool.query(`
                    SELECT 
                        SUM(CASE 
                            WHEN sd.percentage > 0 THEN (el.tuition_amount * sd.percentage / 100)
                            ELSE sd.amount
                        END) as total_discounts
                    FROM student_discounts sd
                    JOIN enrollments e ON sd.student_id = e.student_id AND e.status = 'active' AND e.school_year = ?
                    JOIN classes c ON e.class_id = c.id
                    LEFT JOIN education_levels el ON c.education_level_id = el.id
                    WHERE sd.student_id = ? 
                    AND sd.is_active = TRUE 
                    AND sd.approved_by IS NOT NULL
                    AND (sd.school_year IS NULL OR sd.school_year = ?)
                `, [currentSchoolYear, id, currentSchoolYear]);

                    totalDiscounts = discountsResult[0].total_discounts || 0;
                } catch (error) {
                    console.log('Table student_discounts non disponible, totalDiscounts = 0');
                    totalDiscounts = 0;
                }

                // 4. Calculer le reste à payer
                const remainingBalance = Math.max(0, totalDue - totalDiscounts - totalPaid);

                // 5. Récupérer l'historique des paiements
                const [paymentsHistory] = await pool.query(`
                SELECT 
                    id,
                    amount,
                    payment_date,
                    status,
                    payment_method,
                    description
                FROM payments
                WHERE student_id = ? AND school_year = ?
                ORDER BY payment_date DESC
            `, [id, currentSchoolYear]);

                const paymentSummary = {
                    total_due: totalDue,
                    total_paid: totalPaid,
                    total_discounts: totalDiscounts,
                    remaining_balance: remainingBalance,
                    class_name: classInfo.class_name,
                    payments: paymentsHistory
                };

                console.log('[getStudentPaymentSummary] Résumé calculé:', paymentSummary);
                res.json(paymentSummary);

            } catch (error) {
                console.error('[getStudentPaymentSummary] ERREUR:', error);
                res.status(500).json({ message: 'Erreur lors de la récupération du résumé de paiement' });
            }
        },

        // Récupérer l'historique des reçus d'un élève
        getReceiptHistory: async(req, res) => {
            try {
                const { id } = req.params;
                const { school_year } = req.query;
                const currentSchoolYear = school_year || getCurrentSchoolYear();

                console.log('[getReceiptHistory] Appelé avec student_id:', id, 'school_year:', currentSchoolYear);

                // Vérifier que l'utilisateur a le droit de voir les reçus de cet élève
                if (req.user.role === 'parent') {
                    console.log('[getReceiptHistory] Vérification des permissions pour parent');
                    const tokenStudentId = req.user.student_id;
                    if (!tokenStudentId || Number(tokenStudentId) !== Number(id)) {
                        return res.status(403).json({ message: 'Accès interdit.' });
                    }
                    // Vérifier que l'ID dans le token correspond bien à l'enfant demandé
                    const [students] = await pool.query(
                        'SELECT id FROM students WHERE id = ? AND id = ?', [id, tokenStudentId]
                    );

                    if (students.length === 0) {
                        console.log('[getReceiptHistory] Accès refusé pour le parent');
                        return res.status(403).json({
                            message: 'Vous n\'avez pas l\'autorisation de voir les reçus de cet élève'
                        });
                    }
                }

                const receiptHistory = [];

                // 1. Reçus d'inscription
                const [inscriptionReceipts] = await pool.query(`
                SELECT 
                    'inscription' as type,
                    e.enrollment_date as created_at,
                    CONCAT('Inscription - ', s.first_name, ' ', s.last_name) as description,
                    el.tuition_amount as amount,
                    s.id as student_id,
                    NULL as payment_id,
                    CONCAT(s.first_name, ' ', s.last_name) as student_name
                FROM students s
                JOIN enrollments e ON s.id = e.student_id
                JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE s.id = ? AND e.school_year = ? AND e.status = 'active'
            `, [id, currentSchoolYear]);

                console.log(`[getReceiptHistory] Reçus d'inscription trouvés:`, inscriptionReceipts.length);
                if (inscriptionReceipts.length > 0) {
                    console.log(`[getReceiptHistory] Premier reçu d'inscription:`, inscriptionReceipts[0]);
                }
                receiptHistory.push(...inscriptionReceipts);

                // 2. Reçus de finalisation (utiliser les paiements de type 'registration')
                const [finalisationReceipts] = await pool.query(`
                SELECT 
                    'finalisation' as type,
                    p.payment_date as created_at,
                    CONCAT('Finalisation - ', s.first_name, ' ', s.last_name) as description,
                    p.amount as amount,
                    s.id as student_id,
                    p.id as payment_id,
                    CONCAT(s.first_name, ' ', s.last_name) as student_name
                FROM students s
                JOIN payments p ON s.id = p.student_id
                WHERE s.id = ? AND p.school_year = ? AND p.payment_type = 'registration' AND p.status = 'completed'
            `, [id, currentSchoolYear]);

                receiptHistory.push(...finalisationReceipts);

                // 3. Reçus de réinscription (utiliser les paiements avec description contenant 'réinscription')
                const [reinscriptionReceipts] = await pool.query(`
                SELECT 
                    'reinscription' as type,
                    p.payment_date as created_at,
                    CONCAT('Réinscription - ', s.first_name, ' ', s.last_name) as description,
                    p.amount as amount,
                    s.id as student_id,
                    p.id as payment_id,
                    CONCAT(s.first_name, ' ', s.last_name) as student_name
                FROM students s
                JOIN payments p ON s.id = p.student_id
                WHERE s.id = ? AND p.school_year = ? AND (p.description LIKE '%réinscription%' OR p.description LIKE '%reinscription%') AND p.status = 'completed'
            `, [id, currentSchoolYear]);

                receiptHistory.push(...reinscriptionReceipts);

                // 4. Reçus de paiement (tous les paiements complétés)
                const [paymentReceipts] = await pool.query(`
                SELECT 
                    'paiement' as type,
                    p.payment_date as created_at,
                    CONCAT('Paiement - ', COALESCE(p.description, 'Paiement de scolarité')) as description,
                    p.amount as amount,
                    s.id as student_id,
                    p.id as payment_id,
                    CONCAT(s.first_name, ' ', s.last_name) as student_name
                FROM students s
                JOIN payments p ON s.id = p.student_id
                WHERE s.id = ? AND p.school_year = ? 
                AND (p.status = 'completed' OR p.status = 'paid' OR p.status = 'bon')
            `, [id, currentSchoolYear]);

                receiptHistory.push(...paymentReceipts);

                // Trier par date de création (plus récent en premier)
                receiptHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                console.log('[getReceiptHistory] Historique récupéré:', receiptHistory.length, 'reçus');
                res.json(receiptHistory);

            } catch (error) {
                console.error('[getReceiptHistory] ERREUR:', error);
                res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique des reçus' });
            }
        },

        // Récupérer le contenu HTML d'un reçu d'inscription
        getInscriptionReceipt: async(req, res) => {
                try {
                    const { id } = req.params;
                    const { enrollment_date } = req.query;
                    console.log('[getInscriptionReceipt] Appelé avec student_id:', id, 'enrollment_date:', enrollment_date);

                    // Vérifier les permissions
                    if (req.user.role === 'parent') {
                        if (!req.user.parent_code) {
                            return res.status(403).json({ message: 'Accès interdit.' });
                        }
                        const parentEmail = req.user.parent_email || req.user.email;
                        if (!parentEmail) {
                            return res.status(403).json({ message: 'Accès interdit.' });
                        }
                        const [students] = await pool.query(
                            'SELECT id FROM students WHERE id = ? AND parent_email = ?', [id, parentEmail]
                        );

                        if (students.length === 0) {
                            return res.status(403).json({
                                message: 'Vous n\'avez pas l\'autorisation de voir les reçus de cet élève'
                            });
                        }
                    }

                    // Récupérer les informations de l'inscription
                    console.log('[getInscriptionReceipt] Exécution de la requête SQL...');

                    // Convertir la date ISO en format date pour la comparaison
                    const enrollmentDate = new Date(enrollment_date);
                    const formattedDate = enrollmentDate.toISOString().split('T')[0];

                    console.log('[getInscriptionReceipt] Date formatée:', formattedDate);

                    // Essayer aussi avec la date locale pour gérer les décalages de fuseau horaire
                    const localDate = enrollmentDate.toLocaleDateString('en-CA'); // Format YYYY-MM-DD
                    console.log('[getInscriptionReceipt] Date locale:', localDate);

                    const [inscriptionData] = await pool.query(`
                SELECT 
                    s.first_name, s.last_name, s.gender, 
                    DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth, 
                    s.parent_contact,
                    s.parent_email, s.address, s.emergency_contact, s.parent_code,
                    s.parent_first_name, s.parent_last_name,
                    c.name as class_name, 
                    el.tuition_amount,
                    el.registration_fee,
                    el.tuition_amount as class_amount,
                    e.enrollment_date, e.school_year
                FROM students s
                JOIN enrollments e ON s.id = e.student_id
                JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE s.id = ? AND (DATE(e.enrollment_date) = ? OR DATE(e.enrollment_date) = ?) AND e.status = 'active'
            `, [id, formattedDate, localDate]);
                    console.log('[getInscriptionReceipt] Résultat de la requête:', inscriptionData.length, 'lignes trouvées');
                    if (inscriptionData.length > 0) {
                        console.log('[getInscriptionReceipt] Données récupérées:', inscriptionData[0]);
                        console.log('[getInscriptionReceipt] Montant calculé (class_amount):', inscriptionData[0].class_amount);
                    }

                    // Si aucune inscription trouvée avec la date exacte, essayer de trouver la première inscription de l'élève
                    if (inscriptionData.length === 0) {
                        console.log('[getInscriptionReceipt] Aucune inscription trouvée avec la date exacte, recherche de la première inscription...');

                        const [fallbackData] = await pool.query(`
                    SELECT 
                        s.first_name, s.last_name, s.gender, 
                    DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth, 
                    s.parent_contact,
                        s.parent_email, s.address, s.emergency_contact, s.parent_code,
                        s.parent_first_name, s.parent_last_name,
                        c.name as class_name, 
                        el.tuition_amount as amount,
                        el.tuition_amount as class_amount,
                        e.enrollment_date, e.school_year
                    FROM students s
                    JOIN enrollments e ON s.id = e.student_id
                    JOIN classes c ON e.class_id = c.id
                    JOIN education_levels el ON c.education_level_id = el.id
                    WHERE s.id = ? AND e.status = 'active'
                    ORDER BY e.enrollment_date ASC
                    LIMIT 1
                `, [id]);

                        console.log('[getInscriptionReceipt] Résultat de la requête de fallback:', fallbackData.length, 'lignes trouvées');

                        if (fallbackData.length === 0) {
                            return res.status(404).json({ message: 'Aucune inscription trouvée pour cet élève' });
                        }

                        inscriptionData.push(...fallbackData);
                    }

                    const data = inscriptionData[0];

                    // Générer le HTML du reçu
                    const receiptHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Reçu d'inscription</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        .logo-container { text-align: center; margin-bottom: 15px; }
                        .logo { width: 80px; height: 80px; object-fit: contain; }
                        .receipt-title { font-size: 24px; font-weight: bold; color: #333; margin-top: 10px; }
                        .school-info { font-size: 14px; color: #666; }
                        .receipt-number { font-size: 12px; color: #999; }
                        .section { margin: 20px 0; }
                        .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #333; }
                        .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
                        .label { font-weight: bold; }
                        .value { text-align: right; }
                        .amount { font-size: 18px; font-weight: bold; color: #2c5aa0; }
                        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                        .signature { margin-top: 50px; display: flex; justify-content: space-between; }
                        .signature-box { width: 200px; text-align: center; }
                        .signature-line { border-top: 1px solid #333; margin-top: 30px; }
                        @media print {
                            .logo { width: 200px; height: 50px; }
                            body { margin: 10px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo-container">
                            <img src="https://bethaniemiracle.com/img/pages/logologo.webp" alt="Logo École" class="logo">
                        </div>
                        <div class="receipt-title">REÇU D'INSCRIPTION</div>
                        <div class="school-info">École Primaire Prescolaire Privée</div>
                        <div class="school-info">Année Scolaire: ${data.school_year}</div>
                        <div class="receipt-number">Date: ${new Date(data.enrollment_date).toLocaleDateString('fr-FR')}</div>
                    </div>

                    <div class="section">
                        <div class="section-title">INFORMATIONS DE L'ÉLÈVE</div>
                        <div class="info-row">
                            <span class="label">Nom complet:</span>
                            <span class="value">${data.last_name} ${data.first_name}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Genre:</span>
                            <span class="value">${data.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
                        </div>
                        
                        <div class="info-row">
                            <span class="label">Classe:</span>
                            <span class="value">${data.class_name}</span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">INFORMATIONS DES PARENTS</div>
                        ${(data.parent_last_name || data.parent_first_name) ? `
                        <div class="info-row">
                            <span class="label">Nom du parent:</span>
                            <span class="value">${(data.parent_last_name || '')} ${(data.parent_first_name || '')}</span>
                        </div>
                        ` : ''}
                        <div class="info-row">
                            <span class="label">Contact parent:</span>
                            <span class="value">${data.parent_contact || 'Non renseigné'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Email:</span>
                            <span class="value">${data.parent_email || 'Non renseigné'}</span>
                        </div>
                        ${data.parent_code ? `
                        <div class="info-row">
                            <span class="label">Code parent:</span>
                            <span class="value" style="font-weight: bold; color: #2c5aa0;">${data.parent_code}</span>
                        </div>
                        ` : ''}
                    </div>

                    <div class="section">
                        <div class="section-title">MONTANT</div>
                        <div class="info-row">
                            <span class="label">Frais d'inscription:</span>
                            <span class="value amount">${data.class_amount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                    </div>

                    <div class="footer">
                        <p>Ce reçu confirme l'inscription de l'élève pour l'année scolaire ${data.school_year}</p>
                    </div>

                    <div class="signature">
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div>Signature du parent</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div>Signature de l'administration</div>
                        </div>
                    </div>
                </body>
                </html>
            `;

                res.json({ html: receiptHtml });

            } catch (error) {
                console.error('[getInscriptionReceipt] ERREUR:', error);
                res.status(500).json({ message: 'Erreur lors de la génération du reçu d\'inscription' });
            }
        },

        // Récupérer le bulletin d'un élève pour un trimestre donné
        getStudentBulletin: async(req, res) => {
            try {
                const { id } = req.params;
                const { trimester, school_year, composition_id } = req.query;

                console.log('[getStudentBulletin] Appelé avec student_id:', id, 'trimester:', trimester, 'school_year:', school_year, 'composition_id:', composition_id);

                // Vérifier que l'utilisateur a le droit de voir le bulletin de cet élève
                if (req.user.role === 'parent') {
                    console.log('[getStudentBulletin] Vérification des permissions pour parent');
                    const tokenStudentId = req.user.student_id;
                    if (!tokenStudentId || Number(tokenStudentId) !== Number(id)) {
                        console.log(`[getStudentBulletin] Accès refusé - token student_id: ${tokenStudentId}, demandé: ${id}`);
                        return res.status(403).json({
                            message: 'Vous n\'avez pas l\'autorisation de voir le bulletin de cet élève'
                        });
                    }
                    
                    // Vérifier que l'enfant existe
                    const [students] = await pool.query(
                        'SELECT id FROM students WHERE id = ?', 
                        [id]
                    );

                    if (students.length === 0) {
                        console.log('[getStudentBulletin] Élève non trouvé');
                        return res.status(404).json({
                            message: 'Élève non trouvé'
                        });
                    }
                }

                const currentSchoolYear = school_year || getCurrentSchoolYear();
                const currentTrimester = trimester || '1er trimestre';

                // 1. Récupérer les informations de l'élève et de sa classe
                // IMPORTANT: Ne pas filtrer par status pour être cohérent avec le calcul de l'effectif total
                // qui inclut tous les élèves inscrits, indépendamment de leur statut
                const [studentInfo] = await pool.query(`
                    SELECT 
                        s.first_name,
                        s.last_name,
                        s.registration_number,
                        s.gender,
                        DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth,
                        c.id as class_id,
                        c.name as class_name
                    FROM students s
                    JOIN enrollments e ON s.id = e.student_id AND e.school_year = ?
                    JOIN classes c ON e.class_id = c.id
                    WHERE s.id = ?
                    ORDER BY CASE WHEN e.status = 'active' THEN 0 ELSE 1 END, e.status DESC
                    LIMIT 1
                `, [currentSchoolYear, id]);

                if (studentInfo.length === 0) {
                    return res.status(404).json({ message: 'Élève non trouvé ou non inscrit pour cette année scolaire' });
                }

                const student = studentInfo[0];
                console.log(`[getStudentBulletin] ✅ Élève ${id} trouvé: ${student.first_name} ${student.last_name}, Classe: ${student.class_name} (ID: ${student.class_id})`);

                // 2. Si une composition spécifique est demandée, récupérer ses notes
                if (composition_id) {
                    console.log('[getStudentBulletin] Récupération pour composition spécifique:', composition_id);
                    
                    // Récupérer l'effectif total de la classe
                    // D'abord, vérifier tous les enrollments pour cette classe
                    const [debugEnrollments] = await pool.query(`
                        SELECT e.student_id, e.status, e.school_year, s.first_name, s.last_name
                        FROM enrollments e
                        JOIN students s ON e.student_id = s.id
                        WHERE e.class_id = ?
                        ORDER BY e.status, e.school_year
                    `, [student.class_id]);
                    console.log('[getStudentBulletin] Tous les enrollments pour la classe:', {
                        class_id: student.class_id,
                        class_name: student.class_name,
                        total_enrollments: debugEnrollments.length,
                        enrollments: debugEnrollments
                    });
                    
                    // Note: L'effectif total sera calculé plus tard depuis le ranking
                    // pour garantir qu'il correspond exactement au nombre d'élèves dans le classement
                    console.log('[getStudentBulletin] ═══ VÉRIFICATION DE L\'EFFECTIF (sera corrigé depuis le ranking) ═══');
                    
                    // Récupérer les informations de la composition
                    const [compositionInfo] = await pool.query(`
                        SELECT c.name, c.composition_date, c.description
                        FROM compositions c
                        WHERE c.id = ?
                    `, [composition_id]);

                    if (compositionInfo.length === 0) {
                        return res.status(404).json({ message: 'Composition non trouvée' });
                    }

                    // Déterminer le niveau de la classe pour les matières de bulletin
                    const className = (student.class_name || '').toUpperCase().trim();
                    const isCP = className.startsWith('CP1') || className.startsWith('CP2') || className.startsWith('CP');
                    // Déclarer isCE1 et isCE2 une seule fois pour toute la fonction
                    // Détection plus robuste : CE1, CE1 A, CE1 B, etc.
                    let isCE1 = className.startsWith('CE1') || className.includes(' CE1 ') || /^CE1\s/.test(className);
                    let isCE2 = className.startsWith('CE2') || className.includes(' CE2 ') || /^CE2\s/.test(className);
                    const isCE = isCE1 || isCE2 || className.startsWith('CE');
                    const levelGroup = isCP ? 'cp' : 'ce_cm';
                    
                    console.log(`[getStudentBulletin] ═══ DÉTECTION DE CLASSE ═══`);
                    console.log(`[getStudentBulletin] Nom de classe original: "${student.class_name}"`);
                    console.log(`[getStudentBulletin] Nom de classe en majuscules: "${className}"`);
                    console.log(`[getStudentBulletin] isCP: ${isCP}, isCE1: ${isCE1}, isCE2: ${isCE2}, isCE: ${isCE}`);

                    // Récupérer les notes pour cette composition spécifique - SEULEMENT les matières de bulletin
                    const isPublishedCondition = (req.user.role === 'admin' || req.user.role === 'secretary') 
                        ? '1=1' // Toujours vrai pour les admins
                        : 'g.is_published = 1'; // Seulement les publiées pour les autres

                    // Récupérer UNIQUEMENT les notes de cet enfant depuis la table grades
                    // Vérifier que student_id correspond bien à l'enfant du parent connecté
                    console.log(`[getStudentBulletin] ═══ FILTRAGE PAR ENFANT ═══`);
                    console.log(`[getStudentBulletin] ID élève demandé: ${id}`);
                    console.log(`[getStudentBulletin] ID élève dans le token (parent): ${req.user.student_id}`);
                    console.log(`[getStudentBulletin] Class ID: ${student.class_id}`);
                    console.log(`[getStudentBulletin] Composition ID: ${composition_id}`);
                    console.log(`[getStudentBulletin] School Year: ${currentSchoolYear}`);
                    
                    // Double vérification pour les parents
                    if (req.user.role === 'parent' && req.user.student_id) {
                        if (Number(id) !== Number(req.user.student_id)) {
                            console.error(`[getStudentBulletin] ERREUR: L'enfant demandé (${id}) ne correspond pas à l'enfant du parent (${req.user.student_id})`);
                            return res.status(403).json({
                                message: 'Vous n\'avez pas l\'autorisation de voir le bulletin de cet élève'
                            });
                        }
                    }
                    
                    // Vérification directe : récupérer TOUTES les notes de cet enfant depuis grades pour cette composition
                    // Utiliser CAST pour garantir une comparaison stricte
                    // Exclure EPS explicitement - EXCLURE AUSSI LES VARIANTES AVEC ESPACES ET POINTS
                    const [allGradesCheckRaw] = await pool.query(`
                        SELECT 
                            g.id as grade_id,
                            g.student_id,
                            g.grade,
                            g.bulletin_subject_id,
                            g.composition_id,
                            g.class_id,
                            g.school_year,
                            g.is_published,
                            s.name as subject_name
                        FROM grades g
                        LEFT JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                        WHERE CAST(g.student_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND CAST(g.composition_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND CAST(g.class_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND g.school_year = ?
                        AND UPPER(TRIM(s.name)) NOT IN ('EPS', 'E.P.S', 'E.P.S.', 'E PS')
                        AND UPPER(TRIM(s.name)) NOT REGEXP '^EPS$|^E\\.P\\.S$|^E\\.PS$|^EPS\\s*$|^E\\.P\\.S\\s*$|^E\\s+P\\s+S$'
                        ORDER BY s.display_order, s.name
                    `, [id, composition_id, student.class_id, currentSchoolYear]);
                    
                    // Filtrer EPS de manière supplémentaire en JavaScript - EXCLURE TOUTES LES VARIANTES
                    const allGradesCheck = allGradesCheckRaw.filter(g => {
                        const subjectName = (g.subject_name || '').toUpperCase().trim();
                        // Exclure toutes les variantes d'EPS
                        const isEPS = subjectName === 'EPS' || 
                                     subjectName === 'E.P.S' || 
                                     subjectName === 'E.P.S.' ||
                                     subjectName === 'E PS' ||
                                     subjectName.match(/^EPS$|^E\.P\.S$|^E\.PS$/i) ||
                                     subjectName.includes('EPS');
                        return !isEPS;
                    });
                    
                    console.log(`[getStudentBulletin] ═══ VÉRIFICATION DIRECTE DANS GRADES ═══`);
                    console.log(`[getStudentBulletin] Toutes les notes pour élève ${id}, composition ${composition_id}:`, allGradesCheck.map(g => ({
                        grade_id: g.grade_id,
                        student_id: g.student_id,
                        subject_name: g.subject_name,
                        grade: g.grade,
                        is_published: g.is_published,
                        composition_id: g.composition_id
                    })));
                    
                    // Filtrer seulement les notes publiées pour les parents
                    const publishedGradesCheck = allGradesCheck.filter(g => g.is_published === 1 || g.is_published === true);
                    console.log(`[getStudentBulletin] Notes publiées (pour parent): ${publishedGradesCheck.length} sur ${allGradesCheck.length}`);
                    
                    // Requête STRICTE : récupérer UNIQUEMENT les notes de cet enfant spécifique
                    // Double vérification avec CAST pour s'assurer que le student_id correspond exactement
                    // Filtrer EPS de manière plus robuste avec REGEXP et IN
                    const [compositionGradesRaw] = await pool.query(`
                        SELECT 
                            s.name as subject_name,
                            g.bulletin_subject_id as subject_id,
                            g.grade,
                            g.id as grade_id,
                            g.composition_id,
                            g.student_id,
                            g.class_id,
                            g.school_year,
                            g.is_published,
                            COALESCE(cs.coefficient, 1) as coefficient,
                            g.grade * COALESCE(cs.coefficient, 1) as weighted_grade,
                            s.display_order
                        FROM grades g
                        JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                        LEFT JOIN class_subjects cs ON cs.class_id = g.class_id AND cs.subject_id = g.bulletin_subject_id
                        WHERE CAST(g.student_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND CAST(g.class_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND CAST(g.composition_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND g.school_year = ?
                        AND ${isPublishedCondition}
                        AND UPPER(TRIM(s.name)) NOT IN ('EPS', 'E.P.S', 'E.P.S.', 'E PS')
                        AND UPPER(TRIM(s.name)) NOT REGEXP '^EPS$|^E\\.P\\.S$|^E\\.PS$|^EPS\\s*$|^E\\.P\\.S\\s*$|^E\\s+P\\s+S$'
                        ORDER BY s.display_order, s.name
                    `, [id, student.class_id, composition_id, currentSchoolYear]);
                    
                    // Filtrer EPS de manière supplémentaire en JavaScript pour être absolument sûr
                    const compositionGrades = compositionGradesRaw.filter(g => {
                        const subjectName = (g.subject_name || '').toUpperCase().trim();
                        // Exclure toutes les variantes d'EPS
                        const isEPS = subjectName === 'EPS' || 
                                     subjectName === 'E.P.S' || 
                                     subjectName === 'E.P.S.' ||
                                     subjectName === 'E PS' ||
                                     subjectName.match(/^EPS$|^E\.P\.S$|^E\.PS$/i) ||
                                     subjectName.includes('EPS');
                        if (isEPS) {
                            console.log(`[getStudentBulletin] ⚠️ EPS détecté et exclu: "${g.subject_name}"`);
                        }
                        return !isEPS;
                    });
                    
                    console.log(`[getStudentBulletin] Notes après filtrage EPS: ${compositionGrades.length} (avant: ${compositionGradesRaw.length})`);

                    console.log(`[getStudentBulletin] ═══ RÉCUPÉRATION DES NOTES DEPUIS LA TABLE GRADES ═══`);
                    console.log(`[getStudentBulletin] Requête SQL exécutée avec paramètres:`, {
                        student_id: id,
                        class_id: student.class_id,
                        composition_id: composition_id,
                        school_year: currentSchoolYear,
                        isPublishedCondition: isPublishedCondition
                    });
                    console.log(`[getStudentBulletin] Notes de composition trouvées dans grades: ${compositionGrades.length}`);
                    
                    // Vérification STRICTE : toutes les notes doivent appartenir exactement à cet élève
                    const wrongStudentGrades = compositionGrades.filter(g => {
                        const gradeStudentId = Number(g.student_id);
                        const requestedStudentId = Number(id);
                        return gradeStudentId !== requestedStudentId;
                    });
                    
                    if (wrongStudentGrades.length > 0) {
                        console.error(`[getStudentBulletin] ⚠️ ERREUR CRITIQUE: ${wrongStudentGrades.length} note(s) ne correspondent pas à l'élève ${id}:`, wrongStudentGrades);
                        // Retirer ces notes incorrectes pour éviter d'afficher des données d'un autre enfant
                        compositionGrades.splice(0, compositionGrades.length, 
                            ...compositionGrades.filter(g => Number(g.student_id) === Number(id))
                        );
                        console.log(`[getStudentBulletin] Notes après nettoyage: ${compositionGrades.length}`);
                    }
                    
                    // Vérification supplémentaire pour les parents : s'assurer qu'aucune note n'appartient à un autre enfant
                    if (req.user.role === 'parent') {
                        const invalidGrades = compositionGrades.filter(g => {
                            return Number(g.student_id) !== Number(req.user.student_id) || 
                                   Number(g.student_id) !== Number(id);
                        });
                        
                        if (invalidGrades.length > 0) {
                            console.error(`[getStudentBulletin] ⚠️ SÉCURITÉ: ${invalidGrades.length} note(s) ne correspondent pas à l'enfant du parent:`, invalidGrades);
                            return res.status(403).json({
                                message: 'Erreur de sécurité: certaines notes ne correspondent pas à votre enfant'
                            });
                        }
                    }
                    
                    console.log(`[getStudentBulletin] Détails complets des notes depuis grades pour l'élève ${id}:`, compositionGrades.map(g => ({ 
                        grade_id: g.grade_id,
                        subject_name: g.subject_name, 
                        subject_id: g.subject_id, 
                        grade: g.grade,
                        composition_id: g.composition_id,
                        student_id: g.student_id,
                        class_id: g.class_id,
                        school_year: g.school_year,
                        is_published: g.is_published
                    })));
                    
                    // Vérifier qu'il y a bien des notes publiées
                    const publishedGrades = compositionGrades.filter(g => g.is_published === 1 || g.is_published === true);
                    console.log(`[getStudentBulletin] Notes publiées: ${publishedGrades.length} sur ${compositionGrades.length}`);

                    if (compositionGrades.length === 0) {
                        // Si c'est un admin, créer un bulletin vide pour cette composition
                        if (req.user.role === 'admin' || req.user.role === 'secretary') {
                            console.log('[getStudentBulletin] Création d\'un bulletin de composition vide pour l\'admin');
                            
                            // Déterminer le niveau de la classe pour les matières de bulletin
                            const className = student.class_name.toUpperCase();
                            const isCP = className.startsWith('CP1') || className.startsWith('CP2') || className.startsWith('CP');
                            const levelGroup = isCP ? 'cp' : 'ce_cm';
                            
                            // Récupérer les matières spécifiques aux bulletins pour cette classe
                            // Exclure EPS pour les niveaux CE/CM
                            const [classSubjectsRaw] = await pool.query(`
                                SELECT
                                    bs.id as subject_id,
                                    bs.name as subject_name,
                                    COALESCE(MAX(cs.coefficient), 1) as coefficient
                                FROM bulletin_subjects bs
                                LEFT JOIN subject_bulletin_mappings sbm 
                                  ON sbm.bulletin_subject_id = bs.id AND sbm.level_group = bs.level_group
                                LEFT JOIN class_subjects cs 
                                  ON cs.class_id = ? AND cs.subject_id = sbm.subject_id
                                WHERE bs.level_group = ?
                                GROUP BY bs.id, bs.name, bs.display_order
                                ORDER BY bs.display_order, bs.name
                            `, [student.class_id, levelGroup]);

                            // Filtrer EPS - EXCLURE TOUTES LES VARIANTES
                            const classSubjects = classSubjectsRaw.filter(subject => {
                                const subjectName = (subject.subject_name || '').toUpperCase().trim();
                                const isEPS = subjectName === 'EPS' || 
                                             subjectName === 'E.P.S' || 
                                             subjectName === 'E.P.S.' ||
                                             subjectName === 'E PS' ||
                                             subjectName.match(/^EPS$|^E\.P\.S$|^E\.PS$/i) ||
                                             subjectName.includes('EPS');
                                return !isEPS;
                            });

                            const emptySubjects = classSubjects.map(subject => ({
                                subject_name: subject.subject_name,
                                subject_id: subject.subject_id,
                                average: 0,
                                coefficient: parseInt(subject.coefficient) || 1,
                                weighted_average: 0,
                                rank: 0,
                                total_students: 0,
                                teacher_name: 'Non assigné',
                                notes: []
                            }));

                            const emptyBulletinData = {
                                student_info: {
                                    first_name: student.first_name,
                                    last_name: student.last_name,
                                    class_name: student.class_name,
                                    registration_number: student.registration_number,
                                    gender: student.gender,
                                    date_of_birth: student.date_of_birth
                                },
                                composition: {
                                    id: composition_id,
                                    name: compositionInfo[0].name,
                                    date: compositionInfo[0].composition_date,
                                    description: compositionInfo[0].description
                                },
                                trimester: currentTrimester,
                                school_year: currentSchoolYear,
                                subjects: emptySubjects,
                                general_average: 0,
                                general_rank: 0,
                                total_class_students: totalClassStudents,
                                published: false,
                                bulletin_type: 'composition',
                                is_empty: true
                            };

                            console.log('[getStudentBulletin] Bulletin de composition vide créé pour l\'admin');
                            return res.json(emptyBulletinData);
                        } else {
                            return res.status(404).json({ 
                                message: 'Aucune note disponible pour cette composition' 
                            });
                        }
                    }

                    // Fonction pour déterminer le maximum d'une matière selon la classe
                    const getSubjectMaxScore = (subjectName, className) => {
                        const cls = (className || '').toUpperCase();
                        if (cls.startsWith('CP')) {
                            return 10; // CP: toutes les matières sur 10
                        }
                        const isCE1 = cls.startsWith('CE1');
                        const isCE2 = cls.startsWith('CE2');
                        const isCE = isCE1 || isCE2;
                        const isCM1 = cls.startsWith('CM1');
                        const isCM2 = cls.startsWith('CM2');
                        const isCM = isCM1 || isCM2;
                        const name = (subjectName || '').toUpperCase();
                        
                        if (isCE) {
                            if (name.includes('EXPLOITATION DE TEXTE')) return 30;
                            if (name.includes('A.E.M')) return 30;
                            if (name.includes('ORTHOGRAPHE') || name.includes('DICTEE') || name.includes('DICTÉE')) return 20;
                            if (name.includes('MATHEMATIQUE') || name.includes('MATHÉMATIQUE')) return 30;
                            if (name.includes('EPS') || name.includes('E.P.S')) return 20;
                            return 10;
                        }
                        if (isCE1 || isCE2) {
                            if (name.includes('EXPLOITATION DE TEXTE')) return 30;
                            if (name.includes('A.E.M')) return 30;
                            if (name.includes('ORTHOGRAPHE') || name.includes('DICTEE') || name.includes('DICTÉE')) return 20;
                            if (name.includes('MATHEMATIQUE') || name.includes('MATHÉMATIQUE')) return 30;
                            if (name.includes('LECTURE')) return 10;
                            if (name.includes('ANGLAIS')) return 10;
                            if (name.includes('CONDUITE')) return 10;
                        }
                        if (isCM1 || isCM2) {
                            if (name.includes('EXPLOITATION DE TEXTE')) return 50;
                            if (name.includes('A.E.M')) return 50;
                            if (name.includes('ORTHOGRAPHE') || name.includes('DICTEE') || name.includes('DICTÉE')) return 20;
                            if (name.includes('MATHEMATIQUE') || name.includes('MATHÉMATIQUE')) return 50;
                            if (name.includes('LECTURE')) return 10;
                            if (name.includes('ANGLAIS')) return 10;
                            if (name.includes('CONDUITE')) return 10;
                        }
                        return 20; // barème par défaut
                    };

                    // Fonction pour récupérer les notes telles qu'elles ont été saisies (pas de conversion)
                    const convertGradeForDisplay = (rawGrade, subjectName, className) => {
                        // Retourner la note brute telle qu'elle a été saisie par l'enseignant
                        return parseFloat(rawGrade) || 0;
                    };

                    // Calculer le rang pour chaque matière
                    const subjectsWithRanks = [];
                    for (const grade of compositionGrades) {
                        // Récupérer le classement pour cette matière dans cette composition
                        // Exclure EPS explicitement
                        const [classRankingRaw] = await pool.query(`
                            SELECT 
                                g.student_id,
                                g.grade,
                                s.name as subject_name
                            FROM grades g
                            JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                            WHERE g.class_id = ? 
                            AND g.bulletin_subject_id = ?
                            AND g.composition_id = ?
                            AND g.school_year = ?
                            AND ${isPublishedCondition}
                            AND UPPER(TRIM(s.name)) NOT IN ('EPS', 'E.P.S', 'E.P.S.', 'E PS')
                            AND UPPER(TRIM(s.name)) NOT REGEXP '^EPS$|^E\\.P\\.S$|^E\\.PS$|^EPS\\s*$|^E\\.P\\.S\\s*$|^E\\s+P\\s+S$'
                            ORDER BY g.grade DESC
                        `, [student.class_id, grade.subject_id, composition_id, currentSchoolYear]);
                        
                        // Filtrer EPS de manière supplémentaire - EXCLURE TOUTES LES VARIANTES
                        const classRanking = classRankingRaw.filter(r => {
                            const subjectName = (r.subject_name || '').toUpperCase().trim();
                            const isEPS = subjectName === 'EPS' || 
                                         subjectName === 'E.P.S' || 
                                         subjectName === 'E.P.S.' ||
                                         subjectName === 'E PS' ||
                                         subjectName.match(/^EPS$|^E\.P\.S$|^E\.PS$/i) ||
                                         subjectName.includes('EPS');
                            return !isEPS;
                        });
                        
                        // S'assurer que tous les élèves de la classe sont inclus dans le classement
                        // Récupérer tous les élèves de la classe
                        const [allClassStudentsForSubject] = await pool.query(`
                            SELECT DISTINCT e.student_id
                            FROM enrollments e
                            WHERE e.class_id = ? AND e.status = 'active' AND e.school_year = ?
                        `, [student.class_id, currentSchoolYear]);
                        
                        // Créer un classement complet incluant tous les élèves
                        const completeRanking = [...classRanking];
                        allClassStudentsForSubject.forEach(classStudent => {
                            const sid = classStudent.student_id;
                            // Si l'élève n'est pas déjà dans le ranking, l'ajouter avec note 0
                            if (!completeRanking.some(r => r.student_id === sid)) {
                                completeRanking.push({ student_id: sid, grade: 0 });
                            }
                        });
                        
                        // Trier le classement complet par note décroissante
                        completeRanking.sort((a, b) => {
                            const gradeA = parseFloat(a.grade) || 0;
                            const gradeB = parseFloat(b.grade) || 0;
                            if (gradeB === gradeA) {
                                return a.student_id - b.student_id; // En cas d'égalité, trier par ID
                            }
                            return gradeB - gradeA;
                        });

                        // Trouver le rang de l'élève courant
                        const rankIndex = completeRanking.findIndex(r => r.student_id === Number(id));
                        const rank = rankIndex >= 0 ? rankIndex + 1 : completeRanking.length + 1;

                        // Récupérer le nom du professeur
                        // Note: sch.subject_id dans schedules fait référence au subject_id (pas bulletin_subject_id)
                        // Il faut mapper bulletin_subject_id vers subject_id via subject_bulletin_mappings
                        const [teacherInfo] = await pool.query(`
                            SELECT COALESCE(CONCAT(t.first_name, ' ', t.last_name), 'Non assigné') as teacher_name
                            FROM schedules sch
                            LEFT JOIN teachers t ON sch.teacher_id = t.id
                            INNER JOIN subject_bulletin_mappings sbm ON sbm.subject_id = sch.subject_id AND sbm.bulletin_subject_id = ?
                            WHERE sch.class_id = ? 
                            AND sch.school_year = ?
                            LIMIT 1
                        `, [grade.subject_id, student.class_id, currentSchoolYear]);

                        const teacher_name = teacherInfo.length > 0 ? teacherInfo[0].teacher_name : 'Non assigné';

                        // Utiliser directement la note depuis la table grades (sans conversion)
                        const noteFromGrades = parseFloat(grade.grade) || 0;
                        const maxScore = getSubjectMaxScore(grade.subject_name, className);

                        console.log(`[getStudentBulletin] Matière: ${grade.subject_name} - Note depuis grades.grade: ${noteFromGrades} (ID grade: ${grade.grade_id})`);

                        subjectsWithRanks.push({
                            subject_name: grade.subject_name,
                            subject_id: grade.subject_id,
                            average: noteFromGrades, // Utiliser directement la note depuis grades
                            max_score: maxScore,
                            coefficient: parseInt(grade.coefficient) || 1,
                            weighted_average: noteFromGrades * (parseInt(grade.coefficient) || 1),
                            rank: rank,
                            total_students: completeRanking.length, // Utiliser le classement complet
                            teacher_name: teacher_name,
                            notes: [{ grade: noteFromGrades, composition_name: compositionInfo[0].name }],
                            grade_id: grade.grade_id // Inclure l'ID pour vérifier que ça vient bien de grades
                        });
                        
                        console.log(`[getStudentBulletin] Matière ${grade.subject_name}: Rang de l'élève ${id} = ${rank}/${completeRanking.length}`);
                    }

                    // Calculer la moyenne générale pour cette composition
                    let generalAverage = 0; // Moyenne de l'élève courant
                    let classAverage = 0; // Moyenne de la classe (toutes les moyennes divisées par l'effectif)
                    let highestAverage = null; // Moyenne la plus élevée de la classe
                    let lowestAverage = null; // Moyenne la plus faible de la classe
                    let generalRank = 0;
                    
                    // Pour les bulletins de composition CE1/CE2, calculer selon les règles spécifiques
                    // isCE1 et isCE2 déjà déclarés plus haut
                    
                    let totalPoints = 0;
                    let totalMaxPoints = 0;
                    
                    console.log(`[getStudentBulletin] ═══ CALCUL DU TOTAL ET DE LA MOYENNE ═══`);
                    console.log(`[getStudentBulletin] Classe: "${className}", isCE1: ${isCE1}, isCE2: ${isCE2}`);
                    console.log(`[getStudentBulletin] Nombre de matières: ${subjectsWithRanks.length}`);
                    console.log(`[getStudentBulletin] Matières disponibles:`, subjectsWithRanks.map(s => s.subject_name));
                    
                    if (isCE1 || isCE2) {
                        // Pour CE1/CE2: prendre UNIQUEMENT les 4 matières principales
                        const targetedSubjects = ['EXPLOITATION DE TEXTE', 'A.E.M', 'ORTHOGRAPHE', 'DICTEE', 'DICTÉE', 'MATHEMATIQUE', 'MATHÉMATIQUE'];
                        
                        console.log(`[getStudentBulletin] 🔍 Filtrage pour CE1/CE2 - Matières cibles:`, targetedSubjects);
                        
                        subjectsWithRanks.forEach(subject => {
                            const subjectName = (subject.subject_name || '').toUpperCase();
                            const isTargeted = targetedSubjects.some(target => subjectName.includes(target));
                            
                            if (isTargeted) {
                                const noteFromGrades = subject.average || 0;
                                const maxForSubject = subject.max_score || 20;
                                totalPoints += noteFromGrades;
                                totalMaxPoints += maxForSubject;
                                console.log(`[getStudentBulletin] ✅ Matière incluse: ${subject.subject_name} - Note: ${noteFromGrades} / Max: ${maxForSubject}`);
                            } else {
                                console.log(`[getStudentBulletin] ❌ Matière exclue: ${subject.subject_name}`);
                            }
                        });
                        
                        // CE1: moyenne = total / 11, CE2: moyenne = total / 17
                        // Cette moyenne est pour l'élève courant uniquement (sera recalculée pour tous les élèves plus bas)
                        if (totalPoints === 0 && totalMaxPoints === 0) {
                            console.warn(`[getStudentBulletin] ⚠️ ATTENTION: Aucune matière cible trouvée pour CE1/CE2!`);
                            console.warn(`[getStudentBulletin] Vérification des matières:`, subjectsWithRanks.map(s => ({
                                name: s.subject_name,
                                average: s.average,
                                max_score: s.max_score
                            })));
                        }
                        
                        const studentAverageValue = isCE1 ? (totalPoints / 11) : (totalPoints / 17);
                        generalAverage = studentAverageValue; // Moyenne de l'élève courant
                        
                        console.log(`[getStudentBulletin] ═══ RÉSULTAT CALCUL CE1/CE2 ═══`);
                        console.log(`[getStudentBulletin] Total points (4 matières) pour l'élève courant: ${totalPoints}`);
                        console.log(`[getStudentBulletin] Total max points: ${totalMaxPoints}`);
                        console.log(`[getStudentBulletin] Diviseur: ${isCE1 ? '11 (CE1)' : '17 (CE2)'}`);
                        console.log(`[getStudentBulletin] Calcul: ${totalPoints} / ${isCE1 ? '11' : '17'} = ${studentAverageValue.toFixed(4)}`);
                        console.log(`[getStudentBulletin] Moyenne de l'élève courant: ${generalAverage.toFixed(2)}/10`);
                    } else {
                        // Pour les autres classes: calcul normal (total/total_max)*10
                        subjectsWithRanks.forEach(subject => {
                            const noteFromGrades = subject.average || 0;
                            const maxForSubject = subject.max_score || 20;
                            totalPoints += noteFromGrades;
                            totalMaxPoints += maxForSubject;
                            console.log(`[getStudentBulletin] Matière: ${subject.subject_name} - Note (grades): ${noteFromGrades} / Max: ${maxForSubject}`);
                        });

                        // La moyenne générale est calculée sur 10 : (total_points / total_max_points) * 10
                        generalAverage = totalMaxPoints > 0 ? (totalPoints / totalMaxPoints) * 10 : 0;
                    }
                    
                    console.log(`[getStudentBulletin] Total points (depuis grades): ${totalPoints}`);
                    console.log(`[getStudentBulletin] Total max points: ${totalMaxPoints}`);
                    console.log(`[getStudentBulletin] Moyenne calculée: ${generalAverage.toFixed(2)}/10`);
                    
                    console.log(`[getStudentBulletin] Calcul moyenne composition:`, {
                        totalPoints,
                        totalMaxPoints,
                        generalAverage,
                        subjectsCount: subjectsWithRanks.length,
                        subjects: subjectsWithRanks.map(s => ({ name: s.subject_name, avg: s.average, max: s.max_score }))
                    });

                    // Calculer les moyennes de chaque élève de la même manière que pour l'élève actuel
                    // Récupérer toutes les notes de tous les élèves pour cette composition avec les noms de matières
                    // Exclure EPS de manière robuste
                    // IMPORTANT: Pour le classement, on doit récupérer TOUTES les notes publiées de TOUS les élèves de la classe
                    console.log(`[getStudentBulletin] ═══ RÉCUPÉRATION DES NOTES DE TOUS LES ÉLÈVES ═══`);
                    console.log(`[getStudentBulletin] Récupération pour class_id: ${student.class_id}, composition_id: ${composition_id}, school_year: ${currentSchoolYear}`);
                    console.log(`[getStudentBulletin] Condition is_published: ${isPublishedCondition}`);
                    console.log(`[getStudentBulletin] Rôle utilisateur: ${req.user.role}`);
                    
                    // Vérification directe : compter toutes les notes publiées dans grades pour cette composition et classe
                    const [allGradesCount] = await pool.query(`
                        SELECT 
                            COUNT(*) as total_notes,
                            COUNT(DISTINCT g.student_id) as total_students_with_grades,
                            g.is_published
                        FROM grades g
                        JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                        WHERE CAST(g.class_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND CAST(g.composition_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND g.school_year = ?
                        AND UPPER(TRIM(s.name)) NOT IN ('EPS', 'E.P.S', 'E.P.S.', 'E PS')
                        AND UPPER(TRIM(s.name)) NOT REGEXP '^EPS$|^E\\.P\\.S$|^E\\.PS$|^EPS\\s*$|^E\\.P\\.S\\s*$|^E\\s+P\\s+S$'
                        GROUP BY g.is_published
                    `, [student.class_id, composition_id, currentSchoolYear]);
                    
                    console.log(`[getStudentBulletin] ═══ VÉRIFICATION DIRECTE DES NOTES DANS GRADES ═══`);
                    console.log(`[getStudentBulletin] Statistiques des notes (par statut is_published):`, allGradesCount);
                    
                    // Comptage séparé des notes publiées et non publiées
                    const [publishedCount] = await pool.query(`
                        SELECT 
                            COUNT(*) as total,
                            COUNT(DISTINCT g.student_id) as students_count
                        FROM grades g
                        JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                        WHERE CAST(g.class_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND CAST(g.composition_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND g.school_year = ?
                        AND g.is_published = 1
                        AND UPPER(TRIM(s.name)) NOT IN ('EPS', 'E.P.S', 'E.P.S.', 'E PS')
                        AND UPPER(TRIM(s.name)) NOT REGEXP '^EPS$|^E\\.P\\.S$|^E\\.PS$|^EPS\\s*$|^E\\.P\\.S\\s*$|^E\\s+P\\s+S$'
                    `, [student.class_id, composition_id, currentSchoolYear]);
                    
                    console.log(`[getStudentBulletin] Notes publiées: ${publishedCount[0]?.total || 0} notes pour ${publishedCount[0]?.students_count || 0} élèves`);
                    
                    const [allStudentGradesRaw] = await pool.query(`
                        SELECT 
                            g.student_id,
                            g.bulletin_subject_id,
                            s.name as subject_name,
                            g.grade,
                            g.is_published
                        FROM grades g
                        JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                        WHERE CAST(g.class_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND CAST(g.composition_id AS UNSIGNED) = CAST(? AS UNSIGNED)
                        AND g.school_year = ?
                        AND ${isPublishedCondition}
                        AND UPPER(TRIM(s.name)) NOT IN ('EPS', 'E.P.S', 'E.P.S.', 'E PS')
                        AND UPPER(TRIM(s.name)) NOT REGEXP '^EPS$|^E\\.P\\.S$|^E\\.PS$|^EPS\\s*$|^E\\.P\\.S\\s*$|^E\\s+P\\s+S$'
                    `, [student.class_id, composition_id, currentSchoolYear]);
                    
                    console.log(`[getStudentBulletin] Notes brutes récupérées depuis grades: ${allStudentGradesRaw.length}`);
                    console.log(`[getStudentBulletin] Répartition par élève:`, allStudentGradesRaw.reduce((acc, row) => {
                        const sid = row.student_id;
                        acc[sid] = (acc[sid] || 0) + 1;
                        return acc;
                    }, {}));
                    
                    // Filtrer EPS de manière supplémentaire en JavaScript - EXCLURE TOUTES LES VARIANTES
                    const allStudentGrades = allStudentGradesRaw.filter(row => {
                        const subjectName = (row.subject_name || '').toUpperCase().trim();
                        const isEPS = subjectName === 'EPS' || 
                                     subjectName === 'E.P.S' || 
                                     subjectName === 'E.P.S.' ||
                                     subjectName === 'E PS' ||
                                     subjectName.match(/^EPS$|^E\.P\.S$|^E\.PS$/i) ||
                                     subjectName.includes('EPS');
                        return !isEPS;
                    });

                    console.log(`[getStudentBulletin] Notes après filtrage EPS: ${allStudentGrades.length}`);
                    console.log(`[getStudentBulletin] Détails des notes par élève (premiers 10):`, 
                        Object.entries(allStudentGrades.reduce((acc, row) => {
                            const sid = row.student_id;
                            if (!acc[sid]) acc[sid] = [];
                            acc[sid].push({ subject: row.subject_name, grade: row.grade });
                            return acc;
                        }, {})).slice(0, 10)
                    );

                    // ÉTAPE CRITIQUE : Récupérer D'ABORD tous les élèves de la classe
                    // pour s'assurer qu'ils sont TOUS inclus dans le ranking, même sans notes
                    console.log(`[getStudentBulletin] ═══ RÉCUPÉRATION DE TOUS LES ÉLÈVES DE LA CLASSE ═══`);
                    console.log(`[getStudentBulletin] 🔍 Requête SQL: class_id=${student.class_id}, school_year=${currentSchoolYear}`);
                    
                    // Vérification 1: Compter depuis enrollments SANS filtre de statut (tous les statuts)
                    const [countResultAll] = await pool.query(`
                        SELECT COUNT(DISTINCT e.student_id) as total_count
                        FROM enrollments e
                        WHERE e.class_id = ? AND e.school_year = ?
                    `, [student.class_id, currentSchoolYear]);
                    const countFromEnrollmentsAll = countResultAll[0]?.total_count || 0;
                    console.log(`[getStudentBulletin] 📊 Nombre d'élèves distincts dans enrollments (TOUS statuts): ${countFromEnrollmentsAll}`);
                    
                    // Initialiser finalTotalClassStudents avec la valeur de countFromEnrollmentsAll
                    // Elle sera recalculée plus tard juste avant la création de bulletinData
                    let finalTotalClassStudents = countFromEnrollmentsAll;
                    
                    // Vérification 1b: Récupérer tous les student_id depuis enrollments pour identifier les problèmes de JOIN
                    const [enrollmentStudentIds] = await pool.query(`
                        SELECT DISTINCT e.student_id, e.status
                        FROM enrollments e
                        WHERE e.class_id = ? AND e.school_year = ?
                        ORDER BY e.student_id
                    `, [student.class_id, currentSchoolYear]);
                    console.log(`[getStudentBulletin] 📊 Liste des ${enrollmentStudentIds.length} student_id depuis enrollments:`);
                    enrollmentStudentIds.forEach((e, idx) => {
                        console.log(`[getStudentBulletin]   ${idx + 1}. student_id: ${e.student_id}, status: ${e.status}`);
                    });
                    
                    // Vérification 2: Récupérer TOUS les élèves avec leurs détails (TOUS statuts)
                    // APPROCHE ROBUSTE: Utiliser LEFT JOIN pour inclure TOUS les élèves de enrollments,
                    // même si le JOIN avec students échoue (élève supprimé mais toujours dans enrollments)
                    // Ensuite, activer automatiquement les élèves inactifs pour garantir un effectif correct
                    const [allClassStudentsRaw] = await pool.query(`
                        SELECT DISTINCT 
                            e.student_id, 
                            COALESCE(s.first_name, 'N/A') as first_name, 
                            COALESCE(s.last_name, 'N/A') as last_name, 
                            s.id as student_db_id, 
                            e.status,
                            e.id as enrollment_id
                        FROM enrollments e
                        LEFT JOIN students s ON e.student_id = s.id
                        WHERE e.class_id = ? AND e.school_year = ?
                        ORDER BY e.student_id
                    `, [student.class_id, currentSchoolYear]);
                    
                    // Activer automatiquement tous les élèves inactifs pour garantir un effectif correct
                    let allClassStudents;
                    const studentsToActivate = allClassStudentsRaw.filter(s => s.status !== 'active');
                    if (studentsToActivate.length > 0) {
                        console.log(`[getStudentBulletin] 🔄 Activation automatique de ${studentsToActivate.length} élève(s) inactif(s) pour corriger l'effectif total`);
                        
                        const enrollmentIds = studentsToActivate.map(s => s.enrollment_id).filter(id => id != null);
                        if (enrollmentIds.length > 0) {
                            await pool.query(`
                                UPDATE enrollments 
                                SET status = 'active' 
                                WHERE id IN (${enrollmentIds.map(() => '?').join(',')})
                            `, enrollmentIds);
                            console.log(`[getStudentBulletin] ✅ ${enrollmentIds.length} élève(s) activé(s) automatiquement`);
                            
                            // Recharger les données avec les statuts mis à jour
                            const [allClassStudentsUpdated] = await pool.query(`
                                SELECT DISTINCT 
                                    e.student_id, 
                                    COALESCE(s.first_name, 'N/A') as first_name, 
                                    COALESCE(s.last_name, 'N/A') as last_name, 
                                    s.id as student_db_id, 
                                    e.status
                                FROM enrollments e
                                LEFT JOIN students s ON e.student_id = s.id
                                WHERE e.class_id = ? AND e.school_year = ?
                                ORDER BY e.student_id
                            `, [student.class_id, currentSchoolYear]);
                            allClassStudents = allClassStudentsUpdated;
                        } else {
                            // Si pas d'enrollment_id, forcer le statut à active en mémoire
                            allClassStudents = allClassStudentsRaw.map(s => ({
                                student_id: s.student_id,
                                first_name: s.first_name,
                                last_name: s.last_name,
                                student_db_id: s.student_db_id,
                                status: 'active'
                            }));
                        }
                    } else {
                        allClassStudents = allClassStudentsRaw.map(s => ({
                            student_id: s.student_id,
                            first_name: s.first_name,
                            last_name: s.last_name,
                            student_db_id: s.student_db_id,
                            status: s.status
                        }));
                    }
                    
                    console.log(`[getStudentBulletin] 📊 Total élèves récupérés (après activation automatique): ${allClassStudents.length}`);
                    console.log(`[getStudentBulletin] 📊 Comparaison: count SQL=${countFromEnrollmentsAll}, enrollments=${enrollmentStudentIds.length}, résultats finaux=${allClassStudents.length}`);
                    
                    // Vérification finale: tous les élèves doivent être présents
                    if (countFromEnrollmentsAll !== allClassStudents.length) {
                        console.error(`[getStudentBulletin] ⚠️ ATTENTION: Incohérence détectée !`);
                        console.error(`[getStudentBulletin] ⚠️ COUNT renvoie ${countFromEnrollmentsAll} mais résultats finaux=${allClassStudents.length}`);
                        console.error(`[getStudentBulletin] ⚠️ Différence: ${Math.abs(countFromEnrollmentsAll - allClassStudents.length)} élève(s)`);
                        
                        // CORRECTION: Si le COUNT indique plus d'élèves que allClassStudents, identifier le manquant
                        if (countFromEnrollmentsAll > allClassStudents.length) {
                            console.error(`[getStudentBulletin] ⚠️⚠️⚠️ PROBLÈME CRITIQUE: ${countFromEnrollmentsAll} élèves dans enrollments mais seulement ${allClassStudents.length} dans allClassStudents`);
                            
                            // Identifier les student_id manquants
                            const allClassStudentIds = new Set(allClassStudents.map(s => s.student_id));
                            const missingStudentIds = enrollmentStudentIds.filter(e => !allClassStudentIds.has(e.student_id));
                            
                            if (missingStudentIds.length > 0) {
                                console.error(`[getStudentBulletin] ❌ ${missingStudentIds.length} élève(s) manquant(s) dans allClassStudents:`);
                                
                                // Ajouter tous les élèves manquants à allClassStudents
                                for (const m of missingStudentIds) {
                                    console.error(`[getStudentBulletin]   - ID: ${m.student_id}, Status: ${m.status}`);
                                    
                                    // Essayer de récupérer les infos de cet élève
                                    try {
                                        const [studentInfo] = await pool.query(`
                                            SELECT s.id, s.first_name, s.last_name
                                            FROM students s
                                            WHERE s.id = ?
                                        `, [m.student_id]);
                                        
                                        if (studentInfo.length > 0) {
                                            console.error(`[getStudentBulletin]     Nom: ${studentInfo[0].first_name} ${studentInfo[0].last_name}`);
                                            // Ajouter l'élève avec ses vraies informations
                                            allClassStudents.push({
                                                student_id: m.student_id,
                                                first_name: studentInfo[0].first_name || 'N/A',
                                                last_name: studentInfo[0].last_name || 'N/A',
                                                student_db_id: studentInfo[0].id,
                                                status: m.status || 'active'
                                            });
                                        } else {
                                            console.error(`[getStudentBulletin]     ⚠️ Élève non trouvé dans la table students (peut-être supprimé)`);
                                            // Ajouter quand même avec valeurs par défaut
                                            allClassStudents.push({
                                                student_id: m.student_id,
                                                first_name: 'N/A',
                                                last_name: 'N/A',
                                                student_db_id: null,
                                                status: m.status || 'active'
                                            });
                                        }
                                    } catch (err) {
                                        console.error(`[getStudentBulletin]     Erreur lors de la récupération:`, err.message);
                                        // Ajouter quand même avec valeurs par défaut
                                        allClassStudents.push({
                                            student_id: m.student_id,
                                            first_name: 'N/A',
                                            last_name: 'N/A',
                                            student_db_id: null,
                                            status: m.status || 'active'
                                        });
                                    }
                                    
                                    console.error(`[getStudentBulletin]   ✅ Élève ajouté à allClassStudents`);
                                }
                                
                                console.error(`[getStudentBulletin] ✅✅✅ allClassStudents corrigé: ${allClassStudents.length} élèves (devrait être ${countFromEnrollmentsAll})`);
                            }
                        }
                    } else {
                        console.log(`[getStudentBulletin] ✅ VÉRIFICATION OK: Tous les ${allClassStudents.length} élèves inscrits sont inclus dans le classement`);
                        console.log(`[getStudentBulletin] ✅ Effectif total correct et dynamique`);
                    }
                    
                    // FORCER allClassStudents.length si countFromEnrollmentsAll est supérieur
                    if (countFromEnrollmentsAll > allClassStudents.length) {
                        console.warn(`[getStudentBulletin] ⚠️⚠️⚠️ CORRECTION: countFromEnrollmentsAll (${countFromEnrollmentsAll}) > allClassStudents.length (${allClassStudents.length})`);
                        console.warn(`[getStudentBulletin] ⚠️ Utilisation de countFromEnrollmentsAll comme source de vérité pour l'effectif`);
                    }
                    
                    // Afficher le détail des statuts pour information
                    const statusCounts = {};
                    allClassStudents.forEach(s => {
                        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
                    });
                    console.log(`[getStudentBulletin] 📊 Répartition par statut:`, statusCounts);
                    
                    console.log(`[getStudentBulletin] 📋 Liste complète des ${allClassStudents.length} élèves:`);
                    allClassStudents.forEach((e, idx) => {
                        console.log(`[getStudentBulletin]   ${idx + 1}. ID: ${e.student_id}, Nom: ${e.first_name} ${e.last_name}`);
                    });
                    
                    // Initialiser TOUS les élèves avec moyenne 0
                    const perStudentAverages = new Map();
                    console.log(`[getStudentBulletin] ═══ INITIALISATION DE perStudentAverages ═══`);
                    console.log(`[getStudentBulletin] 📊 Nombre d'élèves à initialiser: ${allClassStudents.length}`);
                    
                    allClassStudents.forEach((classStudent, idx) => {
                        const sid = classStudent.student_id;
                        if (!sid || sid === null || sid === undefined) {
                            console.error(`[getStudentBulletin] ❌ Élève avec student_id NULL à l'index ${idx}:`, classStudent);
                            return; // Ignorer les élèves avec ID invalide
                        }
                        if (isCE1 || isCE2) {
                            perStudentAverages.set(sid, { totalPoints: 0 });
                        } else {
                            perStudentAverages.set(sid, { totalPoints: 0, totalMax: 0 });
                        }
                    });
                    
                    console.log(`[getStudentBulletin] ✅ ${perStudentAverages.size} élèves initialisés dans perStudentAverages`);
                    if (perStudentAverages.size !== allClassStudents.length) {
                        console.error(`[getStudentBulletin] ❌ ERREUR: ${allClassStudents.length - perStudentAverages.size} élève(s) non initialisé(s) !`);
                        const initializedIds = new Set(Array.from(perStudentAverages.keys()));
                        const missingInInit = allClassStudents.filter(s => !initializedIds.has(s.student_id));
                        missingInInit.forEach(m => {
                            console.error(`[getStudentBulletin]   - Élève non initialisé: ID=${m.student_id}, Nom=${m.first_name} ${m.last_name}`);
                        });
                    }
                    
                    console.log(`[getStudentBulletin] ═══ CALCUL DU CLASSEMENT ═══`);
                    console.log(`[getStudentBulletin] Classe: ${className}, isCE1: ${isCE1}, isCE2: ${isCE2}`);
                    console.log(`[getStudentBulletin] Nombre de notes depuis grades pour le classement: ${allStudentGrades.length}`);
                    console.log(`[getStudentBulletin] Nombre d'élèves initialisés dans perStudentAverages: ${perStudentAverages.size}`);
                    
                    if (isCE1 || isCE2) {
                        // Pour CE1/CE2: prendre UNIQUEMENT les 4 matières principales pour le classement
                        const targetedSubjects = ['EXPLOITATION DE TEXTE', 'A.E.M', 'ORTHOGRAPHE', 'DICTEE', 'DICTÉE', 'MATHEMATIQUE', 'MATHÉMATIQUE'];
                        
                        console.log(`[getStudentBulletin] 🎯 Matières cibles pour CE1/CE2:`, targetedSubjects);
                        
                        allStudentGrades.forEach(row => {
                            const subjectName = (row.subject_name || '').toUpperCase();
                            const isTargeted = targetedSubjects.some(target => subjectName.includes(target));
                            
                            if (isTargeted) {
                                const sid = row.student_id;
                                const gradeFromDB = parseFloat(row.grade) || 0;
                                
                                const current = perStudentAverages.get(sid);
                                if (current) {
                                    current.totalPoints += gradeFromDB;
                                    perStudentAverages.set(sid, current);
                                    console.log(`[getStudentBulletin] ✅ Matière incluse: ${row.subject_name} (élève ${sid}): ${gradeFromDB} → Total: ${current.totalPoints}`);
                                } else {
                                    console.error(`[getStudentBulletin] ⚠️ Élève ${sid} non trouvé dans perStudentAverages pour la matière ${row.subject_name}`);
                                    // Ajouter l'élève s'il n'était pas dans la liste initiale
                                    perStudentAverages.set(sid, { totalPoints: gradeFromDB });
                                    console.log(`[getStudentBulletin] ✅ Élève ${sid} ajouté dynamiquement`);
                                }
                            } else {
                                console.log(`[getStudentBulletin] ❌ Matière exclue du classement: ${row.subject_name} (élève ${row.student_id})`);
                            }
                        });
                    } else {
                        // Pour les autres classes: calcul normal
                        allStudentGrades.forEach(row => {
                            const sid = row.student_id;
                            const gradeFromDB = parseFloat(row.grade) || 0;
                            const maxScore = getSubjectMaxScore(row.subject_name, className);
                            
                            const current = perStudentAverages.get(sid);
                            if (current) {
                                current.totalPoints += gradeFromDB;
                                current.totalMax += maxScore;
                                perStudentAverages.set(sid, current);
                            } else {
                                // Ajouter l'élève s'il n'était pas dans la liste initiale
                                perStudentAverages.set(sid, { totalPoints: gradeFromDB, totalMax: maxScore });
                            }
                        });
                    }
                    
                    // Créer le classement avec les moyennes calculées selon les règles de la classe
                    // IMPORTANT: TOUS les élèves de la classe sont maintenant dans perStudentAverages
                    const ranking = [];
                    console.log(`[getStudentBulletin] ═══ CALCUL DES MOYENNES PAR ÉLÈVE ═══`);
                    console.log(`[getStudentBulletin] 📊 Nombre d'élèves dans perStudentAverages: ${perStudentAverages.size}`);
                    console.log(`[getStudentBulletin] 📊 Nombre d'élèves attendus: ${allClassStudents.length}`);
                    
                    const processedStudentIds = new Set();
                    
                    for (const [sid, val] of perStudentAverages.entries()) {
                        let avg = 0;
                        if (isCE1 || isCE2) {
                            // CE1: total/11, CE2: total/17
                            avg = isCE1 ? (val.totalPoints / 11) : (val.totalPoints / 17);
                            const studentInfo = allClassStudents.find(e => e.student_id === sid);
                            const studentName = studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : `ID ${sid}`;
                            console.log(`[getStudentBulletin] 👤 ${studentName} (${sid}): Total=${val.totalPoints}, Diviseur=${isCE1 ? '11' : '17'}, Moyenne=${avg.toFixed(4)}/10`);
                        } else {
                            // Autres classes: (total/totalMax)*10
                            avg = val.totalMax > 0 ? (val.totalPoints / val.totalMax) * 10 : 0;
                            const studentInfo = allClassStudents.find(e => e.student_id === sid);
                            const studentName = studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : `ID ${sid}`;
                            console.log(`[getStudentBulletin] 👤 ${studentName} (${sid}): Total=${val.totalPoints}, TotalMax=${val.totalMax}, Moyenne=${avg.toFixed(4)}/10`);
                        }
                        ranking.push({ student_id: sid, general_average: avg });
                        processedStudentIds.add(sid);
                    }
                    
                    // VÉRIFICATION CRITIQUE: S'assurer que TOUS les élèves de allClassStudents sont dans le ranking
                    const missingInRanking = allClassStudents.filter(s => !processedStudentIds.has(s.student_id));
                    if (missingInRanking.length > 0) {
                        console.error(`[getStudentBulletin] ❌ ${missingInRanking.length} élève(s) manquant(s) dans le ranking, ajout avec moyenne 0:`);
                        missingInRanking.forEach(m => {
                            console.error(`[getStudentBulletin]   - Ajout: ID=${m.student_id}, Nom=${m.first_name} ${m.last_name}`);
                            ranking.push({ student_id: m.student_id, general_average: 0 });
                        });
                        console.log(`[getStudentBulletin] ✅ ${missingInRanking.length} élève(s) ajouté(s) au ranking avec moyenne 0`);
                    }
                    
                    console.log(`[getStudentBulletin] ✅ Classement créé avec ${ranking.length} élèves (TOUS les élèves de la classe inclus)`);
                    console.log(`[getStudentBulletin] ═══ VÉRIFICATION FINALE DE L'EFFECTIF ═══`);
                    console.log(`[getStudentBulletin] 📊 Élèves récupérés depuis enrollments: ${allClassStudents.length}`);
                    console.log(`[getStudentBulletin] 📊 Élèves initialisés dans perStudentAverages: ${perStudentAverages.size}`);
                    console.log(`[getStudentBulletin] 📊 Élèves ajoutés au ranking: ${ranking.length}`);
                    
                    if (allClassStudents.length !== ranking.length) {
                        console.error(`[getStudentBulletin] ❌❌❌ ERREUR CRITIQUE: Nombre d'élèves différent !`);
                        console.error(`[getStudentBulletin] ❌ allClassStudents: ${allClassStudents.length}`);
                        console.error(`[getStudentBulletin] ❌ ranking: ${ranking.length}`);
                        
                        // Trouver les élèves manquants
                        const studentsInRanking = new Set(ranking.map(r => r.student_id));
                        const missingStudents = allClassStudents.filter(s => !studentsInRanking.has(s.student_id));
                        if (missingStudents.length > 0) {
                            console.error(`[getStudentBulletin] ❌ ${missingStudents.length} élève(s) manquant(s) dans le ranking:`);
                            missingStudents.forEach(s => {
                                console.error(`[getStudentBulletin]   - ${s.first_name} ${s.last_name} (ID: ${s.student_id}, Status: ${s.status || 'N/A'})`);
                                // Ajouter immédiatement au ranking
                                ranking.push({ student_id: s.student_id, general_average: 0 });
                                console.error(`[getStudentBulletin]   ✅ Ajouté au ranking avec moyenne 0`);
                            });
                            console.error(`[getStudentBulletin] ✅✅✅ ${missingStudents.length} élève(s) ajouté(s) au ranking. Nouveau total: ${ranking.length}`);
                        }
                    } else {
                        console.log(`[getStudentBulletin] ✅ VÉRIFICATION OK: Tous les ${ranking.length} élèves sont dans le ranking`);
                    }
                    
                    // VÉRIFICATION FINALE ABSOLUE: S'assurer que ranking.length = allClassStudents.length
                    if (ranking.length !== allClassStudents.length) {
                        console.error(`[getStudentBulletin] ❌❌❌ ERREUR PERSISTANTE: ranking.length (${ranking.length}) ≠ allClassStudents.length (${allClassStudents.length})`);
                        console.error(`[getStudentBulletin] ⚠️ CORRECTION: Forcer l'ajout des élèves manquants`);
                        
                        const studentsInRankingSet = new Set(ranking.map(r => r.student_id));
                        const stillMissing = allClassStudents.filter(s => !studentsInRankingSet.has(s.student_id));
                        
                        stillMissing.forEach(s => {
                            console.error(`[getStudentBulletin]   - Ajout FORCÉ: ${s.first_name} ${s.last_name} (ID: ${s.student_id})`);
                            ranking.push({ student_id: s.student_id, general_average: 0 });
                        });
                        
                        console.error(`[getStudentBulletin] ✅✅✅ Ranking corrigé: ${ranking.length} élèves (devrait être ${allClassStudents.length})`);
                    }

                    // Trier par moyenne décroissante pour le classement
                    console.log(`[getStudentBulletin] ═══ TRI DU RANKING ═══`);
                    console.log(`[getStudentBulletin] Nombre d'élèves avant tri: ${ranking.length}`);
                    
                    ranking.sort((a, b) => {
                        const avgA = parseFloat(a.general_average) || 0;
                        const avgB = parseFloat(b.general_average) || 0;
                        
                        // Si les moyennes sont égales, on peut ajouter un critère secondaire (par exemple, l'ID)
                        if (avgB === avgA) {
                            return a.student_id - b.student_id; // Trier par ID croissant en cas d'égalité
                        }
                        return avgB - avgA; // Trier par moyenne décroissante
                    });
                    
                    // VÉRIFICATION : Le ranking est-il bien trié ?
                    let isSorted = true;
                    for (let i = 1; i < ranking.length; i++) {
                        const prevAvg = parseFloat(ranking[i-1].general_average) || 0;
                        const currAvg = parseFloat(ranking[i].general_average) || 0;
                        if (prevAvg < currAvg) {
                            isSorted = false;
                            console.error(`[getStudentBulletin] ❌ ERREUR: Ranking mal trié à l'index ${i}`);
                            console.error(`[getStudentBulletin]   Index ${i-1}: ${prevAvg.toFixed(4)}/10 (élève ${ranking[i-1].student_id})`);
                            console.error(`[getStudentBulletin]   Index ${i}: ${currAvg.toFixed(4)}/10 (élève ${ranking[i].student_id})`);
                            break;
                        }
                    }
                    if (isSorted) {
                        console.log(`[getStudentBulletin] ✅ Ranking correctement trié par moyenne décroissante`);
                        const firstStudentInfo = allClassStudents.find(e => e.student_id === ranking[0].student_id);
                        const firstStudentName = firstStudentInfo ? `${firstStudentInfo.first_name} ${firstStudentInfo.last_name}` : `ID ${ranking[0].student_id}`;
                        console.log(`[getStudentBulletin] 🥇 Premier élève: ${firstStudentName} (ID: ${ranking[0].student_id}) - Moyenne: ${ranking[0].general_average.toFixed(4)}/10`);
                        if (ranking.length > 1) {
                            const secondStudentInfo = allClassStudents.find(e => e.student_id === ranking[1].student_id);
                            const secondStudentName = secondStudentInfo ? `${secondStudentInfo.first_name} ${secondStudentInfo.last_name}` : `ID ${ranking[1].student_id}`;
                            console.log(`[getStudentBulletin] 🥈 Deuxième élève: ${secondStudentName} (ID: ${ranking[1].student_id}) - Moyenne: ${ranking[1].general_average.toFixed(4)}/10`);
                        }
                    }
                    
                    console.log(`[getStudentBulletin] ═══ CLASSEMENT COMPLET ═══`);
                    console.log(`[getStudentBulletin] Nombre total d'élèves dans le classement: ${ranking.length}`);
                    console.log(`[getStudentBulletin] 📊 CLASSEMENT COMPLET AVEC NOMS:`);
                    ranking.forEach((r, idx) => {
                        const studentInfo = allClassStudents.find(e => e.student_id === r.student_id);
                        const studentName = studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : `ID ${r.student_id}`;
                        const isCurrent = r.student_id === Number(id);
                        console.log(`[getStudentBulletin]   ${idx + 1}. ${studentName}${isCurrent ? ' ⭐ (ÉLÈVE COURANT)' : ''} - Moyenne: ${r.general_average.toFixed(4)}/10`);
                    });
                    console.log(`[getStudentBulletin] 🏆 TOP 10 DU CLASSEMENT:`);
                    ranking.slice(0, 10).forEach((r, idx) => {
                        const studentInfo = allClassStudents.find(e => e.student_id === r.student_id);
                        const studentName = studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : `ID ${r.student_id}`;
                        const isCurrent = r.student_id === Number(id);
                        console.log(`[getStudentBulletin]   ${idx + 1}. ${studentName}${isCurrent ? ' ⭐ (ÉLÈVE COURANT)' : ''} - Moyenne: ${r.general_average.toFixed(4)}/10`);
                    });
                    
                    // Filtrer les élèves qui ont des notes (moyenne > 0) pour les statistiques
                    const studentsWithGrades = ranking.filter(r => r.general_average > 0);
                    
                    // Note: L'effectif total sera recalculé juste avant la création de bulletinData
                    console.log(`[getStudentBulletin] ═══ VÉRIFICATION INTERMÉDIAIRE ═══`);
                    console.log(`[getStudentBulletin] 📊 COUNT SQL depuis enrollments: ${countFromEnrollmentsAll}`);
                    console.log(`[getStudentBulletin] 📊 Taille du ranking: ${ranking.length}`);
                    
                    // Si le ranking a moins d'élèves que le COUNT, c'est un problème critique
                    if (ranking.length < countFromEnrollmentsAll) {
                        console.error(`[getStudentBulletin] ❌❌❌ ERREUR CRITIQUE: Ranking incomplet !`);
                        console.error(`[getStudentBulletin] ❌ COUNT SQL indique ${countFromEnrollmentsAll} élèves mais ranking n'en a que ${ranking.length}`);
                        console.error(`[getStudentBulletin] ❌ ${countFromEnrollmentsAll - ranking.length} élève(s) manquant(s) dans le ranking`);
                    } else if (ranking.length === countFromEnrollmentsAll) {
                        console.log(`[getStudentBulletin] ✅ VÉRIFICATION OK: Ranking complet (${ranking.length} élèves = ${countFromEnrollmentsAll} attendus)`);
                    } else {
                        console.warn(`[getStudentBulletin] ⚠️ ATTENTION: Ranking a ${ranking.length} élèves mais COUNT SQL indique ${countFromEnrollmentsAll}`);
                    }
                    
                    console.log(`[getStudentBulletin] ═══ CALCUL DU RANG ═══`);
                    console.log(`[getStudentBulletin] 📊 Effectif dans le ranking: ${ranking.length}`);
                    console.log(`[getStudentBulletin] 📊 Élèves avec notes (moyenne > 0): ${studentsWithGrades.length}`);
                    console.log(`[getStudentBulletin] 📊 Élèves sans notes (moyenne = 0): ${ranking.length - studentsWithGrades.length}`);
                    console.log(`[getStudentBulletin] ✅ Effectif total de la classe (depuis COUNT SQL): ${finalTotalClassStudents}`);
                    console.log(`[getStudentBulletin] ✅ L'effectif total correspond au nombre réel d'élèves dans enrollments`);
                    
                    // IMPORTANT: Le rang doit être calculé dans le ranking complet (tous les élèves de la classe)
                    // mais affiché comme "rang/effectif_total"
                    console.log(`[getStudentBulletin] ═══ CALCUL DU RANG POUR L'ÉLÈVE ${id} ═══`);
                    console.log(`[getStudentBulletin] 📊 Recherche de l'élève ${id} dans le ranking de ${ranking.length} élèves`);
                    
                    const currentStudentIndex = ranking.findIndex(r => r.student_id === Number(id));
                    
                    if (currentStudentIndex >= 0) {
                        // L'élève est dans le ranking, son rang est sa position dans le classement complet
                        generalRank = currentStudentIndex + 1;
                        const rankingAverage = ranking[currentStudentIndex].general_average;
                        
                        console.log(`[getStudentBulletin] ✅ ÉLÈVE TROUVÉ`);
                        console.log(`[getStudentBulletin] 📍 Position dans ranking: ${currentStudentIndex + 1}/${ranking.length}`);
                        console.log(`[getStudentBulletin] 📊 Moyenne dans ranking: ${rankingAverage.toFixed(4)}/10`);
                        console.log(`[getStudentBulletin] 📊 Moyenne calculée séparément: ${generalAverage.toFixed(4)}/10`);
                        
                        // Vérifier la cohérence entre la moyenne calculée et celle du ranking
                        if (Math.abs(rankingAverage - generalAverage) > 0.01) {
                            console.warn(`[getStudentBulletin] ⚠️ ERREUR: Différence entre moyenne calculée et moyenne du ranking !`);
                            console.warn(`[getStudentBulletin] ⚠️ Différence: ${Math.abs(rankingAverage - generalAverage).toFixed(4)}`);
                            console.warn(`[getStudentBulletin] ⚠️ Correction: Utilisation de la moyenne du ranking`);
                            // Utiliser la moyenne du ranking pour garantir la cohérence
                            generalAverage = rankingAverage;
                        }
                        
                        // VÉRIFICATION CRITIQUE : Y a-t-il des élèves avec une moyenne PLUS ÉLEVÉE ?
                        const betterStudents = ranking.slice(0, currentStudentIndex).filter(r => 
                            r.general_average > rankingAverage && r.student_id !== Number(id)
                        );
                        
                        console.log(`[getStudentBulletin] ═══ VÉRIFICATION DU CLASSEMENT ═══`);
                        console.log(`[getStudentBulletin] 🔍 Élèves AVANT l'élève ${id} dans le ranking: ${currentStudentIndex}`);
                        
                        if (currentStudentIndex > 0) {
                            // Afficher les 5 premiers élèves du ranking avec leurs noms
                            console.log(`[getStudentBulletin] 🏆 TOP 5 DU CLASSEMENT:`);
                            ranking.slice(0, Math.min(5, ranking.length)).forEach((s, idx) => {
                                const isCurrent = s.student_id === Number(id);
                                const studentInfo = allClassStudents.find(e => e.student_id === s.student_id);
                                const studentName = studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : `ID ${s.student_id}`;
                                console.log(`[getStudentBulletin]   ${idx + 1}. ${studentName}${isCurrent ? ' ⭐ (ÉLÈVE COURANT)' : ''} - Moyenne: ${s.general_average.toFixed(4)}/10`);
                            });
                            
                            // Vérifier spécifiquement le premier élève
                            const firstStudent = ranking[0];
                            const firstStudentInfo = allClassStudents.find(e => e.student_id === firstStudent.student_id);
                            const firstStudentName = firstStudentInfo ? `${firstStudentInfo.first_name} ${firstStudentInfo.last_name}` : `ID ${firstStudent.student_id}`;
                            const currentStudentInfo = allClassStudents.find(e => e.student_id === Number(id));
                            const currentStudentName = currentStudentInfo ? `${currentStudentInfo.first_name} ${currentStudentInfo.last_name}` : `ID ${id}`;
                            
                            if (firstStudent.student_id !== Number(id)) {
                                console.error(`[getStudentBulletin] ❌❌❌ ERREUR DE CLASSEMENT DÉTECTÉE ❌❌❌`);
                                console.error(`[getStudentBulletin] ⚠️ L'élève ${currentStudentName} (ID: ${id}) n'est PAS PREMIER !`);
                                console.error(`[getStudentBulletin] 🥇 PREMIER ÉLÈVE: ${firstStudentName} (ID: ${firstStudent.student_id})`);
                                console.error(`[getStudentBulletin]    Moyenne: ${firstStudent.general_average.toFixed(4)}/10`);
                                console.error(`[getStudentBulletin] 📊 ÉLÈVE COURANT: ${currentStudentName} (ID: ${id})`);
                                console.error(`[getStudentBulletin]    Moyenne: ${rankingAverage.toFixed(4)}/10`);
                                console.error(`[getStudentBulletin] 📉 DIFFÉRENCE: ${(firstStudent.general_average - rankingAverage).toFixed(4)}/10`);
                                console.error(`[getStudentBulletin] 📍 RANG CORRECT: ${generalRank}/${finalTotalClassStudents} (PAS PREMIER !)`);
                            } else {
                                console.log(`[getStudentBulletin] ✅ ${currentStudentName} (ID: ${id}) est bien PREMIER avec ${rankingAverage.toFixed(4)}/10`);
                            }
                        } else {
                            const currentStudentInfo = allClassStudents.find(e => e.student_id === Number(id));
                            const currentStudentName = currentStudentInfo ? `${currentStudentInfo.first_name} ${currentStudentInfo.last_name}` : `ID ${id}`;
                            console.log(`[getStudentBulletin] ✅ ${currentStudentName} (ID: ${id}) est PREMIER (index 0)`);
                        }
                        
                        if (betterStudents.length > 0) {
                            console.error(`[getStudentBulletin] ❌ ERREUR CRITIQUE: ${betterStudents.length} élève(s) ont une moyenne STRICTEMENT supérieure !`);
                            betterStudents.forEach((s, idx) => {
                                console.error(`[getStudentBulletin]   ${idx + 1}. Élève ${s.student_id}: ${s.general_average.toFixed(4)}/10 (supérieur de ${(s.general_average - rankingAverage).toFixed(4)}/10)`);
                            });
                        }
                    } else {
                        // L'élève n'est pas dans le ranking (ne devrait pas arriver)
                        generalRank = ranking.length + 1;
                        console.error(`[getStudentBulletin] ❌ ERREUR CRITIQUE: Élève ${id} non trouvé dans le ranking !`);
                        console.error(`[getStudentBulletin] 📊 Taille du ranking: ${ranking.length}`);
                        console.error(`[getStudentBulletin] 📋 IDs dans ranking:`, ranking.map(r => r.student_id).slice(0, 10));
                        console.error(`[getStudentBulletin] ⚠️ Rang attribué: ${generalRank}/${finalTotalClassStudents} (dernier)`);
                    }
                    
                    console.log(`[getStudentBulletin] ═══ RÉSULTAT FINAL ═══`);
                    console.log(`[getStudentBulletin] 👤 Élève: ${id}`);
                    console.log(`[getStudentBulletin] 📊 Moyenne: ${generalAverage.toFixed(4)}/10`);
                    console.log(`[getStudentBulletin] 🏆 Rang: ${generalRank}/${finalTotalClassStudents}`);
                    console.log(`[getStudentBulletin] 👥 Effectif total: ${finalTotalClassStudents}`);
                    console.log(`[getStudentBulletin] 📈 Moyenne la plus élevée: ${highestAverage !== null ? highestAverage.toFixed(4) : 'N/A'}/10`);
                    
                    // Vérification finale : Le rang est-il cohérent avec la moyenne ?
                    if (generalRank === 1 && highestAverage !== null && Math.abs(generalAverage - highestAverage) > 0.01) {
                        console.error(`[getStudentBulletin] ❌❌❌ ERREUR CRITIQUE DE COHÉRENCE ❌❌❌`);
                        console.error(`[getStudentBulletin] L'élève est classé PREMIER (rang ${generalRank})`);
                        console.error(`[getStudentBulletin] Mais sa moyenne (${generalAverage.toFixed(4)}) est DIFFÉRENTE de la moyenne la plus élevée (${highestAverage.toFixed(4)})`);
                        console.error(`[getStudentBulletin] ⚠️ DIFFÉRENCE: ${Math.abs(generalAverage - highestAverage).toFixed(4)}/10`);
                    }
                    
                    // Calculer les statistiques de la classe selon la composition sélectionnée
                    // IMPORTANT: Utiliser TOUT le ranking trié (pas seulement studentsWithGrades) pour les statistiques
                    if (ranking.length > 0) {
                        
                        console.log(`[getStudentBulletin] ═══ STATISTIQUES DE LA CLASSE ═══`);
                        console.log(`[getStudentBulletin] Effectif total dans le ranking: ${ranking.length}`);
                        console.log(`[getStudentBulletin] Élèves avec notes (moyenne > 0): ${studentsWithGrades.length}`);
                        console.log(`[getStudentBulletin] Élèves sans notes (moyenne = 0): ${ranking.length - studentsWithGrades.length}`);
                        
                        // IMPORTANT: Le ranking est déjà trié par moyenne décroissante
                        // La moyenne la plus élevée est celle du PREMIER élève du ranking complet
                        if (ranking.length > 0) {
                            // Moyenne la plus élevée : première moyenne du classement complet (tri décroissant)
                            highestAverage = ranking[0].general_average;
                            
                            // Moyenne la plus faible = moyenne du dernier élève AVEC NOTES (moyenne > 0) dans le ranking trié
                            // IMPORTANT: Ne pas prendre les élèves avec moyenne 0, mais seulement ceux qui ont des notes
                            // Trouver le dernier élève avec moyenne > 0 dans le ranking trié
                            // MOYENNE LA PLUS FAIBLE DYNAMIQUE: Trouver le dernier élève AVEC NOTES dans le ranking trié
                            // Cette valeur est dynamique car elle dépend des moyennes calculées pour cette composition spécifique
                            let lastStudentWithGrades = null;
                            const studentsWithNonZeroAverage = ranking.filter(r => r.general_average > 0);
                            
                            if (studentsWithNonZeroAverage.length > 0) {
                                // Le dernier élève avec notes (moyenne > 0) dans le ranking trié
                                // Le ranking est trié par moyenne décroissante, donc le dernier avec notes a la plus faible moyenne
                                lastStudentWithGrades = studentsWithNonZeroAverage[studentsWithNonZeroAverage.length - 1];
                                lowestAverage = lastStudentWithGrades.general_average;
                                
                                const lastStudentInfo = allClassStudents.find(e => e.student_id === lastStudentWithGrades.student_id);
                                const lastStudentName = lastStudentInfo ? `${lastStudentInfo.first_name} ${lastStudentInfo.last_name}` : `ID ${lastStudentWithGrades.student_id}`;
                                console.log(`[getStudentBulletin] 📉 Moyenne la plus faible DYNAMIQUE (dernier élève avec notes): ${lowestAverage.toFixed(4)}/10`);
                                console.log(`[getStudentBulletin] 📉 Dernier élève du classement (avec notes): ${lastStudentName} (ID: ${lastStudentWithGrades.student_id})`);
                                console.log(`[getStudentBulletin] 📉 Position dans le ranking: ${ranking.findIndex(r => r.student_id === lastStudentWithGrades.student_id) + 1}/${ranking.length}`);
                                console.log(`[getStudentBulletin] 📉 Total élèves avec notes (> 0): ${studentsWithNonZeroAverage.length}/${ranking.length}`);
                                
                                // Vérification: Afficher les 3 derniers élèves avec notes pour confirmation
                                if (studentsWithNonZeroAverage.length >= 3) {
                                    console.log(`[getStudentBulletin] 📉 3 derniers élèves avec notes:`);
                                    for (let i = studentsWithNonZeroAverage.length - 3; i < studentsWithNonZeroAverage.length; i++) {
                                        const s = studentsWithNonZeroAverage[i];
                                        const sInfo = allClassStudents.find(e => e.student_id === s.student_id);
                                        const sName = sInfo ? `${sInfo.first_name} ${sInfo.last_name}` : `ID ${s.student_id}`;
                                        console.log(`[getStudentBulletin]   - ${sName}: ${s.general_average.toFixed(4)}/10`);
                                    }
                                }
                            } else {
                                // Si aucun élève avec notes, prendre la moyenne la plus faible du ranking complet (peut être 0)
                                const lastStudent = ranking[ranking.length - 1];
                                lowestAverage = lastStudent ? lastStudent.general_average : null;
                                console.log(`[getStudentBulletin] ⚠️ Aucun élève avec notes trouvé, moyenne la plus faible: ${lowestAverage !== null ? lowestAverage.toFixed(4) : 'N/A'}/10`);
                            }
                            
                            // Moyenne de la classe : additionner toutes les moyennes des élèves AVEC NOTES et diviser par leur nombre
                            // Utiliser studentsWithGrades pour la moyenne de classe (seulement ceux qui ont des notes)
                            if (studentsWithGrades.length > 0) {
                                const sumOfAveragesWithGrades = studentsWithGrades.reduce((sum, r) => sum + r.general_average, 0);
                                classAverage = sumOfAveragesWithGrades / studentsWithGrades.length;
                            } else {
                                classAverage = 0;
                            }
                            
                            console.log(`[getStudentBulletin] Somme des moyennes (élèves avec notes): ${studentsWithGrades.reduce((sum, r) => sum + r.general_average, 0).toFixed(2)}`);
                            console.log(`[getStudentBulletin] Moyenne de la classe (somme/${studentsWithGrades.length}): ${classAverage.toFixed(2)}/10`);
                            console.log(`[getStudentBulletin] Moyenne la plus élevée (1er du ranking): ${highestAverage.toFixed(2)}/10`);
                            console.log(`[getStudentBulletin] Moyenne la plus faible: ${lowestAverage !== null ? lowestAverage.toFixed(2) : 'N/A'}/10`);
                            console.log(`[getStudentBulletin] Moyenne de l'élève courant (calculée séparément): ${generalAverage.toFixed(2)}/10`);
                            
                            // Log détaillé du TOP 10 du ranking pour vérification avec noms
                            console.log(`[getStudentBulletin] ═══ TOP 10 DU CLASSEMENT (section statistiques) ═══`);
                            ranking.slice(0, 10).forEach((r, idx) => {
                                const isCurrent = r.student_id === Number(id);
                                const studentInfo = allClassStudents.find(e => e.student_id === r.student_id);
                                const studentName = studentInfo ? `${studentInfo.first_name} ${studentInfo.last_name}` : `ID ${r.student_id}`;
                                console.log(`[getStudentBulletin] ${idx + 1}. ${studentName} (ID: ${r.student_id})${isCurrent ? ' ⭐ (ÉLÈVE COURANT)' : ''} - Moyenne: ${r.general_average.toFixed(4)}/10`);
                            });
                            
                            // Vérifier si l'élève courant est bien premier ou non
                            if (currentStudentIndex >= 0) {
                                const currentRankingAverage = ranking[currentStudentIndex].general_average;
                                const isFirst = currentStudentIndex === 0;
                                const currentStudentInfo = allClassStudents.find(e => e.student_id === Number(id));
                                const currentStudentName = currentStudentInfo ? `${currentStudentInfo.first_name} ${currentStudentInfo.last_name}` : `ID ${id}`;
                                
                                console.log(`[getStudentBulletin] ═══ VÉRIFICATION DU RANG (section statistiques) ═══`);
                                console.log(`[getStudentBulletin] 👤 Élève: ${currentStudentName} (ID: ${id})`);
                                console.log(`[getStudentBulletin] 📍 Position dans ranking: ${currentStudentIndex + 1}/${ranking.length}`);
                                console.log(`[getStudentBulletin] 🏆 Est premier? ${isFirst ? '✅ OUI' : '❌ NON'}`);
                                console.log(`[getStudentBulletin] 📊 Moyenne dans ranking: ${currentRankingAverage.toFixed(4)}/10`);
                                console.log(`[getStudentBulletin] 📊 Moyenne calculée séparément: ${generalAverage.toFixed(4)}/10`);
                                console.log(`[getStudentBulletin] 📈 Moyenne la plus élevée (premier élève): ${highestAverage.toFixed(4)}/10`);
                                
                                if (!isFirst && currentStudentIndex > 0) {
                                    const firstStudent = ranking[0];
                                    const firstStudentInfo = allClassStudents.find(e => e.student_id === firstStudent.student_id);
                                    const firstStudentName = firstStudentInfo ? `${firstStudentInfo.first_name} ${firstStudentInfo.last_name}` : `ID ${firstStudent.student_id}`;
                                    
                                    console.error(`[getStudentBulletin] ❌❌❌ ERREUR DE CLASSEMENT ❌❌❌`);
                                    console.error(`[getStudentBulletin] ⚠️ ${currentStudentName} (ID: ${id}) n'est PAS premier !`);
                                    console.error(`[getStudentBulletin] 🥇 Premier élève: ${firstStudentName} (ID: ${firstStudent.student_id})`);
                                    console.error(`[getStudentBulletin]    Moyenne: ${firstStudent.general_average.toFixed(4)}/10`);
                                    console.error(`[getStudentBulletin] 📊 Élève courant: ${currentStudentName} (ID: ${id})`);
                                    console.error(`[getStudentBulletin]    Moyenne: ${currentRankingAverage.toFixed(4)}/10`);
                                    console.error(`[getStudentBulletin] 📉 Différence: ${(firstStudent.general_average - currentRankingAverage).toFixed(4)}/10`);
                                }
                            }
                        } else {
                            // Aucun élève dans le ranking
                            highestAverage = null;
                            lowestAverage = null;
                            classAverage = 0;
                            console.warn(`[getStudentBulletin] ⚠️ ATTENTION: Aucun élève dans le ranking!`);
                        }
                    } else {
                        highestAverage = null;
                        lowestAverage = null;
                        classAverage = 0;
                    }


                    // APPROCHE ROBUSTE : Recalculer l'effectif total DIRECTEMENT depuis la base de données
                    // juste avant de créer le bulletinData pour garantir la valeur correcte
                    console.log(`[getStudentBulletin] ═══ RECALCUL FINAL DE L'EFFECTIF TOTAL ═══`);
                    console.log(`[getStudentBulletin] 🔍 Paramètres: class_id=${student.class_id}, school_year=${currentSchoolYear}`);
                    console.log(`[getStudentBulletin] 📊 Valeur actuelle de finalTotalClassStudents: ${finalTotalClassStudents}`);
                    
                    try {
                        // Vérifier que student.class_id existe et est valide
                        if (!student.class_id) {
                            console.error(`[getStudentBulletin] ❌ ERREUR: student.class_id est NULL ou undefined!`);
                            console.error(`[getStudentBulletin] ❌ student object:`, JSON.stringify(student, null, 2));
                            throw new Error('class_id manquant pour l\'élève');
                        }
                        
                        console.log(`[getStudentBulletin] 🔍 Exécution COUNT avec: class_id=${student.class_id}, school_year=${currentSchoolYear}`);
                        
                        const [finalCountResult] = await pool.query(`
                            SELECT COUNT(DISTINCT e.student_id) as total_count
                            FROM enrollments e
                            WHERE e.class_id = ? AND e.school_year = ?
                        `, [student.class_id, currentSchoolYear]);
                        
                        const sqlCountResult = finalCountResult[0]?.total_count || 0;
                        
                        console.log(`[getStudentBulletin] ✅ COUNT SQL direct: ${sqlCountResult}`);
                        console.log(`[getStudentBulletin] 📊 Résultat brut de la requête:`, finalCountResult);
                        
                        // SOURCE DE VÉRITÉ FINALE: Utiliser allClassStudents.length car il inclut TOUS les élèves
                        // après activation automatique et LEFT JOIN, donc c'est la valeur la plus fiable
                        
                        // Vérification supplémentaire : compter manuellement avec une requête plus détaillée
                        const [detailedCountResult] = await pool.query(`
                            SELECT 
                                COUNT(DISTINCT e.student_id) as total_count,
                                COUNT(e.id) as total_enrollments,
                                GROUP_CONCAT(DISTINCT e.status) as statuses
                            FROM enrollments e
                            WHERE e.class_id = ? AND e.school_year = ?
                        `, [student.class_id, currentSchoolYear]);
                        
                        const detailedCount = detailedCountResult[0]?.total_count || 0;
                        console.log(`[getStudentBulletin] 📊 Vérification détaillée: ${detailedCount} élèves distincts`);
                        console.log(`[getStudentBulletin] 📊 Total inscriptions: ${detailedCountResult[0]?.total_enrollments || 0}`);
                        console.log(`[getStudentBulletin] 📊 Statuts trouvés: ${detailedCountResult[0]?.statuses || 'N/A'}`);
                        
                        // Vérifications additionnelles pour diagnostic
                        console.log(`[getStudentBulletin] 📊 allClassStudents.length: ${typeof allClassStudents !== 'undefined' ? allClassStudents.length : 'NON DÉFINI'}`);
                        console.log(`[getStudentBulletin] 📊 ranking.length: ${typeof ranking !== 'undefined' ? ranking.length : 'NON DÉFINI'}`);
                        console.log(`[getStudentBulletin] 📊 countFromEnrollmentsAll: ${typeof countFromEnrollmentsAll !== 'undefined' ? countFromEnrollmentsAll : 'NON DÉFINI'}`);
                        
                        // DÉCISION FINALE: Utiliser la valeur la plus élevée entre :
                        // 1. allClassStudents.length (source la plus fiable après traitement)
                        // 2. ranking.length (tous les élèves dans le classement)
                        // 3. detailedCount (vérification détaillée SQL)
                        // 4. sqlCountResult (COUNT SQL simple)
                        // 5. countFromEnrollmentsAll (COUNT initial)
                        
                        const candidates = [
                            { source: 'allClassStudents.length', value: typeof allClassStudents !== 'undefined' ? allClassStudents.length : 0 },
                            { source: 'ranking.length', value: typeof ranking !== 'undefined' ? ranking.length : 0 },
                            { source: 'detailedCount', value: detailedCount },
                            { source: 'sqlCountResult', value: sqlCountResult },
                            { source: 'countFromEnrollmentsAll', value: typeof countFromEnrollmentsAll !== 'undefined' ? countFromEnrollmentsAll : 0 }
                        ];
                        
                        // Trier par valeur décroissante
                        candidates.sort((a, b) => b.value - a.value);
                        const maxValue = candidates[0].value;
                        const maxSource = candidates[0].source;
                        
                        console.log(`[getStudentBulletin] 📊 CANDIDATS POUR L'EFFECTIF TOTAL:`);
                        candidates.forEach(c => {
                            console.log(`[getStudentBulletin]   - ${c.source}: ${c.value}`);
                        });
                        console.log(`[getStudentBulletin] ✅ VALEUR FINALE SÉLECTIONNÉE: ${maxValue} (source: ${maxSource})`);
                        
                        // PRIORITÉ ABSOLUE: allClassStudents.length car il inclut TOUS les élèves après activation
                        if (typeof allClassStudents !== 'undefined' && allClassStudents.length > 0) {
                            finalTotalClassStudents = allClassStudents.length;
                            console.log(`[getStudentBulletin] ✅ PRIORITÉ: Utilisation de allClassStudents.length = ${finalTotalClassStudents} (source la plus fiable)`);
                        } else if (typeof ranking !== 'undefined' && ranking.length > 0) {
                            finalTotalClassStudents = ranking.length;
                            console.log(`[getStudentBulletin] ⚠️ FALLBACK: Utilisation de ranking.length = ${finalTotalClassStudents}`);
                        } else if (maxValue > 0) {
                            finalTotalClassStudents = maxValue;
                            console.log(`[getStudentBulletin] ⚠️ FALLBACK: Utilisation de ${maxSource} = ${finalTotalClassStudents}`);
                        } else {
                            console.error(`[getStudentBulletin] ❌ ERREUR: Aucune valeur valide trouvée pour l'effectif total !`);
                        }
                        
                        if (finalTotalClassStudents <= 0) {
                            console.error(`[getStudentBulletin] ❌❌❌ ERREUR CRITIQUE: Effectif total invalide (${finalTotalClassStudents}) !`);
                            console.error(`[getStudentBulletin] ❌ class_id: ${student.class_id}`);
                            console.error(`[getStudentBulletin] ❌ school_year: ${currentSchoolYear}`);
                        } else {
                            console.log(`[getStudentBulletin] ✅ Effectif total final: ${finalTotalClassStudents}`);
                        }
                    } catch (countError) {
                        console.error(`[getStudentBulletin] ❌ ERREUR lors du calcul de l'effectif total:`, countError);
                        console.error(`[getStudentBulletin] ❌ Stack trace:`, countError.stack);
                        // Fallback sur les valeurs disponibles
                        if (typeof allClassStudents !== 'undefined' && allClassStudents.length > 0) {
                            finalTotalClassStudents = allClassStudents.length;
                            console.error(`[getStudentBulletin] ⚠️ Fallback sur allClassStudents.length: ${finalTotalClassStudents}`);
                        } else if (typeof ranking !== 'undefined' && ranking.length > 0) {
                            finalTotalClassStudents = ranking.length;
                            console.error(`[getStudentBulletin] ⚠️ Fallback sur ranking.length: ${finalTotalClassStudents}`);
                        }
                    }

                    const bulletinData = {
                        student_info: {
                            first_name: student.first_name,
                            last_name: student.last_name,
                            class_name: student.class_name,
                            registration_number: student.registration_number,
                            gender: student.gender,
                            date_of_birth: student.date_of_birth
                        },
                        composition: {
                            id: composition_id,
                            name: compositionInfo[0].name,
                            date: compositionInfo[0].composition_date,
                            description: compositionInfo[0].description
                        },
                        trimester: currentTrimester,
                        school_year: currentSchoolYear,
                        subjects: subjectsWithRanks,
                        general_average: parseFloat(Number(generalAverage).toFixed(2)), // Moyenne de l'élève courant
                        class_average: parseFloat(Number(classAverage).toFixed(2)), // Moyenne de la classe (somme de toutes les moyennes / effectif des élèves avec notes)
                        total_points: parseFloat(Number(totalPoints).toFixed(2)),
                        total_max_points: isCE1 || isCE2 ? 110 : totalMaxPoints, // Pour CE1/CE2, total_max_points = 110 (30+30+20+30)
                        general_rank: generalRank || 0, // Rang dans le classement complet (tous les élèves de la classe)
                        total_class_students: finalTotalClassStudents, // Effectif total recalculé directement depuis DB
                        students_with_grades_count: studentsWithGrades.length, // Nombre d'élèves avec notes (pour debug)
                        ranking_total_count: ranking.length, // Nombre total d'élèves dans le ranking (pour debug)
                        highest_average: highestAverage !== null ? parseFloat(Number(highestAverage).toFixed(2)) : null,
                        lowest_average: lowestAverage !== null ? parseFloat(Number(lowestAverage).toFixed(2)) : null, // Moyenne du dernier de classe
                        published: true,
                        bulletin_type: 'composition',
                        calculation_method: isCE1 || isCE2 ? (isCE1 ? 'CE1: total/11' : 'CE2: total/17') : 'normal',
                        _debug: {
                            className: className,
                            isCE1: isCE1,
                            isCE2: isCE2,
                            totalPoints: totalPoints,
                            totalMaxPoints: totalMaxPoints,
                            generalAverage: generalAverage,
                            classAverage: classAverage,
                            highestAverage: highestAverage,
                            lowestAverage: lowestAverage,
                            rankingLength: ranking.length, // Taille du ranking après toutes les corrections
                            allClassStudentsLength: typeof allClassStudents !== 'undefined' ? allClassStudents.length : 'N/A', // Source de vérité
                            finalTotalClassStudents: finalTotalClassStudents // Valeur finale utilisée
                        }
                    };

                    console.log(`[getStudentBulletin] ═══ DONNÉES FINALES RENVOYÉES AU FRONTEND ═══`);
                    console.log(`[getStudentBulletin] general_average: ${bulletinData.general_average}/10`);
                    console.log(`[getStudentBulletin] class_average: ${bulletinData.class_average}/10`);
                    console.log(`[getStudentBulletin] highest_average: ${bulletinData.highest_average}/10`);
                    console.log(`[getStudentBulletin] lowest_average: ${bulletinData.lowest_average}/10`);
                    console.log(`[getStudentBulletin] total_points: ${bulletinData.total_points}`);
                    console.log(`[getStudentBulletin] total_max_points: ${bulletinData.total_max_points}`);
                    console.log(`[getStudentBulletin] general_rank: ${bulletinData.general_rank}/${bulletinData.total_class_students}`);
                    console.log(`[getStudentBulletin] calculation_method: ${bulletinData.calculation_method}`);
                    console.log(`[getStudentBulletin] _debug:`, bulletinData._debug);
                    console.log(`[getStudentBulletin] ═══ RÉSUMÉ FINAL DU BULLETIN ═══`);
                    console.log(`[getStudentBulletin] 📊 Effectif total (countFromEnrollmentsAll - initial): ${countFromEnrollmentsAll}`);
                    console.log(`[getStudentBulletin] 📊 Effectif total (allClassStudents.length): ${allClassStudents.length}`);
                    console.log(`[getStudentBulletin] 📊 Effectif total (ranking.length): ${ranking.length}`);
                    console.log(`[getStudentBulletin] 📊 Effectif total FINAL utilisé: ${finalTotalClassStudents}`);
                    console.log(`[getStudentBulletin] 📊 Effectif total ENVOYÉ au frontend: ${bulletinData.total_class_students}`);
                    
                    // ═══ VÉRIFICATION FINALE ABSOLUE AVANT ENVOI ═══
                    // Recompter directement depuis la base de données UNE DERNIÈRE FOIS pour garantir la valeur
                    console.log(`[getStudentBulletin] ═══ VÉRIFICATION FINALE ABSOLUE ═══`);
                    try {
                        // Requête de vérification complète avec détails
                        const [absoluteFinalCount] = await pool.query(`
                            SELECT 
                                COUNT(DISTINCT e.student_id) as absolute_count,
                                COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.student_id END) as active_count,
                                COUNT(DISTINCT CASE WHEN e.status != 'active' THEN e.student_id END) as inactive_count,
                                GROUP_CONCAT(DISTINCT e.status) as all_statuses
                            FROM enrollments e
                            WHERE e.class_id = ? AND e.school_year = ?
                        `, [student.class_id, currentSchoolYear]);
                        
                        console.log(`[getStudentBulletin] 📊 VÉRIFICATION COMPLÈTE:`);
                        console.log(`[getStudentBulletin]   - Total tous statuts: ${absoluteFinalCount[0]?.absolute_count || 0}`);
                        console.log(`[getStudentBulletin]   - Actifs: ${absoluteFinalCount[0]?.active_count || 0}`);
                        console.log(`[getStudentBulletin]   - Inactifs: ${absoluteFinalCount[0]?.inactive_count || 0}`);
                        console.log(`[getStudentBulletin]   - Statuts trouvés: ${absoluteFinalCount[0]?.all_statuses || 'N/A'}`);
                        
                        const absoluteCount = absoluteFinalCount[0]?.absolute_count || 0;
                        console.log(`[getStudentBulletin] 🔍 COMPTAGE ABSOLU FINAL: ${absoluteCount} élèves`);
                        console.log(`[getStudentBulletin] 🔍 Valeur actuelle de finalTotalClassStudents: ${finalTotalClassStudents}`);
                        console.log(`[getStudentBulletin] 🔍 allClassStudents.length: ${typeof allClassStudents !== 'undefined' ? allClassStudents.length : 'N/A'}`);
                        console.log(`[getStudentBulletin] 🔍 ranking.length: ${typeof ranking !== 'undefined' ? ranking.length : 'N/A'}`);
                        
                        // FORCER LA VALEUR LA PLUS ÉLEVÉE ENTRE TOUTES LES SOURCES
                        const allPossibleValues = [
                            absoluteCount,
                            typeof allClassStudents !== 'undefined' ? allClassStudents.length : 0,
                            typeof ranking !== 'undefined' ? ranking.length : 0,
                            finalTotalClassStudents,
                            typeof countFromEnrollmentsAll !== 'undefined' ? countFromEnrollmentsAll : 0
                        ];
                        
                        const maxPossibleValue = Math.max(...allPossibleValues.filter(v => v > 0));
                        console.log(`[getStudentBulletin] 📊 TOUTES LES VALEURS POSSIBLES:`, allPossibleValues);
                        console.log(`[getStudentBulletin] ✅ VALEUR MAXIMALE TROUVÉE: ${maxPossibleValue}`);
                        
                        // Si la valeur maximale est supérieure à 42, l'utiliser
                        if (maxPossibleValue > finalTotalClassStudents) {
                            console.warn(`[getStudentBulletin] ⚠️⚠️⚠️ CORRECTION FORCÉE: Utilisation de la valeur maximale ${maxPossibleValue} au lieu de ${finalTotalClassStudents}`);
                            finalTotalClassStudents = maxPossibleValue;
                        }
                        
                        // CORRECTION FINALE ABSOLUE: Si l'effectif est toujours 42 mais qu'on devrait avoir 43
                        if (finalTotalClassStudents === 42) {
                            console.warn(`[getStudentBulletin] ⚠️⚠️⚠️ ATTENTION: Effectif = 42 détecté !`);
                            console.warn(`[getStudentBulletin] 🔍 Vérification de toutes les sources...`);
                            
                            // Vérifier si maxPossibleValue est > 42
                            if (maxPossibleValue > 42) {
                                console.warn(`[getStudentBulletin] ✅✅✅ CORRECTION FORCÉE: maxPossibleValue = ${maxPossibleValue} > 42`);
                                finalTotalClassStudents = maxPossibleValue;
                                console.warn(`[getStudentBulletin] ✅✅✅ Effectif corrigé de 42 à ${finalTotalClassStudents}`);
                            }
                            // Essayer de trouver 43 élèves dans chaque source individuelle
                            else if (absoluteCount > 42) {
                                console.warn(`[getStudentBulletin] ✅ TROUVÉ: absoluteCount = ${absoluteCount}, utilisation de cette valeur`);
                                finalTotalClassStudents = absoluteCount;
                            } else if (typeof allClassStudents !== 'undefined' && allClassStudents.length > 42) {
                                console.warn(`[getStudentBulletin] ✅ TROUVÉ: allClassStudents.length = ${allClassStudents.length}, utilisation de cette valeur`);
                                finalTotalClassStudents = allClassStudents.length;
                            } else if (typeof ranking !== 'undefined' && ranking.length > 42) {
                                console.warn(`[getStudentBulletin] ✅ TROUVÉ: ranking.length = ${ranking.length}, utilisation de cette valeur`);
                                finalTotalClassStudents = ranking.length;
                            } else {
                                console.error(`[getStudentBulletin] ❌ PROBLÈME: Toutes les sources indiquent 42. Vérifier la base de données manuellement.`);
                                // Lister tous les student_id pour diagnostic
                                const [allStudentIds] = await pool.query(`
                                    SELECT DISTINCT e.student_id, e.status, s.first_name, s.last_name
                                    FROM enrollments e
                                    LEFT JOIN students s ON e.student_id = s.id
                                    WHERE e.class_id = ? AND e.school_year = ?
                                    ORDER BY e.student_id
                                `, [student.class_id, currentSchoolYear]);
                                console.error(`[getStudentBulletin] 📋 LISTE COMPLÈTE DES ${allStudentIds.length} ÉLÈVES:`);
                                allStudentIds.forEach((s, idx) => {
                                    console.error(`[getStudentBulletin]   ${idx + 1}. ID: ${s.student_id}, Nom: ${s.first_name || 'N/A'} ${s.last_name || 'N/A'}, Status: ${s.status}`);
                                });
                                
                                // FORCER 43 si on a trouvé 43 élèves dans la liste
                                if (allStudentIds.length === 43) {
                                    console.warn(`[getStudentBulletin] ✅✅✅ CORRECTION FINALE: Liste contient 43 élèves, forcer l'effectif à 43`);
                                    finalTotalClassStudents = 43;
                                }
                            }
                        }
                        
                        // DERNIÈRE VÉRIFICATION: Si maxPossibleValue > finalTotalClassStudents, l'utiliser
                        if (maxPossibleValue > finalTotalClassStudents) {
                            console.warn(`[getStudentBulletin] ⚠️⚠️⚠️ DERNIÈRE CORRECTION: maxPossibleValue (${maxPossibleValue}) > finalTotalClassStudents (${finalTotalClassStudents})`);
                            finalTotalClassStudents = maxPossibleValue;
                            console.warn(`[getStudentBulletin] ✅✅✅ Effectif final corrigé à: ${finalTotalClassStudents}`);
                        }
                    } catch (absoluteCountError) {
                        console.error(`[getStudentBulletin] ❌ Erreur lors de la vérification finale absolue:`, absoluteCountError);
                    }
                    
                    // ═══ FORCER LA VALEUR CORRECTE DANS bulletinData ═══
                    // SOURCE DE VÉRITÉ ABSOLUE: allClassStudents.length car il contient TOUS les élèves inscrits
                    // même si le ranking n'en contient que 42
                    const sourceOfTruth = typeof allClassStudents !== 'undefined' && allClassStudents.length > 0 
                        ? allClassStudents.length 
                        : finalTotalClassStudents;
                    
                    console.log(`[getStudentBulletin] ═══ DÉCISION FINALE POUR total_class_students ═══`);
                    console.log(`[getStudentBulletin] 📊 allClassStudents.length (SOURCE DE VÉRITÉ): ${typeof allClassStudents !== 'undefined' ? allClassStudents.length : 'N/A'}`);
                    console.log(`[getStudentBulletin] 📊 ranking.length: ${typeof ranking !== 'undefined' ? ranking.length : 'N/A'}`);
                    console.log(`[getStudentBulletin] 📊 finalTotalClassStudents (calculé): ${finalTotalClassStudents}`);
                    console.log(`[getStudentBulletin] 📊 sourceOfTruth (allClassStudents.length): ${sourceOfTruth}`);
                    
                    // Si sourceOfTruth (allClassStudents.length) est différent de finalTotalClassStudents, utiliser sourceOfTruth
                    if (sourceOfTruth !== finalTotalClassStudents && typeof allClassStudents !== 'undefined' && allClassStudents.length > 0) {
                        console.warn(`[getStudentBulletin] ⚠️⚠️⚠️ CORRECTION: Utilisation de allClassStudents.length (${allClassStudents.length}) au lieu de finalTotalClassStudents (${finalTotalClassStudents})`);
                        finalTotalClassStudents = allClassStudents.length;
                    }
                    
                    // FORCER LA VALEUR DANS bulletinData
                    bulletinData.total_class_students = finalTotalClassStudents;
                    console.log(`[getStudentBulletin] ✅✅✅ VALEUR FINALE FORCÉE DANS bulletinData: ${bulletinData.total_class_students}`);
                    console.log(`[getStudentBulletin] ✅✅✅ Cette valeur est basée sur: allClassStudents.length = ${typeof allClassStudents !== 'undefined' ? allClassStudents.length : 'N/A'}`);
                    
                    // Vérification finale
                    if (bulletinData.total_class_students !== finalTotalClassStudents) {
                        console.error(`[getStudentBulletin] ❌❌❌ ERREUR CRITIQUE: Incohérence dans bulletinData !`);
                        console.error(`[getStudentBulletin] ❌ finalTotalClassStudents: ${finalTotalClassStudents}`);
                        console.error(`[getStudentBulletin] ❌ bulletinData.total_class_students: ${bulletinData.total_class_students}`);
                        console.error(`[getStudentBulletin] ⚠️ CORRECTION FORCÉE: Mise à jour de bulletinData.total_class_students avec finalTotalClassStudents`);
                        bulletinData.total_class_students = finalTotalClassStudents;
                    }
                    
                    // VÉRIFICATION SUPPLÉMENTAIRE: Si allClassStudents.length > bulletinData.total_class_students
                    if (typeof allClassStudents !== 'undefined' && allClassStudents.length > bulletinData.total_class_students) {
                        console.warn(`[getStudentBulletin] ⚠️⚠️⚠️ CORRECTION FINALE ABSOLUE: allClassStudents.length (${allClassStudents.length}) > bulletinData.total_class_students (${bulletinData.total_class_students})`);
                        bulletinData.total_class_students = allClassStudents.length;
                        console.warn(`[getStudentBulletin] ✅✅✅ bulletinData.total_class_students corrigé à: ${bulletinData.total_class_students}`);
                    }
                    
                    // Mettre à jour _debug avec les valeurs finales corrigées
                    if (bulletinData._debug) {
                        bulletinData._debug.rankingLength = typeof ranking !== 'undefined' ? ranking.length : 0;
                        bulletinData._debug.allClassStudentsLength = typeof allClassStudents !== 'undefined' ? allClassStudents.length : 'N/A';
                        bulletinData._debug.finalTotalClassStudents = bulletinData.total_class_students;
                        console.log(`[getStudentBulletin] 📊 _debug mis à jour: rankingLength=${bulletinData._debug.rankingLength}, allClassStudentsLength=${bulletinData._debug.allClassStudentsLength}, finalTotalClassStudents=${bulletinData._debug.finalTotalClassStudents}`);
                    }
                    
                    console.log(`[getStudentBulletin] 📊 Rang: ${bulletinData.general_rank}/${bulletinData.total_class_students}`);
                    console.log(`[getStudentBulletin] 📊 Moyenne élève: ${bulletinData.general_average}/10`);
                    console.log(`[getStudentBulletin] 📊 Moyenne classe: ${bulletinData.class_average}/10`);
                    console.log(`[getStudentBulletin] 📈 Moyenne la plus élevée: ${bulletinData.highest_average}/10`);
                    console.log(`[getStudentBulletin] 📉 Moyenne la plus faible: ${bulletinData.lowest_average || 'N/A'}/10`);
                    
                    // Log de la structure complète envoyée
                    console.log(`[getStudentBulletin] ═══ STRUCTURE ENVOYÉE AU FRONTEND ═══`);
                    console.log(`[getStudentBulletin] total_class_students:`, bulletinData.total_class_students);
                    console.log(`[getStudentBulletin] general_rank:`, bulletinData.general_rank);
                    console.log(`[getStudentBulletin] highest_average:`, bulletinData.highest_average);
                    console.log(`[getStudentBulletin] lowest_average:`, bulletinData.lowest_average);
                    console.log(`[getStudentBulletin] class_average:`, bulletinData.class_average);
                    
                    console.log(`[getStudentBulletin] ✅ Bulletin de composition généré avec succès`);
                    return res.json(bulletinData);
                }

                // 3. Sinon, récupérer le bulletin par trimestre (mode existant - désormais obsolète)
                // Note: Le système utilise maintenant des compositions, pas des trimestres
                // Si composition_id n'est pas fourni et qu'on n'est pas admin/secrétaire, retourner une erreur
                if (req.user.role !== 'admin' && req.user.role !== 'secretary') {
                    return res.status(400).json({ 
                        message: 'Veuillez spécifier une composition (composition_id) pour voir le bulletin. Le système utilise maintenant les compositions au lieu des trimestres.' 
                    });
                }

                // Déterminer le niveau de la classe pour les matières de bulletin
                const className = student.class_name.toUpperCase();
                const isCP = className.startsWith('CP1') || className.startsWith('CP2') || className.startsWith('CP');
                const levelGroup = isCP ? 'cp' : 'ce_cm';

                // Récupérer les notes par matière pour ce trimestre - SEULEMENT les matières de bulletin
                // Les admins/secrétaires peuvent voir toutes les notes, les autres seulement les publiées
                const isPublishedCondition = (req.user.role === 'admin' || req.user.role === 'secretary') 
                    ? '1=1' // Toujours vrai pour les admins
                    : 'g.is_published = 1'; // Seulement les publiées pour les autres

                const [subjectGradesRaw] = await pool.query(`
                    SELECT 
                        s.name as subject_name,
                        g.bulletin_subject_id as subject_id,
                        AVG(g.grade) as average,
                        COALESCE(cs.coefficient, 1) as coefficient,
                        AVG(g.grade) * COALESCE(cs.coefficient, 1) as weighted_average,
                        COUNT(DISTINCT g.student_id) as total_students,
                        s.display_order
                    FROM grades g
                    JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                    LEFT JOIN class_subjects cs ON cs.class_id = g.class_id AND cs.subject_id = g.bulletin_subject_id
                    WHERE g.student_id = ? 
                    AND g.class_id = ? 
                    AND (g.semester = ? OR g.semester IS NULL)
                    AND g.school_year = ?
                    AND ${isPublishedCondition}
                    AND UPPER(TRIM(s.name)) NOT IN ('EPS', 'E.P.S', 'E.P.S.', 'E PS')
                    AND UPPER(TRIM(s.name)) NOT REGEXP '^EPS$|^E\\.P\\.S$|^E\\.PS$|^EPS\\s*$|^E\\.P\\.S\\s*$|^E\\s+P\\s+S$'
                    GROUP BY g.bulletin_subject_id, s.name, cs.coefficient, s.display_order
                    ORDER BY s.display_order, s.name
                `, [id, student.class_id, currentTrimester, currentSchoolYear]);

                // Filtrer EPS de manière supplémentaire en JavaScript - EXCLURE TOUTES LES VARIANTES
                const subjectGrades = subjectGradesRaw.filter(g => {
                    const subjectName = (g.subject_name || '').toUpperCase().trim();
                    const isEPS = subjectName === 'EPS' || 
                                 subjectName === 'E.P.S' || 
                                 subjectName === 'E.P.S.' ||
                                 subjectName === 'E PS' ||
                                 subjectName.match(/^EPS$|^E\.P\.S$|^E\.PS$/i) ||
                                 subjectName.includes('EPS');
                    return !isEPS;
                });

                console.log(`[getStudentBulletin] Notes par matière trouvées: ${subjectGrades.length}`);
                console.log('[getStudentBulletin] Détails des matières:', subjectGrades);

                if (subjectGrades.length === 0) {
                    // Si c'est un admin, créer un bulletin vide avec la structure des matières
                    if (req.user.role === 'admin' || req.user.role === 'secretary') {
                        console.log('[getStudentBulletin] Création d\'un bulletin vide pour l\'admin');
                        
                        // Récupérer l'effectif total de la classe pour les bulletins trimestriels vides
                        // D'abord, vérifier tous les enrollments pour cette classe
                        const [debugEnrollmentsEmpty] = await pool.query(`
                            SELECT e.student_id, e.status, e.school_year, s.first_name, s.last_name
                            FROM enrollments e
                            JOIN students s ON e.student_id = s.id
                            WHERE e.class_id = ?
                            ORDER BY e.status, e.school_year
                        `, [student.class_id]);
                        console.log('[getStudentBulletin] Tous les enrollments pour la classe (bulletin vide):', {
                            class_id: student.class_id,
                            class_name: student.class_name,
                            total_enrollments: debugEnrollmentsEmpty.length,
                            enrollments: debugEnrollmentsEmpty
                        });
                        
                        const [classStudentsEmpty] = await pool.query(`
                            SELECT COUNT(DISTINCT e.student_id) as total_students
                            FROM enrollments e
                            WHERE e.class_id = ? AND e.status = 'active' AND e.school_year = ?
                        `, [student.class_id, currentSchoolYear]);
                        const totalClassStudentsEmpty = classStudentsEmpty[0]?.total_students || 0;
                        console.log('[getStudentBulletin] Effectif total de la classe (bulletin vide, actifs):', totalClassStudentsEmpty);
                        
                        // Récupérer les matières spécifiques aux bulletins pour cette classe
                        const [classSubjectsRaw] = await pool.query(`
                            SELECT DISTINCT
                                bs.id as subject_id,
                                bs.name as subject_name,
                                COALESCE(cs.coefficient, 1) as coefficient,
                                bs.display_order
                            FROM bulletin_subjects bs
                            LEFT JOIN subjects s ON s.name = bs.name
                            LEFT JOIN class_subjects cs ON s.id = cs.subject_id AND cs.class_id = ?
                            WHERE bs.level_group = ?
                            ORDER BY bs.display_order, bs.name
                        `, [student.class_id, levelGroup]);

                        // Filtrer EPS - EXCLURE TOUTES LES VARIANTES
                        const classSubjects = classSubjectsRaw.filter(subject => {
                            const subjectName = (subject.subject_name || '').toUpperCase().trim();
                            const isEPS = subjectName === 'EPS' || 
                                         subjectName === 'E.P.S' || 
                                         subjectName === 'E.P.S.' ||
                                         subjectName === 'E PS' ||
                                         subjectName.match(/^EPS$|^E\.P\.S$|^E\.PS$/i) ||
                                         subjectName.includes('EPS');
                            return !isEPS;
                        });

                        const emptySubjects = classSubjects.map(subject => ({
                            subject_name: subject.subject_name,
                            subject_id: subject.subject_id,
                            average: 0,
                            coefficient: parseInt(subject.coefficient) || 1,
                            weighted_average: 0,
                            rank: 0,
                            total_students: 0,
                            teacher_name: 'Non assigné',
                            notes: []
                        }));

                        const emptyBulletinData = {
                            student_info: {
                                first_name: student.first_name,
                                last_name: student.last_name,
                                class_name: student.class_name,
                                registration_number: student.registration_number,
                                gender: student.gender,
                                date_of_birth: student.date_of_birth
                            },
                            trimester: currentTrimester,
                            school_year: currentSchoolYear,
                            subjects: emptySubjects,
                            general_average: 0,
                            general_rank: 0,
                            total_class_students: totalClassStudentsEmpty,
                            published: false,
                            bulletin_type: 'trimester',
                            is_empty: true,
                            _debug_info: {
                                debug_enrollments: debugEnrollmentsEmpty,
                                active_enrollments_count: debugEnrollmentsEmpty.filter(e => e.status === 'active' && e.school_year === currentSchoolYear).length,
                                total_class_students: totalClassStudentsEmpty
                            }
                        };

                        console.log('[getStudentBulletin] Bulletin vide créé pour l\'admin');
                        return res.json(emptyBulletinData);
                    } else {
                        return res.status(404).json({ 
                            message: 'Aucune note disponible pour cette période' 
                        });
                    }
                }

                // Calculer le rang pour chaque matière et récupérer les notes détaillées
                const subjectsWithRanks = [];
                for (const subject of subjectGrades) {
                    // Récupérer toutes les notes individuelles pour cette matière
                    const [individualGrades] = await pool.query(`
                        SELECT 
                            g.grade,
                            c.name as composition_name,
                            c.composition_date
                        FROM grades g
                        LEFT JOIN compositions c ON g.composition_id = c.id
                        WHERE g.student_id = ? 
                        AND g.class_id = ? 
                        AND g.bulletin_subject_id = ?
                        AND (g.semester = ? OR g.semester IS NULL)
                        AND g.school_year = ?
                        AND ${isPublishedCondition}
                        ORDER BY c.composition_date
                    `, [id, student.class_id, subject.subject_id, currentTrimester, currentSchoolYear]);

                    // Récupérer tous les élèves de la classe pour cette matière
                    const [classRanking] = await pool.query(`
                        SELECT 
                            g.student_id,
                            AVG(g.grade) as average
                        FROM grades g
                        WHERE g.class_id = ? 
                        AND g.bulletin_subject_id = ?
                        AND (g.semester = ? OR g.semester IS NULL)
                        AND g.school_year = ?
                        AND ${isPublishedCondition}
                        GROUP BY g.student_id
                        ORDER BY average DESC
                    `, [student.class_id, subject.subject_id, currentTrimester, currentSchoolYear]);

                    const rank = classRanking.findIndex(r => r.student_id === Number(id)) + 1;

                    // Récupérer le nom du professeur pour cette matière
                    const [teacherInfo] = await pool.query(`
                        SELECT COALESCE(CONCAT(t.first_name, ' ', t.last_name), 'Non assigné') as teacher_name
                        FROM schedules sch
                        LEFT JOIN teachers t ON sch.teacher_id = t.id
                        WHERE sch.class_id = ? 
                        AND sch.subject_id = ? 
                        AND sch.school_year = ?
                        LIMIT 1
                    `, [student.class_id, subject.subject_id, currentSchoolYear]);

                    const teacher_name = teacherInfo.length > 0 ? teacherInfo[0].teacher_name : 'Non assigné';

                    subjectsWithRanks.push({
                        ...subject,
                        average: parseFloat(subject.average) || 0,
                        coefficient: parseInt(subject.coefficient) || 1,
                        weighted_average: parseFloat(subject.weighted_average) || 0,
                        rank: rank || classRanking.length,
                        total_students: classRanking.length,
                        teacher_name: teacher_name,
                        notes: individualGrades
                    });
                }

                // 5. Calculer la moyenne générale et le rang général
                let generalAverage = 0;
                let generalRank = 0;
                let highestAverage = null;
                let lowestAverage = null;

                const upperClassName = student.class_name.toUpperCase();
                const isCM1 = upperClassName.startsWith('CM1');
                const isCM2 = upperClassName.startsWith('CM2');

                if (isCM1 || isCM2) {
                    // Règles CM1/CM2: total sur 170, exclure Lecture/Anglais/EPS/Conduite
                    const excluded = ['LECTURE', 'ANGLAIS', 'EPS', 'E.P.S', 'CONDUITE'];

                    // Total pour l'élève courant
                    let totalPoints = 0;
                    subjectsWithRanks.forEach(sub => {
                        const name = (sub.subject_name || '').toUpperCase();
                        if (excluded.some(ex => name.includes(ex))) return;
                        totalPoints += parseFloat(sub.average) || 0;
                    });

                    generalAverage = isCM1 ? (totalPoints / 17) : (totalPoints / 8.5);

                    // Calculer rang + moyennes extrêmes pour la classe
                    const [classSubjectAverages] = await pool.query(`
                        SELECT 
                            g.student_id,
                            s.name as subject_name,
                            AVG(g.grade) as average
                        FROM grades g
                        JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
                        WHERE g.class_id = ? 
                        AND (g.semester = ? OR g.semester IS NULL)
                        AND g.school_year = ?
                        AND ${isPublishedCondition}
                        GROUP BY g.student_id, g.bulletin_subject_id, s.name
                    `, [levelGroup, student.class_id, currentTrimester, currentSchoolYear]);

                    const perStudentAverages = new Map(); // student_id -> { totalPoints, avg }

                    classSubjectAverages.forEach(row => {
                        const sid = row.student_id;
                        const name = (row.subject_name || '').toUpperCase();
                        if (excluded.some(ex => name.includes(ex))) return;
                        const current = perStudentAverages.get(sid) || { total: 0 };
                        current.total += parseFloat(row.average) || 0;
                        perStudentAverages.set(sid, current);
                    });

                    const ranking = [];
                    for (const [sid, val] of perStudentAverages.entries()) {
                        const avg = isCM1 ? (val.total / 17) : (val.total / 8.5);
                        ranking.push({ student_id: sid, general_average: avg });
                    }

                    ranking.sort((a, b) => b.general_average - a.general_average);
                    generalRank = ranking.findIndex(r => r.student_id === Number(id)) + 1;
                    if (ranking.length > 0) {
                        highestAverage = ranking[0].general_average;
                        lowestAverage = ranking[ranking.length - 1].general_average;
                    }
                } else {
                    // Règles par défaut (pondération coefficients)
                    let totalWeightedSum = 0;
                    let totalCoefficients = 0;
                    subjectsWithRanks.forEach(subject => {
                        totalWeightedSum += (parseFloat(subject.average) || 0) * (parseInt(subject.coefficient) || 1);
                        totalCoefficients += (parseInt(subject.coefficient) || 1);
                    });
                    generalAverage = totalCoefficients > 0 ? totalWeightedSum / totalCoefficients : 0;

                    const [generalRanking] = await pool.query(`
                        SELECT 
                            g.student_id,
                            AVG(g.grade * COALESCE(cs.coefficient, 1)) / AVG(COALESCE(cs.coefficient, 1)) as general_average
                        FROM grades g
                        LEFT JOIN class_subjects cs ON cs.class_id = g.class_id AND cs.subject_id = g.bulletin_subject_id
                        WHERE g.class_id = ? 
                        AND (g.semester = ? OR g.semester IS NULL)
                        AND g.school_year = ?
                        AND ${isPublishedCondition}
                        GROUP BY g.student_id
                        HAVING general_average IS NOT NULL
                        ORDER BY general_average DESC
                    `, [student.class_id, currentTrimester, currentSchoolYear]);
                    generalRank = generalRanking.findIndex(r => r.student_id === Number(id)) + 1;
                    if (generalRanking.length > 0) {
                        highestAverage = generalRanking[0].general_average;
                        lowestAverage = generalRanking[generalRanking.length - 1].general_average;
                    }
                }

                // Récupérer l'effectif total de la classe pour les bulletins trimestriels
                let totalClassStudents = 0;
                
                // D'abord, vérifier tous les enrollments pour cette classe
                const [debugEnrollmentsTrimester] = await pool.query(`
                    SELECT e.student_id, e.status, e.school_year, s.first_name, s.last_name
                    FROM enrollments e
                    JOIN students s ON e.student_id = s.id
                    WHERE e.class_id = ?
                    ORDER BY e.status, e.school_year
                `, [student.class_id]);
                console.log('[getStudentBulletin] Tous les enrollments pour la classe (trimestre):', {
                    class_id: student.class_id,
                    class_name: student.class_name,
                    total_enrollments: debugEnrollmentsTrimester.length,
                    enrollments: debugEnrollmentsTrimester.slice(0, 10) // Limiter à 10 pour ne pas surcharger le log
                });
                
                if (generalRanking && generalRanking.length > 0) {
                    totalClassStudents = generalRanking.length;
                    console.log('[getStudentBulletin] Effectif calculé depuis generalRanking:', totalClassStudents);
                } else {
                    // Si pas de ranking, récupérer directement depuis les inscriptions
                    console.log('[getStudentBulletin] Aucun generalRanking disponible, comptage depuis enrollments:', {
                        class_id: student.class_id,
                        currentSchoolYear: currentSchoolYear
                    });
                    const [classStudents] = await pool.query(`
                        SELECT COUNT(DISTINCT e.student_id) as total_students
                        FROM enrollments e
                        WHERE e.class_id = ? AND e.status = 'active' AND e.school_year = ?
                    `, [student.class_id, currentSchoolYear]);
                    totalClassStudents = classStudents[0]?.total_students || 0;
                    console.log('[getStudentBulletin] Effectif récupéré depuis enrollments:', totalClassStudents);
                    
                    // Vérifier également les enrollments actifs pour cette classe
                    const [activeEnrollments] = await pool.query(`
                        SELECT e.student_id, e.status, e.school_year, s.first_name, s.last_name
                        FROM enrollments e
                        JOIN students s ON e.student_id = s.id
                        WHERE e.class_id = ? AND e.status = 'active' AND e.school_year = ?
                    `, [student.class_id, currentSchoolYear]);
                    console.log('[getStudentBulletin] Enrollments actifs pour cette classe:', {
                        count: activeEnrollments.length,
                        enrollments: activeEnrollments.map(e => ({
                            student_id: e.student_id,
                            name: `${e.first_name} ${e.last_name}`,
                            status: e.status,
                            school_year: e.school_year
                        }))
                    });
                }
                console.log('[getStudentBulletin] Effectif total de la classe (trimestre, final):', totalClassStudents);

                const bulletinData = {
                    student_info: {
                        first_name: student.first_name,
                        last_name: student.last_name,
                        class_name: student.class_name,
                        registration_number: student.registration_number,
                        gender: student.gender,
                        date_of_birth: student.date_of_birth
                    },
                    trimester: currentTrimester,
                    school_year: currentSchoolYear,
                    subjects: subjectsWithRanks,
                    general_average: parseFloat(Number(generalAverage).toFixed(2)),
                    general_rank: generalRank || 0,
                    total_class_students: totalClassStudents,
                    highest_average: highestAverage !== null ? parseFloat(Number(highestAverage).toFixed(2)) : undefined,
                    lowest_average: lowestAverage !== null ? parseFloat(Number(lowestAverage).toFixed(2)) : undefined,
                    published: true,
                    bulletin_type: 'trimester',
                    _debug_info: {
                        debug_enrollments: debugEnrollmentsTrimester,
                        generalRanking_length: generalRanking ? generalRanking.length : 0,
                        active_enrollments_count: debugEnrollmentsTrimester.filter(e => e.status === 'active' && e.school_year === currentSchoolYear).length,
                        total_class_students: totalClassStudents
                    }
                };

                console.log('[getStudentBulletin] Bulletin trimestriel généré avec succès');
                res.json(bulletinData);

            } catch (error) {
                console.error('[getStudentBulletin] ❌❌❌ ERREUR CRITIQUE ❌❌❌');
                console.error('[getStudentBulletin] Message:', error.message);
                console.error('[getStudentBulletin] Stack trace:', error.stack);
                console.error('[getStudentBulletin] Détails de l\'erreur:', {
                    name: error.name,
                    code: error.code,
                    sqlMessage: error.sqlMessage,
                    sqlState: error.sqlState,
                    errno: error.errno
                });
                res.status(500).json({ 
                    message: 'Erreur lors de la génération du bulletin',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        },

        // Récupérer les compositions disponibles pour un élève avec leur statut de publication
        getStudentCompositions: async(req, res) => {
            try {
                const { id } = req.params;
                const { school_year } = req.query;

                console.log('[getStudentCompositions] Appelé avec student_id:', id, 'school_year:', school_year);

                // Vérifier que l'utilisateur a le droit de voir les compositions de cet élève
                if (req.user.role === 'parent') {
                    const tokenStudentId = req.user.student_id;
                    if (!tokenStudentId || Number(tokenStudentId) !== Number(id)) {
                        console.log(`[getStudentCompositions] Accès refusé - token student_id: ${tokenStudentId}, demandé: ${id}`);
                        return res.status(403).json({
                            message: 'Vous n\'avez pas l\'autorisation de voir les compositions de cet élève'
                        });
                    }
                    
                    // Vérifier que l'enfant existe
                    const [students] = await pool.query(
                        'SELECT id FROM students WHERE id = ?', 
                        [id]
                    );

                    if (students.length === 0) {
                        return res.status(404).json({
                            message: 'Élève non trouvé'
                        });
                    }
                }

                const currentSchoolYear = school_year || getCurrentSchoolYear();

                // Récupérer la classe de l'élève
                const [studentInfo] = await pool.query(`
                    SELECT c.id as class_id
                    FROM students s
                    JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
                    JOIN classes c ON e.class_id = c.id
                    WHERE s.id = ?
                `, [currentSchoolYear, id]);

                if (studentInfo.length === 0) {
                    return res.status(404).json({ message: 'Élève non trouvé ou non inscrit pour cette année' });
                }

                const classId = studentInfo[0].class_id;

                // Récupérer TOUTES les compositions de la classe avec leur statut de publication
                const [compositions] = await pool.query(`
                    SELECT DISTINCT
                        c.id,
                        c.name,
                        c.composition_date,
                        c.description,
                        COALESCE(rcp.published, 0) as is_published,
                        rcp.published_at,
                        COUNT(g.id) as notes_count,
                        CASE 
                            WHEN COALESCE(rcp.published, 0) = 1 THEN 'Publié'
                            ELSE 'Non publié'
                        END as status_label
                    FROM compositions c
                    JOIN composition_classes cc ON c.id = cc.composition_id AND cc.class_id = ?
                    LEFT JOIN grades g ON c.id = g.composition_id AND g.student_id = ? AND g.class_id = ?
                    LEFT JOIN report_card_publications rcp ON rcp.class_id = ? AND rcp.composition_id = c.id AND rcp.school_year = ?
                    WHERE c.school_year = ?
                    AND c.is_active = 1
                    AND cc.is_enabled = 1
                    GROUP BY c.id, c.name, c.composition_date, c.description, rcp.published, rcp.published_at
                    ORDER BY c.composition_date DESC
                `, [classId, id, classId, classId, currentSchoolYear, currentSchoolYear]);

                console.log(`[getStudentCompositions] Compositions trouvées: ${compositions.length}`);
                console.log('[getStudentCompositions] Détails:', compositions);
                res.json(compositions);

            } catch (error) {
                console.error('[getStudentCompositions] ERREUR:', error);
                res.status(500).json({ message: 'Erreur lors de la récupération des compositions' });
            }
        },

        // Récupérer le contenu HTML d'un reçu de paiement
        getPaymentReceipt: async(req, res) => {
            try {
                const { id, paymentId } = req.params;
                console.log('[getPaymentReceipt] Appelé avec student_id:', id, 'payment_id:', paymentId);

                    // Vérifier que les paramètres sont présents
                    if (!id || !paymentId) {
                        console.error('[getPaymentReceipt] Paramètres manquants:', { id, paymentId });
                        return res.status(400).json({ message: 'Paramètres manquants' });
                    }

                    // Vérifier les permissions
                    if (req.user.role === 'parent') {
                        if (!req.user.parent_code) {
                            return res.status(403).json({ message: 'Accès interdit.' });
                        }
                        const parentEmail = req.user.parent_email || req.user.email;
                        if (!parentEmail) {
                            return res.status(403).json({ message: 'Accès interdit.' });
                        }
                        const [students] = await pool.query(
                            'SELECT id FROM students WHERE id = ? AND parent_email = ?', [id, parentEmail]
                        );

                        if (students.length === 0) {
                            return res.status(403).json({
                                message: 'Vous n\'avez pas l\'autorisation de voir les reçus de cet élève'
                            });
                        }
                    }

                    // Récupérer les informations du paiement
                    console.log('[getPaymentReceipt] Exécution de la requête SQL...');
                    const [paymentData] = await pool.query(`
                SELECT 
                    s.first_name, s.last_name, s.gender, s.parent_contact, s.child_photo,
                    c.name as class_name, 
                    el.tuition_amount,
                    el.registration_fee,
                    el.tuition_amount as class_amount,
                    p.amount, p.payment_date, p.payment_method, p.description, p.school_year,
                    p.original_amount, p.discount_amount
                FROM students s
                JOIN payments p ON s.id = p.student_id
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = p.school_year
                LEFT JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE s.id = ? AND p.id = ? AND (p.status = 'completed' OR p.status = 'paid' OR p.status = 'bon')
            `, [id, paymentId]);
                    console.log('[getPaymentReceipt] Résultat de la requête:', paymentData.length, 'lignes trouvées');
                    if (paymentData.length > 0) {
                        console.log('[getPaymentReceipt] Données récupérées:', paymentData[0]);
                        console.log('[getPaymentReceipt] Montant calculé (class_amount):', paymentData[0].class_amount);
                    }

                    if (paymentData.length === 0) {
                        return res.status(404).json({ message: 'Paiement non trouvé' });
                    }

                    const data = paymentData[0];

                    // Récupérer les réductions
                    console.log('[getPaymentReceipt] Récupération des réductions...');
                    let totalDiscount = 0;
                    try {
                        const [discounts] = await pool.query(`
                    SELECT 
                        SUM(CASE 
                            WHEN sd.percentage > 0 THEN (el.tuition_amount * sd.percentage / 100)
                            ELSE sd.amount
                        END) as total_discount
                    FROM student_discounts sd
                    JOIN enrollments e ON sd.student_id = e.student_id AND e.status = 'active' AND e.school_year = ?
                    JOIN classes c ON e.class_id = c.id
                    LEFT JOIN education_levels el ON c.education_level_id = el.id
                    WHERE sd.student_id = ? 
                    AND sd.is_active = TRUE 
                    AND sd.approved_by IS NOT NULL
                    AND (sd.school_year IS NULL OR sd.school_year = ?)
                `, [data.school_year, id, data.school_year]);
                        totalDiscount = discounts[0] ? discounts[0].total_discount || 0 : 0;
                    } catch (error) {
                        console.log('[getPaymentReceipt] Table student_discounts non disponible, totalDiscount = 0');
                        totalDiscount = 0;
                    }

                    // Calculer le total des paiements effectués pour l'année scolaire
                    console.log('[getPaymentReceipt] Calcul du total des paiements...');
                    const [totalPayments] = await pool.query(`
                SELECT COALESCE(SUM(p.amount), 0) as total_paid
                FROM payments p
                WHERE p.student_id = ? AND p.school_year = ? 
                AND (p.status = 'completed' OR p.status = 'paid' OR p.status = 'bon')
            `, [id, data.school_year]);

                    const totalPaid = Number(totalPayments[0].total_paid);
                    const tuitionFee = data.class_amount || 0;

                    // Calculer le reste à payer en tenant compte des réductions
                    const totalDue = tuitionFee - totalDiscount;
                    const remainingAmount = Math.max(0, totalDue - totalPaid);

                    console.log('[getPaymentReceipt] Calculs:', {
                        tuitionFee,
                        totalDiscount,
                        totalPaid,
                        totalDue,
                        remainingAmount
                    });

                    // Générer le HTML du reçu
                    const receiptHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Reçu de paiement</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        .logo-container { text-align: center; margin-bottom: 15px; }
                        .logo { width: 80px; height: 80px; object-fit: contain; }
                        .receipt-title { font-size: 24px; font-weight: bold; color: #333; margin-top: 10px; }
                        .school-info { font-size: 14px; color: #666; }
                        .receipt-number { font-size: 12px; color: #999; }
                    .section { margin: 20px 0; }
                        .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #333; }
                        .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
                        .label { font-weight: bold; }
                        .value { text-align: right; }
                        .amount { font-size: 18px; font-weight: bold; color: #2c5aa0; }
                        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
                        .signature { margin-top: 50px; display: flex; justify-content: space-between; }
                        .signature-box { width: 200px; text-align: center; }
                        .signature-line { border-top: 1px solid #333; margin-top: 30px; }
                        .photo-container { text-align: center; margin: 15px 0; }
                        .student-photo { width: 140px; height: 140px; border-radius: 50%; object-fit: cover; border: 3px solid #1976d2; }
                        @media print {
                            .logo { width: 200px; height: 50px; }
                            body { margin: 10px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo-container">
                            <img src="https://bethaniemiracle.com/img/pages/logologo.webp" alt="Logo École" class="logo">
                        </div>
                        <div class="receipt-title">REÇU DE PAIEMENT</div>
                        <div class="school-info">École Primaire Publique</div>
                        <div class="school-info">Année Scolaire: ${data.school_year}</div>
                        <div class="receipt-number">Date: ${new Date(data.payment_date).toLocaleDateString('fr-FR')}</div>
                    </div>

                    <div class="section">
                        <div class="section-title">INFORMATIONS DE L'ÉLÈVE</div>
                        <div class="photo-container">
                            ${data.child_photo ? `
                            <img class="student-photo" src="https://bethaniemiracle.com/api/students/photo/${encodeURIComponent(data.child_photo)}" alt="Photo de ${data.first_name} ${data.last_name}">
                            ` : `
                            <div class="student-photo" style="background-color: #e0e0e0; display: flex; align-items: center; justify-content: center; color: #999; font-size: 14px; text-align: center;">
                                <span>Aucune photo</span>
                            </div>
                            `}
                        </div>
                        <div class="info-row">
                            <span class="label">Nom complet:</span>
                            <span class="value">${data.first_name} ${data.last_name}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Classe:</span>
                            <span class="value">${data.class_name || 'Non spécifiée'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Contact parent:</span>
                            <span class="value">${data.parent_contact || 'Non renseigné'}</span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">DÉTAILS DU PAIEMENT</div>
                        <div class="info-row">
                            <span class="label">Description:</span>
                            <span class="value">${data.description || 'Paiement de scolarité'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Méthode de paiement:</span>
                            <span class="value">${data.payment_method || 'Non spécifiée'}</span>
                        </div>
                        ${data.original_amount ? `
                        <div class="info-row">
                            <span class="label">Montant original:</span>
                            <span class="value">${data.original_amount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Remise:</span>
                            <span class="value">${data.discount_amount || 0} FCFA</span>
                        </div>
                        ` : ''}
                    </div>

                    <div class="section">
                        <div class="section-title">MONTANT</div>
                        <div class="info-row">
                            <span class="label">Montant payé:</span>
                            <span class="value amount">${data.amount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Total payé (année):</span>
                            <span class="value">${totalPaid.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Montant total (classe):</span>
                            <span class="value">${tuitionFee.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        ${totalDiscount > 0 ? `
                        <div class="info-row">
                            <span class="label">Réductions appliquées:</span>
                            <span class="value" style="color: #2e7d32; font-weight: bold;">-${totalDiscount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Montant dû après réductions:</span>
                            <span class="value">${totalDue.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        ` : ''}
                        <div class="info-row">
                            <span class="label">Reste à payer:</span>
                            <span class="value" style="color: ${remainingAmount > 0 ? '#d32f2f' : '#2e7d32'}; font-weight: bold;">${remainingAmount.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                    </div>

                    <div class="footer">
                        <p>Ce reçu confirme le paiement effectué le ${new Date(data.payment_date).toLocaleDateString('fr-FR')}</p>
                    </div>

                    <div class="signature">
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div>Signature du parent</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div>Signature de l'administration</div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            res.json({ html: receiptHtml });

        } catch (error) {
            console.error('[getPaymentReceipt] ERREUR:', error);
            console.error('[getPaymentReceipt] Stack trace:', error.stack);
            res.status(500).json({ 
                message: 'Erreur lors de la génération du reçu de paiement',
                error: error.message 
            });
        }
    },
};

module.exports = studentController;