const pool = require('../config/database');

const compositionController = {
    // Récupérer toutes les compositions actives
    getAllCompositions: async(req, res) => {
        try {
            const schoolYear = req.query.school_year || '2025-2026';

            const [compositions] = await pool.query(`
                SELECT 
                    id,
                    name,
                    description,
                    composition_date,
                    school_year,
                    is_active,
                    CASE 
                        WHEN CURDATE() < composition_date THEN 'À venir'
                        WHEN CURDATE() = composition_date THEN 'Aujourd\\'hui'
                        WHEN CURDATE() > composition_date THEN 'Terminée'
                        ELSE 'Non défini'
                    END as status,
                    DATEDIFF(composition_date, CURDATE()) as days_until_composition,
                    -- Date de début du délai: composition_date + 1 jour
                    DATE_ADD(composition_date, INTERVAL 1 DAY) as grade_entry_start_date,
                    -- Date de fin du délai: composition_date + 6 jours (1 + 5)
                    DATE_ADD(composition_date, INTERVAL 6 DAY) as grade_entry_end_date,
                    -- Jours restants pour saisir les notes (négatif si dépassé)
                    DATEDIFF(DATE_ADD(composition_date, INTERVAL 6 DAY), CURDATE()) as days_remaining_for_grades,
                    -- Indique si la saisie est encore ouverte
                    CASE 
                        WHEN CURDATE() < DATE_ADD(composition_date, INTERVAL 1 DAY) THEN 0
                        WHEN CURDATE() <= DATE_ADD(composition_date, INTERVAL 6 DAY) THEN 1
                        ELSE 0
                    END as can_enter_grades,
                    created_at
                FROM compositions 
                WHERE school_year = ? AND is_active = 1
                ORDER BY composition_date
            `, [schoolYear]);

            res.json(compositions);
        } catch (error) {
            console.error('Erreur lors de la récupération des compositions:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Récupérer les compositions disponibles pour une classe
    getCompositionsForClass: async(req, res) => {
        try {
            const { classId } = req.params;
            const schoolYear = req.query.school_year || '2025-2026';

            const [compositions] = await pool.query(`
                SELECT 
                    c.id,
                    c.name,
                    c.description,
                    c.composition_date,
                    c.school_year,
                    c.is_active,
                    cc.is_enabled,
                    CASE 
                        WHEN CURDATE() < c.composition_date THEN 'À venir'
                        WHEN CURDATE() = c.composition_date THEN 'Aujourd\\'hui'
                        WHEN CURDATE() > c.composition_date THEN 'Terminée'
                        ELSE 'Non défini'
                    END as status,
                    DATEDIFF(c.composition_date, CURDATE()) as days_until_composition,
                    -- Date de début du délai: composition_date + 1 jour
                    DATE_ADD(c.composition_date, INTERVAL 1 DAY) as grade_entry_start_date,
                    -- Date de fin du délai: composition_date + 6 jours (1 + 5)
                    DATE_ADD(c.composition_date, INTERVAL 6 DAY) as grade_entry_end_date,
                    -- Jours restants pour saisir les notes (négatif si dépassé)
                    DATEDIFF(DATE_ADD(c.composition_date, INTERVAL 6 DAY), CURDATE()) as days_remaining_for_grades,
                    -- Indique si la saisie est encore ouverte
                    CASE 
                        WHEN CURDATE() < DATE_ADD(c.composition_date, INTERVAL 1 DAY) THEN 0
                        WHEN CURDATE() <= DATE_ADD(c.composition_date, INTERVAL 6 DAY) THEN 1
                        ELSE 0
                    END as can_enter_grades
                FROM compositions c
                JOIN composition_classes cc ON c.id = cc.composition_id
                WHERE cc.class_id = ? 
                  AND c.school_year = ? 
                  AND c.is_active = 1 
                  AND cc.is_enabled = 1
                ORDER BY c.composition_date
            `, [classId, schoolYear]);

            res.json(compositions);
        } catch (error) {
            console.error('Erreur lors de la récupération des compositions pour la classe:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Créer une nouvelle composition
    createComposition: async(req, res) => {
        try {
            const { name, description, composition_date, school_year } = req.body;

            if (!name || !composition_date || !school_year) {
                return res.status(400).json({
                    message: 'name, composition_date et school_year sont requis'
                });
            }

            // Vérifier que la date n'est pas dans le passé
            if (new Date(composition_date) < new Date().setHours(0, 0, 0, 0)) {
                return res.status(400).json({
                    message: 'La date de composition ne peut pas être dans le passé'
                });
            }

            const [result] = await pool.query(`
                INSERT INTO compositions (name, description, composition_date, school_year, created_by)
                VALUES (?, ?, ?, ?, ?)
            `, [name, description, composition_date, school_year, req.user ? req.user.id : null]);

            // Associer automatiquement toutes les classes de TOUS les niveaux actifs à cette composition
            // Cela inclut PRESCOLAIRE, PRIMAIRE (CM2), PRIMAIRE (CP1 - CM1), etc.
            // Récupérer tous les IDs des niveaux d'éducation actifs
            const [allActiveLevels] = await pool.query(`
                SELECT id, name FROM education_levels 
                WHERE is_active = 1
                ORDER BY order_index, name
            `);

            console.log(`[COMPOSITION CONTROLLER] ${allActiveLevels.length} niveau(x) d'éducation actif(s) trouvé(s):`);
            allActiveLevels.forEach((level) => {
                console.log(`   - ID: ${level.id}, Nom: ${level.name}`);
            });

            const allLevelIds = allActiveLevels.map((l) => l.id);
            let classes = [];
            
            if (allLevelIds.length > 0) {
                // Récupérer toutes les classes de tous les niveaux actifs
                const classesQuery = `
                    SELECT id, name, education_level_id FROM classes 
                    WHERE education_level_id IN (${allLevelIds.map(() => '?').join(',')})
                    ORDER BY name
                `;

                [classes] = await pool.query(classesQuery, allLevelIds);
            } else {
                // Fallback: utiliser la méthode par nom si aucun niveau actif trouvé
                console.warn('[COMPOSITION CONTROLLER] Aucun niveau d\'éducation actif trouvé, utilisation du fallback');
                [classes] = await pool.query(`
                    SELECT id, name, education_level_id FROM classes 
                    WHERE UPPER(REPLACE(name, ' ', '')) LIKE 'CP%' 
                       OR UPPER(REPLACE(name, ' ', '')) LIKE 'CE%'
                       OR UPPER(REPLACE(name, ' ', '')) LIKE 'CM%'
                       OR UPPER(REPLACE(name, ' ', '')) LIKE 'PS%'
                       OR UPPER(REPLACE(name, ' ', '')) LIKE 'MS%'
                       OR UPPER(REPLACE(name, ' ', '')) LIKE 'GS%'
                       OR UPPER(REPLACE(name, ' ', '')) LIKE 'TPS%'
                    ORDER BY name
                `);
                console.log(`[COMPOSITION CONTROLLER] ${classes.length} classe(s) trouvée(s) avec fallback`);
            }

            console.log(`[COMPOSITION CONTROLLER] ${classes.length} classe(s) trouvée(s) pour association sur ${allLevelIds.length} niveau(x)`);

            // Associer toutes les classes trouvées à cette composition
            let associatedCount = 0;
            for (const classe of classes) {
                try {
                    // Vérifier si l'association existe déjà
                    const [existing] = await pool.query(`
                        SELECT id FROM composition_classes 
                        WHERE composition_id = ? AND class_id = ?
                    `, [result.insertId, classe.id]);

                    if (existing.length === 0) {
                        await pool.query(`
                            INSERT INTO composition_classes (composition_id, class_id, is_enabled)
                            VALUES (?, ?, 1)
                        `, [result.insertId, classe.id]);
                        associatedCount++;
                    }
                } catch (associationError) {
                    console.error(`[COMPOSITION CONTROLLER] Erreur lors de l'association avec la classe ${classe.name} (ID: ${classe.id}):`, associationError);
                }
            }

            res.status(201).json({
                message: 'Composition créée avec succès',
                id: result.insertId,
                classes_associated: associatedCount,
                total_classes_found: classes.length
            });
        } catch (error) {
            console.error('Erreur lors de la création de la composition:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Mettre à jour une composition
    updateComposition: async(req, res) => {
        try {
            const { id } = req.params;
            const { name, description, composition_date, is_active } = req.body;

            // Vérifier que la date n'est pas dans le passé (si fournie)
            if (composition_date && new Date(composition_date) < new Date().setHours(0, 0, 0, 0)) {
                return res.status(400).json({
                    message: 'La date de composition ne peut pas être dans le passé'
                });
            }

            const [result] = await pool.query(`
                UPDATE compositions 
                SET name = COALESCE(?, name),
                    description = COALESCE(?, description),
                    composition_date = COALESCE(?, composition_date),
                    is_active = COALESCE(?, is_active),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [name, description, composition_date, is_active, id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Composition non trouvée' });
            }

            res.json({ message: 'Composition mise à jour avec succès' });
        } catch (error) {
            console.error('Erreur lors de la mise à jour de la composition:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Supprimer une composition
    deleteComposition: async(req, res) => {
        try {
            const { id } = req.params;

            // Vérifier s'il y a des notes associées à cette composition
            const [grades] = await pool.query(`
                SELECT COUNT(*) as count FROM grades WHERE composition_id = ?
            `, [id]);

            if (grades[0].count > 0) {
                return res.status(400).json({
                    message: `Impossible de supprimer cette composition car ${grades[0].count} note(s) y sont associées`
                });
            }

            const [result] = await pool.query(`
                DELETE FROM compositions WHERE id = ?
            `, [id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Composition non trouvée' });
            }

            res.json({ message: 'Composition supprimée avec succès' });
        } catch (error) {
            console.error('Erreur lors de la suppression de la composition:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Activer/Désactiver une composition
    toggleComposition: async(req, res) => {
        try {
            const { id } = req.params;
            const { is_active } = req.body;

            const [result] = await pool.query(`
                UPDATE compositions 
                SET is_active = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [is_active, id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Composition non trouvée' });
            }

            res.json({
                message: `Composition ${is_active ? 'activée' : 'désactivée'} avec succès`
            });
        } catch (error) {
            console.error('Erreur lors de la modification du statut:', error);
            res.status(500).json({ message: error.message });
        }
    },

    // Récupérer les statistiques des compositions
    getCompositionStats: async(req, res) => {
        try {
            const schoolYear = req.query.school_year || '2025-2026';

            const [stats] = await pool.query(`
                SELECT 
                    c.id,
                    c.name,
                    c.start_date,
                    c.end_date,
                    c.status,
                    COUNT(DISTINCT g.student_id) as students_with_grades,
                    COUNT(g.id) as total_grades,
                    AVG(g.grade) as average_grade,
                    MIN(g.grade) as min_grade,
                    MAX(g.grade) as max_grade
                FROM v_compositions_active c
                LEFT JOIN grades g ON c.id = g.composition_id
                WHERE c.school_year = ?
                GROUP BY c.id, c.name, c.start_date, c.end_date, c.status
                ORDER BY c.start_date
            `, [schoolYear]);

            res.json(stats);
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = compositionController;