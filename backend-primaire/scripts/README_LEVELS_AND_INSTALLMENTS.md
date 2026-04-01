# Système de Gestion des Niveaux d'Études et Versements

## Vue d'ensemble

Ce système permet de gérer les niveaux d'études avec leurs montants de scolarité et de configurer des versements personnalisés pour chaque niveau.

## Structure de la Base de Données

### Tables Principales

#### 1. `education_levels`
Stoque les niveaux d'études avec leurs montants.

```sql
- id: Identifiant unique
- name: Nom du niveau (ex: "Petite Section")
- code: Code unique (ex: "PS")
- description: Description du niveau
- tuition_amount: Montant de la scolarité annuelle
- registration_fee: Frais d'inscription
- cantine_amount: Montant cantine par trimestre
- is_active: Niveau actif ou non
- order_index: Ordre d'affichage
```

#### 2. `level_installments`
Configure les versements pour chaque niveau.

```sql
- id: Identifiant unique
- education_level_id: Référence au niveau d'études
- installment_number: Numéro du versement (1, 2, 3, etc.)
- percentage: Pourcentage du montant total
- due_date_offset_days: Délai en jours après l'inscription
- is_active: Versement actif ou non
```

#### 3. `installments`
Versements individuels des étudiants.

```sql
- id: Identifiant unique
- student_id: Référence à l'étudiant
- level_installment_id: Référence au versement du niveau
- installment_number: Numéro du versement
- amount: Montant du versement
- due_date: Date d'échéance
- percentage: Pourcentage du montant total
- status: Statut (pending, paid, overdue, cancelled)
```

#### 4. `installment_payments`
Paiements effectués pour les versements.

```sql
- id: Identifiant unique
- installment_id: Référence au versement
- student_id: Référence à l'étudiant
- amount_paid: Montant payé
- payment_date: Date du paiement
- payment_method: Méthode de paiement
- status: Statut du paiement
- description: Description du paiement
- created_by: Utilisateur qui a enregistré le paiement
- school_year: Année scolaire
- balance_carried_forward: Solde reporté
- carried_to_installment_id: Versement vers lequel le solde est reporté
```

#### 5. `student_installment_balances`
Soldes des versements des étudiants.

```sql
- id: Identifiant unique
- student_id: Référence à l'étudiant
- installment_id: Référence au versement
- level_installment_id: Référence au versement du niveau
- total_amount: Montant total du versement
- amount_paid: Montant payé
- balance: Solde restant
- is_overdue: En retard ou non
- last_payment_date: Date du dernier paiement
- school_year: Année scolaire
```

## Installation

### 1. Exécuter le script de création des tables

```bash
cd backend-primaire/scripts
node run_corrected_tables.js
```

### 2. Vérifier la création des tables

```sql
SHOW TABLES LIKE '%installment%';
SHOW TABLES LIKE '%education_level%';
```

## Utilisation

### Backend

#### Contrôleurs disponibles :

1. **educationLevelController_corrected.js**
   - `getAllEducationLevels()` : Récupérer tous les niveaux
   - `getEducationLevelById()` : Récupérer un niveau par ID
   - `createEducationLevel()` : Créer un nouveau niveau
   - `updateEducationLevel()` : Mettre à jour un niveau
   - `deleteEducationLevel()` : Supprimer un niveau
   - `calculateLevelInstallments()` : Calculer les versements d'un niveau

2. **installmentController.js**
   - `createStudentInstallments()` : Créer les versements pour un étudiant
   - `getStudentInstallments()` : Récupérer les versements d'un étudiant
   - `recordInstallmentPayment()` : Enregistrer un paiement
   - `getInstallmentPaymentHistory()` : Historique des paiements
   - `getStudentFinancialSummary()` : Résumé financier d'un étudiant
   - `markOverdueInstallments()` : Marquer les versements en retard

#### Routes disponibles :

- `GET /api/education-levels` : Liste des niveaux
- `GET /api/education-levels/:id` : Détails d'un niveau
- `POST /api/education-levels` : Créer un niveau
- `PUT /api/education-levels/:id` : Modifier un niveau
- `DELETE /api/education-levels/:id` : Supprimer un niveau
- `GET /api/education-levels/:levelId/calculate` : Calculer les versements

- `GET /api/installments/student/:studentId` : Versements d'un étudiant
- `POST /api/installments/payment` : Enregistrer un paiement
- `GET /api/installments/:installmentId/payments` : Historique des paiements
- `GET /api/installments/student/:studentId/summary` : Résumé financier
- `POST /api/installments/mark-overdue` : Marquer les versements en retard

### Frontend

#### Pages disponibles :

1. **EducationLevelsCorrected.tsx**
   - Gestion des niveaux d'études
   - Configuration des versements par niveau
   - Interface intuitive avec validation

2. **StudentInstallments.tsx**
   - Gestion des versements des étudiants
   - Enregistrement des paiements
   - Suivi des soldes et échéances

## Configuration des Versements

### Exemple de configuration pour 3 versements :

1. **Versement 1** : 40% - Délai : 0 jours (à l'inscription)
2. **Versement 2** : 30% - Délai : 90 jours
3. **Versement 3** : 30% - Délai : 180 jours

### Exemple de configuration pour 5 versements :

1. **Versement 1** : 25% - Délai : 0 jours
2. **Versement 2** : 20% - Délai : 60 jours
3. **Versement 3** : 20% - Délai : 120 jours
4. **Versement 4** : 20% - Délai : 180 jours
5. **Versement 5** : 15% - Délai : 240 jours

## Fonctionnalités

### ✅ Implémentées

- Création et gestion des niveaux d'études
- Configuration des versements par niveau
- Création automatique des versements pour les étudiants
- Enregistrement des paiements
- Calcul automatique des soldes
- Suivi des échéances et retards
- Interface de gestion complète

### 🔄 À implémenter

- Notifications automatiques d'échéance
- Génération de reçus de paiement
- Rapports financiers détaillés
- Export des données vers Excel
- Intégration avec les systèmes de paiement en ligne

## Sécurité

- Authentification requise pour toutes les routes
- Validation des données côté serveur
- Gestion des erreurs et rollback des transactions
- Logs des actions importantes

## Maintenance

### Tâches régulières

1. **Marquer les versements en retard** :
   ```bash
   POST /api/installments/mark-overdue
   ```

2. **Vérifier l'intégrité des données** :
   ```sql
   SELECT * FROM student_installment_balances WHERE balance < 0;
   ```

3. **Nettoyer les données inactives** :
   ```sql
   UPDATE education_levels SET is_active = 0 WHERE id NOT IN (SELECT DISTINCT education_level_id FROM students WHERE education_level_id IS NOT NULL);
   ```

## Support

Pour toute question ou problème, consultez les logs du serveur ou contactez l'équipe de développement.

