const db = require('../config/database');
const jwt = require('jsonwebtoken');

// Fonction pour récupérer l'historique des actions avec filtres
const getHistory = async(req, res) => {
    try {
        // Vérifier que l'utilisateur est admin
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : null;

        if (!token) {
            return res.status(401).json({ message: 'Token manquant' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
        if (decoded.role !== 'admin' && decoded.role !== 'secretary') {
            return res.status(403).json({ message: 'Accès refusé. Seuls l\'admin et les secrétaires peuvent voir l\'historique.' });
        }

        // Récupérer les paramètres de filtrage
        const search = req.query.search || '';
        const user = req.query.user || 'all';
        const actionType = req.query.actionType || 'all';
        const searchDate = req.query.searchDate;
        const schoolYear = req.query.school_year;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        // Construire la requête avec filtres
        let whereConditions = ['1=1'];
        let queryParams = [];

        console.log('Paramètres de filtrage:', { search, user, actionType, searchDate, schoolYear });

        // Filtre par recherche
        if (search) {
            whereConditions.push('(h.action_description LIKE ? OR h.student_name LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)');
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        // Filtre par utilisateur
        if (user !== 'all') {
            whereConditions.push('h.user_id = ?');
            queryParams.push(user);
        }

        // Filtre par type d'action
        if (actionType !== 'all') {
            whereConditions.push('h.action_type = ?');
            queryParams.push(actionType);
        }

        // Filtre par date de recherche
        if (searchDate) {
            whereConditions.push('DATE(h.created_at) = ?');
            queryParams.push(searchDate);
        }

        // Filtre par année scolaire
        if (schoolYear) {
            // Convertir l'année scolaire en dates de début et fin
            const [startYear, endYear] = schoolYear.split('-');
            const startDate = `${startYear}-09-01`; // 1er septembre de l'année de début
            const endDate = `${endYear}-08-31`; // 31 août de l'année de fin

            whereConditions.push('h.created_at >= ? AND h.created_at <= ?');
            queryParams.push(startDate, endDate);
        }

        const whereClause = whereConditions.join(' AND ');
        console.log('Clause WHERE:', whereClause);
        console.log('Paramètres:', queryParams);

        // Requête pour compter le total
        const countQuery = `
      SELECT COUNT(*) as total
      FROM history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE ${whereClause}
    `;

        // Requête principale avec pagination
        const offset = (page - 1) * limit;
        const mainQuery = `
      SELECT 
        h.id,
        h.action_type,
        h.action_description,
        h.amount,
        h.student_name,
        h.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.role as user_role
      FROM history h
      LEFT JOIN users u ON h.user_id = u.id
      WHERE ${whereClause}
      ORDER BY h.created_at DESC
      LIMIT ? OFFSET ?
    `;

        // Ajouter les paramètres de pagination
        const mainQueryParams = [...queryParams, limit, offset];

        // Exécuter les requêtes avec promesses
        try {
            console.log('Exécution de la requête de comptage...');
            const [countResults] = await db.query(countQuery, queryParams);
            console.log('Résultats du comptage:', countResults);

            console.log('Exécution de la requête principale...');
            const [results] = await db.query(mainQuery, mainQueryParams);
            console.log('Résultats principaux:', results.length, 'entrées');

            // Récupérer aussi la liste des utilisateurs pour les filtres
            const usersQuery = `
                SELECT DISTINCT u.id, CONCAT(u.first_name, ' ', u.last_name) as name, u.role
                FROM users u
                INNER JOIN history h ON u.id = h.user_id
                WHERE ${whereClause}
                ORDER BY u.first_name, u.last_name
            `;

            console.log('Exécution de la requête utilisateurs...');
            const [userResults] = await db.query(usersQuery, queryParams);
            console.log('Résultats utilisateurs:', userResults.length, 'utilisateurs');

            const total = countResults[0] ? countResults[0].total : 0;

            const response = {
                history: results,
                users: userResults,
                total: total,
                page: page,
                limit: limit,
                totalPages: Math.ceil(total / limit)
            };

            console.log('Envoi de la réponse:', response);
            res.json(response);
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            console.error('Stack trace:', error.stack);
            res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
        }
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};

// Fonction pour ajouter une entrée dans l'historique
const addHistoryEntry = async(userId, actionType, actionDescription, amount = null, studentName = null) => {
    try {
        const query = `
            INSERT INTO history (user_id, action_type, action_description, amount, student_name, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;

        const [results] = await db.query(query, [userId, actionType, actionDescription, amount, studentName]);
        return results;
    } catch (error) {
        console.error('Erreur lors de l\'ajout dans l\'historique:', error);
        throw error;
    }
};

module.exports = {
    getHistory,
    addHistoryEntry
};