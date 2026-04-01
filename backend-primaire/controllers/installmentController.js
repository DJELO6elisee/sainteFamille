const pool = require('../config/database');
const { getCurrentSchoolYear } = require('../config/schoolYear');

// Gérer un paiement intelligent (créer des versements selon le montant versé)
const processIntelligentPayment = async(connection, studentId, amount, paymentDate, paymentMethod, schoolYear, description = null) => {
    try {
        console.log(`[INTELLIGENT PAYMENT] Traitement du paiement de ${amount} FCFA pour l'élève ${studentId}`);

        // 1. Récupérer les informations du niveau d'études de l'élève
        const [studentInfo] = await connection.execute(`
            SELECT 
                el.tuition_amount, 
                el.registration_fee,
                el.id as education_level_id,
                c.id as class_id
            FROM students s
            JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
            JOIN classes c ON e.class_id = c.id
            LEFT JOIN education_levels el ON c.education_level_id = el.id
            WHERE s.id = ?
        `, [schoolYear, studentId]);

        if (studentInfo.length === 0) {
            throw new Error('Élève non trouvé ou non inscrit pour cette année');
        }

        const { tuition_amount, registration_fee, education_level_id, class_id } = studentInfo[0];
        const totalTuition = Number(tuition_amount);
        const registrationFee = Number(registration_fee);
        const amountForInstallments = totalTuition - registrationFee;

        console.log(`[INTELLIGENT PAYMENT] Scolarité totale: ${totalTuition}, Frais inscription: ${registrationFee}, Montant versements: ${amountForInstallments}`);

        // 2. Récupérer les versements configurés pour ce niveau
        const [levelInstallments] = await connection.execute(`
            SELECT * FROM level_installments 
            WHERE education_level_id = ? AND is_active = 1 
            ORDER BY installment_number
        `, [education_level_id]);

        if (levelInstallments.length === 0) {
            throw new Error('Aucun versement configuré pour ce niveau');
        }

        // 3. Vérifier s'il y a déjà des versements créés pour cet élève
        const [existingInstallments] = await connection.execute(`
            SELECT * FROM installments 
            WHERE student_id = ? AND school_year = ?
            ORDER BY installment_number
        `, [studentId, schoolYear]);

        let remainingAmount = amount;
        const createdInstallments = [];

        // 4. Si c'est le premier paiement et qu'il dépasse les frais d'inscription
        if (existingInstallments.length === 0) {
            console.log(`[INTELLIGENT PAYMENT] Premier paiement - montant: ${amount}, frais inscription: ${registrationFee}`);

            if (amount >= registrationFee) {
                // Paiement des frais d'inscription
                remainingAmount = amount - registrationFee;
                console.log(`[INTELLIGENT PAYMENT] Frais d'inscription payés, surplus: ${remainingAmount}`);

                // Créer les versements selon la configuration
                for (const levelInstallment of levelInstallments) {
                    // Utiliser le montant fixe de la configuration si disponible, sinon calculer par pourcentage
                    const installmentAmount = levelInstallment.amount > 0 ?
                        Number(levelInstallment.amount) :
                        Math.round((amountForInstallments * levelInstallment.percentage) / 100);
                    const dueDate = new Date(paymentDate);
                    dueDate.setDate(dueDate.getDate() + levelInstallment.due_date_offset_days);

                    const [installmentResult] = await connection.execute(`
                        INSERT INTO installments 
                        (student_id, level_installment_id, installment_number, amount, due_date, percentage, status, school_year, class_id, education_level_id)
                        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
                    `, [
                        studentId,
                        levelInstallment.id,
                        levelInstallment.installment_number,
                        installmentAmount,
                        dueDate,
                        levelInstallment.percentage,
                        schoolYear,
                        class_id,
                        education_level_id
                    ]);

                    const installmentId = installmentResult.insertId;

                    // Créer le solde initial dans student_installment_balances
                    await connection.execute(`
                        INSERT INTO student_installment_balances 
                        (student_id, installment_id, level_installment_id, total_amount, amount_paid, balance, school_year)
                        VALUES (?, ?, ?, ?, 0.00, ?, ?)
                    `, [studentId, installmentId, levelInstallment.id, installmentAmount, installmentAmount, schoolYear]);

                    createdInstallments.push({
                        id: installmentId,
                        installment_number: levelInstallment.installment_number,
                        amount: installmentAmount,
                        due_date: dueDate
                    });

                    console.log(`[INTELLIGENT PAYMENT] Versement ${levelInstallment.installment_number} créé: ${installmentAmount} FCFA`);
                }
            } else {
                // Montant insuffisant pour les frais d'inscription
                throw new Error(`Montant insuffisant. Frais d'inscription requis: ${registrationFee} FCFA`);
            }
        }

        // 5. Traiter le surplus ou les paiements suivants
        if (remainingAmount > 0) {
            console.log(`[INTELLIGENT PAYMENT] Traitement du surplus/montant: ${remainingAmount} FCFA`);

            // Récupérer les versements en attente avec leurs soldes
            const [pendingInstallments] = await connection.execute(`
                SELECT i.*, sib.balance, sib.amount_paid
                FROM installments i
                LEFT JOIN student_installment_balances sib ON i.id = sib.installment_id
                WHERE i.student_id = ? AND i.school_year = ? AND i.status = 'pending'
                ORDER BY i.installment_number
            `, [studentId, schoolYear]);

            // Payer les versements dans l'ordre
            for (const installment of pendingInstallments) {
                if (remainingAmount <= 0) break;

                const currentBalance = Number(installment.balance || installment.amount);
                const paymentAmount = Math.min(remainingAmount, currentBalance);

                // Enregistrer le paiement du versement
                const [paymentResult] = await connection.execute(`
                    INSERT INTO installment_payments 
                    (installment_id, student_id, amount_paid, payment_date, payment_method, status, school_year, description)
                    VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)
                `, [installment.id, studentId, paymentAmount, paymentDate, paymentMethod, schoolYear, description]);

                // Mettre à jour le solde dans student_installment_balances
                const newAmountPaid = Number(installment.amount_paid || 0) + paymentAmount;
                const newBalance = currentBalance - paymentAmount;

                await connection.execute(`
                    UPDATE student_installment_balances 
                    SET amount_paid = ?, balance = ?, last_payment_date = NOW()
                    WHERE installment_id = ?
                `, [newAmountPaid, newBalance, installment.id]);

                // Mettre à jour le statut du versement
                if (newBalance <= 0) {
                    await connection.execute(`
                        UPDATE installments 
                        SET status = 'paid', updated_at = NOW()
                        WHERE id = ?
                    `, [installment.id]);
                    console.log(`[INTELLIGENT PAYMENT] Versement ${installment.installment_number} entièrement payé`);
                } else {
                    console.log(`[INTELLIGENT PAYMENT] Versement ${installment.installment_number} partiellement payé, reste: ${newBalance} FCFA`);
                }

                remainingAmount -= paymentAmount;
            }

            // Si il reste encore de l'argent, créer un versement supplémentaire
            if (remainingAmount > 0) {
                const nextInstallmentNumber = pendingInstallments.length > 0 ?
                    Math.max(...pendingInstallments.map(i => i.installment_number)) + 1 : 1;
                const dueDate = new Date(paymentDate);
                dueDate.setDate(dueDate.getDate() + 30); // 30 jours par défaut

                const [extraInstallmentResult] = await connection.execute(`
                    INSERT INTO installments 
                    (student_id, level_installment_id, installment_number, amount, due_date, percentage, status, school_year, class_id, education_level_id)
                    VALUES (?, NULL, ?, ?, ?, 0, 'pending', ?, ?, ?)
                `, [studentId, nextInstallmentNumber, remainingAmount, dueDate, schoolYear, class_id, education_level_id]);

                const extraInstallmentId = extraInstallmentResult.insertId;

                // Créer le solde pour le versement supplémentaire
                await connection.execute(`
                    INSERT INTO student_installment_balances 
                    (student_id, installment_id, level_installment_id, total_amount, amount_paid, balance, school_year)
                    VALUES (?, ?, NULL, ?, 0.00, ?, ?)
                `, [studentId, extraInstallmentId, remainingAmount, remainingAmount, schoolYear]);

                console.log(`[INTELLIGENT PAYMENT] Versement supplémentaire créé: ${remainingAmount} FCFA`);
            }
        }

        // 6. Enregistrer le paiement total dans la table payments
        await connection.execute(`
            INSERT INTO payments 
            (student_id, amount, payment_date, payment_method, school_year, description, status)
            VALUES (?, ?, NOW(), ?, ?, ?, 'completed')
        `, [studentId, amount, paymentMethod, schoolYear, description || 'Paiement de scolarité']);

        return {
            success: true,
            message: 'Paiement traité avec succès',
            created_installments: createdInstallments,
            remaining_amount: remainingAmount
        };

    } catch (error) {
        console.error('[INTELLIGENT PAYMENT] Erreur:', error);
        throw error;
    }
};

// Créer les versements pour un élève
const createStudentInstallments = async(connection, studentId, educationLevelId, enrollmentDate, schoolYear) => {
    try {
        // Récupérer les informations du niveau d'études
        const [levelInfo] = await connection.execute(`
            SELECT tuition_amount, registration_fee 
            FROM education_levels 
            WHERE id = ? AND is_active = 1
        `, [educationLevelId]);

        if (levelInfo.length === 0) {
            throw new Error('Niveau d\'études non trouvé');
        }

        const { tuition_amount, registration_fee } = levelInfo[0];
        // Les versements sont calculés sur le montant restant après paiement des frais d'inscription
        // Montant total de la scolarité = tuition_amount (qui inclut déjà les frais d'inscription)
        // Montant pour les versements = tuition_amount - registration_fee
        const totalAmount = Number(tuition_amount) - Number(registration_fee);

        // Récupérer les versements configurés pour ce niveau
        const [levelInstallments] = await connection.execute(`
            SELECT * FROM level_installments 
            WHERE education_level_id = ? AND is_active = 1 
            ORDER BY installment_number
        `, [educationLevelId]);

        if (levelInstallments.length === 0) {
            throw new Error('Aucun versement configuré pour ce niveau');
        }

        const createdInstallments = [];

        // Créer les versements pour l'élève
        for (const levelInstallment of levelInstallments) {
            // Utiliser le montant fixe de la configuration si disponible, sinon calculer par pourcentage
            const amount = levelInstallment.amount > 0 ?
                Number(levelInstallment.amount) :
                Math.round((totalAmount * levelInstallment.percentage) / 100);
            const dueDate = new Date(enrollmentDate);
            dueDate.setDate(dueDate.getDate() + levelInstallment.due_date_offset_days);

            const [installmentResult] = await connection.execute(`
                INSERT INTO installments 
                (student_id, level_installment_id, installment_number, amount, due_date, percentage, status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')
            `, [
                studentId,
                levelInstallment.id,
                levelInstallment.installment_number,
                amount,
                dueDate,
                levelInstallment.percentage
            ]);

            const installmentId = installmentResult.insertId;

            // Créer le solde initial
            await connection.execute(`
                INSERT INTO student_installment_balances 
                (student_id, installment_id, level_installment_id, total_amount, amount_paid, balance, school_year)
                VALUES (?, ?, ?, ?, 0.00, ?, ?)
            `, [studentId, installmentId, levelInstallment.id, amount, amount, schoolYear]);

            createdInstallments.push({
                id: installmentId,
                installment_number: levelInstallment.installment_number,
                amount,
                due_date: dueDate,
                percentage: levelInstallment.percentage
            });
        }

        return createdInstallments;
    } catch (error) {
        console.error('Erreur lors de la création des versements:', error);
        throw error;
    }
};

// Récupérer les versements d'un élève
const getStudentInstallments = async(req, res) => {
    try {
        const { studentId } = req.params;
        const { school_year } = req.query;

        const [installments] = await pool.execute(`
            SELECT 
                i.*,
                li.installment_number,
                li.percentage,
                li.due_date as level_due_date,
                COALESCE(sib.total_amount, i.amount) as total_amount,
                COALESCE(sib.amount_paid, 0) as amount_paid,
                COALESCE(sib.balance, i.amount) as balance,
                COALESCE(sib.is_overdue, 0) as is_overdue,
                sib.last_payment_date,
                el.name as level_name
            FROM installments i
            JOIN level_installments li ON li.id = i.level_installment_id
            LEFT JOIN student_installment_balances sib ON sib.installment_id = i.id AND sib.school_year = ?
            JOIN education_levels el ON el.id = li.education_level_id
            WHERE i.student_id = ? AND i.school_year = ?
            ORDER BY i.installment_number
        `, [school_year || getCurrentSchoolYear(), studentId, school_year || getCurrentSchoolYear()]);

        res.json({
            success: true,
            data: installments
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des versements:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des versements'
        });
    }
};

// Enregistrer un paiement de versement
const recordInstallmentPayment = async(req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const {
            installment_id,
            student_id,
            amount_paid,
            payment_method,
            description,
            school_year
        } = req.body;

        // Vérifier que le versement existe
        const [installment] = await connection.execute(`
            SELECT i.*, sib.balance, sib.amount_paid
            FROM installments i
            JOIN student_installment_balances sib ON sib.installment_id = i.id
            WHERE i.id = ? AND i.student_id = ?
        `, [installment_id, student_id]);

        if (installment.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Versement non trouvé'
            });
        }

        const installmentData = installment[0];
        const newAmountPaid = Number(installmentData.amount_paid) + Number(amount_paid);
        const newBalance = Number(installmentData.balance) - Number(amount_paid);

        // Enregistrer le paiement
        const [paymentResult] = await connection.execute(`
            INSERT INTO installment_payments 
            (installment_id, student_id, amount_paid, payment_method, status, description, created_by, school_year)
            VALUES (?, ?, ?, ?, 'completed', ?, ?, ?)
        `, [
            installment_id,
            student_id,
            amount_paid,
            payment_method,
            description,
            req.user.id,
            school_year || getCurrentSchoolYear()
        ]);

        // Mettre à jour le solde
        await connection.execute(`
            UPDATE student_installment_balances 
            SET amount_paid = ?, balance = ?, last_payment_date = NOW()
            WHERE installment_id = ?
        `, [newAmountPaid, newBalance, installment_id]);

        // Mettre à jour le statut du versement
        let newStatus = 'pending';
        if (newBalance <= 0) {
            newStatus = 'paid';
        }

        await connection.execute(`
            UPDATE installments 
            SET status = ?
            WHERE id = ?
        `, [newStatus, installment_id]);

        await connection.commit();

        res.json({
            success: true,
            message: 'Paiement enregistré avec succès',
            data: {
                payment_id: paymentResult.insertId,
                new_balance: newBalance,
                status: newStatus
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erreur lors de l\'enregistrement du paiement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'enregistrement du paiement'
        });
    } finally {
        connection.release();
    }
};

// Récupérer l'historique des paiements d'un versement
const getInstallmentPaymentHistory = async(req, res) => {
    try {
        const { installmentId } = req.params;

        const [payments] = await pool.execute(`
            SELECT 
                ip.*,
                u.first_name,
                u.last_name
            FROM installment_payments ip
            LEFT JOIN users u ON u.id = ip.created_by
            WHERE ip.installment_id = ?
            ORDER BY ip.payment_date DESC
        `, [installmentId]);

        res.json({
            success: true,
            data: payments
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'historique des paiements'
        });
    }
};

// Récupérer le résumé financier d'un élève
const getStudentFinancialSummary = async(req, res) => {
    try {
        const { studentId } = req.params;
        const { school_year } = req.query;

        const [summary] = await pool.execute(`
            SELECT 
                s.id,
                s.first_name,
                s.last_name,
                el.name as level_name,
                el.tuition_amount,
                el.registration_fee,
                COUNT(i.id) as total_installments,
                SUM(i.amount) as total_amount,
                SUM(sib.amount_paid) as total_paid,
                SUM(sib.balance) as total_balance,
                COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_installments,
                COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_installments,
                COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_installments
            FROM students s
            JOIN education_levels el ON el.id = s.education_level_id
            LEFT JOIN installments i ON i.student_id = s.id
            LEFT JOIN student_installment_balances sib ON sib.installment_id = i.id AND sib.school_year = ?
            WHERE s.id = ?
            GROUP BY s.id, s.first_name, s.last_name, el.name, el.tuition_amount, el.registration_fee
        `, [school_year || getCurrentSchoolYear(), studentId]);

        if (summary.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Élève non trouvé'
            });
        }

        res.json({
            success: true,
            data: summary[0]
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du résumé financier:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du résumé financier'
        });
    }
};

// Marquer les versements en retard
const markOverdueInstallments = async(req, res) => {
    try {
        const { school_year } = req.query;

        // Marquer les versements en retard
        await pool.execute(`
            UPDATE installments i
            JOIN student_installment_balances sib ON sib.installment_id = i.id
            SET i.status = 'overdue', sib.is_overdue = 1
            WHERE i.due_date < CURDATE() 
            AND i.status = 'pending'
            AND sib.school_year = ?
        `, [school_year || getCurrentSchoolYear()]);

        res.json({
            success: true,
            message: 'Versements en retard marqués avec succès'
        });
    } catch (error) {
        console.error('Erreur lors du marquage des versements en retard:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du marquage des versements en retard'
        });
    }
};

// Nouvelle route pour le paiement intelligent
const processIntelligentPaymentRoute = async(req, res) => {
    let connection;
    try {
        const { student_id, amount, payment_method = 'cash', description } = req.body;
        const schoolYear = req.body.school_year || getCurrentSchoolYear();

        if (!student_id || !amount || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'ID élève et montant valide requis'
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction();

        const result = await processIntelligentPayment(
            connection,
            student_id,
            Number(amount),
            new Date(),
            payment_method,
            schoolYear,
            description
        );

        await connection.commit();

        res.json({
            success: true,
            message: 'Paiement intelligent traité avec succès',
            data: result
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Erreur lors du paiement intelligent:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors du traitement du paiement'
        });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    createStudentInstallments,
    getStudentInstallments,
    recordInstallmentPayment,
    getInstallmentPaymentHistory,
    getStudentFinancialSummary,
    markOverdueInstallments,
    processIntelligentPayment,
    processIntelligentPaymentRoute
};