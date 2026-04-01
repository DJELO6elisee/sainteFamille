const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const emailService = require('../services/emailService');

const authController = {
    // Inscription
    register: async(req, res) => {
        const { email, password, role } = req.body;
        try {
            // Vérifier si l'utilisateur existe déjà - autoriser les emails dupliqués pour les parents
            if (role !== 'parent') {
                const [existingUser] = await pool.query(
                    'SELECT * FROM users WHERE email = ? AND role != ?', [email, 'parent']
                );
                if (existingUser.length > 0) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Cet email est déjà utilisé'
                    });
                }
            }

            // Hasher le mot de passe
            const hashedPassword = await bcrypt.hash(password, 10);

            // Créer l'utilisateur
            const [result] = await pool.query(
                'INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [email, hashedPassword, role]
            );

            res.status(201).json({
                status: 'success',
                message: 'Inscription réussie'
            });
        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur lors de l\'inscription'
            });
        }
    },

    // Inscription d'administrateur (réservé aux secrétaires et admins)
    registerAdmin: async(req, res) => {
        try {
            const {
                first_name,
                last_name,
                email,
                password,
                contact,
                civilité,
                fonction,
                role
            } = req.body;

            // Validation des champs requis
            if (!first_name || !last_name || !email || !password) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Tous les champs obligatoires doivent être remplis'
                });
            }

            // Validation du rôle
            const allowedRoles = ['admin', 'secretary', 'directrice', 'éducateur', 'comptable', 'comunicateur', 'informaticien'];
            if (!role || !allowedRoles.includes(role)) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Rôle invalide. Les rôles autorisés sont: admin, secretary, directrice, éducateur, comptable, comunicateur, informaticien'
                });
            }

            // Vérifier si l'email existe déjà pour les rôles administratifs (maintenir l'unicité pour admin/secretary)
            const [existingUser] = await pool.execute(
                'SELECT id FROM users WHERE email = ? AND role IN (?, ?, ?, ?, ?, ?)', [email, 'admin', 'secretary', 'éducateur', 'comptable', 'comunicateur', 'informaticien']
            );

            if (existingUser.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Un utilisateur administratif avec cet email existe déjà'
                });
            }

            // Hasher le mot de passe
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insérer le nouvel administrateur
            const [result] = await pool.execute(
                'INSERT INTO users (first_name, last_name, email, password, contact, civilité, fonction, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [first_name, last_name, email, hashedPassword, contact || null, civilité || 'M.', fonction || null, role]
            );

            const adminId = result.insertId;

            // Envoyer un email avec les identifiants
            try {
                const adminData = {
                    email,
                    first_name,
                    last_name,
                    password,
                    role,
                    contact,
                    civilité,
                    fonction
                };
                await emailService.sendAdminCredentials(adminData);
            } catch (emailError) {
                console.error('Erreur lors de l\'envoi de l\'email:', emailError);
                return res.status(201).json({
                    status: 'success',
                    message: 'Administrateur créé avec succès',
                    warning: 'L\'email avec les identifiants n\'a pas pu être envoyé. Veuillez communiquer manuellement les identifiants.'
                });
            }

            res.status(201).json({
                status: 'success',
                message: 'Administrateur créé avec succès. Un email avec les identifiants a été envoyé.'
            });

        } catch (error) {
            console.error('Erreur lors de la création de l\'administrateur:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur interne du serveur'
            });
        }
    },

    // Connexion
    login: async(req, res) => {
        const { email, password } = req.body;
        try {
            // Vérifier si l'utilisateur existe
            const [users] = await pool.query(
                'SELECT * FROM users WHERE email = ?', [email]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Email ou mot de passe incorrect'
                });
            }

            const user = users[0];

            // Vérifier le mot de passe
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Email ou mot de passe incorrect'
                });
            }

            // Générer le token JWT
            const token = jwt.sign({
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                process.env.JWT_SECRET || 'votre_secret_jwt', { expiresIn: '24h' }
            );

            res.json({
                status: 'success',
                message: 'Connexion réussie',
                data: {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role
                    }
                }
            });
        } catch (error) {
            console.error('Erreur de connexion:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur lors de la connexion'
            });
        }
    },

    // Obtenir le profil de l'utilisateur
    getProfile: async(req, res) => {
        try {
            const userId = req.user.id;
            console.log('[getProfile] Début - Utilisateur ID:', userId);

            const [user] = await pool.query(
                'SELECT id, email, role, first_name, last_name, fonction FROM users WHERE id = ?', [userId]
            );
            console.log('[getProfile] Utilisateur trouvé:', user[0]);

            if (user.length === 0) {
                console.log('[getProfile] Utilisateur non trouvé');
                return res.status(404).json({ message: 'Utilisateur non trouvé' });
            }

            let profileData = {};
            let role = user[0].role;
            console.log('[getProfile] Rôle de l\'utilisateur:', role);

            if (role === 'student') {
                const [student] = await pool.query(
                    'SELECT * FROM students WHERE user_id = ?', [userId]
                );
                console.log('[getProfile] Élève trouvé pour user_id', userId, ':', student);

                if (student.length > 0) {
                    profileData = { student: student[0] };
                    console.log('[getProfile] Données élève ajoutées au profil:', student[0]);
                } else {
                    console.log('[getProfile] AUCUN ÉLÈVE TROUVÉ pour user_id', userId);
                }
            } else if (role === 'teacher') {
                const [teacher] = await pool.query(
                    'SELECT * FROM teachers WHERE user_id = ?', [userId]
                );
                console.log('[getProfile] Professeur trouvé pour user_id', userId, ':', teacher);

                if (teacher.length > 0) {
                    profileData = { teacher: teacher[0] };
                    console.log('[getProfile] Données professeur ajoutées au profil:', teacher[0]);
                } else {
                    console.log('[getProfile] AUCUN PROFESSEUR TROUVÉ pour user_id', userId);
                }
            }

            const response = {...user[0], ...profileData };
            console.log('[getProfile] Réponse finale:', response);
            res.json({
                status: 'success',
                user: response
            });
        } catch (error) {
            console.error('[getProfile] Erreur:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Récupérer le mot de passe actuel (pour affichage)
    getCurrentPassword: async(req, res) => {
        try {
            const userId = req.user.id;

            // Vérifier que l'utilisateur existe et est un admin/secretary/comunicateur
            const [user] = await pool.query(
                'SELECT password FROM users WHERE id = ? AND role IN (?, ?, ?, ?)', [userId, 'admin', 'secretary', 'directrice', 'comunicateur']
            );

            if (user.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Utilisateur non trouvé ou non autorisé'
                });
            }

            // Pour des raisons de sécurité, nous ne pouvons pas déchiffrer le mot de passe hashé
            // Nous allons retourner un message indiquant que le mot de passe ne peut pas être affiché
            res.json({
                status: 'success',
                password: 'Le mot de passe ne peut pas être affiché pour des raisons de sécurité',
                canDisplay: false
            });
        } catch (error) {
            console.error('Erreur lors de la récupération du mot de passe:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur lors de la récupération du mot de passe'
            });
        }
    },

    // Modifier son propre profil (admin/secretary)
    updateOwnProfile: async(req, res) => {
        const userId = req.user.id;
        const { first_name, last_name, email, fonction } = req.body;

        try {
            // Vérifier que l'utilisateur existe et est un admin/secretary/comunicateur
            const [existingUser] = await pool.query(
                'SELECT * FROM users WHERE id = ? AND role IN (?, ?, ?, ?)', [userId, 'admin', 'secretary', 'directrice', 'comunicateur']
            );

            if (existingUser.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Utilisateur non trouvé ou non autorisé'
                });
            }

            // Vérifier si l'email est déjà utilisé par un autre utilisateur
            const [emailCheck] = await pool.query(
                'SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]
            );

            if (emailCheck.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cet email est déjà utilisé'
                });
            }

            // Mettre à jour le profil
            await pool.query(
                'UPDATE users SET first_name = ?, last_name = ?, email = ?, fonction = ? WHERE id = ?', [first_name, last_name, email, fonction, userId]
            );

            res.json({
                status: 'success',
                message: 'Profil mis à jour avec succès'
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du profil:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur lors de la mise à jour du profil'
            });
        }
    },

    // Vérifier le token
    verifyToken: async(req, res) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token manquant'
                });
            }

            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token manquant'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');

            // Vérifier si l'utilisateur existe toujours
            const [users] = await pool.query(
                'SELECT id, email, role FROM users WHERE id = ?', [decoded.id]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Utilisateur non trouvé'
                });
            }

            res.json({
                status: 'success',
                data: {
                    user: users[0]
                }
            });
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token invalide'
                });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    status: 'error',
                    message: 'Token expiré'
                });
            }
            res.status(500).json({
                status: 'error',
                message: 'Erreur lors de la vérification du token'
            });
        }
    },

    // Changer le mot de passe
    changePassword: async(req, res) => {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        try {
            // Vérifier l'ancien mot de passe
            const [users] = await pool.query(
                'SELECT password FROM users WHERE id = ?', [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Utilisateur non trouvé'
                });
            }

            const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
            if (!isValidPassword) {
                return res.status(401).json({
                    status: 'error',
                    message: 'Mot de passe actuel incorrect'
                });
            }

            // Hasher le nouveau mot de passe
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Mettre à jour le mot de passe
            await pool.query(
                'UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]
            );

            res.json({
                status: 'success',
                message: 'Mot de passe modifié avec succès'
            });
        } catch (error) {
            console.error('Erreur lors du changement de mot de passe:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur lors du changement de mot de passe'
            });
        }
    },

    // Connexion avec code et nom (élève ou professeur)
    loginWithCode: async(req, res) => {
        const { code, name } = req.body;
        try {
            console.log('Tentative de connexion avec code:', code, 'et nom:', name);

            // Normaliser le nom saisi (supprimer espaces multiples, trim)
            const normalizedName = name ? name.trim().replace(/\s+/g, ' ') : '';
            console.log('Nom normalisé:', normalizedName);

            // Vérifier si c'est un élève
            const [students] = await pool.query(
                'SELECT u.id, u.email, u.role, s.first_name, s.last_name FROM students s JOIN users u ON s.user_id = u.id WHERE s.student_code = ? AND (LOWER(TRIM(s.last_name)) = LOWER(?) OR LOWER(TRIM(s.first_name)) = LOWER(?))', [code, normalizedName, normalizedName]
            );
            console.log('Résultat recherche élève:', students);
            if (students.length > 0) {
                const user = students[0];
                const token = jwt.sign({ id: user.id, email: user.email, role: 'student' }, process.env.JWT_SECRET || 'votre_secret_jwt', { expiresIn: '24h' });
                console.log('Connexion élève, token:', token);
                return res.json({
                    status: 'success',
                    message: 'Connexion réussie',
                    data: {
                        token,
                        user: { id: user.id, email: user.email, role: 'student', name: user.first_name + ' ' + user.last_name }
                    }
                });
            }

            // Vérifier si c'est un professeur - Amélioration de la recherche
            const [teachers] = await pool.query(
                'SELECT u.id, u.email, u.role, t.first_name, t.last_name FROM teachers t JOIN users u ON t.user_id = u.id WHERE t.code = ? AND (LOWER(TRIM(t.last_name)) = LOWER(?) OR LOWER(TRIM(t.first_name)) = LOWER(?))', [code, normalizedName, normalizedName]
            );
            console.log('Résultat recherche professeur:', teachers);
            if (teachers.length > 0) {
                const user = teachers[0];
                const token = jwt.sign({ id: user.id, email: user.email, role: 'teacher' }, process.env.JWT_SECRET || 'votre_secret_jwt', { expiresIn: '24h' });
                console.log('Connexion professeur, token:', token, 'user:', user);
                return res.json({
                    status: 'success',
                    message: 'Connexion réussie',
                    data: {
                        token,
                        user: { id: user.id, email: user.email, role: 'teacher', name: user.first_name + ' ' + user.last_name }
                    }
                });
            }

            console.log('Aucun élève ou professeur trouvé pour ce code/nom');
            return res.status(401).json({ status: 'error', message: 'Code ou nom incorrect' });
        } catch (error) {
            console.error('Erreur de connexion (code):', error);
            res.status(500).json({ status: 'error', message: 'Erreur lors de la connexion' });
        }
    },

    // Connexion parent avec code parent et nom
    loginParentWithCode: async(req, res) => {
        let { code, name } = req.body;
        code = code ? code.trim() : '';
        name = name ? name.trim() : '';

        // Normaliser le nom saisi (supprimer espaces multiples, trim)
        const normalizedName = name ? name.trim().replace(/\s+/g, ' ') : '';

        try {
            console.log('Tentative de connexion parent avec code:', code, 'et nom:', name);
            console.log('Nom normalisé:', normalizedName);

            // Recherche insensible à la casse sur le nom et le code
            const [students] = await pool.query(
                'SELECT s.id as student_id, s.parent_first_name, s.parent_last_name, s.parent_code, s.parent_email FROM students s WHERE LOWER(s.parent_code) = LOWER(?) AND (LOWER(TRIM(s.parent_last_name)) = LOWER(?) OR LOWER(TRIM(s.parent_first_name)) = LOWER(?))', [code, normalizedName, normalizedName]
            );
            console.log('Résultat recherche parent:', students);

            if (students.length > 0) {
                const student = students[0];
                const studentId = student.student_id;

                // Chaque parent_code est unique et lié à l'ID de l'enfant
                // On n'a plus besoin de l'email parent, on utilise uniquement le parent_code et l'ID de l'enfant
                console.log('[DEBUG] Enfant trouvé - ID:', studentId, 'parent_code:', code);

                // Générer un email temporaire unique basé sur le parent_code pour la table users
                // Ce n'est qu'un identifiant technique, l'important est le student_id dans le token
                const tempEmail = `parent_${code.toLowerCase().replace(/[^a-z0-9]/g, '')}@parent.local`;

                // Chercher si un compte parent existe déjà avec cet email temporaire
                let [parentUsers] = await pool.query(
                    `SELECT u.id, u.email, u.role 
                     FROM users u 
                     WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?)) AND u.role = ? 
                     LIMIT 1`, [tempEmail, 'parent']
                );

                // Si aucun compte parent trouvé, créer un nouveau compte automatiquement
                let parentUser;
                if (parentUsers.length === 0) {
                    console.log('[DEBUG] Aucun compte parent trouvé, création d\'un nouveau compte avec email temporaire:', tempEmail);

                    // Générer un mot de passe hashé (utiliser le parent_code comme mot de passe par défaut)
                    const hashedPassword = await bcrypt.hash(code, 10);

                    // Créer le compte parent avec l'email temporaire
                    const [newParentResult] = await pool.query(
                        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [tempEmail, hashedPassword, 'parent']
                    );

                    console.log('[DEBUG] Nouveau compte parent créé avec ID:', newParentResult.insertId);

                    parentUser = {
                        id: newParentResult.insertId,
                        email: tempEmail,
                        role: 'parent'
                    };
                } else {
                    parentUser = parentUsers[0];
                    console.log('[DEBUG] Compte parent existant trouvé, ID:', parentUser.id);
                }

                // Chaque parent_code est unique et correspond à UN enfant spécifique
                // On stocke l'ID de l'enfant dans le token pour filtrer uniquement cet enfant
                // L'important est le student_id, pas l'email parent

                // Générer un token parent avec l'ID parent, le parent_code et l'ID de l'enfant
                const token = jwt.sign({
                    id: parentUser.id, // ✅ Utilise l'ID parent de la table users
                    email: parentUser.email, // Email temporaire (non utilisé pour le filtrage)
                    role: parentUser.role,
                    parent_code: code, // Code parent unique à cet enfant
                    student_id: studentId // ✅ ID unique de l'enfant - utilisé pour filtrer uniquement cet enfant
                }, process.env.JWT_SECRET || 'votre_secret_jwt', { expiresIn: '24h' });

                return res.json({
                    status: 'success',
                    message: 'Connexion parent réussie',
                    data: {
                        token,
                        user: {
                            id: parentUser.id, // ✅ ID parent correct
                            email: parentUser.email,
                            role: parentUser.role,
                            name: (student.parent_first_name || '') + ' ' + (student.parent_last_name || ''),
                            parent_code: code
                        }
                    }
                });
            }
            return res.status(401).json({ status: 'error', message: 'Code parent ou nom incorrect' });
        } catch (error) {
            console.error('Erreur de connexion parent (code):', error);
            res.status(500).json({ status: 'error', message: 'Erreur lors de la connexion parent' });
        }
    },

    // Obtenir la liste des administrateurs
    getAdmins: async(req, res) => {
        try {
            const [admins] = await pool.query(`
                SELECT id, email, first_name, last_name, contact, civilité, role, created_at
                FROM users
                WHERE role IN ('admin', 'secretary', 'directrice', 'éducateur', 'comptable', 'comunicateur', 'informaticien')
                ORDER BY created_at DESC
            `);

            res.json({
                status: 'success',
                data: admins
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des administrateurs:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur lors de la récupération des administrateurs'
            });
        }
    },

    // Modifier un administrateur
    updateAdmin: async(req, res) => {
        try {
            const { id } = req.params;
            const { first_name, last_name, email, contact, civilité, fonction, role } = req.body;

            // Validation des champs requis
            if (!first_name || !last_name || !email) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Les champs nom, prénom et email sont obligatoires'
                });
            }

            // Validation du rôle si fourni
            if (role) {
                const allowedRoles = ['admin', 'secretary', 'directrice', 'éducateur', 'comptable', 'comunicateur', 'informaticien'];
                if (!allowedRoles.includes(role)) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Rôle invalide. Les rôles autorisés sont: admin, secretary, directrice, éducateur, comptable, comunicateur, informaticien'
                    });
                }
            }

            // Vérifier si l'utilisateur existe
            const [existingUser] = await pool.execute(
                'SELECT id FROM users WHERE id = ?', [id]
            );

            if (existingUser.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Administrateur non trouvé'
                });
            }

            // Vérifier si l'email est déjà utilisé par un autre utilisateur
            const [emailCheck] = await pool.execute(
                'SELECT id FROM users WHERE email = ? AND id != ?', [email, id]
            );

            if (emailCheck.length > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cet email est déjà utilisé par un autre utilisateur'
                });
            }

            // Mettre à jour l'administrateur
            const updateFields = [];
            const updateValues = [];

            if (first_name) {
                updateFields.push('first_name = ?');
                updateValues.push(first_name);
            }
            if (last_name) {
                updateFields.push('last_name = ?');
                updateValues.push(last_name);
            }
            if (email) {
                updateFields.push('email = ?');
                updateValues.push(email);
            }
            if (contact !== undefined) {
                updateFields.push('contact = ?');
                updateValues.push(contact);
            }
            if (civilité) {
                updateFields.push('civilité = ?');
                updateValues.push(civilité);
            }
            if (fonction !== undefined) {
                updateFields.push('fonction = ?');
                updateValues.push(fonction);
            }
            if (role) {
                updateFields.push('role = ?');
                updateValues.push(role);
            }

            if (updateFields.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Aucun champ à mettre à jour'
                });
            }

            updateValues.push(id);

            const [result] = await pool.execute(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Administrateur non trouvé'
                });
            }

            res.json({
                status: 'success',
                message: 'Administrateur mis à jour avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'administrateur:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur interne du serveur'
            });
        }
    },

    // Supprimer un administrateur
    deleteAdmin: async(req, res) => {
        const { id } = req.params;

        try {
            // Vérifier que l'utilisateur existe
            const [existingUser] = await pool.query(
                'SELECT * FROM users WHERE id = ? AND role IN (?, ?, ?, ?, ?, ?)', [id, 'admin', 'secretary', 'directrice', 'éducateur', 'comptable', 'comunicateur']
            );

            if (existingUser.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Administrateur non trouvé'
                });
            }

            // Empêcher la suppression de son propre compte
            if (parseInt(id) === req.user.id) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Vous ne pouvez pas supprimer votre propre compte'
                });
            }

            // Supprimer l'administrateur
            await pool.query('DELETE FROM users WHERE id = ?', [id]);

            res.json({
                status: 'success',
                message: 'Administrateur supprimé avec succès'
            });
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur lors de la suppression'
            });
        }
    },

    // Endpoint de débogage pour diagnostiquer les problèmes de parent
    debugParentChildren: async(req, res) => {
        const { parent_code, parent_email } = req.query;

        try {
            console.log('=== DEBUG PARENT CHILDREN ===');
            console.log('Parent code recherché:', parent_code);
            console.log('Parent email recherché:', parent_email);

            // 1. Rechercher tous les élèves avec ce parent_code
            const [studentsByCode] = await pool.query(
                'SELECT id, first_name, last_name, parent_code, parent_email, registration_mode FROM students WHERE parent_code = ?', [parent_code]
            );
            console.log('Élèves trouvés par parent_code:', studentsByCode);

            // 2. Rechercher tous les élèves avec ce parent_email
            const [studentsByEmail] = await pool.query(
                'SELECT id, first_name, last_name, parent_code, parent_email, registration_mode FROM students WHERE parent_email = ?', [parent_email]
            );
            console.log('Élèves trouvés par parent_email:', studentsByEmail);

            // 3. Vérifier les inscriptions actives
            const allStudentIds = [...new Set([...studentsByCode.map(s => s.id), ...studentsByEmail.map(s => s.id)])];

            let enrollments = [];
            let parentUsers = [];
            if (allStudentIds.length > 0) {
                const [enrollmentResults] = await pool.query(
                    `SELECT student_id, class_id, status, school_year, enrollment_date 
                     FROM enrollments 
                     WHERE student_id IN (${allStudentIds.map(() => '?').join(',')}) 
                     ORDER BY student_id, school_year DESC`,
                    allStudentIds
                );
                enrollments = enrollmentResults;
                console.log('Inscriptions trouvées:', enrollments);

                // 4. Vérifier les comptes utilisateurs parents
                const [parentUserResults] = await pool.query(
                    'SELECT id, email, role FROM users WHERE email = ? AND role = "parent"', [parent_email]
                );
                parentUsers = parentUserResults;
                console.log('Comptes parents trouvés:', parentUsers);
            }

            // 5. Rechercher aussi par nom de famille (pour vérifier la logique de connexion)
            if (req.query.parent_name) {
                const [studentsByName] = await pool.query(
                    'SELECT id, first_name, last_name, parent_code, parent_email, parent_first_name, parent_last_name FROM students WHERE LOWER(parent_last_name) = LOWER(?) OR LOWER(parent_first_name) = LOWER(?)', [req.query.parent_name, req.query.parent_name]
                );
                console.log('Élèves trouvés par nom de parent:', studentsByName);
            }

            res.json({
                status: 'success',
                debug_info: {
                    students_by_code: studentsByCode,
                    students_by_email: studentsByEmail,
                    enrollments: allStudentIds.length > 0 ? enrollments : [],
                    total_unique_students: allStudentIds.length,
                    message: 'Consultez les logs du serveur pour plus de détails'
                }
            });

        } catch (error) {
            console.error('Erreur lors du débogage parent:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur lors du débogage',
                error: error.message
            });
        }
    },

    // Créer automatiquement un compte parent manquant
    createParentAccount: async(req, res) => {
        // Utiliser les paramètres de query pour faciliter l'appel
        const parent_email = req.body.parent_email || req.query.parent_email;
        const parent_code = req.body.parent_code || req.query.parent_code;

        try {
            console.log('=== CRÉATION COMPTE PARENT ===');
            console.log('Email parent:', parent_email);
            console.log('Code parent:', parent_code);

            if (!parent_email || !parent_code) {
                return res.status(400).json({
                    status: 'error',
                    message: 'parent_email et parent_code sont requis'
                });
            }

            // Vérifier si le compte parent existe déjà
            const [existingParent] = await pool.query(
                'SELECT id, email, role FROM users WHERE email = ? AND role = "parent"', [parent_email]
            );

            if (existingParent.length > 0) {
                return res.json({
                    status: 'success',
                    message: 'Le compte parent existe déjà',
                    parent_user: existingParent[0]
                });
            }

            // Vérifier qu'il y a bien un élève avec ce parent_code
            const [students] = await pool.query(
                'SELECT id, first_name, last_name, parent_first_name, parent_last_name FROM students WHERE parent_code = ? AND parent_email = ?', [parent_code, parent_email]
            );

            if (students.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Aucun élève trouvé avec ce code parent et cet email'
                });
            }

            // Créer le compte parent avec le parent_code comme mot de passe
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(parent_code, 10);

            const [result] = await pool.query(
                'INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [parent_email, hashedPassword, 'parent']
            );

            console.log('Compte parent créé avec ID:', result.insertId);

            res.json({
                status: 'success',
                message: 'Compte parent créé avec succès',
                parent_user_id: result.insertId,
                students_found: students.length,
                login_info: {
                    email: parent_email,
                    password: parent_code,
                    message: 'Utilisez le code parent comme mot de passe'
                }
            });

        } catch (error) {
            console.error('Erreur lors de la création du compte parent:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur lors de la création du compte parent',
                error: error.message
            });
        }
    },

    // Test simple pour vérifier les enfants d'un parent connecté
    testParentChildren: async(req, res) => {
        try {
            console.log('=== TEST PARENT CHILDREN ===');
            console.log('Query params:', req.query);

            const parent_code = req.query.parent_code || 'P860737';
            const parent_email = req.query.parent_email || 'dvçiko@gmail.com';

            // Test simple : récupérer tous les enfants avec ce parent_code
            const [children] = await pool.query(
                `SELECT 
                    s.id, s.first_name, s.last_name, s.parent_code, s.parent_email, s.registration_mode,
                    e.class_id, e.status as enrollment_status, e.school_year,
                    c.name as class_name
                FROM students s
                LEFT JOIN enrollments e ON s.id = e.student_id AND e.status = 'active'
                LEFT JOIN classes c ON e.class_id = c.id
                WHERE s.parent_code = ? OR s.parent_email = ?
                ORDER BY s.id`, [parent_code, parent_email]
            );

            console.log('Enfants trouvés:', children);

            res.json({
                status: 'success',
                parent_code: parent_code,
                parent_email: parent_email,
                children_found: children.length,
                children: children,
                message: 'Test réussi - consultez les logs du serveur'
            });

        } catch (error) {
            console.error('Erreur lors du test parent:', error);
            res.status(500).json({
                status: 'error',
                message: 'Erreur lors du test',
                error: error.message
            });
        }
    }
};

module.exports = authController;