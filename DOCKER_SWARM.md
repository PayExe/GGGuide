# Docker Swarm Deployment Guide

Complete guide for deploying GGGuide to Docker Swarm with 1 manager and 2 worker nodes.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Load Balancer / Proxy                 │
│                   (Optional: HAProxy/Nginx)              │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    ┌───▼────┐      ┌───▼────┐      ┌───▼────┐
    │Manager  │      │Worker 1 │      │Worker 2 │
    │Node     │      │Node     │      │Node     │
    │         │      │         │      │         │
    │ +DB     │      │Backend  │      │Backend  │
    │         │      │Frontend │      │Frontend │
    └─────────┘      └─────────┘      └─────────┘
    
    Service Discovery: Swarm DNS (backend, frontend, postgres)
    Load Balancing: Built-in service discovery
    Replica Distribution: 1 on manager, 1 on each worker
```

## Prerequisites

### System Requirements

- **3 VPS/Servers:**
  - 1 Manager node: Ubuntu 20.04+ (2GB RAM, 2 vCPU minimum)
  - 2 Worker nodes: Ubuntu 20.04+ (2GB RAM, 2 vCPU minimum)
  
- **Network Requirements:**
  - All nodes on same network or with firewall rules allowing:
    - Port 2377/tcp: Cluster management
    - Port 7946/tcp,udp: Node communication
    - Port 4789/udp: Overlay network traffic
  
- **Software:**
  - Docker Engine 20.10+ on all nodes
  - `docker` and `docker-compose` CLI

## Step 1: Initialize Docker Swarm

### On Manager Node

```bash
# Get manager node IP
MANAGER_IP=$(hostname -I | awk '{print $1}')
echo "Manager IP: $MANAGER_IP"

# Initialize swarm
docker swarm init --advertise-addr $MANAGER_IP

# Output will show:
# docker swarm join --token <TOKEN> <MANAGER_IP>:2377
```

### On Worker Nodes

```bash
# Copy the token command from manager output, then:
docker swarm join --token SWMTKN-... <MANAGER_IP>:2377

# Verify
docker node ls
```

## Step 2: Setup Registry (Docker Hub)

### Option A: Docker Hub

```bash
# Login to Docker Hub
docker login

# Tag images
docker tag ggguide-backend:latest username/ggguide-backend:latest
docker tag ggguide-frontend:latest username/ggguide-frontend:latest

# Push images
docker push username/ggguide-backend:latest
docker push username/ggguide-frontend:latest
```

### Option B: Private Registry

```bash
# Setup private registry container on manager
docker service create \
  --name registry \
  --publish 5000:5000 \
  registry:2

# Tag and push to private registry
docker tag ggguide-backend:latest localhost:5000/ggguide-backend:latest
docker push localhost:5000/ggguide-backend:latest

# On workers, configure insecure registry:
# /etc/docker/daemon.json
{
  "insecure-registries": ["<manager-ip>:5000"]
}
```

## Step 3: Deploy Stack

### On Manager Node

```bash
# Clone repo
git clone <repo-url>
cd GGGuide

# Create .env.swarm with your config
cp .env.swarm .env.swarm.local
# Edit .env.swarm.local with your registry and credentials

# Deploy stack
docker stack deploy -c docker-swarm-stack.yml --with-registry-auth ggguide

# Verify deployment
docker stack ps ggguide
docker stack services ggguide
```

### Check Service Status

```bash
# List all services
docker service ls

# Check backend service
docker service ps ggguide_backend

# Check frontend service
docker service ps ggguide_frontend

# View logs
docker service logs ggguide_backend
docker service logs ggguide_frontend
```

## Step 4: Verify Deployment

### Check Services

```bash
# All services running
docker service ls

# Should show:
# ID  NAME                MODE         REPLICAS  IMAGE
# ... ggguide_backend     replicated   2/2       ...
# ... ggguide_frontend    replicated   2/2       ...
# ... ggguide_postgres    replicated   1/1       ...
```

### Health Checks

```bash
# Check if all tasks are healthy
docker stack ps ggguide

# Check specific service logs
docker service logs ggguide_backend --follow
```

### Access Application

```bash
# Find frontend service IP (any node IP works due to load balancing)
curl http://<any-node-ip>/
curl http://<any-node-ip>/api/guides

# Direct to specific node:
curl http://<worker-1-ip>/
curl http://<worker-2-ip>/
```

## Common Operations

### Scale Services

```bash
# Scale backend to 3 replicas
docker service scale ggguide_backend=3

# Scale frontend to 3 replicas
docker service scale ggguide_frontend=3
```

### Update Service Image

```bash
# Update backend image
docker service update \
  --image registry/ggguide-backend:v2 \
  ggguide_backend

# Update frontend image
docker service update \
  --image registry/ggguide-frontend:v2 \
  ggguide_frontend

# Rolling update happens automatically with delay
```

### View Service Logs

```bash
# Logs from all replicas
docker service logs ggguide_backend --follow

# Logs from specific task
docker service logs ggguide_backend.1 --follow
```

### Update Resource Limits

```bash
# Update backend resources
docker service update \
  --limit-cpu 0.5 \
  --limit-memory 512M \
  ggguide_backend
```

### Access Database

```bash
# Find postgres container
docker ps | grep postgres

# Connect to database
docker exec -it <container-id> psql -U ggguide -d ggguide

# Or via service name (from within another container)
docker run -it --rm --network ggguide_ggguide-network \
  postgres:16-alpine \
  psql -h postgres -U ggguide -d ggguide
```

## Monitoring & Maintenance

### Node Status

```bash
# List all nodes
docker node ls

# Node details
docker node inspect <node-id>

# Check node health
docker node ps <node-id>
```

### Service Health

```bash
# Continuous monitoring
watch -n 1 'docker service ps ggguide'

# Health status
docker service ls

# Detailed service info
docker service inspect ggguide_backend
```

### Logs Aggregation

```bash
# View all stack logs
docker stack logs ggguide

# Follow specific service
docker service logs -f ggguide_backend
```

## Troubleshooting

### Service Won't Start

```bash
# Check stack status
docker stack ps ggguide --no-trunc

# Check service logs
docker service logs ggguide_backend --tail 100

# Check node status
docker node ls
```

### Image Pull Errors

```bash
# Ensure Docker Hub login
docker login

# Push images to registry
docker push username/ggguide-backend:latest

# Verify images exist
docker images | grep ggguide
```

### Database Connection Issues

```bash
# Check postgres service
docker service ps ggguide_postgres

# Check database is ready
docker exec <postgres-container> pg_isready -U ggguide

# Check network connectivity
docker exec <backend-container> ping postgres
```

### Stuck Containers

```bash
# Restart service
docker service update --force ggguide_backend

# Or remove and redeploy
docker stack rm ggguide
docker stack deploy -c docker-swarm-stack.yml ggguide
```

## Remove Stack

```bash
# Remove entire stack (keeps data in volumes)
docker stack rm ggguide

# Remove stack with volumes (delete data!)
docker volume prune -f
```

## Best Practices

1. **Always use versioned images** (not `latest` in production)
2. **Set resource limits** to prevent node overload
3. **Use health checks** for automatic restarts
4. **Monitor logs** for errors and warnings
5. **Backup database** regularly
6. **Test deployments** on staging first
7. **Use secrets** for sensitive data (future enhancement)
8. **Load balance** with external proxy if needed
