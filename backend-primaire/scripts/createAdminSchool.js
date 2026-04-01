const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// Configuration de la base de données
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lapetite_academie',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function createAdminSchool() {
    try {
        console.log('🔧 Création de l\'administrateur admin@school.com...\n');

        // Vérifier si l'admin existe déjà
        const [existingUsers] = await pool.execute(
            'SELECT COUNT(*) as count FROM users WHERE email = ?', ['admin@school.com']
        );

        if (existingUsers[0].count > 0) {
            console.log('ℹ️  L\'administrateur admin@school.com existe déjà dans la base de données');
            console.log('🔄 Mise à jour du mot de passe...');

            // Générer le hash correct pour "admin123"
            const password = 'admin123';
            const hashedPassword = await bcrypt.hash(password, 10);

            // Mettre à jour le mot de passe
            await pool.execute(
                'UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'admin@school.com']
            );

            console.log('✅ Mot de passe mis à jour avec succès !');
        } else {
            console.log('🆕 Création de l\'administrateur...');

            // Générer le hash correct pour "admin123"
            const password = 'admin123';
            const hashedPassword = await bcrypt.hash(password, 10);

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
                'admin@school.com',
                'Admin',
                'School',
                '+2250000000000',
                'M.',
                'Administrateur',
                hashedPassword,
                'admin'
            ]);

            console.log('✅ Administrateur créé avec succès !');
        }

        console.log('\n📋 Informations de connexion :');
        console.log('📧 Email: admin@school.com');
        console.log('🔑 Mot de passe: admin123');
        console.log('👤 Nom: Admin School');
        console.log('📞 Contact: +2250000000000');
        console.log('🏢 Fonction: Administrateur');
        console.log('🔐 Rôle: admin');

        // Vérifier l'insertion/mise à jour
        const [admin] = await pool.execute(
            'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE email = ?', ['admin@school.com']
        );

        if (admin.length > 0) {
            console.log('\n🎉 Vérification réussie !');
            console.log(`ID: ${admin[0].id}`);
            console.log(`Créé le: ${admin[0].created_at}`);
        }

        // Tester le hash
        console.log('\n🧪 Test du hash...');
        const password = 'admin123';
        const [user] = await pool.execute(
            'SELECT password FROM users WHERE email = ?', ['admin@school.com']
        );

        if (user.length > 0) {
            const isValid = await bcrypt.compare(password, user[0].password);
            console.log(`✅ Hash valide: ${isValid}`);
        }

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error('📋 Détails:', error);
    } finally {
        await pool.end();
    }
}

// Exécuter le script
createAdminSchool();