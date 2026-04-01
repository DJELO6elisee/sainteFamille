# SMS Configuration

Ce projet s'appuie sur la passerelle TPCloud (`https://panel.smsing.app/smsAPI`) pour l'envoi des SMS aux parents lorsque des événements sont créés.

## Variables d'environnement requises

| Variable | Description |
| --- | --- |
| `TPCLOUD_API_KEY` | Clé API TPCloud fournie par l'opérateur. |
| `TPCLOUD_API_TOKEN` | Jeton API TPCloud. |
| `TPCLOUD_BASE_URL` *(optionnel)* | URL de l'API. Défaut `https://panel.smsing.app/smsAPI`. |
| `TPCLOUD_SMS_TYPE` *(optionnel)* | Type de message (`sms`, `unicode`, `flash`, `whatsapp`, etc.). Défaut `sms`. |
| `TPCLOUD_ROUTE_ID` *(optionnel)* | Identifiant de route/passerelle spécifique. Laisser vide pour la valeur par défaut TPCloud. |
| `SMS_SENDER_ID` *(optionnel)* | Identifiant expéditeur (11 caractères maximum pour la plupart des opérateurs). Défaut `GS BETHANIE MIRACLE`. |
| `SMS_DEFAULT_COUNTRY_CODE` *(optionnel)* | Indicatif pays sans `+` (ex: `225`). Utilisé pour normaliser les numéros locaux. |

Placez ces variables dans votre fichier `.env` local :

```env
TPCLOUD_API_KEY=VotreCleApi
TPCLOUD_API_TOKEN=VotreTokenApi
TPCLOUD_BASE_URL=https://panel.smsing.app/smsAPI
TPCLOUD_SMS_TYPE=sms
SMS_SENDER_ID="GS BETHANIE"
SMS_DEFAULT_COUNTRY_CODE=225
```

> ℹ️ De nombreux agrégateurs imposent un identifiant expéditeur alphanumérique de 11 caractères max. Ajustez `SMS_SENDER_ID` si nécessaire (ex: `GSBETHANIE`).

## Expérience utilisateur

Lorsqu'un événement est créé (public, par classe ou privé), l'application :

1. Insère la notification en base de données.
2. Récupère les numéros `parent_phone` depuis la table `students`.
3. Envoie un SMS à chaque numéro distinct avec :
   - Le nom de l'école.
   - Le titre de l'événement.
   - Le message.
   - La date, si renseignée.

Les SMS sont envoyés même si aucun compte parent n'est associé dans l'application, tant que le numéro est renseigné dans `students.parent_phone`.

## Dépannage

- Vérifiez le solde TPCloud et que vos identifiants (`apikey`, `apitoken`) sont valides.
- Les numéros parents doivent être au format international (`+225...`). Le service tente de normaliser les numéros locaux en combinant `SMS_DEFAULT_COUNTRY_CODE` et le numéro saisi.
- Les logs serveur contiennent les erreurs d'appel (`[SMS]`). En cas d'absence de configuration, l'événement est créé mais aucun SMS n'est envoyé.

