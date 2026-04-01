const mysql = require('mysql2/promise');

async function addEducationLevelIdToClasses() {
    let connection;

    try {
        console.log('=== AJOUT DE education_level_id À LA TABLE CLASSES ===');

        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'ecole_primaire'
        });

        console.log('✅ Connexion établie');

        // 1. Vérifier la structure actuelle de la table classes
        console.log('\n🔍 Structure actuelle de la table classes:');
        const [currentStructure] = await connection.execute('DESCRIBE classes');
        console.table(currentStructure);

        // 2. Ajouter la colonne education_level_id si elle n'existe pas
        console.log('\n🔄 Ajout de la colonne education_level_id...');
        try {
            await connection.execute(`
                ALTER TABLE classes 
                ADD COLUMN education_level_id INT(11) NULL 
                AFTER level
            `);
            console.log('✅ Colonne education_level_id ajoutée');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  La colonne education_level_id existe déjà');
            } else {
                throw error;
            }
        }

        // 3. Ajouter la clé étrangère
        console.log('\n🔗 Ajout de la clé étrangère...');
        try {
            await connection.execute(`
                ALTER TABLE classes 
                ADD CONSTRAINT fk_classes_education_level 
                FOREIGN KEY (education_level_id) 
                REFERENCES education_levels(id) 
                ON DELETE SET NULL 
                ON UPDATE CASCADE
            `);
            console.log('✅ Clé étrangère ajoutée');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('ℹ️  La clé étrangère existe déjà');
            } else {
                throw error;
            }
        }

        // 4. Mettre à jour les classes existantes avec les education_level_id correspondants
        console.log('\n🔄 Mise à jour des classes existantes...');

        // Récupérer tous les niveaux d'éducation
        const [educationLevels] = await connection.execute('SELECT id, name FROM education_levels');
        console.log('📋 Niveaux d\'éducation disponibles:');
        educationLevels.forEach(level => {
            console.log(`   - ID: ${level.id}, Nom: ${level.name}`);
        });

        // Récupérer toutes les classes
        const [classes] = await connection.execute('SELECT id, name, level FROM classes');
        console.log('\n📋 Classes existantes:');
        classes.forEach(cls => {
            console.log(`   - ID: ${cls.id}, Nom: ${cls.name}, Niveau: ${cls.level}`);
        });

        // Mapper les classes aux niveaux d'éducation
        let updatedCount = 0;
        for (const cls of classes) {
            // Chercher le niveau d'éducation correspondant
            const matchingLevel = educationLevels.find(level =>
                level.name.toLowerCase() === cls.level.toLowerCase()
            );

            if (matchingLevel) {
                await connection.execute(
                    'UPDATE classes SET education_level_id = ? WHERE id = ?', [matchingLevel.id, cls.id]
                );
                console.log(`✅ Classe "${cls.name}" (${cls.level}) → Niveau ID: ${matchingLevel.id}`);
                updatedCount++;
            } else {
                console.log(`⚠️  Aucun niveau trouvé pour la classe "${cls.name}" (${cls.level})`);
            }
        }

        console.log(`\n📊 ${updatedCount} classes mises à jour`);

        // 5. Vérifier la nouvelle structure
        console.log('\n🔍 Nouvelle structure de la table classes:');
        const [newStructure] = await connection.execute('DESCRIBE classes');
        console.table(newStructure);

        // 6. Vérifier les données mises à jour
        console.log('\n📋 Classes avec education_level_id:');
        const [updatedClasses] = await connection.execute(`
            SELECT c.id, c.name, c.level, c.education_level_id, el.name as education_level_name
            FROM classes c
            LEFT JOIN education_levels el ON el.id = c.education_level_id
            ORDER BY c.id
        `);
        console.table(updatedClasses);

        console.log('\n🎉 MODIFICATION TERMINÉE AVEC SUCCÈS !');
        console.log('✅ Colonne education_level_id ajoutée à la table classes');
        console.log('✅ Clé étrangère créée');
        console.log('✅ Classes existantes mises à jour');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

addEducationLevelIdToClasses();
