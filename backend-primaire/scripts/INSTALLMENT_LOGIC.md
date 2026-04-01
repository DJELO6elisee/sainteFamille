# 📋 Logique des Versements - Système de Paiement

## 🎯 **Principe Fondamental**

**Les frais d'inscription sont inclus dans le montant total de la scolarité et payés en un bloc à l'inscription. Les versements sont calculés sur le montant restant.**

## 💰 **Structure des Montants**

### **Niveau d'Études (ex: CP)**
```
tuition_amount: 1,500,000 FCFA    ← Montant total de la scolarité (inclut les frais d'inscription)
registration_fee: 75,000 FCFA     ← Frais d'inscription (payés en un bloc à l'inscription)
cantine_amount: 500,000 FCFA      ← Montant cantine (payé séparément)
```

### **Total à Payer par l'Étudiant**
```
Total = tuition_amount + cantine_amount
Total = 1,500,000 + 500,000 = 2,000,000 FCFA
```

## 🔄 **Calcul des Versements**

### **Base de Calcul**
```
Montant pour les versements = tuition_amount - registration_fee
Montant pour les versements = 1,500,000 - 75,000 = 1,425,000 FCFA
```

### **Exemple : 3 Versements (40%, 30%, 30%)**
```
Versement 1: 1,425,000 × 40% = 570,000 FCFA
Versement 2: 1,425,000 × 30% = 427,500 FCFA  
Versement 3: 1,425,000 × 30% = 427,500 FCFA
Total versements: 1,425,000 FCFA ✓
```

## 📅 **Échéancier de Paiement**

### **À l'Inscription (Jour 0)**
```
- Frais d'inscription: 75,000 FCFA (payé en un bloc)
- Versement 1: 570,000 FCFA (40% du montant restant)
- Cantine: 500,000 FCFA (si applicable)
Total jour 0: 1,145,000 FCFA
```

### **Après 90 jours**
```
- Versement 2: 427,500 FCFA (30% du montant restant)
```

### **Après 180 jours**
```
- Versement 3: 427,500 FCFA (30% du montant restant)
```

## 🏗️ **Architecture Technique**

### **Tables Impliquées**
1. **`education_levels`** : Définit les montants de base
2. **`level_installments`** : Configuration des pourcentages par niveau
3. **`installments`** : Versements individuels des étudiants
4. **`installment_payments`** : Paiements effectués

### **Code de Calcul**
```javascript
// Dans installmentController.js
const { tuition_amount, registration_fee } = levelInfo[0];
// Les versements sont calculés sur le montant restant après paiement des frais d'inscription
const totalAmount = Number(tuition_amount) - Number(registration_fee);

// Calcul de chaque versement
const amount = Math.round((totalAmount * percentage) / 100);
```

## ✅ **Avantages de cette Approche**

1. **Clarté** : Les frais d'inscription sont payés en un bloc, les versements sur le reste
2. **Flexibilité** : Les frais d'inscription sont inclus dans le montant total mais payés séparément
3. **Cohérence** : Les pourcentages totalisent toujours 100% du montant restant
4. **Simplicité** : Calculs clairs et prévisibles

## 📊 **Exemple Complet**

### **Étudiant : Marie Dupont - CP**
```
Scolarité totale: 1,500,000 FCFA (inclut les frais d'inscription)
Frais d'inscription: 75,000 FCFA (payés en un bloc à l'inscription)
Montant restant pour versements: 1,425,000 FCFA
Cantine: 500,000 FCFA

Versements de scolarité (sur le montant restant):
├── Versement 1 (40%): 570,000 FCFA - Échéance: 01/09/2024
├── Versement 2 (30%): 427,500 FCFA - Échéance: 01/12/2024
└── Versement 3 (30%): 427,500 FCFA - Échéance: 01/03/2025

Paiements séparés:
├── Frais d'inscription: 75,000 FCFA (à l'inscription)
└── Cantine: 500,000 FCFA (selon modalités)
```

**Total à payer: 2,000,000 FCFA**
- Scolarité totale: 1,500,000 FCFA (inclut frais d'inscription)
- Cantine: 500,000 FCFA
