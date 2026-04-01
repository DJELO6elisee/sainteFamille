# Import des élèves Sainte Famille 2025-2026

## Fichiers

| Fichier | Rôle |
|--------|------|
| `LISTE-DES-ELEVES-SAINTE-FAMILLE-2025-2026-_1_.csv` | Liste source (CODE ECOLE, NOM ET PRENOM, CLASSE) |
| `import_eleves_sainte_famille.sql` | En-tête SQL : niveaux, classes, contrainte unicité |
| `generate_import_sql.py` | Lit le CSV, déduplique par CODE ECOLE, génère le SQL complet |
| `import_eleves_sainte_famille_complet.sql` | **Fichier à exécuter** (généré par le script Python) |

## Règles

- **Un seul élève par CODE ECOLE** : si le même code apparaît plusieurs fois (INSCRIPTION, SCOLARITE, FOURNITURE), une seule ligne est conservée (la première).
- **Nom / prénom** : premier mot → `last_name`, le reste → `first_name`.
- **Classe** : normalisée (TRIM, espaces internes supprimés pour matcher PS, MS, GS, CP1, CP2, CE1, CE2, CM1, CM2).
- Lignes sans CODE ECOLE valide ou sans CLASSE sont ignorées.

## Étapes

1. **Générer le SQL complet** (à faire après toute modification du CSV) :
   ```bash
   python generate_import_sql.py
   ```
   → Crée ou met à jour `import_eleves_sainte_famille_complet.sql`.

2. **Exécuter le SQL sur la base `trayeber_primaire`** :
   ```bash
   mysql -u user -p trayeber_primaire < import_eleves_sainte_famille_complet.sql
   ```
   Ou via phpMyAdmin : importer le fichier `import_eleves_sainte_famille_complet.sql`.

3. **Si l’index `unique_student_code` existe déjà** sur `students`, commenter ou supprimer la ligne :
   ```sql
   ALTER TABLE `students` ADD UNIQUE KEY `unique_student_code` (`student_code`);
   ```
   pour éviter une erreur à la ré-exécution.

## Contenu du script SQL

1. **Niveaux** : **Maternelle** (PS, MS, GS regroupés) + CP1, CP2, CE1, CE2, CM1, CM2 (`education_levels`).
2. **Classes** : une classe par niveau pour l’année **2025-2026** (`classes`).
3. **Contrainte** : unicité de `student_code` sur `students`.
4. **Staging** : table temporaire avec (code_ecole, last_name, first_name, class_name).
5. **Élèves** : insertion depuis la staging, `ON DUPLICATE KEY UPDATE` si le code existe déjà.
6. **Inscriptions** : `enrollments` (lien élève – classe, année 2025-2026, statut actif).
