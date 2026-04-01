const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDatabaseForComunicateur() {
    let pool;

    try {
        console.log('🚀 Début de la mise à jour de la base de données pour le rôle "comunicateur"...');

        // Configuration de la base de données
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'lapetite_academie',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        console.log('✅ Connexion à la base de données établie');

        // 1. Vérifier la structure actuelle de la table users
        console.log('📋 Vérification de la structure actuelle...');
        const [columns] = await pool.execute("SHOW COLUMNS FROM users LIKE 'role'");
        console.log('Structure actuelle de la colonne role:', columns[0]);

        // 2. Modifier la table users pour ajouter le rôle "comunicateur"
        console.log('🔧 Modification de la table users...');
        await pool.execute(`
            ALTER TABLE users 
            MODIFY COLUMN role enum('admin','secretary','teacher','student','parent','Úducateur','comptable','comunicateur') 
            NOT NULL DEFAULT 'student'
        `);
        console.log('✅ Table users modifiée avec succès');

        // 3. Vérifier que la modification a été appliquée
        console.log('🔍 Vérification de la modification...');
        const [newColumns] = await pool.execute("SHOW COLUMNS FROM users LIKE 'role'");
        console.log('Nouvelle structure de la colonne role:', newColumns[0]);

        // 4. Afficher tous les rôles disponibles
        console.log('📊 Rôles disponibles dans la base de données:');
        const [roles] = await pool.execute("SELECT DISTINCT role FROM users ORDER BY role");
        console.log('Rôles existants:', roles.map(r => r.role));

        // 5. Optionnel: Créer un utilisateur comunicateur de test
        const createTestUser = process.argv.includes('--create-test-user');
        if (createTestUser) {
            console.log('👤 Création d\'un utilisateur comunicateur de test...');
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('test123', 10);

            await pool.execute(`
                INSERT INTO users (email, first_name, last_name, contact, civilité, fonction, password, role) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'comunicateur@lapetiteacademie.ci',
                'Test',
                'Comunicateur',
                '+2250000000000',
                'M.',
                'Comunicateur',
                hashedPassword,
                'comunicateur'
            ]);
            console.log('✅ Utilisateur comunicateur de test créé');
            console.log('   Email: comunicateur@lapetiteacademie.ci');
            console.log('   Mot de passe: test123');
        }

        console.log('\n🎉 Mise à jour de la base de données terminée avec succès!');
        console.log('✅ Le rôle "comunicateur" est maintenant disponible');
        console.log('📝 N\'oubliez pas de redémarrer le serveur backend pour que les changements prennent effet');

    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour de la base de données:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        if (pool) {
            await pool.end();
            console.log('🔌 Connexion à la base de données fermée');
        }
    }
}

// Exécuter le script
if (require.main === module) {
    updateDatabaseForComunicateur();
}

module.exports = updateDatabaseForComunicateur;