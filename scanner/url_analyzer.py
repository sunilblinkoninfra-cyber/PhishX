import re
from urllib.parse import urlparse

SUSPICIOUS_TLDS = {"zip", "xyz", "top", "click", "tk", "ml"}

def analyze_urls(urls):
    findings = []
    score = 0.0

    for url in urls or []:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()

        if re.search(r"\d+\.\d+\.\d+\.\d+", domain):
            findings.append("IP-based URL")
            score += 0.3

        tld = domain.split(".")[-1]
        if tld in SUSPICIOUS_TLDS:
            findings.append(f"Suspicious TLD: .{tld}")
            score += 0.3

        if "login" in url or "verify" in url:
            findings.append("Credential harvesting keyword in URL")
            score += 0.2

    return {
        "score": min(score, 1.0),
        "signals": list(set(findings))
    }
