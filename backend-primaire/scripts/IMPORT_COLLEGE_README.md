# Guide d'import complet des données CSV vers MySQL - SECONDAIRE

Ce guide explique comment utiliser le script SQL généré pour importer toutes vos données du secondaire (niveaux, classes, élèves, inscriptions et versements) dans votre base de données MySQL.

## 📋 Prérequis

1. **Fichier CSV** : 
   - `Liste_de-Classe-GSTB2526-pour-le-secondaire.csv`

2. **Base de données MySQL** : Votre base de données `trayeber_college` doit être créée et accessible

3. **Structure de la base** : Les tables doivent déjà exister (utilisez le fichier `trayeber_college.sql` pour créer la structure)

## 🚀 Génération du script SQL

### Étape 1 : Générer le script SQL

Exécutez le script de génération :

```bash
cd backend-primaire
node scripts/generateCompleteImportSQL_College.js
```

Ce script va :
- Lire le fichier CSV du secondaire
- Générer un fichier SQL complet (`import_complet_college.sql`) à la racine du projet
- Créer automatiquement :
  - Les niveaux (levels)
  - Les classes (classes)
  - Les élèves (students)
  - Les inscriptions (enrollments)
  - Les versements (level_installments et student_installment_balances)
  - Les assignations (student_assignments)

### Étape 2 : Vérifier le script généré

Le script génère un fichier `import_complet_college.sql` à la racine du projet. Vous pouvez l'ouvrir pour vérifier son contenu avant de l'exécuter.

## 📊 Contenu du script SQL

Le script SQL généré contient :

1. **Niveaux** : 6EME, 5EME, 4EME, 3EME, TERMINALE
2. **Classes** : Toutes les classes trouvées dans le CSV (1A, 1C, 1D1, 2A1, 2C1, 3EME1, 3EME2, 3EME3, 4EME1, 4EME2, 4EME3, 5EME1, 5EME2, 6EME1, 6EME2, TA1, TA2, TC, TD1, TD2)
3. **Élèves** : Tous les élèves du fichier CSV
4. **Inscriptions** : Chaque élève est inscrit dans sa classe
5. **Versements** : 3 versements par élève (40%, 30%, 30%) pour les deux types (assigned/non_assigned)
6. **Assignations** : Par défaut, tous les élèves sont marqués comme "non affectés" (is_assigned = 0)

## ⚙️ Configuration

Vous pouvez modifier les montants et la configuration dans le fichier `generateCompleteImportSQL_College.js` :

```javascript
const CONFIG = {
    levels: {
        '6EME': { 
            assigned: { tuition: 600000, registration: 60000 },
            non_assigned: { tuition: 550000, registration: 55000 }
        },
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
mysql -u votre_utilisateur -p trayeber_college < import_complet_college.sql
```

Exemple :
```bash
mysql -u root -p trayeber_college < import_complet_college.sql
```

### Option 2 : Via phpMyAdmin

1. Ouvrez phpMyAdmin
2. Sélectionnez votre base de données `trayeber_college`
3. Cliquez sur l'onglet "SQL"
4. Copiez-collez le contenu du fichier `import_complet_college.sql`
5. Cliquez sur "Exécuter"

### Option 3 : Via MySQL Workbench

1. Ouvrez MySQL Workbench
2. Connectez-vous à votre serveur
3. Ouvrez le fichier `import_complet_college.sql`
4. Exécutez le script (Ctrl+Shift+Enter)

## ⚠️ Important

### Avant d'exécuter le script

1. **Sauvegardez votre base de données** :
   ```bash
   mysqldump -u root -p trayeber_college > backup_avant_import_college.sql
   ```

2. **Vérifiez que votre base est vide** ou que vous êtes prêt à écraser les données existantes

3. **Vérifiez les montants** dans le script avant l'exécution

### Après l'exécution

Le script affiche un résumé à la fin :
```sql
SELECT 'Niveaux créés:' as Info, COUNT(*) as Total FROM levels;
SELECT 'Classes créées:' as Info, COUNT(*) as Total FROM classes;
SELECT 'Élèves insérés:' as Info, COUNT(*) as Total FROM students;
SELECT 'Inscriptions créées:' as Info, COUNT(*) as Total FROM enrollments;
SELECT 'Versements créés:' as Info, COUNT(*) as Total FROM level_installments;
SELECT 'Balances créées:' as Info, COUNT(*) as Total FROM student_installment_balances;
```

## 🔧 Personnalisation

### Modifier les montants

Éditez le fichier `generateCompleteImportSQL_College.js` et modifiez la section `CONFIG.levels` :

```javascript
levels: {
    '6EME': { 
        assigned: { tuition: 700000, registration: 70000 },
        non_assigned: { tuition: 650000, registration: 65000 }
    },
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

### Niveaux créés

- **6EME** : 6ème
- **5EME** : 5ème
- **4EME** : 4ème
- **3EME** : 3ème
- **TERMINALE** : Terminale

### Versements créés

Pour chaque niveau, 6 versements sont créés (3 pour assigned + 3 pour non_assigned) :
- **Versement 1** : 40% du montant total (échéance : 01/09/2025)
- **Versement 2** : 30% du montant total (échéance : 01/12/2025)
- **Versement 3** : 30% du montant total (échéance : 01/03/2026)

### Données des élèves

Pour chaque élève, les données suivantes sont importées :
- Prénom et nom
- Date de naissance
- Genre (M/F)
- Lieu de naissance
- Nationalité
- Matricule
- Code élève (généré automatiquement)
- Code parent (généré automatiquement)

### Assignations

Par défaut, tous les élèves sont créés comme **non affectés** (is_assigned = 0). Vous pouvez modifier cela après l'import en mettant à jour la table `student_assignments`.

## 🔄 Différences avec le primaire

Le système du secondaire a quelques différences importantes :

1. **Niveaux vs Education Levels** : Utilise `levels` au lieu de `education_levels`
2. **Montants différenciés** : Les montants varient selon que l'élève est "affecté" ou "non affecté"
3. **Student Assignments** : Table supplémentaire pour gérer le statut d'affectation
4. **Payment Type** : Les versements ont un type (assigned/non_assigned)

## 🆘 Dépannage

### Erreur : "Duplicate entry"

Si vous obtenez une erreur de doublon, c'est que certaines données existent déjà. Le script utilise `ON DUPLICATE KEY UPDATE` pour gérer cela, mais vous pouvez :

1. Vider les tables concernées avant l'import
2. Modifier le script pour utiliser `INSERT IGNORE` ou `REPLACE INTO`

### Erreur : "Foreign key constraint fails"

Assurez-vous que :
1. La structure de la base de données est correcte
2. Les tables existent (exécutez `trayeber_college.sql` d'abord)
3. Les contraintes de clés étrangères sont correctement définies

### Erreur : "Table doesn't exist"

Exécutez d'abord le script de création de la structure (`trayeber_college.sql`) pour créer toutes les tables.

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
SELECT l.name as Niveau, li.payment_type, COUNT(li.id) as Nombre_versements
FROM levels l
LEFT JOIN level_installments li ON l.id = li.level_id
GROUP BY l.id, l.name, li.payment_type
ORDER BY l.name, li.payment_type;

-- Vérifier les élèves sans inscription
SELECT COUNT(*) as Etudiants_sans_inscription
FROM students s
LEFT JOIN enrollments e ON s.id = e.student_id
WHERE e.id IS NULL;

-- Vérifier les assignations
SELECT 
    CASE WHEN is_assigned = 1 THEN 'Affectés' ELSE 'Non affectés' END as Statut,
    COUNT(*) as Nombre
FROM student_assignments
WHERE school_year = '2025-2026'
GROUP BY is_assigned;
```

## 💡 Conseils

1. **Testez d'abord sur une base de test** avant d'importer en production
2. **Sauvegardez toujours** avant d'importer
3. **Vérifiez les montants** avant l'exécution
4. **Exécutez le script en une seule transaction** (déjà géré dans le script)
5. **Vérifiez les données** après l'import avec les requêtes SQL ci-dessus
6. **Ajustez les assignations** après l'import si nécessaire (mettre à jour `student_assignments`)

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs d'erreur MySQL
2. Vérifiez que le fichier CSV est au bon format
3. Vérifiez que la structure de la base de données est correcte
4. Assurez-vous que les chemins des fichiers CSV sont corrects


