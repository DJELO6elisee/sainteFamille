const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const emailService = require('../services/emailService');

// Configuration pour la création d'admin
const adminData = {
    first_name: 'Admin',
    last_name: 'Principal',
    email: 'admin@lapetiteacademie.ci',
    password: 'Admin123!',
    contact: '+2250708022424',
    civilité: 'M.',
    fonction: 'Directeur',
    role: 'admin'
};

async function createAdmin() {
    try {
        console.log('🚀 Début de la création de l\'administrateur...');

        // Validation des champs requis
        if (!adminData.first_name || !adminData.last_name || !adminData.email || !adminData.password) {
            throw new Error('Tous les champs obligatoires doivent être remplis');
        }

        // Validation du rôle
        const allowedRoles = ['admin', 'secretary', 'éducateur', 'comptable', 'comunicateur'];
        if (!adminData.role || !allowedRoles.includes(adminData.role)) {
            throw new Error('Rôle invalide. Les rôles autorisés sont: admin, secretary, éducateur, comptable, comunicateur');
        }

        console.log('✅ Validation des données réussie');

        // Vérifier si l'email existe déjà
        const [existingUser] = await pool.execute(
            'SELECT id FROM users WHERE email = ?', [adminData.email]
        );

        if (existingUser.length > 0) {
            throw new Error('Un utilisateur avec cet email existe déjà');
        }

        console.log('✅ Email disponible');

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(adminData.password, 10);
        console.log('✅ Mot de passe hashé');

        // Insérer le nouvel administrateur
        const [result] = await pool.execute(
            'INSERT INTO users (first_name, last_name, email, password, contact, civilité, fonction, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
                adminData.first_name,
                adminData.last_name,
                adminData.email,
                hashedPassword,
                adminData.contact || null,
                adminData.civilité || 'M.',
                adminData.fonction || null,
                adminData.role
            ]
        );

        const adminId = result.insertId;
        console.log(`✅ Administrateur créé avec l'ID: ${adminId}`);

        // Envoyer un email avec les identifiants
        try {
            await emailService.sendAdminCredentials(
                adminData.email,
                adminData.password,
                adminData.first_name,
                adminData.last_name,
                adminData.fonction
            );
            console.log('✅ Email avec les identifiants envoyé');
        } catch (emailError) {
            console.warn('⚠️  Erreur lors de l\'envoi de l\'email:', emailError.message);
            console.log('📧 Veuillez communiquer manuellement les identifiants:');
            console.log(`   Email: ${adminData.email}`);
            console.log(`   Mot de passe: ${adminData.password}`);
        }

        console.log('\n🎉 Administrateur créé avec succès!');
        console.log('📋 Informations de connexion:');
        console.log(`   Email: ${adminData.email}`);
        console.log(`   Mot de passe: ${adminData.password}`);
        console.log(`   Rôle: ${adminData.role}`);
        console.log(`   Nom complet: ${adminData.first_name} ${adminData.last_name}`);

    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'administrateur:', error.message);
        process.exit(1);
    } finally {
        // Fermer la connexion à la base de données
        await pool.end();
        console.log('🔌 Connexion à la base de données fermée');
    }
}

// Fonction pour créer un admin personnalisé
async function createCustomAdmin(customData) {
    try {
        console.log('🚀 Début de la création d\'un administrateur personnalisé...');

        // Validation des champs requis
        if (!customData.first_name || !customData.last_name || !customData.email || !customData.password) {
            throw new Error('Tous les champs obligatoires doivent être remplis');
        }

        // Validation du rôle
        const allowedRoles = ['admin', 'secretary', 'éducateur', 'comptable', 'comunicateur'];
        if (!customData.role || !allowedRoles.includes(customData.role)) {
            throw new Error('Rôle invalide. Les rôles autorisés sont: admin, secretary, éducateur, comptable, comunicateur');
        }

        console.log('✅ Validation des données réussie');

        // Vérifier si l'email existe déjà
        const [existingUser] = await pool.execute(
            'SELECT id FROM users WHERE email = ?', [customData.email]
        );

        if (existingUser.length > 0) {
            throw new Error('Un utilisateur avec cet email existe déjà');
        }

        console.log('✅ Email disponible');

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(customData.password, 10);
        console.log('✅ Mot de passe hashé');

        // Insérer le nouvel administrateur
        const [result] = await pool.execute(
            'INSERT INTO users (first_name, last_name, email, password, contact, civilité, fonction, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
                customData.first_name,
                customData.last_name,
                customData.email,
                hashedPassword,
                customData.contact || null,
                customData.civilité || 'M.',
                customData.fonction || null,
                customData.role
            ]
        );

        const adminId = result.insertId;
        console.log(`✅ Administrateur créé avec l'ID: ${adminId}`);

        console.log('\n🎉 Administrateur personnalisé créé avec succès!');
        console.log('📋 Informations de connexion:');
        console.log(`   Email: ${customData.email}`);
        console.log(`   Mot de passe: ${customData.password}`);
        console.log(`   Rôle: ${customData.role}`);
        console.log(`   Nom complet: ${customData.first_name} ${customData.last_name}`);

    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'administrateur:', error.message);
        process.exit(1);
    } finally {
        // Fermer la connexion à la base de données
        await pool.end();
        console.log('🔌 Connexion à la base de données fermée');
    }
}

// Exporter les fonctions
module.exports = {
    createAdmin,
    createCustomAdmin
};

// Si le script est exécuté directement
if (require.main === module) {
    // Vérifier les arguments de ligne de commande
    const args = process.argv.slice(2);

    if (args.length > 0 && args[0] === '--custom') {
        // Mode interactif pour créer un admin personnalisé
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('🔧 Mode création d\'administrateur personnalisé\n');

        const customData = {};

        const questions = [
            { key: 'first_name', question: 'Prénom: ' },
            { key: 'last_name', question: 'Nom: ' },
            { key: 'email', question: 'Email: ' },
            { key: 'password', question: 'Mot de passe: ' },
            { key: 'contact', question: 'Contact (optionnel): ' },
            { key: 'civilité', question: 'Civilité (M./Mme, défaut: M.): ' },
            { key: 'fonction', question: 'Fonction (optionnel): ' },
            { key: 'role', question: 'Rôle (admin/secretary/éducateur/comptable/comunicateur): ' }
        ];

        let currentQuestion = 0;

        function askQuestion() {
            if (currentQuestion >= questions.length) {
                rl.close();
                createCustomAdmin(customData);
                return;
            }

            const q = questions[currentQuestion];
            rl.question(q.question, (answer) => {
                if (answer.trim()) {
                    customData[q.key] = answer.trim();
                }
                currentQuestion++;
                askQuestion();
            });
        }

        askQuestion();
    } else {
        // Mode par défaut - créer l'admin avec les données prédéfinies
        createAdmin();
    }
}