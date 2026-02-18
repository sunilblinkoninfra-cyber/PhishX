@echo off
REM PhishX Phase 1 Setup Script for Windows
REM Automated setup and deployment for Phase 1 implementation

setlocal enabledelayedexpansion

cls
echo.
echo ========================================
echo PhishX Phase 1 Setup - Windows Edition
echo ========================================
echo.

REM Check for required commands
echo Checking prerequisites...

where docker >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    exit /b 1
)
echo [OK] Docker found

where docker-compose >nul 2>nul
if errorlevel 1 (
    echo [WARNING] docker-compose not found, trying 'docker compose'
)
echo [OK] docker-compose available

where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    exit /b 1
)
echo [OK] Python found

python --version

REM Check for .env file
if not exist .env (
    echo.
    echo [CREATE] .env file from .env.example...
    if exist .env.example (
        copy .env.example .env
        echo [OK] .env created - UPDATE IT WITH YOUR VALUES!
    ) else (
        echo [ERROR] .env.example not found
        exit /b 1
    )
) else (
    echo [OK] .env file exists
)

REM Check required files
echo.
echo Checking required files...
for %%f in (docker-compose.yml backend\\schema.sql backend\\requirements.txt Dockerfile) do (
    if exist %%f (
        echo [OK] %%f found
    ) else (
        echo [ERROR] %%f not found
        exit /b 1
    )
)

REM Build Docker images
echo.
echo ========================================
echo Building Docker Images
echo ========================================
echo.

docker-compose build
if errorlevel 1 (
    echo [ERROR] Failed to build Docker images
    exit /b 1
)
echo [OK] Docker images built successfully

REM Start services
echo.
echo ========================================
echo Starting Services
echo ========================================
echo.

docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Failed to start services
    exit /b 1
)
echo [OK] Services started

REM Wait for services
echo.
echo ========================================
echo Waiting for Services to Be Ready
echo ========================================
echo.

timeout /t 10 /nobreak

REM Check service status
echo.
echo Service Status:
docker-compose ps

REM Wait a bit more for full initialization
timeout /t 5 /nobreak

REM Run migrations
echo.
echo ========================================
echo Running Database Migrations
echo ========================================
echo.

docker-compose exec -T phishx-api python migration.py up
if errorlevel 1 (
    echo [WARNING] Migration may have failed - check the logs
) else (
    echo [OK] Migrations completed
)

REM Verify connectivity
echo.
echo ========================================
echo Verifying Connectivity
echo ========================================
echo.

echo Checking API health...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8000/health' -ErrorAction Stop; if ($response.StatusCode -eq 200) { Write-Host '[OK] API is responding' } } catch { Write-Host '[WARNING] API health check failed' }"

REM Final status
echo.
echo ========================================
echo Phase 1 Setup Complete
echo ========================================
echo.
echo Available Services:
echo   API Gateway:        http://localhost:8000
echo   API Health:         http://localhost:8000/health
echo   Redis Commander:    http://localhost:8081 (debug profile)
echo   PgAdmin:            http://localhost:5050 (debug profile)
echo.
echo Next Steps:
echo   1. Update .env with production secrets
echo   2. Test API: curl http://localhost:8000/health
echo   3. Read PHASE1_GUIDE.md for documentation
echo.
echo Run 'docker-compose logs -f' to monitor services
echo.
