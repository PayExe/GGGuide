# GGGuide - Blog de Guides de Jeux

Une petite app pour partager des guides de jeux vidéo.

## Installation

```bash
# Backend
cd back
npm install

# Frontend
cd front
npm install
```

## Lancer l'application

### Terminal 1 - Backend
```bash
cd back
npm run dev
```
Le backend démarre sur `http://localhost:4000`

### Terminal 2 - Frontend
```bash
cd front
npm run dev
```
Le frontend démarre sur `http://localhost:5173`

L'app devrait être accessible sur `http://localhost:5173`

## Architecture

- **Back**: Express.js + PostgreSQL
  - Port: 4000
  - Routes API: `/api/guides`

- **Front**: React + Vite
  - Port: 5173
  - Proxy automatiquevers le back en développement
  - Les requêtes vers `/api/*` sont redirigées vers `localhost:4000/api/*`

## Bases de données

La base de données est créée automatiquement au lancement du backend.

Table `guides`:
- `id` (serial, primary key)
- `title` (varchar)
- `game` (varchar)
- `content` (text)
- `difficulty` (varchar: Facile, Moyen, Difficile)
- `created_at` (timestamp)
