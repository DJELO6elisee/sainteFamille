const pool = require('../config/database');
const { getCurrentSchoolYear } = require('../config/schoolYear');

const discountController = {
    // Obtenir tous les types de réductions
    getAllDiscountTypes: async(req, res) => {
        try {
            const [discountTypes] = await pool.query(`
                SELECT * FROM discount_types 
                WHERE is_active = TRUE 
                ORDER BY name
            `);
            res.json(discountTypes);
        } catch (error) {
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            if (error.code === 'ER_NO_SUCH_TABLE') {
                // Si la table n'existe pas, retourner une liste vide
                res.json([]);
            } else {
                res.status(500).json({ message: error.message });
            }
        }
    },

    // Créer un nouveau type de réduction
    createDiscountType: async(req, res) => {
        const { name, description, percentage, fixed_amount, is_percentage } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Le nom du type de réduction est requis.' });
        }

        try {
            const [result] = await pool.query(`
                INSERT INTO discount_types (name, description, percentage, fixed_amount, is_percentage)
                VALUES (?, ?, ?, ?, ?)
            `, [name, description, percentage || 0, fixed_amount || 0, is_percentage !== false]);

            res.status(201).json({
                message: 'Type de réduction créé avec succès',
                id: result.insertId
            });
        } catch (error) {
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir tous les bons/prises en charge des élèves
    getAllStudentDiscounts: async(req, res) => {
        console.log('Param school_year reçu:', req.query.school_year);
        try {
            let query = `
                SELECT sd.*, s.first_name, s.last_name, s.registration_number AS student_registration_number,
                       COALESCE(dt.name, 'Type non défini') as discount_type_name, 
                       COALESCE(dt.percentage, 0) as type_percentage,
                       u.first_name as approver_first_name, u.last_name as approver_last_name
                FROM student_discounts sd
                JOIN students s ON sd.student_id = s.id
                LEFT JOIN discount_types dt ON sd.discount_type_id = dt.id
                LEFT JOIN users u ON sd.approved_by = u.id
            `;
            const whereClauses = [];
            const params = [];
            if (req.query.school_year) {
                whereClauses.push('sd.school_year = ?');
                params.push(req.query.school_year);
            }
            // Ajoute ici d'autres filtres si besoin

            if (whereClauses.length > 0) {
                query += ' WHERE ' + whereClauses.join(' AND ');
            }
            query += ' ORDER BY sd.created_at DESC';

            const [discounts] = await pool.query(query, params);
            res.json(discounts);
        } catch (error) {
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            if (error.code === 'ER_NO_SUCH_TABLE') {
                // Si la table n'existe pas, retourner une liste vide
                res.json([]);
            } else {
                res.status(500).json({ message: error.message });
            }
        }
    },

    // Obtenir les bons/prises en charge d'un élève spécifique
    getStudentDiscounts: async(req, res) => {
        try {
            const [discounts] = await pool.query(`
                SELECT sd.*, s.first_name, s.last_name, s.registration_number AS student_registration_number,
                       COALESCE(dt.name, 'Type non défini') as discount_type_name, 
                       COALESCE(dt.percentage, 0) as type_percentage,
                       u.first_name as approver_first_name, u.last_name as approver_last_name
                FROM student_discounts sd
                JOIN students s ON sd.student_id = s.id
                LEFT JOIN discount_types dt ON sd.discount_type_id = dt.id
                LEFT JOIN users u ON sd.approved_by = u.id
                WHERE sd.student_id = ?
                ORDER BY sd.created_at DESC
            `, [req.params.studentId]);
            res.json(discounts);
        } catch (error) {
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            if (error.code === 'ER_NO_SUCH_TABLE') {
                // Si la table n'existe pas, retourner une liste vide
                res.json([]);
            } else {
                res.status(500).json({ message: error.message });
            }
        }
    },

    // Obtenir les informations d'un élève avec sa classe et scolarité
    getStudentInfo: async(req, res) => {
        try {
            const [studentInfo] = await pool.query(`
                SELECT s.*, c.name as class_name, c.amount as tuition_fee
                FROM students s
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                LEFT JOIN classes c ON e.class_id = c.id
                WHERE s.id = ?
            `, [req.params.studentId]);

            if (studentInfo.length === 0) {
                return res.status(404).json({ message: 'Élève non trouvé' });
            }

            res.json(studentInfo[0]);
        } catch (error) {
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Créer un nouveau bon/prise en charge pour un élève
    createStudentDiscount: async(req, res) => {
        const {
            student_id,
            discount_type_id,
            amount,
            percentage,
            reason,
            start_date,
            end_date,
            school_year // <-- ajouter ce champ
        } = req.body;

        // Toujours renseigner l'année scolaire
        const schoolYearValue = school_year || getCurrentSchoolYear();

        if (!student_id || !discount_type_id || !amount) {
            return res.status(400).json({
                message: 'L\'ID élève, le type de réduction et le montant sont requis.'
            });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // Vérifier que l'élève existe
            const [student] = await connection.query(
                'SELECT id FROM students WHERE id = ?', [student_id]
            );
            if (student.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Élève non trouvé.' });
            }

            // Vérifier que le type de réduction existe
            const [discountType] = await connection.query(
                'SELECT id FROM discount_types WHERE id = ? AND is_active = TRUE', [discount_type_id]
            );
            if (discountType.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Type de réduction non trouvé.' });
            }

            // Récupérer les informations de l'élève et de sa classe
            const [studentInfo] = await connection.query(`
                SELECT s.*, c.name as class_name, c.amount as tuition_fee
                FROM students s
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                LEFT JOIN classes c ON e.class_id = c.id
                WHERE s.id = ?
            `, [student_id]);

            const [discountTypeInfo] = await connection.query(`
                SELECT * FROM discount_types WHERE id = ?
            `, [discount_type_id]);

            // Créer le bon/prise en charge
            const [result] = await connection.query(`
                INSERT INTO student_discounts 
                (student_id, discount_type_id, amount, percentage, reason, start_date, end_date, school_year)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [student_id, discount_type_id, amount, percentage || 0, reason, start_date, end_date, schoolYearValue]);

            await connection.commit();

            // Correction : utiliser les valeurs saisies pour le reçu
            const tuitionFee = studentInfo[0] && studentInfo[0].tuition_fee ? studentInfo[0].tuition_fee : 0;
            const discountTypeData = discountTypeInfo[0] || {};
            const discountAmount = parseFloat(amount); // Montant saisi dans le formulaire
            const discountPercentage = percentage || 0; // Pourcentage saisi dans le formulaire
            const finalAmount = Math.max(0, tuitionFee - discountAmount);

            res.status(201).json({
                message: 'Bon/prise en charge créé avec succès',
                id: result.insertId,
                receipt: {
                    student: studentInfo[0],
                    discountType: discountTypeData,
                    discount: {
                        amount: discountAmount,
                        percentage: discountPercentage,
                        reason: reason,
                        startDate: start_date,
                        endDate: end_date
                    },
                    financial: {
                        tuitionFee: tuitionFee,
                        discountAmount: discountAmount,
                        finalAmount: finalAmount
                    }
                }
            });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            res.status(500).json({ message: error.message });
        } finally {
            if (connection) connection.release();
        }
    },

    // Approuver un bon/prise en charge
    approveStudentDiscount: async(req, res) => {
        const { approved_by } = req.body;
        const discountId = req.params.id;

        if (!approved_by) {
            return res.status(400).json({ message: 'L\'ID de l\'approbateur est requis.' });
        }

        try {
            await pool.query(`
                UPDATE student_discounts 
                SET approved_by = ?, approved_at = NOW(), is_active = TRUE
                WHERE id = ?
            `, [approved_by, discountId]);

            res.json({ message: 'Bon/prise en charge approuvé avec succès' });
        } catch (error) {
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Désactiver un bon/prise en charge
    deactivateStudentDiscount: async(req, res) => {
        try {
            await pool.query(`
                UPDATE student_discounts 
                SET is_active = FALSE 
                WHERE id = ?
            `, [req.params.id]);

            res.json({ message: 'Bon/prise en charge désactivé avec succès' });
        } catch (error) {
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Calculer le montant total des réductions actives pour un élève
    calculateStudentDiscounts: async(req, res) => {
        try {
            const studentId = req.params.studentId;
            const currentDate = new Date().toISOString().split('T')[0];

            const [discounts] = await pool.query(`
                SELECT sd.*, dt.name as discount_type_name, dt.is_percentage
                FROM student_discounts sd
                JOIN discount_types dt ON sd.discount_type_id = dt.id
                WHERE sd.student_id = ? 
                AND sd.is_active = TRUE 
                AND sd.approved_by IS NOT NULL
                AND (sd.start_date IS NULL OR sd.start_date <= ?)
                AND (sd.end_date IS NULL OR sd.end_date >= ?)
            `, [studentId, currentDate, currentDate]);

            let totalDiscountAmount = 0;
            let totalDiscountPercentage = 0;

            discounts.forEach(discount => {
                if (discount.is_percentage) {
                    totalDiscountPercentage += discount.percentage;
                } else {
                    totalDiscountAmount += discount.amount;
                }
            });

            // Limiter le pourcentage total à 100%
            if (totalDiscountPercentage > 100) {
                totalDiscountPercentage = 100;
            }

            res.json({
                discounts,
                totalDiscountAmount,
                totalDiscountPercentage,
                summary: {
                    activeDiscounts: discounts.length,
                    totalFixedDiscount: totalDiscountAmount,
                    totalPercentageDiscount: totalDiscountPercentage
                }
            });
        } catch (error) {
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Appliquer les réductions à un paiement
    applyDiscountsToPayment: async(req, res) => {
        const { payment_id, student_id } = req.body;

        if (!payment_id || !student_id) {
            return res.status(400).json({
                message: 'L\'ID du paiement et l\'ID de l\'élève sont requis.'
            });
        }

        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // Récupérer le paiement
            const [payment] = await connection.query(
                'SELECT * FROM payments WHERE id = ?', [payment_id]
            );
            if (payment.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Paiement non trouvé.' });
            }

            // Récupérer les réductions actives de l'élève
            const currentDate = new Date().toISOString().split('T')[0];
            const [discounts] = await connection.query(`
                SELECT sd.*, dt.name as discount_type_name, dt.is_percentage
                FROM student_discounts sd
                JOIN discount_types dt ON sd.discount_type_id = dt.id
                WHERE sd.student_id = ? 
                AND sd.is_active = TRUE 
                AND sd.approved_by IS NOT NULL
                AND (sd.start_date IS NULL OR sd.start_date <= ?)
                AND (sd.end_date IS NULL OR sd.end_date >= ?)
            `, [student_id, currentDate, currentDate]);

            let totalDiscountAmount = 0;
            let totalDiscountPercentage = 0;

            // Calculer les réductions
            discounts.forEach(discount => {
                if (discount.is_percentage) {
                    totalDiscountPercentage += discount.percentage;
                } else {
                    totalDiscountAmount += discount.amount;
                }
            });

            // Limiter le pourcentage total à 100%
            if (totalDiscountPercentage > 100) {
                totalDiscountPercentage = 100;
            }

            const originalAmount = payment[0].original_amount || payment[0].amount;
            const percentageDiscountAmount = (originalAmount * totalDiscountPercentage) / 100;
            const finalDiscountAmount = percentageDiscountAmount + totalDiscountAmount;
            const finalAmount = Math.max(0, originalAmount - finalDiscountAmount);

            // Mettre à jour le paiement
            await connection.query(`
                UPDATE payments 
                SET original_amount = ?, amount = ?, discount_amount = ?
                WHERE id = ?
            `, [originalAmount, finalAmount, finalDiscountAmount, payment_id]);

            // Enregistrer l'historique des réductions appliquées
            for (const discount of discounts) {
                let discountAmount = 0;
                if (discount.is_percentage) {
                    discountAmount = (originalAmount * discount.percentage) / 100;
                } else {
                    discountAmount = discount.amount;
                }

                await connection.query(`
                    INSERT INTO payment_discounts (payment_id, student_discount_id, discount_amount)
                    VALUES (?, ?, ?)
                `, [payment_id, discount.id, discountAmount]);
            }

            await connection.commit();

            res.json({
                message: 'Réductions appliquées avec succès',
                originalAmount,
                finalAmount,
                totalDiscountAmount: finalDiscountAmount,
                appliedDiscounts: discounts.length
            });
        } catch (error) {
            if (connection) await connection.rollback();
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            res.status(500).json({ message: error.message });
        } finally {
            if (connection) connection.release();
        }
    },

    // Obtenir l'historique des réductions appliquées à un paiement
    getPaymentDiscountHistory: async(req, res) => {
        try {
            const [discounts] = await pool.query(`
                SELECT pd.*, sd.reason, dt.name as discount_type_name
                FROM payment_discounts pd
                JOIN student_discounts sd ON pd.student_discount_id = sd.id
                JOIN discount_types dt ON sd.discount_type_id = dt.id
                WHERE pd.payment_id = ?
                ORDER BY pd.applied_at DESC
            `, [req.params.paymentId]);
            res.json(discounts);
        } catch (error) {
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les statistiques des réductions
    getDiscountStats: async(req, res) => {
        try {
            const [stats] = await pool.query(`
                SELECT 
                    dt.name as discount_type,
                    COUNT(sd.id) as total_discounts,
                    SUM(sd.amount) as total_amount,
                    AVG(sd.amount) as average_amount,
                    COUNT(CASE WHEN sd.is_active = TRUE THEN 1 END) as active_discounts
                FROM discount_types dt
                LEFT JOIN student_discounts sd ON dt.id = sd.discount_type_id
                GROUP BY dt.id, dt.name
                ORDER BY total_discounts DESC
            `);
            res.json(stats);
        } catch (error) {
            console.error('[ERROR DISCOUNT] Exception attrapée:', error);
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = discountController;