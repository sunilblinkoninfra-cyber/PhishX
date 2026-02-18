#!/usr/bin/env python3
"""
PhishX Production Environment Validator

Validates .env.production configuration before deployment.
Checks for:
- Required variables presence
- Value format correctness
- No remaining placeholders
- Secret strength
- Database connectivity (optional)
"""

import os
import sys
import re
from pathlib import Path
from urllib.parse import urlparse
import base64


class Colors:
    """ANSI colors for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_success(msg):
    print(f"{Colors.GREEN}✅{Colors.RESET} {msg}")


def print_error(msg):
    print(f"{Colors.RED}❌{Colors.RESET} {msg}")


def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️ {Colors.RESET} {msg}")


def print_info(msg):
    print(f"{Colors.BLUE}ℹ️ {Colors.RESET} {msg}")


def print_header(msg):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{msg}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")


class EnvValidator:
    """Validates .env.production configuration"""

    def __init__(self, env_file=".env.production"):
        self.env_file = env_file
        self.config = {}
        self.errors = []
        self.warnings = []
        self.successes = []

    def load_env(self):
        """Load .env.production file"""
        if not Path(self.env_file).exists():
            print_error(f"File not found: {self.env_file}")
            return False

        try:
            with open(self.env_file, 'r', encoding='utf-8-sig') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        self.config[key.strip()] = value.strip()
            print_success(f"Loaded {len(self.config)} variables from {self.env_file}")
            return True
        except Exception as e:
            print_error(f"Failed to load {self.env_file}: {e}")
            return False

    def get(self, key, default=None):
        """Get config value"""
        return self.config.get(key, default)

    def check_required_vars(self):
        """Check all required variables are present"""
        print_header("Checking Required Variables")

        required = {
            'ENVIRONMENT': 'Environment type',
            'DATABASE_URL': 'Database connection string',
            'POSTGRES_PASSWORD': 'PostgreSQL password',
            'REDIS_URL': 'Redis connection URL',
            'ENCRYPTION_MASTER_KEY': 'Encryption key',
            'JWT_ALGORITHM': 'JWT algorithm',
            'ENABLE_JWT_AUTH': 'JWT auth enabled flag',
            'GRAFANA_ADMIN_PASSWORD': 'Grafana admin password',
            'SMTP_PASSWORD': 'SMTP/email password',
        }

        for var, description in required.items():
            value = self.get(var)
            if not value:
                self.errors.append(f"Missing required variable: {var} ({description})")
                print_error(f"{var}: MISSING")
            else:
                print_success(f"{var}: present")

    def check_no_placeholders(self):
        """Check no [CHANGE_ME_*] placeholders remain"""
        print_header("Checking for Placeholders")

        placeholder_patterns = [
            r'\[CHANGE_ME[^\]]*\]',
            r'\[YOUR_[^\]]*\]',
            r'YOUR_',
            r'CHANGE_ME',
            r'\[.*\]',
        ]

        for key, value in self.config.items():
            for pattern in placeholder_patterns:
                if re.search(pattern, str(value)):
                    self.warnings.append(
                        f"{key} contains placeholder: {value[:50]}..."
                    )
                    print_warning(f"{key}: Contains placeholder value")
                    break
            else:
                print_success(f"{key}: No placeholders")

    def check_environment_type(self):
        """Validate ENVIRONMENT setting"""
        print_header("Validating Environment Type")

        env = self.get('ENVIRONMENT')
        if env not in ['development', 'staging', 'production']:
            self.errors.append(f"Invalid ENVIRONMENT: {env} (must be production/staging/development)")
            print_error(f"ENVIRONMENT={env} is not valid for production")
        elif env != 'production':
            self.warnings.append(f"ENVIRONMENT is '{env}', not 'production'")
            print_warning(f"ENVIRONMENT is set to '{env}' instead of 'production'")
        else:
            print_success("ENVIRONMENT=production")

    def check_debug_mode(self):
        """Check DEBUG is false in production"""
        print_header("Validating Safety Settings")

        debug = self.get('DEBUG', '').lower()
        if debug != 'false':
            self.warnings.append(f"DEBUG is enabled in production ({debug})")
            print_warning(f"DEBUG={debug} (should be false in production)")
        else:
            print_success("DEBUG=false (safe)")

    def check_database_url(self):
        """Validate DATABASE_URL format"""
        print_header("Validating Database Configuration")

        db_url = self.get('DATABASE_URL')
        if not db_url:
            self.errors.append("DATABASE_URL is missing")
            print_error("DATABASE_URL: MISSING")
            return

        try:
            parsed = urlparse(db_url)
            # Accept common postgres schemes
            if parsed.scheme not in ('postgresql', 'postgres'):
                self.errors.append(f"Invalid database scheme: {parsed.scheme} (must be postgresql)")
                print_error(f"DATABASE_URL scheme is '{parsed.scheme}' not 'postgresql'")
                return

            if not parsed.hostname:
                self.errors.append("DATABASE_URL missing hostname")
                print_error("DATABASE_URL: Missing hostname")
                return

            # urlparse stores the database name in the path (e.g. '/dbname')
            dbname = parsed.path.lstrip('/') if parsed.path else ''
            if not dbname:
                self.errors.append("DATABASE_URL missing database name")
                print_error("DATABASE_URL: Missing database name")
                return

            print_success(f"DATABASE_URL format valid")
            print_info(f"  Host: {parsed.hostname}")
            print_info(f"  Database: {dbname}")
            print_info(f"  Port: {parsed.port or 5432}")
        except Exception as e:
            self.errors.append(f"Failed to parse DATABASE_URL: {e}")
            print_error(f"DATABASE_URL parsing failed: {e}")

    def check_redis_url(self):
        """Validate REDIS_URL format"""
        print_header("Validating Redis Configuration")

        redis_url = self.get('REDIS_URL')
        if not redis_url:
            self.errors.append("REDIS_URL is missing")
            print_error("REDIS_URL: MISSING")
            return

        try:
            parsed = urlparse(redis_url)
            if parsed.scheme != 'redis':
                self.errors.append(f"Invalid Redis scheme: {parsed.scheme}")
                print_error(f"REDIS_URL scheme is '{parsed.scheme}' not 'redis'")
            elif not parsed.hostname:
                self.errors.append("REDIS_URL missing hostname")
                print_error("REDIS_URL: Missing hostname")
            else:
                print_success(f"REDIS_URL format valid")
                print_info(f"  Host: {parsed.hostname}")
                print_info(f"  Port: {parsed.port or 6379}")
        except Exception as e:
            self.errors.append(f"Failed to parse REDIS_URL: {e}")
            print_error(f"REDIS_URL parsing failed: {e}")

    def check_encryption_key(self):
        """Validate encryption master key"""
        print_header("Validating Encryption Configuration")

        enc_key = self.get('ENCRYPTION_MASTER_KEY')
        if not enc_key:
            if self.get('ENCRYPTION_ENABLED', '').lower() == 'true':
                self.errors.append("ENCRYPTION_ENABLED=true but ENCRYPTION_MASTER_KEY missing")
                print_error("ENCRYPTION_MASTER_KEY: MISSING (but ENCRYPTION_ENABLED=true)")
            else:
                print_warning("ENCRYPTION_MASTER_KEY not set (encryption may not work)")
            return

        # Check format (should be 64 hex characters = 32 bytes)
        if re.match(r'^[0-9a-fA-F]{64}$', enc_key):
            print_success(f"ENCRYPTION_MASTER_KEY: Valid hex format (32 bytes)")
        else:
            self.warnings.append(f"ENCRYPTION_MASTER_KEY format unexpected (not 64 hex chars)")
            print_warning(f"ENCRYPTION_MASTER_KEY: Format check warning (got {len(enc_key)} chars)")

    def check_jwt_configuration(self):
        """Validate JWT configuration"""
        print_header("Validating JWT Configuration")

        jwt_auth = self.get('ENABLE_JWT_AUTH', '').lower()
        if jwt_auth != 'true':
            self.warnings.append("JWT_AUTH not enabled (enable in production)")
            print_warning("ENABLE_JWT_AUTH is not 'true'")
            return

        print_success("ENABLE_JWT_AUTH=true")

        algorithm = self.get('JWT_ALGORITHM')
        if algorithm == 'RS256':
            # Check for RSA keys
            priv_key = self.get('JWT_PRIVATE_KEY')
            pub_key = self.get('JWT_PUBLIC_KEY')

            if not priv_key:
                self.errors.append("JWT_ALGORITHM=RS256 but JWT_PRIVATE_KEY missing")
                print_error("JWT_PRIVATE_KEY: MISSING (required for RS256)")
            elif not pub_key:
                self.errors.append("JWT_ALGORITHM=RS256 but JWT_PUBLIC_KEY missing")
                print_error("JWT_PUBLIC_KEY: MISSING (required for RS256)")
            else:
                # Validate base64 encoding
                try:
                    base64.b64decode(priv_key)
                    base64.b64decode(pub_key)
                    print_success("JWT_PRIVATE_KEY: Valid base64")
                    print_success("JWT_PUBLIC_KEY: Valid base64")
                except Exception as e:
                    self.errors.append(f"JWT keys not valid base64: {e}")
                    print_error(f"JWT keys base64 validation failed: {e}")

        elif algorithm == 'HS256':
            secret = self.get('JWT_SECRET_KEY')
            if not secret:
                self.errors.append("JWT_ALGORITHM=HS256 but JWT_SECRET_KEY missing")
                print_error("JWT_SECRET_KEY: MISSING (required for HS256)")
            elif len(secret) < 32:
                self.errors.append(f"JWT_SECRET_KEY too short ({len(secret)} chars, need 32+)")
                print_error(f"JWT_SECRET_KEY too short ({len(secret)} chars, minimum 32)")
            else:
                print_success(f"JWT_SECRET_KEY: Valid ({len(secret)} chars)")
        else:
            self.errors.append(f"Invalid JWT_ALGORITHM: {algorithm} (must be RS256 or HS256)")
            print_error(f"JWT_ALGORITHM='{algorithm}' invalid")

    def check_password_strength(self):
        """Check password strength"""
        print_header("Validating Password Strength")

        password_vars = {
            'POSTGRES_PASSWORD': 'Database',
            'REDIS_PASSWORD': 'Redis',
            'GRAFANA_ADMIN_PASSWORD': 'Grafana',
            'SMTP_PASSWORD': 'SMTP/Email',
        }

        for var, description in password_vars.items():
            password = self.get(var)
            if not password:
                print_warning(f"{var}: NOT SET")
                continue

            # Check minimum length
            if len(password) < 24:
                self.warnings.append(f"{var} too short ({len(password)} chars, 40+ recommended)")
                print_warning(f"{var}: Only {len(password)} chars (40+ recommended)")
                continue

            # Check character diversity
            has_upper = any(c.isupper() for c in password)
            has_lower = any(c.islower() for c in password)
            has_digit = any(c.isdigit() for c in password)
            has_special = any(not c.isalnum() for c in password)

            complexity = sum([has_upper, has_lower, has_digit, has_special])
            
            if complexity < 3:
                self.warnings.append(f"{var}: Low complexity (only {complexity}/4 character types)")
                print_warning(f"{var}: Low complexity ({complexity}/4 types)")
            else:
                print_success(f"{var}: Strong ({len(password)} chars, {complexity}/4 types)")

    def check_phase3_features(self):
        """Validate Phase 3 features"""
        print_header("Validating Phase 3 Features")

        features = {
            'ENCRYPTION_ENABLED': 'Field-level encryption',
            'ENABLE_JWT_AUTH': 'JWT authentication',
            'ANOMALY_DETECTION_ENABLED': 'Anomaly detection',
            'SHADOW_MODELS_ENABLED': 'Shadow models (A/B testing)',
            'MULTI_REGION_ENABLED': 'Multi-region failover',
        }

        for var, description in features.items():
            value = self.get(var, 'false').lower()
            status = '✅ ENABLED' if value == 'true' else '⚠️  DISABLED'
            print_info(f"{description}: {status}")

    def check_security_settings(self):
        """Check security-related settings"""
        print_header("Validating Security Settings")

        settings = {
            'ENABLE_HTTPS': ('HTTPS enabled', True),
            'CSRF_PROTECTION_ENABLED': ('CSRF protection enabled', True),
            'RATE_LIMIT_ENABLED': ('Rate limiting enabled', True),
            'AUDIT_LOG_ENABLED': ('Audit logging enabled', True),
            'SSL_VERIFY_MODE': ('SSL certificate verification', lambda x: x == 'CERT_REQUIRED'),
        }

        for var, (description, check) in settings.items():
            value = self.get(var)
            if not value:
                print_warning(f"{description}: NOT SET")
                continue

            if callable(check):
                is_valid = check(value)
            else:
                is_valid = value.lower() == str(check).lower()

            if is_valid:
                print_success(f"{description}: ✅")
            else:
                print_warning(f"{description}: {value}")

    def check_cors_configuration(self):
        """Check CORS is properly configured"""
        print_header("Validating CORS Configuration")

        cors = self.get('CORS_ORIGINS')
        if not cors:
            self.warnings.append("CORS_ORIGINS not set (defaulting to allow all)")
            print_warning("CORS_ORIGINS: NOT SET")
            return

        if cors == '*':
            self.warnings.append("CORS_ORIGINS=* (allows any origin - OK for dev, not for prod)")
            print_warning("CORS_ORIGINS='*' (allows any origin)")
        else:
            origins = cors.split(',')
            if all(o.startswith('https://') for o in origins):
                print_success(f"CORS_ORIGINS: {len(origins)} HTTPS origins configured")
                for origin in origins:
                    print_info(f"  - {origin}")
            else:
                self.warnings.append("Some CORS origins are not HTTPS")
                print_warning("Some CORS origins are not HTTPS")

    def generate_summary(self):
        """Generate validation summary"""
        print_header("Validation Summary")

        total = len(self.successes) + len(self.warnings) + len(self.errors)
        
        print(f"\nResults:")
        print(f"  {Colors.GREEN}Checks passed: {len(self.successes)}{Colors.RESET}")
        print(f"  {Colors.YELLOW}Warnings: {len(self.warnings)}{Colors.RESET}")
        print(f"  {Colors.RED}Errors: {len(self.errors)}{Colors.RESET}")

        if self.warnings:
            print(f"\n{Colors.YELLOW}Warnings (review before deployment):{Colors.RESET}")
            for i, warning in enumerate(self.warnings, 1):
                print(f"  {i}. {warning}")

        if self.errors:
            print(f"\n{Colors.RED}Errors (must fix):{Colors.RESET}")
            for i, error in enumerate(self.errors, 1):
                print(f"  {i}. {error}")

        print("\n" + "="*60)
        if self.errors:
            print(f"{Colors.RED}{Colors.BOLD}❌ VALIDATION FAILED - Fix errors before deployment{Colors.RESET}")
            return False
        elif self.warnings:
            print(f"{Colors.YELLOW}{Colors.BOLD}⚠️  VALIDATION PASSED WITH WARNINGS - Review before deployment{Colors.RESET}")
            return True
        else:
            print(f"{Colors.GREEN}{Colors.BOLD}✅ VALIDATION PASSED - Ready for deployment{Colors.RESET}")
            return True

    def run_all_checks(self):
        """Run all validation checks"""
        if not self.load_env():
            return False

        self.check_required_vars()
        self.check_no_placeholders()
        self.check_environment_type()
        self.check_debug_mode()
        self.check_database_url()
        self.check_redis_url()
        self.check_encryption_key()
        self.check_jwt_configuration()
        self.check_password_strength()
        self.check_phase3_features()
        self.check_security_settings()
        self.check_cors_configuration()

        return self.generate_summary()


def main():
    """Main entry point"""
    print(f"{Colors.BOLD}PhishX Production Environment Validator{Colors.RESET}")
    print(f"Version 1.0.0 | February 2026\n")

    # Check if .env.production exists
    if not Path(".env.production").exists():
        print_error(".env.production file not found in current directory")
        print_info("Create it first using: ENV_SETUP_GUIDE.md")
        sys.exit(1)

    validator = EnvValidator()
    success = validator.run_all_checks()

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
