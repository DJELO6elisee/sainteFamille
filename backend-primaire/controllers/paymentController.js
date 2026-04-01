const pool = require('../config/database');
const axios = require('axios');
const apiUrl = "https://www.pay.moneyfusion.net/MON_Ecommerce/f8ebd53a28ac7ce0/pay/";
const { getCurrentSchoolYear } = require('../config/schoolYear');
const emailService = require('../services/emailService');
const { addHistoryEntry } = require('./historyController');
const { processIntelligentPayment } = require('./installmentController');

const paymentController = {
        // Obtenir tous les paiements
        getAllPayments: async(req, res) => {
            try {
                let query = `
                SELECT p.*, s.first_name, s.last_name, s.registration_number
                FROM payments p
                JOIN students s ON p.student_id = s.id
            `;
                const params = [];
                if (req.query.school_year) {
                    query += ' WHERE p.school_year = ?';
                    params.push(req.query.school_year);
                }
                query += ' ORDER BY p.payment_date DESC';
                const [payments] = await pool.query(query, params);
                res.json(payments);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },

        // Obtenir un paiement par ID
        getPaymentById: async(req, res) => {
            try {
                const [payment] = await pool.query(`
                SELECT p.*, s.first_name, s.last_name, s.registration_number
                FROM payments p
                JOIN students s ON p.student_id = s.id
                WHERE p.id = ?
            `, [req.params.id]);

                if (payment.length === 0) {
                    return res.status(404).json({ message: 'Paiement non trouvé' });
                }
                res.json(payment[0]);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },


        // Créer un nouveau paiement (utilise maintenant le système de versements intelligent)
        createPayment: async(req, res) => {
            console.log('=== DÉBUT PAIEMENT ===');
            console.log('Données reçues:', req.body);

            const { student_id, amount, monnaie_fusion_account, apply_discounts = true, school_year, description, status = 'completed' } = req.body;

            if (!student_id || !amount || Number(amount) <= 0) {
                return res.status(400).json({ message: 'Un ID élève et un montant valide sont requis.' });
            }

            let connection;
            try {
                const currentSchoolYear = getCurrentSchoolYear();
                const schoolYearToUse = school_year || currentSchoolYear;

                console.log('Student ID:', student_id);
                console.log('Amount:', amount);
                console.log('School Year:', schoolYearToUse);

                // Paiement en ligne via Monnaie Fusion
                if (monnaie_fusion_account) {
                    // Logique Monnaie Fusion (inchangée)
                    const [studentRows] = await pool.query('SELECT first_name, last_name FROM students WHERE id = ?', [student_id]);
                    if (!studentRows.length) {
                        return res.status(404).json({ message: 'Élève non trouvé.' });
                    }
                    const nomclient = `${studentRows[0].first_name} ${studentRows[0].last_name}`;

                    const paymentData = {
                        totalPrice: amount,
                        article: [{ scolarite: amount }],
                        numeroSend: monnaie_fusion_account,
                        nomclient,
                        personal_Info: [{ studentId: student_id }],
                        return_url: "https://lapetiteacademie.ci/student/payment-return"
                    };

                    let mfResponse;
                    try {
                        mfResponse = await axios.post(apiUrl, paymentData, {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    } catch (err) {
                        return res.status(500).json({ message: "Erreur lors de la connexion à Monnaie Fusion : " + ((err.response && err.response.data && err.response.data.message) || err.message) });
                    }
                    const mfData = mfResponse.data;
                    if (!mfData.statut || !mfData.token || !mfData.url) {
                        return res.status(400).json({ message: 'Paiement Monnaie Fusion non initié : ' + (mfData.message || 'Erreur inconnue') });
                    }

                    connection = await pool.getConnection();
                    await connection.beginTransaction();

                    await connection.query(
                        'INSERT INTO payments (student_id, amount, original_amount, payment_date, status, transaction_id, payment_method, school_year) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)', [student_id, amount, amount, 'pending', mfData.token, 'Monnaie Fusion', schoolYearToUse]
                    );

                    try {
                        const [studentInfo] = await connection.query('SELECT first_name, last_name FROM students WHERE id = ?', [student_id]);
                        const studentName = studentInfo[0] ? `${studentInfo[0].first_name} ${studentInfo[0].last_name}` : 'Élève inconnu';
                        await addHistoryEntry(req.user.id, 'paiement', `Paiement Monnaie Fusion de ${amount} FCFA pour ${studentName}`, amount, studentName);
                    } catch (historyError) {
                        console.error('Erreur lors de l\'ajout dans l\'historique:', historyError);
                    }

                    await connection.commit();

                    res.status(201).json({
                        message: 'Paiement initié via Monnaie Fusion',
                        fusion: {
                            url: mfData.url,
                            token: mfData.token,
                            statut: mfData.statut,
                            message: mfData.message
                        }
                    });
                } else {
                    // Paiement en présentiel - Utilise le système de paiement intelligent
                    connection = await pool.getConnection();
                    await connection.beginTransaction();

                    try {
                        const result = await processIntelligentPayment(
                            connection,
                            student_id,
                            Number(amount),
                            new Date(),
                            'cash',
                            schoolYearToUse,
                            description || 'Paiement de scolarité'
                        );

                        try {
                            const [studentInfo] = await connection.query('SELECT first_name, last_name FROM students WHERE id = ?', [student_id]);
                            const studentName = studentInfo[0] ? `${studentInfo[0].first_name} ${studentInfo[0].last_name}` : 'Élève inconnu';
                            await addHistoryEntry(req.user.id, 'paiement', `Paiement intelligent de ${amount} FCFA pour ${studentName}`, amount, studentName);
                        } catch (historyError) {
                            console.error('Erreur lors de l\'ajout dans l\'historique:', historyError);
                        }

                        await connection.commit();

                        // Récupérer les données complètes pour le reçu
                        const [receiptInfo] = await connection.query(`
                        SELECT 
                            s.first_name, s.last_name, s.registration_number, s.cantine,
                            c.name as classe,
                            el.tuition_amount as class_amount,
                            (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.student_id = s.id AND p.school_year = ? AND (p.status = 'completed' OR p.status = 'paid' OR p.status = 'bon')) as total_paid,
                            (SELECT COALESCE(SUM(
                                CASE 
                                    WHEN sd.percentage > 0 THEN (el.tuition_amount * sd.percentage / 100)
                                    ELSE sd.amount
                                END
                            ), 0) FROM student_discounts sd WHERE sd.student_id = s.id AND sd.is_active = TRUE AND sd.approved_by IS NOT NULL AND (sd.school_year IS NULL OR sd.school_year = ?)) as total_discount
                        FROM students s
                        LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
                        LEFT JOIN classes c ON e.class_id = c.id
                        LEFT JOIN education_levels el ON c.education_level_id = el.id
                        WHERE s.id = ?
                    `, [schoolYearToUse, schoolYearToUse, schoolYearToUse, student_id]);

                        const studentInfo = receiptInfo[0] || {};
                        const totalDue = studentInfo.class_amount || 0;
                        const totalPaid = studentInfo.total_paid || 0;
                        const totalDiscount = studentInfo.total_discount || 0;
                        const amountDueBefore = totalDue - totalDiscount - (totalPaid - Number(amount));
                        const remainingAmount = totalDue - totalDiscount - totalPaid;

                        res.status(201).json({
                            message: 'Paiement intelligent traité avec succès',
                            data: result,
                            receiptData: {
                                // Informations de l'élève
                                first_name: studentInfo.first_name,
                                last_name: studentInfo.last_name,
                                registration_number: studentInfo.registration_number,
                                classe: studentInfo.classe,
                                cantine: studentInfo.cantine,
                                // Informations financières
                                total_due: totalDue,
                                class_amount: totalDue,
                                total_discount: totalDiscount,
                                total_paid: totalPaid,
                                total_paid_before: totalPaid - Number(amount),
                                amount_due_before: amountDueBefore,
                                amount: Number(amount),
                                remaining_amount: remainingAmount,
                                school_year: schoolYearToUse
                            }
                        });

                    } catch (intelligentPaymentError) {
                        await connection.rollback();
                        console.error('Erreur paiement intelligent:', intelligentPaymentError);
                        res.status(500).json({
                            message: 'Erreur lors du paiement intelligent: ' + intelligentPaymentError.message
                        });
                    }
                }
            } catch (error) {
                if (connection) await connection.rollback();
                console.error('[ERROR PAYMENT] Exception attrapée:', error);
                res.status(500).json({ message: error.message });
            } finally {
                if (connection) connection.release();
            }
        },

        // Mettre à jour le statut d'un paiement
        updatePaymentStatus: async(req, res) => {
            const { status } = req.body;
            try {
                await pool.query(
                    'UPDATE payments SET status = ? WHERE id = ?', [status, req.params.id]
                );
                res.json({ message: 'Statut du paiement mis à jour avec succès' });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },


        // Obtenir les paiements d'un élève
        getStudentPayments: async(req, res) => {
            try {
                const [payments] = await pool.query(`
                SELECT * FROM payments 
                WHERE student_id = ? AND school_year = ?
                ORDER BY payment_date DESC
            `, [req.params.studentId, req.query.school_year || getCurrentSchoolYear()]);
                res.json(payments);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },

        // Obtenir les statistiques des paiements
        getPaymentStats: async(req, res) => {
            try {
                const [stats] = await pool.query(`
                SELECT 
                    COUNT(*) as total_payments,
                    SUM(amount) as total_amount,
                    AVG(amount) as average_amount
                FROM payments 
                WHERE school_year = ? AND status = 'completed'
            `, [req.query.school_year || getCurrentSchoolYear()]);
                res.json(stats[0]);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },

        // Obtenir les paiements en attente
        getPendingPayments: async(req, res) => {
            try {
                const [payments] = await pool.query(`
                SELECT p.*, s.first_name, s.last_name, s.registration_number
                FROM payments p
                JOIN students s ON p.student_id = s.id
                WHERE p.status = 'pending'
                ORDER BY p.payment_date DESC
            `);
                res.json(payments);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },

        // Générer un reçu de paiement
        generateReceipt: async(req, res) => {
                try {
                    const paymentId = req.params.id;

                    // Récupérer les informations du paiement avec les détails de l'élève
                    const [paymentData] = await pool.query(`
                SELECT 
                    p.*,
                    s.first_name, s.last_name, s.registration_number, s.date_of_birth, s.child_photo,
                    c.name as classe,
                    el.tuition_amount, el.registration_fee
                FROM payments p
                JOIN students s ON p.student_id = s.id
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = p.school_year
                LEFT JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE p.id = ?
            `, [paymentId]);

                    if (paymentData.length === 0) {
                        return res.status(404).json({ message: 'Paiement non trouvé' });
                    }

                    const payment = paymentData[0];

                    // Récupérer les informations de scolarité directement depuis les tables
                    console.log('[generateReceipt] Récupération des informations de scolarité...');
                    console.log('[generateReceipt] Student ID:', payment.student_id, 'School Year:', payment.school_year);

                    const [studentInfo] = await pool.query(`
                SELECT 
                    c.name as classe,
                    el.tuition_amount, 
                    el.registration_fee,
                    e.school_year
                FROM students s
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                LEFT JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE s.id = ? AND e.school_year = ?
            `, [payment.student_id, payment.school_year]);

                    let tuitionFee = 0;
                    let classe = 'Non assigné';

                    console.log('[generateReceipt] Résultat de la requête:', studentInfo.length, 'lignes trouvées');
                    if (studentInfo.length > 0) {
                        tuitionFee = Number(studentInfo[0].tuition_amount || 0);
                        classe = studentInfo[0].classe || 'Non assigné';
                        console.log('[generateReceipt] Informations récupérées:', {
                            tuitionFee,
                            classe,
                            school_year: studentInfo[0].school_year,
                            registration_fee: studentInfo[0].registration_fee
                        });
                    } else {
                        console.log('[generateReceipt] Aucune information trouvée pour l\'élève, tentative sans filtre d\'année...');

                        // Fallback : essayer sans le filtre d'année scolaire
                        const [fallbackInfo] = await pool.query(`
                    SELECT 
                        c.name as classe,
                        el.tuition_amount, 
                        el.registration_fee
                    FROM students s
                    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                    LEFT JOIN classes c ON e.class_id = c.id
                    LEFT JOIN education_levels el ON c.education_level_id = el.id
                    WHERE s.id = ?
                    ORDER BY e.enrollment_date DESC
                    LIMIT 1
                `, [payment.student_id]);

                        if (fallbackInfo.length > 0) {
                            tuitionFee = Number(fallbackInfo[0].tuition_amount || 0);
                            classe = fallbackInfo[0].classe || 'Non assigné';
                            console.log('[generateReceipt] Informations récupérées (fallback):', { tuitionFee, classe });
                        } else {
                            console.log('[generateReceipt] Aucune information trouvée même en fallback');
                        }
                    }

                    // Récupérer les réductions
                    const [discounts] = await pool.query(`
                SELECT SUM(
                    CASE 
                        WHEN sd.percentage > 0 THEN (el.tuition_amount * sd.percentage / 100)
                        ELSE sd.amount
                    END
                ) as total_discount
                FROM student_discounts sd
                JOIN students s ON sd.student_id = s.id
                JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
                JOIN classes c ON e.class_id = c.id
                JOIN education_levels el ON c.education_level_id = el.id
                WHERE sd.student_id = ? AND sd.is_active = TRUE AND sd.approved_by IS NOT NULL 
                AND (sd.school_year IS NULL OR sd.school_year = ?)
            `, [payment.school_year, payment.student_id, payment.school_year]);
                    const totalDiscount = discounts[0] ? discounts[0].total_discount || 0 : 0;

                    // Récupérer le total déjà payé
                    const [paidAmount] = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as total_paid
                FROM payments
                WHERE student_id = ? AND school_year = ? AND status = 'completed'
            `, [payment.student_id, payment.school_year]);
                    const totalPaid = Number(paidAmount[0].total_paid);

                    // Calculer le reste à payer
                    const totalDue = tuitionFee - totalDiscount;
                    const remainingAmount = totalDue - totalPaid;

                    console.log('[generateReceipt] Calculs finaux:', {
                        tuitionFee,
                        totalDiscount,
                        totalPaid,
                        totalDue,
                        remainingAmount,
                        paymentAmount: payment.amount
                    });

                    // Générer le HTML du reçu
                    const studentPhotoSection = `
                <div style="text-align:center; margin-bottom: 15px;">
                    ${payment.child_photo ? `
                    <img src="https://bethaniemiracle.com/api/students/photo/${encodeURIComponent(payment.child_photo)}" alt="Photo de ${payment.first_name} ${payment.last_name}" style="width:140px;height:140px;border-radius:50%;object-fit:cover;border:3px solid #1976d2;">
                    ` : `
                    <div style="width:140px;height:140px;border-radius:50%;background-color:#e0e0e0;border:3px solid #1976d2;display:inline-flex;align-items:center;justify-content:center;color:#999;font-size:12px;text-align:center;padding:10px;">
                        <span>Aucune photo</span>
                    </div>
                    `}
                </div>`;

            const receiptHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1976d2; margin: 0;">ÉCOLE "LA MAISON DES ENFANTS"</h1>
                        <h2 style="color: #1976d2; margin: 5px 0;">LA PETITE ACADÉMIE</h2>
                        <h3 style="color: #333; margin: 10px 0;">REÇU DE PAIEMENT DE SCOLARITÉ</h3>
                    </div>
                    
                    ${studentPhotoSection}
                    <div style="margin-bottom: 20px;">
                        <p><strong>Date:</strong> ${new Date(payment.payment_date).toLocaleString('fr-FR')}</p>
                        <p><strong>Matricule:</strong> ${payment.registration_number}</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #1976d2; border-bottom: 1px solid #1976d2; padding-bottom: 5px;">Informations de l'Élève</h4>
                        <p><strong>Nom:</strong> ${payment.last_name}</p>
                        <p><strong>Prénom:</strong> ${payment.first_name}</p>
                        <p><strong>Classe:</strong> ${classe}</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #1976d2; border-bottom: 1px solid #1976d2; padding-bottom: 5px;">Détails du Paiement</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Montant total de la scolarité:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${tuitionFee.toLocaleString('fr-FR')} F CFA</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Total des réductions:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${totalDiscount.toLocaleString('fr-FR')} F CFA</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Montant dû avant ce paiement:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;"><strong>${(totalDue - payment.amount).toLocaleString('fr-FR')} F CFA</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Montant de ce versement:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;"><strong>${Number(payment.amount).toLocaleString('fr-FR')} F CFA</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Total déjà versé (ce paiement inclus):</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${totalPaid.toLocaleString('fr-FR')} F CFA</td>
                            </tr>
                            <tr style="background-color: ${remainingAmount > 0 ? '#ffebee' : '#e8f5e8'};">
                                <td style="padding: 5px; border-bottom: 1px solid #eee;"><strong>Reste à payer:</strong></td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;"><strong>${remainingAmount.toLocaleString('fr-FR')} F CFA</strong></td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; font-style: italic; color: #666;">
                        <p>Statut: ${remainingAmount > 0 ? 'Non soldé' : 'Soldé'}</p>
                        <p>Le secrétariat</p>
                    </div>
                </div>
            `;

            res.json({ html: receiptHtml });
        } catch (error) {
            console.error('Erreur lors de la génération du reçu:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Vérifier le statut d'un paiement Monnaie Fusion
    checkPaymentStatus: async(req, res) => {
        try {
            const { token } = req.params;

            // Appeler l'API Monnaie Fusion pour vérifier le statut
            const response = await axios.get(`${apiUrl}status/${token}`);
            const statusData = response.data;

            if (statusData.statut === 'success') {
                // Mettre à jour le statut du paiement dans la base de données
                await pool.query(
                    'UPDATE payments SET status = ? WHERE transaction_id = ?', ['completed', token]
                );

                res.json({
                    status: 'success',
                    message: 'Paiement confirmé avec succès',
                    data: statusData
                });
            } else {
                res.json({
                    status: statusData.statut,
                    message: statusData.message || 'Paiement en attente',
                    data: statusData
                });
            }
        } catch (error) {
            console.error('Erreur lors de la vérification du statut:', error);
            return res.status(500).json({ message: (error.response && error.response.data && error.response.data.message) || error.message });
        }
    },

    // Webhook pour notifications Monnaie Fusion
    handleWebhook: async(req, res) => {
        try {
            const { token, statut, message } = req.body;

            if (statut === 'success') {
                await pool.query(
                    'UPDATE payments SET status = ? WHERE transaction_id = ?', ['completed', token]
                );
            } else if (statut === 'failed') {
                await pool.query(
                    'UPDATE payments SET status = ? WHERE transaction_id = ?', ['failed', token]
                );
            }

            res.json({ message: 'Webhook traité avec succès' });
        } catch (error) {
            console.error('Erreur lors du traitement du webhook:', error);
            res.status(500).json({ message: err.message });
        }
    },

    // Initier un paiement Monnaie Fusion (sans demander de compte)
    initiatePayment: async(req, res) => {
        try {
            const { student_id, amount } = req.body;

            // Récupérer les infos de l'élève
            const [studentRows] = await pool.query('SELECT first_name, last_name FROM students WHERE id = ?', [student_id]);
            if (!studentRows.length) {
                return res.status(404).json({ message: 'Élève non trouvé.' });
            }

            const nomclient = `${studentRows[0].first_name} ${studentRows[0].last_name}`;

            const paymentData = {
                totalPrice: amount,
                article: [{ scolarite: amount }],
                nomclient,
                personal_Info: [{ studentId: student_id }],
                return_url: "https://lapetiteacademie.ci/student/payment-return"
            };

            const response = await axios.post(apiUrl, paymentData, {
                headers: { 'Content-Type': 'application/json' }
            });

            const mfData = response.data;
            if (!mfData.statut || !mfData.token || !mfData.url) {
                return res.status(400).json({ message: 'Paiement non initié : ' + (mfData.message || 'Erreur inconnue') });
            }

            res.json({
                message: 'Paiement initié avec succès',
                fusion: {
                    url: mfData.url,
                    token: mfData.token,
                    statut: mfData.statut,
                    message: mfData.message
                }
            });
        } catch (error) {
            console.error('Erreur lors de l\'initiation du paiement:', error);
            res.status(500).json({ message: "Erreur lors de la connexion à Monnaie Fusion : " + error.message });
        }
    },

    // Obtenir les résumés financiers
    getFinancialSummary: async(req, res) => {
        try {
            const currentSchoolYear = getCurrentSchoolYear();

            // Résumé des paiements
            const [totalPaidResult] = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as total_paid
                FROM payments
                WHERE school_year = ? AND status = 'completed'
            `, [currentSchoolYear]);

            const [totalDueResult] = await pool.query(`
                SELECT COALESCE(SUM(el.tuition_amount), 0) as total_due
                FROM enrollments e
                JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE e.school_year = ? AND e.status = 'active'
            `, [currentSchoolYear]);

            const [totalDiscountsResult] = await pool.query(`
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN sd.percentage > 0 THEN (el.tuition_amount * sd.percentage / 100)
                        ELSE sd.amount
                    END
                ), 0) as total_discounts
                FROM student_discounts sd
                JOIN students s ON sd.student_id = s.id
                JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
                JOIN classes c ON e.class_id = c.id
                JOIN education_levels el ON c.education_level_id = el.id
                WHERE sd.is_active = TRUE AND sd.approved_by IS NOT NULL 
                AND (sd.school_year IS NULL OR sd.school_year = ?)
            `, [currentSchoolYear, currentSchoolYear]);

            // Paiements par mois (3 derniers mois) - Requête améliorée
            const [monthlyPayments] = await pool.query(`
                SELECT 
                    DATE_FORMAT(payment_date, '%Y-%m') as month,
                    YEAR(payment_date) as year,
                    MONTH(payment_date) as month_number,
                    CASE 
                        WHEN MONTH(payment_date) = 1 THEN 'Janvier'
                        WHEN MONTH(payment_date) = 2 THEN 'Février'
                        WHEN MONTH(payment_date) = 3 THEN 'Mars'
                        WHEN MONTH(payment_date) = 4 THEN 'Avril'
                        WHEN MONTH(payment_date) = 5 THEN 'Mai'
                        WHEN MONTH(payment_date) = 6 THEN 'Juin'
                        WHEN MONTH(payment_date) = 7 THEN 'Juillet'
                        WHEN MONTH(payment_date) = 8 THEN 'Août'
                        WHEN MONTH(payment_date) = 9 THEN 'Septembre'
                        WHEN MONTH(payment_date) = 10 THEN 'Octobre'
                        WHEN MONTH(payment_date) = 11 THEN 'Novembre'
                        WHEN MONTH(payment_date) = 12 THEN 'Décembre'
                        ELSE 'Inconnu'
                    END as month_name,
                    COALESCE(SUM(amount), 0) as amount,
                    COUNT(*) as payment_count
                FROM payments
                WHERE school_year = ? AND status = 'completed'
                AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
                GROUP BY YEAR(payment_date), MONTH(payment_date)
                ORDER BY year DESC, month_number DESC
                LIMIT 3
            `, [currentSchoolYear]);

            console.log('[getFinancialSummary] Paiements mensuels bruts:', monthlyPayments);

            // Formatage des données des 3 derniers mois
            const formattedMonthlyPayments = monthlyPayments.map(month => ({
                year: month.year,
                month: month.month_number,
                month_name: month.month_name,
                amount: Number(month.amount || 0)
            }));

            // Ajouter le paiement du mois en cours
            const [currentMonthPayments] = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as current_month_paid
                FROM payments
                WHERE school_year = ? AND status = 'completed'
                AND YEAR(payment_date) = YEAR(NOW())
                AND MONTH(payment_date) = MONTH(NOW())
            `, [currentSchoolYear]);

            const summary = {
                total_paid: totalPaidResult[0].total_paid,
                total_due: totalDueResult[0].total_due,
                total_discounts: totalDiscountsResult[0].total_discounts,
                remaining_balance: totalDueResult[0].total_due - totalDiscountsResult[0].total_discounts - totalPaidResult[0].total_paid,
                current_month_paid: currentMonthPayments[0].current_month_paid,
                last_three_months: formattedMonthlyPayments,
                school_year: currentSchoolYear
            };

            console.log('=== [DEBUG] Résumé financier ===');
            console.log('Total payé:', summary.total_paid);
            console.log('Total dû:', summary.total_due);
            console.log('Total réductions:', summary.total_discounts);
            console.log('Solde restant:', summary.remaining_balance);
            console.log('Paiements du mois en cours:', summary.current_month_paid);
            console.log('3 derniers mois (formatés):', summary.last_three_months);
            console.log('3 derniers mois (bruts):', monthlyPayments);
            console.log('Année scolaire:', currentSchoolYear);

            res.json(summary);
        } catch (error) {
            console.error('Erreur lors du calcul du résumé financier:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Générer un reçu d'inscription
    getInscriptionReceipt: async(req, res) => {
        try {
            const { id } = req.params;
            const { enrollment_date } = req.query;

            console.log('[getInscriptionReceipt] Appelé avec student_id:', id, 'enrollment_date:', enrollment_date);

            if (!id) {
                return res.status(400).json({ message: 'ID élève requis' });
            }

            // Formater la date pour la requête
            let formattedDate = null;
            if (enrollment_date) {
                const date = new Date(enrollment_date);
                formattedDate = date.toISOString().split('T')[0];
                console.log('[getInscriptionReceipt] Date formatée:', formattedDate);

                const localDate = date.toLocaleDateString('fr-FR');
                console.log('[getInscriptionReceipt] Date locale:', localDate);
            }

            // Récupérer les informations d'inscription
            let inscriptionData;
            if (formattedDate) {
                console.log('[getInscriptionReceipt] Exécution de la requête SQL...');
                [inscriptionData] = await pool.query(`
                    SELECT 
                        s.*,
                        c.name as classe,
                        el.tuition_amount, el.registration_fee,
                        e.enrollment_date,
                        e.status as enrollment_status,
                        COALESCE(el.tuition_amount, 0) as class_amount,
                        COALESCE(SUM(
                            CASE 
                                WHEN sd.percentage > 0 THEN (el.tuition_amount * sd.percentage / 100)
                                ELSE sd.amount
                            END
                        ), 0) as total_discount,
                        COALESCE(SUM(p.amount), 0) as total_paid
                    FROM students s
                    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                    LEFT JOIN classes c ON e.class_id = c.id
                    LEFT JOIN education_levels el ON c.education_level_id = el.id
                    LEFT JOIN student_discounts sd ON s.id = sd.student_id AND sd.is_active = TRUE AND sd.approved_by IS NOT NULL AND (sd.school_year IS NULL OR sd.school_year = e.school_year)
                    LEFT JOIN payments p ON s.id = p.student_id AND p.school_year = e.school_year AND p.status = 'completed'
                    WHERE s.id = ? AND DATE(e.enrollment_date) = ?
                    GROUP BY s.id, e.id
                `, [id, formattedDate]);

                console.log('[getInscriptionReceipt] Résultat de la requête:', inscriptionData.length, 'lignes trouvées');
                if (inscriptionData.length > 0) {
                    console.log('[getInscriptionReceipt] Données récupérées:', inscriptionData[0]);
                    console.log('[getInscriptionReceipt] Montant calculé (class_amount):', inscriptionData[0].class_amount);
                } else {
                    console.log('[getInscriptionReceipt] Aucune inscription trouvée avec la date exacte, recherche de la première inscription...');

                    // Fallback : récupérer la première inscription de l'élève
                    [inscriptionData] = await pool.query(`
                        SELECT 
                            s.*,
                            c.name as classe,
                            el.tuition_amount, el.registration_fee,
                            e.enrollment_date,
                            e.status as enrollment_status,
                            COALESCE(el.tuition_amount, 0) as class_amount,
                            COALESCE(SUM(
                            CASE 
                                WHEN sd.percentage > 0 THEN (el.tuition_amount * sd.percentage / 100)
                                ELSE sd.amount
                            END
                        ), 0) as total_discount,
                            COALESCE(SUM(p.amount), 0) as total_paid
                        FROM students s
                        LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                        LEFT JOIN classes c ON e.class_id = c.id
                        LEFT JOIN education_levels el ON c.education_level_id = el.id
                        LEFT JOIN student_discounts sd ON s.id = sd.student_id AND sd.is_active = TRUE AND sd.approved_by IS NOT NULL AND (sd.school_year IS NULL OR sd.school_year = e.school_year)
                        LEFT JOIN payments p ON s.id = p.student_id AND p.school_year = e.school_year AND p.status = 'completed'
                        WHERE s.id = ?
                        GROUP BY s.id, e.id
                        ORDER BY e.enrollment_date ASC
                        LIMIT 1
                    `, [id]);

                    console.log('[getInscriptionReceipt] Résultat de la requête de fallback:', inscriptionData.length, 'lignes trouvées');
                }
            } else {
                // Récupérer la première inscription de l'élève
                [inscriptionData] = await pool.query(`
                    SELECT 
                        s.*,
                        c.name as classe,
                        el.tuition_amount, el.registration_fee,
                        e.enrollment_date,
                        e.status as enrollment_status,
                        COALESCE(el.tuition_amount, 0) as class_amount,
                        COALESCE(SUM(
                            CASE 
                                WHEN sd.percentage > 0 THEN (el.tuition_amount * sd.percentage / 100)
                                ELSE sd.amount
                            END
                        ), 0) as total_discount,
                        COALESCE(SUM(p.amount), 0) as total_paid
                    FROM students s
                    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                    LEFT JOIN classes c ON e.class_id = c.id
                    LEFT JOIN education_levels el ON c.education_level_id = el.id
                    LEFT JOIN student_discounts sd ON s.id = sd.student_id AND sd.is_active = TRUE AND sd.approved_by IS NOT NULL AND (sd.school_year IS NULL OR sd.school_year = e.school_year)
                    LEFT JOIN payments p ON s.id = p.student_id AND p.school_year = e.school_year AND p.status = 'completed'
                    WHERE s.id = ?
                    GROUP BY s.id, e.id
                    ORDER BY e.enrollment_date ASC
                    LIMIT 1
                `, [id]);
            }

            if (inscriptionData.length === 0) {
                return res.status(404).json({ message: 'Inscription non trouvée' });
            }

            const inscription = inscriptionData[0];

            // Récupérer les informations de scolarité directement depuis les tables
            console.log('[getInscriptionReceipt] Récupération des informations de scolarité...');
            let tuitionAmount = Number(inscription.class_amount || inscription.tuition_amount || 0);

            if (tuitionAmount === 0) {
                console.log('[getInscriptionReceipt] Montant de scolarité manquant, récupération directe...');
                const [levelInfo] = await pool.query(`
                    SELECT el.tuition_amount
                    FROM students s
                    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                    LEFT JOIN classes c ON e.class_id = c.id
                    LEFT JOIN education_levels el ON c.education_level_id = el.id
                    WHERE s.id = ?
                `, [id]);

                if (levelInfo.length > 0) {
                    tuitionAmount = Number(levelInfo[0].tuition_amount || 0);
                    console.log('[getInscriptionReceipt] Montant récupéré:', tuitionAmount);
                } else {
                    console.log('[getInscriptionReceipt] Aucune information trouvée pour l\'élève');
                }
            } else {
                console.log('[getInscriptionReceipt] Montant trouvé dans la requête principale:', tuitionAmount);
            }

            const totalDue = tuitionAmount - Number(inscription.total_discount);
            const remainingAmount = totalDue - Number(inscription.total_paid);

            // Générer le HTML du reçu d'inscription
            const receiptHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1976d2; margin: 0;">ÉCOLE "LA MAISON DES ENFANTS"</h1>
                        <h2 style="color: #1976d2; margin: 5px 0;">LA PETITE ACADÉMIE</h2>
                        <h3 style="color: #333; margin: 10px 0;">REÇU D'INSCRIPTION</h3>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <p><strong>Date d'inscription:</strong> ${new Date(inscription.enrollment_date).toLocaleDateString('fr-FR')}</p>
                        <p><strong>Matricule:</strong> ${inscription.registration_number}</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #1976d2; border-bottom: 1px solid #1976d2; padding-bottom: 5px;">Informations de l'Élève</h4>
                        <p><strong>Nom:</strong> ${inscription.last_name}</p>
                        <p><strong>Prénom:</strong> ${inscription.first_name}</p>
                        <p><strong>Date de naissance:</strong> ${new Date(inscription.date_of_birth).toLocaleDateString('fr-FR')}</p>
                        <p><strong>Classe:</strong> ${inscription.classe || 'Non assigné'}</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #1976d2; border-bottom: 1px solid #1976d2; padding-bottom: 5px;">Détails Financiers</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Montant total de la scolarité:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${tuitionAmount.toLocaleString('fr-FR')} F CFA</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Total des réductions:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${Number(inscription.total_discount).toLocaleString('fr-FR')} F CFA</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Montant total dû:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;"><strong>${totalDue.toLocaleString('fr-FR')} F CFA</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Total déjà versé:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${Number(inscription.total_paid).toLocaleString('fr-FR')} F CFA</td>
                            </tr>
                            <tr style="background-color: ${remainingAmount > 0 ? '#ffebee' : '#e8f5e8'};">
                                <td style="padding: 5px; border-bottom: 1px solid #eee;"><strong>Reste à payer:</strong></td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;"><strong>${remainingAmount.toLocaleString('fr-FR')} F CFA</strong></td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; font-style: italic; color: #666;">
                        <p>Statut: ${remainingAmount > 0 ? 'Non soldé' : 'Soldé'}</p>
                        <p>Le secrétariat</p>
                    </div>
                </div>
            `;

            res.json({ html: receiptHtml });
        } catch (error) {
            console.error('[getInscriptionReceipt] ERREUR:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Générer un reçu de paiement spécifique
    getPaymentReceipt: async(req, res) => {
        try {
            const { id, paymentId } = req.params;

            console.log('[getPaymentReceipt] Appelé avec student_id:', id, 'payment_id:', paymentId);

            if (!id || !paymentId) {
                console.error('[getPaymentReceipt] Paramètres manquants:', { id, paymentId });
                return res.status(400).json({ message: 'ID élève et ID paiement requis' });
            }

            // Récupérer les informations du paiement avec les détails de l'élève
            console.log('[getPaymentReceipt] Exécution de la requête SQL...');
            const [paymentData] = await pool.query(`
                SELECT 
                    p.*,
                    s.first_name, s.last_name, s.registration_number, s.date_of_birth, s.child_photo,
                    c.name as classe,
                    el.tuition_amount, el.registration_fee,
                    COALESCE(SUM(
                        CASE 
                            WHEN sd.percentage > 0 THEN (el.tuition_amount * sd.percentage / 100)
                            ELSE sd.amount
                        END
                    ), 0) as total_discount
                FROM payments p
                JOIN students s ON p.student_id = s.id
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = p.school_year
                LEFT JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                LEFT JOIN student_discounts sd ON s.id = sd.student_id AND sd.is_active = TRUE AND sd.approved_by IS NOT NULL AND (sd.school_year IS NULL OR sd.school_year = p.school_year)
                WHERE p.id = ? AND p.student_id = ?
                GROUP BY p.id, s.id, e.id, c.id, el.id
            `, [paymentId, id]);

            console.log('[getPaymentReceipt] Résultat de la requête:', paymentData.length, 'lignes trouvées');
            if (paymentData.length > 0) {
                console.log('[getPaymentReceipt] Données récupérées:', paymentData[0]);
                console.log('[getPaymentReceipt] Montant calculé (tuition_amount):', paymentData[0].tuition_amount);
            }

            if (paymentData.length === 0) {
                return res.status(404).json({ message: 'Paiement non trouvé' });
            }

            const payment = paymentData[0];

            // Récupérer les informations de scolarité directement depuis les tables
            console.log('[getPaymentReceipt] Récupération des informations de scolarité...');
            console.log('[getPaymentReceipt] Student ID:', payment.student_id, 'School Year:', payment.school_year);

            const [studentInfo] = await pool.query(`
                SELECT 
                    c.name as classe,
                    el.tuition_amount, 
                    el.registration_fee,
                    e.school_year
                FROM students s
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                LEFT JOIN classes c ON e.class_id = c.id
                LEFT JOIN education_levels el ON c.education_level_id = el.id
                WHERE s.id = ? AND e.school_year = ?
            `, [payment.student_id, payment.school_year]);

            let tuitionFee = 0;
            let classe = 'Non assigné';

            console.log('[getPaymentReceipt] Résultat de la requête:', studentInfo.length, 'lignes trouvées');
            if (studentInfo.length > 0) {
                tuitionFee = Number(studentInfo[0].tuition_amount || 0);
                classe = studentInfo[0].classe || 'Non assigné';
                console.log('[getPaymentReceipt] Informations récupérées:', {
                    tuitionFee,
                    classe,
                    school_year: studentInfo[0].school_year,
                    registration_fee: studentInfo[0].registration_fee
                });
            } else {
                console.log('[getPaymentReceipt] Aucune information trouvée pour l\'élève, tentative sans filtre d\'année...');

                // Fallback : essayer sans le filtre d'année scolaire
                const [fallbackInfo] = await pool.query(`
                    SELECT 
                        c.name as classe,
                        el.tuition_amount, 
                        el.registration_fee
                    FROM students s
                    LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                    LEFT JOIN classes c ON e.class_id = c.id
                    LEFT JOIN education_levels el ON c.education_level_id = el.id
                    WHERE s.id = ?
                    ORDER BY e.enrollment_date DESC
                    LIMIT 1
                `, [payment.student_id]);

                if (fallbackInfo.length > 0) {
                    tuitionFee = Number(fallbackInfo[0].tuition_amount || 0);
                    classe = fallbackInfo[0].classe || 'Non assigné';
                    console.log('[getPaymentReceipt] Informations récupérées (fallback):', { tuitionFee, classe });
                } else {
                    console.log('[getPaymentReceipt] Aucune information trouvée même en fallback');
                }
            }

            // Calculer les montants
            const totalDiscount = Number(payment.total_discount || 0);
            const totalDue = tuitionFee - totalDiscount;

            // Récupérer le total déjà payé (avant ce paiement)
            console.log('[getPaymentReceipt] Calcul du total des paiements...');
            const [paidAmount] = await pool.query(`
                SELECT COALESCE(SUM(amount), 0) as total_paid
                FROM payments
                WHERE student_id = ? AND school_year = ? AND status = 'completed' AND id <= ?
            `, [payment.student_id, payment.school_year, paymentId]);
            const totalPaid = Number(paidAmount[0].total_paid);

            // Calculer le montant dû avant ce paiement
            const amountDueBefore = totalDue - (totalPaid - Number(payment.amount));
            const remainingAmount = totalDue - totalPaid;

            console.log('[getPaymentReceipt] Calculs:', {
                tuitionFee,
                totalDiscount,
                totalDue,
                totalPaid,
                amountDueBefore,
                remainingAmount
            });

            // Générer le HTML du reçu
            const studentPhotoSection = `
                <div style="text-align:center; margin-bottom: 15px;">
                    ${payment.child_photo ? `
                    <img src="https://bethaniemiracle.com/api/students/photo/${encodeURIComponent(payment.child_photo)}" alt="Photo de ${payment.first_name} ${payment.last_name}" style="width:140px;height:140px;border-radius:50%;object-fit:cover;border:3px solid #1976d2;">
                    ` : `
                    <div style="width:140px;height:140px;border-radius:50%;background-color:#e0e0e0;border:3px solid #1976d2;display:inline-flex;align-items:center;justify-content:center;color:#999;font-size:12px;text-align:center;padding:10px;">
                        <span>Aucune photo</span>
                    </div>
                    `}
                </div>`;

            const receiptHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1976d2; margin: 0;">ÉCOLE "LA MAISON DES ENFANTS"</h1>
                        <h2 style="color: #1976d2; margin: 5px 0;">LA PETITE ACADÉMIE</h2>
                        <h3 style="color: #333; margin: 10px 0;">REÇU DE PAIEMENT DE SCOLARITÉ</h3>
                    </div>
                    
                    ${studentPhotoSection}
                    <div style="margin-bottom: 20px;">
                        <p><strong>Date:</strong> ${new Date(payment.payment_date).toLocaleString('fr-FR')}</p>
                        <p><strong>Matricule:</strong> ${payment.registration_number}</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #1976d2; border-bottom: 1px solid #1976d2; padding-bottom: 5px;">Informations de l'Élève</h4>
                        <p><strong>Nom:</strong> ${payment.last_name}</p>
                        <p><strong>Prénom:</strong> ${payment.first_name}</p>
                        <p><strong>Classe:</strong> ${classe}</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: #1976d2; border-bottom: 1px solid #1976d2; padding-bottom: 5px;">Détails du Paiement</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Montant total de la scolarité:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${tuitionFee.toLocaleString('fr-FR')} F CFA</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Total des réductions:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${totalDiscount.toLocaleString('fr-FR')} F CFA</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Montant dû avant ce paiement:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;"><strong>${amountDueBefore.toLocaleString('fr-FR')} F CFA</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Montant de ce versement:</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;"><strong>${Number(payment.amount).toLocaleString('fr-FR')} F CFA</strong></td>
                            </tr>
                            <tr>
                                <td style="padding: 5px; border-bottom: 1px solid #eee;">Total déjà versé (ce paiement inclus):</td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">${totalPaid.toLocaleString('fr-FR')} F CFA</td>
                            </tr>
                            <tr style="background-color: ${remainingAmount > 0 ? '#ffebee' : '#e8f5e8'};">
                                <td style="padding: 5px; border-bottom: 1px solid #eee;"><strong>Reste à payer:</strong></td>
                                <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;"><strong>${remainingAmount.toLocaleString('fr-FR')} F CFA</strong></td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; font-style: italic; color: #666;">
                        <p>Statut: ${remainingAmount > 0 ? 'Non soldé' : 'Soldé'}</p>
                        <p>Le secrétariat</p>
                    </div>
                </div>
            `;

            res.json({ html: receiptHtml });
        } catch (error) {
            console.error('[getPaymentReceipt] ERREUR:', error);
            console.error('[getPaymentReceipt] Stack trace:', error.stack);
            res.status(500).json({ message: error.message });
        }
    },

    // Nouvelle méthode : États financiers par période
    getDailyFinancialStates: async(req, res) => {
        try {
            const { school_year } = req.query;
            const currentSchoolYear = school_year || getCurrentSchoolYear();

            console.log('[getDailyFinancialStates] Année scolaire:', currentSchoolYear);

            // Aujourd'hui
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // 2 derniers jours
            const twoDaysAgo = new Date(today);
            twoDaysAgo.setDate(today.getDate() - 1);
            const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

            // 3 derniers jours
            const threeDaysAgo = new Date(today);
            threeDaysAgo.setDate(today.getDate() - 2);
            const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

            // Début de la semaine (lundi)
            const startOfWeek = new Date(today);
            const dayOfWeek = today.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            startOfWeek.setDate(today.getDate() - daysToMonday);
            const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

            // Requêtes pour chaque période
            const queries = {
                today: `
                    SELECT 
                        COALESCE(SUM(amount), 0) as total_amount,
                        COUNT(*) as payment_count,
                        DATE(payment_date) as period_date
                    FROM payments 
                    WHERE DATE(payment_date) = ? 
                    AND school_year = ?
                    AND status = 'completed'
                `,
                lastTwoDays: `
                    SELECT 
                        COALESCE(SUM(amount), 0) as total_amount,
                        COUNT(*) as payment_count,
                        DATE(payment_date) as period_date
                    FROM payments 
                    WHERE DATE(payment_date) >= ? 
                    AND DATE(payment_date) <= ?
                    AND school_year = ?
                    AND status = 'completed'
                    GROUP BY DATE(payment_date)
                    ORDER BY period_date DESC
                `,
                lastThreeDays: `
                    SELECT 
                        COALESCE(SUM(amount), 0) as total_amount,
                        COUNT(*) as payment_count,
                        DATE(payment_date) as period_date
                    FROM payments 
                    WHERE DATE(payment_date) >= ? 
                    AND DATE(payment_date) <= ?
                    AND school_year = ?
                    AND status = 'completed'
                    GROUP BY DATE(payment_date)
                    ORDER BY period_date DESC
                `,
                thisWeek: `
                    SELECT 
                        COALESCE(SUM(amount), 0) as total_amount,
                        COUNT(*) as payment_count,
                        DATE(payment_date) as period_date
                    FROM payments 
                    WHERE DATE(payment_date) >= ? 
                    AND DATE(payment_date) <= ?
                    AND school_year = ?
                    AND status = 'completed'
                    GROUP BY DATE(payment_date)
                    ORDER BY period_date DESC
                `
            };

            // Exécution des requêtes
            const [todayResult] = await pool.query(queries.today, [todayStr, currentSchoolYear]);
            const [lastTwoDaysResult] = await pool.query(queries.lastTwoDays, [twoDaysAgoStr, todayStr, currentSchoolYear]);
            const [lastThreeDaysResult] = await pool.query(queries.lastThreeDays, [threeDaysAgoStr, todayStr, currentSchoolYear]);
            const [thisWeekResult] = await pool.query(queries.thisWeek, [startOfWeekStr, todayStr, currentSchoolYear]);

            // Calcul des totaux
            const calculateTotal = (results) => {
                return results.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
            };

            const calculateCount = (results) => {
                return results.reduce((sum, row) => sum + Number(row.payment_count || 0), 0);
            };

            // Formatage des résultats
            const financialStates = {
                today: {
                    total_amount: Number(todayResult[0] ? todayResult[0].total_amount || 0 : 0),
                    payment_count: Number(todayResult[0] ? todayResult[0].payment_count || 0 : 0),
                    date: todayStr,
                    label: 'Aujourd\'hui'
                },
                lastTwoDays: {
                    total_amount: calculateTotal(lastTwoDaysResult),
                    payment_count: calculateCount(lastTwoDaysResult),
                    details: lastTwoDaysResult.map(row => ({
                        date: row.period_date,
                        amount: Number(row.total_amount || 0),
                        count: Number(row.payment_count || 0)
                    })),
                    label: '2 derniers jours'
                },
                lastThreeDays: {
                    total_amount: calculateTotal(lastThreeDaysResult),
                    payment_count: calculateCount(lastThreeDaysResult),
                    details: lastThreeDaysResult.map(row => ({
                        date: row.period_date,
                        amount: Number(row.total_amount || 0),
                        count: Number(row.payment_count || 0)
                    })),
                    label: '3 derniers jours'
                },
                thisWeek: {
                    total_amount: calculateTotal(thisWeekResult),
                    payment_count: calculateCount(thisWeekResult),
                    details: thisWeekResult.map(row => ({
                        date: row.period_date,
                        amount: Number(row.total_amount || 0),
                        count: Number(row.payment_count || 0)
                    })),
                    label: 'Cette semaine',
                    week_start: startOfWeekStr,
                    week_end: todayStr
                }
            };

            console.log('[getDailyFinancialStates] États financiers calculés:', JSON.stringify(financialStates, null, 2));

            res.json({
                school_year: currentSchoolYear,
                generated_at: new Date().toISOString(),
                states: financialStates
            });

        } catch (error) {
            console.error('[getDailyFinancialStates] ERREUR:', error);
            console.error('[getDailyFinancialStates] Stack trace:', error.stack);
            res.status(500).json({
                message: 'Erreur lors de la génération des états financiers',
                error: error.message
            });
        }
    },

    // Méthode pour obtenir les détails des paiements par période
    getPaymentDetailsByPeriod: async(req, res) => {
        try {
            const { period, date, school_year } = req.query;
            const currentSchoolYear = school_year || getCurrentSchoolYear();

            let query = `
                SELECT 
                    p.id,
                    p.amount,
                    p.payment_date,
                    p.payment_method,
                    p.status,
                    s.first_name,
                    s.last_name,
                    s.registration_number,
                    c.name as class_name
                FROM payments p
                JOIN students s ON p.student_id = s.id
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.school_year = p.school_year
                LEFT JOIN classes c ON e.class_id = c.id
                WHERE p.school_year = ? AND p.status = 'completed'
            `;
            const params = [currentSchoolYear];

            // Ajouter les conditions de date selon la période
            if (period === 'today' && date) {
                query += ' AND DATE(p.payment_date) = ?';
                params.push(date);
            } else if (period === 'week' && date) {
                // Date est le début de la semaine
                const endDate = new Date(date);
                endDate.setDate(endDate.getDate() + 6);
                query += ' AND DATE(p.payment_date) >= ? AND DATE(p.payment_date) <= ?';
                params.push(date, endDate.toISOString().split('T')[0]);
            } else if (date) {
                query += ' AND DATE(p.payment_date) = ?';
                params.push(date);
            }

            query += ' ORDER BY p.payment_date DESC';

            const [payments] = await pool.query(query, params);

            res.json({
                period,
                date,
                school_year: currentSchoolYear,
                payments: payments.map(payment => ({
                    ...payment,
                    amount: Number(payment.amount)
                }))
            });

        } catch (error) {
            console.error('[getPaymentDetailsByPeriod] ERREUR:', error);
            res.status(500).json({
                message: 'Erreur lors de la récupération des détails',
                error: error.message
            });
        }
    },

    // Nouvelle méthode : États financiers par intervalle de dates personnalisé
    getCustomDateRangeStates: async(req, res) => {
        try {
            const { start_date, end_date, school_year } = req.query;
            const currentSchoolYear = school_year || getCurrentSchoolYear();

            console.log('[getCustomDateRangeStates] Paramètres:', { start_date, end_date, school_year: currentSchoolYear });

            // Validation des dates
            if (!start_date || !end_date) {
                return res.status(400).json({
                    message: 'Les dates de début et de fin sont obligatoires',
                    error: 'Paramètres manquants'
                });
            }

            // Vérifier que la date de début est antérieure à la date de fin
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);

            if (startDate > endDate) {
                return res.status(400).json({
                    message: 'La date de début doit être antérieure à la date de fin',
                    error: 'Dates invalides'
                });
            }

            // Calculer la différence en jours
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            console.log('[getCustomDateRangeStates] Période:', { startDate, endDate, diffDays });

            // Requête pour obtenir les données de la période personnalisée
            const customRangeQuery = `
                SELECT 
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as payment_count,
                    DATE(payment_date) as period_date,
                    DAYNAME(payment_date) as day_name,
                    MONTHNAME(payment_date) as month_name
                FROM payments 
                WHERE DATE(payment_date) >= ? 
                AND DATE(payment_date) <= ?
                AND school_year = ?
                AND status = 'completed'
                GROUP BY DATE(payment_date)
                ORDER BY period_date ASC
            `;

            // Requête pour le total de la période
            const totalQuery = `
                SELECT 
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as payment_count
                FROM payments 
                WHERE DATE(payment_date) >= ? 
                AND DATE(payment_date) <= ?
                AND school_year = ?
                AND status = 'completed'
            `;

            // Requête pour les statistiques par méthode de paiement
            const paymentMethodQuery = `
                SELECT 
                    payment_method,
                    COALESCE(SUM(amount), 0) as total_amount,
                    COUNT(*) as payment_count
                FROM payments 
                WHERE DATE(payment_date) >= ? 
                AND DATE(payment_date) <= ?
                AND school_year = ?
                AND status = 'completed'
                GROUP BY payment_method
                ORDER BY total_amount DESC
            `;

            // Exécution des requêtes
            const [customRangeResult] = await pool.query(customRangeQuery, [start_date, end_date, currentSchoolYear]);
            const [totalResult] = await pool.query(totalQuery, [start_date, end_date, currentSchoolYear]);
            const [paymentMethodResult] = await pool.query(paymentMethodQuery, [start_date, end_date, currentSchoolYear]);

            // Calcul des totaux
            const totalAmount = Number(totalResult[0] ? totalResult[0].total_amount || 0 : 0);
            const totalCount = Number(totalResult[0] ? totalResult[0].payment_count || 0 : 0);

            // Formatage des résultats par jour
            const dailyDetails = customRangeResult.map(row => ({
                date: row.period_date,
                day_name: row.day_name,
                month_name: row.month_name,
                amount: Number(row.total_amount || 0),
                count: Number(row.payment_count || 0),
                percentage: totalAmount > 0 ? Math.round((Number(row.total_amount || 0) / totalAmount) * 100) : 0
            }));

            // Formatage des méthodes de paiement
            const paymentMethods = paymentMethodResult.map(row => ({
                method: row.payment_method,
                amount: Number(row.total_amount || 0),
                count: Number(row.payment_count || 0),
                percentage: totalAmount > 0 ? Math.round((Number(row.total_amount || 0) / totalAmount) * 100) : 0
            }));

            // Calcul de la moyenne quotidienne
            const dailyAverage = diffDays > 0 ? Math.round(totalAmount / diffDays) : 0;

            // Formatage de la réponse
            const customDateRangeStates = {
                period: {
                    start_date,
                    end_date,
                    duration_days: diffDays,
                    label: `Du ${new Date(start_date).toLocaleDateString('fr-FR')} au ${new Date(end_date).toLocaleDateString('fr-FR')}`
                },
                summary: {
                    total_amount: totalAmount,
                    payment_count: totalCount,
                    daily_average: dailyAverage,
                    active_days: dailyDetails.length
                },
                daily_details: dailyDetails,
                payment_methods: paymentMethods,
                statistics: {
                    best_day: dailyDetails.length > 0 ? dailyDetails.reduce((max, day) => day.amount > max.amount ? day : max) : null,
                    worst_day: dailyDetails.length > 0 ? dailyDetails.reduce((min, day) => day.amount < min.amount ? day : min) : null,
                    most_active_day: dailyDetails.length > 0 ? dailyDetails.reduce((max, day) => day.count > max.count ? day : max) : null
                }
            };

            console.log('[getCustomDateRangeStates] États calculés pour la période personnalisée');

            res.json({
                school_year: currentSchoolYear,
                generated_at: new Date().toISOString(),
                custom_range: customDateRangeStates
            });

        } catch (error) {
            console.error('[getCustomDateRangeStates] ERREUR:', error);
            console.error('[getCustomDateRangeStates] Stack trace:', error.stack);
            res.status(500).json({
                message: 'Erreur lors de la génération des états financiers pour la période personnalisée',
                error: error.message
            });
        }
    },
};

module.exports = paymentController;