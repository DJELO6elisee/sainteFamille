# Guide d'import Excel vers MySQL

Ce guide vous explique comment importer vos données Excel dans votre base de données MySQL.

## 📋 Prérequis

1. **Fichier Excel** : Votre fichier Excel doit être au format `.xlsx` ou `.xls`
2. **Structure du fichier** : La première ligne doit contenir les en-têtes de colonnes
3. **Base de données** : Votre base de données MySQL doit être configurée et accessible

## 🔧 Installation

La bibliothèque `xlsx` est déjà installée. Si ce n'est pas le cas, exécutez :

```bash
npm install xlsx
```

## 📊 Format du fichier Excel

### Colonnes supportées

Le script reconnaît automatiquement les colonnes suivantes (insensible à la casse et aux accents) :

#### Informations de l'élève
- **Prénom** / **Prenom** / **First Name** → `first_name`
- **Nom** / **Last Name** → `last_name`
- **Date de naissance** / **Date de Naissance** / **Date Naissance** / **DOB** → `date_of_birth`
- **Sexe** / **Genre** / **Gender** → `gender`
- **Adresse** / **Address** → `address`
- **Matricule** / **Numéro Matricule** / **Registration Number** → `registration_number`
- **Ville** / **City** / **Quartier** → `city`
- **École précédente** / **Previous School** → `previous_school`
- **Classe précédente** / **Previous Class** → `previous_class`
- **Besoins spéciaux** / **Special Needs** → `special_needs`
- **Informations supplémentaires** / **Additional Info** → `additional_info`

#### Informations du parent
- **Prénom Parent** / **Parent First Name** → `parent_first_name`
- **Nom Parent** / **Parent Last Name** → `parent_last_name`
- **Téléphone Parent** / **Phone Parent** → `parent_phone`
- **Email Parent** / **Parent Email** → `parent_email`
- **Contact Parent** / **Parent Contact** → `parent_contact`
- **Contact Père** / **Father Contact** → `father_contact`
- **Contact Mère** / **Mother Contact** → `mother_contact`
- **Contact Urgence** / **Emergency Contact** → `emergency_contact`

#### Autres
- **Cantine** → `cantine` (1/0, Oui/Non, True/False)
- **Mange à la cantine** / **Eats at Cantine** → `eats_at_cantine`
- **Allergie** / **Allergy** → `allergy`

### Colonnes obligatoires

- **Prénom** (ou équivalent)
- **Nom** (ou équivalent)

### Colonnes optionnelles

Toutes les autres colonnes sont optionnelles. Si elles ne sont pas présentes, des valeurs par défaut seront utilisées.

## 🚀 Utilisation

### Commande de base

```bash
node scripts/importExcel.js "chemin/vers/votre/fichier.xlsx"
```

### Options disponibles

```bash
node scripts/importExcel.js "fichier.xlsx" [options]
```

#### Options :

- `--sheet <nom>` : Nom de la feuille à importer (par défaut: première feuille)
- `--class <id>` : ID de la classe pour l'inscription des élèves
- `--year <année>` : Année scolaire (format: 2024-2025)
- `--dry-run` : Mode test (ne pas insérer dans la base de données)
- `--skip-rows <n>` : Nombre de lignes à ignorer au début (par défaut: 0)

### Exemples

#### 1. Import simple (sans inscription à une classe)

```bash
node scripts/importExcel.js "Liste_Classe POUR PRIMAIRE 2526 GSTB.xlsx"
```

#### 2. Import avec inscription à une classe

```bash
node scripts/importExcel.js "Liste_Classe POUR PRIMAIRE 2526 GSTB.xlsx" --class 1 --year "2024-2025"
```

#### 3. Mode test (dry-run) pour vérifier les données avant l'import

```bash
node scripts/importExcel.js "Liste_Classe POUR PRIMAIRE 2526 GSTB.xlsx" --dry-run
```

#### 4. Importer une feuille spécifique

```bash
node scripts/importExcel.js "fichier.xlsx" --sheet "Feuille1"
```

#### 5. Ignorer les premières lignes (si votre fichier a des en-têtes multiples)

```bash
node scripts/importExcel.js "fichier.xlsx" --skip-rows 2
```

## 📝 Exemple de fichier Excel

Votre fichier Excel devrait ressembler à ceci :

| Prénom | Nom | Date de naissance | Sexe | Matricule | Ville | Téléphone Parent | Email Parent |
|--------|-----|-------------------|------|-----------|-------|------------------|--------------|
| Jean   | Dupont | 15/03/2010 | Masculin | MAT20240001 | Abidjan | +225 07 12 34 56 78 | jean.dupont@email.com |
| Marie  | Martin | 20/05/2011 | Féminin | MAT20240002 | Yopougon | +225 07 98 76 54 32 | marie.martin@email.com |

## ⚙️ Fonctionnalités automatiques

Le script effectue automatiquement :

1. **Génération de matricule** : Si aucun matricule n'est fourni, un matricule unique est généré (format: `MAT20240001`)
2. **Génération de codes** : Des codes uniques sont générés pour `student_code` et `parent_code`
3. **Parsing des dates** : Les dates sont automatiquement converties au format MySQL (YYYY-MM-DD)
4. **Traitement de la cantine** : Les valeurs "Oui", "Yes", "1", "True" sont converties en 1, sinon 0
5. **Nettoyage des données** : Les valeurs vides sont converties en `NULL`

## 🔍 Mode test (dry-run)

Avant d'importer réellement vos données, il est recommandé d'utiliser le mode `--dry-run` pour :

- Vérifier que les colonnes sont correctement mappées
- Voir les données qui seront insérées
- Détecter les erreurs potentielles

```bash
node scripts/importExcel.js "fichier.xlsx" --dry-run
```

## ⚠️ Gestion des erreurs

Le script gère les erreurs suivantes :

- **Fichier introuvable** : Vérifiez le chemin du fichier
- **Colonnes obligatoires manquantes** : Assurez-vous que "Prénom" et "Nom" sont présents
- **Erreurs de base de données** : Vérifiez votre connexion MySQL
- **Doublons** : Les matricules doivent être uniques

## 📊 Résumé après l'import

Après chaque import, le script affiche :

- ✅ Nombre d'élèves importés avec succès
- ❌ Nombre d'erreurs
- 📋 Détails des erreurs (si applicable)

## 🔧 Personnalisation du mapping

Si vos colonnes Excel ont des noms différents, vous pouvez modifier le fichier `scripts/importExcel.js` et ajouter vos propres mappings dans l'objet `COLUMN_MAPPING`.

Exemple :

```javascript
const COLUMN_MAPPING = {
    'Votre Nom de Colonne': 'nom_de_la_colonne_db',
    // ... autres mappings
};
```

## 💡 Conseils

1. **Faites toujours un dry-run d'abord** pour vérifier vos données
2. **Sauvegardez votre base de données** avant un import important
3. **Vérifiez les formats de date** dans votre fichier Excel
4. **Assurez-vous que les matricules sont uniques** si vous les fournissez
5. **Vérifiez les emails** pour éviter les erreurs de format

## 🆘 Dépannage

### Erreur : "Le fichier n'existe pas"
- Vérifiez le chemin du fichier
- Utilisez des guillemets si le chemin contient des espaces
- Sur Windows, utilisez des barres obliques inverses `\` ou des barres obliques normales `/`

### Erreur : "Colonnes obligatoires manquantes"
- Vérifiez que votre première ligne contient les en-têtes
- Assurez-vous que "Prénom" et "Nom" (ou leurs équivalents) sont présents
- Utilisez `--skip-rows` si vos en-têtes ne sont pas sur la première ligne

### Erreur : "Erreur de connexion à la base de données"
- Vérifiez votre fichier `.env` et les paramètres de connexion
- Assurez-vous que MySQL est démarré
- Vérifiez les permissions de la base de données

## 📞 Support

Si vous rencontrez des problèmes, vérifiez :
1. Les logs d'erreur affichés par le script
2. La structure de votre fichier Excel
3. La configuration de votre base de données
