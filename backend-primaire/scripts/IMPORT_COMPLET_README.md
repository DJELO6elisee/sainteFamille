# Guide d'import complet des données CSV vers MySQL

Ce guide explique comment utiliser le script SQL généré pour importer toutes vos données (niveaux, classes, élèves, inscriptions et versements) dans votre base de données MySQL.

## 📋 Prérequis

1. **Fichiers CSV** : 
   - `Liste_Classe-POUR-PRIMAIRE-2526-GSTB.csv`
   - `Liste_Classe-MATERNELLE-GSTB-2526.csv`

2. **Base de données MySQL** : Votre base de données doit être créée et accessible

3. **Structure de la base** : Les tables doivent déjà exister (utilisez le fichier `trayeber_primaire.sql` pour créer la structure)

## 🚀 Génération du script SQL

### Étape 1 : Générer le script SQL

Exécutez le script de génération :

```bash
cd backend-primaire
node scripts/generateCompleteImportSQL.js
```

Ce script va :
- Lire les fichiers CSV
- Générer un fichier SQL complet (`import_complet.sql`) à la racine du projet
- Créer automatiquement :
  - Les niveaux d'éducation (education_levels)
  - Les classes (classes)
  - Les élèves (students)
  - Les inscriptions (enrollments)
  - Les versements (installments et level_installments)

### Étape 2 : Vérifier le script généré

Le script génère un fichier `import_complet.sql` à la racine du projet. Vous pouvez l'ouvrir pour vérifier son contenu avant de l'exécuter.

## 📊 Contenu du script SQL

Le script SQL généré contient :

1. **Niveaux d'éducation** : CP1, CP2, CE1, CE2, CM1, CM2 (Primaire) et MGS, MMS, MPS (Maternelle)
2. **Classes** : Une classe pour chaque niveau
3. **Élèves** : Tous les élèves des fichiers CSV
4. **Inscriptions** : Chaque élève est inscrit dans sa classe
5. **Versements** : 3 versements par élève (40%, 30%, 30%)

## ⚙️ Configuration

Vous pouvez modifier les montants et la configuration dans le fichier `generateCompleteImportSQL.js` :

```javascript
const CONFIG = {
    education_levels: {
        'CP1': { tuition: 500000, registration: 50000, cantine: 15000 },
        // ... autres niveaux
    },
    installments: {
        count: 3,
        percentages: [40, 30, 30],
        due_dates: ['2025-09-01', '2025-12-01', '2025-03-01']
    }
};
```

## 🗄️ Exécution du script SQL

### Option 1 : Via la ligne de commande MySQL

```bash
mysql -u votre_utilisateur -p votre_base_de_donnees < import_complet.sql
```

Exemple :
```bash
mysql -u root -p trayeber_primaire < import_complet.sql
```

### Option 2 : Via phpMyAdmin

1. Ouvrez phpMyAdmin
2. Sélectionnez votre base de données
3. Cliquez sur l'onglet "SQL"
4. Copiez-collez le contenu du fichier `import_complet.sql`
5. Cliquez sur "Exécuter"

### Option 3 : Via MySQL Workbench

1. Ouvrez MySQL Workbench
2. Connectez-vous à votre serveur
3. Ouvrez le fichier `import_complet.sql`
4. Exécutez le script (Ctrl+Shift+Enter)

## ⚠️ Important

### Avant d'exécuter le script

1. **Sauvegardez votre base de données** :
   ```bash
   mysqldump -u root -p trayeber_primaire > backup_avant_import.sql
   ```

2. **Vérifiez que votre base est vide** ou que vous êtes prêt à écraser les données existantes

3. **Vérifiez les montants** dans le script avant l'exécution

### Après l'exécution

Le script affiche un résumé à la fin :
```sql
SELECT 'Niveaux créés:' as Info, COUNT(*) as Total FROM education_levels;
SELECT 'Classes créées:' as Info, COUNT(*) as Total FROM classes;
SELECT 'Élèves insérés:' as Info, COUNT(*) as Total FROM students;
SELECT 'Inscriptions créées:' as Info, COUNT(*) as Total FROM enrollments;
SELECT 'Versements créés:' as Info, COUNT(*) as Total FROM installments;
```

## 🔧 Personnalisation

### Modifier les montants

Éditez le fichier `generateCompleteImportSQL.js` et modifiez la section `CONFIG.education_levels` :

```javascript
education_levels: {
    'CP1': { tuition: 600000, registration: 60000, cantine: 20000 },
    // ...
}
```

Puis régénérez le script SQL.

### Modifier le nombre de versements

Modifiez la section `CONFIG.installments` :

```javascript
installments: {
    count: 4,  // 4 versements au lieu de 3
    percentages: [30, 25, 25, 20],  // Répartition
    due_dates: ['2025-09-01', '2025-11-01', '2025-01-01', '2025-03-01']
}
```

### Modifier l'année scolaire

Modifiez la constante `SCHOOL_YEAR` en haut du fichier :

```javascript
const SCHOOL_YEAR = '2026-2027';
```

## 📝 Structure des données importées

### Niveaux d'éducation créés

- **Primaire** : CP1, CP2, CE1, CE2, CM1, CM2
- **Maternelle** : MGS, MMS, MPS

### Versements créés

Pour chaque niveau, 3 versements sont créés :
- **Versement 1** : 40% du montant total (échéance : 01/09/2025)
- **Versement 2** : 30% du montant total (échéance : 01/12/2025)
- **Versement 3** : 30% du montant total (échéance : 01/03/2026)

### Données des élèves

Pour chaque élève, les données suivantes sont importées :
- Prénom et nom
- Date de naissance
- Genre (M/F)
- Ville de naissance
- Matricule
- Code élève (généré automatiquement)
- Code parent (généré automatiquement)

## 🆘 Dépannage

### Erreur : "Duplicate entry"

Si vous obtenez une erreur de doublon, c'est que certaines données existent déjà. Le script utilise `ON DUPLICATE KEY UPDATE` pour gérer cela, mais vous pouvez :

1. Vider les tables concernées avant l'import
2. Modifier le script pour utiliser `INSERT IGNORE` ou `REPLACE INTO`

### Erreur : "Foreign key constraint fails"

Assurez-vous que :
1. La structure de la base de données est correcte
2. Les tables existent (exécutez `trayeber_primaire.sql` d'abord)
3. Les contraintes de clés étrangères sont correctement définies

### Erreur : "Table doesn't exist"

Exécutez d'abord le script de création de la structure (`trayeber_primaire.sql`) pour créer toutes les tables.

## 📊 Vérification après import

Après l'exécution du script, vérifiez les données :

```sql
-- Vérifier le nombre d'élèves par classe
SELECT c.name as Classe, COUNT(e.id) as Nombre_etudiants
FROM classes c
LEFT JOIN enrollments e ON c.id = e.class_id
WHERE e.status = 'active'
GROUP BY c.id, c.name
ORDER BY c.name;

-- Vérifier les versements par niveau
SELECT el.name as Niveau, COUNT(li.id) as Nombre_versements
FROM education_levels el
LEFT JOIN level_installments li ON el.id = li.education_level_id
GROUP BY el.id, el.name
ORDER BY el.name;

-- Vérifier les élèves sans inscription
SELECT COUNT(*) as Etudiants_sans_inscription
FROM students s
LEFT JOIN enrollments e ON s.id = e.student_id
WHERE e.id IS NULL;
```

## 💡 Conseils

1. **Testez d'abord sur une base de test** avant d'importer en production
2. **Sauvegardez toujours** avant d'importer
3. **Vérifiez les montants** avant l'exécution
4. **Exécutez le script en une seule transaction** (déjà géré dans le script)
5. **Vérifiez les données** après l'import avec les requêtes SQL ci-dessus

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs d'erreur MySQL
2. Vérifiez que les fichiers CSV sont au bon format
3. Vérifiez que la structure de la base de données est correcte
4. Assurez-vous que les chemins des fichiers CSV sont corrects


