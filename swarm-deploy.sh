#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Docker Swarm Deployment Script ===${NC}"
echo ""

# Check if Docker is in Swarm mode
if ! docker info | grep -q "Swarm: active"; then
    echo -e "${RED}Error: Docker is not part of an active Swarm${NC}"
    echo "Run './swarm-init.sh manager' on manager node first"
    exit 1
fi

# Check if we're on manager node
if ! docker info | grep -q "Swarm: active" | grep -q "IsManager: true" 2>/dev/null; then
    # Try to determine if manager by checking role
    ROLE=$(docker info | grep "Swarm: active" -A 10 | grep -o "Is Manager: true" || echo "false")
    if [ "$ROLE" = "false" ]; then
        echo -e "${YELLOW}Warning: This node does not appear to be a manager${NC}"
        echo "Stack deployment must be run from a manager node"
        exit 1
    fi
fi

# Load environment variables
if [ ! -f .env.swarm ]; then
    echo -e "${RED}Error: .env.swarm file not found${NC}"
    echo "Copy and configure .env.swarm before deployment"
    exit 1
fi

# Source .env.swarm
set -a
source .env.swarm
set +a

# Validate required variables
REQUIRED_VARS=("REGISTRY_USERNAME" "REGISTRY_PASSWORD" "DB_HOST" "DB_USER" "DB_PASSWORD" "DB_NAME")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}Error: Missing required environment variables:${NC}"
    printf '%s\n' "${MISSING_VARS[@]}"
    exit 1
fi

echo -e "${BLUE}Configuration loaded from .env.swarm${NC}"
echo ""

# Ask for confirmation
echo -e "${YELLOW}Stack Configuration:${NC}"
echo "  Registry: $DOCKER_REGISTRY"
echo "  Stack Name: $STACK_NAME"
echo "  Backend Image: $BACKEND_IMAGE"
echo "  Frontend Image: $FRONTEND_IMAGE"
echo "  PostgreSQL Host: $DB_HOST"
echo ""

read -p "Continue with deployment? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Create Docker config for env file (if needed)
echo -e "${GREEN}Preparing stack deployment...${NC}"

# Check if docker-swarm-stack.yml exists
if [ ! -f docker-swarm-stack.yml ]; then
    echo -e "${RED}Error: docker-swarm-stack.yml not found${NC}"
    exit 1
fi

# Deploy stack
echo -e "${GREEN}Deploying stack: $STACK_NAME${NC}"
docker stack deploy \
    -c docker-swarm-stack.yml \
    --with-registry-auth \
    "$STACK_NAME"

echo ""
echo -e "${GREEN}✓ Stack deployed successfully${NC}"
echo ""

# Wait for services to start
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 5

# Show stack status
echo -e "${BLUE}Stack Services:${NC}"
docker stack services "$STACK_NAME"

echo ""
echo -e "${BLUE}Service Replicas (check until all are running):${NC}"
docker stack services "$STACK_NAME" --format "table {{.Name}}\t{{.Replicas}}\t{{.Image}}"

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Useful commands:"
echo "  View stack: docker stack ps $STACK_NAME"
echo "  View logs: docker service logs ${STACK_NAME}_backend"
echo "  Scale service: docker service scale ${STACK_NAME}_backend=3"
echo "  Remove stack: docker stack rm $STACK_NAME"
