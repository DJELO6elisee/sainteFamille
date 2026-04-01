const pool = require('../config/database');

async function testSubjectsAPI() {
    let connection;
    try {
        connection = await pool.getConnection();

        console.log('Test direct de la requête SQL...');

        const [subjects] = await connection.query(`
            SELECT id, name, type, created_at
            FROM subjects
            ORDER BY 
                CASE type 
                    WHEN 'francais' THEN 1
                    WHEN 'aem' THEN 2
                    WHEN 'mathematiques' THEN 3
                    WHEN 'langues' THEN 4
                    WHEN 'sport' THEN 5
                    ELSE 6
                END,
                name
        `);

        console.log('Matières trouvées:', subjects.length);
        console.log('Détail des matières:');

        const groupedByType = {};
        subjects.forEach(subject => {
            const type = subject.type || 'sans_type';
            if (!groupedByType[type]) {
                groupedByType[type] = [];
            }
            groupedByType[type].push(subject.name);
        });

        Object.keys(groupedByType).forEach(type => {
            console.log(`\n${type.toUpperCase()}:`);
            groupedByType[type].forEach(name => {
                console.log(`  - ${name}`);
            });
        });

    } catch (error) {
        console.error('Erreur lors du test:', error);
    } finally {
        if (connection) connection.release();
        process.exit(0);
    }
}

testSubjectsAPI();