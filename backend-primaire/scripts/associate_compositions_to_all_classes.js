const pool = require('../config/database');

/**
 * Script pour associer toutes les compositions existantes à toutes les classes primaires
 * Ce script est utile si des compositions ont été créées avant que toutes les classes existent
 */
async function associateCompositionsToAllClasses() {
    let connection;
    
    try {
        console.log('=== ASSOCIATION DES COMPOSITIONS À TOUTES LES CLASSES ===\n');
        
        connection = await pool.getConnection();
        
        // 1. Récupérer tous les niveaux d'éducation actifs (PRESCOLAIRE, PRIMAIRE, etc.)
        const [allActiveLevels] = await connection.query(`
            SELECT id, name FROM education_levels 
            WHERE is_active = 1
            ORDER BY order_index, name
        `);
        
        console.log(`📚 ${allActiveLevels.length} niveau(x) d'éducation actif(s) trouvé(s):`);
        allActiveLevels.forEach((level) => {
            console.log(`   - ID: ${level.id}, Nom: ${level.name}`);
        });
        
        if (allActiveLevels.length === 0) {
            console.warn('⚠️ Aucun niveau d\'éducation actif trouvé. Utilisation du fallback par nom de classe.');
        }
        
        // 2. Récupérer toutes les classes de tous les niveaux actifs
        let classesQuery;
        let classesParams;
        
        if (allActiveLevels.length > 0) {
            const allLevelIds = allActiveLevels.map((l) => l.id);
            classesQuery = `
                SELECT id, name, education_level_id FROM classes 
                WHERE education_level_id IN (${allLevelIds.map(() => '?').join(',')})
                ORDER BY name
            `;
            classesParams = allLevelIds;
        } else {
            // Fallback: utiliser les noms de classes
            classesQuery = `
                SELECT id, name, education_level_id FROM classes 
                WHERE UPPER(REPLACE(name, ' ', '')) LIKE 'CP%' 
                   OR UPPER(REPLACE(name, ' ', '')) LIKE 'CE%'
                   OR UPPER(REPLACE(name, ' ', '')) LIKE 'CM%'
                   OR UPPER(REPLACE(name, ' ', '')) LIKE 'PS%'
                   OR UPPER(REPLACE(name, ' ', '')) LIKE 'MS%'
                   OR UPPER(REPLACE(name, ' ', '')) LIKE 'GS%'
                   OR UPPER(REPLACE(name, ' ', '')) LIKE 'TPS%'
                ORDER BY name
            `;
            classesParams = [];
        }
        
        const [classes] = await connection.query(classesQuery, classesParams);
        
        console.log(`\n🏫 ${classes.length} classe(s) trouvée(s) pour tous les niveaux actifs:`);
        classes.slice(0, 10).forEach((classe) => {
            console.log(`   - ID: ${classe.id}, Nom: ${classe.name}, Level ID: ${classe.education_level_id}`);
        });
        if (classes.length > 10) {
            console.log(`   ... et ${classes.length - 10} autre(s) classe(s)`);
        }
        
        // 3. Récupérer toutes les compositions actives
        const [compositions] = await connection.query(`
            SELECT id, name, composition_date, school_year, is_active
            FROM compositions
            WHERE is_active = 1
            ORDER BY composition_date DESC
        `);
        
        console.log(`\n📝 ${compositions.length} composition(s) active(s) trouvée(s):`);
        compositions.forEach((comp) => {
            console.log(`   - ID: ${comp.id}, Nom: ${comp.name}, Date: ${comp.composition_date}, Année: ${comp.school_year}`);
        });
        
        if (compositions.length === 0) {
            console.log('✅ Aucune composition à traiter.');
            return;
        }
        
        // 4. Pour chaque composition, associer toutes les classes primaires
        let totalAssociations = 0;
        let totalSkipped = 0;
        
        for (const composition of compositions) {
            console.log(`\n🔄 Traitement de la composition: ${composition.name} (ID: ${composition.id})`);
            
            for (const classe of classes) {
                try {
                    // Vérifier si l'association existe déjà
                    const [existing] = await connection.query(`
                        SELECT id FROM composition_classes 
                        WHERE composition_id = ? AND class_id = ?
                    `, [composition.id, classe.id]);
                    
                    if (existing.length === 0) {
                        // Créer l'association
                        await connection.query(`
                            INSERT INTO composition_classes (composition_id, class_id, is_enabled)
                            VALUES (?, ?, 1)
                        `, [composition.id, classe.id]);
                        totalAssociations++;
                        console.log(`   ✅ Associée à la classe: ${classe.name} (ID: ${classe.id})`);
                    } else {
                        totalSkipped++;
                    }
                } catch (associationError) {
                    console.error(`   ❌ Erreur avec la classe ${classe.name} (ID: ${classe.id}):`, associationError.message);
                }
            }
        }
        
        console.log(`\n=== RÉSUMÉ ===`);
        console.log(`✅ ${totalAssociations} nouvelle(s) association(s) créée(s)`);
        console.log(`⏭️  ${totalSkipped} association(s) déjà existante(s)`);
        console.log(`📝 ${compositions.length} composition(s) traitée(s)`);
        console.log(`🏫 ${classes.length} classe(s) traitée(s)`);
        console.log(`\n✅ Script terminé avec succès!`);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'association:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Exécuter le script
if (require.main === module) {
    associateCompositionsToAllClasses()
        .then(() => {
            console.log('\n✅ Processus terminé');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Erreur fatale:', error);
            process.exit(1);
        });
}

module.exports = associateCompositionsToAllClasses;

