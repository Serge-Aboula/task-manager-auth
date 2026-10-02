# Task Manager Auth

Gestionnaire de tâches multi-utilisateurs avec authentification JWT, construit avec Express, vanilla JavaScript et Turso (libSQL).

![CI](https://github.com/Serge-Aboula/task-manager-auth/actions/workflows/ci.yml/badge.svg)

## Fonctionnalités

- Inscription / connexion avec hash bcrypt des mots de passe
- Authentification par JWT (token valide 7 jours)
- Isolation stricte des données : chaque utilisateur ne voit que ses propres tâches
- Réinitialisation de mot de passe (token sécurisé à usage unique, expire après 5 min)
- CRUD de tâches avec édition, confirmation de suppression, pagination
- Rate limiting sur les routes sensibles (login, forgot-password)
- "Se souvenir de moi" (choix entre session persistante ou temporaire)

## Stack technique

- **Backend** : Node.js, Express 5
- **Base de données** : Turso (libSQL, SQLite distant)
- **Auth** : bcrypt, jsonwebtoken
- **Frontend** : HTML5, CSS3, JavaScript vanilla (aucun framework)
- **Tests** : testeur natif Node (`node:test`) + Supertest
- **Qualité de code** : ESLint + Prettier
- **CI/CD** : GitHub Actions (lint + tests), déploiement continu sur Render

## Installation locale

\`\`\`bash
git clone https://github.com/Serge-Aboula/task-manager-auth.git
cd task-manager-auth
npm install
\`\`\`

Crée un fichier `.env` à la racine :

\`\`\`
PORT=3000
TURSO_DATABASE_URL=libsql://ton-url.turso.io
TURSO_AUTH_TOKEN=ton-token
JWT_SECRET=un-secret-aleatoire-genere-avec-crypto
APP_BASE_URL=http://localhost:3000
\`\`\`

Génère un `JWT_SECRET` sécurisé avec :

\`\`\`bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
\`\`\`

## Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Lance le serveur en mode développement (rechargement auto) |
| `npm start` | Lance le serveur en mode production |
| `npm test` | Lance la suite de tests |
| `npm run lint` | Vérifie la qualité du code |
| `npm run format` | Formate le code automatiquement |
| `npm run format:check` | Vérifie le formatage sans modifier les fichiers |

## Tests

Les tests utilisent un fichier SQLite local (`test.db`), isolé de la base de production.

\`\`\`bash
npm test
\`\`\`

## Déploiement

Déployé sur [Render](https://render.com) avec déploiement continu depuis la branche `main`. Variables d'environnement requises sur l'hébergeur : `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`, `APP_BASE_URL`.

## Licence

ISC