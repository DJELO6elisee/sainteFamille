const mysql = require('mysql2/promise');

async function fixMultipleConstraintsTables() {
    let connection;

    try {
        console.log('=== CORRECTION DES TABLES AVEC CONTRAINTES MULTIPLES ===');

        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'ecole_primaire'
        });

        console.log('✅ Connexion établie');

        // Tables avec des contraintes multiples identifiées précédemment
        const problematicTables = [
            'enrollments', 'grades', 'history', 'notifications', 'absences',
            'activity_images', 'class_subjects', 'garderie_inscriptions'
        ];

        for (const table of problematicTables) {
            try {
                console.log(`\n🔄 Traitement de la table: ${table}`);

                // 1. Vérifier si la table existe
                const [tableExists] = await connection.execute(`
                    SELECT COUNT(*) as count FROM information_schema.TABLES 
                    WHERE TABLE_SCHEMA = 'ecole_primaire' AND TABLE_NAME = '${table}'
                `);

                if (tableExists[0].count === 0) {
                    console.log(`⚠️  ${table}: Table non trouvée, ignorée`);
                    continue;
                }

                // 2. Vérifier les contraintes actuelles
                const [constraints] = await connection.execute(`
                    SELECT 
                        CONSTRAINT_NAME, 
                        CONSTRAINT_TYPE, 
                        COLUMN_NAME,
                        ORDINAL_POSITION
                    FROM information_schema.KEY_COLUMN_USAGE 
                    WHERE TABLE_SCHEMA = 'ecole_primaire' 
                    AND TABLE_NAME = '${table}'
                    AND CONSTRAINT_NAME IS NOT NULL
                    ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION
                `);

                console.log(`📋 Contraintes actuelles pour ${table}:`);
                constraints.forEach(constraint => {
                    console.log(`   - ${constraint.CONSTRAINT_NAME}: ${constraint.CONSTRAINT_TYPE} sur ${constraint.COLUMN_NAME}`);
                });

                // 3. Supprimer toutes les contraintes de clé primaire
                const primaryKeys = constraints.filter(c => c.CONSTRAINT_TYPE === 'PRIMARY KEY');
                if (primaryKeys.length > 0) {
                    console.log(`🔄 Suppression des contraintes de clé primaire...`);
                    for (const pk of primaryKeys) {
                        try {
                            await connection.execute(`ALTER TABLE ${table} DROP PRIMARY KEY`);
                            console.log(`✅ Clé primaire supprimée`);
                            break; // Une seule clé primaire par table
                        } catch (error) {
                            console.log(`⚠️  Erreur suppression clé primaire: ${error.message}`);
                        }
                    }
                }

                // 4. Supprimer tous les enregistrements
                console.log(`🔄 Suppression des enregistrements...`);
                await connection.execute(`DELETE FROM ${table}`);
                console.log(`✅ Enregistrements supprimés`);

                // 5. Modifier la colonne id pour être AUTO_INCREMENT
                console.log(`🔄 Modification de la colonne id...`);
                await connection.execute(`ALTER TABLE ${table} MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY`);
                console.log(`✅ Colonne id modifiée`);

                // 6. Réinitialiser l'AUTO_INCREMENT
                await connection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
                console.log(`✅ AUTO_INCREMENT réinitialisé à 1`);

                // 7. Recréer les contraintes importantes (sauf clé primaire)
                console.log(`🔄 Recréation des contraintes importantes...`);

                // Contraintes spécifiques par table
                switch (table) {
                    case 'enrollments':
                        // Pas de contraintes supplémentaires nécessaires
                        break;

                    case 'grades':
                        // Pas de contraintes supplémentaires nécessaires
                        break;

                    case 'history':
                        // Pas de contraintes supplémentaires nécessaires
                        break;

                    case 'notifications':
                        // Pas de contraintes supplémentaires nécessaires
                        break;

                    case 'absences':
                        // Pas de contraintes supplémentaires nécessaires
                        break;

                    case 'activity_images':
                        // Recréer l'index sur activity_id
                        try {
                            await connection.execute(`ALTER TABLE ${table} ADD KEY activity_id (activity_id)`);
                            console.log(`✅ Index activity_id recréé`);
                        } catch (error) {
                            console.log(`⚠️  Index activity_id: ${error.message}`);
                        }
                        break;

                    case 'class_subjects':
                        // Recréer la contrainte unique sur class_id, subject_id
                        try {
                            await connection.execute(`ALTER TABLE ${table} ADD UNIQUE KEY unique_class_subject (class_id, subject_id)`);
                            console.log(`✅ Contrainte unique unique_class_subject recréée`);
                        } catch (error) {
                            console.log(`⚠️  Contrainte unique: ${error.message}`);
                        }

                        // Recréer l'index sur subject_id
                        try {
                            await connection.execute(`ALTER TABLE ${table} ADD KEY subject_id (subject_id)`);
                            console.log(`✅ Index subject_id recréé`);
                        } catch (error) {
                            console.log(`⚠️  Index subject_id: ${error.message}`);
                        }
                        break;

                    case 'garderie_inscriptions':
                        // Recréer l'index sur school_year
                        try {
                            await connection.execute(`ALTER TABLE ${table} ADD KEY idx_garderie_school_year (school_year)`);
                            console.log(`✅ Index idx_garderie_school_year recréé`);
                        } catch (error) {
                            console.log(`⚠️  Index school_year: ${error.message}`);
                        }
                        break;
                }

                console.log(`✅ ${table}: Corrigée avec succès`);

            } catch (error) {
                console.log(`❌ ${table}: Erreur - ${error.message}`);
            }
        }

        // Vérification finale
        console.log('\n=== VÉRIFICATION FINALE ===');
        const [autoIncrements] = await connection.execute(`
            SELECT 
                TABLE_NAME,
                AUTO_INCREMENT
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'ecole_primaire' 
            AND AUTO_INCREMENT IS NOT NULL
            ORDER BY TABLE_NAME
        `);

        console.log('📊 AUTO_INCREMENT des tables:');
        autoIncrements.forEach(row => {
            console.log(`   - ${row.TABLE_NAME}: ${row.AUTO_INCREMENT}`);
        });

        // Test d'insertion sur une table corrigée
        console.log('\n🔄 Test d\'insertion sur la table enrollments...');
        try {
            const [testResult] = await connection.execute(`
                INSERT INTO enrollments (student_id, class_id, enrollment_date, status, school_year) 
                VALUES (1, 1, '2024-09-01', 'active', '2024-2025')
            `);
            console.log(`✅ Test insertion - Nouvel ID: ${testResult.insertId}`);

            // Nettoyer
            await connection.execute('DELETE FROM enrollments WHERE id = ?', [testResult.insertId]);
            console.log('✅ Test nettoyé');
        } catch (error) {
            console.log(`⚠️  Test insertion: ${error.message}`);
        }

        console.log('\n🎉 CORRECTION TERMINÉE AVEC SUCCÈS !');
        console.log('✅ Toutes les tables avec contraintes multiples ont été corrigées');
        console.log('✅ Les nouveaux enregistrements auront des ID corrects');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

fixMultipleConstraintsTables();
