const pool = require('../config/database');

const bulletinSubjectController = {
    // GET /api/bulletin-subjects
    getAll: async(req, res) => {
        try {
            console.log('[bulletinSubjectController.getAll] 🔍 Récupération de toutes les matières de bulletin');
            const [rows] = await pool.query(
                `SELECT bs.id, bs.name, bs.level_group, bs.display_order, v.subject_id
         FROM bulletin_subjects bs
         LEFT JOIN v_bulletin_subjects_with_subject_id v ON v.bulletin_subject_id = bs.id
         ORDER BY bs.level_group, bs.display_order, bs.name`
            );

            console.log(`[bulletinSubjectController.getAll] 📊 Total matières récupérées: ${rows.length}`);

            // Filtrer EPS avec toutes ses variantes pour les niveaux CE/CM
            const filteredRows = rows.filter(subject => {
                const name = (subject.name || '').toUpperCase().trim();
                // Ne pas filtrer pour CP
                if (subject.level_group === 'cp') {
                    return true;
                }
                // Filtrer EPS pour CE/CM avec toutes les variantes
                const isEPS = name === 'EPS' ||
                    name === 'E.P.S' ||
                    name === 'E.P.S.' ||
                    name === 'E PS' ||
                    name.match(/^EPS$|^E\.P\.S$|^E\.PS$/i) ||
                    name.includes('EPS');
                if (isEPS) {
                    console.log(`[bulletinSubjectController.getAll] ❌ EPS exclu: "${subject.name}" (level_group: ${subject.level_group})`);
                }
                return !isEPS;
            });

            console.log(`[bulletinSubjectController.getAll] ✅ Matières après filtrage EPS: ${filteredRows.length}`);
            console.log(`[bulletinSubjectController.getAll] 🗑️ Matières exclues: ${rows.length - filteredRows.length}`);

            res.json(filteredRows);
        } catch (error) {
            console.error('[bulletinSubjectController.getAll] ❌ Error:', error);
            res.status(500).json({ message: error.message });
        }
    },



    // GET /api/bulletin-subjects/class/:classId
    getByClassId: async(req, res) => {
        try {
            const { classId } = req.params;
            const [classes] = await pool.query('SELECT name FROM classes WHERE id = ?', [classId]);
            if (classes.length === 0) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            const className = (classes[0].name || '').toUpperCase();
            const isCP = className.startsWith('CP1') || className.startsWith('CP2') || className.startsWith('CP');
            const levelGroup = isCP ? 'cp' : 'ce_cm';

            // Toujours récupérer TOUTES les matières du bulletin pour le niveau de la classe,
            // et joindre éventuellement le coefficient défini dans class_subjects (facultatif).
            let [subjects] = await pool.query(
                `SELECT 
                    bs.id AS bulletin_subject_id,
                    bs.name,
                    bs.level_group,
                    bs.display_order,
                    v.subject_id,
                    cs.coefficient
                 FROM bulletin_subjects bs
                 LEFT JOIN v_bulletin_subjects_with_subject_id v ON v.bulletin_subject_id = bs.id
                 LEFT JOIN class_subjects cs ON cs.class_id = ? AND cs.subject_id = bs.id
                 WHERE bs.level_group = ?
                 ORDER BY bs.display_order, bs.name`, [classId, levelGroup]
            );

            console.log(`[bulletinSubjectController.getByClassId] 🔍 Classe: ${classes[0].name}, level_group: ${levelGroup}`);
            console.log(`[bulletinSubjectController.getByClassId] 📊 Matières avant filtrage: ${subjects.length}`);

            // Exclure EPS pour les niveaux CE/CM (CE1, CE2, CM1, CM2) avec toutes les variantes
            if (levelGroup === 'ce_cm') {
                const beforeCount = subjects.length;
                subjects = subjects.filter(s => {
                    const name = (s.name || '').toUpperCase().trim();
                    const isEPS = name === 'EPS' ||
                        name === 'E.P.S' ||
                        name === 'E.P.S.' ||
                        name === 'E PS' ||
                        name.match(/^EPS$|^E\.P\.S$|^E\.PS$/i) ||
                        name.includes('EPS');
                    if (isEPS) {
                        console.log(`[bulletinSubjectController.getByClassId] ❌ EPS exclu: "${s.name}"`);
                    }
                    return !isEPS;
                });
                console.log(`[bulletinSubjectController.getByClassId] ✅ Matières après filtrage EPS: ${subjects.length} (exclues: ${beforeCount - subjects.length})`);
            }

            res.json({
                class_id: Number(classId),
                class_name: classes[0].name,
                level_group: levelGroup,
                subjects
            });
        } catch (error) {
            console.error('[bulletinSubjectController.getByClassId] Error:', error);
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = bulletinSubjectController;