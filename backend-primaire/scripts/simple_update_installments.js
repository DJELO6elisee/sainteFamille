const pool = require('../config/database');

async function simpleUpdate() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Mise à jour de la table level_installments...');

        // Ajouter amount
        await connection.execute(`
            ALTER TABLE level_installments 
            ADD COLUMN amount DECIMAL(10,2) DEFAULT 0.00
        `);
        console.log('Colonne amount ajoutée');

        // Ajouter due_date
        await connection.execute(`
            ALTER TABLE level_installments 
            ADD COLUMN due_date DATE NULL
        `);
        console.log('Colonne due_date ajoutée');

        console.log('Mise à jour terminée !');
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log('Les colonnes existent déjà');
        } else {
            console.error('Erreur:', error.message);
        }
    } finally {
        if (connection) connection.release();
    }
}

simpleUpdate();




















