const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../protected_uploads/'));
    },
    filename: function(req, file, cb) {
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext);
        cb(null, Date.now() + '-' + base.replace(/\s+/g, '_') + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo max pour les vidéos
    fileFilter: (req, file, cb) => {
        // Autoriser les images et vidéos
        const allowedImageTypes = /^image\/(jpeg|png|jpg|gif|webp)$/;
        const allowedVideoTypes = /^video\/(mp4|avi|mov|wmv|flv|webm|mkv)$/;

        if (!file.mimetype.match(allowedImageTypes) && !file.mimetype.match(allowedVideoTypes)) {
            return cb(new Error('Seules les images (jpg, jpeg, png, gif, webp) et vidéos (mp4, avi, mov, wmv, flv, webm, mkv) sont autorisées'));
        }
        cb(null, true);
    }
});

module.exports = upload;