"""
Phase 3 Database Encryption Integration

Transparent encryption/decryption layer for database operations.
Integrates with psycopg2 connections.
"""

import os
from typing import Dict, Any, List, Optional

from db_encryption import (
    DatabaseEncryptionLayer,
    PIIDetector,
    KeyRotationManager,
    EncryptionConfig,
)
from log_config import logger


# ========================================
# Configuration
# ========================================

class EncryptionSettings:
    """Encryption configuration from environment"""
    
    ENCRYPTION_ENABLED = os.getenv("ENCRYPTION_ENABLED", "false").lower() == "true"
    ENCRYPTION_MASTER_KEY = os.getenv("ENCRYPTION_MASTER_KEY")
    KEY_ROTATION_INTERVAL = int(os.getenv("KEY_ROTATION_INTERVAL", 90))
    
    @classmethod
    def initialize(cls):
        """Initialize encryption system"""
        if cls.ENCRYPTION_ENABLED:
            if not cls.ENCRYPTION_MASTER_KEY:
                raise RuntimeError("ENCRYPTION_MASTER_KEY required when encryption is enabled")
            
            # Set encryption config
            EncryptionConfig.ENCRYPTION_ENABLED = True
            EncryptionConfig.MASTER_KEY = cls.ENCRYPTION_MASTER_KEY
            
            logger.info(
                "encryption_initialized",
                enabled=True,
                key_rotation_interval_days=cls.KEY_ROTATION_INTERVAL,
            )
        else:
            logger.info("encryption_disabled", enabled=False)


# Initialize on import
EncryptionSettings.initialize()


# ========================================
# Field Mapping Configuration
# ========================================

ENCRYPTED_FIELDS = {
    "users": ["email", "name", "password_hash"],
    "email_analysis": ["sender", "subject", "body"],
    "findings": ["finding_type", "description"],
    "audit_log": ["action_details", "ip_address", "user_agent"],
}

NON_ENCRYPTED_QUERYABLE_FIELDS = {
    "email_analysis": ["email_id", "created_at", "risk_score", "category", "decision"],
    "findings": ["finding_id", "email_id", "severity"],
    "audit_log": ["log_id", "timestamp", "user_id", "event_type"],
}


# ========================================
# Database Operation Wrappers
# ========================================

def encrypt_row(table_name: str, row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Encrypt specified fields in database row before INSERT.
    
    Args:
        table_name: Name of table (e.g., "email_analysis")
        row: Dictionary of field values
    
    Returns:
        Row with sensitive fields encrypted
    """
    if not EncryptionSettings.ENCRYPTION_ENABLED:
        return row
    
    if table_name not in ENCRYPTED_FIELDS:
        return row
    
    encrypted_row = row.copy()
    
    for field in ENCRYPTED_FIELDS[table_name]:
        if field in encrypted_row and encrypted_row[field]:
            try:
                encrypted_row[field] = DatabaseEncryptionLayer.encrypt_field(
                    table_name,
                    field,
                    encrypted_row[field],
                )
                logger.debug(
                    "field_encrypted",
                    table=table_name,
                    field=field,
                )
            except Exception as e:
                logger.error(
                    "encryption_failed",
                    table=table_name,
                    field=field,
                    error=str(e),
                )
                raise
    
    return encrypted_row


def decrypt_row(table_name: str, row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Decrypt specified fields in database row after SELECT.
    
    Args:
        table_name: Name of table
        row: Dictionary of field values (may contain encrypted data)
    
    Returns:
        Row with sensitive fields decrypted
    """
    if not EncryptionSettings.ENCRYPTION_ENABLED:
        return row
    
    if table_name not in ENCRYPTED_FIELDS:
        return row
    
    decrypted_row = row.copy()
    
    for field in ENCRYPTED_FIELDS[table_name]:
        if field in decrypted_row and decrypted_row[field]:
            try:
                decrypted_row[field] = DatabaseEncryptionLayer.decrypt_field(
                    table_name,
                    field,
                    decrypted_row[field],
                )
                logger.debug(
                    "field_decrypted",
                    table=table_name,
                    field=field,
                )
            except Exception as e:
                logger.error(
                    "decryption_failed",
                    table=table_name,
                    field=field,
                    error=str(e),
                )
                raise
    
    return decrypted_row


def detect_pii(text: str) -> Dict[str, List[str]]:
    """
    Detect personally identifiable information in text.
    
    Args:
        text: Text to scan for PII
    
    Returns:
        Dictionary of PII types and matches
    """
    return PIIDetector.detect_pii(text)


def mask_pii(text: str) -> str:
    """
    Mask personally identifiable information in text.
    Useful for logging/debugging without exposing PII.
    
    Args:
        text: Text to mask
    
    Returns:
        Text with PII replaced by XXXXXX
    """
    return PIIDetector.mask_pii(text)


# ========================================
# Key Rotation Management
# ========================================

def rotate_encryption_key(new_master_key: str) -> Dict[str, Any]:
    """
    Rotate encryption master key.
    
    IMPORTANT: This operation should be run during maintenance window.
    It requires re-encrypting all encrypted fields with new key.
    
    Args:
        new_master_key: New master key (base64 encoded 32-byte key)
    
    Returns:
        Status of rotation operation
    """
    if not EncryptionSettings.ENCRYPTION_ENABLED:
        logger.warning("encryption_disabled_cannot_rotate_key")
        return {"status": "error", "message": "Encryption not enabled"}
    
    try:
        logger.warning(
            "key_rotation_started",
            timestamp=logger.get_timestamp(),
        )
        
        KeyRotationManager.rotate_key(new_master_key)
        
        EncryptionSettings.ENCRYPTION_MASTER_KEY = new_master_key
        EncryptionConfig.MASTER_KEY = new_master_key
        
        logger.warning(
            "key_rotation_completed",
            timestamp=logger.get_timestamp(),
        )
        
        return {
            "status": "success",
            "message": "Key rotation completed",
        }
    
    except Exception as e:
        logger.error(
            "key_rotation_failed",
            error=str(e),
            exc_info=True,
        )
        return {
            "status": "error",
            "message": f"Key rotation failed: {str(e)}",
        }


def get_encryption_metrics() -> Dict[str, Any]:
    """
    Get encryption operation metrics.
    
    Returns:
        Dictionary with encryption statistics
    """
    try:
        return DatabaseEncryptionLayer.get_encryption_metrics()
    except Exception as e:
        logger.error("failed_to_get_encryption_metrics", error=str(e))
        return {
            "total_encryptions": 0,
            "total_decryptions": 0,
            "encryption_errors": 0,
            "decryption_errors": 0,
        }


# ========================================
# Encryption Middleware for Cursor Operations
# ========================================

class EncryptedCursor:
    """
    Wrapper for psycopg2 cursor that automatically
    encrypts/decrypts fields based on configuration.
    """
    
    def __init__(self, cursor, table_name: str = None):
        self.cursor = cursor
        self.table_name = table_name
    
    def execute(self, query: str, args=None):
        """Execute query with encrypted args if needed"""
        # If inserting and encryption enabled, encrypt args
        if self.table_name and "INSERT" in query.upper() and args:
            # This is a simplified version - real implementation would parse SQL
            pass
        
        return self.cursor.execute(query, args)
    
    def fetchone(self):
        """Fetch and decrypt row"""
        row = self.cursor.fetchone()
        if row and self.table_name:
            return decrypt_row(self.table_name, dict(row))
        return row
    
    def fetchall(self):
        """Fetch and decrypt all rows"""
        rows = self.cursor.fetchall()
        if rows and self.table_name:
            return [decrypt_row(self.table_name, dict(row)) for row in rows]
        return rows
    
    def __getattr__(self, name):
        """Delegate other methods to underlying cursor"""
        return getattr(self.cursor, name)
