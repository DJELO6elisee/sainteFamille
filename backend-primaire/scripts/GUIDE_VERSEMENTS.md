# 📋 Guide de Configuration des Versements

## 🎯 **Principe**

Le système permet de définir **autant de versements qu'on veut** pour chaque niveau d'études, avec des pourcentages et des délais personnalisés.

## 🏗️ **Structure Flexible**

### **Table `level_installments`**
```sql
- education_level_id: ID du niveau d'études
- installment_number: Numéro du versement (1, 2, 3, 4, 5, 6...)
- percentage: Pourcentage du montant restant (après frais d'inscription)
- due_date_offset_days: Délai en jours après l'inscription
- is_active: Actif ou non
```

## 📊 **Exemples de Configurations**

### **1. Niveau Maternelle - 2 Versements**
```
Versement 1: 50% à l'inscription (0 jours)
Versement 2: 50% après 120 jours
```

### **2. Niveau Primaire - 3 Versements**
```
Versement 1: 40% à l'inscription (0 jours)
Versement 2: 30% après 90 jours
Versement 3: 30% après 180 jours
```

### **3. Niveau Avancé - 4 Versements**
```
Versement 1: 30% à l'inscription (0 jours)
Versement 2: 25% après 60 jours
Versement 3: 25% après 120 jours
Versement 4: 20% après 180 jours
```

### **4. Programme Spécial - 6 Versements Mensuels**
```
Versement 1: 20% à l'inscription (0 jours)
Versement 2: 16.67% après 30 jours
Versement 3: 16.67% après 60 jours
Versement 4: 16.67% après 90 jours
Versement 5: 16.67% après 120 jours
Versement 6: 13.32% après 150 jours
```

### **5. Programme Étalé - 12 Versements Mensuels**
```
Versement 1: 10% à l'inscription (0 jours)
Versement 2-11: 8.33% chaque mois (30, 60, 90... jours)
Versement 12: 8.35% après 330 jours
```

## 🔧 **Comment Configurer via l'Interface**

### **Via la Page de Gestion des Niveaux**
1. Aller sur la page "Gestion des Niveaux d'Études"
2. Cliquer sur "Modifier" pour un niveau
3. Dans la section "Configuration des Versements" :
   - Cliquer sur "Ajouter un Versement" pour chaque versement
   - Définir le pourcentage pour chaque versement
   - Définir le délai en jours après l'inscription
   - Vérifier que le total fait 100%

### **Exemple d'Interface**
```
Configuration des Versements
┌─────────────────────────────────────────────────────┐
│ Versement | Pourcentage | Délai (jours) | Actions   │
├─────────────────────────────────────────────────────┤
│ 1         │ 40.00       │ 0             │ [Suppr]   │
│ 2         │ 30.00       │ 90            │ [Suppr]   │
│ 3         │ 30.00       │ 180           │ [Suppr]   │
├─────────────────────────────────────────────────────┤
│ Total: 100.00%                                      │
│ [Ajouter un Versement]                              │
└─────────────────────────────────────────────────────┘
```

## ⚠️ **Règles Importantes**

### **1. Total des Pourcentages**
- Les pourcentages doivent totaliser **exactement 100%**
- Le système vérifie automatiquement cette règle

### **2. Premier Versement**
- Le premier versement (installment_number = 1) doit avoir `due_date_offset_days = 0`
- Il est payé à l'inscription

### **3. Numérotation**
- Les versements doivent être numérotés séquentiellement (1, 2, 3, 4...)
- Pas de saut dans la numérotation

### **4. Délais**
- Les délais sont calculés en jours après la date d'inscription
- Exemple : 90 jours = 3 mois après l'inscription

## 💡 **Conseils de Configuration**

### **Pour les Petits (Maternelle)**
- **2 versements** : Plus simple pour les parents
- **50% / 50%** : Équilibre entre inscription et milieu d'année

### **Pour le Primaire**
- **3 versements** : Équilibre entre flexibilité et simplicité
- **40% / 30% / 30%** : Plus d'argent à l'inscription

### **Pour les Niveaux Avancés**
- **4 versements** : Plus de flexibilité
- **30% / 25% / 25% / 20%** : Répartition équilibrée

### **Pour les Programmes Spéciaux**
- **6-12 versements** : Paiements mensuels
- **Pourcentages égaux** : Facilite la gestion

## 🔍 **Vérification des Configurations**

### **Requête de Vérification**
```sql
SELECT 
    el.name as niveau,
    COUNT(li.id) as nombre_versements,
    SUM(li.percentage) as total_pourcentage,
    CASE 
        WHEN SUM(li.percentage) = 100.00 THEN 'OK'
        ELSE 'ATTENTION: Total ≠ 100%'
    END as statut
FROM education_levels el
LEFT JOIN level_installments li ON el.id = li.education_level_id AND li.is_active = 1
GROUP BY el.id, el.name
ORDER BY el.order_index;
```

## 🚀 **Avantages de cette Flexibilité**

1. **Adaptabilité** : Chaque niveau peut avoir sa propre configuration
2. **Évolutivité** : Facile d'ajouter ou modifier des versements
3. **Simplicité** : Interface intuitive pour la configuration
4. **Vérification** : Contrôles automatiques des pourcentages
5. **Traçabilité** : Historique complet des configurations

## 📝 **Exemple Complet**

### **Configuration d'un Niveau avec 5 Versements**
```javascript
// Données à envoyer via l'API
{
  "name": "Cours Préparatoire",
  "code": "CP",
  "tuition_amount": 1500000,
  "registration_fee": 75000,
  "installments": [
    { "installment_number": 1, "percentage": 25, "due_date_offset_days": 0 },
    { "installment_number": 2, "percentage": 20, "due_date_offset_days": 60 },
    { "installment_number": 3, "percentage": 20, "due_date_offset_days": 120 },
    { "installment_number": 4, "percentage": 20, "due_date_offset_days": 180 },
    { "installment_number": 5, "percentage": 15, "due_date_offset_days": 240 }
  ]
}
```

### **Calcul Automatique**
```
Montant restant: 1,500,000 - 75,000 = 1,425,000 FCFA

Versement 1: 1,425,000 × 25% = 356,250 FCFA (à l'inscription)
Versement 2: 1,425,000 × 20% = 285,000 FCFA (après 60 jours)
Versement 3: 1,425,000 × 20% = 285,000 FCFA (après 120 jours)
Versement 4: 1,425,000 × 20% = 285,000 FCFA (après 180 jours)
Versement 5: 1,425,000 × 15% = 213,750 FCFA (après 240 jours)

Total: 1,425,000 FCFA ✓
```

Le système est entièrement flexible et permet de s'adapter à tous les besoins ! 🎉

