const mysql = require('mysql2/promise');

async function simpleFixConstraints() {
    let connection;

    try {
        console.log('=== CORRECTION SIMPLE DES CONTRAINTES ===');

        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'ecole_primaire'
        });

        console.log('✅ Connexion établie');

        // Tables problématiques
        const tables = [
            'enrollments', 'grades', 'history', 'notifications', 'absences',
            'activity_images', 'class_subjects', 'garderie_inscriptions'
        ];

        for (const table of tables) {
            try {
                console.log(`\n🔄 Traitement de: ${table}`);

                // 1. Supprimer tous les enregistrements
                await connection.execute(`DELETE FROM ${table}`);
                console.log(`✅ Enregistrements supprimés`);

                // 2. Supprimer la clé primaire
                try {
                    await connection.execute(`ALTER TABLE ${table} DROP PRIMARY KEY`);
                    console.log(`✅ Clé primaire supprimée`);
                } catch (error) {
                    console.log(`⚠️  Clé primaire: ${error.message}`);
                }

                // 3. Modifier la colonne id
                await connection.execute(`ALTER TABLE ${table} MODIFY COLUMN id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY`);
                console.log(`✅ Colonne id modifiée`);

                // 4. Réinitialiser AUTO_INCREMENT
                await connection.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
                console.log(`✅ AUTO_INCREMENT réinitialisé`);

                // 5. Test d'insertion
                const testData = getTestData(table);
                if (testData) {
                    const [result] = await connection.execute(testData.insert, testData.values);
                    console.log(`✅ Test insertion - ID: ${result.insertId}`);

                    // Nettoyer
                    await connection.execute(`DELETE FROM ${table} WHERE id = ?`, [result.insertId]);
                    console.log(`✅ Test nettoyé`);
                }

                console.log(`✅ ${table}: Corrigée avec succès`);

            } catch (error) {
                console.log(`❌ ${table}: ${error.message}`);
            }
        }

        console.log('\n🎉 CORRECTION TERMINÉE !');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

function getTestData(table) {
    const testData = {
        'enrollments': {
            insert: 'INSERT INTO enrollments (student_id, class_id, enrollment_date, status, school_year) VALUES (?, ?, ?, ?, ?)',
            values: [1, 1, '2024-09-01', 'active', '2024-2025']
        },
        'grades': {
            insert: 'INSERT INTO grades (student_id, class_id, grade, semester, academic_year, coefficient, subject_id, school_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            values: [1, 1, 15.5, '1', '2024-2025', 1, 1, '2024-2025']
        },
        'history': {
            insert: 'INSERT INTO history (user_id, action_type, action_description, amount, student_name) VALUES (?, ?, ?, ?, ?)',
            values: [1, 'payment', 'Test payment', 1000, 'Test Student']
        },
        'notifications': {
            insert: 'INSERT INTO notifications (title, message, type, student_id, class_id, sender_id) VALUES (?, ?, ?, ?, ?, ?)',
            values: ['Test', 'Test message', 'public', 1, 1, 1]
        },
        'absences': {
            insert: 'INSERT INTO absences (student_id, class_id, subject_id, teacher_id, date, reason, status, duration_hours, school_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            values: [1, 1, 1, 1, '2024-09-01', 'Test absence', 'excused', 1.0, '2024-2025']
        },
        'activity_images': {
            insert: 'INSERT INTO activity_images (activity_id, image_url, alt_text, order_index) VALUES (?, ?, ?, ?)',
            values: [1, 'test.jpg', 'Test image', 1]
        },
        'class_subjects': {
            insert: 'INSERT INTO class_subjects (class_id, subject_id, coefficient) VALUES (?, ?, ?)',
            values: [1, 1, 1]
        },
        'garderie_inscriptions': {
            insert: 'INSERT INTO garderie_inscriptions (child_first_name, child_last_name, civility, start_date, end_date, parent_first_name, parent_last_name, parent_phone, parent_email, emergency_contact, school_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            values: ['Test', 'Child', 'M.', '2024-09-01', '2024-12-31', 'Parent', 'Name', '123456789', 'parent@test.com', 'Emergency', '2024-2025']
        }
    };

    return testData[table] || null;
}

simpleFixConstraints();
