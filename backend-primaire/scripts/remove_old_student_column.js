const mysql = require('mysql2/promise');
require('dotenv').config();

async function removeOldStudentColumn() {
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

        // Vérifier si la colonne is_old_student existe
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'is_old_student'
        `, [process.env.DB_NAME || 'ecole_primaire']);

        if (columns.length > 0) {
            console.log('📝 Suppression de la colonne is_old_student...');
            await connection.execute(`
                ALTER TABLE students 
                DROP COLUMN is_old_student
            `);
            console.log('✅ Colonne is_old_student supprimée avec succès');
        } else {
            console.log('✅ La colonne is_old_student n\'existe pas déjà');
        }

        // Vérifier si la colonne amount_old_students existe dans la table classes
        const [classColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'classes' AND COLUMN_NAME = 'amount_old_students'
        `, [process.env.DB_NAME || 'ecole_primaire']);

        if (classColumns.length > 0) {
            console.log('📝 Suppression de la colonne amount_old_students...');
            await connection.execute(`
                ALTER TABLE classes 
                DROP COLUMN amount_old_students
            `);
            console.log('✅ Colonne amount_old_students supprimée avec succès');
        } else {
            console.log('✅ La colonne amount_old_students n\'existe pas déjà');
        }

        console.log('🎉 Nettoyage de la base de données terminé avec succès !');

    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Connexion fermée');
        }
    }
}

// Exécuter le script
removeOldStudentColumn();