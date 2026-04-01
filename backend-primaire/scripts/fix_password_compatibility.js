const mysql = require('mysql2/promise');
const bcryptjs = require('bcryptjs'); // Utiliser la même bibliothèque que le contrôleur

async function fixPasswordCompatibility() {
    let connection;

    try {
        console.log('=== CORRECTION DE LA COMPATIBILITÉ DES MOTS DE PASSE ===');

        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'ecole_primaire'
        });

        console.log('✅ Connexion établie');

        // 1. Vérifier les utilisateurs existants
        console.log('\n🔍 Vérification des utilisateurs existants...');
        const [users] = await connection.execute(`
            SELECT id, email, first_name, last_name, role, password, created_at 
            FROM users 
            ORDER BY id
        `);

        console.log('📋 Utilisateurs trouvés:');
        users.forEach(user => {
            console.log(`   - ID: ${user.id}, Email: ${user.email}, Rôle: ${user.role}, Créé: ${user.created_at}`);
        });

        // 2. Corriger les mots de passe avec bcryptjs
        console.log('\n🔐 Correction des mots de passe...');
        const password = 'Admin123!';

        for (const user of users) {
            try {
                // Hasher le mot de passe avec bcryptjs (même bibliothèque que le contrôleur)
                const hashedPassword = await bcryptjs.hash(password, 10);

                // Mettre à jour le mot de passe
                await connection.execute(`
                    UPDATE users 
                    SET password = ?, updated_at = NOW() 
                    WHERE id = ?
                `, [hashedPassword, user.id]);

                console.log(`✅ ${user.email} (${user.role}): Mot de passe corrigé`);

                // Tester le mot de passe
                const isValid = await bcryptjs.compare(password, hashedPassword);
                console.log(`   - Test mot de passe: ${isValid ? '✅ VALIDE' : '❌ INVALIDE'}`);

            } catch (error) {
                console.log(`❌ ${user.email}: Erreur - ${error.message}`);
            }
        }

        // 3. Test de connexion simulé
        console.log('\n🧪 Test de connexion simulé...');
        for (const user of users) {
            try {
                // Récupérer le mot de passe hashé
                const [userData] = await connection.execute(`
                    SELECT password FROM users WHERE id = ?
                `, [user.id]);

                if (userData.length > 0) {
                    const isValid = await bcryptjs.compare(password, userData[0].password);
                    console.log(`   - ${user.email} (${user.role}): ${isValid ? '✅ CONNEXION OK' : '❌ CONNEXION ÉCHOUÉE'}`);
                }
            } catch (error) {
                console.log(`❌ ${user.email}: Erreur test - ${error.message}`);
            }
        }

        // 4. Instructions finales
        console.log('\n🔑 INSTRUCTIONS DE CONNEXION:');
        console.log('   Email: admin@lapetiteacademie.ci');
        console.log('   Mot de passe: Admin123!');
        console.log('   Rôles disponibles: admin, secretary');
        console.log('');
        console.log('   Testez la connexion avec:');
        console.log('   - Rôle: admin (pour accès administrateur)');
        console.log('   - Rôle: secretary (pour accès secrétaire)');

        console.log('\n🎉 CORRECTION TERMINÉE !');
        console.log('✅ Tous les mots de passe sont maintenant compatibles avec bcryptjs');
        console.log('✅ La connexion devrait maintenant fonctionner');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

fixPasswordCompatibility();
