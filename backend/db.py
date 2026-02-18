import os
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, Any, Optional

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is required")

# ========================================
# Phase 3: Encryption Integration
# ========================================

try:
    from encryption_integration import (
        encrypt_row,
        decrypt_row,
        EncryptionSettings,
    )
    ENCRYPTION_AVAILABLE = True
except ImportError:
    ENCRYPTION_AVAILABLE = False


def get_db():
    """Get database connection"""
    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor
    )


# ========================================
# Encryption-Aware Database Operations
# ========================================

def insert_encrypted(table_name: str, data: Dict[str, Any]) -> bool:
    """
    Insert row with automatic field encryption.
    
    Args:
        table_name: Table name (e.g., "email_analysis")
        data: Row data dictionary
    
    Returns:
        True if successful
    """
    if ENCRYPTION_AVAILABLE:
        data = encrypt_row(table_name, data)
    
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Build INSERT statement
        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        values = list(data.values())
        
        query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
        cur.execute(query, values)
        
        conn.commit()
        cur.close()
        conn.close()
        return True
    
    except Exception as e:
        raise


def select_decrypted(table_name: str, query: str, args: tuple = None) -> list:
    """
    Select rows with automatic field decryption.
    
    Args:
        table_name: Table name for field mapping
        query: SQL query
        args: Query parameters
    
    Returns:
        List of decrypted rows
    """
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute(query, args or ())
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        # Decrypt rows if encryption enabled
        if ENCRYPTION_AVAILABLE and rows:
            rows = [decrypt_row(table_name, dict(row)) for row in rows]
        
        return rows
    
    except Exception as e:
        raise


def select_one_decrypted(table_name: str, query: str, args: tuple = None) -> Optional[Dict]:
    """
    Select single row with automatic decryption.
    
    Args:
        table_name: Table name for field mapping
        query: SQL query
        args: Query parameters
    
    Returns:
        Decrypted row or None
    """
    rows = select_decrypted(table_name, query, args)
    return rows[0] if rows else None
