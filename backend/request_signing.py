"""
PhishX Request Signing & Verification (Phase 2)

Implement HMAC-based request signing for:
- Webhook authenticity
- Task queue callback verification
- External service integration security
- Request integrity validation
"""

import hmac
import hashlib
import json
import time
import secrets
from typing import Dict, Optional, Any
from base64 import b64encode, b64decode
from urllib.parse import urlencode

from log_config import logger


# ========================================
# Request Signing Configuration
# ========================================

class SigningConfig:
    """Configuration for request signing"""
    
    # Algorithm configuration
    ALGORITHM = "sha256"
    ENCODING = "utf-8"
    
    # Timestamp validation (prevent replay attacks)
    MAX_REQUEST_AGE_SECONDS = 300  # 5 minutes
    
    # Signature header names
    SIGNATURE_HEADER = "x-phishx-signature"
    TIMESTAMP_HEADER = "x-phishx-timestamp"
    NONCE_HEADER = "x-phishx-nonce"
    
    # Request body hashing
    BODY_HASH_HEADER = "x-phishx-body-hash"
    
    @staticmethod
    def get_signature_header() -> str:
        """Get signature header name"""
        return SigningConfig.SIGNATURE_HEADER
    
    @staticmethod
    def get_timestamp_header() -> str:
        """Get timestamp header name"""
        return SigningConfig.TIMESTAMP_HEADER


# ========================================
# Signing Helper Functions
# ========================================

def generate_request_signature(
    body: bytes,
    secret_key: str,
    timestamp: str,
    nonce: str,
    method: str = "POST",
    path: str = "/",
) -> str:
    """
    Generate HMAC signature for request.
    
    Signature includes:
    - HTTP method
    - Request path
    - Timestamp (prevents replay)
    - Nonce (prevents duplicates)
    - Body hash
    """
    # Create canonical request string
    body_hash = hashlib.sha256(body).hexdigest()
    
    canonical_request = "\n".join([
        method.upper(),
        path,
        timestamp,
        nonce,
        body_hash,
    ])
    
    # Sign with secret key
    signature = hmac.new(
        secret_key.encode(SigningConfig.ENCODING),
        canonical_request.encode(SigningConfig.ENCODING),
        hashlib.sha256
    ).digest()
    
    # Return base64-encoded signature
    return b64encode(signature).decode(SigningConfig.ENCODING)


def verify_request_signature(
    body: bytes,
    signature: str,
    secret_key: str,
    timestamp: str,
    nonce: str,
    method: str = "POST",
    path: str = "/",
) -> bool:
    """
    Verify request signature.
    
    Returns True if signature is valid and within timestamp window.
    """
    # Check timestamp window
    try:
        request_time = int(timestamp)
        current_time = int(time.time())
        age = current_time - request_time
        
        if age < 0:
            logger.warning(
                "signature_future_timestamp",
                age=age,
            )
            return False
        
        if age > SigningConfig.MAX_REQUEST_AGE_SECONDS:
            logger.warning(
                "signature_expired",
                age=age,
                max_age=SigningConfig.MAX_REQUEST_AGE_SECONDS,
            )
            return False
    
    except (ValueError, TypeError) as e:
        logger.error(
            "signature_timestamp_invalid",
            error=str(e),
        )
        return False
    
    # Generate expected signature
    expected_signature = generate_request_signature(
        body=body,
        secret_key=secret_key,
        timestamp=timestamp,
        nonce=nonce,
        method=method,
        path=path,
    )
    
    # Compare signatures (constant-time comparison)
    try:
        result = hmac.compare_digest(signature, expected_signature)
        
        if not result:
            logger.warning(
                "signature_mismatch",
                provided_signature=signature[:20],
                expected_signature=expected_signature[:20],
            )
        
        return result
    
    except Exception as e:
        logger.error(
            "signature_comparison_error",
            error=str(e),
        )
        return False


# ========================================
# Request Signing Utilities
# ========================================

class RequestSigner:
    """Sign outgoing requests"""
    
    @staticmethod
    def sign_request(
        body: bytes,
        secret_key: str,
        method: str = "POST",
        path: str = "/",
        extra_headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, str]:
        """
        Sign a request and return headers.
        
        Returns dict of headers to add to request:
            {
                "x-phishx-signature": "base64_signature",
                "x-phishx-timestamp": "unix_timestamp",
                "x-phishx-nonce": "random_nonce",
                "x-phishx-body-hash": "sha256_hash",
            }
        """
        # Generate timestamp and nonce
        timestamp = str(int(time.time()))
        nonce = secrets.token_urlsafe(32)
        
        # Generate signature
        signature = generate_request_signature(
            body=body,
            secret_key=secret_key,
            timestamp=timestamp,
            nonce=nonce,
            method=method,
            path=path,
        )
        
        # Calculate body hash
        body_hash = hashlib.sha256(body).hexdigest()
        
        # Build headers
        headers = {
            SigningConfig.SIGNATURE_HEADER: signature,
            SigningConfig.TIMESTAMP_HEADER: timestamp,
            SigningConfig.NONCE_HEADER: nonce,
            SigningConfig.BODY_HASH_HEADER: body_hash,
        }
        
        if extra_headers:
            headers.update(extra_headers)
        
        logger.debug(
            "request_signed",
            method=method,
            path=path,
            signature_length=len(signature),
        )
        
        return headers
    
    @staticmethod
    def sign_json_request(
        json_data: Dict[str, Any],
        secret_key: str,
        method: str = "POST",
        path: str = "/",
    ) -> tuple:
        """
        Sign a JSON request.
        
        Returns (body_bytes, headers_dict) tuple.
        """
        body = json.dumps(json_data, separators=(',', ':')).encode('utf-8')
        headers = RequestSigner.sign_request(
            body=body,
            secret_key=secret_key,
            method=method,
            path=path,
            extra_headers={"content-type": "application/json"},
        )
        return body, headers
    
    @staticmethod
    def sign_form_request(
        form_data: Dict[str, str],
        secret_key: str,
        method: str = "POST",
        path: str = "/",
    ) -> tuple:
        """
        Sign a form-encoded request.
        
        Returns (body_bytes, headers_dict) tuple.
        """
        body = urlencode(form_data).encode('utf-8')
        headers = RequestSigner.sign_request(
            body=body,
            secret_key=secret_key,
            method=method,
            path=path,
            extra_headers={"content-type": "application/x-www-form-urlencoded"},
        )
        return body, headers


# ========================================
# Request Verification
# ========================================

class RequestVerifier:
    """Verify incoming requests"""
    
    @staticmethod
    def verify_headers(
        body: bytes,
        headers: Dict[str, str],
        secret_key: str,
        method: str = "POST",
        path: str = "/",
    ) -> tuple:
        """
        Verify request headers and signature.
        
        Returns (is_valid, error_message) tuple.
        """
        # Extract signature headers
        signature = headers.get(SigningConfig.SIGNATURE_HEADER)
        timestamp = headers.get(SigningConfig.TIMESTAMP_HEADER)
        nonce = headers.get(SigningConfig.NONCE_HEADER)
        body_hash = headers.get(SigningConfig.BODY_HASH_HEADER)
        
        # Validate presence
        if not all([signature, timestamp, nonce, body_hash]):
            logger.warning(
                "signature_headers_missing",
                has_signature=bool(signature),
                has_timestamp=bool(timestamp),
                has_nonce=bool(nonce),
                has_body_hash=bool(body_hash),
            )
            return False, "Missing signature headers"
        
        # Verify body hash
        calculated_hash = hashlib.sha256(body).hexdigest()
        if body_hash != calculated_hash:
            logger.warning(
                "body_hash_mismatch",
                provided_hash=body_hash,
                calculated_hash=calculated_hash,
            )
            return False, "Body hash mismatch"
        
        # Verify signature
        is_valid = verify_request_signature(
            body=body,
            signature=signature,
            secret_key=secret_key,
            timestamp=timestamp,
            nonce=nonce,
            method=method,
            path=path,
        )
        
        if not is_valid:
            return False, "Signature verification failed"
        
        logger.info(
            "request_signature_verified",
            method=method,
            path=path,
        )
        
        return True, None
    
    @staticmethod
    def verify_webhook(
        body: bytes,
        headers: Dict[str, str],
        secret_key: str,
        path: str = "/webhook",
    ) -> bool:
        """
        Verify incoming webhook request.
        
        Convenience method for webhook verification.
        """
        is_valid, error = RequestVerifier.verify_headers(
            body=body,
            headers=headers,
            secret_key=secret_key,
            method="POST",
            path=path,
        )
        
        if not is_valid:
            logger.error(
                "webhook_verification_failed",
                path=path,
                error=error,
            )
        
        return is_valid


# ========================================
# Key Management
# ========================================

class SigningKeyManager:
    """Manage signing keys for different services"""
    
    # In-memory key storage (use Key Management Service in production)
    keys: Dict[str, Dict[str, Any]] = {}
    
    @classmethod
    def generate_key(cls, key_id: str, service_name: str) -> str:
        """Generate a new signing key"""
        key = secrets.token_urlsafe(32)
        
        cls.keys[key_id] = {
            "key": key,
            "service_name": service_name,
            "created_at": time.time(),
            "last_used": None,
            "active": True,
        }
        
        logger.info(
            "signing_key_generated",
            key_id=key_id,
            service=service_name,
        )
        
        return key
    
    @classmethod
    def get_key(cls, key_id: str) -> Optional[str]:
        """Get signing key"""
        key_info = cls.keys.get(key_id)
        
        if not key_info or not key_info.get("active"):
            logger.warning(
                "signing_key_not_found",
                key_id=key_id,
            )
            return None
        
        # Update last_used
        key_info["last_used"] = time.time()
        
        return key_info["key"]
    
    @classmethod
    def rotate_key(cls, key_id: str) -> str:
        """Rotate a signing key"""
        key_info = cls.keys.get(key_id)
        
        if not key_info:
            logger.warning(
                "signing_key_not_found",
                key_id=key_id,
            )
            return None
        
        # Deactivate old key
        key_info["active"] = False
        
        # Generate new key
        new_key = secrets.token_urlsafe(32)
        new_key_id = f"{key_id}_rotated_{int(time.time())}"
        
        cls.keys[new_key_id] = {
            "key": new_key,
            "service_name": key_info["service_name"],
            "created_at": time.time(),
            "last_used": None,
            "active": True,
            "previous_key_id": key_id,
        }
        
        logger.info(
            "signing_key_rotated",
            old_key_id=key_id,
            new_key_id=new_key_id,
        )
        
        return new_key
    
    @classmethod
    def list_keys(cls) -> Dict[str, Dict[str, Any]]:
        """List all keys"""
        return {
            key_id: {
                "service_name": info["service_name"],
                "created_at": info["created_at"],
                "last_used": info["last_used"],
                "active": info["active"],
            }
            for key_id, info in cls.keys.items()
        }


# ========================================
# Example Usage
# ========================================

def example_sign_request():
    """Example: Sign an outgoing request"""
    # Generate or retrieve key
    secret_key = SigningKeyManager.generate_key("webhook_v1", "external_service")
    
    # Prepare request data
    json_data = {
        "email_id": "email_123",
        "risk_score": 85.5,
        "decision": "quarantine",
    }
    
    # Sign request
    body, headers = RequestSigner.sign_json_request(
        json_data=json_data,
        secret_key=secret_key,
        method="POST",
        path="/api/v1/decision",
    )
    
    print(f"Signed headers: {headers}")
    print(f"Body: {body}")
    
    return body, headers, secret_key


def example_verify_request():
    """Example: Verify an incoming request"""
    # Get secret key for verifier
    secret_key = "your-secret-key"
    
    # Simulated incoming request
    body = b'{"email_id":"email_123","risk_score":85.5}'
    headers = {
        "x-phishx-signature": "base64_signature_here",
        "x-phishx-timestamp": str(int(time.time())),
        "x-phishx-nonce": "random_nonce_here",
        "x-phishx-body-hash": hashlib.sha256(body).hexdigest(),
    }
    
    # Verify
    is_valid, error = RequestVerifier.verify_headers(
        body=body,
        headers=headers,
        secret_key=secret_key,
        method="POST",
        path="/api/v1/decision",
    )
    
    if is_valid:
        print("Request signature verified!")
    else:
        print(f"Verification failed: {error}")
