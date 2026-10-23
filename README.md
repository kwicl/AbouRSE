# AbouRSE

Suivi de portefeuille pour la Bourse de Casablanca (BVC), en MAD. Application web installable (PWA) sur iOS et Android.

## Fonctionnalités

- Courbe de performance (ROI %) sur 1D, 1W, 1M, YTD et ALL, dans un conteneur néon vert (gain) ou rouge (perte)
- Indicateurs : valeur du portefeuille, montant investi, plus/moins-value latente, variation du jour, plus/moins-value réalisée
- Tableau des positions avec, en arrière-plan de chaque ligne, la courbe réelle du cours depuis l'achat
- Ajout, modification, suppression et vente (partielle ou totale) de positions, avec historique des ventes
- Recherche parmi les actions cotées à la BVC
- Cours réels à chaque ouverture de l'app, puis toutes les 30 s pendant la séance
- Synchronisation des positions et ventes entre appareils via un code privé

## Données de marché

Les cours viennent du flux public de TradingView pour la Bourse de Casablanca (marché `CSEMA`), différé de 15 minutes :

- `api/quotes.ts` : cours et clôture de la veille de toutes les actions BVC (cache CDN 20 s)
- `api/history.ts` : clôtures journalières d'un titre sur environ 6 ans (cache CDN 1 h)

Si le flux est injoignable, l'app affiche les derniers cours réels connus (badge HORS LIGNE). Aucun cours n'est inventé.

## Synchronisation entre appareils

`api/sync.ts` stocke positions et ventes dans Upstash Redis, sous l'empreinte SHA-256 d'un code privé généré par l'app. Sur le second appareil, ouvrir le lien `https://<app>/#sync=<CODE>` ou saisir le code dans le panneau Synchronisation (icône nuage).

Quiconque possède le code peut lire et modifier le portefeuille : il faut le garder privé.

## Déploiement Vercel

1. Importer le dépôt GitHub dans Vercel (framework Vite détecté, Node 22).
2. Onglet **Storage** du projet : ajouter **Upstash for Redis** (Marketplace) et le connecter au projet. Les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN` sont créées automatiquement.
3. Redéployer.

Sans Redis, l'app fonctionne mais la synchronisation renvoie « Synchronisation non configurée ».

## Démarrage

```bash
npm install
npm run dev
```

L'app tourne sur http://localhost:5180 (accessible aussi depuis un téléphone sur le même Wi-Fi). En local, les fonctions de `api/` tournent dans Vite, et la synchronisation utilise un stockage en mémoire si Redis n'est pas configuré.

```bash
npm run build
npm run preview
```

## Installation sur téléphone

L'installation demande une adresse en HTTPS (app déployée).

- iPhone : Safari, Partager, « Sur l'écran d'accueil »
- Android : Chrome, menu, « Installer l'application »

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide. Fonctions serverless Vercel (Node 22).
