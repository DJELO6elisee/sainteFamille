#!/usr/bin/env node

/**
 * Script de mise à jour forcée PWA
 * Version: 1.4.0.20250121
 * 
 * Ce script force la mise à jour de la PWA en :
 * 1. Nettoyant les caches
 * 2. Mettant à jour les timestamps
 * 3. Générant un nouveau build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Démarrage de la mise à jour PWA...\n');

// 1. Nettoyer le cache
console.log('🧹 Nettoyage des caches...');
try {
    // Nettoyer le cache npm
    execSync('npm run clear-cache', { stdio: 'inherit' });

    // Nettoyer le dossier build s'il existe
    const buildPath = path.join(__dirname, '..', 'build');
    if (fs.existsSync(buildPath)) {
        fs.rmSync(buildPath, { recursive: true, force: true });
        console.log('✅ Dossier build supprimé');
    }
} catch (error) {
    console.log('⚠️ Erreur lors du nettoyage:', error.message);
}

// 2. Mettre à jour les timestamps dans les fichiers critiques
console.log('\n📅 Mise à jour des timestamps...');

const now = new Date();
const timestamp = now.toISOString().split('T')[0].replace(/-/g, '');
const version = `1.4.0.${timestamp}`;

// Mettre à jour le manifest.json
const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = version;
    manifest.description = `GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE - Compatible Safari - Mise à jour du ${now.toLocaleDateString('fr-FR')}`;

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));
    console.log('✅ Manifest.json mis à jour avec la version:', version);
}

// 3. Créer un fichier de version pour le cache busting
const versionPath = path.join(__dirname, '..', 'public', 'version.json');
const versionInfo = {
    version: version,
    buildDate: now.toISOString(),
    buildTimestamp: Date.now(),
    description: 'GROUPE SCOLAIRE SAINTE FAMILLE L'EXECELLENCE - Version PWA'
};

fs.writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
console.log('✅ Fichier version.json créé');

// 4. Mettre à jour le fichier force-update.js avec la nouvelle version
const forceUpdatePath = path.join(__dirname, '..', 'public', 'force-update.js');
if (fs.existsSync(forceUpdatePath)) {
    let forceUpdateContent = fs.readFileSync(forceUpdatePath, 'utf8');

    // Remplacer la version dans la ligne CURRENT_VERSION
    forceUpdateContent = forceUpdateContent.replace(
        /const CURRENT_VERSION = '[^']*';/,
        `const CURRENT_VERSION = '${version}';`
    );

    fs.writeFileSync(forceUpdatePath, forceUpdateContent);
    console.log('✅ force-update.js mis à jour avec la version:', version);
}

// 5. Construire l'application
console.log('\n🔨 Construction de l\'application...');
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build terminé avec succès');
} catch (error) {
    console.error('❌ Erreur lors du build:', error.message);
    process.exit(1);
}

console.log('\n🎉 Mise à jour PWA terminée !');
console.log(`📱 Version: ${version}`);
console.log('📋 Actions effectuées :');
console.log('   • Cache nettoyé');
console.log('   • Version mise à jour dans manifest.json');
console.log('   • Version mise à jour dans force-update.js');
console.log('   • Timestamps actualisés');
console.log('   • Application reconstruite');
console.log('\n💡 Les utilisateurs verront automatiquement les nouvelles modifications lors du prochain rechargement de l\'application.');