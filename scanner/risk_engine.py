from typing import List, Dict, Any


def calculate_risk(
    *,
    url_results: List[Dict[str, Any]],
    text_findings: Dict[str, Any],
    malware_hits: List[Dict[str, Any]],
    text_ml_score: float,
    url_ml_score: float,
    url_ml_signals: List[str]
) -> Dict[str, Any]:
    """
    Deterministic risk scoring engine
    """

    reasons = []
    total_score = 0.0

    # -------------------------------------------------
    # NLP ML score (40%)
    # -------------------------------------------------
    total_score += text_ml_score * 0.4
    if text_ml_score > 0:
        reasons.append("NLP phishing model detected risk")

    # -------------------------------------------------
    # URL reputation / ML (40%)
    # -------------------------------------------------
    total_score += url_ml_score * 0.4
    if url_ml_score > 0:
        reasons.extend(url_ml_signals)

    # -------------------------------------------------
    # Heuristic email signals (fallback)
    # -------------------------------------------------
    heuristic_score = float(text_findings.get("score", 0.0))
    total_score += heuristic_score * 0.2
    reasons.extend(text_findings.get("signals", []))

    # -------------------------------------------------
    # Attachments (hard override)
    # -------------------------------------------------
    if malware_hits:
        total_score = max(total_score, 0.9)
        reasons.append("Malicious attachment detected")

    # -------------------------------------------------
    # Verdict
    # -------------------------------------------------
    if total_score >= 0.75:
        verdict = "MALICIOUS"
    elif total_score >= 0.4:
        verdict = "SUSPICIOUS"
    else:
        verdict = "SAFE"

    return {
        "score": round(min(total_score, 1.0), 2),
        "verdict": verdict,
        "reasons": reasons or ["fallback risk calculation used"]
    }
