const pool = require('../config/database');
const { getCurrentSchoolYear } = require('../config/schoolYear');

// Récupérer tous les niveaux d'études avec leurs versements
const getAllEducationLevels = async(req, res) => {
    try {
        const { school_year } = req.query;
        const currentSchoolYear = school_year || getCurrentSchoolYear();

        const [rows] = await pool.execute(`
            SELECT 
                el.*,
                (SELECT COUNT(DISTINCT c.id) 
                 FROM classes c 
                 WHERE c.education_level_id = el.id) as classes_count,
                (SELECT COUNT(DISTINCT s.id)
                 FROM students s
                 INNER JOIN enrollments e ON e.student_id = s.id
                 INNER JOIN classes c ON c.id = e.class_id
                 WHERE c.education_level_id = el.id
                   AND e.status = 'active'
                   AND (e.school_year = ? OR e.school_year IS NULL)) as students_count,
                (SELECT COUNT(DISTINCT li.id)
                 FROM level_installments li
                 WHERE li.education_level_id = el.id 
                   AND li.is_active = 1) as installments_count
            FROM education_levels el
            WHERE el.is_active = 1
            ORDER BY el.order_index, el.name
        `, [currentSchoolYear]);

        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des niveaux:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des niveaux d\'études'
        });
    }
};

// Récupérer un niveau d'études par ID avec ses versements
const getEducationLevelById = async(req, res) => {
    try {
        const { id } = req.params;

        // Récupérer les informations du niveau
        const [levelRows] = await pool.execute(`
            SELECT * FROM education_levels WHERE id = ? AND is_active = 1
        `, [id]);

        if (levelRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Niveau d\'études non trouvé'
            });
        }

        const level = levelRows[0];

        // Récupérer les versements configurés
        const [installments] = await pool.execute(`
            SELECT * FROM level_installments 
            WHERE education_level_id = ? AND is_active = 1 
            ORDER BY installment_number
        `, [id]);

        level.installments = installments;

        res.json({
            success: true,
            data: level
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du niveau:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du niveau d\'études'
        });
    }
};

// Créer un nouveau niveau d'études
const createEducationLevel = async(req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const {
            name,
            description,
            tuition_amount,
            registration_fee,
            cantine_amount,
            order_index,
            installments
        } = req.body;

        // Vérifier si le nom existe déjà
        const [existingName] = await connection.execute(
            'SELECT id FROM education_levels WHERE name = ?', [name]
        );

        if (existingName.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ce nom de niveau existe déjà'
            });
        }

        // Insérer le niveau
        const [result] = await connection.execute(`
            INSERT INTO education_levels 
            (name, description, tuition_amount, registration_fee, cantine_amount, order_index)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [name, description, tuition_amount, registration_fee, cantine_amount, order_index || 0]);

        const levelId = result.insertId;

        // Ajouter les versements
        if (installments && installments.length > 0) {
            for (const installment of installments) {
                await connection.execute(`
                    INSERT INTO level_installments 
                    (education_level_id, installment_number, amount, percentage, due_date, due_date_offset_days)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    levelId,
                    installment.installment_number,
                    installment.amount || 0,
                    installment.percentage,
                    installment.due_date || null,
                    installment.due_date_offset_days || 0
                ]);
            }
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Niveau d\'études créé avec succès',
            data: { id: levelId }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erreur lors de la création du niveau:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la création du niveau d\'études'
        });
    } finally {
        connection.release();
    }
};

// Mettre à jour un niveau d'études
const updateEducationLevel = async(req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const {
            name,
            description,
            tuition_amount,
            registration_fee,
            cantine_amount,
            order_index,
            installments
        } = req.body;

        // Vérifier si le niveau existe
        const [existingLevel] = await connection.execute(
            'SELECT id FROM education_levels WHERE id = ?', [id]
        );

        if (existingLevel.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Niveau d\'études non trouvé'
            });
        }

        // Vérifier si le nom existe déjà (sauf pour ce niveau)
        const [existingName] = await connection.execute(
            'SELECT id FROM education_levels WHERE name = ? AND id != ?', [name, id]
        );

        if (existingName.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ce nom de niveau existe déjà'
            });
        }

        // Mettre à jour le niveau
        await connection.execute(`
            UPDATE education_levels 
            SET name = ?, description = ?, tuition_amount = ?, 
                registration_fee = ?, cantine_amount = ?, order_index = ?
            WHERE id = ?
        `, [name, description, tuition_amount, registration_fee, cantine_amount, order_index || 0, id]);

        // Supprimer complètement les anciens versements
        await connection.execute(
            'DELETE FROM level_installments WHERE education_level_id = ?', [id]
        );

        // Ajouter les nouveaux versements
        if (installments && installments.length > 0) {
            for (const installment of installments) {
                await connection.execute(`
                    INSERT INTO level_installments 
                    (education_level_id, installment_number, amount, percentage, due_date, due_date_offset_days)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    id,
                    installment.installment_number,
                    installment.amount || 0,
                    installment.percentage,
                    installment.due_date || null,
                    installment.due_date_offset_days || 0
                ]);
            }
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Niveau d\'études mis à jour avec succès'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Erreur lors de la mise à jour du niveau:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour du niveau d\'études'
        });
    } finally {
        connection.release();
    }
};

// Supprimer un niveau d'études (soft delete)
const deleteEducationLevel = async(req, res) => {
        try {
            const { id } = req.params;

            // Vérifier s'il y a des classes associées
            const [classes] = await pool.execute(
                'SELECT COUNT(*) as count FROM classes WHERE education_level_id = ?', [id]
            );

            // Vérifier s'il y a des élèves associés via les classes
            const [students] = await pool.execute(`
            SELECT COUNT(DISTINCT s.id) as count 
            FROM students s
            JOIN enrollments e ON e.student_id = s.id
            JOIN classes c ON c.id = e.class_id
            WHERE c.education_level_id = ?
        `, [id]);

            // Récupérer les détails pour un message d'erreur plus informatif
            if (classes[0].count > 0 || students[0].count > 0) {
                // Récupérer les noms des classes
                const [classDetails] = await pool.execute(`
                SELECT c.id, c.name, c.school_year
                FROM classes c
                WHERE c.education_level_id = ?
            `, [id]);

                // Récupérer les détails des élèves
                const [studentDetails] = await pool.execute(`
                SELECT 
                    s.id, 
                    s.first_name, 
                    s.last_name, 
                    s.registration_number,
                    c.name as class_name
                FROM students s
                JOIN enrollments e ON e.student_id = s.id
                JOIN classes c ON c.id = e.class_id
                WHERE c.education_level_id = ?
                LIMIT 5
            `, [id]);

                let errorMessage = 'Impossible de supprimer ce niveau car il est utilisé par:\n';

                if (classes[0].count > 0) {
                    errorMessage += `- ${classes[0].count} classe(s): ${classDetails.map(c => c.name).join(', ')}\n`;
                }

                if (students[0].count > 0) {
                    errorMessage += `- ${students[0].count} élève(s) (exemples: ${studentDetails.map(s => `${s.first_name} ${s.last_name}`).join(', ')})`;
                if (students[0].count > 5) {
                    errorMessage += ` et ${students[0].count - 5} autres...`;
                }
            }

            return res.status(400).json({
                success: false,
                message: errorMessage,
                details: {
                    classes_count: classes[0].count,
                    students_count: students[0].count,
                    classes: classDetails,
                    students: studentDetails
                }
            });
        }

        // Soft delete
        await pool.execute(
            'UPDATE education_levels SET is_active = 0 WHERE id = ?', [id]
        );

        res.json({
            success: true,
            message: 'Niveau d\'études supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du niveau:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du niveau d\'études'
        });
    }
};

// Calculer les montants des versements pour un niveau
const calculateLevelInstallments = async(req, res) => {
    try {
        const { levelId } = req.params;

        // Récupérer les informations du niveau
        const [levelRows] = await pool.execute(
            'SELECT tuition_amount, registration_fee FROM education_levels WHERE id = ? AND is_active = 1', [levelId]
        );

        if (levelRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Niveau d\'études non trouvé'
            });
        }

        // Récupérer les versements configurés
        const [installmentRows] = await pool.execute(
            'SELECT * FROM level_installments WHERE education_level_id = ? AND is_active = 1 ORDER BY installment_number', [levelId]
        );

        const level = levelRows[0];
        const totalAmount = Number(level.tuition_amount) + Number(level.registration_fee);

        const installments = installmentRows.map(installment => ({
            installment_number: installment.installment_number,
            percentage: installment.percentage,
            amount: Math.round((totalAmount * installment.percentage) / 100),
            due_date_offset_days: installment.due_date_offset_days
        }));

        res.json({
            success: true,
            data: {
                level: level,
                total_amount: totalAmount,
                installments: installments
            }
        });
    } catch (error) {
        console.error('Erreur lors du calcul des versements:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors du calcul des versements'
        });
    }
};

// Récupérer les versements détaillés d'un niveau avec statistiques des élèves
const getLevelInstallmentsDetails = async(req, res) => {
    try {
        const { levelId } = req.params;
        const { school_year } = req.query;

        // Récupérer les informations du niveau
        const [levelRows] = await pool.execute(`
            SELECT * FROM education_levels WHERE id = ? AND is_active = 1
        `, [levelId]);

        if (levelRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Niveau d\'études non trouvé'
            });
        }

        const level = levelRows[0];

        // Récupérer les versements configurés pour ce niveau
        const [levelInstallments] = await pool.execute(`
            SELECT 
                li.*,
                COUNT(DISTINCT i.id) as total_student_installments,
                COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END) as paid_installments,
                COUNT(DISTINCT CASE WHEN i.status = 'pending' THEN i.id END) as pending_installments,
                COUNT(DISTINCT CASE WHEN i.status = 'overdue' THEN i.id END) as overdue_installments,
                SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) as total_paid_amount,
                SUM(CASE WHEN i.status = 'pending' OR i.status = 'overdue' THEN i.amount ELSE 0 END) as total_pending_amount
            FROM level_installments li
            LEFT JOIN installments i ON i.level_installment_id = li.id 
                AND i.school_year = ?
            WHERE li.education_level_id = ? AND li.is_active = 1
            GROUP BY li.id
            ORDER BY li.installment_number
        `, [school_year || getCurrentSchoolYear(), levelId]);

        // Récupérer les statistiques globales des élèves de ce niveau
        const [studentStats] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT s.id) as total_students,
                COUNT(DISTINCT CASE WHEN e.status = 'active' THEN s.id END) as active_students,
                COUNT(DISTINCT c.id) as total_classes
            FROM students s
            JOIN enrollments e ON e.student_id = s.id
            JOIN classes c ON c.id = e.class_id
            WHERE c.education_level_id = ? AND e.school_year = ?
        `, [levelId, school_year || getCurrentSchoolYear()]);

        // Récupérer les détails des versements des élèves
        const [studentInstallments] = await pool.execute(`
            SELECT 
                s.id as student_id,
                s.first_name,
                s.last_name,
                c.name as class_name,
                i.installment_number,
                i.amount,
                i.status,
                i.due_date,
                sib.amount_paid,
                sib.balance,
                sib.is_overdue,
                sib.last_payment_date
            FROM students s
            JOIN enrollments e ON e.student_id = s.id AND e.status = 'active' AND e.school_year = ?
            JOIN classes c ON c.id = e.class_id
            JOIN installments i ON i.student_id = s.id AND i.school_year = ?
            JOIN student_installment_balances sib ON sib.installment_id = i.id AND sib.school_year = ?
            WHERE c.education_level_id = ?
            ORDER BY s.last_name, s.first_name, i.installment_number
        `, [
            school_year || getCurrentSchoolYear(),
            school_year || getCurrentSchoolYear(),
            school_year || getCurrentSchoolYear(),
            levelId
        ]);

        res.json({
            success: true,
            data: {
                level: level,
                level_installments: levelInstallments,
                student_stats: studentStats[0] || { total_students: 0, active_students: 0, total_classes: 0 },
                student_installments: studentInstallments
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des détails des versements:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des détails des versements'
        });
    }
};

// Obtenir les détails d'utilisation d'un niveau d'études
const getEducationLevelUsage = async(req, res) => {
    try {
        const { id } = req.params;

        // Récupérer les informations du niveau
        const [levelInfo] = await pool.execute(`
            SELECT id, name, description, tuition_amount, registration_fee, is_active 
            FROM education_levels 
            WHERE id = ?
        `, [id]);

        if (levelInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Niveau d\'études non trouvé'
            });
        }

        // Récupérer les classes qui utilisent ce niveau
        const [classes] = await pool.execute(`
            SELECT c.id, c.name, c.school_year, c.created_at
            FROM classes c
            WHERE c.education_level_id = ?
        `, [id]);

        // Récupérer les élèves inscrits dans ces classes
        const [students] = await pool.execute(`
            SELECT 
                s.id, 
                s.first_name, 
                s.last_name, 
                s.registration_number,
                c.name as class_name,
                e.enrollment_date,
                e.school_year,
                e.status
            FROM students s
            JOIN enrollments e ON e.student_id = s.id
            JOIN classes c ON c.id = e.class_id
            WHERE c.education_level_id = ?
            ORDER BY c.name, s.last_name, s.first_name
        `, [id]);

        // Récupérer les versements configurés pour ce niveau
        const [installments] = await pool.execute(`
            SELECT 
                li.id,
                li.installment_number,
                li.amount,
                li.percentage,
                li.due_date_offset_days,
                li.is_active
            FROM level_installments li
            WHERE li.education_level_id = ?
            ORDER BY li.installment_number
        `, [id]);

        // Statistiques des versements des élèves
        const [installmentStats] = await pool.execute(`
            SELECT 
                COUNT(*) as total_installments,
                COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_installments,
                COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_installments,
                COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_installments
            FROM installments i
            JOIN students s ON s.id = i.student_id
            JOIN enrollments e ON e.student_id = s.id
            JOIN classes c ON c.id = e.class_id
            WHERE c.education_level_id = ?
        `, [id]);

        res.json({
            success: true,
            data: {
                level: levelInfo[0],
                usage: {
                    classes_count: classes.length,
                    students_count: students.length,
                    installments_count: installments.length,
                    can_delete: classes.length === 0 && students.length === 0
                },
                classes: classes,
                students: students,
                installments: installments,
                installment_stats: installmentStats[0] || {
                    total_installments: 0,
                    paid_installments: 0,
                    pending_installments: 0,
                    overdue_installments: 0
                }
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des détails d\'utilisation:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des détails d\'utilisation'
        });
    }
};

module.exports = {
    getAllEducationLevels,
    getEducationLevelById,
    createEducationLevel,
    updateEducationLevel,
    deleteEducationLevel,
    calculateLevelInstallments,
    getLevelInstallmentsDetails,
    getEducationLevelUsage
};