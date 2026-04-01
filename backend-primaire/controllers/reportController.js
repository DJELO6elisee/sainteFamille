const pool = require('../config/database');

// Fonction helper pour obtenir le diviseur selon la classe
const getDivisorForClass = (className) => {
    const classUpper = className.toUpperCase();
    if (classUpper.startsWith('CE1')) return 11;
    if (classUpper.startsWith('CE2')) return 17;
    if (classUpper.startsWith('CM1')) return 17;
    if (classUpper.startsWith('CM2')) return 8.5;
    return 4; // Valeur par défaut
};

// Récupérer toutes les compositions
const getAllCompositions = async(req, res) => {
    try {
        const query = `
      SELECT DISTINCT 
        c.id,
        c.name,
        c.composition_date as date,
        c.description,
        c.school_year
      FROM compositions c
      WHERE c.is_active = 1
      ORDER BY c.composition_date DESC, c.name ASC
    `;

        const [results] = await pool.query(query);
        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des compositions:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Récupérer les compositions d'une classe spécifique
const getCompositionsByClass = async(req, res) => {
    try {
        const { classId } = req.params;
        const { school_year = '2025-2026' } = req.query;

        // Vérifier que la classe existe et récupérer son niveau d'éducation
        const [classLevelInfo] = await pool.query(`
            SELECT c.education_level_id, el.name as level_name, el.is_active as level_is_active
            FROM classes c
            JOIN education_levels el ON c.education_level_id = el.id
            WHERE c.id = ?
        `, [classId]);

        if (classLevelInfo.length === 0) {
            return res.status(404).json({ error: 'Classe non trouvée' });
        }

        const isActiveLevel = classLevelInfo[0].level_is_active === 1;

        // Si le niveau est actif, associer automatiquement toutes les compositions actives
        if (isActiveLevel) {
            const [allCompositions] = await pool.query(`
                SELECT DISTINCT c.id, c.name, c.composition_date, c.is_active
                FROM compositions c
                WHERE c.school_year = ?
                  AND c.is_active = 1
                ORDER BY c.composition_date DESC
            `, [school_year]);

            // Pour chaque composition, vérifier si elle est associée à cette classe
            // Si non, l'associer automatiquement
            for (const comp of allCompositions) {
                const [association] = await pool.query(`
                    SELECT id, is_enabled FROM composition_classes 
                    WHERE composition_id = ? AND class_id = ?
                `, [comp.id, classId]);

                if (association.length === 0) {
                    // Association manquante: créer l'association automatiquement
                    try {
                        await pool.query(`
                            INSERT INTO composition_classes (composition_id, class_id, is_enabled)
                            VALUES (?, ?, 1)
                        `, [comp.id, classId]);
                        console.log(`[REPORT CONTROLLER] ✅ Composition "${comp.name}" automatiquement associée à la classe ${classId}`);
                    } catch (assocError) {
                        console.error(`[REPORT CONTROLLER] ⚠️ Erreur lors de l'association automatique:`, assocError);
                    }
                } else if (association[0].is_enabled === 0) {
                    // Association existe mais désactivée: activer
                    try {
                        await pool.query(`
                            UPDATE composition_classes 
                            SET is_enabled = 1 
                            WHERE composition_id = ? AND class_id = ?
                        `, [comp.id, classId]);
                        console.log(`[REPORT CONTROLLER] ✅ Association de la composition "${comp.name}" activée pour la classe ${classId}`);
                    } catch (assocError) {
                        console.error(`[REPORT CONTROLLER] ⚠️ Erreur lors de l'activation:`, assocError);
                    }
                }
            }
        }

        // Maintenant récupérer les compositions associées
        const query = `
      SELECT DISTINCT 
        c.id,
        c.name,
        c.composition_date as date,
        c.description
      FROM compositions c
      JOIN composition_classes cc ON c.id = cc.composition_id
      WHERE cc.class_id = ? AND c.is_active = 1 AND cc.is_enabled = 1
      ORDER BY c.composition_date DESC, c.name ASC
    `;

        const [results] = await pool.query(query, [classId]);
        res.json(results);
    } catch (err) {
        console.error('Erreur lors de la récupération des compositions de la classe:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Générer un rapport pour une composition d'une classe spécifique
const getClassCompositionReport = async(req, res) => {
    try {
        const { compositionId, classId } = req.params;

        // Récupérer les informations de la composition
        const compositionQuery = `
      SELECT 
        c.id,
        c.name,
        c.composition_date as date,
        c.description,
        c.school_year,
        cl.name as class_name,
        cl.name as class_full_name
      FROM compositions c
      JOIN composition_classes cc ON c.id = cc.composition_id
      JOIN classes cl ON cc.class_id = cl.id
      WHERE c.id = ? AND cc.class_id = ? AND c.is_active = 1
    `;

        const [compositionResults] = await pool.query(compositionQuery, [compositionId, classId]);

        if (compositionResults.length === 0) {
            return res.status(404).json({ error: 'Composition non trouvée pour cette classe' });
        }

        const composition = compositionResults[0];

        // Récupérer les résultats des élèves avec toutes les matières
        const resultsQuery = `
      SELECT 
        st.id,
        st.first_name,
        st.last_name,
        st.registration_number as matricule,
        COALESCE(st.gender, 'M') as gender,
        DATE_FORMAT(COALESCE(st.date_of_birth, '2000-01-01'), '%d/%m/%Y') as birth_date,
        cl.name as class_name,
        s.name as subject_name,
        g.grade as score,
        20 as max_score,
        CASE 
          WHEN g.grade IS NOT NULL THEN ROUND((g.grade / 20) * 100, 2)
          ELSE NULL
        END as percentage,
        CASE 
          WHEN g.grade IS NOT NULL AND (g.grade / 20) * 100 >= 90 THEN 'A'
          WHEN g.grade IS NOT NULL AND (g.grade / 20) * 100 >= 80 THEN 'B'
          WHEN g.grade IS NOT NULL AND (g.grade / 20) * 100 >= 70 THEN 'C'
          WHEN g.grade IS NOT NULL AND (g.grade / 20) * 100 >= 60 THEN 'D'
          WHEN g.grade IS NOT NULL THEN 'F'
          ELSE NULL
        END as grade
      FROM students st
      JOIN enrollments e ON st.id = e.student_id AND e.status = 'active'
      JOIN classes cl ON e.class_id = cl.id
      LEFT JOIN grades g ON g.student_id = st.id AND g.composition_id = ?
      LEFT JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
      WHERE e.class_id = ?
      ORDER BY st.last_name, st.first_name, s.name
    `;

        const [results] = await pool.query(resultsQuery, [compositionId, classId]);

        // Regrouper les résultats par élève
        const studentResults = {};
        const subjects = new Set();

        // Matières autorisées pour les rapports
        const allowedSubjects = [
            'EXPLOITATION DE TEXTE',
            'A.E.M',
            'ORTHOGRAPHE/DICTEE',
            'MATHEMATIQUE'
        ];

        results.forEach(row => {
            if (!studentResults[row.id]) {
                studentResults[row.id] = {
                    id: row.id,
                    first_name: row.first_name,
                    last_name: row.last_name,
                    matricule: row.matricule || `ST${row.id.toString().padStart(4, '0')}`,
                    gender: row.gender,
                    birth_date: row.birth_date,
                    class_name: row.class_name,
                    subjects: {},
                    total_score: 0,
                    total_subjects: 0,
                    average: 0
                };
            }

            // Filtrer uniquement les matières autorisées
            if (row.subject_name && row.score !== null && allowedSubjects.includes(row.subject_name)) {
                studentResults[row.id].subjects[row.subject_name] = {
                    score: row.score,
                    max_score: row.max_score,
                    percentage: row.percentage,
                    grade: row.grade
                };
                studentResults[row.id].total_score += parseFloat(row.score);
                studentResults[row.id].total_subjects += 1;
                subjects.add(row.subject_name);
            }
        });

        // Trier les matières dans l'ordre spécifié
        const orderedSubjects = allowedSubjects.filter(subj => subjects.has(subj));
        subjects.clear();
        orderedSubjects.forEach(subj => subjects.add(subj));

        // Calculer les moyennes pour chaque élève
        // Pour CE/CM, on utilise le diviseur spécifique au niveau (CE1: 11, CE2: 17, CM1: 17, CM2: 8.5)
        Object.values(studentResults).forEach(student => {
            if (student.total_score > 0) {
                const studentDivisor = getDivisorForClass(student.class_name);
                const className = student.class_name.toUpperCase();

                // Pour CE/CM, le calcul direct donne la moyenne sur 10
                if (className.startsWith('CE') || className.startsWith('CM')) {
                    student.average_out_of_10 = student.total_score / studentDivisor;
                    student.average = student.average_out_of_10 * 2;
                    student.percentage = student.average_out_of_10 * 10;
                } else {
                    // Autres classes: calcul normal
                    student.average = student.total_score / 4;
                    student.average_out_of_10 = (student.average / 20) * 10;
                    student.percentage = (student.average / 20) * 100;
                }

                // Calcul de la lettre de note basé sur la moyenne /10
                student.grade = student.average_out_of_10 >= 9 ? 'A' :
                    student.average_out_of_10 >= 8 ? 'B' :
                    student.average_out_of_10 >= 7 ? 'C' :
                    student.average_out_of_10 >= 6 ? 'D' : 'F';
            } else {
                student.average = 0;
                student.average_out_of_10 = 0;
                student.percentage = 0;
                student.grade = 'N/A';
            }
        });

        // Calculer les rangs (trier par moyenne décroissante)
        const studentsArray = Object.values(studentResults);
        studentsArray.sort((a, b) => b.average - a.average);
        studentsArray.forEach((student, index) => {
            student.rank = index + 1;
        });

        // Calculer les statistiques générales
        const studentsWithGrades = studentsArray.filter(s => s.total_score > 0);
        const totalStudents = studentsArray.length;
        const studentsWithScores = studentsWithGrades.length;

        let averageScore = 0;
        let highestScore = 0;
        let lowestScore = 20;
        let passCount = 0;
        const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };

        if (studentsWithScores > 0) {
            const totalScore = studentsWithGrades.reduce((sum, s) => sum + s.average, 0);
            averageScore = totalScore / studentsWithScores;
            highestScore = Math.max(...studentsWithGrades.map(s => s.average));
            lowestScore = Math.min(...studentsWithGrades.map(s => s.average));
            passCount = studentsWithGrades.filter(s => s.percentage >= 60).length;

            studentsWithGrades.forEach(s => {
                gradeDistribution[s.grade]++;
            });
        }

        const passRate = studentsWithScores > 0 ? (passCount / studentsWithScores) * 100 : 0;

        const reportData = {
            composition: {
                id: composition.id,
                name: composition.name,
                date: composition.date,
                description: composition.description,
                class_name: composition.class_name
            },
            subjects: allowedSubjects, // Toujours retourner toutes les matières autorisées
            results: studentsArray.map(s => ({
                id: s.id,
                first_name: s.first_name,
                last_name: s.last_name,
                matricule: s.matricule,
                gender: s.gender,
                birth_date: s.birth_date,
                class_name: s.class_name,
                subjects: s.subjects,
                total_score: s.total_score || 0,
                average: s.average || 0,
                average_out_of_10: s.average_out_of_10 || 0,
                rank: s.rank,
                max_score: 20,
                percentage: s.percentage || 0,
                grade: s.grade || 'N/A'
            })),
            statistics: {
                total_students: totalStudents,
                students_with_scores: studentsWithScores,
                average_score: averageScore,
                highest_score: highestScore,
                lowest_score: lowestScore,
                pass_rate: passRate,
                grade_distribution: gradeDistribution,
                subjects_count: subjects.size
            }
        };

        res.json(reportData);
    } catch (err) {
        console.error('Erreur lors de la génération du rapport de classe:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Générer un rapport pour une composition de toute l'école
const getSchoolCompositionReport = async(req, res) => {
    try {
        const { compositionId } = req.params;

        // Récupérer les informations de la composition
        const compositionQuery = `
      SELECT 
        c.id,
        c.name,
        c.composition_date as date,
        c.description,
        c.school_year
      FROM compositions c
      WHERE c.id = ? AND c.is_active = 1
    `;

        const [compositionResults] = await pool.query(compositionQuery, [compositionId]);

        if (compositionResults.length === 0) {
            return res.status(404).json({ error: 'Composition non trouvée' });
        }

        const composition = compositionResults[0];

        // Récupérer toutes les classes primaires (CP1, CP2, CE1, CE2, CM1, CM2)
        // Pour s'assurer que CM2 est inclus dans les rapports
        const allClassesQuery = `
            SELECT id, name FROM classes
            WHERE UPPER(REPLACE(name, ' ', '')) LIKE 'CP%'
               OR UPPER(REPLACE(name, ' ', '')) LIKE 'CE%'
               OR UPPER(REPLACE(name, ' ', '')) LIKE 'CM%'
            ORDER BY name
        `;
        const allClassesParams = [];

        const [allClasses] = await pool.query(allClassesQuery, allClassesParams);
        const allClassIds = allClasses.map(cls => cls.id);
        const allClassNames = allClasses.map(cls => cls.name);

        // Si aucune classe trouvée, retourner un rapport vide
        if (allClassIds.length === 0) {
            return res.json({
                composition: {
                    id: composition.id,
                    name: composition.name,
                    date: composition.date,
                    description: composition.description
                },
                subjects: ['EXPLOITATION DE TEXTE', 'A.E.M', 'ORTHOGRAPHE/DICTEE', 'MATHEMATIQUE'],
                classes: [],
                results: [],
                statistics: {
                    total_students: 0,
                    students_with_scores: 0,
                    average_score: 0,
                    highest_score: 0,
                    lowest_score: 0,
                    pass_rate: 0,
                    grade_distribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
                    subjects_count: 4
                }
            });
        }

        // Récupérer les résultats de tous les élèves de toutes les classes des niveaux concernés
        const resultsQuery = `
      SELECT 
        st.id,
        st.first_name,
        st.last_name,
        st.registration_number as matricule,
        COALESCE(st.gender, 'M') as gender,
        DATE_FORMAT(COALESCE(st.date_of_birth, '2000-01-01'), '%d/%m/%Y') as birth_date,
        cl.name as class_name,
        s.name as subject_name,
        g.grade as score,
        20 as max_score,
        CASE 
          WHEN g.grade IS NOT NULL THEN ROUND((g.grade / 20) * 100, 2)
          ELSE NULL
        END as percentage,
        CASE 
          WHEN g.grade IS NOT NULL AND (g.grade / 20) * 100 >= 90 THEN 'A'
          WHEN g.grade IS NOT NULL AND (g.grade / 20) * 100 >= 80 THEN 'B'
          WHEN g.grade IS NOT NULL AND (g.grade / 20) * 100 >= 70 THEN 'C'
          WHEN g.grade IS NOT NULL AND (g.grade / 20) * 100 >= 60 THEN 'D'
          WHEN g.grade IS NOT NULL THEN 'F'
          ELSE NULL
        END as grade
      FROM students st
      JOIN enrollments e ON st.id = e.student_id AND e.status = 'active'
      JOIN classes cl ON e.class_id = cl.id
      LEFT JOIN grades g ON g.student_id = st.id AND g.composition_id = ?
      LEFT JOIN bulletin_subjects s ON g.bulletin_subject_id = s.id
      WHERE cl.id IN (${allClassIds.map(() => '?').join(',')})
      ORDER BY cl.name, st.last_name, st.first_name, s.name
    `;

        const [results] = await pool.query(resultsQuery, [compositionId, ...allClassIds]);

        // Regrouper les résultats par élève
        const studentResults = {};
        const subjects = new Set();

        // Matières autorisées pour les rapports
        const allowedSubjects = [
            'EXPLOITATION DE TEXTE',
            'A.E.M',
            'ORTHOGRAPHE/DICTEE',
            'MATHEMATIQUE'
        ];

        results.forEach(row => {
            if (!studentResults[row.id]) {
                studentResults[row.id] = {
                    id: row.id,
                    first_name: row.first_name,
                    last_name: row.last_name,
                    matricule: row.matricule || `ST${row.id.toString().padStart(4, '0')}`,
                    gender: row.gender,
                    birth_date: row.birth_date,
                    class_name: row.class_name,
                    subjects: {},
                    total_score: 0,
                    total_subjects: 0,
                    average: 0
                };
            }

            // Filtrer uniquement les matières autorisées
            if (row.subject_name && row.score !== null && allowedSubjects.includes(row.subject_name)) {
                studentResults[row.id].subjects[row.subject_name] = {
                    score: row.score,
                    max_score: row.max_score,
                    percentage: row.percentage,
                    grade: row.grade
                };
                studentResults[row.id].total_score += parseFloat(row.score);
                studentResults[row.id].total_subjects += 1;
                subjects.add(row.subject_name);
            }
        });

        // Trier les matières dans l'ordre spécifié
        const orderedSubjects = allowedSubjects.filter(subj => subjects.has(subj));
        subjects.clear();
        orderedSubjects.forEach(subj => subjects.add(subj));

        // Calculer les moyennes pour chaque élève
        // Pour CE/CM, on utilise le diviseur spécifique au niveau (CE1: 11, CE2: 17, CM1: 17, CM2: 8.5)
        Object.values(studentResults).forEach(student => {
            if (student.total_score > 0) {
                const studentDivisor = getDivisorForClass(student.class_name);
                const className = student.class_name.toUpperCase();

                // Pour CE/CM, le calcul direct donne la moyenne sur 10
                if (className.startsWith('CE') || className.startsWith('CM')) {
                    student.average_out_of_10 = student.total_score / studentDivisor;
                    student.average = student.average_out_of_10 * 2;
                    student.percentage = student.average_out_of_10 * 10;
                } else {
                    // Autres classes: calcul normal
                    student.average = student.total_score / 4;
                    student.average_out_of_10 = (student.average / 20) * 10;
                    student.percentage = (student.average / 20) * 100;
                }

                // Calcul de la lettre de note basé sur la moyenne /10
                student.grade = student.average_out_of_10 >= 9 ? 'A' :
                    student.average_out_of_10 >= 8 ? 'B' :
                    student.average_out_of_10 >= 7 ? 'C' :
                    student.average_out_of_10 >= 6 ? 'D' : 'F';
            } else {
                student.average = 0;
                student.average_out_of_10 = 0;
                student.percentage = 0;
                student.grade = 'N/A';
            }
        });

        // Calculer les rangs (trier par moyenne décroissante)
        const studentsArray = Object.values(studentResults);
        studentsArray.sort((a, b) => b.average - a.average);
        studentsArray.forEach((student, index) => {
            student.rank = index + 1;
        });

        // Calculer les statistiques générales
        const studentsWithGrades = studentsArray.filter(s => s.total_score > 0);
        const totalStudents = studentsArray.length;
        const studentsWithScores = studentsWithGrades.length;

        let averageScore = 0;
        let highestScore = 0;
        let lowestScore = 20;
        let passCount = 0;
        const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };

        if (studentsWithScores > 0) {
            const totalScore = studentsWithGrades.reduce((sum, s) => sum + s.average, 0);
            averageScore = totalScore / studentsWithScores;
            highestScore = Math.max(...studentsWithGrades.map(s => s.average));
            lowestScore = Math.min(...studentsWithGrades.map(s => s.average));
            passCount = studentsWithGrades.filter(s => s.percentage >= 60).length;

            studentsWithGrades.forEach(s => {
                gradeDistribution[s.grade]++;
            });
        }

        const passRate = studentsWithScores > 0 ? (passCount / studentsWithScores) * 100 : 0;

        const reportData = {
            composition: {
                id: composition.id,
                name: composition.name,
                date: composition.date,
                description: composition.description
            },
            subjects: allowedSubjects, // Toujours retourner toutes les matières autorisées
            classes: allClassNames, // Toutes les classes des niveaux concernés
            results: studentsArray.map(s => ({
                id: s.id,
                first_name: s.first_name,
                last_name: s.last_name,
                matricule: s.matricule,
                gender: s.gender,
                birth_date: s.birth_date,
                class_name: s.class_name,
                subjects: s.subjects,
                total_score: s.total_score || 0,
                average: s.average || 0,
                average_out_of_10: s.average_out_of_10 || 0,
                rank: s.rank,
                max_score: 20,
                percentage: s.percentage || 0,
                grade: s.grade || 'N/A'
            })),
            statistics: {
                total_students: totalStudents,
                students_with_scores: studentsWithScores,
                average_score: averageScore,
                highest_score: highestScore,
                lowest_score: lowestScore,
                pass_rate: passRate,
                grade_distribution: gradeDistribution,
                subjects_count: allowedSubjects.length
            }
        };

        res.json(reportData);
    } catch (err) {
        console.error('Erreur lors de la génération du rapport d\'école:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Récupérer les statistiques générales des compositions
const getCompositionStatistics = async(req, res) => {
    try {
        const query = `
      SELECT 
        COUNT(DISTINCT c.id) as total_compositions,
        COUNT(DISTINCT cc.class_id) as classes_with_compositions,
        COUNT(g.id) as total_grades,
        AVG(g.grade) as overall_average
      FROM compositions c
      LEFT JOIN composition_classes cc ON c.id = cc.composition_id
      LEFT JOIN grades g ON c.id = g.composition_id
      WHERE c.is_active = 1
    `;

        const [results] = await pool.query(query);
        res.json(results[0]);
    } catch (err) {
        console.error('Erreur lors de la récupération des statistiques:', err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

module.exports = {
    getAllCompositions,
    getCompositionsByClass,
    getClassCompositionReport,
    getSchoolCompositionReport,
    getCompositionStatistics
};