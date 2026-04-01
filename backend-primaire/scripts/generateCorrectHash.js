const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// Configuration pour l'hébergement en ligne
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'lapetite_maison',
    password: process.env.DB_PASSWORD || 'Binate2025@',
    database: process.env.DB_NAME || 'lapetite_academie',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function generateHashAndCreateAdmin() {
    try {
        console.log('🔧 Génération du hash correct pour Admin123!...\n');

        // Générer le hash correct
        const password = 'Admin123!';
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('✅ Hash généré avec succès !');
        console.log(`🔑 Mot de passe: ${password}`);
        console.log(`🔐 Hash: ${hashedPassword}\n`);

        // Vérifier si l'admin existe déjà
        const [existingUsers] = await pool.execute(
            'SELECT COUNT(*) as count FROM users WHERE email = ?', ['admin@lapetiteacademie.ci']
        );

        if (existingUsers[0].count > 0) {
            console.log('ℹ️  L\'administrateur existe déjà dans la base de données');
            console.log('🔄 Mise à jour du mot de passe...');

            // Mettre à jour le mot de passe
            await pool.execute(
                'UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'admin@lapetiteacademie.ci']
            );

            console.log('✅ Mot de passe mis à jour avec succès !');
        } else {
            console.log('🆕 Création de l\'administrateur...');

            // Insérer l'administrateur
            const [result] = await pool.execute(`
                INSERT INTO users (
                    email, 
                    first_name, 
                    last_name, 
                    contact, 
                    civilité, 
                    fonction, 
                    password, 
                    role, 
                    created_at, 
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                'admin@lapetiteacademie.ci',
                'Admin',
                'Principal',
                '+2250708022424',
                'M.',
                'Directeur',
                hashedPassword,
                'admin'
            ]);

            console.log('✅ Administrateur créé avec succès !');
        }

        console.log('\n📋 Informations de connexion :');
        console.log('📧 Email: admin@lapetiteacademie.ci');
        console.log('🔑 Mot de passe: Admin123!');
        console.log('👤 Nom: Admin Principal');
        console.log('📞 Contact: +2250708022424');
        console.log('🏢 Fonction: Directeur');
        console.log('🔐 Rôle: admin');

        // Vérifier l'insertion/mise à jour
        const [admin] = await pool.execute(
            'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE email = ?', ['admin@lapetiteacademie.ci']
        );

        if (admin.length > 0) {
            console.log('\n🎉 Vérification réussie !');
            console.log(`ID: ${admin[0].id}`);
            console.log(`Créé le: ${admin[0].created_at}`);
        }

        // Tester le hash
        console.log('\n🧪 Test du hash...');
        const isValid = await bcrypt.compare('Admin123!', hashedPassword);
        console.log(`✅ Hash valide: ${isValid}`);

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error('📋 Détails:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
generateHashAndCreateAdmin();