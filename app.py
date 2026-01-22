import os
from typing import List, Optional

import requests
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel

from utils.api_response import success_response, error_response
from scanner.url_analyzer import analyze_urls
from scanner.url_reputation import analyze_urls_reputation
from scanner.email_analyzer import analyze_email_text as analyze_email_text_heuristics
from scanner.attachment_scanner import scan_attachments
from scanner.risk_engine import calculate_risk
from scanner.url_ml.url_ml_service import analyze_urls_ml

# --------------------------------------------------
# App init
# --------------------------------------------------

app = FastAPI(
    title="PhishGuard Email Security API",
    version="1.3.2",
    description="Email phishing, malware, NLP, and threat intelligence detection API"
)

# --------------------------------------------------
# Environment
# --------------------------------------------------

API_KEY = os.getenv("API_KEY")
NLP_SERVICE_URL = os.getenv("NLP_SERVICE_URL")

if not API_KEY:
    raise RuntimeError("API_KEY environment variable is required")

print("NLP_SERVICE_URL =", NLP_SERVICE_URL)

# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------
# Auth
# --------------------------------------------------

api_key_header = APIKeyHeader(name="Authorization", auto_error=False)


def authenticate(api_key: Optional[str] = Depends(api_key_header)):
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API key")

    if api_key.lower().startswith("bearer "):
        api_key = api_key.split(" ", 1)[1].strip()

    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

    return True


# --------------------------------------------------
# Global error handler
# --------------------------------------------------

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    print("UNHANDLED_EXCEPTION:", repr(exc))
    return error_response("Internal server error", 500)


# --------------------------------------------------
# Health
# --------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


# --------------------------------------------------
# Schemas
# --------------------------------------------------

class Attachment(BaseModel):
    filename: str
    base64: str


class EmailScanRequest(BaseModel):
    subject: str
    sender: str
    body: str
    urls: List[str] = []
    attachments: List[Attachment] = []


# --------------------------------------------------
# NLP client
# --------------------------------------------------

def call_nlp_service(subject: str, body: str) -> dict:
    if not NLP_SERVICE_URL:
        return {
            "text_ml_score": 0.0,
            "signals": [],
            "model_version": "nlp-unavailable",
            "available": False,
        }

    try:
        resp = requests.post(
            NLP_SERVICE_URL,
            json={"subject": subject, "body": body},
            timeout=5,
        )
        data = resp.json()

        return {
            "text_ml_score": float(data.get("text_ml_score", 0.0)),
            "signals": data.get("signals", []),
            "model_version": data.get("model_version", "unknown"),
            "available": True,
        }

    except Exception as e:
        print("NLP_SERVICE_ERROR:", repr(e))
        return {
            "text_ml_score": 0.0,
            "signals": [],
            "model_version": "nlp-unavailable",
            "available": False,
        }


# --------------------------------------------------
# Main endpoint
# --------------------------------------------------

@app.post("/scan/email")
def scan_email(payload: EmailScanRequest, _: bool = Depends(authenticate)):
    # URL heuristic
    url_analysis = analyze_urls(payload.urls or [])

    url_results = [
        {"risk": "high"} if url_analysis.get("score", 0) > 0 else {"risk": "low"}
    ]

    # URL reputation / ML
    url_reputation = analyze_urls_ml(payload.urls or [])
    url_ml_score = float(url_reputation.get("score", 0.0))
    url_ml_signals = url_reputation.get("signals", [])

    # Heuristic text analysis
    heuristic_text = analyze_email_text_heuristics(
        payload.subject, payload.body
    )

    # NLP
    nlp_result = call_nlp_service(payload.subject, payload.body)
    text_ml_score = float(nlp_result.get("text_ml_score", 0.0))

    # Attachments
    try:
        malware_hits = scan_attachments(payload.attachments or [])
    except Exception as e:
        print("CLAMAV_ERROR:", repr(e))
        malware_hits = []

    # Risk engine
    risk = calculate_risk(
        url_results=url_results,
        text_findings=heuristic_text,
        malware_hits=malware_hits,
        text_ml_score=text_ml_score,
        url_ml_score=url_ml_score,
        url_ml_signals=url_ml_signals,
    )

    return success_response({
        "risk": risk,
        "nlp_analysis": nlp_result,
        "url_analysis": url_reputation,
        "email_text_analysis": heuristic_text,
        "malware_analysis": {
            "detected": bool(malware_hits),
            "engine": "clamav",
            "details": malware_hits,
        },
    })


# --------------------------------------------------
# Render entrypoint
# --------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("app:app", host="0.0.0.0", port=port)
