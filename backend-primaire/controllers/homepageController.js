const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration de la base de données
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lapetite_academie'
};

// Configuration Multer pour l'upload d'images
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'homepage');
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accepter seulement les images
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Seuls les fichiers image sont autorisés'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});

// Fonction pour créer une connexion à la base de données
const createConnection = async() => {
    try {
        return await mysql.createConnection(dbConfig);
    } catch (error) {
        console.error('Erreur de connexion à la base de données:', error);
        throw error;
    }
};

// Récupérer toutes les activités avec leurs images
const getActivities = async(req, res) => {
    try {
        const connection = await createConnection();

        const [activities] = await connection.execute(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.color,
        a.is_active,
        a.order_index,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', ai.id,
            'image_url', ai.image_url,
            'alt_text', ai.alt_text,
            'order_index', ai.order_index,
            'is_active', ai.is_active
          )
        ) as images
      FROM activities a
      LEFT JOIN activity_images ai ON a.id = ai.activity_id AND ai.is_active = 1
      WHERE a.is_active = 1
      GROUP BY a.id
      ORDER BY a.order_index
    `);

        // Traiter les images (JSON_ARRAYAGG peut retourner [null] si pas d'images)
        const processedActivities = activities.map(activity => {
            let images = [];
            try {
                // Si images est une chaîne JSON, la parser
                if (typeof activity.images === 'string') {
                    const parsedImages = JSON.parse(activity.images);
                    images = Array.isArray(parsedImages) ? parsedImages : [];
                } else if (Array.isArray(activity.images)) {
                    images = activity.images;
                }

                // Filtrer les images null ou invalides
                images = images.filter(img => img && img.id && img.image_url);
            } catch (error) {
                console.error('Erreur lors du parsing des images:', error);
                images = [];
            }

            return {
                ...activity,
                images: images
            };
        });

        await connection.end();

        res.json({
            status: 'success',
            data: processedActivities
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des activités:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur lors de la récupération des activités'
        });
    }
};

// Récupérer une activité spécifique avec ses images
const getActivityById = async(req, res) => {
    try {
        const { id } = req.params;
        const connection = await createConnection();

        const [activities] = await connection.execute(`
      SELECT 
        a.id,
        a.name,
        a.description,
        a.color,
        a.is_active,
        a.order_index,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', ai.id,
            'image_url', ai.image_url,
            'alt_text', ai.alt_text,
            'order_index', ai.order_index,
            'is_active', ai.is_active
          )
        ) as images
      FROM activities a
      LEFT JOIN activity_images ai ON a.id = ai.activity_id AND ai.is_active = 1
      WHERE a.id = ? AND a.is_active = 1
      GROUP BY a.id
    `, [id]);

        if (activities.length === 0) {
            await connection.end();
            return res.status(404).json({
                status: 'error',
                message: 'Activité non trouvée'
            });
        }

        const activity = activities[0];

        // Traiter les images
        let images = [];
        try {
            // Si images est une chaîne JSON, la parser
            if (typeof activity.images === 'string') {
                const parsedImages = JSON.parse(activity.images);
                images = Array.isArray(parsedImages) ? parsedImages : [];
            } else if (Array.isArray(activity.images)) {
                images = activity.images;
            }

            // Filtrer les images null ou invalides
            images = images.filter(img => img && img.id && img.image_url);
        } catch (error) {
            console.error('Erreur lors du parsing des images:', error);
            images = [];
        }

        activity.images = images;

        await connection.end();

        res.json({
            status: 'success',
            data: activity
        });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'activité:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur lors de la récupération de l\'activité'
        });
    }
};

// Ajouter une image via upload de fichier
const addActivityImage = async(req, res) => {
    try {
        const { activityId } = req.params;
        const { alt_text } = req.body;

        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'Aucun fichier fourni'
            });
        }

        const connection = await createConnection();

        // Vérifier que l'activité existe
        const [activities] = await connection.execute(
            'SELECT id FROM activities WHERE id = ? AND is_active = 1', [activityId]
        );

        if (activities.length === 0) {
            await connection.end();
            return res.status(404).json({
                status: 'error',
                message: 'Activité non trouvée'
            });
        }

        // Construire l'URL de l'image
        const imageUrl = `/uploads/homepage/${req.file.filename}`;

        // Insérer l'image en base
        const [result] = await connection.execute(`
      INSERT INTO activity_images (activity_id, image_url, alt_text, order_index, is_active)
      VALUES (?, ?, ?, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM activity_images ai WHERE ai.activity_id = ?), 1)
    `, [activityId, imageUrl, alt_text || null, activityId]);

        await connection.end();

        res.json({
            status: 'success',
            message: 'Image ajoutée avec succès',
            data: {
                id: result.insertId,
                image_url: imageUrl,
                alt_text: alt_text || null
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'image:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur lors de l\'ajout de l\'image'
        });
    }
};

// Ajouter une image via URL
const addActivityImageUrl = async(req, res) => {
    try {
        const { activityId } = req.params;
        const { image_url, alt_text } = req.body;

        if (!image_url) {
            return res.status(400).json({
                status: 'error',
                message: 'URL de l\'image requise'
            });
        }

        const connection = await createConnection();

        // Vérifier que l'activité existe
        const [activities] = await connection.execute(
            'SELECT id FROM activities WHERE id = ? AND is_active = 1', [activityId]
        );

        if (activities.length === 0) {
            await connection.end();
            return res.status(404).json({
                status: 'error',
                message: 'Activité non trouvée'
            });
        }

        // Insérer l'image en base
        const [result] = await connection.execute(`
      INSERT INTO activity_images (activity_id, image_url, alt_text, order_index, is_active)
      VALUES (?, ?, ?, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM activity_images ai WHERE ai.activity_id = ?), 1)
    `, [activityId, image_url, alt_text || null, activityId]);

        await connection.end();

        res.json({
            status: 'success',
            message: 'Image ajoutée avec succès',
            data: {
                id: result.insertId,
                image_url: image_url,
                alt_text: alt_text || null
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'image:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur lors de l\'ajout de l\'image'
        });
    }
};

// Supprimer une image
const deleteActivityImage = async(req, res) => {
    try {
        const { imageId } = req.params;
        const connection = await createConnection();

        // Récupérer les informations de l'image avant suppression
        const [images] = await connection.execute(
            'SELECT image_url FROM activity_images WHERE id = ?', [imageId]
        );

        if (images.length === 0) {
            await connection.end();
            return res.status(404).json({
                status: 'error',
                message: 'Image non trouvée'
            });
        }

        const imageUrl = images[0].image_url;

        // Supprimer l'image de la base de données
        await connection.execute(
            'DELETE FROM activity_images WHERE id = ?', [imageId]
        );

        await connection.end();

        // Supprimer le fichier physique si c'est un upload local
        if (imageUrl && imageUrl.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '..', imageUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({
            status: 'success',
            message: 'Image supprimée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'image:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur lors de la suppression de l\'image'
        });
    }
};

// Mettre à jour une image
const updateActivityImage = async(req, res) => {
    try {
        const { imageId } = req.params;
        const { alt_text, is_active } = req.body;
        const connection = await createConnection();

        const [result] = await connection.execute(`
      UPDATE activity_images 
      SET alt_text = ?, is_active = ?
      WHERE id = ?
    `, [alt_text || null, is_active !== undefined ? is_active : 1, imageId]);

        if (result.affectedRows === 0) {
            await connection.end();
            return res.status(404).json({
                status: 'error',
                message: 'Image non trouvée'
            });
        }

        await connection.end();

        res.json({
            status: 'success',
            message: 'Image mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'image:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur lors de la mise à jour de l\'image'
        });
    }
};

// Récupérer les images du slider
const getSliderImages = async(req, res) => {
    try {
        const connection = await createConnection();

        const [images] = await connection.execute(`
      SELECT id, image_url, alt_text, order_index, is_active
      FROM slider_images
      WHERE is_active = 1
      ORDER BY order_index
    `);

        await connection.end();

        res.json({
            status: 'success',
            data: images
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des images du slider:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur lors de la récupération des images du slider'
        });
    }
};

// Ajouter une image au slider
const addSliderImage = async(req, res) => {
    try {
        const { image_url, alt_text } = req.body;
        const connection = await createConnection();

        const [result] = await connection.execute(`
      INSERT INTO slider_images (image_url, alt_text, order_index, is_active)
      VALUES (?, ?, (SELECT COALESCE(MAX(order_index), 0) + 1 FROM slider_images), 1)
    `, [image_url, alt_text || null]);

        await connection.end();

        res.json({
            status: 'success',
            message: 'Image du slider ajoutée avec succès',
            data: {
                id: result.insertId,
                image_url,
                alt_text: alt_text || null
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout de l\'image du slider:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur lors de l\'ajout de l\'image du slider'
        });
    }
};

// Récupérer le contenu de la page d'accueil
const getHomepageContent = async(req, res) => {
    try {
        const connection = await createConnection();

        const [content] = await connection.execute(`
      SELECT * FROM homepage_content WHERE id = 1
    `);

        await connection.end();

        if (content.length === 0) {
            return res.json({
                status: 'success',
                data: {
                    welcome_title: 'Bienvenue à La Petite Académie',
                    welcome_subtitle: 'L\'excellence éducative pour nos enfants',
                    about_title: 'À propos de nous',
                    about_content: 'La Petite Académie est un établissement d\'excellence...'
                }
            });
        }

        res.json({
            status: 'success',
            data: content[0]
        });
    } catch (error) {
        console.error('Erreur lors de la récupération du contenu:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur lors de la récupération du contenu'
        });
    }
};

// Servir une image uploadée
const serveImage = async(req, res) => {
    try {
        const { filename } = req.params;
        const imagePath = path.join(__dirname, '..', 'uploads', 'homepage', filename);

        // Vérifier si le fichier existe
        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({
                status: 'error',
                message: 'Image non trouvée'
            });
        }

        // Servir le fichier
        res.sendFile(imagePath);
    } catch (error) {
        console.error('Erreur lors du service de l\'image:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur lors du service de l\'image'
        });
    }
};

// Mettre à jour le contenu de la page d'accueil
const updateHomepageContent = async(req, res) => {
    try {
        const { welcome_title, welcome_subtitle, about_title, about_content } = req.body;
        const connection = await createConnection();

        await connection.execute(`
      INSERT INTO homepage_content (id, welcome_title, welcome_subtitle, about_title, about_content)
      VALUES (1, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        welcome_title = VALUES(welcome_title),
        welcome_subtitle = VALUES(welcome_subtitle),
        about_title = VALUES(about_title),
        about_content = VALUES(about_content)
    `, [welcome_title, welcome_subtitle, about_title, about_content]);

        await connection.end();

        res.json({
            status: 'success',
            message: 'Contenu mis à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du contenu:', error);
        res.status(500).json({
            status: 'error',
            message: 'Erreur lors de la mise à jour du contenu'
        });
    }
};

module.exports = {
    getActivities,
    getActivityById,
    addActivityImage,
    addActivityImageUrl,
    deleteActivityImage,
    updateActivityImage,
    getSliderImages,
    addSliderImage,
    getHomepageContent,
    updateHomepageContent,
    serveImage,
    upload
};