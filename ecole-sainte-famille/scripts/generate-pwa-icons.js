/**
 * Génère toutes les icônes PWA à partir du logo Sainte Famille.
 * Source : public/img/sainte/logo.jpg
 * Sortie : public/icons/*.webp + public/ms-icon-144x144.png + public/apple-touch-icon.png
 *
 * Usage : npm run generate-pwa-icons
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const LOGO_PATH = path.join(PUBLIC_DIR, 'img', 'sainte', 'logo.jpg');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

// Toutes les tailles utilisées par index.html et manifest.json
const SIZES = [16, 32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];

async function generateIcons() {
    if (!fs.existsSync(LOGO_PATH)) {
        console.error('Logo introuvable :', LOGO_PATH);
        process.exit(1);
    }

    fs.mkdirSync(ICONS_DIR, { recursive: true });

    console.log('Génération des icônes à partir de', LOGO_PATH);
    const image = sharp(LOGO_PATH);

    // WebP pour chaque taille
    for (const size of SIZES) {
        const outPath = path.join(ICONS_DIR, `icon-${size}x${size}.webp`);
        await image
            .clone()
            .resize(size, size)
            .webp({ quality: 90 })
            .toFile(outPath);
        console.log('  ✓', path.relative(PUBLIC_DIR, outPath));
    }

    // PNG 144x144 pour Microsoft Tile (index.html : ms-icon-144x144.png)
    const msIconPath = path.join(PUBLIC_DIR, 'ms-icon-144x144.png');
    await image
        .clone()
        .resize(144, 144)
        .png()
        .toFile(msIconPath);
    console.log('  ✓', path.relative(PUBLIC_DIR, msIconPath));

    // PNG 180x180 pour apple-touch-icon (recommandé par Apple)
    const appleIconPath = path.join(PUBLIC_DIR, 'apple-touch-icon.png');
    await image
        .clone()
        .resize(180, 180)
        .png()
        .toFile(appleIconPath);
    console.log('  ✓', path.relative(PUBLIC_DIR, appleIconPath));

    // PNG 32x32 pour favicon (optionnel : vous pouvez le convertir en .ico en ligne)
    const faviconPngPath = path.join(ICONS_DIR, 'icon-32x32.png');
    await image
        .clone()
        .resize(32, 32)
        .png()
        .toFile(faviconPngPath);
    console.log('  ✓', path.relative(PUBLIC_DIR, faviconPngPath));

    console.log('\nIcônes générées avec succès.');
    console.log('Pour remplacer favicon.ico : convertissez public/icons/icon-32x32.png en .ico (ex. https://favicon.io/) puis remplacez public/favicon.ico');
}

generateIcons().catch((err) => {
    console.error('Erreur:', err);
    process.exit(1);
});
