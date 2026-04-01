const fs = require('fs');
const path = require('path');

// Générer une nouvelle version basée sur la date/heure actuelle
const now = new Date();
const version = now.toISOString().replace(/[-:T.]/g, '').slice(0, 12); // Format: YYYYMMDDHHmm
const buildDate = now.toISOString();

// Chemin vers le fichier version.json
const versionPath = path.join(__dirname, '..', 'public', 'version.json');

// Contenu du fichier version.json
const versionData = {
  version: version,
  buildDate: buildDate
};

// Écrire le fichier
try {
  fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2), 'utf8');
  console.log(`✅ Version mise à jour: ${version}`);
  console.log(`📅 Date de build: ${buildDate}`);
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour de la version:', error);
  process.exit(1);
}

