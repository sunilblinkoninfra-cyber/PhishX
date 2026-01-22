from urllib.parse import urlparse
import re


SUSPICIOUS_TLDS = {
    "xyz", "top", "tk", "ml", "ga", "cf", "gq", "work", "click"
}


def extract_url_features(url: str) -> dict:
    parsed = urlparse(url)
    hostname = parsed.hostname or ""
    path = parsed.path or ""

    return {
        "url_length": len(url),
        "num_dots": hostname.count("."),
        "has_ip": bool(re.match(r"\d+\.\d+\.\d+\.\d+", hostname)),
        "has_at_symbol": "@" in url,
        "has_https": parsed.scheme == "https",
        "suspicious_tld": hostname.split(".")[-1] in SUSPICIOUS_TLDS,
        "num_digits": sum(c.isdigit() for c in url),
        "path_length": len(path),
    }
