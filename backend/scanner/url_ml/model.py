import math


def logistic(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def score_url(features: dict) -> float:
    """
    Lightweight deterministic ML-style scoring
    (acts like a trained logistic regression)
    """

    score = 0.0

    score += features["url_length"] * 0.003
    score += features["num_dots"] * 0.4
    score += features["num_digits"] * 0.15
    score += features["path_length"] * 0.01

    if features["has_ip"]:
        score += 2.0

    if features["has_at_symbol"]:
        score += 1.5

    if not features["has_https"]:
        score += 0.8

    if features["suspicious_tld"]:
        score += 1.8

    return round(min(logistic(score), 1.0), 2)
