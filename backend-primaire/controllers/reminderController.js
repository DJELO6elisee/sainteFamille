const pool = require('../config/database');
const { getCurrentSchoolYear } = require('../config/schoolYear');
const emailService = require('../services/emailService');
const {
    sendBulkSMS,
    smsServiceEnabled
} = require('../services/smsService');

// Fonction pour envoyer une relance de versement à un parent
const sendPaymentReminder = async(parentEmail, parentPhone, parentName, studentName, overdueInstallments, totalAmount) => {
    const schoolName = process.env.SCHOOL_NAME || 'Groupe Scolaire Bethanie';
    const smsSenderLabel = process.env.SMS_SENDER_ID || schoolName || 'GS BETHANIE MIRACLE';

    // Vérification stricte : ne relancer que pour les versements dont la date d'échéance est passée
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour comparer uniquement les dates

    const trulyOverdueInstallments = overdueInstallments.filter(installment => {
        if (!installment.due_date) {
            return false; // Pas de date d'échéance = pas de relance
        }
        const dueDate = new Date(installment.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today; // Uniquement les versements dont l'échéance est passée
    });

    // Si aucun versement n'est vraiment en retard, ne pas envoyer de relance
    if (trulyOverdueInstallments.length === 0) {
        console.log(`[REMINDER] Aucun versement en retard pour ${studentName}. Relance annulée.`);
        return {
            success: false,
            email: { success: false, error: 'Aucun versement en retard' },
            sms: { success: false, error: 'Aucun versement en retard' },
            error: 'Aucun versement en retard. Les relances ne sont envoyées que pour les versements dont la date d\'échéance est passée.'
        };
    }

    // Recalculer le montant total basé uniquement sur les versements vraiment en retard
    const recalculatedTotalAmount = trulyOverdueInstallments.reduce((sum, inst) => sum + Number(inst.balance || 0), 0);

    // Préparation des données email (HTML)
    const installmentsList = trulyOverdueInstallments.map(installment => {
        const dueDate = new Date(installment.due_date).toLocaleDateString('fr-FR');
        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; text-align: center;">${installment.installment_number}</td>
                <td style="padding: 10px; text-align: right;">${Number(installment.balance).toLocaleString('fr-FR')} FCFA</td>
                <td style="padding: 10px; text-align: center;">${dueDate}</td>
                <td style="padding: 10px; text-align: center;">
                    <span style="background-color: #ffebee; color: #d32f2f; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                        En retard
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f7fa;">
            <div style="background-color: #d32f2f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">⚠️ Relance de Paiement</h1>
                <h2 style="margin: 5px 0; font-size: 18px;">${schoolName}</h2>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <p>Bonjour ${parentName || 'Madame, Monsieur'},</p>
                
                <p>Nous vous contactons concernant les versements en retard de votre enfant <b>${studentName}</b> à <b>${schoolName}</b>.</p>
                
                <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d32f2f;">
                    <h3 style="color: #d32f2f; margin-top: 0;">📋 Versements en retard :</h3>
                    <p><strong>Montant total dû :</strong> <span style="color: #d32f2f; font-size: 18px; font-weight: bold;">${Number(recalculatedTotalAmount).toLocaleString('fr-FR')} FCFA</span></p>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="color: #333; margin-top: 0;">Détail des versements :</h4>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr style="background-color: #f5f5f5;">
                                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Versement</th>
                                <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Montant dû</th>
                                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Échéance</th>
                                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${installmentsList}
                        </tbody>
                    </table>
                </div>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <h4 style="color: #856404; margin-top: 0;">⚠️ Action requise :</h4>
                    <p style="color: #856404; margin: 0;">Veuillez régulariser ces versements dans les plus brefs délais pour éviter tout désagrément.</p>
                </div>
                
                <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
                    <h4 style="color: #2e7d32; margin-top: 0;">💡 Informations utiles :</h4>
                    <ul style="color: #2e7d32; margin: 10px 0;">
                        <li>Vous pouvez effectuer vos paiements à l'école</li>
                        <li>Pour toute question, contactez la direction</li>
                        <li>Les paiements peuvent être effectués en plusieurs fois</li>
                    </ul>
                </div>
                
                <p>Nous vous remercions de votre compréhension et de votre collaboration.</p>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    Ceci est un message automatique de relance. Pour toute question, contactez directement l'école.
                </p>
            </div>
        </div>
    `;

    let emailResult = { success: false, error: 'Aucun email parent fourni' };

    if (parentEmail) {
        const mailOptions = {
            from: process.env.MAIL_USER || 'binate@lapetiteacademie.ci',
            to: parentEmail,
            subject: `Relance de paiement - ${studentName} - ${schoolName}`,
            html: htmlContent
        };

        try {
            emailResult = await emailService.sendEmailWithRetry(mailOptions);
        } catch (error) {
            console.error('Erreur lors de l\'envoi de la relance email:', error);
            emailResult = { success: false, error: error.message };
        }
    } else {
        console.log(`[REMINDER] Aucun email parent pour ${studentName}`);
    }

    // Préparation et envoi SMS
    let smsResult = null;
    if (parentPhone) {
        if (smsServiceEnabled) {
            const formattedAmount = Number(recalculatedTotalAmount).toLocaleString('fr-FR');
            // Trouver le versement le plus ancien en retard (première échéance passée)
            const earliestOverdueInstallment = trulyOverdueInstallments.slice().sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];
            const earliestAmount = earliestOverdueInstallment ? Number(earliestOverdueInstallment.balance).toLocaleString('fr-FR') : formattedAmount;
            const earliestDueDate = earliestOverdueInstallment && earliestOverdueInstallment.due_date ? new Date(earliestOverdueInstallment.due_date).toLocaleDateString('fr-FR') : null;

            let honorific = 'Monsieur/Madame';
            let parentDisplayName = parentName;
            if (parentName) {
                const normalizedParentName = parentName.toLowerCase();
                if (normalizedParentName.includes('madame') || normalizedParentName.includes('mme')) {
                    honorific = 'Madame';
                } else if (normalizedParentName.includes('monsieur') || normalizedParentName.includes('mr') || normalizedParentName.includes('m.')) {
                    honorific = 'Monsieur';
                }
            }

            if (!parentDisplayName) {
                parentDisplayName = honorific;
            }

            const smsBodyParts = [
                `Bonjour ${parentDisplayName}, vous êtes prié de vous rendre au Groupe Scolaire Bethanie pour vous acquitter de la somme de ${earliestAmount} FCFA, montant du versement dû par votre enfant ${studentName}.`
            ];

            if (earliestDueDate) {
                smsBodyParts.push(`Première échéance en retard: ${earliestDueDate}.`);
            }

            smsBodyParts.push(`Montant total en retard: ${formattedAmount} FCFA. Merci.`);

            const smsBody = smsBodyParts.join(' ');

            try {
                smsResult = await sendBulkSMS([parentPhone], smsBody);
                console.log('[SMS][reminder] Résultat envoi:', smsResult);
            } catch (error) {
                console.error('[SMS][reminder] Erreur lors de l\'envoi:', error);
                smsResult = { success: false, error: error.message };
            }
        } else {
            console.warn('[SMS][reminder] Service SMS non configuré, envoi ignoré.');
        }
    } else {
        console.log(`[REMINDER] Aucun numéro de téléphone parent pour ${studentName}`);
    }

    const smsSuccess = smsResult && typeof smsResult.sent === 'number' ? smsResult.sent > 0 : smsResult && smsResult.success;
    const success = (emailResult && emailResult.success) || smsSuccess;
    const errorMessage = success ? undefined : (smsResult && smsResult.error) || (emailResult && emailResult.error) || 'Aucun canal de relance disponible';

    return {
        success,
        email: emailResult,
        sms: smsResult,
        error: errorMessage
    };
};

// Récupérer les versements en retard pour un élève
const getOverdueInstallmentsForStudent = async(studentId, schoolYear) => {
    try {
        const [installments] = await pool.execute(`
            SELECT 
                i.id,
                i.installment_number,
                i.amount,
                COALESCE(li.due_date, i.due_date) as due_date,
                sib.balance,
                sib.amount_paid,
                s.first_name as student_first_name,
                s.last_name as student_last_name,
                s.parent_email,
                s.parent_phone,
                s.parent_phone,
                s.parent_phone,
                s.parent_phone,
                s.parent_first_name,
                s.parent_last_name,
                c.name as class_name,
                el.name as level_name
            FROM installments i
            JOIN level_installments li ON li.id = i.level_installment_id
            JOIN student_installment_balances sib ON sib.installment_id = i.id
            JOIN students s ON s.id = i.student_id
            JOIN classes c ON c.id = i.class_id
            JOIN education_levels el ON el.id = i.education_level_id
            WHERE i.student_id = ? 
            AND DATE(COALESCE(li.due_date, i.due_date)) < CURDATE() 
            AND i.status = 'pending'
            AND sib.balance > 0
            AND sib.school_year = ?
            ORDER BY COALESCE(li.due_date, i.due_date) ASC
        `, [studentId, schoolYear]);

        return installments;
    } catch (error) {
        console.error('Erreur lors de la récupération des versements en retard:', error);
        throw error;
    }
};

// Récupérer les versements en retard pour une classe
const getOverdueInstallmentsForClass = async(classId, schoolYear) => {
    try {
        const [installments] = await pool.execute(`
            SELECT 
                i.id,
                i.installment_number,
                i.amount,
                COALESCE(li.due_date, i.due_date) as due_date,
                sib.balance,
                sib.amount_paid,
                s.id as student_id,
                s.first_name as student_first_name,
                s.last_name as student_last_name,
                s.parent_email,
                s.parent_first_name,
                s.parent_last_name,
                c.name as class_name,
                el.name as level_name
            FROM installments i
            JOIN level_installments li ON li.id = i.level_installment_id
            JOIN student_installment_balances sib ON sib.installment_id = i.id
            JOIN students s ON s.id = i.student_id
            JOIN classes c ON c.id = i.class_id
            JOIN education_levels el ON el.id = i.education_level_id
            WHERE i.class_id = ? 
            AND DATE(COALESCE(li.due_date, i.due_date)) < CURDATE() 
            AND i.status = 'pending'
            AND sib.balance > 0
            AND sib.school_year = ?
            ORDER BY s.last_name, s.first_name, COALESCE(li.due_date, i.due_date) ASC
        `, [classId, schoolYear]);

        return installments;
    } catch (error) {
        console.error('Erreur lors de la récupération des versements en retard pour la classe:', error);
        throw error;
    }
};

// Récupérer les versements en retard pour un niveau
const getOverdueInstallmentsForLevel = async(levelId, schoolYear) => {
    try {
        const [installments] = await pool.execute(`
            SELECT 
                i.id,
                i.installment_number,
                i.amount,
                COALESCE(li.due_date, i.due_date) as due_date,
                sib.balance,
                sib.amount_paid,
                s.id as student_id,
                s.first_name as student_first_name,
                s.last_name as student_last_name,
                s.parent_email,
                s.parent_first_name,
                s.parent_last_name,
                c.name as class_name,
                el.name as level_name
            FROM installments i
            JOIN level_installments li ON li.id = i.level_installment_id
            JOIN student_installment_balances sib ON sib.installment_id = i.id
            JOIN students s ON s.id = i.student_id
            JOIN classes c ON c.id = i.class_id
            JOIN education_levels el ON el.id = i.education_level_id
            WHERE i.education_level_id = ? 
            AND DATE(COALESCE(li.due_date, i.due_date)) < CURDATE() 
            AND i.status = 'pending'
            AND sib.balance > 0
            AND sib.school_year = ?
            ORDER BY c.name, s.last_name, s.first_name, COALESCE(li.due_date, i.due_date) ASC
        `, [levelId, schoolYear]);

        return installments;
    } catch (error) {
        console.error('Erreur lors de la récupération des versements en retard pour le niveau:', error);
        throw error;
    }
};

// Récupérer tous les versements en retard de l'école
const getAllOverdueInstallments = async(schoolYear) => {
    try {
        const [installments] = await pool.execute(`
            SELECT 
                i.id,
                i.installment_number,
                i.amount,
                COALESCE(li.due_date, i.due_date) as due_date,
                sib.balance,
                sib.amount_paid,
                s.id as student_id,
                s.first_name as student_first_name,
                s.last_name as student_last_name,
                s.parent_email,
                s.parent_first_name,
                s.parent_last_name,
                c.name as class_name,
                el.name as level_name
            FROM installments i
            JOIN level_installments li ON li.id = i.level_installment_id
            JOIN student_installment_balances sib ON sib.installment_id = i.id
            JOIN students s ON s.id = i.student_id
            JOIN classes c ON c.id = i.class_id
            JOIN education_levels el ON el.id = i.education_level_id
            WHERE DATE(COALESCE(li.due_date, i.due_date)) < CURDATE() 
            AND i.status = 'pending'
            AND sib.balance > 0
            AND sib.school_year = ?
            ORDER BY el.name, c.name, s.last_name, s.first_name, COALESCE(li.due_date, i.due_date) ASC
        `, [schoolYear]);

        return installments;
    } catch (error) {
        console.error('Erreur lors de la récupération de tous les versements en retard:', error);
        throw error;
    }
};

// Grouper les versements par élève
const groupInstallmentsByStudent = (installments) => {
    const grouped = {};

    installments.forEach(installment => {
        const studentId = installment.student_id;
        if (!grouped[studentId]) {
            grouped[studentId] = {
                student_id: studentId,
                student_first_name: installment.student_first_name,
                student_last_name: installment.student_last_name,
                parent_email: installment.parent_email,
                parent_first_name: installment.parent_first_name,
                parent_last_name: installment.parent_last_name,
                parent_phone: installment.parent_phone,
                class_name: installment.class_name,
                level_name: installment.level_name,
                installments: [],
                total_amount: 0
            };
        }

        grouped[studentId].installments.push({
            id: installment.id,
            installment_number: installment.installment_number,
            amount: installment.amount,
            due_date: installment.due_date,
            balance: installment.balance,
            amount_paid: installment.amount_paid
        });

        grouped[studentId].total_amount += Number(installment.balance);
    });

    return Object.values(grouped);
};

// Envoyer des relances pour un élève spécifique
const sendRemindersForStudent = async(req, res) => {
    try {
        const { studentId } = req.params;
        const { school_year } = req.query;
        const schoolYear = school_year || getCurrentSchoolYear();

        const overdueInstallments = await getOverdueInstallmentsForStudent(studentId, schoolYear);

        if (overdueInstallments.length === 0) {
            return res.json({
                success: true,
                message: 'Aucun versement en retard pour cet élève',
                data: { sent: 0, failed: 0 }
            });
        }

        const studentData = overdueInstallments[0];
        const totalAmount = overdueInstallments.reduce((sum, inst) => sum + Number(inst.balance), 0);

        const result = await sendPaymentReminder(
            studentData.parent_email,
            studentData.parent_phone,
            `${studentData.parent_first_name} ${studentData.parent_last_name}`,
            `${studentData.student_first_name} ${studentData.student_last_name}`,
            overdueInstallments,
            totalAmount
        );

        if (result.success) {
            res.json({
                success: true,
                message: 'Relance envoyée avec succès',
                data: { sent: 1, failed: 0 }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'envoi de la relance',
                error: result.error
            });
        }
    } catch (error) {
        console.error('Erreur lors de l\'envoi des relances pour l\'élève:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi des relances'
        });
    }
};

// Envoyer des relances pour une classe
const sendRemindersForClass = async(req, res) => {
    try {
        const { classId } = req.params;
        const { school_year } = req.query;
        const schoolYear = school_year || getCurrentSchoolYear();

        const overdueInstallments = await getOverdueInstallmentsForClass(classId, schoolYear);

        if (overdueInstallments.length === 0) {
            return res.json({
                success: true,
                message: 'Aucun versement en retard pour cette classe',
                data: { sent: 0, failed: 0 }
            });
        }

        const groupedStudents = groupInstallmentsByStudent(overdueInstallments);
        let sentCount = 0;
        let failedCount = 0;
        const results = [];

        for (const student of groupedStudents) {
            const result = await sendPaymentReminder(
                student.parent_email,
                student.parent_phone,
                `${student.parent_first_name} ${student.parent_last_name}`,
                `${student.student_first_name} ${student.student_last_name}`,
                student.installments,
                student.total_amount
            );

            if (result.success) {
                sentCount++;
            } else {
                failedCount++;
            }

            results.push({
                student: `${student.student_first_name} ${student.student_last_name}`,
                success: result.success,
                error: result.error
            });
        }

        res.json({
            success: true,
            message: `Relances envoyées: ${sentCount} réussies, ${failedCount} échouées`,
            data: { sent: sentCount, failed: failedCount, results }
        });
    } catch (error) {
        console.error('Erreur lors de l\'envoi des relances pour la classe:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi des relances'
        });
    }
};

// Envoyer des relances pour un niveau
const sendRemindersForLevel = async(req, res) => {
    try {
        const { levelId } = req.params;
        const { school_year } = req.query;
        const schoolYear = school_year || getCurrentSchoolYear();

        const overdueInstallments = await getOverdueInstallmentsForLevel(levelId, schoolYear);

        if (overdueInstallments.length === 0) {
            return res.json({
                success: true,
                message: 'Aucun versement en retard pour ce niveau',
                data: { sent: 0, failed: 0 }
            });
        }

        const groupedStudents = groupInstallmentsByStudent(overdueInstallments);
        let sentCount = 0;
        let failedCount = 0;
        const results = [];

        for (const student of groupedStudents) {
            const result = await sendPaymentReminder(
                student.parent_email,
                student.parent_phone,
                `${student.parent_first_name} ${student.parent_last_name}`,
                `${student.student_first_name} ${student.student_last_name}`,
                student.installments,
                student.total_amount
            );

            if (result.success) {
                sentCount++;
            } else {
                failedCount++;
            }

            results.push({
                student: `${student.student_first_name} ${student.student_last_name}`,
                success: result.success,
                error: result.error
            });
        }

        res.json({
            success: true,
            message: `Relances envoyées: ${sentCount} réussies, ${failedCount} échouées`,
            data: { sent: sentCount, failed: failedCount, results }
        });
    } catch (error) {
        console.error('Erreur lors de l\'envoi des relances pour le niveau:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi des relances'
        });
    }
};

// Envoyer des relances pour toute l'école
const sendRemindersForAllSchool = async(req, res) => {
    try {
        const { school_year } = req.query;
        const schoolYear = school_year || getCurrentSchoolYear();

        const overdueInstallments = await getAllOverdueInstallments(schoolYear);

        if (overdueInstallments.length === 0) {
            return res.json({
                success: true,
                message: 'Aucun versement en retard dans l\'école',
                data: { sent: 0, failed: 0 }
            });
        }

        const groupedStudents = groupInstallmentsByStudent(overdueInstallments);
        let sentCount = 0;
        let failedCount = 0;
        const results = [];

        for (const student of groupedStudents) {
            const result = await sendPaymentReminder(
                student.parent_email,
                student.parent_phone,
                `${student.parent_first_name} ${student.parent_last_name}`,
                `${student.student_first_name} ${student.student_last_name}`,
                student.installments,
                student.total_amount
            );

            if (result.success) {
                sentCount++;
            } else {
                failedCount++;
            }

            results.push({
                student: `${student.student_first_name} ${student.student_last_name}`,
                class: student.class_name,
                level: student.level_name,
                success: result.success,
                error: result.error
            });
        }

        res.json({
            success: true,
            message: `Relances envoyées: ${sentCount} réussies, ${failedCount} échouées`,
            data: { sent: sentCount, failed: failedCount, results }
        });
    } catch (error) {
        console.error('Erreur lors de l\'envoi des relances pour toute l\'école:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi des relances'
        });
    }
};

// Obtenir les statistiques des versements en retard
const getOverdueStatistics = async(req, res) => {
    try {
        const { school_year } = req.query;
        const schoolYear = school_year || getCurrentSchoolYear();

        // Statistiques générales
        const [generalStats] = await pool.execute(`
            SELECT 
                COUNT(DISTINCT s.id) as total_students_with_overdue,
                COUNT(i.id) as total_overdue_installments,
                SUM(sib.balance) as total_overdue_amount
            FROM installments i
            JOIN level_installments li ON li.id = i.level_installment_id
            JOIN student_installment_balances sib ON sib.installment_id = i.id
            JOIN students s ON s.id = i.student_id
            WHERE DATE(COALESCE(li.due_date, i.due_date)) < CURDATE() 
            AND i.status = 'pending'
            AND sib.balance > 0
            AND sib.school_year = ?
        `, [schoolYear]);

        // Statistiques par niveau
        const [levelStats] = await pool.execute(`
            SELECT 
                el.id,
                el.name as level_name,
                COUNT(DISTINCT s.id) as students_count,
                COUNT(i.id) as installments_count,
                SUM(sib.balance) as total_amount
            FROM installments i
            JOIN level_installments li ON li.id = i.level_installment_id
            JOIN student_installment_balances sib ON sib.installment_id = i.id
            JOIN students s ON s.id = i.student_id
            JOIN education_levels el ON el.id = i.education_level_id
            WHERE DATE(COALESCE(li.due_date, i.due_date)) < CURDATE() 
            AND i.status = 'pending'
            AND sib.balance > 0
            AND sib.school_year = ?
            GROUP BY el.id, el.name
            ORDER BY el.name
        `, [schoolYear]);

        // Statistiques par classe
        const [classStats] = await pool.execute(`
            SELECT 
                c.id,
                c.name as class_name,
                el.name as level_name,
                COUNT(DISTINCT s.id) as students_count,
                COUNT(i.id) as installments_count,
                SUM(sib.balance) as total_amount
            FROM installments i
            JOIN level_installments li ON li.id = i.level_installment_id
            JOIN student_installment_balances sib ON sib.installment_id = i.id
            JOIN students s ON s.id = i.student_id
            JOIN classes c ON c.id = i.class_id
            JOIN education_levels el ON el.id = i.education_level_id
            WHERE DATE(COALESCE(li.due_date, i.due_date)) < CURDATE() 
            AND i.status = 'pending'
            AND sib.balance > 0
            AND sib.school_year = ?
            GROUP BY c.id, c.name, el.name
            ORDER BY el.name, c.name
        `, [schoolYear]);

        res.json({
            success: true,
            data: {
                general: generalStats[0],
                by_level: levelStats,
                by_class: classStats
            }
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques'
        });
    }
};

// Récupérer les élèves en retard pour toute l'école
const getAllOverdueStudents = async(req, res) => {
    try {
        const { school_year } = req.query;
        const schoolYearToUse = school_year || getCurrentSchoolYear();

        const [overdueStudents] = await pool.execute(`
            SELECT DISTINCT
                s.id,
                s.first_name,
                s.last_name,
                s.registration_number,
                c.name as class_name,
                el.name as education_level_name,
                COUNT(i.id) as overdue_installments_count,
                SUM(sib.balance) as total_overdue_amount,
                MAX(ip.payment_date) as last_payment_date
            FROM students s
            JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
            JOIN classes c ON e.class_id = c.id
            JOIN education_levels el ON c.education_level_id = el.id
            JOIN installments i ON s.id = i.student_id AND i.school_year = ?
            JOIN level_installments li ON li.id = i.level_installment_id
            JOIN student_installment_balances sib ON sib.installment_id = i.id AND sib.school_year = ?
            LEFT JOIN installment_payments ip ON i.id = ip.installment_id AND ip.status = 'completed'
            WHERE DATE(COALESCE(li.due_date, i.due_date)) < CURDATE() 
            AND i.status = 'pending'
            AND sib.balance > 0
            GROUP BY s.id, s.first_name, s.last_name, s.registration_number, c.name, el.name
            ORDER BY total_overdue_amount DESC, s.last_name, s.first_name
        `, [schoolYearToUse, schoolYearToUse, schoolYearToUse]);

        res.json({
            success: true,
            data: overdueStudents
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des élèves en retard:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des élèves en retard'
        });
    }
};

// Récupérer les élèves en retard par niveau
const getOverdueStudentsByLevel = async(req, res) => {
    try {
        const { levelId } = req.params;
        const { school_year } = req.query;
        const schoolYearToUse = school_year || getCurrentSchoolYear();

        const [overdueStudents] = await pool.execute(`
            SELECT DISTINCT
                s.id,
                s.first_name,
                s.last_name,
                s.registration_number,
                c.name as class_name,
                el.name as education_level_name,
                COUNT(i.id) as overdue_installments_count,
                SUM(sib.balance) as total_overdue_amount,
                MAX(ip.payment_date) as last_payment_date
            FROM students s
            JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
            JOIN classes c ON e.class_id = c.id
            JOIN education_levels el ON c.education_level_id = el.id
            JOIN installments i ON s.id = i.student_id AND i.school_year = ?
            JOIN level_installments li ON li.id = i.level_installment_id
            JOIN student_installment_balances sib ON sib.installment_id = i.id AND sib.school_year = ?
            LEFT JOIN installment_payments ip ON i.id = ip.installment_id AND ip.status = 'completed'
            WHERE DATE(COALESCE(li.due_date, i.due_date)) < CURDATE() 
            AND i.status = 'pending'
            AND sib.balance > 0
            AND el.id = ?
            GROUP BY s.id, s.first_name, s.last_name, s.registration_number, c.name, el.name
            ORDER BY total_overdue_amount DESC, s.last_name, s.first_name
        `, [schoolYearToUse, schoolYearToUse, schoolYearToUse, levelId]);

        res.json({
            success: true,
            data: overdueStudents
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des élèves en retard par niveau:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des élèves en retard par niveau'
        });
    }
};

// Récupérer les élèves en retard par classe
const getOverdueStudentsByClass = async(req, res) => {
    try {
        const { classId } = req.params;
        const { school_year } = req.query;
        const schoolYearToUse = school_year || getCurrentSchoolYear();

        const [overdueStudents] = await pool.execute(`
            SELECT DISTINCT
                s.id,
                s.first_name,
                s.last_name,
                s.registration_number,
                c.name as class_name,
                el.name as education_level_name,
                COUNT(i.id) as overdue_installments_count,
                SUM(sib.balance) as total_overdue_amount,
                MAX(ip.payment_date) as last_payment_date
            FROM students s
            JOIN enrollments e ON s.id = e.student_id AND e.status = 'active' AND e.school_year = ?
            JOIN classes c ON e.class_id = c.id
            JOIN education_levels el ON c.education_level_id = el.id
            JOIN installments i ON s.id = i.student_id AND i.school_year = ?
            JOIN level_installments li ON li.id = i.level_installment_id
            JOIN student_installment_balances sib ON sib.installment_id = i.id AND sib.school_year = ?
            LEFT JOIN installment_payments ip ON i.id = ip.installment_id AND ip.status = 'completed'
            WHERE DATE(COALESCE(li.due_date, i.due_date)) < CURDATE() 
            AND i.status = 'pending'
            AND sib.balance > 0
            AND c.id = ?
            GROUP BY s.id, s.first_name, s.last_name, s.registration_number, c.name, el.name
            ORDER BY total_overdue_amount DESC, s.last_name, s.first_name
        `, [schoolYearToUse, schoolYearToUse, schoolYearToUse, classId]);

        res.json({
            success: true,
            data: overdueStudents
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des élèves en retard par classe:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des élèves en retard par classe'
        });
    }
};

module.exports = {
    sendRemindersForStudent,
    sendRemindersForClass,
    sendRemindersForLevel,
    sendRemindersForAllSchool,
    getOverdueStatistics,
    getOverdueInstallmentsForStudent,
    getOverdueInstallmentsForClass,
    getOverdueInstallmentsForLevel,
    getAllOverdueInstallments,
    getAllOverdueStudents,
    getOverdueStudentsByLevel,
    getOverdueStudentsByClass
};