import os
from typing import List, Optional

import requests
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from utils.api_response import success_response, error_response
from scanner.url_analyzer import analyze_urls
from scanner.email_analyzer import analyze_email_text as analyze_email_text_heuristics
from scanner.attachment_scanner import scan_attachments
from scanner.risk_engine import calculate_risk

# -----------------------------------------------------------------------------
# App initialization
# -----------------------------------------------------------------------------

app = FastAPI(
    title="PhishGuard Email Security API",
    version="1.2.0",
    description="API for phishing, malware, and email threat detection"
)

# -----------------------------------------------------------------------------
# Environment
# -----------------------------------------------------------------------------

API_KEY = os.getenv("API_KEY")
NLP_SERVICE_URL = os.getenv("NLP_SERVICE_URL")

if not API_KEY:
    raise RuntimeError("API_KEY environment variable is required")

print("NLP_SERVICE_URL =", NLP_SERVICE_URL)

# -----------------------------------------------------------------------------
# CORS (temporary – tighten later)
# -----------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Auth
# -----------------------------------------------------------------------------

api_key_header = APIKeyHeader(
    name="Authorization",
    auto_error=False,
    description="API key via Authorization header. Supports 'Bearer <key>' or raw key."
)

def authenticate(api_key: Optional[str] = Depends(api_key_header)):
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API key")

    if api_key.lower().startswith("bearer "):
        api_key = api_key.split(" ", 1)[1].strip()

    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return True

# -----------------------------------------------------------------------------
# Global exception handler
# -----------------------------------------------------------------------------

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    print("UNHANDLED_EXCEPTION:", repr(exc))
    return error_response("Internal server error", 500)

# -----------------------------------------------------------------------------
# Health
# -----------------------------------------------------------------------------

@app.get("/health")
def health_check():
    return success_response({"status": "ok"})

# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------

class Attachment(BaseModel):
    filename: str
    base64: str

class EmailScanRequest(BaseModel):
    subject: str
    sender: str
    body: str
    urls: List[str] = []
    attachments: List[Attachment] = []

# -----------------------------------------------------------------------------
# NLP ML Client (SAFE)
# -----------------------------------------------------------------------------

def call_nlp_service(subject: str, body: str) -> dict:
    if not NLP_SERVICE_URL:
        print("NLP_SERVICE_URL not set")
        return {
            "text_ml_score": 0.0,
            "signals": [],
            "model_version": "nlp-unavailable",
            "available": False
        }

    try:
        resp = requests.post(
            NLP_SERVICE_URL,
            json={"subject": subject, "body": body},
            timeout=5
        )

        print("NLP STATUS:", resp.status_code)
        print("NLP BODY:", resp.text)

        if resp.status_code != 200:
            raise RuntimeError(f"NLP returned {resp.status_code}")

        data = resp.json()

        return {
            "text_ml_score": float(data.get("text_ml_score", 0.0)),
            "signals": data.get("signals", []),
            "model_version": data.get("model_version", "unknown"),
            "available": True
        }

    except Exception as e:
        print("NLP_SERVICE_ERROR:", repr(e))
        return {
            "text_ml_score": 0.0,
            "signals": [],
            "model_version": "nlp-unavailable",
            "available": False
        }

# -----------------------------------------------------------------------------
# Email scan (CORE ENDPOINT)
# -----------------------------------------------------------------------------

@app.post("/scan/email")
def scan_email(
    payload: EmailScanRequest,
    _: bool = Depends(authenticate)
):
    # --- URL ML analysis ---
    url_analysis = analyze_urls(payload.urls or [])

    # Normalize for legacy risk_engine
    url_results = [
        {"risk": "high"} if url_analysis.get("score", 0) > 0 else {"risk": "low"}
    ]

    # --- Heuristic text analysis ---
    heuristic_text_findings = analyze_email_text_heuristics(
        payload.subject,
        payload.body
    )

    # --- NLP ML analysis ---
    nlp_result = call_nlp_service(payload.subject, payload.body)
    text_ml_score = float(nlp_result.get("text_ml_score", 0.0))

    # --- Attachment scanning ---
    malware_hits = scan_attachments(payload.attachments or [])

    # --- Risk calculation ---
    try:
        risk = calculate_risk(
            url_results=url_results,
            text_findings=heuristic_text_findings,
            malware_hits=malware_hits,
            text_ml_score=text_ml_score,
            url_ml_score=url_analysis.get("score", 0.0),
            url_ml_signals=url_analysis.get("signals", [])
        )
    except Exception as e:
        print("RISK_ENGINE_ERROR:", repr(e))

        fallback_score = min(
            url_analysis.get("score", 0.0)
            + heuristic_text_findings.get("score", 0.0)
            + text_ml_score,
            1.0
        )

        risk = {
            "risk_score": int(fallback_score * 100),
            "phishing_probability": round(fallback_score, 2),
            "verdict": "SUSPICIOUS" if fallback_score >= 0.5 else "SAFE",
            "explainability": ["Fallback risk calculation used"]
        }

    return success_response({
        "risk": risk,
        "nlp_analysis": nlp_result,
        "url_analysis": url_analysis,
        "email_text_analysis": heuristic_text_findings,
        "malware_analysis": {
            "detected": bool(malware_hits),
            "engine": "clamav",
            "details": malware_hits
        }
    })
