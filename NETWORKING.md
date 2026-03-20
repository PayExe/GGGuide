# 🔒 GGGuide - Networking & Architecture Guide

Complete guide to the secure networking architecture for GGGuide, from local development to production.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Network Isolation](#network-isolation)
3. [Port Management](#port-management)
4. [Traefik Reverse Proxy](#traefik-reverse-proxy)
5. [SSL/HTTPS Configuration](#ssltls-configuration)
6. [Local Development](#local-development)
7. [Production Deployment](#production-deployment)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Security Principle

**Only Traefik (reverse proxy) is exposed to the internet. All other services are isolated on internal networks.**

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                             │
│                  (Port 80, 443 ONLY)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────▼──────────────────┐
        │   🔒 Traefik Reverse Proxy        │
        │   - Terminates SSL/TLS            │
        │   - Routes to internal services   │
        │   - Load balancing                │
        │   - Rate limiting & security      │
        └────────────────┬──────────────────┘
                         │
        ┌────────────────┴──────────────────┐
        │    Overlay Network (Internal)     │
        │    Zero external exposure         │
        │                                   │
    ┌───▼──────┐   ┌──────▼──────┐  ┌──────▼────┐
    │ Backend  │   │ Frontend    │  │ PostgreSQL│
    │  :3001   │   │  :80        │  │  :5432    │
    │INTERNAL  │   │ INTERNAL    │  │ INTERNAL  │
    └──────────┘   └─────────────┘  └───────────┘
```

### Request Flow

```
1. Client connects to: https://ggguide.com/api/guides
           ↓
2. Traefik receives on port 443
   - Validates SSL certificate
   - Checks request path
           ↓
3. Route decision:
   - /api/* → Forward to Backend (with /api prefix stripped)
   - /* → Forward to Frontend (static content or SPA)
           ↓
4. Internal communication:
   - Backend talks to PostgreSQL via overlay network
   - All traffic stays within overlay network
           ↓
5. Response back through Traefik to client
```

---

## Network Isolation

### Development (Docker Compose)

**Network Type:** Bridge (localhost isolation)

```yaml
networks:
  ggguide-network:
    driver: bridge
```

**Services on network:**
- `traefik` - Reverse proxy (port 80, 443)
- `frontend` - Nginx SPA (internal)
- `backend` - Hono API (internal)
- `postgres` - Database (internal)

**Port Exposure:**
```
Host Ports           Container Ports
───────────────────────────────────
80 (Traefik)    →    80 (Traefik)
443 (Traefik)   →    443 (Traefik)
8080 (Traefik)  →    8080 (Dashboard, optional)

❌ Backend :3001 NOT exposed
❌ PostgreSQL :5432 NOT exposed
```

### Production (Docker Swarm)

**Network Type:** Overlay (encrypted, multi-node)

```yaml
networks:
  ggguide-network:
    driver: overlay
    driver_opts:
      com.docker.network.driver.overlay.vxlanid: 4096
```

**Features:**
- ✅ Encrypted VXLAN tunnel between nodes
- ✅ Service discovery with DNS
- ✅ Load balancing via Virtual IP (VIP)
- ✅ Zero exposure of internal ports

**Port Exposure:**
```
Internet Ports       Traefik Ports    Internal Services
────────────────────────────────────────────────────────
80, 443       →      80, 443     →    Routed internally
                                       Backend :3001
                                       Frontend :80
                                       PostgreSQL :5432
                                       (All on VIP)

❌ Nothing else exposed to internet
```

---

## Port Management

### Ports Used (Local Development)

| Service | Port | Exposed | Purpose |
|---------|------|---------|---------|
| Traefik | 80 | ✅ YES | HTTP entry point |
| Traefik | 443 | ✅ YES | HTTPS entry point |
| Traefik | 8080 | ⚠️ Optional | Dashboard (localhost only) |
| Frontend | 80 | ❌ NO | Internal, routed via Traefik |
| Backend | 3001 | ❌ NO | Internal only |
| PostgreSQL | 5432 | ❌ NO | Internal only |

### Ports Used (Production Swarm)

| Service | Port | Network | Mode |
|---------|------|---------|------|
| Traefik | 80 | Exposed | HTTP redirect → HTTPS |
| Traefik | 443 | Exposed | HTTPS (SSL/TLS) |
| Frontend | 80 | Overlay (VIP) | Internal service discovery |
| Backend | 3001 | Overlay (VIP) | Internal service discovery |
| PostgreSQL | 5432 | Overlay (VIP) | Internal, manager node |

### Docker Swarm Internal Ports

**Swarm communication (between nodes, firewalled):**
- `2377/tcp` - Manager communication
- `7946/tcp` - Gossip protocol (TCP)
- `7946/udp` - Gossip protocol (UDP)
- `4789/udp` - VXLAN overlay network

---

## Traefik Reverse Proxy

### How Traefik Works

Traefik watches Docker/Swarm and automatically detects services via labels:

```yaml
labels:
  - "traefik.enable=true"                           # Enable routing
  - "traefik.http.services.backend.loadbalancer.server.port=3001"
  - "traefik.http.routers.backend.rule=PathPrefix(`/api`)"
  - "traefik.http.routers.backend.entrypoints=web,websecure"
  - "traefik.http.routers.backend.tls.certresolver=letsencrypt"
  - "traefik.http.middlewares.backend-stripprefix.stripprefix.prefixes=/api"
  - "traefik.http.routers.backend.middlewares=backend-stripprefix"
```

### Label Breakdown

| Label | Purpose |
|-------|---------|
| `traefik.enable=true` | Enable automatic routing |
| `service.loadbalancer.server.port=3001` | Internal port to route to |
| `routers.rule=PathPrefix(/api)` | Match requests starting with `/api` |
| `routers.entrypoints=web,websecure` | Accept HTTP and HTTPS |
| `routers.tls.certresolver=letsencrypt` | Use Let's Encrypt for SSL |
| `middlewares.stripprefix.prefixes=/api` | Remove `/api` before forwarding to backend |

### Routing Rules

```
Request: GET https://ggguide.com/api/guides
           ↓
Traefik Rule: PathPrefix(/api)
           ↓
Match: YES → route to backend service
           ↓
Middleware: stripprefix(/api)
           ↓
Forward to Backend: GET http://backend:3001/guides
           ↓
Backend processes and responds
           ↓
Response back through Traefik
```

---

## SSL/TLS Configuration

### Let's Encrypt Integration

Traefik automatically manages SSL certificates from Let's Encrypt:

```yaml
--certificatesresolvers.letsencrypt.acme.email=${LETSENCRYPT_EMAIL}
--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
```

**Features:**
- ✅ Automatic certificate generation
- ✅ Automatic renewal 30 days before expiry
- ✅ Challenges completed on port 80
- ✅ Stored in `/letsencrypt/acme.json`

### Environment Variables

```bash
# .env.swarm
LETSENCRYPT_EMAIL=admin@ggguide.com  # Required for Let's Encrypt
TRAEFIK_HOST=traefik.ggguide.com     # Dashboard hostname
TRAEFIK_LOG_LEVEL=INFO               # Log verbosity
```

### HTTP to HTTPS Redirect

All HTTP requests are automatically redirected to HTTPS:

```
GET http://ggguide.com/api/guides
           ↓
Traefik receives on port 80
           ↓
Redirect: 301 → https://ggguide.com/api/guides
           ↓
Client follows redirect to HTTPS
```

---

## Local Development

### Starting Services with Docker Compose

```bash
# Ensure .env.docker is configured
docker-compose up

# Services will be available at:
# Frontend:  http://localhost/
# Traefik:   http://localhost:8080/dashboard/
```

### What's Running

```
traefik    (localhost:80, :443, :8080)
├── Watches for new services via Docker socket
├── Auto-configures routing via labels
└── Generates self-signed certs for HTTPS

frontend   (internal, routed via traefik:80)
├── Nginx serving React app
└── Path /* → served by frontend

backend    (internal, routed via traefik:80)
├── Hono API server
└── Path /api/* → routed to backend:3001

postgres   (internal, :5432)
└── Backend connects directly via overlay network
```

### Testing Routes

```bash
# Frontend
curl http://localhost/

# Backend
curl http://localhost/api/guides

# Traefik Dashboard
open http://localhost:8080/dashboard/
```

### Debugging Network Issues

```bash
# Check if all services are connected to the network
docker-compose ps

# View Traefik logs
docker-compose logs traefik

# Inspect network
docker network inspect ggguide_ggguide-network

# Test internal DNS resolution
docker-compose exec backend nslookup frontend
docker-compose exec backend nslookup postgres
```

---

## Production Deployment

### Prerequisites

Before deploying to Swarm, ensure:

1. **3 VPS nodes** (1 manager, 2 workers)
2. **Firewall rules** between nodes:
   - `2377/tcp` (manager)
   - `7946/tcp, 7946/udp` (gossip)
   - `4789/udp` (overlay)
3. **Docker installed** on all nodes
4. **Swarm initialized** (`swarm-init.sh manager`)

### Configuration

Set environment variables in `.env.swarm`:

```bash
# Docker images (must be pushed to registry first!)
BACKEND_IMAGE=username/ggguide-backend:latest
FRONTEND_IMAGE=username/ggguide-frontend:latest

# Database
DB_USER=ggguide
DB_PASSWORD=secure_random_password_here
DB_NAME=ggguide

# SSL/HTTPS
LETSENCRYPT_EMAIL=admin@yourdomain.com
TRAEFIK_HOST=traefik.yourdomain.com

# Log level
TRAEFIK_LOG_LEVEL=INFO
```

### Deploying Stack

```bash
# From manager node, after configuring .env.swarm:
./swarm-deploy.sh

# Verify deployment
./swarm-manage.sh status
./swarm-manage.sh services

# View logs
./swarm-manage.sh logs traefik
./swarm-manage.sh logs backend
./swarm-manage.sh logs frontend
```

### Verifying Secure Network

```bash
# Check that services are NOT exposed
netstat -tlnp | grep :3001    # Should NOT be listening
netstat -tlnp | grep :5432    # Should NOT be listening

# Only Traefik should expose ports
netstat -tlnp | grep :80      # Should be listening
netstat -tlnp | grep :443     # Should be listening

# Check overlay network
docker network ls
docker network inspect ggguide_ggguide-network

# Test internal service discovery
docker exec [container_id] ping backend
docker exec [container_id] ping frontend
docker exec [container_id] ping postgres
```

---

## Security Considerations

### ✅ What's Secured

| Component | Security |
|-----------|----------|
| **Traefik ports** | ✅ Only 80, 443 exposed |
| **Backend** | ✅ Not accessible directly |
| **PostgreSQL** | ✅ Not accessible from internet |
| **SSL/TLS** | ✅ Auto-managed by Let's Encrypt |
| **Network traffic** | ✅ Encrypted on overlay network |
| **Internal DNS** | ✅ Service discovery via Docker DNS |

### ⚠️ Important Notes

1. **Never expose backend or database ports** to the internet
2. **Keep `.env.swarm` secrets safe** (add to `.gitignore`)
3. **Use strong database passwords** (change from defaults)
4. **Enable Traefik API only for trusted networks**
5. **Rotate Docker registry credentials regularly**
6. **Monitor SSL certificate renewal** (check logs)

### Network Isolation Verification

```bash
# From inside backend container, this should work:
docker exec [backend_container] curl http://frontend/
docker exec [backend_container] psql -h postgres -U ggguide -d ggguide

# From internet, these should NOT work:
curl http://vps_ip:3001/health          # Connection refused
curl http://vps_ip:5432/                # Connection refused

# Only this should work:
curl http://vps_ip/api/guides           # Routed through Traefik
curl https://yourdomain.com/api/guides  # Via DNS and Traefik
```

---

## Troubleshooting

### Traefik Not Routing Requests

```bash
# Check if service has labels
docker-compose ps -q traefik | xargs docker inspect | grep -A 10 "Labels"

# Check Traefik logs
docker-compose logs traefik | tail -50

# Check if Traefik detected the service
curl http://localhost:8080/api/http/routers

# Verify labels syntax
docker-compose config | grep -A 20 "labels:"
```

### SSL Certificate Issues

```bash
# Check certificate file
docker-compose exec traefik ls -la /letsencrypt/

# View certificate details
docker-compose exec traefik cat /letsencrypt/acme.json | jq .

# Check certificate expiry
docker-compose exec traefik openssl x509 -enddate -noout
```

### Service Can't Reach Database

```bash
# Check network connectivity
docker-compose exec backend ping postgres

# Check DNS resolution
docker-compose exec backend nslookup postgres

# Check database listening
docker-compose exec postgres pg_isready -h localhost

# Check credentials
docker-compose exec backend psql -h postgres -U ggguide -d ggguide -c "SELECT 1"
```

### Port Already in Use

```bash
# Find what's using port 80
sudo lsof -i :80

# Find what's using port 443
sudo lsof -i :443

# Kill the process (if safe)
sudo kill -9 [PID]
```

### Overlay Network Issues (Swarm)

```bash
# List networks
docker network ls

# Inspect overlay network
docker network inspect [network_name]

# Check VXLAN ID conflicts
grep vxlanid /etc/docker/daemon.json

# Restart Docker daemon
sudo systemctl restart docker

# Rejoin Swarm if needed
docker swarm leave -f
./swarm-init.sh worker [MANAGER_IP]
```

---

## Advanced Configuration

### Custom Middleware

Add to `traefik-dynamic.yml`:

```yaml
http:
  middlewares:
    # Custom headers
    custom-headers:
      headers:
        customrequestheaders:
          X-Custom-Header: "value"

    # Basic auth
    basic-auth:
      basicAuth:
        users:
          - "user:hashed_password"
```

### Rate Limiting

```yaml
middlewares:
  rate-limit:
    rateLimit:
      average: 100         # 100 requests per second
      burst: 200           # Allow burst of 200
      period: 1s
```

### Compression

```yaml
middlewares:
  gzip:
    compress:
      minresponsebodysize: 1000  # Only compress responses > 1KB
```

---

## References

- [Traefik Documentation](https://doc.traefik.io)
- [Docker Swarm Networking](https://docs.docker.com/network/network-tutorial-overlay/)
- [Let's Encrypt](https://letsencrypt.org)
- [SSL/TLS Best Practices](https://wiki.mozilla.org/Security/Server_Side_TLS)
