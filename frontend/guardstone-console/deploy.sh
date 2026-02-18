#!/bin/bash
# Guardstone Console - Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="${REGISTRY:-docker.io}"
IMAGE_NAME="${IMAGE_NAME:-guardstone-console}"
NAMESPACE="${NAMESPACE:-default}"
DEPLOYMENT_FILE="${DEPLOYMENT_FILE:-../k8s/deployment.yaml}"

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  build          Build Docker image"
    echo "  push           Push Docker image to registry"
    echo "  deploy-k8s     Deploy to Kubernetes using manifests"
    echo "  deploy-helm    Deploy to Kubernetes using Helm"
    echo "  status         Check deployment status"
    echo "  logs           View application logs"
    echo "  rollback       Rollback to previous version"
    echo "  scale          Scale deployment replicas"
    echo "  cleanup        Remove deployment"
    echo ""
    echo "Options:"
    echo "  --registry     Container registry (default: docker.io)"
    echo "  --image        Image name (default: guardstone-console)"
    echo "  --tag          Image tag (default: latest)"
    echo "  --namespace    Kubernetes namespace (default: default)"
    echo "  --replicas     Number of replicas (for scale command)"
    echo ""
}

# Parse arguments
COMMAND="${1:-}"
TAG="${2:-latest}"

case "$COMMAND" in
    build)
        print_header "Building Docker Image"
        echo "Image: $REGISTRY/$IMAGE_NAME:$TAG"
        docker build -t "$REGISTRY/$IMAGE_NAME:$TAG" \
                     -t "$REGISTRY/$IMAGE_NAME:latest" .
        print_success "Docker image built successfully"
        ;;
    
    push)
        print_header "Pushing Docker Image to Registry"
        echo "Registry: $REGISTRY"
        echo "Image: $IMAGE_NAME:$TAG"
        docker push "$REGISTRY/$IMAGE_NAME:$TAG"
        docker push "$REGISTRY/$IMAGE_NAME:latest"
        print_success "Docker image pushed successfully"
        ;;
    
    deploy-k8s)
        print_header "Deploying to Kubernetes"
        echo "Namespace: $NAMESPACE"
        
        # Create namespace if it doesn't exist
        kubectl get namespace "$NAMESPACE" > /dev/null 2>&1 || \
            kubectl create namespace "$NAMESPACE"
        
        # Apply manifests
        kubectl apply -f "$DEPLOYMENT_FILE" -n "$NAMESPACE"
        print_success "Kubernetes manifests applied"
        
        # Wait for rollout
        echo "Waiting for deployment to rollout..."
        kubectl rollout status deployment/guardstone-console -n "$NAMESPACE"
        print_success "Deployment rolled out successfully"
        ;;
    
    deploy-helm)
        print_header "Deploying to Kubernetes with Helm"
        echo "Namespace: $NAMESPACE"
        
        # Check if Helm chart exists
        if [ ! -f "helm/Chart.yaml" ]; then
            print_error "Helm chart not found at helm/Chart.yaml"
            exit 1
        fi
        
        # Create namespace if it doesn't exist
        kubectl get namespace "$NAMESPACE" > /dev/null 2>&1 || \
            kubectl create namespace "$NAMESPACE"
        
        # Check if release exists
        if helm list -n "$NAMESPACE" | grep -q "guardstone-console"; then
            echo "Release already exists, upgrading..."
            helm upgrade guardstone-console ./helm \
                --namespace "$NAMESPACE"
        else
            echo "Creating new release..."
            helm install guardstone-console ./helm \
                --namespace "$NAMESPACE" \
                --create-namespace
        fi
        
        print_success "Helm deployment completed"
        ;;
    
    status)
        print_header "Deployment Status"
        echo "Namespace: $NAMESPACE"
        echo ""
        echo "Pods:"
        kubectl get pods -n "$NAMESPACE" -l app=guardstone-console
        echo ""
        echo "Services:"
        kubectl get svc -n "$NAMESPACE" -l app=guardstone-console
        echo ""
        echo "Deployment:"
        kubectl get deployment -n "$NAMESPACE" -l app=guardstone-console
        echo ""
        echo "HPA:"
        kubectl get hpa -n "$NAMESPACE" -l app=guardstone-console || echo "No HPA found"
        ;;
    
    logs)
        print_header "Application Logs"
        kubectl logs deployment/guardstone-console -n "$NAMESPACE" -f
        ;;
    
    rollback)
        print_header "Rolling Back Deployment"
        echo "Rolling back to previous version..."
        kubectl rollout undo deployment/guardstone-console -n "$NAMESPACE"
        kubectl rollout status deployment/guardstone-console -n "$NAMESPACE"
        print_success "Deployment rolled back successfully"
        ;;
    
    scale)
        REPLICAS="${3:-3}"
        print_header "Scaling Deployment"
        echo "Scaling to $REPLICAS replicas..."
        kubectl scale deployment guardstone-console \
            --replicas="$REPLICAS" \
            -n "$NAMESPACE"
        print_success "Deployment scaled to $REPLICAS replicas"
        ;;
    
    cleanup)
        print_header "Cleaning Up Deployment"
        read -p "Are you sure you want to remove the deployment? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kubectl delete deployment guardstone-console -n "$NAMESPACE"
            kubectl delete svc guardstone-console -n "$NAMESPACE"
            kubectl delete ingress guardstone-console -n "$NAMESPACE"
            print_success "Deployment cleaned up successfully"
        else
            print_warning "Cleanup cancelled"
        fi
        ;;
    
    *)
        print_error "Unknown command: $COMMAND"
        echo ""
        usage
        exit 1
        ;;
esac
