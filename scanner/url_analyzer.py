import re
from urllib.parse import urlparse


SUSPICIOUS_TLDS = {
    ".zip", ".review", ".country", ".link", ".click", ".top", ".xyz"
}

BRAND_KEYWORDS = {
    "paypal", "google", "facebook", "apple", "microsoft", "amazon", "bank"
}


def analyze_urls(urls: list[str]) -> dict:
    """
    Lightweight URL ML-style analyzer.
    Returns score + explainable signals.
    """

    if not urls:
        return {
            "score": 0.0,
            "signals": [],
            "available": True
        }

    score = 0.0
    signals = []

    for url in urls:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()

        # 1. IP-based URL
        if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", domain):
            score += 0.3
            signals.append("IP-based URL")

        # 2. Suspicious TLD
        for tld in SUSPICIOUS_TLDS:
            if domain.endswith(tld):
                score += 0.2
                signals.append(f"Suspicious TLD: {tld}")
                break

        # 3. Brand impersonation
        for brand in BRAND_KEYWORDS:
            if brand in domain and not domain.endswith(f"{brand}.com"):
                score += 0.3
                signals.append(f"Possible brand impersonation: {brand}")
                break

        # 4. Excessive subdomains
        if domain.count(".") >= 4:
            score += 0.2
            signals.append("Excessive subdomains")

        # 5. HTTP instead of HTTPS
        if parsed.scheme == "http":
            score += 0.1
            signals.append("Insecure HTTP link")

    score = round(min(score, 1.0), 3)

    return {
        "score": score,
        "signals": signals,
