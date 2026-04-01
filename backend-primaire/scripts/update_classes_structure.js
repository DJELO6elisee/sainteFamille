const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateClassesStructure() {
    let connection;
    try {
        // Connexion à la base de données
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ecole_primaire'
        });

        console.log('🔗 Connexion à la base de données établie');

        // Vérifier si la colonne education_level_id existe
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'classes' AND COLUMN_NAME = 'education_level_id'
        `, [process.env.DB_NAME || 'ecole_primaire']);

        if (columns.length === 0) {
            console.log('📝 Ajout de la colonne education_level_id...');
            await connection.execute(`
                ALTER TABLE classes 
                ADD COLUMN education_level_id INT
            `);
        } else {
            console.log('✅ La colonne education_level_id existe déjà');
        }

        // Vérifier si la colonne school_year existe
        const [schoolYearColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'classes' AND COLUMN_NAME = 'school_year'
        `, [process.env.DB_NAME || 'ecole_primaire']);

        if (schoolYearColumns.length === 0) {
            console.log('📝 Ajout de la colonne school_year...');
            await connection.execute(`
                ALTER TABLE classes 
                ADD COLUMN school_year VARCHAR(10)
            `);
        } else {
            console.log('✅ La colonne school_year existe déjà');
        }

        // Vérifier si la clé étrangère existe
        const [foreignKeys] = await connection.execute(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'classes' AND CONSTRAINT_NAME = 'fk_classes_education_level'
        `, [process.env.DB_NAME || 'ecole_primaire']);

        if (foreignKeys.length === 0) {
            console.log('🔗 Ajout de la clé étrangère...');
            await connection.execute(`
                ALTER TABLE classes 
                ADD CONSTRAINT fk_classes_education_level 
                FOREIGN KEY (education_level_id) REFERENCES education_levels(id)
            `);
        } else {
            console.log('✅ La clé étrangère existe déjà');
        }

        // Mettre à jour les classes existantes
        const [existingClasses] = await connection.execute(`
            SELECT COUNT(*) as count FROM classes WHERE school_year IS NULL
        `);

        if (existingClasses[0].count > 0) {
            console.log('📝 Mise à jour des classes existantes...');
            await connection.execute(`
                UPDATE classes 
                SET school_year = '2024-2025' 
                WHERE school_year IS NULL
            `);
            console.log(`✅ ${existingClasses[0].count} classes mises à jour`);
        } else {
            console.log('✅ Toutes les classes ont déjà une année scolaire');
        }

        console.log('🎉 Mise à jour de la structure de la table classes terminée avec succès !');

    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Connexion fermée');
        }
    }
}

// Exécuter le script
updateClassesStructure();