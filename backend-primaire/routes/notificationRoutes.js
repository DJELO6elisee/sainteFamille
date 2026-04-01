const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');

// Route temporaire pour éviter l'erreur
router.get('/test', (req, res) => {
    res.json({ message: 'Notifications route working' });
});

module.exports = router;