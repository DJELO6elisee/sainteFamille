# Appliquer la config CORS sur TPEcloud

Sur **TPEcloud** (tpecloud.ci), l’API est souvent derrière **Apache** (avec .htaccess) ou **Nginx**. Voici comment appliquer la config selon votre accès.

---

## 1. Utiliser le .htaccess (Apache) — cas le plus fréquent sur TPEcloud

Si votre backend Node est lancé via **Passenger** (ou équivalent) et que vous avez un fichier **.htaccess** à la racine du backend :

### Où mettre le .htaccess

- **Emplacement** : même dossier que `server.js` (racine du backend).
- Sur TPEcloud, c’est en général le **document root** du domaine **saintefamilleexcellence.ci** (ou le sous-dossier pointé par ce domaine).

### Comment éditer le .htaccess sur TPEcloud

1. Connectez-vous au **panneau TPEcloud** (cPanel, Plesk ou interface TPEcloud).
2. Ouvrez **Gestionnaire de fichiers** (File Manager) ou **FTP**.
3. Allez dans le dossier du **backend** (celui qui contient `server.js`).
4. Créez ou éditez le fichier **`.htaccess`** (avec le point devant).
   - S’il n’existe pas : « Nouveau fichier » → nom : `.htaccess`.
   - Si vous ne voyez pas les fichiers commençant par un point : activez « Afficher les fichiers cachés » dans les options du gestionnaire.

### Contenu à mettre dans le .htaccess du backend

**Important** : ne pas faire répondre **204** à OPTIONS dans Apache (sinon les en-têtes CORS ne partent pas toujours). On laisse **Node** répondre au preflight OPTIONS.

Copiez le bloc ci‑dessous dans votre `.htaccess` du backend (en adaptant les chemins Passenger à votre compte) :

```apache
RewriteEngine On

# --- CORS : autoriser le frontend (saintefamilleexcellence.ci) ---
SetEnvIf Origin "^https?://(www\.)?saintefamilleexcellence\.ci$" CORS_ALLOW=1
SetEnvIf Origin "^http://localhost:3000$" CORS_ALLOW=1
SetEnvIf Origin "^http://127\.0\.0\.1:3000$" CORS_ALLOW=1

<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "%{HTTP_Origin}i" env=CORS_ALLOW
    Header always set Access-Control-Allow-Credentials "true" env=CORS_ALLOW
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS" env=CORS_ALLOW
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers" env=CORS_ALLOW
    Header always set Access-Control-Max-Age "86400" env=CORS_ALLOW
</IfModule>

# --- NE PAS répondre 204 à OPTIONS ici : laisser Node gérer le preflight (évite 403 sans CORS) ---

# --- Passenger : lancer l'app Node (ADAPTER les chemins à votre compte TPEcloud) ---
PassengerAppRoot "/home/VOTRE_USER/chemin/backend"
PassengerBaseURI "/"
PassengerNodejs "/chemin/vers/node"
PassengerAppType node
PassengerStartupFile server.js
PassengerAppLogFile "/home/VOTRE_USER/chemin/backend/erreur.log"

# --- Forcer HTTPS ---
RewriteCond %{HTTPS} !=on
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
```

À adapter :

- **PassengerAppRoot** : chemin complet du dossier qui contient `server.js` (ex. `/home/trayeber/saintefamille` ou `/home/votreuser/backend-primaire`).
- **PassengerNodejs** : chemin vers l’exécutable `node` (souvent dans un environnement Node fourni par TPEcloud).
- **PassengerAppLogFile** : chemin d’un fichier de log (ex. `erreur.log` dans le dossier du backend).

Sur TPEcloud, ces chemins sont souvent indiqués dans la doc Node / Passenger ou dans le panneau (section Node.js / Applications).

### Vérifier qu’Apache transmet OPTIONS à Node

- Il ne doit **pas** y avoir de règle du type : « si méthode = OPTIONS alors renvoyer 204 ».
- Si une telle règle existait, supprimez‑la pour que les requêtes **OPTIONS** vers `/api/...` aillent bien jusqu’à Node ; Node répond alors **204** avec les en-têtes CORS (déjà configurés dans `server.js`).

---

## 2. Si TPEcloud utilise Nginx (VPS / serveur)

Sur un **VPS** ou un plan avec accès **SSH**, le serveur peut être **Nginx** (parfois Nginx + Apache derrière).

### Avec accès SSH

1. Connectez-vous en **SSH** à votre serveur.
2. Trouvez la config du site de l’API, par exemple :
   - `/etc/nginx/sites-available/saintefamilleexcellence.ci`
   - ou dans `/etc/nginx/conf.d/`.
3. Dans le `location /api/` qui fait le proxy vers Node, ajoutez la gestion du preflight **OPTIONS** avec les en-têtes CORS (voir le fichier **`nginx-api-cors-OPTIONS-204.conf`** à la racine du backend).
4. Tester puis recharger Nginx :
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

### Sans accès SSH (hébergement mutualisé)

- Vous ne pouvez en général **pas** modifier la config Nginx vous‑même.
- **À faire** : ouvrir un ticket au **support TPEcloud** et leur demander :
  - d’autoriser la méthode **OPTIONS** pour le domaine **saintefamilleexcellence.ci** (chemin `/api/`) ;
  - soit de transmettre les requêtes OPTIONS à votre application Node,
  - soit de répondre **204** aux OPTIONS avec les en-têtes CORS suivants :
    - `Access-Control-Allow-Origin: https://saintefamilleexcellence.ci`
    - `Access-Control-Allow-Credentials: true`
    - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS`
    - `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers`
    - `Access-Control-Max-Age: 86400`

Vous pouvez leur envoyer le contenu du fichier **`nginx-api-cors-OPTIONS-204.conf`** comme référence.

---

## 3. Résumé selon votre accès TPEcloud

| Accès | Action |
|--------|--------|
| **Fichiers / FTP / File Manager** | Éditer le **.htaccess** du backend comme en section 1 (sans règle 204 pour OPTIONS). |
| **SSH + Nginx** | Ajouter la gestion OPTIONS + CORS dans la config Nginx (voir `nginx-api-cors-OPTIONS-204.conf`). |
| **Panneau seul, pas SSH** | Utiliser le .htaccess (section 1) ; si le 403 persiste, contacter le **support TPEcloud** pour qu’ils autorisent OPTIONS et CORS pour `saintefamilleexcellence.ci`. |

---

## 4. Support TPEcloud

- Site : **tpecloud.ci**
- Support : voir la section « Contact » ou « Support » sur le site, ou les infos de votre panneau d’hébergement.

Une fois le .htaccess corrigé (ou la config Nginx appliquée / demandée au support), refaites un test de connexion depuis **https://saintefamilleexcellence.ci** vers **https://saintefamilleexcellence.ci/api/auth/login**.
