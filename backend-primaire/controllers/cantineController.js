const pool = require('../config/database');
const emailService = require('../services/emailService');
const { addHistoryEntry } = require('./historyController');

// Fonction pour calculer le montant mensuel de cantine
const calculateMonthlyCantineAmount = (educationLevelId) => {
    // Montant fixe de 15,000 FCFA par mois pour tous les élèves
    return 15000;
};

// Fonction pour obtenir les mois de l'année scolaire
const getSchoolYearMonths = (schoolYear) => {
    const year = schoolYear.split('-')[0]; // Récupérer la première année
    return [
        { month: 'Septembre', monthNumber: 9, year: parseInt(year) },
        { month: 'Octobre', monthNumber: 10, year: parseInt(year) },
        { month: 'Novembre', monthNumber: 11, year: parseInt(year) },
        { month: 'Décembre', monthNumber: 12, year: parseInt(year) },
        { month: 'Janvier', monthNumber: 1, year: parseInt(year) + 1 },
        { month: 'Février', monthNumber: 2, year: parseInt(year) + 1 },
        { month: 'Mars', monthNumber: 3, year: parseInt(year) + 1 },
        { month: 'Avril', monthNumber: 4, year: parseInt(year) + 1 },
        { month: 'Mai', monthNumber: 5, year: parseInt(year) + 1 },
        { month: 'Juin', monthNumber: 6, year: parseInt(year) + 1 },
        { month: 'Juillet', monthNumber: 7, year: parseInt(year) + 1 },
        { month: 'Août', monthNumber: 8, year: parseInt(year) + 1 }
    ];
};

// Fonction pour vérifier si un mois a déjà été payé
const isMonthPaid = async(studentId, monthNumber, year, studentType = 'student') => {
    const pool = require('../config/database');
    const [payments] = await pool.query(
        `SELECT COUNT(*) as count FROM cantine_payments 
         WHERE student_id = ? AND student_type = ? AND month_number = ? AND year = ? AND paid = 1`, [studentId, studentType, monthNumber, year]
    );
    return payments[0].count > 0;
};

module.exports = {
        // Créer un paiement de cantine mensuel
        createPayment: async(req, res) => {
            let connection;
            try {
                connection = await pool.getConnection();
                await connection.beginTransaction();

                const { student_id, amount, base_amount, reduction_amount, payment_method, month_number, year, notes, school_year } = req.body;

                // Vérifier si c'est un enfant de garderie ou un élève normal
                const [garderieCheck] = await connection.query(
                    'SELECT id, child_first_name, child_last_name, unique_code, cantine, parent_email, parent_first_name, parent_last_name FROM garderie_inscriptions WHERE id = ? AND cantine = 1 AND school_year = ?', [student_id, school_year]
                );

                let student, isGarderieStudent, classInfo, educationLevelId;

                if (garderieCheck.length > 0) {
                    // C'est un enfant de garderie
                    isGarderieStudent = true;
                    student = {
                        id: garderieCheck[0].id,
                        first_name: garderieCheck[0].child_first_name,
                        last_name: garderieCheck[0].child_last_name,
                        registration_number: garderieCheck[0].unique_code,
                        cantine: garderieCheck[0].cantine
                    };
                    classInfo = [
                        [{ class_name: 'Garderie', level: 'Garderie' }]
                    ];
                    educationLevelId = null; // Pas de niveau éducatif pour garderie
                } else {
                    // C'est un élève normal
                    isGarderieStudent = false;

                    // Vérifier que l'élève existe et est inscrit à la cantine
                    const [studentCheck] = await connection.query(
                        'SELECT id, first_name, last_name, registration_number, cantine FROM students WHERE id = ? AND cantine = 1', [student_id]
                    );

                    if (studentCheck.length === 0) {
                        await connection.rollback();
                        return res.status(404).json({ message: 'Élève non trouvé ou non inscrit à la cantine' });
                    }

                    student = studentCheck[0];

                    // Récupérer la classe de l'élève pour obtenir le niveau éducatif
                    classInfo = await connection.query(
                        `SELECT c.name as class_name, el.name as level, c.education_level_id 
                     FROM enrollments e 
                     JOIN classes c ON e.class_id = c.id 
                     LEFT JOIN education_levels el ON c.education_level_id = el.id
                     WHERE e.student_id = ? AND e.status = 'active' AND e.school_year = ?`, [student_id, school_year]
                    );

                    if (classInfo[0].length === 0) {
                        await connection.rollback();
                        return res.status(400).json({ message: 'Élève non assigné à une classe' });
                    }

                    educationLevelId = classInfo[0][0].education_level_id;
                }

                // Calculer le montant attendu (15,000 FCFA par mois)
                const expectedAmount = calculateMonthlyCantineAmount(educationLevelId);
                const finalAmount = parseFloat(amount);
                const baseAmount = parseFloat(base_amount) || finalAmount;
                const reductionAmount = parseFloat(reduction_amount) || 0;

                // Vérifier que le montant de base est correct (optionnel si réduction appliquée)
                if (baseAmount && baseAmount !== expectedAmount) {
                    await connection.rollback();
                    return res.status(400).json({
                        message: `Le montant de base pour la cantine mensuelle doit être de ${expectedAmount.toLocaleString('fr-FR')} FCFA`
                    });
                }

                // Vérifier que le montant final n'est pas négatif
                if (finalAmount < 0) {
                    await connection.rollback();
                    return res.status(400).json({
                        message: 'Le montant final après réduction ne peut pas être négatif'
                    });
                }

                // Vérifier si ce mois a déjà été payé
                const alreadyPaid = await isMonthPaid(student_id, month_number, year, isGarderieStudent ? 'garderie' : 'student');
                if (alreadyPaid) {
                    await connection.rollback();
                    return res.status(400).json({
                        message: `Le mois de ${getSchoolYearMonths(school_year).find(m => m.monthNumber === parseInt(month_number))?.month} ${year} a déjà été payé pour cet élève`
                    });
                }

                // Générer un numéro de reçu unique
                const receiptNumber = `CAN-${Date.now()}-${student_id}`;

                // Insérer le paiement
                const studentType = isGarderieStudent ? 'garderie' : 'student';
                const [paymentResult] = await connection.query(
                    `INSERT INTO cantine_payments 
                (student_id, student_type, amount, base_amount, reduction_amount, payment_method, month_number, year, notes, school_year, receipt_number, payment_date, paid) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1)`, [student_id, studentType, finalAmount, baseAmount, reductionAmount, payment_method, month_number, year, notes || '', school_year, receiptNumber]
                );

                // Vérifier que l'insertion a réussi et récupérer l'ID
                if (!paymentResult.insertId) {
                    await connection.rollback();
                    console.error('Erreur: ID de paiement non généré', paymentResult);
                    return res.status(500).json({ message: 'Erreur lors de la création du paiement - ID non généré' });
                }

                console.log('Paiement créé avec ID:', paymentResult.insertId);

                // Ajouter l'entrée dans l'historique
                try {
                    const studentName = `${student.first_name} ${student.last_name}`;
                    const foundMonth = getSchoolYearMonths(school_year).find(m => m.monthNumber === parseInt(month_number));
                    const monthName = foundMonth ? foundMonth.month : null;
                    const actionType = isGarderieStudent ? 'garderie' : 'cantine';
                    const actionDescription = `Paiement de cantine ${monthName} ${year} de ${amount} FCFA pour ${studentName}`;
                    await addHistoryEntry(req.user.id, actionType, actionDescription, amount, studentName);
                } catch (historyError) {
                    console.error('Erreur lors de l\'ajout dans l\'historique:', historyError);
                    // Ne pas faire échouer le paiement si l'historique échoue
                }

                // Calculer le total payé pour l'année
                const [paidRows] = await connection.query(
                    `SELECT SUM(amount) as total_paid FROM cantine_payments 
                 WHERE student_id = ? AND student_type = ? AND school_year = ? AND paid = 1`, [student_id, studentType, school_year]
                );

                const totalPaid = paidRows[0] && paidRows[0].total_paid ? Number(paidRows[0].total_paid) : 0;

                const receiptData = {
                    receipt_number: receiptNumber,
                    student_name: `${student.first_name} ${student.last_name}`,
                    student_code: student.registration_number || student.student_code,
                    class_name: classInfo[0][0].class_name || 'Non assigné',
                    level: isGarderieStudent ? 'Garderie' : classInfo[0][0].level,
                    amount: finalAmount,
                    base_amount: baseAmount,
                    reduction_amount: reductionAmount,
                    payment_method: payment_method,
                    payment_date: new Date().toLocaleDateString('fr-FR'),
                    school_year: school_year || '2024-2025',
                    month: getSchoolYearMonths(school_year).find(m => m.monthNumber === parseInt(month_number)) ? getSchoolYearMonths(school_year).find(m => m.monthNumber === parseInt(month_number)).month : null,
                    year: year,
                    total_paid: totalPaid,
                    notes: notes || ''
                };

                await connection.commit();

                // Répondre immédiatement avec les données du reçu
                res.status(201).json({
                    message: `Paiement de cantine pour ${getSchoolYearMonths(school_year).find(m => m.monthNumber === parseInt(month_number))?.month} ${year} effectué avec succès`,
                    receipt: receiptData
                });

                // Envoi d'un email au parent en arrière-plan (ne pas attendre)
                setImmediate(async() => {
                    try {
                        // Récupérer les infos parent
                        let parentInfo = {};
                        if (isGarderieStudent) {
                            parentInfo = {
                                parent_email: garderieCheck[0].parent_email,
                                parent_first_name: garderieCheck[0].parent_first_name,
                                parent_last_name: garderieCheck[0].parent_last_name
                            };
                        } else {
                            const [parentInfoRows] = await connection.query(
                                'SELECT parent_email, parent_first_name, parent_last_name FROM students WHERE id = ?', [student_id]
                            );
                            parentInfo = parentInfoRows[0] || {};
                        }

                        const foundMonth2 = getSchoolYearMonths(school_year).find(m => m.monthNumber === parseInt(month_number));
                        const monthName = foundMonth2 ? foundMonth2.month : null;
                        await emailService.sendParentCantinePaymentNotification({
                            parent_email: parentInfo.parent_email,
                            parent_first_name: parentInfo.parent_first_name,
                            parent_last_name: parentInfo.parent_last_name,
                            student_first_name: student.first_name,
                            student_last_name: student.last_name,
                            amount: finalAmount,
                            base_amount: baseAmount,
                            reduction_amount: reductionAmount,
                            date: new Date().toLocaleString('fr-FR'),
                            classe: isGarderieStudent ? 'Garderie' : (classInfo[0][0].class_name || 'Non assigné'),
                            trimester: `${monthName} ${year}`,
                            school_year: school_year || '2024-2025',
                            reste_a_payer: 0, // Système mensuel, pas de reste
                            level: isGarderieStudent ? 'Garderie' : classInfo[0][0].level
                        });
                    } catch (e) {
                        console.error('Erreur lors de l\'envoi de l\'email de paiement cantine au parent:', e);
                    }
                });

            } catch (error) {
                if (connection) await connection.rollback();
                console.error('Erreur lors du paiement de cantine:', error);
                res.status(500).json({ message: 'Erreur lors du paiement de cantine' });
            } finally {
                if (connection) connection.release();
            }
        },

        // Récupérer l'historique des paiements d'un élève
        getStudentPayments: async(req, res) => {
            let connection;
            try {
                connection = await pool.getConnection();

                const { student_id } = req.params;
                const { school_year } = req.query;

                // Vérifier si c'est un élève de garderie ou un élève normal
                const [garderieCheck] = await connection.query(
                    'SELECT id, child_first_name, child_last_name, unique_code FROM garderie_inscriptions WHERE id = ? AND school_year = ?', [student_id, school_year || '2024-2025']
                );

                if (garderieCheck.length > 0) {
                    // C'est un enfant de garderie
                    const query = `
                    SELECT 
                        cp.*,
                        gi.child_first_name as first_name,
                        gi.child_last_name as last_name,
                        gi.unique_code as registration_number,
                        gi.unique_code as student_code
                    FROM cantine_payments cp
                    JOIN garderie_inscriptions gi ON cp.student_id = gi.id
                    WHERE cp.student_id = ? AND cp.student_type = 'garderie' AND cp.school_year = ?
                    ORDER BY cp.payment_date DESC
                `;

                    const [payments] = await connection.query(query, [student_id, school_year || '2024-2025']);
                    res.json(payments);
                } else {
                    // C'est un élève normal
                    const query = `
                    SELECT 
                        cp.*,
                        s.first_name,
                        s.last_name,
                        s.registration_number,
                        s.student_code
                    FROM cantine_payments cp
                    JOIN students s ON cp.student_id = s.id
                    WHERE cp.student_id = ? AND cp.student_type = 'student' AND cp.school_year = ?
                    ORDER BY cp.payment_date DESC
                `;

                    const [payments] = await connection.query(query, [student_id, school_year || '2024-2025']);
                    res.json(payments);
                }
            } catch (error) {
                console.error('Erreur lors de la récupération des paiements:', error);
                res.status(500).json({ message: 'Erreur lors de la récupération des paiements' });
            } finally {
                if (connection) connection.release();
            }
        },

        // Récupérer tous les paiements de cantine
        getAllPayments: async(req, res) => {
            let connection;
            try {
                connection = await pool.getConnection();

                const { school_year } = req.query;

                const query = `
                SELECT 
                    cp.*,
                    CASE 
                        WHEN cp.student_type = 'student' THEN s.first_name
                        WHEN cp.student_type = 'garderie' THEN g.child_first_name
                    END as first_name,
                    CASE 
                        WHEN cp.student_type = 'student' THEN s.last_name
                        WHEN cp.student_type = 'garderie' THEN g.child_last_name
                    END as last_name,
                    CASE 
                        WHEN cp.student_type = 'student' THEN s.registration_number
                        WHEN cp.student_type = 'garderie' THEN g.unique_code
                    END as registration_number,
                    CASE 
                        WHEN cp.student_type = 'student' THEN s.student_code
                        WHEN cp.student_type = 'garderie' THEN g.unique_code
                    END as student_code,
                    CASE 
                        WHEN cp.student_type = 'student' THEN c.name
                        WHEN cp.student_type = 'garderie' THEN 'Garderie'
                    END as class_name
                FROM cantine_payments cp
                LEFT JOIN students s ON cp.student_id = s.id AND cp.student_type = 'student'
                LEFT JOIN garderie_inscriptions g ON cp.student_id = g.id AND cp.student_type = 'garderie'
                LEFT JOIN class_students cs ON s.id = cs.student_id AND cp.student_type = 'student'
                LEFT JOIN classes c ON cs.class_id = c.id AND cp.student_type = 'student'
                WHERE cp.school_year = ?
                ORDER BY cp.payment_date DESC
            `;

                const [payments] = await connection.query(query, [school_year || '2024-2025']);

                res.json(payments);
            } catch (error) {
                console.error('Erreur lors de la récupération des paiements:', error);
                res.status(500).json({ message: 'Erreur lors de la récupération des paiements' });
            } finally {
                if (connection) connection.release();
            }
        },

        // Nouvelle fonction pour obtenir les informations de paiement mensuel
        getMonthlyCantineInfo: async(req, res) => {
            try {
                const { student_id, school_year } = req.query;

                // Vérifier si c'est un élève de garderie
                const [garderieCheck] = await pool.query(
                    'SELECT id, child_first_name, child_last_name FROM garderie_inscriptions WHERE id = ? AND school_year = ?', [student_id, school_year || '2024-2025']
                );

                if (garderieCheck.length > 0) {
                    // C'est un enfant de garderie
                    const garderieChild = garderieCheck[0];

                    // Récupérer les paiements existants pour l'enfant de garderie
                    const [payments] = await pool.query(
                        `SELECT month_number, year, amount FROM cantine_payments 
                     WHERE student_id = ? AND student_type = 'garderie' AND school_year = ? AND paid = 1`, [student_id, school_year || '2024-2025']
                    );

                    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
                    const paymentCount = payments.length;

                    // Obtenir les mois de l'année scolaire
                    const schoolYearMonths = getSchoolYearMonths(school_year || '2024-2025');
                    const monthlyStatus = schoolYearMonths.map(month => {
                        const isPaid = payments.some(p => p.month_number === month.monthNumber && p.year === month.year);
                        return {
                            month: month.month,
                            monthNumber: month.monthNumber,
                            year: month.year,
                            amount: calculateMonthlyCantineAmount(null),
                            isPaid: isPaid,
                            paidAmount: isPaid ? calculateMonthlyCantineAmount(null) : 0
                        };
                    });

                    res.json({
                        level: 'Garderie',
                        totalExpected: 0, // Pas de montant fixe pour les enfants de garderie
                        totalPaid: totalPaid,
                        paymentCount: paymentCount,
                        monthlyStatus: monthlyStatus,
                        isGarderie: true,
                        studentName: `${garderieChild.child_first_name} ${garderieChild.child_last_name}`
                    });
                    return;
                }

                // Pour les élèves normaux, récupérer la classe
                const [classInfo] = await pool.query(
                    `SELECT el.name as level, c.education_level_id 
                 FROM enrollments e 
                 JOIN classes c ON e.class_id = c.id 
                 LEFT JOIN education_levels el ON c.education_level_id = el.id
                 WHERE e.student_id = ? AND e.status = 'active' AND e.school_year = ?`, [student_id, school_year || '2024-2025']
                );

                if (classInfo.length === 0) {
                    return res.status(404).json({ message: 'Élève non assigné à une classe' });
                }

                const level = classInfo[0].level;
                const educationLevelId = classInfo[0].education_level_id;

                // Récupérer les paiements existants
                const [payments] = await pool.query(
                    `SELECT month_number, year, amount FROM cantine_payments 
                 WHERE student_id = ? AND student_type = 'student' AND school_year = ? AND paid = 1`, [student_id, school_year || '2024-2025']
                );

                const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
                const paymentCount = payments.length;

                // Obtenir les mois de l'année scolaire
                const schoolYearMonths = getSchoolYearMonths(school_year || '2024-2025');
                const monthlyStatus = schoolYearMonths.map(month => {
                    const isPaid = payments.some(p => p.month_number === month.monthNumber && p.year === month.year);
                    return {
                        month: month.month,
                        monthNumber: month.monthNumber,
                        year: month.year,
                        amount: calculateMonthlyCantineAmount(educationLevelId),
                        isPaid: isPaid,
                        paidAmount: isPaid ? calculateMonthlyCantineAmount(educationLevelId) : 0
                    };
                });

                res.json({
                    level: level,
                    totalPaid: totalPaid,
                    paymentCount: paymentCount,
                    monthlyStatus: monthlyStatus,
                    isGarderie: false
                });

            } catch (error) {
                console.error('Erreur lors de la récupération des informations mensuelles:', error);
                res.status(500).json({ message: 'Erreur lors de la récupération des informations mensuelles' });
            }
        },

        // Nouvelle fonction pour récupérer les élèves de cantine avec statut mensuel
        getCantineStudents: async(req, res) => {
            try {
                const { school_year, month_number, year } = req.query;

                // Récupérer tous les élèves inscrits à la cantine (élèves + garderie)
                const [students] = await pool.query(`
                    SELECT 
                        s.id,
                        s.first_name,
                        s.last_name,
                        s.registration_number,
                        s.student_code,
                        s.gender,
                        s.parent_first_name,
                        s.parent_last_name,
                        s.parent_phone,
                        s.child_photo,
                        s.eats_at_cantine,
                        s.allergy,
                        c.name as class_name,
                        el.name as level,
                        c.education_level_id,
                        'student' as source_type,
                        CASE 
                            WHEN cp.id IS NOT NULL THEN 1 
                            ELSE 0 
                        END as cantine_paid,
                        COALESCE(cp.amount, 0) as total_paid_amount,
                        cp.payment_date as cantine_payment_date,
                        cp.month_number as cantine_month,
                        cp.year as cantine_year,
                        cp.base_amount,
                        cp.reduction_amount
                    FROM students s
                    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
                    LEFT JOIN classes c ON e.class_id = c.id
                    LEFT JOIN education_levels el ON c.education_level_id = el.id
                    LEFT JOIN cantine_payments cp ON s.id = cp.student_id 
                        AND cp.student_type = 'student' 
                        AND cp.school_year = ?
                        AND cp.month_number = ?
                        AND cp.year = ?
                        AND cp.paid = 1
                    WHERE s.cantine = 1 AND e.id IS NOT NULL
                    
                    UNION
                    
                    SELECT 
                        gi.id,
                        gi.child_first_name as first_name,
                        gi.child_last_name as last_name,
                        gi.unique_code as registration_number,
                        gi.unique_code as student_code,
                        gi.civility as gender,
                        gi.parent_first_name,
                        gi.parent_last_name,
                        gi.parent_phone,
                        gi.child_photo,
                        gi.eats_at_cantine,
                        gi.allergy,
                        'Garderie' as class_name,
                        'Garderie' as level,
                        NULL as education_level_id,
                        'garderie' as source_type,
                        CASE 
                            WHEN cp.id IS NOT NULL THEN 1 
                            ELSE 0 
                        END as cantine_paid,
                        COALESCE(cp.amount, 0) as total_paid_amount,
                        cp.payment_date as cantine_payment_date,
                        cp.month_number as cantine_month,
                        cp.year as cantine_year,
                        cp.base_amount,
                        cp.reduction_amount
                    FROM garderie_inscriptions gi
                    LEFT JOIN cantine_payments cp ON gi.id = cp.student_id 
                        AND cp.student_type = 'garderie' 
                        AND cp.school_year = ?
                        AND cp.month_number = ?
                        AND cp.year = ?
                        AND cp.paid = 1
                    WHERE gi.cantine = 1 AND gi.school_year = ?
                    
                    ORDER BY source_type, first_name, last_name
                `, [
                    school_year || '2024-2025',
                    school_year || '2024-2025',
                    month_number || new Date().getMonth() + 1,
                    year || new Date().getFullYear(),
                    school_year || '2024-2025',
                    month_number || new Date().getMonth() + 1,
                    year || new Date().getFullYear(),
                    school_year || '2024-2025'
                ]);

                res.json(students);
            } catch (error) {
                console.error('Erreur lors de la récupération des élèves de cantine:', error);
                res.status(500).json({ message: 'Erreur lors de la récupération des élèves de cantine' });
            }
        },

        // Nouvelle fonction pour obtenir les statistiques de la cantine
        getCantineStats: async(req, res) => {
            let connection;
            try {
                connection = await pool.getConnection();
                const { school_year } = req.query;

                // 1. Compter le total des élèves inscrits à la cantine (élèves + garderie)
                const [totalStudents] = await connection.query(
                    `SELECT 
                    (SELECT COUNT(*) FROM students WHERE cantine = 1) +
                    (SELECT COUNT(*) FROM garderie_inscriptions WHERE cantine = 1) as total`
                );

                // 2. Récupérer tous les élèves inscrits à la cantine avec leurs classes
                const [studentsWithClasses] = await connection.query(
                    `SELECT 
                    s.id,
                    s.first_name,
                    s.last_name,
                    s.registration_number,
                    el.name as level,
                    c.name as class_name,
                    'student' as source_type
                FROM students s
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                LEFT JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE s.cantine = 1
                
                UNION
                
                SELECT 
                    gi.id,
                    gi.child_first_name as first_name,
                    gi.child_last_name as last_name,
                    gi.unique_code as registration_number,
                    'Garderie' as level,
                    'Garderie' as class_name,
                    'garderie' as source_type
                FROM garderie_inscriptions gi
                WHERE gi.cantine = 1`
                );

                // 3. Récupérer tous les paiements de cantine pour l'année scolaire
                const [allPayments] = await connection.query(
                    `SELECT 
                    cp.student_id,
                    cp.student_type,
                    cp.amount,
                    cp.trimester,
                    cp.payment_date
                FROM cantine_payments cp
                WHERE cp.school_year = ?
                ORDER BY cp.student_id, cp.trimester`, [school_year || '2024-2025']
                );

                // 4. Calculer les statistiques par élève
                let totalPaid = 0;
                let fullyPaidStudents = 0;
                let partiallyPaidStudents = 0;
                let totalExpected = 0;

                // Récupérer les montants de cantine pour les enfants de garderie
                const [garderieAmounts] = await connection.query(`
                SELECT 
                    gi.id,
                    COALESCE(gi.cantine_amount, (gi.duration_days * COALESCE(gi.daily_cantine_rate, 25000))) as cantine_amount
                FROM garderie_inscriptions gi
                WHERE gi.cantine = 1
            `);

                studentsWithClasses.forEach(student => {
                    let studentExpected;

                    if (student.source_type === 'garderie') {
                        // Pour les enfants de garderie, pas de montant fixe - paiement flexible
                        studentExpected = 0;
                    } else {
                        // Pour les élèves normaux, utiliser la logique existante
                        const level = student.level || 'Maternelle';
                        studentExpected = calculateTotalCantineAmount(level);
                    }

                    totalExpected += studentExpected;

                    // Récupérer tous les paiements de cet élève
                    const studentPayments = allPayments.filter(p =>
                        p.student_id === student.id &&
                        p.student_type === student.source_type
                    );
                    const totalStudentPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
                    totalPaid += totalStudentPaid;

                    // Déterminer le statut de paiement de l'élève
                    if (student.source_type === 'garderie') {
                        // Pour les enfants de garderie, considérer comme payé si au moins un paiement a été fait
                        if (totalStudentPaid > 0) {
                            fullyPaidStudents++;
                        }
                    } else {
                        // Pour les élèves normaux, utiliser la logique existante
                        if (totalStudentPaid >= studentExpected) {
                            fullyPaidStudents++;
                        } else if (totalStudentPaid > 0) {
                            partiallyPaidStudents++;
                        }
                    }
                });

                const unpaidStudents = totalStudents[0].total - fullyPaidStudents - partiallyPaidStudents;

                res.json({
                    success: true,
                    stats: {
                        totalStudents: totalStudents[0].total,
                        fullyPaidStudents: fullyPaidStudents,
                        partiallyPaidStudents: partiallyPaidStudents,
                        unpaidStudents: unpaidStudents,
                        totalExpected: totalExpected,
                        totalPaid: totalPaid,
                        totalRemaining: totalExpected - totalPaid
                    }
                });

            } catch (error) {
                console.error('Erreur lors du calcul des statistiques de cantine:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors du calcul des statistiques de cantine',
                    error: error.message
                });
            } finally {
                if (connection) connection.release();
            }
        },

        // Fonction pour récupérer l'historique des reçus d'un élève
        getReceiptHistory: async(req, res) => {
            let connection;
            try {
                connection = await pool.getConnection();
                const { id } = req.params;
                const { school_year } = req.query;

                console.log('=== DÉBUT DE LA FONCTION getReceiptHistory ===');
                console.log('ID de l\'élève:', id);
                console.log('Année scolaire:', school_year);

                // Vérifier si c'est un élève de garderie ou un élève normal
                const [garderieCheck] = await connection.query(
                    'SELECT id, child_first_name, child_last_name, unique_code FROM garderie_inscriptions WHERE id = ? AND school_year = ?', [id, school_year || '2024-2025']
                );

                let receipts = [];

                if (garderieCheck.length > 0) {
                    // C'est un enfant de garderie
                    console.log('Élève de garderie détecté');

                    // Récupérer les paiements de cantine pour l'enfant de garderie
                    const [payments] = await connection.query(
                        `SELECT 
                        cp.id as payment_id,
                        cp.amount,
                        cp.payment_date,
                        cp.payment_method,
                        cp.receipt_number,
                        cp.notes,
                        cp.trimester,
                        'paiement' as type,
                        CONCAT('Paiement de cantine - ', cp.trimester, 'ère tranche') as description
                    FROM cantine_payments cp
                    WHERE cp.student_id = ? AND cp.student_type = 'garderie' AND cp.school_year = ?
                    ORDER BY cp.payment_date DESC`, [id, school_year || '2024-2025']
                    );

                    receipts = payments.map(payment => ({
                        type: payment.type,
                        date: payment.payment_date,
                        description: payment.description,
                        amount: payment.amount,
                        payment_id: payment.payment_id,
                        receipt_number: payment.receipt_number,
                        payment_method: payment.payment_method,
                        notes: payment.notes
                    }));
                } else {
                    // C'est un élève normal
                    console.log('Élève normal détecté');

                    // Récupérer les paiements de cantine pour l'élève normal
                    const [payments] = await connection.query(
                        `SELECT 
                        cp.id as payment_id,
                        cp.amount,
                        cp.payment_date,
                        cp.payment_method,
                        cp.receipt_number,
                        cp.notes,
                        cp.trimester,
                        'paiement' as type,
                        CONCAT('Paiement de cantine - ', cp.trimester, 'ère tranche') as description
                    FROM cantine_payments cp
                    WHERE cp.student_id = ? AND cp.student_type = 'student' AND cp.school_year = ?
                    ORDER BY cp.payment_date DESC`, [id, school_year || '2024-2025']
                    );

                    receipts = payments.map(payment => ({
                        type: payment.type,
                        date: payment.payment_date,
                        description: payment.description,
                        amount: payment.amount,
                        payment_id: payment.payment_id,
                        receipt_number: payment.receipt_number,
                        payment_method: payment.payment_method,
                        notes: payment.notes
                    }));
                }

                console.log('Nombre de reçus trouvés:', receipts.length);

                res.json({
                    success: true,
                    receipts: receipts
                });

            } catch (error) {
                console.error('Erreur lors de la récupération de l\'historique des reçus:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erreur lors de la récupération de l\'historique des reçus',
                    error: error.message
                });
            } finally {
                if (connection) connection.release();
            }
        },

        // Fonction pour générer le reçu de paiement
        getPaymentReceipt: async(req, res) => {
                let connection;
                try {
                    console.log('=== DÉBUT DE LA FONCTION getPaymentReceipt ===');
                    const { id, paymentId } = req.params;
                    const { school_year } = req.query;

                    console.log('ID de l\'élève:', id);
                    console.log('ID du paiement:', paymentId);
                    console.log('Année scolaire:', school_year);

                    connection = await pool.getConnection();

                    // Vérifier si c'est un élève de garderie ou un élève normal
                    const [garderieCheck] = await connection.query(
                        'SELECT id, child_first_name, child_last_name, unique_code FROM garderie_inscriptions WHERE id = ? AND school_year = ?', [id, school_year || '2024-2025']
                    );

                    let payment, studentInfo;

                    if (garderieCheck.length > 0) {
                        // C'est un enfant de garderie
                        console.log('Élève de garderie détecté');

                        // Récupérer les informations du paiement et de l'enfant
                        const [payments] = await connection.query(
                            `SELECT 
                        cp.*,
                        gi.child_first_name,
                        gi.child_last_name,
                        gi.unique_code,
                        gi.parent_first_name,
                        gi.parent_last_name,
                        gi.parent_phone,
                        gi.cantine_amount,
                        gi.duration_days,
                        gi.daily_cantine_rate
                    FROM cantine_payments cp
                    JOIN garderie_inscriptions gi ON cp.student_id = gi.id
                    WHERE cp.id = ? AND cp.student_id = ? AND cp.student_type = 'garderie' AND cp.school_year = ?`, [paymentId, id, school_year || '2024-2025']
                        );

                        if (payments.length === 0) {
                            await connection.release();
                            return res.status(404).json({
                                success: false,
                                message: 'Paiement non trouvé'
                            });
                        }

                        payment = payments[0];
                        studentInfo = {
                            first_name: payment.child_first_name,
                            last_name: payment.child_last_name,
                            registration_number: payment.unique_code,
                            class_name: 'Garderie',
                            level: 'Garderie'
                        };
                    } else {
                        // C'est un élève normal
                        console.log('Élève normal détecté');

                        // Récupérer les informations du paiement et de l'élève
                        const [payments] = await connection.query(
                            `SELECT 
                        cp.*,
                        s.first_name,
                        s.last_name,
                        s.registration_number,
                        s.parent_first_name,
                        s.parent_last_name,
                        s.parent_phone,
                        c.name as class_name,
                        el.name as level
                    FROM cantine_payments cp
                    JOIN students s ON cp.student_id = s.id
                    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                    LEFT JOIN classes c ON e.class_id = c.id
                    LEFT JOIN education_levels el ON c.education_level_id = el.id
                    WHERE cp.id = ? AND cp.student_id = ? AND cp.student_type = 'student' AND cp.school_year = ?`, [paymentId, id, school_year || '2024-2025']
                        );

                        if (payments.length === 0) {
                            await connection.release();
                            return res.status(404).json({
                                success: false,
                                message: 'Paiement non trouvé'
                            });
                        }

                        payment = payments[0];
                        studentInfo = {
                            first_name: payment.first_name,
                            last_name: payment.last_name,
                            registration_number: payment.registration_number,
                            class_name: payment.class_name || 'Non assigné',
                            level: payment.level || 'Maternelle'
                        };
                    }

                    // Calculer le total payé pour l'année
                    const [totalPaidRows] = await connection.query(
                        `SELECT SUM(amount) as total_paid FROM cantine_payments 
                 WHERE student_id = ? AND student_type = ? AND school_year = ?`, [id, garderieCheck.length > 0 ? 'garderie' : 'student', school_year || '2024-2025']
                    );

                    const totalPaid = totalPaidRows[0] && totalPaidRows[0].total_paid ? Number(totalPaidRows[0].total_paid) : 0;

                    // Générer le HTML du reçu
                    const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Reçu de Paiement Cantine</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .logo { width: 200px; height: 50px; margin-bottom: 10px; }
                        .title { color: #1976d2; font-size: 24px; font-weight: bold; margin: 10px 0; }
                        .subtitle { color: #1976d2; font-size: 18px; font-weight: 600; margin: 5px 0; }
                        .receipt { max-width: 800px; margin: 0 auto; }
                        .section { margin-bottom: 25px; }
                        .section-title { 
                            background: #1976d2; 
                            color: white; 
                            padding: 10px; 
                            font-weight: bold; 
                            margin-bottom: 15px;
                            border-radius: 5px;
                        }
                        .info-row { 
                            display: flex; 
                            justify-content: space-between; 
                            margin-bottom: 8px; 
                            padding: 5px 0;
                            border-bottom: 1px solid #eee;
                        }
                        .label { font-weight: bold; color: #333; }
                        .value { color: #666; }
                        .amount { font-weight: bold; color: #1976d2; font-size: 18px; }
                        .status { 
                            padding: 5px 10px; 
                            border-radius: 3px; 
                            font-weight: bold; 
                            font-size: 12px;
                        }
                        .status-paid { background: #4caf50; color: white; }
                        .status-unpaid { background: #ff9800; color: white; }
                        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">
                            <img src="http://localhost:3000/img/pages/vrailogo.jpg" alt="Logo École" style="width: 150px; height: 90px; object-fit: contain; margin-bottom: 10px;" />
                        </div>
                        <div class="title">GS BÉTHANIE MIRACLE</div>
                        <div style="margin-top: 10px; color: #666;">Cantine</div>
                    </div>

                    <div class="receipt">
                        <div class="section">
                            <div class="section-title">REÇU DE PAIEMENT CANTINE</div>
                            <div class="info-row">
                                <span class="label">Date:</span>
                                <span class="value">${new Date(payment.payment_date).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Numéro de reçu:</span>
                                <span class="value">${payment.receipt_number || '-'}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Tranche:</span>
                                <span class="value">${payment.trimester}ère tranche</span>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">INFORMATIONS DE L'ÉLÈVE</div>
                            <div class="info-row">
                                <span class="label">Nom:</span>
                                <span class="value">${studentInfo.first_name} ${studentInfo.last_name}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Matricule:</span>
                                <span class="value">${studentInfo.registration_number || '-'}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Classe:</span>
                                <span class="value">${studentInfo.class_name}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Catégorie:</span>
                                <span class="value">${studentInfo.level}</span>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">DÉTAILS DU PAIEMENT</div>
                            <div class="info-row">
                                <span class="label">Montant de ce versement:</span>
                                <span class="value amount">${Number(payment.amount).toLocaleString('fr-FR')} F CFA</span>
                            </div>
                            <div class="info-row">
                                <span class="label">Méthode de paiement:</span>
                                <span class="value">${payment.payment_method || 'Non spécifiée'}</span>
                            </div>
                            ${payment.notes ? `
                            <div class="info-row">
                                <span class="label">Notes:</span>
                                <span class="value">${payment.notes}</span>
                            </div>
                            ` : ''}
                            <div class="info-row">
                                <span class="label">Total payé (année):</span>
                                <span class="value">${totalPaid.toLocaleString('fr-FR')} F CFA</span>
                            </div>
                        </div>
                    </div>

                    <div class="footer">
                        <p>Ce document certifie le paiement effectué pour la cantine.</p>
                        <p>Merci de votre confiance.</p>
                    </div>
                </body>
                </html>
            `;

            await connection.release();

            res.json({
                success: true,
                html: html
            });

        } catch (error) {
            if (connection) await connection.release();
            console.error('Erreur lors de la génération du reçu de paiement:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la génération du reçu de paiement',
                error: error.message
            });
        }
    },

    // Fonction de compatibilité pour l'ancienne route getTrancheInfo
    getTrancheInfo: async(req, res) => {
        // Rediriger vers la nouvelle fonction getMonthlyCantineInfo
        return module.exports.getMonthlyCantineInfo(req, res);
    }
};