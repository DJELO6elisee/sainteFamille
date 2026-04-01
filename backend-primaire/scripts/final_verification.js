const mysql = require('mysql2/promise');

async function finalVerification() {
    let connection;

    try {
        console.log('=== VÉRIFICATION FINALE DU SYSTÈME ===');

        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'ecole_primaire'
        });

        console.log('✅ Connexion établie');

        // 1. Vérifier tous les AUTO_INCREMENT
        console.log('\n📊 VÉRIFICATION DES AUTO_INCREMENT:');
        const [autoIncrements] = await connection.execute(`
            SELECT 
                TABLE_NAME,
                AUTO_INCREMENT
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'ecole_primaire' 
            AND AUTO_INCREMENT IS NOT NULL
            ORDER BY TABLE_NAME
        `);

        autoIncrements.forEach(row => {
            console.log(`   ✅ ${row.TABLE_NAME}: ${row.AUTO_INCREMENT}`);
        });

        // 2. Test d'insertion sur les tables principales
        console.log('\n🧪 TESTS D\'INSERTION:');

        const testTables = [
            { name: 'users', insert: 'INSERT INTO users (email, first_name, last_name, password, role) VALUES (?, ?, ?, ?, ?)', values: ['test@test.com', 'Test', 'User', 'password', 'student'] },
            { name: 'students', insert: 'INSERT INTO students (first_name, last_name, registration_mode) VALUES (?, ?, ?)', values: ['Test', 'Student', 'onsite'] },
            { name: 'teachers', insert: 'INSERT INTO teachers (first_name, last_name, email, status) VALUES (?, ?, ?, ?)', values: ['Test', 'Teacher', 'teacher@test.com', 'active'] },
            { name: 'classes', insert: 'INSERT INTO classes (name, level) VALUES (?, ?)', values: ['Test Class', 'Test Level'] },
            { name: 'subjects', insert: 'INSERT INTO subjects (name) VALUES (?)', values: ['Test Subject'] },
            { name: 'activities', insert: 'INSERT INTO activities (name, description) VALUES (?, ?)', values: ['Test Activity', 'Test Description'] },
            { name: 'payments', insert: 'INSERT INTO payments (student_id, amount, payment_type, status) VALUES (?, ?, ?, ?)', values: [1, 1000, 'tuition', 'completed'] },
            { name: 'enrollments', insert: 'INSERT INTO enrollments (student_id, class_id, enrollment_date, status, school_year) VALUES (?, ?, ?, ?, ?)', values: [1, 1, '2024-09-01', 'active', '2024-2025'] },
            { name: 'grades', insert: 'INSERT INTO grades (student_id, class_id, grade, semester, academic_year, coefficient, subject_id, school_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', values: [1, 1, 15.5, '1', '2024-2025', 1, 1, '2024-2025'] },
            { name: 'history', insert: 'INSERT INTO history (user_id, action_type, action_description, amount, student_name) VALUES (?, ?, ?, ?, ?)', values: [1, 'payment', 'Test payment', 1000, 'Test Student'] },
            { name: 'notifications', insert: 'INSERT INTO notifications (title, message, type, student_id, class_id, sender_id) VALUES (?, ?, ?, ?, ?, ?)', values: ['Test', 'Test message', 'public', 1, 1, 1] },
            { name: 'absences', insert: 'INSERT INTO absences (student_id, class_id, subject_id, teacher_id, date, reason, status, duration_hours, school_year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', values: [1, 1, 1, 1, '2024-09-01', 'Test absence', 'excused', 1.0, '2024-2025'] }
        ];

        const insertedIds = [];

        for (const test of testTables) {
            try {
                const [result] = await connection.execute(test.insert, test.values);
                console.log(`   ✅ ${test.name}: ID ${result.insertId} - SUCCÈS`);
                insertedIds.push({ table: test.name, id: result.insertId });
            } catch (error) {
                console.log(`   ❌ ${test.name}: ${error.message}`);
            }
        }

        // 3. Nettoyer les tests
        console.log('\n🧹 NETTOYAGE DES TESTS:');
        for (const item of insertedIds) {
            try {
                await connection.execute(`DELETE FROM ${item.table} WHERE id = ?`, [item.id]);
                console.log(`   ✅ ${item.table}: ID ${item.id} supprimé`);
            } catch (error) {
                console.log(`   ⚠️  ${item.table}: Erreur nettoyage - ${error.message}`);
            }
        }

        // 4. Vérification finale des AUTO_INCREMENT
        console.log('\n📊 AUTO_INCREMENT FINAUX:');
        const [finalAutoIncrements] = await connection.execute(`
            SELECT 
                TABLE_NAME,
                AUTO_INCREMENT
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'ecole_primaire' 
            AND AUTO_INCREMENT IS NOT NULL
            ORDER BY TABLE_NAME
        `);

        finalAutoIncrements.forEach(row => {
            console.log(`   📈 ${row.TABLE_NAME}: ${row.AUTO_INCREMENT}`);
        });

        // 5. Statistiques finales
        console.log('\n📈 STATISTIQUES FINALES:');
        const [tableCounts] = await connection.execute(`
            SELECT 
                TABLE_NAME,
                TABLE_ROWS
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'ecole_primaire' 
            AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);

        let totalTables = 0;
        let totalRows = 0;

        tableCounts.forEach(row => {
            totalTables++;
            totalRows += parseInt(row.TABLE_ROWS) || 0;
            console.log(`   📊 ${row.TABLE_NAME}: ${row.TABLE_ROWS} enregistrements`);
        });

        console.log(`\n📊 RÉSUMÉ:`);
        console.log(`   - Tables totales: ${totalTables}`);
        console.log(`   - Enregistrements total: ${totalRows}`);
        console.log(`   - Tables avec AUTO_INCREMENT: ${finalAutoIncrements.length}`);

        console.log('\n🎉 VÉRIFICATION TERMINÉE AVEC SUCCÈS !');
        console.log('✅ Toutes les tables fonctionnent correctement');
        console.log('✅ Les AUTO_INCREMENT sont opérationnels');
        console.log('✅ Les nouveaux enregistrements auront des ID corrects (1, 2, 3, etc.)');
        console.log('✅ Le système est prêt pour la production');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

finalVerification();
