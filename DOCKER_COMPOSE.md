# Docker Compose Setup - Local Development

Quick setup guide for running GGGuide locally with Docker Compose.

## Prerequisites

- Docker: https://docs.docker.com/get-docker/
- Docker Compose: https://docs.docker.com/compose/install/

## Quick Start

### 1. Start Services

```bash
docker-compose up -d
```

This will:
- Start PostgreSQL database (port 5432)
- Build and start backend (port 3001)
- Build and start frontend with Nginx (port 80)
- Create persistent volume for database

### 2. Verify Services

Check all services are running:

```bash
docker-compose ps
```

Expected output:
```
CONTAINER ID   IMAGE              STATUS
...            ggguide-postgres   Up (healthy)
...            ggguide-backend    Up
...            ggguide-frontend   Up
```

### 3. Access Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001/api/guides
- **Health Check**: http://localhost:3001/health

### 4. View Logs

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## Common Commands

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Volumes

```bash
docker-compose down -v
```

### Rebuild Services

```bash
docker-compose up -d --build
```

### Run Backend Development Server

Backend automatically runs with `npm run dev` (tsx watch for hot-reload).

To rebuild only backend:

```bash
docker-compose up -d --build backend
```

### Access Database

```bash
docker exec -it ggguide-postgres psql -U ggguide -d ggguide
```

### View Backend Logs

```bash
docker-compose logs -f backend
```

## Environment Variables

Edit `.env.docker` to customize:
- `DB_USER`: PostgreSQL username
- `DB_PASSWORD`: PostgreSQL password
- `DB_NAME`: Database name
- `NODE_ENV`: Environment (development/production)
- `PORT`: Backend port

## Architecture

```
┌─────────────────────────────────────┐
│       Nginx (Frontend)               │
│       Port: 80                       │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        │             │
   Static Assets   /api/* requests
        │             │
        │      ┌──────▼──────┐
        │      │ Hono Backend │
        │      │ Port: 3001   │
        │      └──────┬───────┘
        │             │
        │      ┌──────▼──────────┐
        │      │ PostgreSQL DB   │
        │      │ Port: 5432      │
        │      └─────────────────┘
        │
   React Build
   (Vite)
```

## Troubleshooting

### Port Already in Use

```bash
# Change ports in docker-compose.yml or:
docker-compose down -v
# Kill process on port 80, 3001, or 5432
```

### Database Connection Error

```bash
# Wait for PostgreSQL to be healthy
docker-compose logs postgres
docker-compose exec postgres pg_isready -U ggguide
```

### Build Issues

```bash
# Rebuild everything from scratch
docker-compose down -v
docker system prune -f
docker-compose up -d --build
```

### Hot Reload Not Working

Backend uses `tsx watch`. If changes aren't picked up:

```bash
docker-compose restart backend
```

## Development Workflow

1. Edit code locally (files are volume-mounted)
2. Backend: Changes auto-reload via `tsx watch`
3. Frontend: Changes require rebuild or use Vite dev server
4. Database: Persisted in `postgres_data` volume

To reset database:

```bash
docker-compose down -v
docker-compose up -d
```
