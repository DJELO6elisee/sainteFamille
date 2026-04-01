const mysql = require('mysql2/promise');

async function fixClassesAutoIncrement() {
    let connection;

    try {
        console.log('=== CORRECTION DE L\'AUTO_INCREMENT DE LA TABLE CLASSES ===');

        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'ecole_primaire'
        });

        console.log('✅ Connexion établie');

        // 1. Vérifier la structure actuelle
        console.log('\n🔍 Structure actuelle de la table classes:');
        const [structure] = await connection.execute('DESCRIBE classes');
        console.table(structure);

        // 2. Vérifier les données actuelles
        console.log('\n📋 Classes actuelles:');
        const [currentClasses] = await connection.execute('SELECT * FROM classes ORDER BY id');
        console.table(currentClasses);

        // 3. Supprimer la classe avec ID 0
        console.log('\n🗑️ Suppression de la classe avec ID 0...');
        await connection.execute('DELETE FROM classes WHERE id = 0');
        console.log('✅ Classe avec ID 0 supprimée');

        // 4. Vérifier et corriger l'AUTO_INCREMENT
        console.log('\n🔧 Correction de l\'AUTO_INCREMENT...');

        // Vérifier si la colonne id est AUTO_INCREMENT
        const [idColumn] = await connection.execute(`
            SELECT COLUMN_NAME, EXTRA 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'ecole_primaire' 
            AND TABLE_NAME = 'classes' 
            AND COLUMN_NAME = 'id'
        `);

        console.log('Colonne id:', idColumn[0]);

        if (!idColumn[0].EXTRA.includes('auto_increment')) {
            console.log('🔄 Modification de la colonne id en AUTO_INCREMENT...');

            // Supprimer la clé primaire existante
            await connection.execute('ALTER TABLE classes DROP PRIMARY KEY');
            console.log('✅ Clé primaire supprimée');

            // Modifier la colonne id pour être AUTO_INCREMENT PRIMARY KEY
            await connection.execute(`
                ALTER TABLE classes 
                MODIFY id INT(11) NOT NULL AUTO_INCREMENT PRIMARY KEY
            `);
            console.log('✅ Colonne id modifiée en AUTO_INCREMENT PRIMARY KEY');
        } else {
            console.log('ℹ️  La colonne id est déjà AUTO_INCREMENT');
        }

        // 5. Réinitialiser l'AUTO_INCREMENT
        console.log('\n🔄 Réinitialisation de l\'AUTO_INCREMENT...');
        await connection.execute('ALTER TABLE classes AUTO_INCREMENT = 1');
        console.log('✅ AUTO_INCREMENT réinitialisé à 1');

        // 6. Recréer la classe TPS A
        console.log('\n🔄 Recréation de la classe TPS A...');
        const [result] = await connection.execute(`
            INSERT INTO classes (name, education_level_id, academic_year, amount, cantine_amount)
            VALUES (?, ?, ?, 0, 0)
        `, ['TPS A', 1, '2025-2026']);

        console.log(`✅ Classe TPS A recréée avec l'ID: ${result.insertId}`);

        // 7. Vérifier le résultat
        console.log('\n📋 Classes après correction:');
        const [finalClasses] = await connection.execute(`
            SELECT c.id, c.name, c.education_level_id, el.name as education_level_name
            FROM classes c
            LEFT JOIN education_levels el ON el.id = c.education_level_id
            ORDER BY c.id
        `);
        console.table(finalClasses);

        // 8. Test d'insertion pour vérifier l'AUTO_INCREMENT
        console.log('\n🧪 Test d\'insertion...');
        const [testResult] = await connection.execute(`
            INSERT INTO classes (name, education_level_id, academic_year, amount, cantine_amount)
            VALUES (?, ?, ?, 0, 0)
        `, ['Test Class', 2, '2025-2026']);

        console.log(`✅ Test - Nouvelle classe créée avec l'ID: ${testResult.insertId}`);

        // Nettoyer la classe de test
        await connection.execute('DELETE FROM classes WHERE id = ?', [testResult.insertId]);
        console.log('✅ Classe de test supprimée');

        console.log('\n🎉 CORRECTION TERMINÉE AVEC SUCCÈS !');
        console.log('✅ L\'AUTO_INCREMENT de la table classes fonctionne maintenant correctement');
        console.log('✅ Les nouvelles classes auront des ID corrects (1, 2, 3, etc.)');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

fixClassesAutoIncrement();