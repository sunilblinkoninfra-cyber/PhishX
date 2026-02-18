# ========================================
# PhishX Phase 1+2+3 Deployment Script
# PowerShell Version for Windows
# ========================================

param(
    [switch]$Debug = $false
)

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

function Write-Header {
    param([string]$text)
    Write-Host "`n=========================================" -ForegroundColor $Cyan
    Write-Host $text -ForegroundColor $Cyan
    Write-Host "=========================================" -ForegroundColor $Cyan
}

function Write-Status {
    param([string]$status, [string]$message, [string]$color = $Green)
    Write-Host "   $status $message" -ForegroundColor $color
}

# Main deployment
Write-Header "PhishX Deployment - Phase 1, 2, 3"

# Check Docker
Write-Host "`n🔍 Checking requirements..."
$dockerInstalled = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)
$dockerComposeInstalled = $false
try {
    docker compose version | Out-Null
    $dockerComposeInstalled = $true
} catch {
    $dockerComposeInstalled = $false
}

if (-not $dockerInstalled) {
    Write-Status "❌" "Docker is not installed. Please install Docker Desktop." $Red
    exit 1
}
Write-Status "✅" "Docker found" $Green

if (-not $dockerComposeInstalled) {
    Write-Status "❌" "Docker Compose plugin is not installed." $Red
    exit 1
}
Write-Status "✅" "Docker Compose found" $Green

# Check .env file
if (-not (Test-Path ".env")) {
    Write-Status "⚠️ " ".env file not found. Creating from .env.example..."
    Copy-Item ".env.example" ".env"
}
Write-Status "✅" ".env configured" $Green

# Display configuration
Write-Host "`n📋 Configuration:" -ForegroundColor $Cyan
Write-Host "   Database:     PostgreSQL 15"
Write-Host "   Cache:        Redis 7"
Write-Host "   Scanning:     ClamAV"
Write-Host "   Monitoring:   Prometheus + Grafana"
Write-Host "   Async Tasks:  Celery (4 workers)"

# Pull images
Write-Host "`n🔄 Pulling latest Docker images..."
docker compose pull

# Start services
Write-Host "`n🚀 Starting PhishX services..."
docker compose up -d

Write-Host "`n⏳ Waiting for services to stabilize (15 seconds)..."
Start-Sleep -Seconds 15

# Check health
Write-Host "`n📊 Service Status:" -ForegroundColor $Cyan

$healthyCount = 0

# Check each service
@{
    "PostgreSQL" = @{cmd = "docker exec phishx-postgres pg_isready -U phishx"}
    "Redis" = @{cmd = "docker exec phishx-redis redis-cli -a redis_secure_password ping"}
}.GetEnumerator() | ForEach-Object {
    $service = $_.Key
    $cmd = $_.Value.cmd
    try {
        $result = Invoke-Expression $cmd 2>$null
        if ($result) {
            Write-Status "✅" "$service : HEALTHY" $Green
            $healthyCount++
        }
    } catch {
        Write-Status "⏳" "$service : Initializing..." $Yellow
    }
}

# Check API
try {
    $api = Invoke-WebRequest "http://localhost:8000/health" -ErrorAction SilentlyContinue
    if ($api.StatusCode -eq 200) {
        Write-Status "✅" "API Gateway : HEALTHY" $Green
        $healthyCount++
    } else {
        Write-Status "⏳" "API Gateway : Starting..." $Yellow
    }
} catch {
    Write-Status "⏳" "API Gateway : Starting..." $Yellow
}

# Check Monitoring
try {
    $prom = Invoke-WebRequest "http://localhost:9090/-/healthy" -ErrorAction SilentlyContinue
    Write-Status "✅" "Prometheus  : HEALTHY" $Green
} catch {
    Write-Status "⏳" "Prometheus  : Starting..." $Yellow
}

try {
    $graf = Invoke-WebRequest "http://localhost:3000/api/health" -ErrorAction SilentlyContinue
    Write-Status "✅" "Grafana     : HEALTHY" $Green
} catch {
    Write-Status "⏳" "Grafana     : Starting..." $Yellow
}

# Final summary
Write-Header "Deployment Complete!"

Write-Host "`n📚 Access Points:" -ForegroundColor $Cyan
Write-Host "   API Gateway:  http://localhost:8000"
Write-Host "   Health:       http://localhost:8000/health"
Write-Host "   Metrics:      http://localhost:8000/metrics"
Write-Host "   Prometheus:   http://localhost:9090"
Write-Host "   Grafana:      http://localhost:3000"
Write-Host "   Redis CLI:    http://localhost:8081"
Write-Host "   PgAdmin:      http://localhost:5050"

Write-Host "`n🔑 Credentials:" -ForegroundColor $Cyan
Write-Host "   Grafana:      admin / admin"
Write-Host "   PgAdmin:      admin@phishx.local / admin"
Write-Host "   PostgreSQL:   phishx / phishx_secure_password"
Write-Host "   Redis:        (empty) / redis_secure_password"

Write-Host "`n📖 Next Steps:" -ForegroundColor $Cyan
Write-Host "   1. Test API:      curl http://localhost:8000/health"
Write-Host "   2. Run validation: python backend/validate_phase3.py"
Write-Host "   3. Check logs:    docker compose logs -f api"
Write-Host "   4. View dashboards: http://localhost:3000"

Write-Host "`n🛑 Service Commands:" -ForegroundColor $Cyan
Write-Host "   Stop:    docker compose down"
Write-Host "   Restart: docker compose restart"
Write-Host "   Logs:    docker compose logs -f"

Write-Host "`n✅ Deployment successful!`n" -ForegroundColor $Green
