const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/homepageController');

// Routes publiques (pas d'authentification requise)
router.get('/activities', getActivities);
router.get('/activities/:id', getActivityById);
router.get('/slider-images', getSliderImages);
router.get('/content', getHomepageContent);
router.get('/images/:filename', serveImage);

// Routes protégées (authentification et rôle requis)
router.post('/activities/:activityId/images/upload', auth, checkRole(['comunicateur', 'admin']), upload.single('image'), addActivityImage);
router.post('/activities/:activityId/images/url', auth, checkRole(['comunicateur', 'admin']), addActivityImageUrl);
router.delete('/activity-images/:imageId', auth, checkRole(['comunicateur', 'admin']), deleteActivityImage);
router.put('/activity-images/:imageId', auth, checkRole(['comunicateur', 'admin']), updateActivityImage);
router.post('/slider-images', auth, checkRole(['comunicateur', 'admin']), addSliderImage);
router.put('/content', auth, checkRole(['comunicateur', 'admin']), updateHomepageContent);

// Route legacy pour compatibilité (redirige vers upload)
router.post('/activities/:activityId/images', auth, checkRole(['comunicateur', 'admin']), upload.single('image'), addActivityImage);

module.exports = router;