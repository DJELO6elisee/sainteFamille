const pool = require('../config/database');

const informationController = {
    // Obtenir toutes les informations
    getAllInformations: async(req, res) => {
        try {
            const [informations] = await pool.query(`
                SELECT i.*, u.email as created_by_email,
                GROUP_CONCAT(DISTINCT ir.recipient_type) as recipient_types
                FROM informations i
                LEFT JOIN users u ON i.created_by = u.id
                LEFT JOIN information_recipients ir ON i.id = ir.information_id
                WHERE i.status = 'published'
                GROUP BY i.id
                ORDER BY i.publication_date DESC
            `);
            res.json(informations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir une information par ID
    getInformationById: async(req, res) => {
        try {
            const [information] = await pool.query(`
                SELECT i.*, u.email as created_by_email,
                GROUP_CONCAT(DISTINCT ir.recipient_type) as recipient_types
                FROM informations i
                LEFT JOIN users u ON i.created_by = u.id
                LEFT JOIN information_recipients ir ON i.id = ir.information_id
                WHERE i.id = ?
                GROUP BY i.id
            `, [req.params.id]);

            if (information.length === 0) {
                return res.status(404).json({ message: 'Information non trouvée' });
            }

            // Récupérer les pièces jointes
            const [attachments] = await pool.query(
                'SELECT * FROM information_attachments WHERE information_id = ?', [req.params.id]
            );

            res.json({...information[0], attachments });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Créer une nouvelle information
    createInformation: async(req, res) => {
        const { title, content, expiration_date, priority, recipient_types } = req.body;
        const created_by = req.user.id;

        try {
            await pool.beginTransaction();

            // Insérer l'information
            const [result] = await pool.query(
                'INSERT INTO informations (title, content, expiration_date, priority, created_by) VALUES (?, ?, ?, ?, ?)', [title, content, expiration_date, priority, created_by]
            );

            const informationId = result.insertId;

            // Ajouter les destinataires
            for (const type of recipient_types) {
                await pool.query(
                    'INSERT INTO information_recipients (information_id, recipient_type) VALUES (?, ?)', [informationId, type]
                );
            }

            await pool.commit();
            res.status(201).json({ id: informationId, message: 'Information créée avec succès' });
        } catch (error) {
            await pool.rollback();
            res.status(500).json({ message: error.message });
        }
    },

    // Mettre à jour une information
    updateInformation: async(req, res) => {
        const { title, content, expiration_date, priority, status } = req.body;
        try {
            await pool.query(
                'UPDATE informations SET title = ?, content = ?, expiration_date = ?, priority = ?, status = ? WHERE id = ?', [title, content, expiration_date, priority, status, req.params.id]
            );
            res.json({ message: 'Information mise à jour avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Supprimer une information
    deleteInformation: async(req, res) => {
        try {
            await pool.query('DELETE FROM informations WHERE id = ?', [req.params.id]);
            res.json({ message: 'Information supprimée avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Ajouter une pièce jointe
    addAttachment: async(req, res) => {
        const { information_id, file_name, file_path, file_type, file_size } = req.body;
        try {
            const [result] = await pool.query(
                'INSERT INTO information_attachments (information_id, file_name, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?)', [information_id, file_name, file_path, file_type, file_size]
            );
            res.status(201).json({ id: result.insertId, message: 'Pièce jointe ajoutée avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Supprimer une pièce jointe
    deleteAttachment: async(req, res) => {
        try {
            await pool.query('DELETE FROM information_attachments WHERE id = ?', [req.params.id]);
            res.json({ message: 'Pièce jointe supprimée avec succès' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Obtenir les informations pour un utilisateur spécifique
    getUserInformations: async(req, res) => {
        const userId = req.params.userId;
        const userRole = req.params.userRole;

        try {
            const [informations] = await pool.query(`
                SELECT i.*, u.email as created_by_email,
                ir.is_read, ir.read_at
                FROM informations i
                LEFT JOIN users u ON i.created_by = u.id
                LEFT JOIN information_recipients ir ON i.id = ir.information_id
                WHERE i.status = 'published'
                AND (ir.recipient_type = ? OR ir.recipient_type = 'all')
                AND (ir.recipient_id = ? OR ir.recipient_id IS NULL)
                ORDER BY i.publication_date DESC
            `, [userRole, userId]);
            res.json(informations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Marquer une information comme lue
    markAsRead: async(req, res) => {
        const { informationId, userId } = req.params;
        try {
            await pool.query(
                'UPDATE information_recipients SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE information_id = ? AND recipient_id = ?', [informationId, userId]
            );
            res.json({ message: 'Information marquée comme lue' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = informationController;