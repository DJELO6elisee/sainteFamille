const mysql = require('mysql2/promise');

async function createEducationLevelsTable() {
    let connection;

    try {
        console.log('=== CRÉATION DE LA TABLE education_levels DANS ecole_primaire ===');

        // Connexion à la base de données ecole_primaire
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'ecole_primaire',
            multipleStatements: true
        });

        console.log('✅ Connexion à la base de données ecole_primaire établie');

        // Supprimer la table si elle existe
        console.log('🔄 Suppression de la table education_levels si elle existe...');
        await connection.execute('DROP TABLE IF EXISTS `education_levels`');
        console.log('✅ Table education_levels supprimée (si elle existait)');

        // Créer la table education_levels
        console.log('🔄 Création de la table education_levels...');
        await connection.execute(`
            CREATE TABLE \`education_levels\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`name\` varchar(100) NOT NULL COMMENT 'Nom du niveau (ex: Petite Section, CP, CE1, etc.)',
              \`code\` varchar(20) NOT NULL UNIQUE COMMENT 'Code unique du niveau (ex: PS, CP, CE1)',
              \`description\` text DEFAULT NULL COMMENT 'Description du niveau',
              \`tuition_amount\` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Montant de la scolarité annuelle (inclut les frais d\\'inscription)',
              \`registration_fee\` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Frais d\\'inscription (payés en un bloc à l\\'inscription)',
              \`cantine_amount\` decimal(10,2) DEFAULT 0.00 COMMENT 'Montant cantine par trimestre',
              \`is_active\` tinyint(1) DEFAULT 1 COMMENT 'Niveau actif ou non',
              \`order_index\` int(11) DEFAULT 0 COMMENT 'Ordre d\\'affichage',
              \`created_at\` timestamp NOT NULL DEFAULT current_timestamp(),
              \`updated_at\` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (\`id\`),
              UNIQUE KEY \`code\` (\`code\`),
              KEY \`idx_education_levels_active\` (\`is_active\`),
              KEY \`idx_education_levels_order\` (\`order_index\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log('✅ Table education_levels créée avec succès');

        // Insérer les données de base
        console.log('🔄 Insertion des données de base...');
        await connection.execute(`
            INSERT INTO \`education_levels\` (\`name\`, \`code\`, \`description\`, \`tuition_amount\`, \`registration_fee\`, \`cantine_amount\`, \`is_active\`, \`order_index\`) VALUES
            ('Toute Petite Section', 'TPS', 'Niveau maternel pour les 2-3 ans', 1235000.00, 50000.00, 500000.00, 1, 1),
            ('Petite Section', 'PS', 'Niveau maternel pour les 3-4 ans', 1235000.00, 50000.00, 500000.00, 1, 2),
            ('Moyenne Section', 'MS', 'Niveau maternel pour les 4-5 ans', 1235000.00, 50000.00, 500000.00, 1, 3),
            ('Grande Section', 'GS', 'Niveau maternel pour les 5-6 ans', 1385000.00, 50000.00, 500000.00, 1, 4),
            ('Cours Préparatoire', 'CP', 'Première année du primaire', 1500000.00, 75000.00, 500000.00, 1, 5),
            ('Cours Élémentaire 1', 'CE1', 'Deuxième année du primaire', 1500000.00, 75000.00, 500000.00, 1, 6),
            ('Cours Élémentaire 2', 'CE2', 'Troisième année du primaire', 1500000.00, 75000.00, 500000.00, 1, 7),
            ('Cours Moyen 1', 'CM1', 'Quatrième année du primaire', 1500000.00, 75000.00, 500000.00, 1, 8),
            ('Cours Moyen 2', 'CM2', 'Cinquième année du primaire', 1500000.00, 75000.00, 500000.00, 1, 9)
        `);
        console.log('✅ Données de base insérées avec succès');

        // Insérer les versements par défaut
        console.log('🔄 Insertion des versements par défaut...');
        await connection.execute(`
            INSERT INTO \`level_installments\` (\`education_level_id\`, \`installment_number\`, \`percentage\`, \`due_date_offset_days\`) 
            SELECT el.id, 1, 40.00, 0 FROM \`education_levels\` el
        `);
        await connection.execute(`
            INSERT INTO \`level_installments\` (\`education_level_id\`, \`installment_number\`, \`percentage\`, \`due_date_offset_days\`) 
            SELECT el.id, 2, 30.00, 90 FROM \`education_levels\` el
        `);
        await connection.execute(`
            INSERT INTO \`level_installments\` (\`education_level_id\`, \`installment_number\`, \`percentage\`, \`due_date_offset_days\`) 
            SELECT el.id, 3, 30.00, 180 FROM \`education_levels\` el
        `);
        console.log('✅ Versements par défaut insérés avec succès');

        // Vérifier les tables
        console.log('\n=== VÉRIFICATION FINALE ===');

        const [educationLevels] = await connection.execute('SELECT COUNT(*) as count FROM education_levels');
        console.log(`📊 Niveaux d'études créés: ${educationLevels[0].count}`);

        const [levelInstallments] = await connection.execute('SELECT COUNT(*) as count FROM level_installments');
        console.log(`📊 Versements configurés: ${levelInstallments[0].count}`);

        // Afficher les niveaux créés
        const [levels] = await connection.execute('SELECT name, code, tuition_amount, registration_fee FROM education_levels ORDER BY order_index');
        console.log('\n📋 Niveaux d\'études créés:');
        levels.forEach(level => {
            console.log(`   - ${level.name} (${level.code}): ${level.tuition_amount.toLocaleString('fr-FR')} FCFA (inscription: ${level.registration_fee.toLocaleString('fr-FR')} FCFA)`);
        });

        console.log('\n🎉 CRÉATION TERMINÉE AVEC SUCCÈS !');

    } catch (error) {
        console.error('❌ ERREUR lors de l\'exécution du script:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Connexion à la base de données fermée');
        }
    }
}

// Exécuter le script
createEducationLevelsTable();