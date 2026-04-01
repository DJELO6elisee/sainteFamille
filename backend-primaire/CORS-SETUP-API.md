# CORS : API sur saintefamilleexcellence.ci

## Problème

Le frontend est sur **https://saintefamilleexcellence.ci** et appelle l’API sur **https://saintefamilleexcellence.ci**.  
Le navigateur envoie d’abord une requête **OPTIONS** (preflight) vers l’API. Si cette requête ne reçoit pas l’en-tête `Access-Control-Allow-Origin`, le navigateur bloque l’appel (POST login, etc.).

Les logs que vous voyez (`Host: saintefamilleexcellence.ci`) viennent du serveur du **frontend**. La requête OPTIONS et le POST partent vers le serveur de l’**API** (saintefamilleexcellence.ci). La correction doit donc être faite **sur le serveur qui héberge l’API**.

## Solution 1 : Déployer le backend sur l’API

1. Déployer ce projet Node (avec le `server.js` à jour) sur le serveur **saintefamilleexcellence.ci**.
2. S’assurer que les requêtes vers `/api/*` (y compris **OPTIONS**) sont bien envoyées à cette application Node (proxy Nginx/Apache → Node).

Le `server.js` contient déjà un middleware CORS en tout premier qui répond aux OPTIONS avec les bons en-têtes.

## Solution 2 : CORS dans Nginx (sur le serveur de l’API)

Si l’API est derrière Nginx sur **saintefamilleexcellence.ci** et que les OPTIONS n’atteignent pas Node (ou que Node n’est pas déployé là), ajoutez la configuration CORS **dans Nginx** sur ce serveur.

1. Sur le serveur **saintefamilleexcellence.ci**, ouvrir la config Nginx du vhost qui sert ce domaine.
2. S’inspirer du fichier **`nginx-cors-api.conf.example`** dans ce dossier.
3. En résumé :
   - Définir une `map $http_origin $cors_origin` pour les origines autorisées (saintefamilleexcellence.ci, etc.).
   - Dans le `location /api/` :
     - Pour `OPTIONS` : renvoyer 204 avec les en-têtes CORS (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, etc.).
     - Pour les autres méthodes : ajouter `Access-Control-Allow-Origin` et `Access-Control-Allow-Credentials` aux réponses (via `add_header ... always`).
4. Recharger Nginx : `sudo nginx -t && sudo systemctl reload nginx`.

## Vérification

Après mise en place (Solution 1 ou 2) :

1. Ouvrir https://saintefamilleexcellence.ci et tenter de se connecter (login).
2. Dans les DevTools (F12) → onglet **Network** :
   - Vérifier la requête **OPTIONS** vers `https://saintefamilleexcellence.ci/api/auth/login` : statut 204 (ou 200) et en-têtes de réponse contenant `Access-Control-Allow-Origin: https://saintefamilleexcellence.ci`.
   - Puis la requête **POST** vers le même URL : statut 200 (ou 401) et même en-tête CORS.

Si l’OPTIONS ne renvoie pas ces en-têtes, la configuration CORS n’est pas appliquée sur le serveur qui répond pour **saintefamilleexcellence.ci** (il faut configurer CORS sur le serveur qui sert ce domaine).
