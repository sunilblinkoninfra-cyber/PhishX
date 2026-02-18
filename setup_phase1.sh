#!/bin/bash

# PhishX Phase 1 Setup Script
# Automated setup and deployment for Phase 1 implementation

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ Error: $1${NC}"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
    fi
}

# ========================================
# Pre-flight Checks
# ========================================

print_header "PhishX Phase 1 Setup - Pre-flight Checks"

echo "Checking dependencies..."
check_command docker
check_command docker-compose
print_success "Docker and Docker Compose installed"

check_command python
python_version=$(python --version | awk '{print $2}')
print_success "Python $python_version installed"

# Check if .env exists
if [ ! -f .env ]; then
    print_warning ".env file not found"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    print_success ".env created (UPDATE IT WITH YOUR VALUES!)"
else
    print_success ".env file exists"
fi

# ========================================
# Pre-deployment Setup
# ========================================

print_header "PhishX Phase 1 Setup - Pre-deployment"

echo "Checking for required files..."
required_files=("docker-compose.yml" "backend/schema.sql" "backend/requirements.txt" "Dockerfile")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "$file found"
    else
        print_error "$file not found. Make sure you're in the PhishX root directory."
    fi
done

# ========================================
# Docker Build & Startup
# ========================================

print_header "PhishX Phase 1 Setup - Building & Starting Services"

echo "Building Docker images (this may take several minutes)..."
if docker-compose build --no-cache; then
    print_success "Docker images built successfully"
else
    print_error "Failed to build Docker images"
fi

echo "Starting services..."
if docker-compose up -d; then
    print_success "Services started"
else
    print_error "Failed to start services"
fi

# ========================================
# Health Checks
# ========================================

print_header "PhishX Phase 1 Setup - Waiting for Services"

# Function to check service health
check_service_health() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    echo "Checking $service health..."
    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec -T $service pg_isready -U phishx &> /dev/null 2>&1 || \
           docker-compose exec -T $service redis-cli ping &> /dev/null 2>&1 || \
           docker-compose ps $service | grep -q "healthy\|running"; then
            print_success "$service is healthy"
            return 0
        fi
        
        echo -ne "\rAttempt $attempt/$max_attempts... "
        sleep 2
        ((attempt++))
    done
    
    print_warning "$service took too long to become healthy"
    return 1
}

check_service_health "postgres"
check_service_health "redis"
check_service_health "clamav"

# Wait a bit more for API to be ready
echo "Waiting for API to be ready..."
sleep 5

# ========================================
# Database Setup
# ========================================

print_header "PhishX Phase 1 Setup - Database Setup"

echo "Running database migrations..."
if docker-compose exec -T phishx-api python migration.py up; then
    print_success "Database migrations completed"
else
    print_error "Failed to run migrations"
fi

# ========================================
# Verification
# ========================================

print_header "PhishX Phase 1 Setup - Verification"

echo "Verifying API health..."
if curl -s http://localhost:8000/health | grep -q "ok"; then
    print_success "API is responding to health checks"
else
    print_warning "API health check failed. It may still be starting up."
fi

echo "Checking database connectivity..."
if docker-compose exec -T phishx-api python -c "from db import get_db; get_db()" &> /dev/null; then
    print_success "Database connectivity verified"
else
    print_error "Failed to connect to database"
fi

echo "Checking Redis connectivity..."
if docker-compose exec -T phishx-redis redis-cli -a redis_secure_password ping &> /dev/null; then
    print_success "Redis connectivity verified"
else
    print_error "Failed to connect to Redis"
fi

# ========================================
# Final Status Report
# ========================================

print_header "PhishX Phase 1 Setup - Status Report"

echo "Service Status:"
docker-compose ps --services | while read service; do
    status=$(docker-compose ps $service --format "{{.State}}" 2>/dev/null || echo "unknown")
    printf "  %-30s %s\n" "$service" "$status"
done

print_success "All Phase 1 components are ready!"

echo -e "\n${BLUE}Available Services:${NC}"
echo "  API Gateway:        http://localhost:8000"
echo "  API Health:         http://localhost:8000/health"
echo "  Redis Commander:    http://localhost:8081 (debug profile only)"
echo "  PgAdmin:            http://localhost:5050 (debug profile only)"

echo -e "\n${BLUE}Next Steps:${NC}"
echo "  1. Update .env with production secrets (API_KEY, SECRET_KEY)"
echo "  2. Test the API:"
echo ""
echo "     curl -X GET http://localhost:8000/health"
echo ""
echo "  3. Read PHASE1_GUIDE.md for detailed documentation"
echo ""

echo -e "\n${GREEN}Phase 1 setup complete!${NC}"
echo ""
