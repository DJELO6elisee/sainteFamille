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

async function createDefaultAdmin() {
    try {
        console.log('🔧 Création de l\'administrateur par défaut...\n');

        // Vérifier si l'admin existe déjà
        const [existingUsers] = await pool.execute(
            'SELECT COUNT(*) as count FROM users WHERE email = ?', ['admin@lapetiteacademie.ci']
        );

        if (existingUsers[0].count > 0) {
            console.log('ℹ️  L\'administrateur existe déjà dans la base de données');
            return;
        }

        // Utiliser le hash pré-calculé pour "Admin123!"
        const hashedPassword = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

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
        console.log('📧 Email: admin@lapetiteacademie.ci');
        console.log('🔑 Mot de passe: Admin123!');
        console.log('👤 Nom: Admin Principal');
        console.log('📞 Contact: +2250708022424');
        console.log('🏢 Fonction: Directeur');
        console.log('🔐 Rôle: admin');

        // Vérifier l'insertion
        const [newAdmin] = await pool.execute(
            'SELECT id, email, first_name, last_name, role, created_at FROM users WHERE email = ?', ['admin@lapetiteacademie.ci']
        );

        if (newAdmin.length > 0) {
            console.log('\n🎉 Vérification réussie !');
            console.log(`ID: ${newAdmin[0].id}`);
            console.log(`Créé le: ${newAdmin[0].created_at}`);
        }

    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'administrateur:', error.message);
        if (error.code === 'ER_DUP_ENTRY') {
            console.log('ℹ️  L\'administrateur existe déjà');
        }
    } finally {
        // Fermer la connexion
        await pool.end();
    }
}

// Exécuter le script
createDefaultAdmin();