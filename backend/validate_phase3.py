#!/usr/bin/env python3
"""
Phase 3 Integration Validation Script

Tests all Phase 3 components to ensure integration is complete.
Run after deploying Phase 3 to verify everything is working.
"""

import os
import sys
import subprocess
import json
import time
from pathlib import Path

# Project paths
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

# ANSI color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


def print_header(text):
    """Print section header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text:^60}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")


def print_test(name, passed, details=""):
    """Print test result"""
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"  {status} {name}", end="")
    if details:
        print(f" ({details})", end="")
    print()


def test_imports():
    """Test that all Phase 3 modules can be imported"""
    print_header("Testing Phase 3 Module Imports")
    
    modules = [
        ("auth_integration", "JWT authentication"),
        ("encryption_integration", "Database encryption"),
        ("anomaly_integration", "Anomaly detection"),
        ("shadow_integration", "Shadow models"),
        ("jwt_auth", "JWT token management"),
        ("db_encryption", "Field encryption"),
        ("anomaly_detection", "Anomaly detection engine"),
        ("shadow_models", "Shadow model framework"),
    ]
    
    all_passed = True
    
    for module_name, description in modules:
        try:
            __import__(module_name)
            print_test(f"Import {module_name}", True, description)
        except ImportError as e:
            print_test(f"Import {module_name}", False, str(e))
            all_passed = False
    
    return all_passed


def test_environment():
    """Test environment variables are configured"""
    print_header("Testing Environment Configuration")
    
    required_vars = ["DATABASE_URL", "REDIS_URL", "CELERY_BROKER_URL"]
    phase3_vars = [
        "JWT_SECRET_KEY",
        "ENCRYPTION_MASTER_KEY",
    ]
    
    all_passed = True
    
    # Check required variables
    print("Required Variables:")
    for var in required_vars:
        value = os.getenv(var, "")
        is_set = bool(value) and value != ""
        print_test(f"{var}", is_set, "configured" if is_set else "missing")
        if not is_set:
            all_passed = False
    
    # Check Phase 3 variables (optional but show status)
    print("\nPhase 3 Variables (Optional):")
    for var in phase3_vars:
        value = os.getenv(var, "")
        is_set = bool(value) and value != ""
        details = "configured" if is_set else "not set (use defaults)"
        print_test(f"{var}", True, details)
    
    return all_passed


def test_file_structure():
    """Test that all expected files exist"""
    print_header("Testing File Structure")
    
    files = [
        ("app_new.py", BASE_DIR / "app_new.py"),
        ("tasks.py", BASE_DIR / "tasks.py"),
        ("db.py", BASE_DIR / "db.py"),
        ("auth_integration.py", BASE_DIR / "auth_integration.py"),
        ("encryption_integration.py", BASE_DIR / "encryption_integration.py"),
        ("anomaly_integration.py", BASE_DIR / "anomaly_integration.py"),
        ("shadow_integration.py", BASE_DIR / "shadow_integration.py"),
        ("jwt_auth.py", BASE_DIR / "jwt_auth.py"),
        ("db_encryption.py", BASE_DIR / "db_encryption.py"),
        ("anomaly_detection.py", BASE_DIR / "anomaly_detection.py"),
        ("shadow_models.py", BASE_DIR / "shadow_models.py"),
        (".env.example", ROOT_DIR / ".env.example"),
        ("PHASE3_GUIDE.md", BASE_DIR / "docs/PHASE3_GUIDE.md"),
        ("PHASE3_COMPLETE.md", BASE_DIR / "docs/PHASE3_COMPLETE.md"),
        ("PHASE3_INTEGRATION.md", BASE_DIR / "docs/PHASE3_INTEGRATION.md"),
    ]
    
    all_passed = True
    
    for display_name, file_path in files:
        exists = file_path.exists()
        print_test(f"File {display_name}", exists)
        if not exists:
            all_passed = False
    
    return all_passed


def test_app_syntax():
    """Test that Python files have correct syntax"""
    print_header("Testing Python Syntax")
    
    python_files = [
        "app_new.py",
        "tasks.py",
        "db.py",
        "auth_integration.py",
        "encryption_integration.py",
        "anomaly_integration.py",
        "shadow_integration.py",
    ]
    
    all_passed = True
    
    for filename in python_files:
        try:
            result = subprocess.run(
                [sys.executable, "-m", "py_compile", filename],
                capture_output=True,
                timeout=10,
                cwd=BASE_DIR,
            )
            passed = result.returncode == 0
            print_test(f"Syntax {filename}", passed)
            if not passed:
                print(f"    Error: {result.stderr.decode()}")
                all_passed = False
        except Exception as e:
            print_test(f"Syntax {filename}", False, str(e))
            all_passed = False
    
    return all_passed


def test_docker_setup():
    """Test docker-compose configuration"""
    print_header("Testing Docker Setup")
    
    try:
        # Check if docker-compose.yml exists and is valid
        result = subprocess.run(
            ["docker", "compose", "config"],
            capture_output=True,
            timeout=10,
            cwd=ROOT_DIR,
        )
        
        config_valid = result.returncode == 0
        print_test("Docker-compose config valid", config_valid)
        
        if not config_valid:
            print(f"    Error: {result.stderr.decode()}")
        
        return config_valid
    
    except Exception as e:
        print_test("Docker-compose available", False, str(e))
        return False


def test_dependencies():
    """Test that required Python packages are installed"""
    print_header("Testing Dependencies")
    
    packages = [
        ("fastapi", "FastAPI web framework"),
        ("celery", "Celery task queue"),
        ("redis", "Redis client"),
        ("psycopg2", "PostgreSQL driver"),
        ("pydantic", "Pydantic validation"),
        ("jwt", "PyJWT"),
        ("cryptography", "Cryptography library"),
        ("passlib", "Passlib password hashing"),
    ]
    
    all_passed = True
    
    for package, description in packages:
        try:
            __import__(package)
            print_test(f"Package {package}", True, description)
        except ImportError:
            print_test(f"Package {package}", False, description)
            all_passed = False
    
    return all_passed


def test_endpoints():
    """Test that new Phase 3 endpoints exist in code"""
    print_header("Testing Phase 3 Endpoints")
    
    endpoints = [
        ("/auth/login", "JWT login endpoint"),
        ("/auth/refresh", "JWT refresh endpoint"),
        ("/auth/logout", "JWT logout endpoint"),
        ("/anomalies/stats", "Anomaly statistics"),
        ("/experiments/active", "Shadow experiments"),
        ("/deployments/canary", "Canary deployments"),
    ]
    
    all_passed = True
    
    # Read app_new.py and check for endpoints
    try:
        with open(BASE_DIR / "app_new.py", "r") as f:
            content = f.read()
        
        for endpoint, description in endpoints:
            found = endpoint in content
            print_test(f"Endpoint {endpoint}", found, description)
            if not found:
                all_passed = False
    
    except Exception as e:
        print_test("Read app_new.py", False, str(e))
        all_passed = False
    
    return all_passed


def test_integration_bridges():
    """Test integration bridge modules"""
    print_header("Testing Integration Bridges")
    
    bridges = {
        "auth_integration": [
            "get_current_user",
            "require_scope",
            "create_jwt_tokens",
        ],
        "encryption_integration": [
            "encrypt_row",
            "decrypt_row",
            "EncryptionSettings",
        ],
        "anomaly_integration": [
            "detect_anomalies",
            "should_escalate_anomaly",
            "get_anomaly_engine",
        ],
        "shadow_integration": [
            "create_shadow_experiment",
            "record_model_predictions",
            "start_canary_deployment",
        ],
    }
    
    all_passed = True
    
    for module_name, functions in bridges.items():
        try:
            module = __import__(module_name)
            for func_name in functions:
                has_func = hasattr(module, func_name)
                details = f"{module_name}.{func_name}"
                print_test(f"Function {func_name}", has_func, module_name)
                if not has_func:
                    all_passed = False
        except ImportError as e:
            print_test(f"Module {module_name}", False, str(e))
            all_passed = False
    
    return all_passed


def test_process_email_integration():
    """Test that anomaly detection integrated into process_email"""
    print_header("Testing process_email Integration")
    
    try:
        with open(BASE_DIR / "tasks.py", "r") as f:
            content = f.read()
        
        checks = [
            ("ANOMALY_DETECTION_AVAILABLE", "Anomaly detection import"),
            ("detect_anomalies(", "Anomaly detection call"),
            ("should_escalate_anomaly(", "Anomaly escalation check"),
            ("handle_anomaly_alert(", "Anomaly alert handling"),
        ]
        
        all_passed = True
        for check_str, description in checks:
            found = check_str in content
            print_test(description, found)
            if not found:
                all_passed = False
        
        return all_passed
    
    except Exception as e:
        print_test("Read tasks.py", False, str(e))
        return False


def test_database_encryption():
    """Test database encryption integration in db.py"""
    print_header("Testing Database Encryption Integration")
    
    try:
        with open(BASE_DIR / "db.py", "r") as f:
            content = f.read()
        
        checks = [
            ("ENCRYPTION_AVAILABLE", "Encryption import"),
            ("insert_encrypted(", "Encrypted insert function"),
            ("decrypt_row(", "Row decryption function"),
            ("select_decrypted(", "Decrypted select function"),
        ]
        
        all_passed = True
        for check_str, description in checks:
            found = check_str in content
            print_test(description, found)
            if not found:
                all_passed = False
        
        return all_passed
    
    except Exception as e:
        print_test("Read db.py", False, str(e))
        return False


def print_summary(results):
    """Print test summary"""
    print_header("Test Summary")
    
    total = len(results)
    passed = sum(1 for r in results if r)
    failed = total - passed
    
    print(f"Tests Passed: {GREEN}{passed}/{total}{RESET}")
    
    if failed > 0:
        print(f"Tests Failed: {RED}{failed}/{total}{RESET}")
        print(f"\n{YELLOW}Address failures above before deploying to production.{RESET}")
        return False
    else:
        print(f"\n{GREEN}All Phase 3 integration tests passed!{RESET}")
        return True


def main():
    """Run all tests"""
    print(f"{BLUE}{'#'*60}{RESET}")
    print(f"{BLUE}# Phase 3 Integration Validation{RESET}")
    print(f"{BLUE}# {time.strftime('%Y-%m-%d %H:%M:%S')}{RESET}")
    print(f"{BLUE}{'#'*60}{RESET}")
    
    results = [
        test_file_structure(),
        test_imports(),
        test_dependencies(),
        test_environment(),
        test_app_syntax(),
        test_endpoints(),
        test_integration_bridges(),
        test_process_email_integration(),
        test_database_encryption(),
        test_docker_setup(),
    ]
    
    all_passed = print_summary(results)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
