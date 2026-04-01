const pool = require('../config/database');

// Récupérer toutes les matières d'une classe avec leur coefficient
exports.getSubjectsForClass = async(req, res) => {
    const { classId } = req.params;
    try {
        const [rows] = await pool.query(
            `SELECT cs.subject_id, s.name, cs.coefficient
       FROM class_subjects cs
       JOIN subjects s ON cs.subject_id = s.id
       WHERE cs.class_id = ?`, [classId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err });
    }
};

// Associer une matière à une classe avec coefficient
exports.addSubjectToClass = async(req, res) => {
    const { classId } = req.params;
    const { subject_id, coefficient } = req.body;
    try {
        await pool.query(
            `INSERT INTO class_subjects (class_id, subject_id, coefficient) VALUES (?, ?, ?)`, [classId, subject_id, coefficient || 1]
        );
        res.status(201).json({ message: 'Matière ajoutée à la classe.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err });
    }
};

// Modifier le coefficient d'une matière pour une classe
exports.updateCoefficient = async(req, res) => {
    const { classId, subjectId } = req.params;
    const { coefficient } = req.body;
    try {
        await pool.query(
            `UPDATE class_subjects SET coefficient = ? WHERE class_id = ? AND subject_id = ?`, [coefficient, classId, subjectId]
        );
        res.json({ message: 'Coefficient mis à jour.' });
    } catch (err) {
        res.status(500).json({ message: 'Erreur serveur', error: err });
    }
};