const pool = require('../config/database');

async function updateLevelInstallmentsTable() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('=== MISE À JOUR DE LA TABLE level_installments ===');
        console.log('✅ Connexion établie');

        // Vérifier la structure actuelle
        console.log('\n🔍 Structure actuelle de la table level_installments:');
        const [currentStructure] = await connection.execute('DESCRIBE level_installments');
        console.table(currentStructure);

        // Ajouter la colonne amount si elle n'existe pas
        const [amountColumnCheck] = await connection.execute(
            `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = 'ecole_primaire' AND TABLE_NAME = 'level_installments' AND COLUMN_NAME = 'amount'`
        );

        if (amountColumnCheck[0].count === 0) {
            console.log('\n🔄 Ajout de la colonne amount...');
            await connection.execute(`
                ALTER TABLE level_installments 
                ADD COLUMN amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Montant du versement en FCFA'
            `);
            console.log('✅ Colonne amount ajoutée');
        } else {
            console.log('ℹ️  La colonne amount existe déjà.');
        }

        // Ajouter la colonne due_date si elle n'existe pas
        const [dueDateColumnCheck] = await connection.execute(
            `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = 'ecole_primaire' AND TABLE_NAME = 'level_installments' AND COLUMN_NAME = 'due_date'`
        );

        if (dueDateColumnCheck[0].count === 0) {
            console.log('\n🔄 Ajout de la colonne due_date...');
            await connection.execute(`
                ALTER TABLE level_installments 
                ADD COLUMN due_date DATE NULL COMMENT 'Date d\'échéance du versement'
            `);
            console.log('✅ Colonne due_date ajoutée');
        } else {
            console.log('ℹ️  La colonne due_date existe déjà.');
        }

        // Mettre à jour les versements existants avec des montants calculés
        console.log('\n🔄 Mise à jour des versements existants...');

        // Récupérer tous les versements avec les informations du niveau
        const [installments] = await connection.execute(`
            SELECT li.*, el.tuition_amount, el.registration_fee
            FROM level_installments li
            JOIN education_levels el ON el.id = li.education_level_id
            WHERE li.is_active = 1
        `);

        console.log(`📊 ${installments.length} versements trouvés`);

        let updatedCount = 0;
        for (const installment of installments) {
            const tuitionAmount = installment.tuition_amount - installment.registration_fee;
            const calculatedAmount = (installment.percentage / 100) * tuitionAmount;

            await connection.execute(`
                UPDATE level_installments 
                SET amount = ? 
                WHERE id = ?
            `, [calculatedAmount, installment.id]);

            console.log(`✅ Versement ${installment.installment_number} (ID: ${installment.id}) - Montant: ${calculatedAmount.toFixed(2)} FCFA`);
            updatedCount++;
        }

        console.log(`\n📊 ${updatedCount} versements mis à jour`);

        // Vérifier la nouvelle structure
        console.log('\n🔍 Nouvelle structure de la table level_installments:');
        const [newStructure] = await connection.execute('DESCRIBE level_installments');
        console.table(newStructure);

        // Afficher quelques exemples de versements
        console.log('\n📋 Exemples de versements mis à jour:');
        const [examples] = await connection.execute(`
            SELECT li.*, el.name as level_name, el.tuition_amount, el.registration_fee
            FROM level_installments li
            JOIN education_levels el ON el.id = li.education_level_id
            WHERE li.is_active = 1
            ORDER BY el.order_index, li.installment_number
            LIMIT 10
        `);
        console.table(examples);

        console.log('\n🎉 MISE À JOUR TERMINÉE AVEC SUCCÈS !');
        console.log('✅ Colonnes amount et due_date ajoutées');
        console.log('✅ Versements existants mis à jour avec les montants calculés');

    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour de la table level_installments:', error.message);
    } finally {
        if (connection) connection.release();
        console.log('🔌 Connexion fermée');
    }
}

updateLevelInstallmentsTable();




















