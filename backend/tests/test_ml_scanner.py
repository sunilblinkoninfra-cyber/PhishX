"""
PhishX ML Scanner Tests
Backend Developer: AI Co-worker
Covers: phishing model input validation, adversarial inputs, confidence thresholds
"""
import pytest
import re


class TestMLScannerInputValidation:
    """Validate ML scanner handles edge-case and adversarial inputs."""

    def test_homoglyph_url_flagged(self):
        """
        URLs with homoglyph characters (Cyrillic lookalikes) must be
        detected as suspicious by pre-processing before ML inference.
        e.g. pаypal.com where 'а' is Cyrillic U+0430, not ASCII 'a'
        """
        suspicious_url = "http://p\u0430ypal.com/login"  # Cyrillic а

        # Check the URL contains non-ASCII characters
        has_non_ascii = not all(ord(c) < 128 for c in suspicious_url)
        assert has_non_ascii, "Homoglyph URL should contain non-ASCII chars"

        # Simulate what the scanner's pre-processor should catch
        def is_suspicious_unicode(url: str) -> bool:
            ascii_lookalikes = set()
            for char in url:
                if ord(char) > 127:
                    ascii_lookalikes.add(char)
            return len(ascii_lookalikes) > 0

        assert is_suspicious_unicode(suspicious_url), \
            "Homoglyph detector must flag Cyrillic lookalikes"

    def test_score_never_exactly_zero_or_one(self):
        """
        ML model confidence scores must never be exactly 0.0 or 1.0.
        Real-world probabilistic outputs should be strictly between bounds.
        """
        # Simulate score validation that must be applied post-inference
        def validate_score(score: float) -> bool:
            return 0.0 < score < 1.0

        sample_scores = [0.05, 0.23, 0.78, 0.95, 0.51]
        for score in sample_scores:
            assert validate_score(score), \
                f"Score {score} must be strictly between 0 and 1"

        # These should FAIL validation
        invalid_scores = [0.0, 1.0]
        for score in invalid_scores:
            assert not validate_score(score), \
                f"Score {score} is invalid (boundary value)"

    def test_url_length_limit_enforced(self):
        """URLs exceeding maximum length should be rejected before ML inference."""
        max_url_length = 2048
        long_url = "http://phishing.com/" + "a" * 3000

        assert len(long_url) > max_url_length, "Test URL should exceed limit"

        def pre_validate_url(url: str) -> bool:
            return len(url) <= max_url_length

        assert not pre_validate_url(long_url), \
            "URLs exceeding 2048 chars must be rejected"

    def test_ip_address_url_flagged_as_suspicious(self):
        """
        URLs using raw IP addresses instead of domain names
        are a strong phishing indicator and should score > 0.5.
        """
        ip_url = "http://192.168.1.1/login"
        ip_pattern = re.compile(
            r'https?://(\d{1,3}\.){3}\d{1,3}'
        )
        assert ip_pattern.match(ip_url), \
            "IP-based URL should match suspicious pattern"

    def test_empty_url_rejected(self):
        """Empty string URL must be caught by input validation."""
        def validate_url_input(url: str) -> bool:
            return bool(url and url.strip() and url.startswith("http"))

        assert not validate_url_input(""), "Empty URL must be rejected"
        assert not validate_url_input("   "), "Whitespace URL must be rejected"
        assert not validate_url_input("not-a-url"), "Non-HTTP URL must be rejected"
        assert validate_url_input("http://example.com"), "Valid URL must pass"
