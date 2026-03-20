#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default stack name
STACK_NAME=${STACK_NAME:-ggguide}

print_usage() {
    echo -e "${GREEN}=== Docker Swarm Management Script ===${NC}"
    echo ""
    echo "Usage: ./swarm-manage.sh <command> [options]"
    echo ""
    echo "Commands:"
    echo "  status              Show swarm and stack status"
    echo "  logs <service>      View service logs (e.g., backend, frontend, db)"
    echo "  scale <service> <n> Scale service to n replicas"
    echo "  ps                  List all running tasks"
    echo "  nodes               Show swarm nodes"
    echo "  services            List stack services"
    echo "  inspect <service>   Inspect service details"
    echo "  events              Stream swarm events (Ctrl+C to stop)"
    echo "  health              Check service health"
    echo "  update <service>    Update service (pull new image)"
    echo "  rollback <service>  Rollback service to previous image"
    echo "  remove              Remove stack"
    echo "  prune               Remove unused Docker resources"
    echo ""
    echo "Examples:"
    echo "  ./swarm-manage.sh status"
    echo "  ./swarm-manage.sh logs backend"
    echo "  ./swarm-manage.sh scale backend 3"
    echo "  ./swarm-manage.sh nodes"
}

check_swarm() {
    if ! docker info | grep -q "Swarm: active"; then
        echo -e "${RED}Error: Docker is not part of an active Swarm${NC}"
        exit 1
    fi
}

cmd_status() {
    check_swarm
    echo -e "${BLUE}=== Swarm Status ===${NC}"
    docker info | grep -A 20 "Swarm:"
    echo ""
    
    if docker stack ls | grep -q "$STACK_NAME"; then
        echo -e "${BLUE}=== Stack Status ===${NC}"
        docker stack services "$STACK_NAME"
        echo ""
        echo -e "${BLUE}=== Stack Tasks ===${NC}"
        docker stack ps "$STACK_NAME"
    else
        echo -e "${YELLOW}Stack '$STACK_NAME' not found${NC}"
    fi
}

cmd_logs() {
    check_swarm
    SERVICE=${1:-}
    if [ -z "$SERVICE" ]; then
        echo -e "${RED}Error: Service name required${NC}"
        echo "Usage: ./swarm-manage.sh logs <service>"
        exit 1
    fi
    
    SERVICE_ID=$(docker service ls --filter "name=${STACK_NAME}_${SERVICE}" --quiet)
    if [ -z "$SERVICE_ID" ]; then
        echo -e "${RED}Error: Service '${STACK_NAME}_${SERVICE}' not found${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}Logs for service: ${STACK_NAME}_${SERVICE}${NC}"
    docker service logs -f "${STACK_NAME}_${SERVICE}"
}

cmd_scale() {
    check_swarm
    SERVICE=${1:-}
    REPLICAS=${2:-}
    
    if [ -z "$SERVICE" ] || [ -z "$REPLICAS" ]; then
        echo -e "${RED}Error: Service and replica count required${NC}"
        echo "Usage: ./swarm-manage.sh scale <service> <replicas>"
        exit 1
    fi
    
    if ! [[ "$REPLICAS" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}Error: Replica count must be a number${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Scaling ${STACK_NAME}_${SERVICE} to $REPLICAS replicas...${NC}"
    docker service scale "${STACK_NAME}_${SERVICE}=$REPLICAS"
    echo -e "${GREEN}✓ Scaled successfully${NC}"
}

cmd_ps() {
    check_swarm
    echo -e "${BLUE}=== Running Tasks ===${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo -e "${BLUE}=== Stack Tasks ===${NC}"
    docker stack ps "$STACK_NAME" --format "table {{.Name}}\t{{.Image}}\t{{.Node}}\t{{.DesiredState}}\t{{.CurrentState}}"
}

cmd_nodes() {
    check_swarm
    echo -e "${BLUE}=== Swarm Nodes ===${NC}"
    docker node ls
    echo ""
    echo -e "${BLUE}=== Node Details ===${NC}"
    docker node ls --format "table {{.Hostname}}\t{{.Status}}\t{{.Availability}}\t{{.ManagerStatus}}"
}

cmd_services() {
    check_swarm
    echo -e "${BLUE}=== Stack Services ===${NC}"
    docker stack services "$STACK_NAME" --format "table {{.Name}}\t{{.Replicas}}\t{{.Image}}\t{{.Ports}}"
}

cmd_inspect() {
    check_swarm
    SERVICE=${1:-}
    if [ -z "$SERVICE" ]; then
        echo -e "${RED}Error: Service name required${NC}"
        echo "Usage: ./swarm-manage.sh inspect <service>"
        exit 1
    fi
    
    SERVICE_ID=$(docker service ls --filter "name=${STACK_NAME}_${SERVICE}" --quiet)
    if [ -z "$SERVICE_ID" ]; then
        echo -e "${RED}Error: Service '${STACK_NAME}_${SERVICE}' not found${NC}"
        exit 1
    fi
    
    docker service inspect "${STACK_NAME}_${SERVICE}"
}

cmd_events() {
    check_swarm
    echo -e "${BLUE}=== Swarm Events (Ctrl+C to stop) ===${NC}"
    docker events --filter "type=service" --format "{{.Type}}: {{.Action}} - {{.Actor.Attributes.name}}"
}

cmd_health() {
    check_swarm
    echo -e "${BLUE}=== Service Health Status ===${NC}"
    echo ""
    
    docker stack services "$STACK_NAME" --format "{{.Name}}" | while read -r service; do
        echo -e "${CYAN}$service:${NC}"
        docker stack ps "$STACK_NAME" --filter "service=$service" --format "  {{.Name}}\t{{.DesiredState}}/{{.CurrentState}}"
    done
}

cmd_update() {
    check_swarm
    SERVICE=${1:-}
    if [ -z "$SERVICE" ]; then
        echo -e "${RED}Error: Service name required${NC}"
        echo "Usage: ./swarm-manage.sh update <service>"
        exit 1
    fi
    
    echo -e "${GREEN}Updating service: ${STACK_NAME}_${SERVICE}...${NC}"
    docker service update --force-update "${STACK_NAME}_${SERVICE}"
    echo -e "${GREEN}✓ Update triggered${NC}"
}

cmd_rollback() {
    check_swarm
    SERVICE=${1:-}
    if [ -z "$SERVICE" ]; then
        echo -e "${RED}Error: Service name required${NC}"
        echo "Usage: ./swarm-manage.sh rollback <service>"
        exit 1
    fi
    
    echo -e "${YELLOW}Rolling back service: ${STACK_NAME}_${SERVICE}...${NC}"
    docker service rollback "${STACK_NAME}_${SERVICE}"
    echo -e "${GREEN}✓ Rollback triggered${NC}"
}

cmd_remove() {
    check_swarm
    
    echo -e "${YELLOW}WARNING: This will remove the entire stack!${NC}"
    read -p "Are you sure? Type stack name to confirm: " -r
    if [ "$REPLY" != "$STACK_NAME" ]; then
        echo -e "${YELLOW}Cancelled${NC}"
        exit 0
    fi
    
    echo -e "${RED}Removing stack: $STACK_NAME...${NC}"
    docker stack rm "$STACK_NAME"
    echo -e "${GREEN}✓ Stack removed${NC}"
}

cmd_prune() {
    echo -e "${YELLOW}WARNING: This will remove unused Docker resources!${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Cancelled${NC}"
        exit 0
    fi
    
    echo -e "${GREEN}Pruning Docker resources...${NC}"
    docker system prune -f
    echo -e "${GREEN}✓ Prune complete${NC}"
}

# Main logic
COMMAND=${1:-}

case $COMMAND in
    status)
        cmd_status
        ;;
    logs)
        cmd_logs "$2"
        ;;
    scale)
        cmd_scale "$2" "$3"
        ;;
    ps)
        cmd_ps
        ;;
    nodes)
        cmd_nodes
        ;;
    services)
        cmd_services
        ;;
    inspect)
        cmd_inspect "$2"
        ;;
    events)
        cmd_events
        ;;
    health)
        cmd_health
        ;;
    update)
        cmd_update "$2"
        ;;
    rollback)
        cmd_rollback "$2"
        ;;
    remove)
        cmd_remove
        ;;
    prune)
        cmd_prune
        ;;
    *)
        print_usage
        ;;
esac
