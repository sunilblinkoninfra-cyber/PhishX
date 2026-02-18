"""
PhishX Database Field Encryption (Phase 3)

Encrypt sensitive fields at rest:
- Personal identifiable information (PII)
- Risk findings and classifications
- Email metadata
- User credentials

Uses Fernet (symmetric) encryption with key rotation support.
"""

import os
from typing import Optional, Any
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from base64 import urlsafe_b64encode

from log_config import logger

# ========================================
# Encryption Configuration
# ========================================

class EncryptionConfig:
    """Database encryption configuration"""
    
    # Master encryption key (use Key Management Service in production)
    MASTER_KEY = os.getenv("ENCRYPTION_MASTER_KEY")
    
    # Encryption enabled flag
    ENCRYPTION_ENABLED = os.getenv("ENCRYPTION_ENABLED", "true").lower() == "true"
    
    # Key rotation configuration
    KEY_ROTATION_INTERVAL_DAYS = int(os.getenv("KEY_ROTATION_INTERVAL", 90))
    
    @classmethod
    def validate(cls):
        """Validate encryption configuration"""
        if cls.ENCRYPTION_ENABLED and not cls.MASTER_KEY:
            logger.warning(
                "encryption_enabled_without_master_key",
                recommendation="Set ENCRYPTION_MASTER_KEY environment variable"
            )


# ========================================
# Field-Level Encryption
# ========================================

class FieldEncryptor:
    """Encrypt and decrypt individual fields"""
    
    _cipher_suite: Optional[Fernet] = None
    _active_key_version = 1
    
    @classmethod
    def _init_cipher(cls):
        """Initialize Fernet cipher with master key"""
        if cls._cipher_suite:
            return
        
        if not EncryptionConfig.MASTER_KEY:
            raise ValueError("ENCRYPTION_MASTER_KEY not configured")
        
        try:
            # Derive encryption key from master key
            kdf = PBKDF2(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b"phishx_salt_v1",  # Use random salt in production
                iterations=100000,
            )
            
            derived_key = kdf.derive(EncryptionConfig.MASTER_KEY.encode())
            encoded_key = urlsafe_b64encode(derived_key)
            
            cls._cipher_suite = Fernet(encoded_key)
            logger.info("encryption_cipher_initialized")
        
        except Exception as e:
            logger.error("encryption_cipher_init_failed", error=str(e))
            raise
    
    @classmethod
    def encrypt(cls, plaintext: str) -> str:
        """Encrypt plaintext field"""
        if not EncryptionConfig.ENCRYPTION_ENABLED:
            return plaintext
        
        if not plaintext:
            return plaintext
        
        try:
            cls._init_cipher()
            
            # Serialize with version and timestamp for metadata
            ciphertext = cls._cipher_suite.encrypt(plaintext.encode('utf-8'))
            
            # Prepend version byte (v1)
            versioned = b'v1:' + ciphertext
            
            logger.debug(
                "field_encrypted",
                plaintext_length=len(plaintext),
                ciphertext_length=len(versioned),
            )
            
            # Return as string
            return versioned.decode('utf-8')
        
        except Exception as e:
            logger.error(
                "encryption_failed",
                error=str(e),
                plaintext_length=len(plaintext) if plaintext else 0,
            )
            raise
    
    @classmethod
    def decrypt(cls, ciphertext: str) -> Optional[str]:
        """Decrypt ciphertext field"""
        if not EncryptionConfig.ENCRYPTION_ENABLED:
            return ciphertext
        
        if not ciphertext:
            return ciphertext
        
        try:
            # Check if already decrypted (no version marker)
            if not ciphertext.startswith('v'):
                return ciphertext
            
            cls._init_cipher()
            
            # Parse version
            if ciphertext.startswith('v1:'):
                versioned_bytes = ciphertext[3:].encode('utf-8')
            else:
                # Unknown version
                logger.warning(
                    "unknown_encryption_version",
                    ciphertext_preview=ciphertext[:20],
                )
                return None
            
            # Decrypt
            plaintext_bytes = cls._cipher_suite.decrypt(versioned_bytes)
            plaintext = plaintext_bytes.decode('utf-8')
            
            logger.debug(
                "field_decrypted",
                ciphertext_length=len(ciphertext),
                plaintext_length=len(plaintext),
            )
            
            return plaintext
        
        except InvalidToken:
            logger.error(
                "decryption_failed_invalid_token",
                ciphertext_preview=ciphertext[:20],
            )
            return None
        
        except Exception as e:
            logger.error(
                "decryption_error",
                error=str(e),
            )
            return None


# ========================================
# Encrypted Field Specification
# ========================================

class EncryptedField:
    """Specification for encrypted fields in database"""
    
    # Mapping of table.column -> encryption status
    ENCRYPTED_FIELDS = {
        # Users table
        "users.email": True,
        "users.name": True,
        "users.password_hash": True,
        
        # Email analysis results
        "email_analysis.sender": True,
        "email_analysis.subject": True,
        "email_analysis.body": True,
        "email_analysis.risk_score": False,  # Numeric, needed for queries
        "email_analysis.decision": False,    # Needed for filtering
        
        # Findings (sensitive detection results)
        "findings.finding_type": True,
        "findings.description": True,
        "findings.severity": False,
        
        # Audit log (sensitive access patterns)
        "audit_log.action_details": True,
        "audit_log.ip_address": True,
        "audit_log.user_agent": True,
    }
    
    @staticmethod
    def should_encrypt(table: str, column: str) -> bool:
        """Check if field should be encrypted"""
        key = f"{table}.{column}"
        return EncryptedField.ENCRYPTED_FIELDS.get(key, False)
    
    @staticmethod
    def get_encrypted_fields(table: str) -> list:
        """Get all encrypted fields for table"""
        table_prefix = f"{table}."
        return [
            col.split('.')[1]
            for col, encrypted in EncryptedField.ENCRYPTED_FIELDS.items()
            if col.startswith(table_prefix) and encrypted
        ]


# ========================================
# Database Encryption Layer
# ========================================

class DatabaseEncryptionLayer:
    """Transparent encryption/decryption for database operations"""
    
    @staticmethod
    def encrypt_row(table: str, row: dict) -> dict:
        """Encrypt specified fields in row"""
        encrypted_row = row.copy()
        
        for column, value in row.items():
            if EncryptedField.should_encrypt(table, column):
                if isinstance(value, str):
                    encrypted_row[column] = FieldEncryptor.encrypt(value)
                elif value is not None:
                    # Convert to string, encrypt, then store as string
                    encrypted_row[column] = FieldEncryptor.encrypt(str(value))
        
        return encrypted_row
    
    @staticmethod
    def decrypt_row(table: str, row: dict) -> dict:
        """Decrypt specified fields in row"""
        decrypted_row = row.copy()
        
        for column in EncryptedField.get_encrypted_fields(table):
            if column in row and row[column]:
                decrypted_row[column] = FieldEncryptor.decrypt(row[column])
        
        return decrypted_row
    
    @staticmethod
    def encrypt_rows(table: str, rows: list) -> list:
        """Encrypt specified fields in multiple rows"""
        return [DatabaseEncryptionLayer.encrypt_row(table, row) for row in rows]
    
    @staticmethod
    def decrypt_rows(table: str, rows: list) -> list:
        """Decrypt specified fields in multiple rows"""
        return [DatabaseEncryptionLayer.decrypt_row(table, row) for row in rows]


# ========================================
# Encryption Statistics & Metrics
# ========================================

class EncryptionMetrics:
    """Track encryption/decryption metrics"""
    
    encryptions_total = 0
    decryptions_total = 0
    encryption_errors = 0
    decryption_errors = 0
    
    @classmethod
    def record_encryption(cls, success: bool):
        """Record encryption operation"""
        if success:
            cls.encryptions_total += 1
        else:
            cls.encryption_errors += 1
    
    @classmethod
    def record_decryption(cls, success: bool):
        """Record decryption operation"""
        if success:
            cls.decryptions_total += 1
        else:
            cls.decryption_errors += 1
    
    @classmethod
    def get_metrics(cls) -> dict:
        """Get encryption metrics"""
        total_ops = cls.encryptions_total + cls.decryptions_total
        total_errors = cls.encryption_errors + cls.decryption_errors
        
        return {
            "total_encryptions": cls.encryptions_total,
            "total_decryptions": cls.decryptions_total,
            "total_operations": total_ops,
            "encryption_errors": cls.encryption_errors,
            "decryption_errors": cls.decryption_errors,
            "total_errors": total_errors,
            "error_rate_percent": (total_errors / total_ops * 100) if total_ops > 0 else 0,
        }


# ========================================
# Key Rotation
# ========================================

class KeyRotationManager:
    """Manage encryption key rotation"""
    
    _rotation_history = []
    
    @classmethod
    def rotate_key(cls, new_master_key: str):
        """Rotate encryption master key"""
        old_key = EncryptionConfig.MASTER_KEY
        
        # Update configuration
        EncryptionConfig.MASTER_KEY = new_master_key
        FieldEncryptor._cipher_suite = None  # Reset cipher
        
        # Record rotation
        cls._rotation_history.append({
            "timestamp": str(__import__('datetime').datetime.utcnow()),
            "old_key_hash": hash(old_key) if old_key else None,
            "new_key_hash": hash(new_master_key),
        })
        
        logger.security_event(
            "Encryption key rotated",
            severity="MEDIUM",
            old_key_hash=hash(old_key) if old_key else None,
            new_key_hash=hash(new_master_key),
        )
    
    @classmethod
    def get_rotation_history(cls) -> list:
        """Get key rotation history"""
        return cls._rotation_history
    
    @classmethod
    def re_encrypt_all_data(cls, new_master_key: str):
        """
        Re-encrypt all encrypted data with new master key.
        This is a heavy operation - run during maintenance window.
        """
        logger.warning(
            "starting_full_data_re_encryption",
            timestamp=str(__import__('datetime').datetime.utcnow()),
        )
        
        # Steps:
        # 1. Decrypt all data with old key
        # 2. Rotate to new key
        # 3. Re-encrypt all data with new key
        # 4. Verify integrity
        
        # This would require database access and should be implemented
        # as a separate administrative task
        pass


# ========================================
# PII Detection & Masking
# ========================================

class PIIDetector:
    """Detect personally identifiable information in text"""
    
    # Common PII patterns
    PII_PATTERNS = {
        "email": r"[\w\.-]+@[\w\.-]+\.\w+",
        "phone": r"(\d{3}[-.\s])?\d{3}[-.\s]?\d{4}",
        "ssn": r"\d{3}-\d{2}-\d{4}",
        "credit_card": r"\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}",
    }
    
    @staticmethod
    def mask_pii(text: str, mask_char: str = "X") -> str:
        """Mask PII in text"""
        import re
        
        masked = text
        for pii_type, pattern in PIIDetector.PII_PATTERNS.items():
            # Replace matches with masked version
            masked = re.sub(pattern, lambda m: mask_char * len(m.group()), masked)
        
        return masked
    
    @staticmethod
    def detect_pii(text: str) -> dict:
        """Detect PII in text"""
        import re
        
        findings = {}
        for pii_type, pattern in PIIDetector.PII_PATTERNS.items():
            matches = re.findall(pattern, text)
            if matches:
                findings[pii_type] = matches
        
        return findings
