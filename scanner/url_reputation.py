# scanner/url_reputation.py

import requests
import time
from typing import List, Dict

URLHAUS_API = "https://urlhaus-api.abuse.ch/v1/url/"
TIMEOUT = 4

# Simple in-memory cache to avoid repeated calls
_CACHE = {}
_CACHE_TTL = 3600  # 1 hour


def _is_cached(url: str):
    entry = _CACHE.get(url)
    if not entry:
        return None
    ts, result = entry
    if time.time() - ts > _CACHE_TTL:
        del _CACHE[url]
        return None
    return result


def _set_cache(url: str, result: dict):
    _CACHE[url] = (time.time(), result)


def check_url_reputation(url: str) -> Dict:
    cached = _is_cached(url)
    if cached:
        return cached

    try:
        resp = requests.post(
            URLHAUS_API,
            data={"url": url},
            timeout=TIMEOUT,
        )

        if resp.status_code != 200:
            raise RuntimeError("URLhaus non-200")

        data = resp.json()

        if data.get("query_status") == "malicious":
            result = {
                "malicious": True,
                "confidence": 1.0,
                "source": "urlhaus",
                "reason": "Known malicious URL in threat feed",
            }
        else:
            result = {
                "malicious": False,
                "confidence": 0.0,
                "source": "urlhaus",
                "reason": "URL not found in threat feed",
            }

    except Exception as e:
        result = {
            "malicious": False,
            "confidence": 0.0,
            "source": "urlhaus",
            "reason": f"Threat intel unavailable: {str(e)}",
        }

    _set_cache(url, result)
    return result


def analyze_urls_reputation(urls: List[str]) -> Dict:
    findings = []
    max_confidence = 0.0
    malicious_detected = False

    for url in urls:
        res = check_url_reputation(url)
        findings.append({**res, "url": url})

        if res["malicious"]:
            malicious_detected = True
            max_confidence = 1.0

    return {
        "malicious": malicious_detected,
        "score": max_confidence,
        "signals": findings,
        "engine": "url-threat-intel",
    }
