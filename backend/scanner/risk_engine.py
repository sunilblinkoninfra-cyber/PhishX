from typing import List, Dict, Any


def calculate_risk(
    *,
    text_ml_score: float,
    text_findings: Dict[str, Any],
    url_result: Dict[str, Any],
    malware_hits: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Deterministic risk scoring engine

    Inputs are PRE-COMPUTED results from:
    - NLP ML service
    - URL ML v2 service
    - Heuristic text analysis
    - ClamAV attachment scanning
    """

    reasons: List[str] = []
    total_score = 0.0

    # -------------------------------------------------
    # NLP ML score (40%)
    # -------------------------------------------------
    total_score += float(text_ml_score) * 0.4
    if text_ml_score > 0:
        reasons.append("NLP phishing model detected risk")

    # -------------------------------------------------
    # URL ML v2 score (40%)
    # -------------------------------------------------
    url_score = float(url_result.get("score", 0.0))
    url_signals = url_result.get("signals", [])

    total_score += url_score * 0.4
    if url_score > 0:
        reasons.extend(url_signals)

    # -------------------------------------------------
    # Heuristic email text signals (20%)
    # -------------------------------------------------
    heuristic_score = float(text_findings.get("score", 0.0))
    heuristic_signals = text_findings.get("signals", [])

    total_score += heuristic_score * 0.2
    reasons.extend(heuristic_signals)

    # -------------------------------------------------
    # Attachments — HARD OVERRIDE
    # -------------------------------------------------
    if malware_hits:
        total_score = max(total_score, 0.9)
        reasons.append("Malicious attachment detected")

    # -------------------------------------------------
    # Final verdict
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
        "reasons": reasons or ["fallback risk calculation used"],
    }
