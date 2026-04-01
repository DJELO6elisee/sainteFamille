const pool = require('../config/database');

async function debugInstallments() {
    try {
        console.log('=== DEBUG DES VERSEMENTS ===');

        // 1. Vérifier tous les niveaux
        console.log('\n1. Tous les niveaux:');
        const [levels] = await pool.execute('SELECT id, name FROM education_levels WHERE is_active = 1');
        console.log(levels);

        // 2. Vérifier tous les versements
        console.log('\n2. Tous les versements:');
        const [allInstallments] = await pool.execute(`
            SELECT li.*, el.name as level_name 
            FROM level_installments li 
            JOIN education_levels el ON el.id = li.education_level_id 
            WHERE li.is_active = 1 
            ORDER BY el.name, li.installment_number
        `);
        console.log(allInstallments);

        // 3. Vérifier spécifiquement le niveau PRESCOLAIRE
        console.log('\n3. Niveau PRESCOLAIRE:');
        const [prescolaire] = await pool.execute('SELECT * FROM education_levels WHERE name = "PRESCOLAIRE" AND is_active = 1');
        console.log('Niveau:', prescolaire);

        if (prescolaire.length > 0) {
            const levelId = prescolaire[0].id;
            console.log(`\n4. Versements pour le niveau ID ${levelId}:`);
            const [installments] = await pool.execute(`
                SELECT * FROM level_installments 
                WHERE education_level_id = ? AND is_active = 1 
                ORDER BY installment_number
            `, [levelId]);
            console.log('Versements trouvés:', installments.length);
            console.log(installments);
        }

    } catch (error) {
        console.error('Erreur:', error);
    } finally {
        process.exit(0);
    }
}

debugInstallments();




















