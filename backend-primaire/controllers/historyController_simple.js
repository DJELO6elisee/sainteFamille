const db = require('../config/database');
const jwt = require('jsonwebtoken');

// Version simplifiée du contrôleur d'historique
const getHistorySimple = async(req, res) => {
    try {
        console.log('=== Début getHistorySimple ===');
        
        // Vérifier que l'utilisateur est admin
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : null;

        if (!token) {
            console.log('Token manquant');
            return res.status(401).json({ message: 'Token manquant' });
        }

        console.log('Token trouvé, vérification...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
        console.log('Token décodé:', decoded);
        
        if (decoded.role !== 'admin') {
            console.log('Rôle non admin:', decoded.role);
            return res.status(403).json({ message: 'Accès refusé. Seul l\'admin peut voir l\'historique.' });
        }

        console.log('Authentification réussie, récupération des données...');

        // Requête simple pour récupérer l'historique
        const [results] = await db.query(`
            SELECT 
                h.id,
                h.action_type,
                h.action_description,
                h.amount,
                h.student_name,
                h.created_at,
                u.name as user_name,
                u.role as user_role
            FROM history h
            LEFT JOIN users u ON h.user_id = u.id
            ORDER BY h.created_at DESC
            LIMIT 20
        `);

        console.log('Résultats récupérés:', results.length);

        res.json({
            history: results,
            users: [],
            total: results.length,
            page: 1,
            limit: 20,
            totalPages: 1
        });

    } catch (error) {
        console.error('Erreur dans getHistorySimple:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
    }
};

module.exports = {
    getHistorySimple
}; 