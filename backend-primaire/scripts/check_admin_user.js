const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function checkAdminUser() {
    let connection;

    try {
        console.log('=== VÉRIFICATION DE L\'UTILISATEUR ADMIN ===');

        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'ecole_primaire'
        });

        console.log('✅ Connexion établie');

        // 1. Vérifier l'utilisateur admin existant
        console.log('\n🔍 Vérification de l\'utilisateur admin...');
        const [users] = await connection.execute(`
            SELECT id, email, first_name, last_name, role, password, created_at 
            FROM users 
            WHERE email = 'admin@lapetiteacademie.ci'
        `);

        if (users.length === 0) {
            console.log('❌ Aucun utilisateur admin trouvé');
            return;
        }

        const admin = users[0];
        console.log('📋 Utilisateur admin trouvé:');
        console.log(`   - ID: ${admin.id}`);
        console.log(`   - Email: ${admin.email}`);
        console.log(`   - Nom: ${admin.first_name} ${admin.last_name}`);
        console.log(`   - Rôle: ${admin.role}`);
        console.log(`   - Créé le: ${admin.created_at}`);

        // 2. Tester le mot de passe
        console.log('\n🔐 Test du mot de passe...');
        const testPassword = 'Admin123!';
        const isPasswordValid = await bcrypt.compare(testPassword, admin.password);
        console.log(`   - Mot de passe "Admin123!" valide: ${isPasswordValid ? '✅ OUI' : '❌ NON'}`);

        // 3. Créer un utilisateur secretary si nécessaire
        console.log('\n👤 Vérification de l\'utilisateur secretary...');
        const [secretaryUsers] = await connection.execute(`
            SELECT id, email, first_name, last_name, role 
            FROM users 
            WHERE email = 'admin@lapetiteacademie.ci' AND role = 'secretary'
        `);

        if (secretaryUsers.length === 0) {
            console.log('🔄 Création d\'un utilisateur secretary...');

            // Hasher le mot de passe
            const hashedPassword = await bcrypt.hash('Admin123!', 10);

            // Insérer l'utilisateur secretary
            const [result] = await connection.execute(`
                INSERT INTO users (email, first_name, last_name, contact, civilité, fonction, password, role, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                'admin@lapetiteacademie.ci',
                'Admin',
                'Principal',
                '+2250708022424',
                'M.',
                'Secrétaire',
                hashedPassword,
                'secretary'
            ]);

            console.log(`✅ Utilisateur secretary créé avec l'ID: ${result.insertId}`);
        } else {
            console.log('✅ Utilisateur secretary existe déjà');
        }

        // 4. Afficher tous les utilisateurs
        console.log('\n📊 TOUS LES UTILISATEURS:');
        const [allUsers] = await connection.execute(`
            SELECT id, email, first_name, last_name, role, created_at 
            FROM users 
            ORDER BY role, id
        `);

        allUsers.forEach(user => {
            console.log(`   - ID: ${user.id}, Email: ${user.email}, Nom: ${user.first_name} ${user.last_name}, Rôle: ${user.role}`);
        });

        // 5. Instructions de connexion
        console.log('\n🔑 INSTRUCTIONS DE CONNEXION:');
        console.log('   Pour vous connecter en tant qu\'admin:');
        console.log('   - Email: admin@lapetiteacademie.ci');
        console.log('   - Mot de passe: Admin123!');
        console.log('   - Rôle: admin');
        console.log('');
        console.log('   Pour vous connecter en tant que secretary:');
        console.log('   - Email: admin@lapetiteacademie.ci');
        console.log('   - Mot de passe: Admin123!');
        console.log('   - Rôle: secretary');

        console.log('\n🎉 VÉRIFICATION TERMINÉE !');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkAdminUser();
