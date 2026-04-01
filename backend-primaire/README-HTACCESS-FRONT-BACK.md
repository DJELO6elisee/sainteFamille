# Deux domaines = deux configurations (.htaccess)

## Erreur CORS "No Access-Control-Allow-Origin" sur le login

Si le frontend (saintefamilleexcellence.ci) affiche cette erreur en appelant l'API : la requête **OPTIONS** (preflight) est souvent traitée par le **proxy (Nginx / Apache)** avant Node, et la réponse n'a pas les en-têtes CORS. **À faire** : Apache doit transmettre OPTIONS à Node ou répondre 204 **avec** les en-têtes CORS ; Nginx doit faire **proxy_pass** des OPTIONS vers Node (voir `nginx-cors-api.conf.example`).  
**Sur TPEcloud** : voir le guide **`README-TPECLOUD-CORS.md`** pour appliquer la config étape par étape.

---

## Important : c’est un FICHIER, pas un dossier

Tu dois créer **un fichier** nommé exactement **`.htaccess`** (avec le point devant), à la **racine** du dossier backend (le même niveau que `server.js`). Pas de dossier « htaccess ».

---

## Résumé

| Domaine | Rôle | Où mettre le .htaccess |
|--------|------|------------------------|
| **saintefamilleexcellence.ci** | Frontend (React) | Document root du **frontend** (tu l’as déjà) |
| **saintefamilleexcellence.ci** | Backend (API Node) | **Racine du dossier backend** (à côté de server.js) |

---

## Contenu à mettre dans le .htaccess du backend

Copie tout le contenu ci‑dessous dans un fichier nommé **`.htaccess`** et place ce fichier à la **racine du dossier backend** (là où se trouve `server.js`).

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

# --- Preflight OPTIONS /api/* : répondre 204 avec CORS (évite 403) ---
# Ne pas intercepter OPTIONS ici : laisser Node répondre au preflight (204 + CORS).

# --- Passenger : lancer l’app Node (adapter les chemins à ton serveur) ---
PassengerAppRoot "/home/trayeber/saintefamille"
PassengerBaseURI "/"
PassengerNodejs "/home/trayeber/nodevenv/saintefamille/20/bin/node"
PassengerAppType node
PassengerStartupFile server.js
PassengerAppLogFile "/home/trayeber/saintefamille/erreur.log"

# --- Forcer HTTPS ---
RewriteCond %{HTTPS} !=on
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]
```

---

## À adapter sur ton serveur

Les lignes **PassengerAppRoot**, **PassengerNodejs** et **PassengerAppLogFile** contiennent des chemins d’exemple. Sur ton hébergeur, remplace-les par les **vrais chemins** de ton compte (tu peux les retrouver dans le .htaccess du frontend ou dans la config Passenger / cPanel). Par exemple :

- **PassengerAppRoot** : chemin complet du dossier qui contient `server.js` (ex. `/home/trayeber/saintefamille` ou `/home/tonuser/backend-primaire`).
- **PassengerNodejs** : chemin vers l’exécutable `node` (souvent dans un nodevenv, ex. `/home/trayeber/nodevenv/saintefamille/20/bin/node`).
- **PassengerAppLogFile** : chemin du fichier de log (ex. `/home/trayeber/saintefamille/erreur.log`).

---

## En bref

1. Créer **un fichier** nommé **`.htaccess`** (pas un dossier).
2. Le mettre à la **racine du dossier backend** (à côté de `server.js`).
3. Y coller le contenu ci‑dessus.
4. Adapter les chemins Passenger si besoin.
5. Envoyer ce fichier sur le serveur dans le document root du domaine **saintefamilleexcellence.ci** (ou le même dossier que ton backend si le domaine pointe dessus).
