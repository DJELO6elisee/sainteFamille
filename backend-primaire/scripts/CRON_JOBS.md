# Système de Cron Jobs - La Petite Académie

Ce document décrit le système de nettoyage automatique mis en place pour maintenir la base de données et les fichiers de l'application.

## 🚀 Fonctionnalités

Le système de cron jobs automatise plusieurs tâches de maintenance :

### 1. **Nettoyage des emplois du temps expirés**
- **Fréquence** : Tous les jours à 2h du matin
- **Action** : Supprime les emplois du temps de plus de 30 jours
- **Table concernée** : `schedules`

### 2. **Nettoyage des événements expirés**
- **Fréquence** : Tous les lundis à 3h du matin
- **Action** : Supprime les événements de plus de 7 jours
- **Table concernée** : `events`

### 3. **Nettoyage des notifications anciennes**
- **Fréquence** : Tous les dimanches à 4h du matin
- **Action** : Supprime les notifications de plus de 90 jours
- **Table concernée** : `notifications`

### 4. **Nettoyage des fichiers temporaires**
- **Fréquence** : Toutes les heures
- **Action** : Supprime les fichiers temporaires de plus de 24h
- **Dossiers concernés** : `uploads/temp`, `protected_uploads/temp`

## ⚙️ Configuration

### Variables d'environnement

```env
# Activer/désactiver le nettoyage automatique
ENABLE_AUTO_CLEANUP=true  # ou false pour désactiver
```

### Fuseau horaire

Tous les cron jobs utilisent le fuseau horaire **Africa/Abidjan** (UTC+0).

## 🔧 Utilisation

### Démarrage automatique

Les cron jobs se lancent automatiquement au démarrage du serveur :

```bash
npm start
```

### Démarrage manuel

```bash
# Démarrer uniquement les cron jobs
npm run start-cleanup-cron
```

### Exécution manuelle des nettoyages

```bash
# Nettoyer les emplois du temps expirés
npm run cleanup-schedules
```

## 📊 Monitoring

### Logs de fonctionnement

Les cron jobs génèrent des logs détaillés :

```
🧹 Début du nettoyage automatique des emplois du temps expirés...
✅ 5 emploi(s) du temps expiré(s) supprimé(s)
```

### Vérification du statut

Pour vérifier que les cron jobs fonctionnent :

1. **Consultez les logs du serveur**
2. **Vérifiez les tables de base de données**
3. **Surveillez l'espace disque**

## 🛡️ Sécurité

### Protection des données

- **Sauvegarde automatique** : Assurez-vous d'avoir des sauvegardes avant le nettoyage
- **Vérification des dates** : Les suppressions respectent les délais configurés
- **Logs détaillés** : Toutes les actions sont enregistrées

### Gestion des erreurs

- **Gestion d'erreurs robuste** : Les erreurs sont capturées et loggées
- **Continuité de service** : Une erreur dans un cron job n'affecte pas les autres
- **Notifications** : Les erreurs critiques peuvent être notifiées

## 🔄 Maintenance

### Mise à jour des délais

Pour modifier les délais de nettoyage, éditez le fichier `scripts/setupCronJob.js` :

```javascript
// Exemple : changer le délai des emplois du temps de 30 à 60 jours
WHERE end_date < DATE_SUB(NOW(), INTERVAL 60 DAY)
```

### Ajout de nouveaux cron jobs

1. **Créez la fonction de nettoyage**
2. **Ajoutez la tâche cron dans `startCleanupCronJob()`**
3. **Testez en mode manuel**
4. **Déployez**

## 🚨 Dépannage

### Problèmes courants

#### Cron jobs ne se lancent pas
- Vérifiez que `ENABLE_AUTO_CLEANUP` n'est pas à `false`
- Consultez les logs du serveur
- Vérifiez la syntaxe des expressions cron

#### Erreurs de base de données
- Vérifiez la connexion à la base de données
- Consultez les permissions utilisateur
- Vérifiez l'intégrité des tables

#### Fichiers non supprimés
- Vérifiez les permissions sur les dossiers
- Consultez les logs d'erreur
- Vérifiez l'espace disque disponible

### Commandes de diagnostic

```bash
# Vérifier la syntaxe du fichier
node -c scripts/setupCronJob.js

# Tester une fonction de nettoyage
node -e "require('./scripts/setupCronJob').cleanupExpiredSchedules()"

# Vérifier les tâches cron actives
node -e "const cron = require('node-cron'); console.log(cron.getTasks())"
```

## 📝 Exemples de logs

### Succès
```
🚀 Configuration des tâches cron de nettoyage automatique...
✅ Cron job pour emplois du temps configuré (tous les jours à 2h)
✅ Cron job pour événements configuré (tous les lundis à 3h)
✅ Cron job pour notifications configuré (tous les dimanches à 4h)
✅ Cron job pour fichiers temporaires configuré (toutes les heures)
🎉 Tous les cron jobs de nettoyage automatique sont configurés et actifs
```

### Erreur
```
❌ Erreur lors du nettoyage automatique: ER_ACCESS_DENIED_ERROR
```

## 🔗 Liens utiles

- [Documentation node-cron](https://github.com/node-cron/node-cron)
- [Expressions cron](https://crontab.guru/)
- [Fuseaux horaires](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
