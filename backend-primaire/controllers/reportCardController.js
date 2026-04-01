const pool = require('../config/database');

// Publier un bulletin
exports.publishReportCard = async(req, res) => {
    const { class_id, trimester, school_year } = req.body;
    const user_id = req.user.id;
    if (!class_id || !trimester || !school_year) {
        return res.status(400).json({ message: "Paramètres manquants." });
    }
    try {
        await pool.query(`
      INSERT INTO report_card_publications (class_id, trimester, school_year, published, published_at, published_by)
      VALUES (?, ?, ?, TRUE, NOW(), ?)
      ON DUPLICATE KEY UPDATE published = TRUE, published_at = NOW(), published_by = ?
    `, [class_id, trimester, school_year, user_id, user_id]);
        res.json({ message: "Bulletin publié avec succès." });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Vérifier si un bulletin est publié
exports.isReportCardPublished = async(req, res) => {
    const { class_id, trimester, composition_id, school_year } = req.query;

    if (!class_id || !school_year) {
        return res.status(400).json({ message: "class_id et school_year sont requis." });
    }

    // Si composition_id est fourni, utiliser composition_id (nouveau système)
    // Sinon, essayer de trouver une composition correspondant au trimestre (rétrocompatibilité)
    try {
        let rows;

        if (composition_id) {
            // Nouveau système : utiliser composition_id
            [rows] = await pool.query(
                `SELECT published FROM report_card_publications 
                 WHERE class_id = ? AND composition_id = ? AND school_year = ?`, [class_id, composition_id, school_year]
            );
        } else if (trimester) {
            // Ancien système : chercher toutes les compositions publiées pour cette classe et année
            // Retourner true si au moins une composition est publiée
            // Note: Les trimestres ne sont plus utilisés, on vérifie juste s'il y a des compositions publiées
            [rows] = await pool.query(
                `SELECT published FROM report_card_publications 
                 WHERE class_id = ? AND school_year = ? AND published = 1
                 LIMIT 1`, [class_id, school_year]
            );
        } else {
            return res.status(400).json({ message: "composition_id ou trimester est requis." });
        }

        res.json({ published: rows[0] && rows[0].published === 1 });
    } catch (err) {
        console.error('[isReportCardPublished] Erreur:', err);
        res.status(500).json({ message: err.message });
    }
};