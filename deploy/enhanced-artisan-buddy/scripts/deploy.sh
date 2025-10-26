#!/bin/bash

# Enhanced Artisan Buddy Production Deployment Script
# Requirements: 7.1, 7.2, 7.3

set -e

# Configuration
DEPLOY_DIR="/opt/enhanced-artisan-buddy"
BACKUP_DIR="/opt/backups/enhanced-artisan-buddy"
LOG_FILE="/var/log/enhanced-artisan-buddy-deploy.log"
COMPOSE_FILE="docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if required environment file exists
    if [ ! -f ".env.production" ]; then
        error "Production environment file (.env.production) not found"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR/$(date +'%Y%m%d_%H%M%S')"
    CURRENT_BACKUP="$BACKUP_DIR/$(date +'%Y%m%d_%H%M%S')"
    
    # Backup database
    if docker-compose -f "$COMPOSE_FILE" ps mongodb | grep -q "Up"; then
        log "Backing up MongoDB..."
        docker-compose -f "$COMPOSE_FILE" exec -T mongodb mongodump --out /backup
        docker cp $(docker-compose -f "$COMPOSE_FILE" ps -q mongodb):/backup "$CURRENT_BACKUP/mongodb"
    fi
    
    # Backup Redis
    if docker-compose -f "$COMPOSE_FILE" ps redis | grep -q "Up"; then
        log "Backing up Redis..."
        docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE
        docker cp $(docker-compose -f "$COMPOSE_FILE" ps -q redis):/data/dump.rdb "$CURRENT_BACKUP/redis/"
    fi
    
    # Backup vector database
    if docker-compose -f "$COMPOSE_FILE" ps vector-db | grep -q "Up"; then
        log "Backing up Vector DB..."
        docker cp $(docker-compose -f "$COMPOSE_FILE" ps -q vector-db):/qdrant/storage "$CURRENT_BACKUP/vector-db/"
    fi
    
    # Backup configuration files
    cp -r . "$CURRENT_BACKUP/config"
    
    log "Backup created at $CURRENT_BACKUP"
}

# Health check function
health_check() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1
    
    log "Performing health check for $service..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null; then
            log "$service health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "$service health check failed after $max_attempts attempts"
    return 1
}

# Deploy application
deploy_application() {
    log "Starting deployment..."
    
    # Load environment variables
    export $(cat .env.production | xargs)
    
    # Pull latest images
    log "Pulling latest Docker images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build application image
    log "Building application image..."
    docker-compose -f "$COMPOSE_FILE" build enhanced-artisan-buddy
    
    # Start services
    log "Starting services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    sleep 30
    
    # Perform health checks
    health_check "Enhanced Artisan Buddy" "http://localhost:3000/api/health"
    health_check "Nginx" "http://localhost:80/api/health"
    health_check "Prometheus" "http://localhost:9090/-/healthy"
    health_check "Grafana" "http://localhost:3001/api/health"
    
    log "Deployment completed successfully"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring and alerting..."
    
    # Import Grafana dashboards
    if [ -d "monitoring/grafana/dashboards" ]; then
        log "Importing Grafana dashboards..."
        # Dashboards are automatically imported via provisioning
    fi
    
    # Configure alert rules
    if docker-compose -f "$COMPOSE_FILE" ps prometheus | grep -q "Up"; then
        log "Reloading Prometheus configuration..."
        curl -X POST http://localhost:9090/-/reload
    fi
    
    log "Monitoring setup completed"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    # Create SSL directory if it doesn't exist
    mkdir -p nginx/ssl
    
    # Check if certificates exist
    if [ ! -f "nginx/ssl/cert.pem" ] || [ ! -f "nginx/ssl/key.pem" ]; then
        warning "SSL certificates not found. Generating self-signed certificates for development..."
        
        # Generate self-signed certificate (for development only)
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        warning "Self-signed certificates generated. Replace with proper certificates for production."
    else
        log "SSL certificates found"
    fi
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    # Keep only last 7 days of backups
    find "$BACKUP_DIR" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    
    log "Backup cleanup completed"
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    # Create logrotate configuration
    cat > /etc/logrotate.d/enhanced-artisan-buddy << EOF
/opt/enhanced-artisan-buddy/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
    postrotate
        docker-compose -f $DEPLOY_DIR/$COMPOSE_FILE restart enhanced-artisan-buddy
    endscript
}
EOF
    
    log "Log rotation setup completed"
}

# Main deployment function
main() {
    log "Starting Enhanced Artisan Buddy deployment..."
    
    # Change to deployment directory
    cd "$DEPLOY_DIR" || exit 1
    
    # Run deployment steps
    check_prerequisites
    create_backup
    setup_ssl
    deploy_application
    setup_monitoring
    setup_log_rotation
    cleanup_backups
    
    log "Enhanced Artisan Buddy deployment completed successfully!"
    log "Application is available at: https://localhost"
    log "Monitoring dashboard: http://localhost:3001 (admin/admin)"
    log "Prometheus: http://localhost:9090"
    log "Alertmanager: http://localhost:9093"
}

# Rollback function
rollback() {
    local backup_dir=$1
    
    if [ -z "$backup_dir" ]; then
        error "Backup directory not specified for rollback"
        exit 1
    fi
    
    if [ ! -d "$backup_dir" ]; then
        error "Backup directory $backup_dir does not exist"
        exit 1
    fi
    
    log "Starting rollback to $backup_dir..."
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" down
    
    # Restore configuration
    cp -r "$backup_dir/config/"* .
    
    # Restore databases
    if [ -d "$backup_dir/mongodb" ]; then
        log "Restoring MongoDB..."
        docker-compose -f "$COMPOSE_FILE" up -d mongodb
        sleep 30
        docker cp "$backup_dir/mongodb" $(docker-compose -f "$COMPOSE_FILE" ps -q mongodb):/restore
        docker-compose -f "$COMPOSE_FILE" exec -T mongodb mongorestore /restore
    fi
    
    if [ -f "$backup_dir/redis/dump.rdb" ]; then
        log "Restoring Redis..."
        docker cp "$backup_dir/redis/dump.rdb" $(docker-compose -f "$COMPOSE_FILE" ps -q redis):/data/
        docker-compose -f "$COMPOSE_FILE" restart redis
    fi
    
    # Start all services
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log "Rollback completed"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback "$2"
        ;;
    "backup")
        create_backup
        ;;
    "health-check")
        health_check "Enhanced Artisan Buddy" "http://localhost:3000/api/health"
        ;;
    *)
        echo "Usage: $0 {deploy|rollback <backup_dir>|backup|health-check}"
        exit 1
        ;;
esac