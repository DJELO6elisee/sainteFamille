const pool = require('../config/database');

async function updateSubjectsTable() {
    let connection;
    try {
        connection = await pool.getConnection();

        console.log('Début de la mise à jour de la table subjects...');

        // Vérifier si la colonne type existe déjà
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM subjects LIKE 'type'
        `);

        if (columns.length === 0) {
            console.log('Ajout de la colonne type...');
            await connection.query(`
                ALTER TABLE subjects ADD COLUMN type VARCHAR(50) DEFAULT NULL AFTER name
            `);
            console.log('Colonne type ajoutée avec succès');
        } else {
            console.log('La colonne type existe déjà');
        }

        // Mettre à jour les matières existantes avec leurs types
        console.log('Mise à jour des types de matières...');

        await connection.query(`
            UPDATE subjects SET type = 'francais' 
            WHERE name IN ('Lecture', 'Expression Écrite', 'Orthographe/Dictée', 'Grammaire/Conjugaison', 'Vocabulaire', 'Exploitation de Textes', 'Français')
        `);

        await connection.query(`
            UPDATE subjects SET type = 'aem' 
            WHERE name IN ('Histoire/Géographie', 'Sciences', 'EDHC', 'Histoire', 'Géographie', 'Science')
        `);

        await connection.query(`
            UPDATE subjects SET type = 'mathematiques' 
            WHERE name IN ('Mathématiques', 'Leçon/Problème', 'Maths', 'Calcul')
        `);

        await connection.query(`
            UPDATE subjects SET type = 'langues' 
            WHERE name IN ('Anglais', 'Langue')
        `);

        await connection.query(`
            UPDATE subjects SET type = 'sport' 
            WHERE name IN ('E.P.S', 'Sport', 'Éducation Physique')
        `);

        // Insérer les matières par défaut si elles n'existent pas
        console.log('Insertion des matières par défaut...');

        const defaultSubjects = [
            ['Lecture', 'francais'],
            ['Expression Écrite', 'francais'],
            ['Orthographe/Dictée', 'francais'],
            ['Grammaire/Conjugaison', 'francais'],
            ['Vocabulaire', 'francais'],
            ['Exploitation de Textes', 'francais'],
            ['Histoire/Géographie', 'aem'],
            ['Sciences', 'aem'],
            ['EDHC', 'aem'],
            ['Mathématiques', 'mathematiques'],
            ['Leçon/Problème', 'mathematiques'],
            ['Anglais', 'langues'],
            ['E.P.S', 'sport']
        ];

        for (const [name, type] of defaultSubjects) {
            try {
                await connection.query(`
                    INSERT IGNORE INTO subjects (name, type) VALUES (?, ?)
                `, [name, type]);
            } catch (error) {
                console.log(`Matière ${name} existe déjà ou erreur:`, error.message);
            }
        }

        // Afficher le résultat final
        const [finalSubjects] = await connection.query(`
            SELECT id, name, type FROM subjects ORDER BY type, name
        `);

        console.log('Matières dans la base de données:');
        finalSubjects.forEach(subject => {
            console.log(`- ${subject.name} (type: ${subject.type || 'non défini'})`);
        });

        console.log('Mise à jour terminée avec succès !');

    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
    } finally {
        if (connection) connection.release();
        process.exit(0);
    }
}

updateSubjectsTable();