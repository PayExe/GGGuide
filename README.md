# GGGuide - Guide Management Platform

A modern guide management platform with a React frontend and Hono backend, containerized with Docker and deployable on Docker Swarm.

## Stack

- **Frontend**: React 19 + Vite with TypeScript
- **Backend**: Hono HTTP framework with PostgreSQL database
- **Infrastructure**: Docker Compose (development) & Docker Swarm (production)
- **Orchestration**: Docker Swarm for multi-node deployment

## Project Structure

```
├── back/                    # Backend (Hono + TypeScript)
│   ├── src/
│   │   ├── index.ts         # Hono app entry point
│   │   ├── routes/          # API route handlers
│   │   ├── db/              # Database connection & queries
│   │   ├── middleware/      # Request middleware
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile.backend
├── front/                   # Frontend (React + Vite)
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile.frontend
├── docker-compose.yml       # Local development environment
├── docker-swarm-stack.yml   # Production Swarm deployment
├── DOCKER_COMPOSE.md        # Docker Compose documentation
├── DOCKER_SWARM.md          # Docker Swarm deployment guide
├── swarm-init.sh            # Swarm cluster initialization
├── swarm-deploy.sh          # Stack deployment script
└── swarm-manage.sh          # Swarm management CLI
```

## Quick Start

### Prerequisites

- Docker & Docker Compose (for local development)
- Docker Swarm initialized (for production)
- Node.js 20+ (for local development without Docker)

### Local Development with Docker Compose

```bash
# Start the entire stack (PostgreSQL, backend, frontend)
docker-compose up

# The application will be available at:
# - Frontend: http://localhost:80
# - Backend API: http://localhost:3000
# - PostgreSQL: localhost:5432
```

See [DOCKER_COMPOSE.md](./DOCKER_COMPOSE.md) for detailed development instructions.

### Production with Docker Swarm

#### 1. Initialize Swarm Cluster (3 nodes: 1 manager + 2 workers)

On the manager node:
```bash
./swarm-init.sh manager
```

On each worker node:
```bash
# Replace MANAGER_IP with the manager node's IP
./swarm-init.sh worker MANAGER_IP
```

#### 2. Configure Environment

Copy and update `.env.swarm`:
```bash
cp .env.swarm .env.swarm
nano .env.swarm  # Edit with your registry and database credentials
```

#### 3. Deploy Stack

From the manager node:
```bash
./swarm-deploy.sh
```

#### 4. Monitor & Manage

```bash
# View stack status
./swarm-manage.sh status

# View service logs
./swarm-manage.sh logs backend

# Scale a service
./swarm-manage.sh scale backend 3

# List all commands
./swarm-manage.sh
```

See [DOCKER_SWARM.md](./DOCKER_SWARM.md) for comprehensive production deployment guide.

## Architecture

### Local Development (Docker Compose)

```
┌─────────────────────────────────────────┐
│         Docker Compose Network          │
├─────────────────┬───────────┬───────────┤
│   Frontend      │  Backend  │ PostgreSQL│
│  (Nginx/React)  │   (Hono)  │    (DB)   │
│   :80/443       │  :3000    │  :5432   │
└─────────────────┴───────────┴───────────┘
```

### Production (Docker Swarm - 3 nodes)

```
                Manager Node (1x)
                ┌───────────────┐
                │  PostgreSQL   │ (1 replica)
                │  Backend (2)  │
                │  Frontend (2) │
                └───────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   Worker 1         Worker 2       Worker 3
   Backend (2)      Backend (2)    Frontend (2)
   Frontend (2)     Frontend (2)
```

**Key Characteristics:**
- **Overlay Network**: Secure communication between nodes
- **Service Replicas**: Backend (2) and Frontend (2) for high availability
- **Database**: Single PostgreSQL instance on manager (persistent volumes)
- **Load Balancing**: Docker Swarm's built-in load balancer
- **Resource Limits**: CPU and memory constraints per service
- **Logging**: Centralized JSON file logging

## API Endpoints

### Guides

- `GET /api/guides` - List all guides
- `GET /api/guides/:id` - Get guide by ID
- `POST /api/guides` - Create new guide
- `PUT /api/guides/:id` - Update guide
- `DELETE /api/guides/:id` - Delete guide

## Environment Variables

### Backend (.env)

```
DATABASE_URL=postgresql://user:password@localhost:5432/ggguide
NODE_ENV=development
PORT=3000
```

### Swarm Deployment (.env.swarm)

```
DOCKER_REGISTRY=docker.io
REGISTRY_USERNAME=your_username
REGISTRY_PASSWORD=your_password
STACK_NAME=ggguide
BACKEND_IMAGE=your_username/ggguide-backend:latest
FRONTEND_IMAGE=your_username/ggguide-frontend:latest
DB_HOST=postgresql
DB_USER=ggguide
DB_PASSWORD=secure_password
DB_NAME=ggguide
```

## Development

### Backend

```bash
cd back
npm install
npm run dev        # Start with hot reload
npm run build      # Build for production
npm run start      # Run compiled code
```

### Frontend

```bash
cd front
npm install
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

## Docker Commands

### Build Images

```bash
# Build backend image
docker build -f Dockerfile.backend -t ggguide-backend:latest .

# Build frontend image
docker build -f Dockerfile.frontend -t ggguide-frontend:latest .
```

### Push to Registry

```bash
docker tag ggguide-backend:latest your_registry/ggguide-backend:latest
docker push your_registry/ggguide-backend:latest

docker tag ggguide-frontend:latest your_registry/ggguide-frontend:latest
docker push your_registry/ggguide-frontend:latest
```

## Troubleshooting

### Docker Compose Issues

- **Services not starting**: Check logs with `docker-compose logs <service>`
- **Database connection failed**: Ensure PostgreSQL is healthy with `docker-compose ps`
- **Port conflicts**: Change ports in `docker-compose.yml` if needed

### Docker Swarm Issues

- **Worker won't join**: Verify network connectivity between nodes (ports 2377, 7946, 4789)
- **Services stuck pending**: Check node resources with `./swarm-manage.sh nodes`
- **Database not initialized**: Ensure volumes are properly mounted on manager node

For detailed troubleshooting, see relevant documentation files.

## Documentation

- [Docker Compose Guide](./DOCKER_COMPOSE.md) - Local development setup
- [Docker Swarm Guide](./DOCKER_SWARM.md) - Production deployment & operations
- [Nginx Configuration](./nginx.conf) - Reverse proxy & frontend routing
- [Backend TypeScript Config](./back/tsconfig.json) - Compiler settings
- [Frontend Vite Config](./front/vite.config.ts) - Build configuration

## License

Private project
