const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { addHistoryEntry } = require('./historyController');
require('dotenv').config();

// Configuration de multer pour l'upload de photos
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = 'uploads/garderie';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'garderie-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: function(req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Seules les images (jpeg, jpg, png, gif) sont autorisées'));
        }
    }
});

// Créer une connexion directe pour éviter les problèmes de pool
const createConnection = async() => {
    return mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_scolaire_creche'
    });
};
const emailService = require('../services/emailService');

// Sauvegarder les données d'inscription de garderie
const saveGarderieInscription = async(req, res) => {
    try {
        console.log('=== DÉBUT DE LA FONCTION saveGarderieInscription ===');
        console.log('Données reçues:', req.body);
        console.log('Fichier reçu:', req.file);

        const {
            firstName,
            lastName,
            civility,
            dateOfBirth,
            startDate,
            endDate,
            childAge,
            cantine,
            eatsAtCantine,
            allergy,
            amountPaid,
            paymentPeriod,
            uniqueCode,
            parentFirstName,
            parentLastName,
            parentPhone,
            parentEmail,
            emergencyContact = '', // Valeur par défaut si non fournie
            cantineAmount = null, // Montant total de cantine fixe
            totalSchoolingAmount = null, // Montant total de scolarité fixe
            initialPayment = null // Versement initial
        } = req.body;

        // Récupérer l'année scolaire actuelle
        const { getCurrentSchoolYear } = require('../config/schoolYear');
        const schoolYear = getCurrentSchoolYear();

        // Convertir les valeurs de cantine en booléens
        const cantineBool = cantine === 'true' || cantine === true || cantine === '1' || cantine === 1;
        const eatsAtCantineBool = eatsAtCantine === 'true' || eatsAtCantine === true || eatsAtCantine === '1' || eatsAtCantine === 1;

        // Récupérer le nom du fichier photo si uploadé
        const childPhoto = req.file ? req.file.filename : null;

        console.log('Données extraites:', {
            firstName,
            lastName,
            civility,
            dateOfBirth,
            startDate,
            endDate,
            childAge,
            cantine,
            eatsAtCantine,
            allergy,
            uniqueCode,
            parentFirstName,
            parentLastName,
            parentPhone,
            parentEmail,
            emergencyContact
        });
        console.log('emergencyContact reçu:', emergencyContact);
        console.log('Type de emergencyContact:', typeof emergencyContact);
        console.log('emergencyContact est null?', emergencyContact === null);
        console.log('emergencyContact est undefined?', emergencyContact === undefined);

        // Vérifier et nettoyer les valeurs
        const cleanEmergencyContact = (emergencyContact !== undefined && emergencyContact !== null) ? emergencyContact : '';
        console.log('emergencyContact nettoyé:', cleanEmergencyContact);

        // Nettoyer et valider toutes les valeurs avant l'insertion
        const cleanValues = {
            firstName: firstName || '',
            lastName: lastName || '',
            civility: civility || '',
            dateOfBirth: dateOfBirth || null,
            startDate: startDate || null,
            endDate: endDate || null,
            childAge: childAge || null,
            childPhoto: childPhoto || null,
            cantineBool: cantineBool || false,
            eatsAtCantineBool: eatsAtCantineBool || null,
            allergy: allergy || '',
            uniqueCode: uniqueCode || '',
            parentFirstName: parentFirstName || '',
            parentLastName: parentLastName || '',
            parentPhone: parentPhone || '',
            parentEmail: parentEmail || '',
            cleanEmergencyContact: cleanEmergencyContact || '',
            cantineAmount: cantineAmount || null,
            totalSchoolingAmount: totalSchoolingAmount || null,
            initialPayment: initialPayment || null,
            schoolYear: schoolYear
        };

        console.log('Valeurs nettoyées:', cleanValues);

        // Utiliser le montant total de cantine fixe
        let calculatedCantineAmount = cleanValues.cantineAmount || null;
        let durationDays = null;

        // Calculer le montant total de scolarité (montant fixe)
        let calculatedTotalSchoolingAmount = cleanValues.totalSchoolingAmount || null;

        // Requête pour insérer les données de garderie
        const query = `
      INSERT INTO garderie_inscriptions (
        child_first_name, child_last_name, civility, date_of_birth,
        start_date, end_date, child_age, child_photo, cantine, eats_at_cantine, allergy,
        unique_code,
        parent_first_name, parent_last_name, parent_phone, parent_email,
        emergency_contact, cantine_amount, duration_days,
        total_schooling_amount, initial_payment, school_year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            cleanValues.firstName,
            cleanValues.lastName,
            cleanValues.civility,
            cleanValues.dateOfBirth,
            cleanValues.startDate,
            cleanValues.endDate,
            cleanValues.childAge,
            cleanValues.childPhoto,
            cleanValues.cantineBool,
            cleanValues.eatsAtCantineBool,
            cleanValues.allergy,
            cleanValues.uniqueCode,
            cleanValues.parentFirstName,
            cleanValues.parentLastName,
            cleanValues.parentPhone,
            cleanValues.parentEmail,
            cleanValues.cleanEmergencyContact,
            calculatedCantineAmount,
            durationDays,
            calculatedTotalSchoolingAmount,
            cleanValues.initialPayment,
            cleanValues.schoolYear
        ];

        console.log('Requête SQL:', query);
        console.log('Valeurs à insérer:', values);
        console.log('Nombre de valeurs:', values.length);
        console.log('Détail des valeurs:');
        values.forEach((value, index) => {
            console.log(`Valeur ${index + 1}:`, value);
        });

        // Remplace undefined par null pour éviter l'erreur MySQL
        const safeValues = values.map(v => v === undefined ? null : v);

        console.log('Exécution de la requête SQL...');
        console.log('Début de la requête à:', new Date().toISOString());

        try {
            const connection = await createConnection();
            console.log('Connexion créée avec succès');

            const [results] = await connection.execute(query, safeValues);
            console.log('Fin de la requête à:', new Date().toISOString());

            await connection.end();
            console.log('Connexion fermée');

            console.log('=== SUCCÈS ===');
            console.log('Résultats:', results);

            // Ajouter l'entrée dans l'historique
            try {
                const studentName = `${firstName} ${lastName}`;
                const actionDescription = `Inscription de garderie pour ${studentName} - Période: ${startDate} à ${endDate}`;
                await addHistoryEntry(req.user.id, 'garderie', actionDescription, null, studentName);
                console.log('✅ Entrée d\'historique ajoutée pour l\'inscription de garderie');
            } catch (historyError) {
                console.log('⚠️ Erreur lors de l\'ajout de l\'historique:', historyError.message);
            }

            console.log('Envoi de la réponse au frontend...');

            // Envoyer l'email de confirmation automatiquement
            try {
                console.log('Envoi de l\'email de confirmation...');
                const emailResult = await emailService.sendGarderieInscriptionConfirmation({
                    parentEmail: parentEmail,
                    parentFirstName: parentFirstName,
                    parentLastName: parentLastName,
                    childFirstName: firstName,
                    childLastName: lastName,
                    startDate: startDate,
                    endDate: endDate,
                    amountPaid: amountPaid,
                    uniqueCode: uniqueCode,
                    paymentPeriod: paymentPeriod,
                    emergencyContact: cleanEmergencyContact
                });

                if (emailResult.success) {
                    console.log('✅ Email de confirmation envoyé avec succès');
                } else {
                    console.log('⚠️ Erreur lors de l\'envoi de l\'email:', emailResult.error);
                }
            } catch (emailError) {
                console.log('⚠️ Erreur lors de l\'envoi de l\'email:', emailError.message);
            }

            res.status(201).json({
                success: true,
                message: 'Inscription de garderie sauvegardée avec succès',
                inscriptionId: results.insertId
            });
            console.log('Réponse envoyée avec succès');

        } catch (error) {
            console.error('=== ERREUR LORS DE LA REQUÊTE ===');
            console.error('Erreur complète:', error);
            console.error('Code d\'erreur:', error.code);
            console.error('Message d\'erreur:', error.message);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la sauvegarde des données',
                error: error.message
            });
        }

    } catch (error) {
        console.error('=== ERREUR GÉNÉRALE ===');
        console.error('Erreur lors de la sauvegarde:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la sauvegarde',
            error: error.message
        });
    }
};

// Récupérer la liste des enfants inscrits
const getChildren = async(req, res) => {
    try {
        console.log('=== DÉBUT DE LA FONCTION getChildren ===');

        // Récupérer l'année scolaire depuis les paramètres de requête ou utiliser l'année actuelle
        const { schoolYear } = req.query;
        const { getCurrentSchoolYear } = require('../config/schoolYear');
        const currentSchoolYear = schoolYear || getCurrentSchoolYear();

        console.log('Année scolaire demandée:', currentSchoolYear);

        const connection = await createConnection();
        console.log('Connexion créée avec succès');

        const query = `
      SELECT 
        gi.id,
        gi.child_first_name,
        gi.child_last_name,
        gi.civility,
        gi.date_of_birth,
        gi.child_age,
        gi.child_photo,
        gi.start_date,
        gi.end_date,
        gi.cantine,
        gi.eats_at_cantine,
        gi.allergy,
        gi.amount_paid,
        gi.payment_period,
        gi.unique_code,
        gi.parent_first_name,
        gi.parent_last_name,
        gi.parent_phone,
        gi.parent_email,
        gi.emergency_contact,
        gi.daily_cantine_rate,
        gi.cantine_amount,
        gi.duration_days,
        gi.daily_schooling_rate,
        gi.total_schooling_amount,
        gi.initial_payment,
        gi.school_year,
        gi.created_at,
        COALESCE(SUM(cp.amount), 0) + COALESCE(gi.initial_payment, 0) as total_paid_amount
      FROM garderie_inscriptions gi
      LEFT JOIN cantine_payments cp ON gi.id = cp.student_id AND cp.student_type = 'garderie'
      WHERE gi.school_year = ?
      GROUP BY gi.id, gi.child_first_name, gi.child_last_name, gi.civility, gi.date_of_birth, gi.child_age, gi.child_photo, gi.start_date, gi.end_date, gi.cantine, gi.eats_at_cantine, gi.allergy, gi.amount_paid, gi.payment_period, gi.unique_code, gi.parent_first_name, gi.parent_last_name, gi.parent_phone, gi.parent_email, gi.emergency_contact, gi.daily_cantine_rate, gi.cantine_amount, gi.duration_days, gi.daily_schooling_rate, gi.total_schooling_amount, gi.initial_payment, gi.school_year, gi.created_at
      ORDER BY gi.created_at DESC
    `;

        console.log('Exécution de la requête SQL...');
        const [results] = await connection.execute(query, [currentSchoolYear]);
        console.log('Résultats récupérés:', results.length, 'enfants pour l\'année scolaire', currentSchoolYear);

        // Debug: Afficher les informations de paiement pour chaque enfant
        results.forEach((child, index) => {
            console.log(`💰 Enfant ${index + 1} (${child.child_first_name}):`);
            console.log(`   - Total scolarité: ${child.total_schooling_amount}`);
            console.log(`   - Versement initial: ${child.initial_payment}`);
            console.log(`   - Total payé (calculé): ${child.total_paid_amount}`);
            console.log(`   - Solde restant: ${child.total_schooling_amount - child.total_paid_amount}`);
        });

        // Vérifier les photos des enfants
        results.forEach((child, index) => {
            if (child.child_photo) {
                const photoPath = path.join(__dirname, '../uploads/garderie', child.child_photo);
                const photoExists = fs.existsSync(photoPath);
                console.log(`📸 Enfant ${index + 1} (${child.child_first_name}): Photo "${child.child_photo}" - Existe: ${photoExists}`);
            } else {
                console.log(`📸 Enfant ${index + 1} (${child.child_first_name}): Aucune photo`);
            }
        });

        await connection.end();
        console.log('Connexion fermée');

        console.log('=== SUCCÈS ===');
        res.status(200).json({
            success: true,
            children: results
        });

    } catch (error) {
        console.error('=== ERREUR ===');
        console.error('Erreur lors de la récupération des enfants:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des enfants',
            error: error.message
        });
    }
};

// Rechercher un enfant par nom ou code unique
const searchChild = async(req, res) => {
    try {
        console.log('=== DÉBUT DE LA FONCTION searchChild ===');
        const { term } = req.query;

        if (!term) {
            return res.status(400).json({
                success: false,
                message: 'Terme de recherche requis'
            });
        }

        console.log('Terme de recherche:', term);

        const connection = await createConnection();
        console.log('Connexion créée avec succès');

        const query = `
      SELECT 
        id,
        child_first_name,
        child_last_name,
        civility,
        date_of_birth,
        child_age,
        child_photo,
        start_date,
        end_date,
        cantine,
        eats_at_cantine,
        allergy,
        amount_paid,
        payment_period,
        unique_code,
        parent_first_name,
        parent_last_name,
        parent_phone,
        parent_email,
        emergency_contact,
        daily_cantine_rate,
        cantine_amount,
        duration_days,
        created_at
      FROM garderie_inscriptions 
      WHERE 
        child_first_name LIKE ? OR 
        child_last_name LIKE ? OR 
        CONCAT(child_first_name, ' ', child_last_name) LIKE ? OR
        unique_code LIKE ?
      ORDER BY created_at DESC
    `;

        const searchTerm = `%${term}%`;
        const values = [searchTerm, searchTerm, searchTerm, searchTerm];

        console.log('Exécution de la requête SQL...');
        const [results] = await connection.execute(query, values);
        console.log('Résultats de recherche:', results.length, 'enfants trouvés');

        await connection.end();
        console.log('Connexion fermée');

        console.log('=== SUCCÈS ===');
        res.status(200).json({
            success: true,
            children: results
        });

    } catch (error) {
        console.error('=== ERREUR ===');
        console.error('Erreur lors de la recherche:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la recherche',
            error: error.message
        });
    }
};

// Réinscription d'un enfant
const reinscription = async(req, res) => {
    try {
        console.log('=== DÉBUT DE LA FONCTION reinscription ===');
        console.log('Données reçues:', req.body);

        const {
            firstName,
            lastName,
            civility,
            dateOfBirth,
            startDate,
            endDate,
            childAge,
            cantine,
            eatsAtCantine,
            allergy,
            amountPaid,
            paymentPeriod,
            uniqueCode,
            parentFirstName,
            parentLastName,
            parentPhone,
            parentEmail,
            emergencyContact,
            originalChildId,
            cantineAmount = null, // Montant total de cantine fixe
            totalSchoolingAmount = null, // Montant total de scolarité fixe
            initialPayment = null // Versement initial
        } = req.body;

        // Convertir les valeurs de cantine en booléens
        const cantineBool = cantine === 'true' || cantine === true || cantine === '1' || cantine === 1;
        const eatsAtCantineBool = eatsAtCantine === 'true' || eatsAtCantine === true || eatsAtCantine === '1' || eatsAtCantine === 1;

        // Récupérer le nom du fichier photo si uploadé
        const childPhoto = req.file ? req.file.filename : null;

        console.log('Données extraites:', {
            firstName,
            lastName,
            civility,
            dateOfBirth,
            startDate,
            endDate,
            childAge,
            cantine,
            eatsAtCantine,
            allergy,
            amountPaid,
            paymentPeriod,
            uniqueCode,
            parentFirstName,
            parentLastName,
            parentPhone,
            parentEmail,
            emergencyContact,
            originalChildId
        });

        // Vérifier et nettoyer les valeurs
        const cleanEmergencyContact = (emergencyContact !== undefined && emergencyContact !== null) ? emergencyContact : '';
        console.log('emergencyContact nettoyé:', cleanEmergencyContact);

        // Nettoyer et valider toutes les valeurs avant l'insertion
        const cleanValues = {
            firstName: firstName || '',
            lastName: lastName || '',
            civility: civility || '',
            dateOfBirth: dateOfBirth || null,
            startDate: startDate || null,
            endDate: endDate || null,
            childAge: childAge || null,
            childPhoto: childPhoto || null,
            cantineBool: cantineBool || false,
            eatsAtCantineBool: eatsAtCantineBool || null,
            allergy: allergy || '',
            amountPaid: amountPaid || null,
            paymentPeriod: paymentPeriod || '',
            uniqueCode: uniqueCode || '',
            parentFirstName: parentFirstName || '',
            parentLastName: parentLastName || '',
            parentPhone: parentPhone || '',
            parentEmail: parentEmail || '',
            cleanEmergencyContact: cleanEmergencyContact || '',
            originalChildId: originalChildId || null,
            cantineAmount: cantineAmount || null,
            totalSchoolingAmount: totalSchoolingAmount || null,
            initialPayment: initialPayment || null
        };

        // Récupérer l'année scolaire actuelle
        const { getCurrentSchoolYear } = require('../config/schoolYear');
        const schoolYear = getCurrentSchoolYear();

        // Ajouter l'année scolaire aux valeurs nettoyées
        cleanValues.schoolYear = schoolYear;

        console.log('Valeurs nettoyées:', cleanValues);

        // Utiliser le montant total de cantine fixe
        let calculatedCantineAmount = cleanValues.cantineAmount || null;
        let durationDays = null;

        // Calculer le montant total de scolarité (montant fixe)
        let calculatedTotalSchoolingAmount = cleanValues.totalSchoolingAmount || null;

        // Requête pour insérer la réinscription
        const query = `
      INSERT INTO garderie_inscriptions (
        child_first_name, child_last_name, civility, date_of_birth,
        start_date, end_date, child_age, child_photo, cantine, eats_at_cantine, allergy,
        unique_code,
        parent_first_name, parent_last_name, parent_phone, parent_email,
        emergency_contact, original_child_id, cantine_amount, duration_days,
        total_schooling_amount, initial_payment, school_year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

        const values = [
            cleanValues.firstName,
            cleanValues.lastName,
            cleanValues.civility,
            cleanValues.dateOfBirth,
            cleanValues.startDate,
            cleanValues.endDate,
            cleanValues.childAge,
            cleanValues.childPhoto,
            cleanValues.cantineBool,
            cleanValues.eatsAtCantineBool,
            cleanValues.allergy,
            cleanValues.uniqueCode,
            cleanValues.parentFirstName,
            cleanValues.parentLastName,
            cleanValues.parentPhone,
            cleanValues.parentEmail,
            cleanValues.cleanEmergencyContact,
            cleanValues.originalChildId,
            calculatedCantineAmount,
            durationDays,
            calculatedTotalSchoolingAmount,
            cleanValues.initialPayment,
            schoolYear
        ];

        console.log('Requête SQL:', query);
        console.log('Valeurs à insérer:', values);
        console.log('Nombre de valeurs:', values.length);

        // Remplace undefined par null pour éviter l'erreur MySQL
        const safeValues = values.map(v => v === undefined ? null : v);

        console.log('Exécution de la requête SQL...');
        console.log('Début de la requête à:', new Date().toISOString());

        try {
            const connection = await createConnection();
            console.log('Connexion créée avec succès');

            const [results] = await connection.execute(query, safeValues);
            console.log('Fin de la requête à:', new Date().toISOString());

            await connection.end();
            console.log('Connexion fermée');

            console.log('=== SUCCÈS ===');
            console.log('Résultats:', results);

            // Ajouter l'entrée dans l'historique
            try {
                const studentName = `${firstName} ${lastName}`;
                const actionDescription = `Réinscription de garderie pour ${studentName} - Période: ${startDate} à ${endDate}`;
                await addHistoryEntry(req.user.id, 'garderie', actionDescription, null, studentName);
                console.log('✅ Entrée d\'historique ajoutée pour la réinscription de garderie');
            } catch (historyError) {
                console.log('⚠️ Erreur lors de l\'ajout de l\'historique:', historyError.message);
            }

            console.log('Envoi de la réponse au frontend...');

            // Envoyer l'email de confirmation automatiquement
            try {
                console.log('Envoi de l\'email de confirmation...');
                const emailResult = await emailService.sendGarderieInscriptionConfirmation({
                    parentEmail: parentEmail,
                    parentFirstName: parentFirstName,
                    parentLastName: parentLastName,
                    childFirstName: firstName,
                    childLastName: lastName,
                    startDate: startDate,
                    endDate: endDate,
                    amountPaid: amountPaid,
                    uniqueCode: uniqueCode,
                    paymentPeriod: paymentPeriod,
                    emergencyContact: cleanEmergencyContact
                });

                if (emailResult.success) {
                    console.log('✅ Email de confirmation envoyé avec succès');
                } else {
                    console.log('⚠️ Erreur lors de l\'envoi de l\'email:', emailResult.error);
                }
            } catch (emailError) {
                console.log('⚠️ Erreur lors de l\'envoi de l\'email:', emailError.message);
            }

            res.status(201).json({
                success: true,
                message: 'Réinscription de garderie sauvegardée avec succès',
                inscriptionId: results.insertId
            });
            console.log('Réponse envoyée avec succès');

        } catch (error) {
            console.error('=== ERREUR LORS DE LA REQUÊTE ===');
            console.error('Erreur complète:', error);
            console.error('Code d\'erreur:', error.code);
            console.error('Message d\'erreur:', error.message);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la sauvegarde des données',
                error: error.message
            });
        }

    } catch (error) {
        console.error('=== ERREUR GÉNÉRALE ===');
        console.error('Erreur lors de la sauvegarde:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la sauvegarde',
            error: error.message
        });
    }
};

// Fonction pour supprimer une inscription
const deleteInscription = async(req, res) => {
    try {
        console.log('=== DÉBUT DE LA FONCTION deleteInscription ===');
        const { id } = req.params;

        console.log('ID de l\'inscription à supprimer:', id);

        // Vérifier que l'inscription existe
        const connection = await createConnection();
        const checkQuery = 'SELECT * FROM garderie_inscriptions WHERE id = ?';
        const [existingInscription] = await connection.execute(checkQuery, [id]);

        if (existingInscription.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Inscription non trouvée'
            });
        }

        const inscription = existingInscription[0];
        const studentName = `${inscription.child_first_name} ${inscription.child_last_name}`;

        // Supprimer l'inscription
        const deleteQuery = 'DELETE FROM garderie_inscriptions WHERE id = ?';
        const [result] = await connection.execute(deleteQuery, [id]);

        await connection.end();

        // Ajouter l'entrée dans l'historique
        try {
            const actionDescription = `Suppression de l'inscription de garderie pour ${studentName}`;
            await addHistoryEntry(req.user.id, 'suppression', actionDescription, null, studentName);
            console.log('✅ Entrée d\'historique ajoutée pour la suppression de garderie');
        } catch (historyError) {
            console.log('⚠️ Erreur lors de l\'ajout de l\'historique:', historyError.message);
        }

        console.log('=== SUCCÈS ===');
        console.log('Inscription supprimée avec succès');

        res.status(200).json({
            success: true,
            message: 'Inscription supprimée avec succès'
        });

    } catch (error) {
        console.error('=== ERREUR ===');
        console.error('Erreur lors de la suppression:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression',
            error: error.message
        });
    }
};

// Fonction pour modifier une inscription
const updateInscription = async(req, res) => {
    try {
        console.log('=== DÉBUT DE LA FONCTION updateInscription ===');
        const { id } = req.params;
        console.log('ID de l\'inscription à modifier:', id);
        console.log('Données reçues:', req.body);

        const {
            firstName,
            lastName,
            civility,
            dateOfBirth,
            startDate,
            endDate,
            childAge,
            cantine,
            eatsAtCantine,
            allergy,
            amountPaid,
            paymentPeriod,
            uniqueCode,
            parentFirstName,
            parentLastName,
            parentPhone,
            parentEmail,
            emergencyContact,
            cantineAmount = null, // Montant total de cantine fixe
            totalSchoolingAmount = null, // Montant total de scolarité fixe
            initialPayment = null // Versement initial
        } = req.body;

        console.log('🔍 Données de scolarité reçues:');
        console.log('   - totalSchoolingAmount:', totalSchoolingAmount, '(type:', typeof totalSchoolingAmount, ')');
        console.log('   - initialPayment:', initialPayment, '(type:', typeof initialPayment, ')');

        // Convertir les valeurs de cantine en booléens
        const cantineBool = cantine === 'true' || cantine === true || cantine === '1' || cantine === 1;
        const eatsAtCantineBool = eatsAtCantine === 'true' || eatsAtCantine === true || eatsAtCantine === '1' || eatsAtCantine === 1;

        // Récupérer le nom du fichier photo si uploadé
        const childPhoto = req.file ? req.file.filename : null;

        // Vérifier que l'inscription existe
        const connection = await createConnection();
        const checkQuery = 'SELECT * FROM garderie_inscriptions WHERE id = ?';
        const [existingInscription] = await connection.execute(checkQuery, [id]);

        if (existingInscription.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Inscription non trouvée'
            });
        }

        // Nettoyer les valeurs
        const cleanEmergencyContact = (emergencyContact !== undefined && emergencyContact !== null) ? emergencyContact : '';

        // Nettoyer et valider toutes les valeurs avant l'insertion
        const cleanValues = {
            firstName: firstName || '',
            lastName: lastName || '',
            civility: civility || '',
            dateOfBirth: dateOfBirth || null,
            startDate: startDate || null,
            endDate: endDate || null,
            childAge: childAge || null,
            childPhoto: childPhoto || null,
            cantineBool: cantineBool || false,
            eatsAtCantineBool: eatsAtCantineBool || null,
            allergy: allergy || '',
            amountPaid: amountPaid || null,
            paymentPeriod: paymentPeriod || '',
            uniqueCode: uniqueCode || '',
            parentFirstName: parentFirstName || '',
            parentLastName: parentLastName || '',
            parentPhone: parentPhone || '',
            parentEmail: parentEmail || '',
            cleanEmergencyContact: cleanEmergencyContact || '',
            cantineAmountValue: cantineAmount || null,
            totalSchoolingAmount: totalSchoolingAmount || null,
            initialPayment: initialPayment || null,
            id: id
        };

        // Récupérer l'année scolaire actuelle
        const { getCurrentSchoolYear } = require('../config/schoolYear');
        const schoolYear = getCurrentSchoolYear();

        console.log('Valeurs nettoyées:', cleanValues);

        // Utiliser le montant total de cantine fixe
        let calculatedCantineAmount = cleanValues.cantineAmountValue || null;
        let durationDays = null;

        // Calculer le montant total de scolarité (montant fixe)
        let calculatedTotalSchoolingAmount = cleanValues.totalSchoolingAmount || null;

        console.log('💰 Calculs de scolarité:');
        console.log('   - totalSchoolingAmount brut:', totalSchoolingAmount);
        console.log('   - totalSchoolingAmount nettoyé:', cleanValues.totalSchoolingAmount);
        console.log('   - initialPayment brut:', initialPayment);
        console.log('   - initialPayment nettoyé:', cleanValues.initialPayment);
        console.log('   - calculatedTotalSchoolingAmount:', calculatedTotalSchoolingAmount);

        // Requête de mise à jour
        const updateQuery = `
      UPDATE garderie_inscriptions SET
        child_first_name = ?,
        child_last_name = ?,
        civility = ?,
        date_of_birth = ?,
        start_date = ?,
        end_date = ?,
        child_age = ?,
        child_photo = ?,
        cantine = ?,
        eats_at_cantine = ?,
        allergy = ?,
        amount_paid = ?,
        payment_period = ?,
        unique_code = ?,
        parent_first_name = ?,
        parent_last_name = ?,
        parent_phone = ?,
        parent_email = ?,
        emergency_contact = ?,
        cantine_amount = ?,
        duration_days = ?,
        total_schooling_amount = ?,
        initial_payment = ?,
        school_year = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

        const values = [
            cleanValues.firstName,
            cleanValues.lastName,
            cleanValues.civility,
            cleanValues.dateOfBirth,
            cleanValues.startDate,
            cleanValues.endDate,
            cleanValues.childAge,
            cleanValues.childPhoto,
            cleanValues.cantineBool,
            cleanValues.eatsAtCantineBool,
            cleanValues.allergy,
            cleanValues.amountPaid,
            cleanValues.paymentPeriod,
            cleanValues.uniqueCode,
            cleanValues.parentFirstName,
            cleanValues.parentLastName,
            cleanValues.parentPhone,
            cleanValues.parentEmail,
            cleanValues.cleanEmergencyContact,
            calculatedCantineAmount,
            durationDays,
            calculatedTotalSchoolingAmount,
            cleanValues.initialPayment,
            schoolYear,
            cleanValues.id
        ];

        console.log('Requête SQL:', updateQuery);
        console.log('Valeurs à mettre à jour:', values);
        console.log('🔍 Valeurs de scolarité dans le tableau:');
        console.log('   - calculatedTotalSchoolingAmount (index 22):', calculatedTotalSchoolingAmount);
        console.log('   - cleanValues.initialPayment (index 23):', cleanValues.initialPayment);

        // Remplace undefined par null pour éviter l'erreur MySQL
        const safeValues = values.map(v => v === undefined ? null : v);

        const [result] = await connection.execute(updateQuery, safeValues);

        await connection.end();

        // Ajouter l'entrée dans l'historique
        try {
            const studentName = `${firstName} ${lastName}`;
            const actionDescription = `Modification de l'inscription de garderie pour ${studentName}`;
            await addHistoryEntry(req.user.id, 'modification', actionDescription, null, studentName);
            console.log('✅ Entrée d\'historique ajoutée pour la modification de garderie');
        } catch (historyError) {
            console.log('⚠️ Erreur lors de l\'ajout de l\'historique:', historyError.message);
        }

        console.log('=== SUCCÈS ===');
        console.log('Inscription mise à jour avec succès');

        res.status(200).json({
            success: true,
            message: 'Inscription mise à jour avec succès',
            inscriptionId: id
        });

    } catch (error) {
        console.error('=== ERREUR ===');
        console.error('Erreur lors de la mise à jour:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour',
            error: error.message
        });
    }
};

// Fonction pour récupérer une inscription par ID
const getInscriptionById = async(req, res) => {
    try {
        console.log('=== DÉBUT DE LA FONCTION getInscriptionById ===');
        const { id } = req.params;

        console.log('ID de l\'inscription à récupérer:', id);

        const connection = await createConnection();
        const query = 'SELECT * FROM garderie_inscriptions WHERE id = ?';
        const [inscriptions] = await connection.execute(query, [id]);

        if (inscriptions.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Inscription non trouvée'
            });
        }

        await connection.end();

        console.log('=== SUCCÈS ===');
        console.log('Inscription récupérée:', inscriptions[0]);

        res.status(200).json({
            success: true,
            inscription: inscriptions[0]
        });

    } catch (error) {
        console.error('=== ERREUR ===');
        console.error('Erreur lors de la récupération:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération',
            error: error.message
        });
    }
};

// Fonction pour servir les photos de la garderie
const serveGarderiePhoto = async(req, res) => {
    try {
        const { filename } = req.params;
        console.log('=== DÉBUT DE LA FONCTION serveGarderiePhoto ===');
        console.log('Nom du fichier demandé:', filename);
        console.log('Headers de la requête:', req.headers);

        // Vérifier que le nom de fichier est valide
        if (!filename || filename.includes('..') || filename.includes('/')) {
            console.log('❌ Nom de fichier invalide');
            return res.status(400).json({ message: 'Nom de fichier invalide' });
        }

        const filePath = path.join(__dirname, '../uploads/garderie', filename);
        console.log('Chemin complet du fichier:', filePath);

        if (fs.existsSync(filePath)) {
            console.log('✅ Fichier trouvé, envoi...');

            // Obtenir les informations du fichier
            const stats = fs.statSync(filePath);
            console.log(`📊 Taille du fichier: ${stats.size} bytes`);

            // Définir le type de contenu approprié
            const ext = path.extname(filename).toLowerCase();
            console.log(`📋 Extension du fichier: ${ext}`);

            if (ext === '.jpg' || ext === '.jpeg') {
                res.setHeader('Content-Type', 'image/jpeg');
            } else if (ext === '.png') {
                res.setHeader('Content-Type', 'image/png');
            } else if (ext === '.gif') {
                res.setHeader('Content-Type', 'image/gif');
            }

            // Ajouter des headers pour éviter la mise en cache
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            console.log('📤 Envoi du fichier...');
            res.sendFile(filePath, (err) => {
                if (err) {
                    console.error('❌ Erreur lors de l\'envoi du fichier:', err);
                } else {
                    console.log('✅ Fichier envoyé avec succès');
                }
            });
        } else {
            console.log('❌ Fichier non trouvé:', filePath);

            // Lister les fichiers disponibles pour le débogage
            const uploadDir = path.join(__dirname, '../uploads/garderie');
            if (fs.existsSync(uploadDir)) {
                const files = fs.readdirSync(uploadDir);
                console.log('📋 Fichiers disponibles dans le dossier:');
                files.forEach(file => console.log(`  - ${file}`));
            }

            res.status(404).json({ message: 'Photo non trouvée' });
        }
    } catch (error) {
        console.error('❌ Erreur lors du service de la photo:', error);
        res.status(500).json({ message: 'Erreur lors du service de la photo' });
    }
};

// Fonction pour effectuer un paiement de scolarité
const makePayment = async(req, res) => {
    try {
        console.log('=== DÉBUT DE LA FONCTION makePayment ===');
        const { childId, amount, paymentMethod, notes } = req.body;

        console.log('Données de paiement reçues:', { childId, amount, paymentMethod, notes });

        if (!childId || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Données de paiement invalides' });
        }

        const connection = await createConnection();

        // Vérifier que l'enfant existe
        const [children] = await connection.execute(
            'SELECT * FROM garderie_inscriptions WHERE id = ?', [childId]
        );

        if (children.length === 0) {
            await connection.end();
            return res.status(404).json({ message: 'Enfant non trouvé' });
        }

        const child = children[0];

        // Insérer le paiement dans la table cantine_payments
        const paymentQuery = `
            INSERT INTO cantine_payments (
                student_id, student_type, amount, payment_method, 
                payment_date, school_year, receipt_number, notes, paid
            ) VALUES (?, 'garderie', ?, ?, NOW(), '2024-2025', ?, ?, 1)
        `;

        const receiptNumber = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        console.log('Exécution de la requête de paiement...');
        await connection.execute(paymentQuery, [
            childId,
            amount,
            paymentMethod,
            receiptNumber,
            notes || ''
        ]);

        console.log('✅ Paiement enregistré avec succès');
        console.log(`   - ID enfant: ${childId}`);
        console.log(`   - Montant: ${amount} FCFA`);
        console.log(`   - Méthode: ${paymentMethod}`);
        console.log(`   - Reçu: ${receiptNumber}`);

        // Ajouter l'entrée dans l'historique
        try {
            const studentName = `${child.child_first_name} ${child.child_last_name}`;
            const actionDescription = `Paiement de garderie de ${amount} FCFA pour ${studentName}`;
            await addHistoryEntry(req.user.id, 'paiement', actionDescription, amount, studentName);
            console.log('✅ Entrée d\'historique ajoutée pour le paiement de garderie');
        } catch (historyError) {
            console.log('⚠️ Erreur lors de l\'ajout de l\'historique:', historyError.message);
        }

        await connection.end();

        res.status(200).json({
            message: 'Paiement effectué avec succès',
            receiptNumber: receiptNumber
        });

    } catch (error) {
        console.error('Erreur lors du paiement:', error);
        res.status(500).json({ message: 'Erreur lors du paiement' });
    }
};

// Fonction pour récupérer l'historique des reçus
const getReceiptHistory = async(req, res) => {
    try {
        console.log('=== DÉBUT DE LA FONCTION getReceiptHistory ===');
        const { id } = req.params;

        console.log('ID de l\'enfant:', id);

        const connection = await createConnection();

        // Récupérer les inscriptions
        const inscriptionQuery = `
            SELECT 
                'inscription' as type,
                created_at as date,
                CONCAT('Inscription de garderie - ', child_first_name, ' ', child_last_name) as description,
                total_schooling_amount as amount,
                id as inscription_id,
                NULL as payment_id
            FROM garderie_inscriptions 
            WHERE id = ?
        `;

        // Récupérer les paiements
        const paymentQuery = `
            SELECT 
                'paiement' as type,
                payment_date as date,
                CONCAT('Paiement de garderie - ', notes) as description,
                amount,
                NULL as inscription_id,
                id as payment_id
            FROM cantine_payments 
            WHERE student_id = ? AND student_type = 'garderie'
        `;

        const [inscriptions] = await connection.execute(inscriptionQuery, [id]);
        const [payments] = await connection.execute(paymentQuery, [id]);

        // Combiner et trier par date
        const allReceipts = [...inscriptions, ...payments].sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );

        await connection.end();

        console.log('=== SUCCÈS ===');
        console.log('Historique récupéré:', allReceipts.length, 'reçus');

        res.status(200).json({
            success: true,
            receipts: allReceipts
        });

    } catch (error) {
        console.error('=== ERREUR ===');
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération de l\'historique',
            error: error.message
        });
    }
};

// Fonction pour générer le reçu d'inscription
const getInscriptionReceipt = async(req, res) => {
        try {
            console.log('=== DÉBUT DE LA FONCTION getInscriptionReceipt ===');
            const { id } = req.params;
            const { inscription_date } = req.query;

            console.log('ID de l\'enfant:', id);
            console.log('Date d\'inscription:', inscription_date);

            const connection = await createConnection();

            // Récupérer les informations de l'inscription
            const query = `
            SELECT 
                gi.*,
                DATE(gi.created_at) as inscription_date
            FROM garderie_inscriptions gi
            WHERE gi.id = ?
        `;

            const [inscriptions] = await connection.execute(query, [id]);

            if (inscriptions.length === 0) {
                await connection.end();
                return res.status(404).json({
                    success: false,
                    message: 'Inscription non trouvée'
                });
            }

            const inscription = inscriptions[0];

            // Générer le HTML du reçu
            const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Reçu d'inscription - Garderie</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .logo { width: 200px; height: 50px; margin-bottom: 10px; }
                    .title { color: #1976d2; font-size: 24px; font-weight: bold; margin: 10px 0; }
                    .subtitle { color: #1976d2; font-size: 18px; font-weight: 600; margin: 5px 0; }
                    .receipt { border: 2px solid #1976d2; padding: 20px; margin: 20px 0; }
                    .section { margin: 20px 0; }
                    .section-title { font-weight: bold; color: #1976d2; margin-bottom: 10px; }
                    .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
                    .label { font-weight: bold; }
                    .value { text-align: right; }
                    .total { font-weight: bold; font-size: 18px; color: #1976d2; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        <img src="https://lapetiteacademie.ci/img/pages/logo.jpg" alt="Logo École" style="width: 200px; height: 50px; object-fit: contain; margin-bottom: 10px;" />
                    </div>
                    <div class="title">LA MAISON DES ENFANTS</div>
                    <div class="subtitle">LA PETITE ACADÉMIE</div>
                    <div style="margin-top: 10px; color: #666;">Garderie</div>
                </div>

                <div class="receipt">
                    <div class="section">
                        <div class="section-title">REÇU D'INSCRIPTION</div>
                        <div class="info-row">
                            <span class="label">Date:</span>
                            <span class="value">${new Date(inscription.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Code unique:</span>
                            <span class="value">${inscription.unique_code || '-'}</span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">INFORMATIONS DE L'ENFANT</div>
                        <div class="info-row">
                            <span class="label">Nom:</span>
                            <span class="value">${inscription.child_first_name} ${inscription.child_last_name}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Date de naissance:</span>
                            <span class="value">${inscription.date_of_birth ? new Date(inscription.date_of_birth).toLocaleDateString('fr-FR') : '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Âge:</span>
                            <span class="value">${inscription.child_age || '-'} ans</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Période:</span>
                            <span class="value">${inscription.start_date ? new Date(inscription.start_date).toLocaleDateString('fr-FR') : '-'} à ${inscription.end_date ? new Date(inscription.end_date).toLocaleDateString('fr-FR') : '-'}</span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">INFORMATIONS DES PARENTS</div>
                        <div class="info-row">
                            <span class="label">Nom du parent:</span>
                            <span class="value">${inscription.parent_first_name} ${inscription.parent_last_name}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Téléphone:</span>
                            <span class="value">${inscription.parent_phone || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Email:</span>
                            <span class="value">${inscription.parent_email || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Contact d'urgence:</span>
                            <span class="value">${inscription.emergency_contact || '-'}</span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">DÉTAILS DE LA SCOLARITÉ</div>
                        <div class="info-row">
                            <span class="label">Cantine:</span>
                            <span class="value">${inscription.cantine ? 'Oui' : 'Non'}</span>
                        </div>
                        ${inscription.cantine ? `
                        <div class="info-row">
                            <span class="label">Mange à la cantine:</span>
                            <span class="value">${inscription.eats_at_cantine ? 'Oui' : 'Non'}</span>
                        </div>
                        ` : ''}
                        ${inscription.allergy ? `
                        <div class="info-row">
                            <span class="label">Allergies:</span>
                            <span class="value">${inscription.allergy}</span>
                        </div>
                        ` : ''}
                        <div class="info-row">
                            <span class="label">Montant total de scolarité:</span>
                            <span class="value">${inscription.total_schooling_amount ? Number(inscription.total_schooling_amount).toLocaleString('fr-FR') : '0'} F CFA</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Versement initial:</span>
                            <span class="value">${inscription.initial_payment ? Number(inscription.initial_payment).toLocaleString('fr-FR') : '0'} F CFA</span>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <p>Ce document certifie l'inscription de l'enfant à la garderie.</p>
                    <p>Merci de votre confiance.</p>
                </div>
            </body>
            </html>
        `;

        await connection.end();

        console.log('=== SUCCÈS ===');
        console.log('Reçu d\'inscription généré');

        res.status(200).json({
            success: true,
            html: html
        });

    } catch (error) {
        console.error('=== ERREUR ===');
        console.error('Erreur lors de la génération du reçu d\'inscription:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la génération du reçu d\'inscription',
            error: error.message
        });
    }
};

// Fonction pour générer le reçu de paiement
const getPaymentReceipt = async(req, res) => {
    try {
        console.log('=== DÉBUT DE LA FONCTION getPaymentReceipt ===');
        const { id, paymentId } = req.params;

        console.log('ID de l\'enfant:', id);
        console.log('ID du paiement:', paymentId);

        const connection = await createConnection();

        // Récupérer les informations du paiement et de l'enfant
        const query = `
            SELECT 
                cp.*,
                gi.child_first_name,
                gi.child_last_name,
                gi.unique_code,
                gi.parent_first_name,
                gi.parent_last_name,
                gi.parent_phone,
                gi.parent_email,
                gi.total_schooling_amount
            FROM cantine_payments cp
            JOIN garderie_inscriptions gi ON cp.student_id = gi.id
            WHERE cp.id = ? AND cp.student_id = ? AND cp.student_type = 'garderie'
        `;

        const [payments] = await connection.execute(query, [paymentId, id]);

        if (payments.length === 0) {
            await connection.end();
            return res.status(404).json({
                success: false,
                message: 'Paiement non trouvé'
            });
        }

        const payment = payments[0];

        // Calculer le total payé pour cet enfant
        const totalPaidQuery = `
            SELECT COALESCE(SUM(amount), 0) as total_paid
            FROM cantine_payments 
            WHERE student_id = ? AND student_type = 'garderie'
        `;

        const [totalPaidResult] = await connection.execute(totalPaidQuery, [id]);
        const totalPaid = totalPaidResult[0].total_paid;

        // Calculer le reste à payer
        const remainingAmount = Math.max(0, (payment.total_schooling_amount || 0) - totalPaid);

        // Générer le HTML du reçu
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Reçu de paiement - Garderie</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .logo { width: 200px; height: 50px; margin-bottom: 10px; }
                    .title { color: #1976d2; font-size: 24px; font-weight: bold; margin: 10px 0; }
                    .subtitle { color: #1976d2; font-size: 18px; font-weight: 600; margin: 5px 0; }
                    .receipt { border: 2px solid #1976d2; padding: 20px; margin: 20px 0; }
                    .section { margin: 20px 0; }
                    .section-title { font-weight: bold; color: #1976d2; margin-bottom: 10px; }
                    .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
                    .label { font-weight: bold; }
                    .value { text-align: right; }
                    .total { font-weight: bold; font-size: 18px; color: #1976d2; }
                    .status { padding: 5px 10px; border-radius: 3px; font-weight: bold; }
                    .status-paid { background-color: #4caf50; color: white; }
                    .status-unpaid { background-color: #ff9800; color: white; }
                    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        <img src="https://lapetiteacademie.ci/img/pages/logo.jpg" alt="Logo École" style="width: 200px; height: 50px; object-fit: contain; margin-bottom: 10px;" />
                    </div>
                    <div class="title">LA MAISON DES ENFANTS</div>
                    <div class="subtitle">LA PETITE ACADÉMIE</div>
                    <div style="margin-top: 10px; color: #666;">Garderie</div>
                </div>

                <div class="receipt">
                    <div class="section">
                        <div class="section-title">REÇU DE PAIEMENT</div>
                        <div class="info-row">
                            <span class="label">Date:</span>
                            <span class="value">${new Date(payment.payment_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Numéro de reçu:</span>
                            <span class="value">${payment.receipt_number || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Code unique:</span>
                            <span class="value">${payment.unique_code || '-'}</span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">INFORMATIONS DE L'ENFANT</div>
                        <div class="info-row">
                            <span class="label">Nom:</span>
                            <span class="value">${payment.child_first_name} ${payment.child_last_name}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Parent:</span>
                            <span class="value">${payment.parent_first_name} ${payment.parent_last_name}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Téléphone:</span>
                            <span class="value">${payment.parent_phone || '-'}</span>
                        </div>
                    </div>

                    <div class="section">
                        <div class="section-title">DÉTAILS DU PAIEMENT</div>
                        <div class="info-row">
                            <span class="label">Montant total de scolarité:</span>
                            <span class="value">${payment.total_schooling_amount ? Number(payment.total_schooling_amount).toLocaleString('fr-FR') : '0'} F CFA</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Total déjà payé:</span>
                            <span class="value">${Number(totalPaid).toLocaleString('fr-FR')} F CFA</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Montant de ce versement:</span>
                            <span class="value">${Number(payment.amount).toLocaleString('fr-FR')} F CFA</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Méthode de paiement:</span>
                            <span class="value">${payment.payment_method || 'Non spécifiée'}</span>
                        </div>
                        ${payment.notes ? `
                        <div class="info-row">
                            <span class="label">Notes:</span>
                            <span class="value">${payment.notes}</span>
                        </div>
                        ` : ''}
                        <div class="info-row">
                            <span class="label">Reste à payer:</span>
                            <span class="value" style="color: ${remainingAmount > 0 ? '#ff9800' : '#4caf50'}; font-weight: bold;">
                                ${Number(remainingAmount).toLocaleString('fr-FR')} F CFA
                            </span>
                        </div>
                        <div class="info-row">
                            <span class="label">Statut:</span>
                            <span class="value">
                                <span class="status ${remainingAmount > 0 ? 'status-unpaid' : 'status-paid'}">
                                    ${remainingAmount > 0 ? 'Non soldé' : 'Soldé'}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <p>Ce document certifie le paiement effectué pour la garderie.</p>
                    <p>Merci de votre confiance.</p>
                </div>
            </body>
            </html>
        `;

        await connection.end();

        console.log('=== SUCCÈS ===');
        console.log('Reçu de paiement généré');

        res.status(200).json({
            success: true,
            html: html
        });

    } catch (error) {
        console.error('=== ERREUR ===');
        console.error('Erreur lors de la génération du reçu de paiement:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la génération du reçu de paiement',
            error: error.message
        });
    }
};

module.exports = {
    saveGarderieInscription,
    getChildren,
    searchChild,
    reinscription,
    deleteInscription,
    updateInscription,
    getInscriptionById,
    serveGarderiePhoto,
    upload,
    makePayment,
    getReceiptHistory,
    getInscriptionReceipt,
    getPaymentReceipt
};