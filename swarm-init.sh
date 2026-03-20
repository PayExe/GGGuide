#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Docker Swarm Initialization Script ===${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Get role from argument
ROLE=${1:-}
if [ -z "$ROLE" ]; then
    echo -e "${YELLOW}Usage: ./swarm-init.sh [manager|worker] [MANAGER_IP_FOR_WORKER]${NC}"
    echo ""
    echo "Examples:"
    echo "  ./swarm-init.sh manager              # Initialize as Swarm manager"
    echo "  ./swarm-init.sh worker 192.168.1.10  # Join as worker to manager at 192.168.1.10"
    exit 1
fi

if [ "$ROLE" = "manager" ]; then
    echo -e "${GREEN}Initializing Docker Swarm as MANAGER...${NC}"
    
    # Check if already in a swarm
    if docker info | grep -q "Swarm: active"; then
        echo -e "${YELLOW}Already part of a Swarm. Leaving current swarm first...${NC}"
        docker swarm leave -f || true
    fi
    
    # Initialize swarm
    MANAGER_IP=$(hostname -I | awk '{print $1}')
    docker swarm init --advertise-addr "$MANAGER_IP"
    
    echo ""
    echo -e "${GREEN}✓ Docker Swarm Manager initialized${NC}"
    echo -e "${YELLOW}Manager IP: $MANAGER_IP${NC}"
    echo ""
    echo "Workers can join using:"
    TOKEN=$(docker swarm join-token -q worker)
    echo -e "${GREEN}docker swarm join --token $TOKEN $MANAGER_IP:2377${NC}"
    echo ""
    
elif [ "$ROLE" = "worker" ]; then
    MANAGER_IP=${2:-}
    if [ -z "$MANAGER_IP" ]; then
        echo -e "${RED}Error: Manager IP is required for worker role${NC}"
        echo "Usage: ./swarm-init.sh worker <MANAGER_IP>"
        exit 1
    fi
    
    echo -e "${GREEN}Joining Docker Swarm as WORKER...${NC}"
    echo -e "${YELLOW}Manager Address: $MANAGER_IP:2377${NC}"
    
    # Check if already in a swarm
    if docker info | grep -q "Swarm: active"; then
        echo -e "${YELLOW}Already part of a Swarm. Leaving current swarm first...${NC}"
        docker swarm leave -f || true
    fi
    
    # Get join token from manager
    echo -e "${YELLOW}Attempting to get join token from manager...${NC}"
    TOKEN=$(curl -s "http://$MANAGER_IP:2375/swarm/join-tokens" 2>/dev/null | grep -o '"Worker":"[^"]*' | cut -d'"' -f4 || echo "")
    
    if [ -z "$TOKEN" ]; then
        echo -e "${RED}Error: Could not retrieve join token from manager${NC}"
        echo "Make sure:"
        echo "  1. Manager is running and reachable at $MANAGER_IP"
        echo "  2. Docker daemon is accessible"
        exit 1
    fi
    
    # Join swarm
    docker swarm join --token "$TOKEN" "$MANAGER_IP:2377"
    
    echo ""
    echo -e "${GREEN}✓ Worker joined Docker Swarm${NC}"
    echo -e "${YELLOW}Manager Address: $MANAGER_IP:2377${NC}"
    
else
    echo -e "${RED}Error: Invalid role '$ROLE'. Must be 'manager' or 'worker'${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Initialization Complete ===${NC}"
