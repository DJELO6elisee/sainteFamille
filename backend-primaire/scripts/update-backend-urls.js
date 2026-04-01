const fs = require('fs');
const path = require('path');

// Configuration
const OLD_URLS = [
    'https://lapetiteacademie.ci',
    'https://lapetiteacademie.ci/api',
    'https://lapetiteacademie.ci',
    'https://lapetiteacademie.ci/api'
];

const NEW_URL = 'https://lapetiteacademie.ci';
const NEW_API_URL = 'https://lapetiteacademie.ci/api';

// Extensions de fichiers à traiter
const EXTENSIONS = ['.js', '.ts'];

// Fonction pour remplacer les URLs dans un fichier
function replaceUrlsInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Remplacer les URLs
        for (const oldUrl of OLD_URLS) {
            if (content.includes(oldUrl)) {
                if (oldUrl.includes('/api') || oldUrl.includes(':5000')) {
                    // Pour les URLs API, utiliser le nouveau domaine avec /api
                    content = content.replace(new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), NEW_API_URL);
                } else {
                    // Pour les URLs frontend, utiliser le nouveau domaine
                    content = content.replace(new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), NEW_URL);
                }
                modified = true;
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        }

        return false;
    } catch (error) {
        console.error(`Erreur lors du traitement de ${filePath}:`, error.message);
        return false;
    }
}

// Fonction pour parcourir récursivement les dossiers
function processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    let totalFiles = 0;
    let modifiedFiles = 0;

    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Ignorer node_modules et .git
            if (item !== 'node_modules' && item !== '.git') {
                const result = processDirectory(fullPath);
                totalFiles += result.totalFiles;
                modifiedFiles += result.modifiedFiles;
            }
        } else if (stat.isFile()) {
            const ext = path.extname(item);
            if (EXTENSIONS.includes(ext)) {
                totalFiles++;
                if (replaceUrlsInFile(fullPath)) {
                    modifiedFiles++;
                    console.log(`✅ Modifié: ${fullPath}`);
                }
            }
        }
    }

    return { totalFiles, modifiedFiles };
}

// Fonction principale
function updateBackendUrls() {
    console.log('🔧 Mise à jour des URLs backend vers https://lapetiteacademie.ci...\n');

    const backendPath = __dirname + '/..';

    if (!fs.existsSync(backendPath)) {
        console.log('❌ Dossier backend non trouvé');
        return;
    }

    console.log('📁 Traitement du dossier backend...');
    const result = processDirectory(backendPath);

    console.log('\n📊 Résumé :');
    console.log(`📄 Fichiers traités: ${result.totalFiles}`);
    console.log(`✅ Fichiers modifiés: ${result.modifiedFiles}`);

    if (result.modifiedFiles > 0) {
        console.log('\n🎉 URLs backend mises à jour avec succès !');
        console.log('\n📝 Remplacements effectués :');
        console.log(`   https://lapetiteacademie.ci → ${NEW_URL}`);
        console.log(`   https://lapetiteacademie.ci/api → ${NEW_API_URL}`);
        console.log(`   https://lapetiteacademie.ci → ${NEW_URL}`);
        console.log(`   https://lapetiteacademie.ci/api → ${NEW_API_URL}`);

        console.log('\n⚠️  Actions recommandées :');
        console.log('1. Vérifiez que toutes les URLs ont été correctement mises à jour');
        console.log('2. Testez votre API pour vous assurer qu\'elle fonctionne');
        console.log('3. Redémarrez votre serveur backend');
    } else {
        console.log('\nℹ️  Aucune URL à mettre à jour trouvée.');
    }
}

// Exécution du script
if (require.main === module) {
    updateBackendUrls();
}

module.exports = { updateBackendUrls, replaceUrlsInFile };









