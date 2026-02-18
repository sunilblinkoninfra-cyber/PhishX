#!/bin/bash
# ========================================
# PhishX Phase 1+2+3 Deployment Script
# ========================================

set -e

echo "========================================="
echo "PhishX Deployment - Phase 1, 2, 3"
echo "========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose plugin is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose found"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📝 Please update .env with your configuration"
    echo ""
fi

# Display important configuration info
echo "📋 Configuration:"
echo "   Database: PostgreSQL 15"
echo "   Cache: Redis 7"
echo "   Malware Scanning: ClamAV"
echo "   Monitoring: Prometheus + Grafana"
echo "   Async Tasks: Celery (4 workers)"
echo ""

# Pull latest images
echo "🔄 Pulling latest images..."
docker compose pull

echo ""
echo "🚀 Starting PhishX services..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo ""
echo "📊 Service Status:"

# Check database
if docker exec phishx-postgres pg_isready -U phishx > /dev/null 2>&1; then
    echo "   ✅ PostgreSQL: HEALTHY"
else
    echo "   ❌ PostgreSQL: UNHEALTHY"
fi

# Check Redis
if docker exec phishx-redis redis-cli -a redis_secure_password ping > /dev/null 2>&1; then
    echo "   ✅ Redis: HEALTHY"
else
    echo "   ❌ Redis: UNHEALTHY"
fi

# Check ClamAV
if nc -z localhost 3310 > /dev/null 2>&1; then
    echo "   ✅ ClamAV: HEALTHY"
else
    echo "   ⚠️  ClamAV: Initializing..."
fi

# Check API health (give it time to start)
sleep 15
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✅ API Gateway: HEALTHY"
else
    echo "   ⏳ API Gateway: Starting..."
fi

# Check Prometheus
if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo "   ✅ Prometheus: HEALTHY"
else
    echo "   ⏳ Prometheus: Starting..."
fi

# Check Grafana
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "   ✅ Grafana: HEALTHY"
else
    echo "   ⏳ Grafana: Starting..."
fi

echo ""
echo "========================================="
echo "🎉 Deployment Complete!"
echo "========================================="
echo ""
echo "📚 Access Points:"
echo "   API:         http://localhost:8000"
echo "   Health:      http://localhost:8000/health"
echo "   Metrics:     http://localhost:8000/metrics"
echo "   Prometheus:  http://localhost:9090"
echo "   Grafana:     http://localhost:3000"
echo "   Redis CLI:   http://localhost:8081 (debug mode)"
echo "   PgAdmin:     http://localhost:5050 (debug mode)"
echo ""
echo "🔑 Default Credentials:"
echo "   Grafana:     admin / admin"
echo "   PgAdmin:     admin@phishx.local / admin"
echo "   PostgreSQL:  phishx / phishx_secure_password"
echo "   Redis:       (empty) / redis_secure_password"
echo ""
echo "📖 Next Steps:"
echo "   1. Test API: curl http://localhost:8000/health"
echo "   2. Run validation: python backend/validate_phase3.py"
echo "   3. Check logs: docker compose logs -f api"
echo "   4. View dashboards: http://localhost:3000"
echo ""
echo "🛑 To stop services: docker compose down"
echo "🚀 To restart: docker compose restart"
echo ""
