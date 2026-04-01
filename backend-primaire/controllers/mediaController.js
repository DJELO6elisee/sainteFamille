const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Configuration du stockage pour les médias admin
const adminStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Déterminer le dossier de destination basé sur l'élève ou la classe
        let uploadPath = 'protected_uploads';

        if (req.body.student_id) {
            // Si c'est pour un élève spécifique, créer un dossier avec son nom
            const studentId = req.body.student_id;
            uploadPath = path.join('protected_uploads', 'students', studentId.toString());
        } else if (req.body.class_id) {
            // Si c'est pour une classe, créer un dossier pour la classe
            const classId = req.body.class_id;
            uploadPath = path.join('protected_uploads', 'classes', classId.toString());
        }

        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = file.originalname;
        const extension = path.extname(originalName);
        const filename = `${timestamp}-${originalName}`;
        cb(null, filename);
    }
});

// Configuration du stockage pour les médias élèves
const studentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads';
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = file.originalname;
        const extension = path.extname(originalName);
        const filename = `${timestamp}-${originalName}`;
        cb(null, filename);
    }
});

// Configuration des filtres de fichiers
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm'];

    if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non supporté'), false);
    }
};

// Configuration de multer pour les médias admin
const uploadAdmin = multer({
    storage: adminStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max
    }
});

// Configuration de multer pour les médias élèves
const uploadStudent = multer({
    storage: studentStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
    }
});

// Fonction pour créer la structure de dossiers pour un élève
const createStudentFolder = async(studentId) => {
    try {
        // Récupérer les informations de l'élève
        const [students] = await pool.query(
            'SELECT first_name, last_name FROM students WHERE id = ?', [studentId]
        );

        if (students.length === 0) {
            throw new Error('Élève non trouvé');
        }

        const student = students[0];
        const studentName = `${student.first_name}_${student.last_name}`.replace(/[^a-zA-Z0-9]/g, '_');
        const folderPath = path.join('protected_uploads', 'students', studentId.toString(), studentName);

        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        return folderPath;
    } catch (error) {
        console.error('Erreur lors de la création du dossier élève:', error);
        throw error;
    }
};

// Fonction pour créer la structure de dossiers pour une classe
const createClassFolder = async(classId) => {
    try {
        // Récupérer les informations de la classe
        const [classes] = await pool.query(
            'SELECT name FROM classes WHERE id = ?', [classId]
        );

        if (classes.length === 0) {
            throw new Error('Classe non trouvée');
        }

        const className = classes[0].name.replace(/[^a-zA-Z0-9]/g, '_');
        const folderPath = path.join('protected_uploads', 'classes', classId.toString(), className);

        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        return folderPath;
    } catch (error) {
        console.error('Erreur lors de la création du dossier classe:', error);
        throw error;
    }
};

const mediaController = {
    // Upload de média admin (existant)
    uploadMedia: async(req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Aucun fichier fourni' });
            }

            const { media_type, description, student_id, class_id } = req.body;
            const uploadedBy = req.user.id;

            // Déterminer le type de média basé sur l'extension
            const ext = path.extname(req.file.originalname).toLowerCase();
            const isVideo = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'].includes(ext);
            const detectedMediaType = isVideo ? 'video' : 'photo';

            // Créer le dossier approprié
            let folderPath = '';
            if (student_id) {
                folderPath = await createStudentFolder(student_id);
            } else if (class_id) {
                folderPath = await createClassFolder(class_id);
            }

            // Déplacer le fichier vers le bon dossier si nécessaire
            if (folderPath && req.file.path) {
                const newPath = path.join(folderPath, req.file.filename);
                fs.renameSync(req.file.path, newPath);
                req.file.path = newPath;
            }

            const query = `
                INSERT INTO admin_media (filename, original_name, media_type, description, uploaded_by, student_id, class_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `;

            const [result] = await pool.query(query, [
                req.file.filename,
                req.file.originalname,
                detectedMediaType,
                description || null,
                uploadedBy,
                student_id || null,
                class_id || null
            ]);

            res.status(201).json({
                message: 'Média uploadé avec succès',
                media_id: result.insertId,
                file_path: req.file.path
            });

        } catch (error) {
            console.error('Erreur upload média admin:', error);
            res.status(500).json({ message: 'Erreur lors de l\'upload du média' });
        }
    },

    // Récupérer tous les médias admin (existant)
    getAllMedia: async(req, res) => {
        try {
            const query = `
                SELECT 
                    am.id,
                    am.filename,
                    am.original_name,
                    am.media_type,
                    am.description,
                    am.created_at as uploaded_at,
                    am.student_id,
                    am.class_id,
                    s.first_name as student_first_name,
                    s.last_name as student_last_name,
                    c.name as class_name
                FROM admin_media am
                LEFT JOIN students s ON am.student_id = s.id
                LEFT JOIN classes c ON am.class_id = c.id
                ORDER BY am.created_at DESC
            `;

            const [media] = await pool.query(query);

            // Ajouter les noms complets des élèves et les chemins de fichiers
            const mediaWithDetails = media.map(item => ({
                ...item,
                student_name: item.student_first_name && item.student_last_name ?
                    `${item.student_first_name} ${item.student_last_name}` : null,
                file_path: item.student_id ?
                    `protected_uploads/students/${item.student_id}/${item.filename}` : item.class_id ?
                    `protected_uploads/classes/${item.class_id}/${item.filename}` : `protected_uploads/${item.filename}`
            }));

            res.json(mediaWithDetails);

        } catch (error) {
            console.error('Erreur récupération médias admin:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des médias' });
        }
    },

    // Supprimer un média (existant)
    deleteMedia: async(req, res) => {
        try {
            const { id } = req.params;

            // Récupérer les informations du média
            const [media] = await pool.query('SELECT filename, student_id, class_id FROM admin_media WHERE id = ?', [id]);

            if (media.length === 0) {
                return res.status(404).json({ message: 'Média non trouvé' });
            }

            const mediaItem = media[0];
            let filePath = '';

            // Construire le chemin du fichier
            if (mediaItem.student_id) {
                filePath = path.join('protected_uploads', 'students', mediaItem.student_id.toString(), mediaItem.filename);
            } else if (mediaItem.class_id) {
                filePath = path.join('protected_uploads', 'classes', mediaItem.class_id.toString(), mediaItem.filename);
            } else {
                filePath = path.join('protected_uploads', mediaItem.filename);
            }

            // Supprimer le fichier du système de fichiers
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Supprimer l'enregistrement de la base de données
            await pool.query('DELETE FROM admin_media WHERE id = ?', [id]);

            res.json({ message: 'Média supprimé avec succès' });

        } catch (error) {
            console.error('Erreur suppression média:', error);
            res.status(500).json({ message: 'Erreur lors de la suppression du média' });
        }
    },

    // Envoyer un média aux parents (existant)
    sendMediaToParents: async(req, res) => {
        try {
            const { id } = req.params;

            // Récupérer les informations du média
            const [media] = await pool.query(`
                SELECT am.*, s.parent_email, s.parent_first_name, s.parent_last_name
                FROM admin_media am
                LEFT JOIN students s ON am.student_id = s.id
                WHERE am.id = ?
            `, [id]);

            if (media.length === 0) {
                return res.status(404).json({ message: 'Média non trouvé' });
            }

            const mediaItem = media[0];

            // Ici, vous pouvez ajouter la logique d'envoi d'email aux parents
            // Pour l'instant, on retourne juste un succès
            res.json({
                message: 'Média envoyé aux parents avec succès',
                media_info: {
                    id: mediaItem.id,
                    filename: mediaItem.filename,
                    student_id: mediaItem.student_id,
                    parent_email: mediaItem.parent_email
                }
            });

        } catch (error) {
            console.error('Erreur envoi média aux parents:', error);
            res.status(500).json({ message: 'Erreur lors de l\'envoi aux parents' });
        }
    },

    // Servir un média protégé (existant)
    getProtectedMedia: async(req, res) => {
        try {
            const { id } = req.params;
            let token = req.query.token;
            if (!token && req.headers.authorization) {
                token = req.headers.authorization.replace('Bearer ', '');
            }

            if (!token) {
                return res.status(401).json({ message: 'Token requis' });
            }

            // Vérifier le token
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Essayer de récupérer le média depuis admin_media
            let [media] = await pool.query('SELECT filename, original_name, student_id, class_id FROM admin_media WHERE id = ?', [id]);
            let filePath = null;
            let originalName = null;

            if (media.length > 0) {
                // Média trouvé dans admin_media
                const mediaItem = media[0];
                originalName = mediaItem.original_name;

                // Construire le chemin du fichier
                if (mediaItem.student_id) {
                    // Récupérer le nom de l'élève pour construire le chemin complet
                    const [students] = await pool.query(
                        'SELECT first_name, last_name FROM students WHERE id = ?', [mediaItem.student_id]
                    );

                    if (students.length > 0) {
                        const student = students[0];
                        const studentName = `${student.first_name}_${student.last_name}`.replace(/[^a-zA-Z0-9]/g, '_');
                        filePath = path.join('protected_uploads', 'students', mediaItem.student_id.toString(), studentName, mediaItem.filename);
                    } else {
                        // Fallback si l'élève n'est pas trouvé
                        filePath = path.join('protected_uploads', 'students', mediaItem.student_id.toString(), mediaItem.filename);
                    }
                } else if (mediaItem.class_id) {
                    // Récupérer le nom de la classe pour construire le chemin complet
                    const [classes] = await pool.query(
                        'SELECT name FROM classes WHERE id = ?', [mediaItem.class_id]
                    );

                    if (classes.length > 0) {
                        const className = classes[0].name.replace(/[^a-zA-Z0-9]/g, '_');
                        filePath = path.join('protected_uploads', 'classes', mediaItem.class_id.toString(), className, mediaItem.filename);
                    } else {
                        // Fallback si la classe n'est pas trouvée
                        filePath = path.join('protected_uploads', 'classes', mediaItem.class_id.toString(), mediaItem.filename);
                    }
                } else {
                    filePath = path.join('protected_uploads', mediaItem.filename);
                }
            } else {
                // Essayer de récupérer depuis student_media
                [media] = await pool.query('SELECT filename, original_name FROM student_media WHERE id = ?', [id]);
                if (media.length > 0) {
                    // Les médias élèves sont stockés dans protected_uploads comme les médias admin
                    filePath = path.join('protected_uploads', media[0].filename);
                    originalName = media[0].original_name;
                }
            }

            if (!filePath || !fs.existsSync(filePath)) {
                return res.status(404).json({ message: 'Fichier non trouvé' });
            }

            // Déterminer le type MIME
            const ext = path.extname(originalName).toLowerCase();
            let contentType = 'application/octet-stream';

            if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
                contentType = `image/${ext.slice(1)}`;
            } else if (['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'].includes(ext)) {
                contentType = `video/${ext.slice(1)}`;
            }

            // Headers de sécurité
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
            res.setHeader('Cache-Control', 'private, max-age=3600');
            res.setHeader('X-Content-Type-Options', 'nosniff');

            // Stream le fichier
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);

        } catch (error) {
            console.error('Erreur service média:', error);
            res.status(500).json({ message: 'Erreur lors du service du média' });
        }
    },

    // Upload de média élève (existant)
    uploadStudentMedia: async(req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Aucun fichier fourni' });
            }

            const { student_id, description } = req.body;

            const query = `
                INSERT INTO student_media (student_id, filename, original_name, description, uploaded_at)
                VALUES (?, ?, ?, ?, NOW())
            `;

            const [result] = await pool.query(query, [
                student_id,
                req.file.filename,
                req.file.originalname,
                description || null
            ]);

            res.status(201).json({
                message: 'Média uploadé avec succès',
                media_id: result.insertId
            });

        } catch (error) {
            console.error('Erreur upload média élève:', error);
            res.status(500).json({ message: 'Erreur lors de l\'upload du média' });
        }
    },

    // Récupérer les médias d'un élève (existant)
    getStudentMedia: async(req, res) => {
        try {
            const { student_id } = req.params;

            const query = `
                SELECT id, filename, original_name, description, uploaded_at
                FROM student_media
                WHERE student_id = ?
                ORDER BY uploaded_at DESC
            `;

            const [media] = await pool.query(query, [student_id]);

            // Ajouter l'URL pour chaque média
            const mediaWithUrls = media.map(item => ({
                ...item,
                media_url: `https://lapetiteacademie.ci/api/media/${item.id}`
            }));

            res.json(mediaWithUrls);

        } catch (error) {
            console.error('Erreur récupération médias élève:', error);
            res.status(500).json({ message: 'Erreur lors de la récupération des médias' });
        }
    },

    // Upload de média en masse pour les élèves
    uploadBulkStudentMedia: async(req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Aucun fichier fourni' });
            }

            const { student_ids, description } = req.body;
            let studentIds = [];

            try {
                studentIds = JSON.parse(student_ids);
            } catch (error) {
                return res.status(400).json({ message: 'Format de student_ids invalide' });
            }

            if (!Array.isArray(studentIds) || studentIds.length === 0) {
                return res.status(400).json({ message: 'Aucun élève sélectionné' });
            }

            const results = [];

            for (const studentId of studentIds) {
                const query = `
                    INSERT INTO student_media (student_id, filename, original_name, description, uploaded_at)
                    VALUES (?, ?, ?, ?, NOW())
                `;

                const [result] = await pool.query(query, [
                    studentId,
                    req.file.filename,
                    req.file.originalname,
                    description || null
                ]);

                results.push({
                    student_id: studentId,
                    media_id: result.insertId
                });
            }

            res.status(201).json({
                message: 'Médias uploadés avec succès',
                uploaded_count: results.length,
                results: results
            });

        } catch (error) {
            console.error('Erreur upload média en masse élève:', error);
            res.status(500).json({ message: 'Erreur lors de l\'upload des médias' });
        }
    }
};

module.exports = { mediaController, upload: uploadAdmin, uploadStudent };