@echo off
REM Guardstone Console - Windows Deployment Script

setlocal enabledelayedexpansion

REM Configuration
set REGISTRY=docker.io
set IMAGE_NAME=guardstone-console
set NAMESPACE=default
set TAG=%2

if "%TAG%"=="" set TAG=latest

REM Colors (using ANSI, requires Windows 10 build 16257+)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Functions
:print_header
echo.
echo %BLUE%========================================%NC%
echo %BLUE%%~1%NC%
echo %BLUE%========================================%NC%
exit /b

:print_success
echo %GREEN%[OK] %~1%NC%
exit /b

:print_error
echo %RED%[ERROR] %~1%NC%
exit /b

:usage
echo Usage: %0 ^<command^> [options]
echo.
echo Commands:
echo   build          Build Docker image
echo   push           Push Docker image to registry
echo   run-docker     Run with Docker Compose
echo   deploy-k8s     Deploy to Kubernetes using manifests
echo   deploy-helm    Deploy to Kubernetes using Helm
echo   status         Check deployment status
echo   logs           View application logs
echo   cleanup        Remove deployment
echo.
echo Options:
echo   install-deps   Install Node.js dependencies
echo   build-only     Build Next.js application only
echo.
exit /b 1

REM Main logic
set "COMMAND=%1"

if "%COMMAND%"=="" (
    call :usage
    exit /b 1
)

if /i "%COMMAND%"=="build" goto build
if /i "%COMMAND%"=="push" goto push
if /i "%COMMAND%"=="run-docker" goto run_docker
if /i "%COMMAND%"=="deploy-k8s" goto deploy_k8s
if /i "%COMMAND%"=="deploy-helm" goto deploy_helm
if /i "%COMMAND%"=="status" goto status
if /i "%COMMAND%"=="logs" goto logs
if /i "%COMMAND%"=="cleanup" goto cleanup
if /i "%COMMAND%"=="install-deps" goto install_deps
if /i "%COMMAND%"=="build-only" goto build_only
goto unknown

:build
call :print_header "Building Docker Image"
echo Image: %REGISTRY%/%IMAGE_NAME%:%TAG%
docker build -t %REGISTRY%/%IMAGE_NAME%:%TAG% -t %REGISTRY%/%IMAGE_NAME%:latest .
if %ERRORLEVEL% EQU 0 (
    call :print_success "Docker image built successfully"
) else (
    call :print_error "Failed to build Docker image"
    exit /b 1
)
goto end

:push
call :print_header "Pushing Docker Image to Registry"
echo Registry: %REGISTRY%
echo Image: %IMAGE_NAME%:%TAG%
docker push %REGISTRY%/%IMAGE_NAME%:%TAG%
docker push %REGISTRY%/%IMAGE_NAME%:latest
if %ERRORLEVEL% EQU 0 (
    call :print_success "Docker image pushed successfully"
) else (
    call :print_error "Failed to push Docker image"
    exit /b 1
)
goto end

:run_docker
call :print_header "Running with Docker Compose"
docker compose up -d
if %ERRORLEVEL% EQU 0 (
    call :print_success "Docker Compose services started"
    echo.
    echo Access the application at:
    echo   Development: http://localhost:3000
    echo   Production:  http://localhost:3001
) else (
    call :print_error "Failed to start Docker Compose services"
    exit /b 1
)
goto end

:deploy_k8s
call :print_header "Deploying to Kubernetes"
echo Namespace: %NAMESPACE%
kubectl create namespace %NAMESPACE% 2>nul
kubectl apply -f ..\k8s\configmap.yaml -n %NAMESPACE%
kubectl apply -f ..\k8s\deployment.yaml -n %NAMESPACE%
kubectl apply -f ..\k8s\service.yaml -n %NAMESPACE%
kubectl apply -f ..\k8s\ingress.yaml -n %NAMESPACE%
kubectl apply -f ..\k8s\hpa.yaml -n %NAMESPACE%
if %ERRORLEVEL% EQU 0 (
    call :print_success "Kubernetes manifests applied"
    echo.
    echo Waiting for deployment to rollout...
    kubectl rollout status deployment/guardstone-console -n %NAMESPACE%
) else (
    call :print_error "Failed to apply Kubernetes manifests"
    exit /b 1
)
goto end

:deploy_helm
call :print_header "Deploying to Kubernetes with Helm"
echo Namespace: %NAMESPACE%

if not exist "helm\Chart.yaml" (
    call :print_error "Helm chart not found at helm\Chart.yaml"
    exit /b 1
)

kubectl create namespace %NAMESPACE% 2>nul

REM Check if release exists
helm list -n %NAMESPACE% 2>nul | find "guardstone-console" >nul
if %ERRORLEVEL% EQU 0 (
    echo Release already exists, upgrading...
    helm upgrade guardstone-console .\helm --namespace %NAMESPACE%
) else (
    echo Creating new release...
    helm install guardstone-console .\helm --namespace %NAMESPACE% --create-namespace
)

if %ERRORLEVEL% EQU 0 (
    call :print_success "Helm deployment completed"
) else (
    call :print_error "Failed to deploy with Helm"
    exit /b 1
)
goto end

:status
call :print_header "Deployment Status"
echo Namespace: %NAMESPACE%
echo.
echo Pods:
kubectl get pods -n %NAMESPACE% -l app=guardstone-console
echo.
echo Services:
kubectl get svc -n %NAMESPACE% -l app=guardstone-console
echo.
echo Deployment:
kubectl get deployment -n %NAMESPACE% -l app=guardstone-console
goto end

:logs
call :print_header "Application Logs"
kubectl logs deployment/guardstone-console -n %NAMESPACE% -f
goto end

:cleanup
call :print_header "Cleaning Up Deployment"
set /p CONFIRM="Are you sure you want to remove the deployment? (y/N): "
if /i "%CONFIRM%"=="y" (
    kubectl delete deployment guardstone-console -n %NAMESPACE%
    kubectl delete svc guardstone-console -n %NAMESPACE%
    kubectl delete ingress guardstone-console -n %NAMESPACE%
    call :print_success "Deployment cleaned up successfully"
) else (
    echo Cleanup cancelled
)
goto end

:install_deps
call :print_header "Installing Node.js Dependencies"
echo Installing npm packages...
call npm install
if %ERRORLEVEL% EQU 0 (
    call :print_success "Dependencies installed successfully"
) else (
    call :print_error "Failed to install dependencies"
    exit /b 1
)
goto end

:build_only
call :print_header "Building Next.js Application"
echo Building application...
call npm run build
if %ERRORLEVEL% EQU 0 (
    call :print_success "Application built successfully"
) else (
    call :print_error "Failed to build application"
    exit /b 1
)
goto end

:unknown
call :print_error "Unknown command: %COMMAND%"
echo.
call :usage
exit /b 1

:end
echo.
exit /b 0
