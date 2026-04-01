const pool = require('../config/database');

// Récupérer les statistiques du tableau de bord
const getDashboardStats = async(req, res) => {
    try {
        const { school_year } = req.query;
        const currentYear = school_year || '2025-2026';

        // Récupérer le nombre d'élèves
        const [studentsResult] = await pool.query(
            'SELECT COUNT(*) as count FROM students WHERE school_year = ?', [currentYear]
        );
        const studentsCount = studentsResult[0].count;

        // Récupérer le nombre de classes
        const [classesResult] = await pool.query(
            'SELECT COUNT(*) as count FROM classes WHERE school_year = ?', [currentYear]
        );
        const classesCount = classesResult[0].count;

        // Récupérer les statistiques des paiements
        const [paymentsResult] = await pool.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid
            FROM payments 
            WHERE school_year = ?`, [currentYear]
        );
        const paymentsStats = {
            total: paymentsResult[0].total || 0,
            paid: paymentsResult[0].paid || 0
        };

        // Récupérer le nombre d'événements
        const [eventsResult] = await pool.query(
            'SELECT COUNT(*) as count FROM events WHERE school_year = ?', [currentYear]
        );
        const eventsCount = eventsResult[0].count;

        // Récupérer les tâches récentes
        const [tasksResult] = await pool.query(
            `SELECT 
                id,
                title,
                description,
                status,
                created_at,
                updated_at
            FROM tasks 
            WHERE school_year = ?
            ORDER BY created_at DESC
            LIMIT 5`, [currentYear]
        );

        res.json({
            success: true,
            stats: {
                students: studentsCount,
                classes: classesCount,
                payments: paymentsStats,
                events: eventsCount
            },
            recentTasks: tasksResult
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques du tableau de bord:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques',
            error: error.message
        });
    }
};

// Récupérer les statistiques des paiements
const getPaymentStats = async(req, res) => {
    try {
        const { school_year } = req.query;
        const currentYear = school_year || '2025-2026';

        const [result] = await pool.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM payments 
            WHERE school_year = ?`, [currentYear]
        );

        res.json({
            success: true,
            stats: {
                total: result[0].total || 0,
                paid: result[0].paid || 0,
                pending: result[0].pending || 0,
                cancelled: result[0].cancelled || 0
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques de paiement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques de paiement',
            error: error.message
        });
    }
};

// Récupérer les statistiques des élèves
const getStudentStats = async(req, res) => {
    try {
        const { school_year } = req.query;
        const currentYear = school_year || '2025-2026';

        // Statistiques par niveau
        const [levelStats] = await pool.query(
            `SELECT 
                level,
                COUNT(*) as count
            FROM students 
            WHERE school_year = ?
            GROUP BY level`, [currentYear]
        );

        // Statistiques par genre
        const [genderStats] = await pool.query(
            `SELECT 
                gender,
                COUNT(*) as count
            FROM students 
            WHERE school_year = ?
            GROUP BY gender`, [currentYear]
        );

        // Total des élèves
        const [totalResult] = await pool.query(
            'SELECT COUNT(*) as total FROM students WHERE school_year = ?', [currentYear]
        );

        res.json({
            success: true,
            stats: {
                total: totalResult[0].total || 0,
                byLevel: levelStats,
                byGender: genderStats
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques des élèves:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques des élèves',
            error: error.message
        });
    }
};

// Récupérer les statistiques des classes
const getClassStats = async(req, res) => {
    try {
        const { school_year } = req.query;
        const currentYear = school_year || '2025-2026';

        const [result] = await pool.query(
            `SELECT 
                COUNT(*) as total,
                COUNT(DISTINCT level) as levels,
                COUNT(DISTINCT teacher_id) as teachers
            FROM classes 
            WHERE school_year = ?`, [currentYear]
        );

        res.json({
            success: true,
            stats: {
                total: result[0].total || 0,
                levels: result[0].levels || 0,
                teachers: result[0].teachers || 0
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques des classes:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des statistiques des classes',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardStats,
    getPaymentStats,
    getStudentStats,
    getClassStats
};