# Script d'Activation de Tous les Élèves Inactifs

## Problème
Vous avez **552 élèves** dans votre base de données, mais certains apparaissent comme "inactifs" dans la table `enrollments` alors qu'ils devraient être considérés comme actifs pour les bulletins.

## Solution Rapide (Script SQL Direct)

### 📋 Instructions étape par étape

1. **Connectez-vous à votre base de données MySQL/MariaDB :**
   ```bash
   mysql -u votre_utilisateur -p isegroup_bethaniemiracle
   ```

2. **Vérifiez l'état actuel (avant activation) :**
   ```sql
   SELECT 
     COUNT(*) as total_enrollments,
     SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as actifs,
     SUM(CASE WHEN status != 'active' OR status IS NULL THEN 1 ELSE 0 END) as inactifs_ou_null,
     COUNT(DISTINCT student_id) as eleves_uniques
   FROM enrollments 
   WHERE student_id IS NOT NULL;
   ```

3. **Activez TOUS les élèves inactifs :**
   ```sql
   UPDATE enrollments 
   SET status = 'active' 
   WHERE student_id IS NOT NULL
   AND (status != 'active' OR status IS NULL);
   ```

4. **Vérifiez le résultat :**
   ```sql
   SELECT 
     COUNT(*) as total_enrollments,
     SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as eleves_actifs,
     COUNT(DISTINCT student_id) as eleves_uniques_actifs
   FROM enrollments 
   WHERE student_id IS NOT NULL AND status = 'active';
   ```

   **Résultat attendu :** Tous vos 552 élèves (ou ceux qui ont un enrollment) devraient maintenant être actifs.

### Solution Automatique (Code Backend)
Le code a été modifié pour activer automatiquement tous les élèves inactifs lors de la récupération :
- `classController.getClassStudents` - Active automatiquement les élèves inactifs
- `bulletinController.getClassStudentsWithBulletins` - Active automatiquement les élèves inactifs

**Comment ça marche :** Lorsqu'une requête est faite pour récupérer les élèves d'une classe, le système vérifie automatiquement et active tous les élèves avec un statut différent de `'active'` ou `NULL`.

### Solution Manuelle (Si le serveur est en panne)
Si vous devez activer manuellement les élèves, utilisez le script SQL : `activate-inactive-students.sql`

#### Étape 1 : Se connecter à la base de données
```bash
mysql -u votre_utilisateur -p ecole_primaire
```

#### Étape 2 : Exécuter le script pour une classe spécifique
```sql
-- Pour la classe ID 24 et l'année 2025-2026
UPDATE enrollments 
SET status = 'active' 
WHERE class_id = 24 
AND school_year = '2025-2026'
AND student_id IS NOT NULL
AND (status != 'active' OR status IS NULL);
```

#### Étape 3 : Vérifier les résultats
```sql
-- Voir combien d'élèves ont été activés
SELECT COUNT(*) as activated_count
FROM enrollments 
WHERE class_id = 24
AND school_year = '2025-2026'
AND status = 'active'
AND student_id IS NOT NULL;

-- Voir tous les élèves actifs de la classe
SELECT 
  e.id,
  e.student_id,
  e.status,
  s.first_name,
  s.last_name
FROM enrollments e
LEFT JOIN students s ON e.student_id = s.id
WHERE e.class_id = 24
AND e.school_year = '2025-2026'
AND e.status = 'active'
ORDER BY s.last_name, s.first_name;
```

## Vérification

Après activation, rechargez la page dans votre navigateur et vous devriez voir le bon nombre d'élèves.

## Logs du Serveur

Les logs du serveur backend montreront :
```
[CLASS CONTROLLER] ✅ X élève(s) activé(s) automatiquement pour la classe Y, année Z
[CLASS CONTROLLER] Nombre d'étudiants récupérés: X pour la classe Y
[CLASS CONTROLLER] Total dans enrollments: X, étudiants retournés: Y
```

Si les nombres ne correspondent pas, vérifiez les logs pour diagnostiquer le problème.

