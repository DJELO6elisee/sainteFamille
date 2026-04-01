#!/bin/bash

# Script pour corriger bulletinController.js sur le serveur de production
# Usage: ./fix-bulletin-controller.sh

echo "🔧 Script de correction de bulletinController.js"
echo "================================================"

SOURCE_FILE="./controllers/bulletinController.js"
TARGET_DIR="/home/isegroup/nodehome/controllers"
TARGET_FILE="$TARGET_DIR/bulletinController.js"

# Vérifier que le fichier source existe
if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ ERREUR: Le fichier source $SOURCE_FILE n'existe pas"
    exit 1
fi

echo "✅ Fichier source trouvé: $SOURCE_FILE"

# Vérifier que le fichier contient les bonnes méthodes
if ! grep -q "getBulletinPublicationStatus" "$SOURCE_FILE"; then
    echo "❌ ERREUR: Le fichier source ne contient pas getBulletinPublicationStatus"
    exit 1
fi

echo "✅ Le fichier source contient les méthodes correctes"

# Sauvegarder l'ancien fichier si il existe
if [ -f "$TARGET_FILE" ]; then
    BACKUP_FILE="${TARGET_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "📦 Sauvegarde de l'ancien fichier vers: $BACKUP_FILE"
    cp "$TARGET_FILE" "$BACKUP_FILE"
fi

# Copier le nouveau fichier
echo "📋 Copie du fichier vers le serveur..."
cp "$SOURCE_FILE" "$TARGET_FILE"

# Vérifier que la copie a réussi
if [ -f "$TARGET_FILE" ]; then
    if grep -q "getBulletinPublicationStatus" "$TARGET_FILE"; then
        echo "✅ Fichier copié avec succès!"
        echo "✅ Le fichier contient les bonnes méthodes"
        echo ""
        echo "⚠️  N'oubliez pas de redémarrer le serveur Node.js!"
        echo "   Exemple: pm2 restart all   ou   systemctl restart nodejs"
    else
        echo "❌ ERREUR: Le fichier copié ne contient pas les bonnes méthodes"
        exit 1
    fi
else
    echo "❌ ERREUR: La copie a échoué"
    exit 1
fi








