const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const verifyToken = (roles) => {
    return async(req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            console.log('[authMiddleware] Authorization header:', authHeader);
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.log('[authMiddleware] Pas de header ou mauvais format');
                return res.status(401).json({ message: 'Authentification requise.' });
            }

            const token = authHeader.split(' ')[1];
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
                console.log('[authMiddleware] Token décodé:', decoded);
            } catch (err) {
                console.log('[authMiddleware] Erreur de décodage JWT:', err);
                throw err;
            }

            const [users] = await pool.query('SELECT id, role FROM users WHERE id = ?', [decoded.id]);
            console.log('[authMiddleware] Utilisateur trouvé en base:', users);

            if (users.length === 0) {
                console.log('[authMiddleware] Utilisateur non trouvé');
                return res.status(401).json({ message: 'Utilisateur non trouvé.' });
            }

            const user = users[0];
            console.log('[authMiddleware] Rôle utilisateur:', user.role, '| Rôles autorisés:', roles);

            if (roles && !roles.includes(user.role)) {
                console.log('[authMiddleware] Accès refusé: rôle non autorisé');
                return res.status(403).json({ message: 'Accès non autorisé.' });
            }

            req.user = user;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Session expirée, veuillez vous reconnecter.' });
            }
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Token invalide.' });
            }
            res.status(500).json({ message: "Erreur interne du serveur lors de l'authentification." });
        }
    };
};

const isAdminOrSecretary = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'secretary' || req.user.role === 'directrice' || req.user.role === 'comunicateur') {
        return next();
    }
    return res.status(403).json({ message: "Accès réservé à l'administration." });
};

// Middleware d'authentification simple (sans vérification de rôle)
const auth = verifyToken();

// Middleware de vérification de rôle
const checkRole = (roles) => {
    return verifyToken(roles);
};

exports.verifyToken = verifyToken();
exports.isAdminOrSecretary = isAdminOrSecretary;
exports.auth = auth;
exports.checkRole = checkRole;