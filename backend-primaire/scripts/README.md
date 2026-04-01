# Scripts de création d'administrateur - La Petite Académie

Ce dossier contient les scripts pour créer des administrateurs dans l'application La Petite Académie.

## 📁 Fichiers disponibles

- `createAdmin.js` - Script principal pour créer des administrateurs
- `start.js` - Interface interactive pour choisir le type de création
- `README.md` - Ce fichier d'aide

## 🚀 Utilisation

### Option 1: Script interactif (Recommandé)

```bash
cd backend/scripts
node start.js
```

Ce script vous présentera un menu avec 3 options :
1. **Créer un administrateur par défaut** - Utilise les données prédéfinies
2. **Créer un administrateur personnalisé** - Permet de saisir toutes les informations
3. **Quitter** - Ferme le script

### Option 2: Script direct

#### Créer un admin par défaut
```bash
cd backend/scripts
node createAdmin.js
```

#### Créer un admin personnalisé
```bash
cd backend/scripts
node createAdmin.js --custom
```

## 📋 Données par défaut

L'administrateur par défaut aura les informations suivantes :

- **Prénom**: Admin
- **Nom**: Principal
- **Email**: admin@lapetiteacademie.ci
- **Mot de passe**: Admin123!
- **Contact**: +2250708022424
- **Civilité**: M.
- **Fonction**: Directeur
- **Rôle**: admin

## 🔧 Rôles disponibles

- `admin` - Administrateur principal
- `secretary` - Secrétaire
- `éducateur` - Éducateur
- `comptable` - Comptable

## ⚠️ Prérequis

1. **Base de données configurée** - Assurez-vous que votre base de données MySQL est configurée et accessible
2. **Variables d'environnement** - Le fichier `.env` doit être configuré avec les informations de connexion à la base de données
3. **Dépendances installées** - Exécutez `npm install` dans le dossier `backend`

## 📧 Envoi d'email

Le script tente d'envoyer un email avec les identifiants de connexion. Si l'envoi échoue, les identifiants seront affichés dans la console.

## 🔒 Sécurité

- Les mots de passe sont automatiquement hashés avec bcrypt
- Le script vérifie que l'email n'existe pas déjà
- Validation complète des données avant insertion

## 🐛 Dépannage

### Erreur de connexion à la base de données
- Vérifiez que MySQL est démarré
- Vérifiez les informations de connexion dans `.env`
- Assurez-vous que la base de données existe

### Erreur "Email déjà utilisé"
- L'email existe déjà dans la base de données
- Utilisez un email différent ou supprimez l'utilisateur existant

### Erreur d'envoi d'email
- Vérifiez la configuration SMTP dans `.env`
- Les identifiants seront affichés dans la console même si l'email échoue

## 📝 Exemple d'utilisation

```bash
# Démarrer le script interactif
node start.js

# Choisir l'option 2 pour un admin personnalisé
# Saisir les informations demandées :
# Prénom: Marie
# Nom: Dupont
# Email: marie.dupont@lapetiteacademie.ci
# Mot de passe: MotDePasse123!
# Contact: +2250708022424
# Civilité: Mme
# Fonction: Directrice pédagogique
# Rôle: admin
```

## 🎯 Résultat attendu

Après une création réussie, vous verrez :

```
🎉 Administrateur créé avec succès!
📋 Informations de connexion:
   Email: marie.dupont@lapetiteacademie.ci
   Mot de passe: MotDePasse123!
   Rôle: admin
   Nom complet: Marie Dupont
```

Vous pouvez maintenant vous connecter à l'application avec ces identifiants !
