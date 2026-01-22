def calculate_risk(
    url_results,
    text_findings,
    malware_hits,
    text_ml_score: float,
    url_ml_score: float = 0.0,
    url_ml_signals: list | None = None
):
    """
    Deterministic risk engine combining:
    - URL heuristics
    - URL ML / reputation score
    - NLP ML score
    - Heuristic text signals
    - Malware detection
    """

    explainability = []

    # ------------------------------------------------------------------
    # Heuristic risks (existing behavior preserved)
    # ------------------------------------------------------------------
    url_heuristic_risk = sum(1 for u in url_results if u.get("risk") == "high")
    heuristic_text_risk = len(text_findings.get("signals", []))
    malware_risk = 1 if malware_hits else 0

    # ------------------------------------------------------------------
    # URL ML / reputation blending
    # ------------------------------------------------------------------
    combined_url_risk = max(
        min(url_heuristic_risk, 1),   # presence-based
        float(url_ml_score or 0.0)    # ML confidence
    )

    # ------------------------------------------------------------------
    # Weighted ensemble (stable + explainable)
    # ------------------------------------------------------------------
    score = (
        0.35 * combined_url_risk * 100 +
        0.35 * text_ml_score * 100 +
        0.20 * malware_risk * 100 +
        0.10 * min(heuristic_text_risk, 3) * 10
    )

    score = int(min(score, 100))

    # ------------------------------------------------------------------
    # Explainability
    # ------------------------------------------------------------------
    if combined_url_risk > 0:
        explainability.append("Suspicious URL detected")

    if url_ml_signals:
        explainability.extend(url_ml_signals)

    if text_ml_score > 0.7:
        explainability.append("ML model detected phishing language")

    if heuristic_text_risk > 0:
        explainability.append("Suspicious email language detected")

    if malware_risk:
        explainability.append("Malware detected in attachment")

    verdict = (
        "SAFE" if score < 30 else
        "SUSPICIOUS" if score < 70 else
        "MALICIOUS"
    )

    return {
        "risk_score": score,
        "phishing_probability": round(score / 100, 2),
        "verdict": verdict,
        "explainability": list(set(explainability))
    }
