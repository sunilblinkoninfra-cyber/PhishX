from .features import extract_url_features
from .model import score_url


def analyze_urls_ml(urls: list[str]) -> dict:
    if not urls:
        return {
            "score": 0.0,
            "signals": [],
            "model_version": "url-ml-v2"
        }

    scores = []
    signals = []

    for url in urls:
        features = extract_url_features(url)
        score = score_url(features)
        scores.append(score)

        if features["has_ip"]:
            signals.append("IP address used in URL")

        if features["has_at_symbol"]:
            signals.append("@ symbol used in URL")

        if features["suspicious_tld"]:
            signals.append("Suspicious TLD detected")

        if not features["has_https"]:
            signals.append("URL not using HTTPS")

    final_score = round(max(scores), 2)

    return {
        "score": final_score,
        "signals": list(set(signals)),
        "model_version": "url-ml-v2"
    }
