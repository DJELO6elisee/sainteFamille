const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const auth = async(req, res, next) => {
    try {
        // Essayer plusieurs méthodes pour récupérer le header Authorization
        const authHeader = req.headers.authorization || req.headers.Authorization || req.get('Authorization');
        console.log('Authorization header:', authHeader);
        console.log('JWT_SECRET:', process.env.JWT_SECRET);
        console.log('URL:', req.url);

        // Bypass pour la route de test
        if (req.url.includes('/test-financial-summary')) {
            console.log('Bypass authentification pour route de test');
            return next();
        }

        if (!authHeader) {
            return res.status(401).json({ message: 'Token d\'accès manquant' });
        }

        // Extraire le token en gérant différents formats (Bearer, bearer, BEARER)
        let token = authHeader;
        if (authHeader.toLowerCase().startsWith('bearer ')) {
            token = authHeader.substring(7); // Enlever "Bearer " (7 caractères)
        } else if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else {
            token = authHeader;
        }

        // Vérifier si le token est null, undefined ou vide
        if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
            console.log('Token invalide détecté:', token);
            return res.status(401).json({ message: 'Token d\'accès invalide. Veuillez vous reconnecter.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');

        // Vérifier que l'utilisateur existe dans la base de données
        const [users] = await pool.query('SELECT id, email, role FROM users WHERE id = ?', [decoded.id]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Utilisateur non trouvé' });
        }

        // Combiner les données de la base avec celles du token (pour parent_code)
        req.user = {
            ...users[0],
            ...decoded // Cela ajoute parent_code si présent dans le token
        };
        console.log('Decoded JWT (req.user):', req.user);
        next();
    } catch (error) {
        console.error('Erreur auth middleware:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Session expirée, veuillez vous reconnecter.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Token invalide.' });
        }
        res.status(401).json({ message: 'Veuillez vous authentifier' });
    }
};

const checkRole = (roles) => {
    return (req, res, next) => {
        console.log('[checkRole]', {
            userId: req.user && req.user.id,
            userRole: req.user && req.user.role,
            requestedStudentId: req.params && req.params.id
        });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Accès non autorisé' });
        }
        next();
    };
};

module.exports = { auth, checkRole };