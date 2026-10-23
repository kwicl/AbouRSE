# AbouRSE

Suivi de portefeuille pour la Bourse de Casablanca (BVC), en MAD. Application web installable (PWA) sur iOS et Android.

## Fonctionnalités

- Courbe de performance (ROI %) sur 1D, 1W, 1M, YTD et ALL, dans un conteneur néon vert (gain) ou rouge (perte)
- Indicateurs : valeur du portefeuille, montant investi, plus/moins-value latente, variation du jour, plus/moins-value réalisée
- Tableau des positions avec, en arrière-plan de chaque ligne, la courbe du cours depuis l'achat
- Ajout, modification, suppression et vente (partielle ou totale) de positions, avec historique des ventes
- Recherche de titres BVC
- Historique enregistré automatiquement dans le navigateur (localStorage)

## Données de marché

L'app interroge la Bourse de Casablanca via le proxy `/cse` (voir `vite.config.ts`). Si le flux est injoignable, elle passe en mode **DÉMO** : les cours sont simulés à partir de références indicatives (`src/lib/universe.ts`). Le badge LIVE / DÉMO en haut de l'écran indique le mode actif.

En production, il faut un proxy équivalent côté serveur (ex. rewrite Vercel ou fonction serverless).

## Démarrage

```bash
npm install
npm run dev
```

L'app tourne sur http://localhost:5180 (accessible aussi depuis un téléphone sur le même Wi-Fi).

```bash
npm run build
npm run preview
```

## Installation sur téléphone

L'installation demande une adresse en HTTPS (app déployée).

- iPhone : Safari, Partager, « Sur l'écran d'accueil »
- Android : Chrome, menu, « Installer l'application »

## Stack

React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide.
