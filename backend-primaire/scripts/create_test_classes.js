const mysql = require('mysql2/promise');

async function createTestClasses() {
    let connection;

    try {
        console.log('=== CRÉATION DE CLASSES DE TEST ===');

        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'ecole_primaire'
        });

        console.log('✅ Connexion établie');

        // Récupérer les niveaux d'éducation
        const [educationLevels] = await connection.execute('SELECT id, name FROM education_levels ORDER BY order_index');
        console.log('📋 Niveaux d\'éducation disponibles:');
        educationLevels.forEach(level => {
            console.log(`   - ID: ${level.id}, Nom: ${level.name}`);
        });

        // Créer des classes de test pour chaque niveau
        const testClasses = [
            { name: 'TPS A', level_name: 'Toute Petite Section', academic_year: '2025-2026' },
            { name: 'PS A', level_name: 'Petite Section', academic_year: '2025-2026' },
            { name: 'PS B', level_name: 'Petite Section', academic_year: '2025-2026' },
            { name: 'MS A', level_name: 'Moyenne Section', academic_year: '2025-2026' },
            { name: 'MS B', level_name: 'Moyenne Section', academic_year: '2025-2026' },
            { name: 'GS A', level_name: 'Grande Section', academic_year: '2025-2026' },
            { name: 'GS B', level_name: 'Grande Section', academic_year: '2025-2026' },
            { name: 'CP A', level_name: 'Cours Préparatoire', academic_year: '2025-2026' },
            { name: 'CP B', level_name: 'Cours Préparatoire', academic_year: '2025-2026' },
            { name: 'CE1 A', level_name: 'Cours Élémentaire 1', academic_year: '2025-2026' },
            { name: 'CE1 B', level_name: 'Cours Élémentaire 1', academic_year: '2025-2026' },
            { name: 'CE2 A', level_name: 'Cours Élémentaire 2', academic_year: '2025-2026' },
            { name: 'CM1 A', level_name: 'Cours Moyen 1', academic_year: '2025-2026' },
            { name: 'CM2 A', level_name: 'Cours Moyen 2', academic_year: '2025-2026' }
        ];

        console.log('\n🔄 Création des classes de test...');
        let createdCount = 0;

        for (const testClass of testClasses) {
            // Trouver le niveau d'éducation correspondant
            const educationLevel = educationLevels.find(level =>
                level.name === testClass.level_name
            );

            if (educationLevel) {
                try {
                    await connection.execute(`
                        INSERT INTO classes (name, education_level_id, academic_year, amount, cantine_amount)
                        VALUES (?, ?, ?, 0, 0)
                    `, [testClass.name, educationLevel.id, testClass.academic_year]);

                    console.log(`✅ Classe créée: ${testClass.name} (${testClass.level_name}) → Niveau ID: ${educationLevel.id}`);
                    createdCount++;
                } catch (error) {
                    if (error.code === 'ER_DUP_ENTRY') {
                        console.log(`ℹ️  Classe déjà existante: ${testClass.name}`);
                    } else {
                        console.log(`❌ Erreur pour ${testClass.name}: ${error.message}`);
                    }
                }
            } else {
                console.log(`⚠️  Niveau non trouvé pour: ${testClass.level_name}`);
            }
        }

        console.log(`\n📊 ${createdCount} classes créées`);

        // Vérifier les classes créées
        console.log('\n📋 Classes avec education_level_id:');
        const [classes] = await connection.execute(`
            SELECT c.id, c.name, c.education_level_id, el.name as education_level_name
            FROM classes c
            LEFT JOIN education_levels el ON el.id = c.education_level_id
            ORDER BY el.order_index, c.name
        `);
        console.table(classes);

        console.log('\n🎉 CRÉATION TERMINÉE AVEC SUCCÈS !');
        console.log('✅ Classes de test créées avec les bons education_level_id');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

createTestClasses();