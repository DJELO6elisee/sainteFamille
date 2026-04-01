// Code à insérer dans publishBulletin après await pool.query(query, params);

// Envoyer automatiquement les bulletins aux parents
try {
    console.log('[BULLETIN CONTROLLER] Début de l\'envoi automatique des bulletins aux parents');
    
    // Récupérer tous les élèves de la classe avec email parent
    const [students] = await pool.query(`
        SELECT DISTINCT
            s.id,
            s.first_name,
            s.last_name,
            s.registration_number,
            s.gender,
            DATE_FORMAT(DATE_ADD(s.date_of_birth, INTERVAL 0 HOUR), '%d/%m/%Y') as date_of_birth,
            s.parent_email,
            s.parent_first_name,
            s.parent_last_name,
            c.name as class_name,
            c.id as class_id
        FROM students s
        JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
        JOIN classes c ON e.class_id = c.id
        WHERE c.id = ? AND s.parent_email IS NOT NULL AND s.parent_email != ''
        ORDER BY s.last_name, s.first_name
    `, [school_year, classId]);

    console.log(`[BULLETIN CONTROLLER] ${students.length} élèves trouvés avec email parent`);

    // Récupérer les informations de la composition
    const [compositionInfo] = await pool.query(`
        SELECT name, composition_date, description
        FROM compositions
        WHERE id = ?
    `, [composition_id]);

    if (compositionInfo.length > 0) {
        const composition = compositionInfo[0];
        let emailsSent = 0;
        let emailsFailed = 0;

        // Pour chaque élève, récupérer son bulletin et l'envoyer
        for (const student of students) {
            try {
                // Récupérer les notes du bulletin pour cette composition
                const [grades] = await pool.query(`
                    SELECT 
                        bs.name as subject_name,
                        bs.id as subject_id,
                        g.grade as average,
                        COALESCE(cs.coefficient, 1) as coefficient,
                        bs.display_order
                    FROM grades g
                    JOIN bulletin_subjects bs ON g.bulletin_subject_id = bs.id
                    LEFT JOIN class_subjects cs ON cs.class_id = g.class_id AND cs.subject_id = g.bulletin_subject_id
                    WHERE g.student_id = ? 
                    AND g.class_id = ? 
                    AND g.composition_id = ?
                    AND g.school_year = ?
                    AND g.is_published = 1
                    ORDER BY bs.display_order, bs.name
                `, [student.id, student.class_id, composition_id, school_year]);

                // Calculer la moyenne générale et les rangs
                let totalWeighted = 0;
                let totalCoeff = 0;
                const subjectsWithRanks = [];

                for (const grade of grades) {
                    const average = parseFloat(grade.average) || 0;
                    const coeff = parseInt(grade.coefficient) || 1;
                    totalWeighted += average * coeff;
                    totalCoeff += coeff;
                    subjectsWithRanks.push({
                        subject_name: grade.subject_name,
                        subject_id: grade.subject_id,
                        average: average,
                        coefficient: coeff,
                        rank: 0, // Simplifié pour l'email
                        total_students: students.length
                    });
                }

                const generalAverage = totalCoeff > 0 ? totalWeighted / totalCoeff : 0;

                // Construire les données du bulletin
                const bulletinData = {
                    student_info: {
                        first_name: student.first_name,
                        last_name: student.last_name,
                        registration_number: student.registration_number,
                        gender: student.gender,
                        date_of_birth: student.date_of_birth,
                        class_name: student.class_name
                    },
                    subjects: subjectsWithRanks,
                    general_average: parseFloat(generalAverage.toFixed(2)),
                    general_rank: 0, // Simplifié pour l'email
                    total_class_students: students.length,
                    school_year: school_year
                };

                // Envoyer l'email au parent
                const emailResult = await emailService.sendStudentBulletinEmail({
                    parent_email: student.parent_email,
                    parent_first_name: student.parent_first_name || '',
                    parent_last_name: student.parent_last_name || '',
                    bulletinData: bulletinData,
                    compositionName: composition.name,
                    compositionDate: composition.composition_date,
                    frontendUrl: process.env.FRONTEND_URL || 'https://lapetiteacademie.ci'
                });

                if (emailResult.success) {
                    emailsSent++;
                    console.log(`[BULLETIN CONTROLLER] ✅ Bulletin envoyé à ${student.parent_email} pour ${student.first_name} ${student.last_name}`);
                } else {
                    emailsFailed++;
                    console.error(`[BULLETIN CONTROLLER] ❌ Échec envoi bulletin à ${student.parent_email}: ${emailResult.error}`);
                }
            } catch (studentError) {
                emailsFailed++;
                console.error(`[BULLETIN CONTROLLER] Erreur pour l'élève ${student.id}:`, studentError);
            }
        }

        console.log(`[BULLETIN CONTROLLER] Envoi terminé: ${emailsSent} réussis, ${emailsFailed} échecs`);
    }
} catch (emailError) {
    console.error('[BULLETIN CONTROLLER] Erreur lors de l\'envoi automatique des bulletins:', emailError);
}


