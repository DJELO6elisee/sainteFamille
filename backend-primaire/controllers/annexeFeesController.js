const pool = require('../config/database');
const { getCurrentSchoolYear } = require('../config/schoolYear');

// ========== FRAIS ANNEXES (payables une fois par élève et par année) ==========

const getAnnexeFees = async (req, res) => {
    try {
        const school_year = req.query.school_year || getCurrentSchoolYear();
        const [rows] = await pool.execute(
            `SELECT * FROM annexe_fees WHERE school_year = ? AND is_active = 1 ORDER BY order_index, name`,
            [school_year]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erreur getAnnexeFees:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des frais annexes.' });
    }
};

const createAnnexeFee = async (req, res) => {
    try {
        const { name, amount, school_year, order_index } = req.body;
        const sy = school_year || getCurrentSchoolYear();
        if (!name || amount == null) {
            return res.status(400).json({ success: false, message: 'Nom et montant requis.' });
        }
        const [result] = await pool.execute(
            `INSERT INTO annexe_fees (name, amount, school_year, order_index) VALUES (?, ?, ?, ?)`,
            [name.trim(), Number(amount), sy, order_index != null ? order_index : 0]
        );
        res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Frais annexe créé.' });
    } catch (error) {
        console.error('Erreur createAnnexeFee:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la création du frais annexe.' });
    }
};

const updateAnnexeFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, amount, school_year, is_active, order_index } = req.body;
        if (!name || amount == null) {
            return res.status(400).json({ success: false, message: 'Nom et montant requis.' });
        }
        const [existing] = await pool.execute('SELECT school_year FROM annexe_fees WHERE id = ?', [id]);
        const sy = school_year != null && school_year !== '' ? school_year : (existing[0] && existing[0].school_year);
        await pool.execute(
            `UPDATE annexe_fees SET name = ?, amount = ?, school_year = ?, is_active = COALESCE(?, is_active), order_index = COALESCE(?, order_index) WHERE id = ?`,
            [name.trim(), Number(amount), sy, is_active, order_index, id]
        );
        res.json({ success: true, message: 'Frais annexe mis à jour.' });
    } catch (error) {
        console.error('Erreur updateAnnexeFee:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du frais annexe.' });
    }
};

const deleteAnnexeFee = async (req, res) => {
    try {
        const { id } = req.params;
        const [payments] = await pool.execute('SELECT COUNT(*) as c FROM annexe_fee_payments WHERE annexe_fee_id = ?', [id]);
        if (payments[0].c > 0) {
            return res.status(400).json({
                success: false,
                message: 'Impossible de supprimer : des paiements sont enregistrés pour ce frais. Désactivez-le plutôt.'
            });
        }
        await pool.execute('DELETE FROM annexe_fees WHERE id = ?', [id]);
        res.json({ success: true, message: 'Frais annexe supprimé.' });
    } catch (error) {
        console.error('Erreur deleteAnnexeFee:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
    }
};

// ========== ZONES CAR (chaque zone a un montant, payables plusieurs fois) ==========

const getCarZones = async (req, res) => {
    try {
        const school_year = req.query.school_year || getCurrentSchoolYear();
        const [rows] = await pool.execute(
            `SELECT * FROM car_zones WHERE school_year = ? AND is_active = 1 ORDER BY order_index, name`,
            [school_year]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erreur getCarZones:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des zones car.' });
    }
};

const createCarZone = async (req, res) => {
    try {
        const { name, amount, school_year, order_index } = req.body;
        const sy = school_year || getCurrentSchoolYear();
        if (!name || amount == null) {
            return res.status(400).json({ success: false, message: 'Nom et montant requis.' });
        }
        const [result] = await pool.execute(
            `INSERT INTO car_zones (name, amount, school_year, order_index) VALUES (?, ?, ?, ?)`,
            [name.trim(), Number(amount), sy, order_index != null ? order_index : 0]
        );
        res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Zone car créée.' });
    } catch (error) {
        console.error('Erreur createCarZone:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la création de la zone car.' });
    }
};

const updateCarZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, amount, school_year, is_active, order_index } = req.body;
        if (!name || amount == null) {
            return res.status(400).json({ success: false, message: 'Nom et montant requis.' });
        }
        const [existing] = await pool.execute('SELECT school_year FROM car_zones WHERE id = ?', [id]);
        const sy = school_year != null && school_year !== '' ? school_year : (existing[0] && existing[0].school_year);
        await pool.execute(
            `UPDATE car_zones SET name = ?, amount = ?, school_year = ?, is_active = COALESCE(?, is_active), order_index = COALESCE(?, order_index) WHERE id = ?`,
            [name.trim(), Number(amount), sy, is_active, order_index, id]
        );
        res.json({ success: true, message: 'Zone car mise à jour.' });
    } catch (error) {
        console.error('Erreur updateCarZone:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour de la zone car.' });
    }
};

const deleteCarZone = async (req, res) => {
    try {
        const { id } = req.params;
        const [payments] = await pool.execute('SELECT COUNT(*) as c FROM annexe_fee_payments WHERE car_zone_id = ?', [id]);
        if (payments[0].c > 0) {
            return res.status(400).json({
                success: false,
                message: 'Impossible de supprimer : des paiements car sont enregistrés pour cette zone. Désactivez-la plutôt.'
            });
        }
        await pool.execute('DELETE FROM car_zones WHERE id = ?', [id]);
        res.json({ success: true, message: 'Zone car supprimée.' });
    } catch (error) {
        console.error('Erreur deleteCarZone:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression.' });
    }
};

// ========== PAIEMENTS ÉLÈVE (frais annexes et car) ==========

const getPaymentsByStudent = async (req, res) => {
    try {
        const { student_id, school_year } = req.query;
        const sy = school_year || getCurrentSchoolYear();
        if (!student_id) {
            return res.status(400).json({ success: false, message: 'student_id requis.' });
        }
        const [rows] = await pool.execute(
            `SELECT p.id, p.student_id, p.school_year, p.annexe_fee_id, p.car_zone_id, p.amount, p.payment_date, p.payment_method, p.receipt_number, p.notes, p.created_at,
              af.name AS annexe_fee_name, cz.name AS car_zone_name
             FROM annexe_fee_payments p
             LEFT JOIN annexe_fees af ON p.annexe_fee_id = af.id
             LEFT JOIN car_zones cz ON p.car_zone_id = cz.id
             WHERE p.student_id = ? AND p.school_year = ?
             ORDER BY p.payment_date DESC`,
            [student_id, sy]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Erreur getPaymentsByStudent:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des paiements.' });
    }
};

const createPayment = async (req, res) => {
    try {
        const { student_id, school_year, annexe_fee_id, car_zone_id, amount, payment_date, payment_method, receipt_number, notes } = req.body;
        const sy = school_year || getCurrentSchoolYear();
        if (!student_id || (!annexe_fee_id && !car_zone_id) || (annexe_fee_id && car_zone_id)) {
            return res.status(400).json({ success: false, message: 'Indiquez soit un frais annexe, soit une zone car (pas les deux).' });
        }
        if (annexe_fee_id) {
            const [existing] = await pool.execute(
                'SELECT id FROM annexe_fee_payments WHERE student_id = ? AND school_year = ? AND annexe_fee_id = ?',
                [student_id, sy, annexe_fee_id]
            );
            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'Ce frais annexe a déjà été payé pour cet élève cette année.' });
            }
        }
        const [feeRow] = annexe_fee_id
            ? await pool.execute('SELECT amount FROM annexe_fees WHERE id = ?', [annexe_fee_id])
            : await pool.execute('SELECT amount FROM car_zones WHERE id = ?', [car_zone_id]);
        const expectedAmount = feeRow.length ? Number(feeRow[0].amount) : 0;
        const payAmount = amount != null ? Number(amount) : expectedAmount;
        const method = payment_method || 'Espèces';
        const payDate = payment_date ? new Date(payment_date) : new Date();
        const [result] = await pool.execute(
            `INSERT INTO annexe_fee_payments (student_id, school_year, annexe_fee_id, car_zone_id, amount, payment_date, payment_method, receipt_number, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [student_id, sy, annexe_fee_id || null, car_zone_id || null, payAmount, payDate, method, receipt_number || null, notes || null]
        );
        res.status(201).json({ success: true, data: { id: result.insertId }, message: 'Paiement enregistré.' });
    } catch (error) {
        console.error('Erreur createPayment:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement du paiement.' });
    }
};

// ========== CONFIG GLOBALE (frais annexes + zones car pour une année) ==========

const getConfigBySchoolYear = async (req, res) => {
    try {
        const school_year = req.query.school_year || getCurrentSchoolYear();
        const [annexeFees] = await pool.execute(
            `SELECT * FROM annexe_fees WHERE school_year = ? ORDER BY order_index, name`,
            [school_year]
        );
        const [carZones] = await pool.execute(
            `SELECT * FROM car_zones WHERE school_year = ? ORDER BY order_index, name`,
            [school_year]
        );
        const [feeTotals] = await pool.execute(
            `SELECT annexe_fee_id AS id, COALESCE(SUM(amount), 0) AS total_paid
             FROM annexe_fee_payments WHERE school_year = ? AND annexe_fee_id IS NOT NULL GROUP BY annexe_fee_id`,
            [school_year]
        );
        const [zoneTotals] = await pool.execute(
            `SELECT car_zone_id AS id, COALESCE(SUM(amount), 0) AS total_paid
             FROM annexe_fee_payments WHERE school_year = ? AND car_zone_id IS NOT NULL GROUP BY car_zone_id`,
            [school_year]
        );
        const feeTotalMap = Object.fromEntries((feeTotals || []).map((r) => [r.id, Number(r.total_paid)]));
        const zoneTotalMap = Object.fromEntries((zoneTotals || []).map((r) => [r.id, Number(r.total_paid)]));
        const annexeFeesWithTotal = (annexeFees || []).map((f) => ({ ...f, total_paid: feeTotalMap[f.id] ?? 0 }));
        const carZonesWithTotal = (carZones || []).map((z) => ({ ...z, total_paid: zoneTotalMap[z.id] ?? 0 }));
        res.json({
            success: true,
            data: {
                school_year,
                annexe_fees: annexeFeesWithTotal,
                car_zones: carZonesWithTotal
            }
        });
    } catch (error) {
        console.error('Erreur getConfigBySchoolYear:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération de la configuration.' });
    }
};

module.exports = {
    getAnnexeFees,
    createAnnexeFee,
    updateAnnexeFee,
    deleteAnnexeFee,
    getCarZones,
    createCarZone,
    updateCarZone,
    deleteCarZone,
    getConfigBySchoolYear,
    getPaymentsByStudent,
    createPayment
};
