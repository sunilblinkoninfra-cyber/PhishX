import json
import os
import time
from typing import List, Optional

from fastapi import (
    FastAPI,
    Header,
    HTTPException,
    UploadFile,
    File,
    Form,
    Body,
    Depends,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# -----------------------------------------------------------------------------
# App initialization
# -----------------------------------------------------------------------------

app = FastAPI(
    title="PhishGuard AI",
    description="Enterprise phishing + malware detection API",
    version="1.0.0",
)

# -----------------------------------------------------------------------------
# CORS (FIXED for Lovable + Render)
# -----------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://phish-halt.lovable.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["api-key", "content-type"],
)

# -----------------------------------------------------------------------------
# API Key
# -----------------------------------------------------------------------------

API_KEY = os.getenv("PHISHGUARD_API_KEY")

if not API_KEY:
    raise RuntimeError("PHISHGUARD_API_KEY is not set")

def require_api_key(api_key: str = Header(..., alias="api-key")):
    if api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

# -----------------------------------------------------------------------------
# Models
# -----------------------------------------------------------------------------

class EmailPayload(BaseModel):
    subject: str
    body: str
    urls: List[str] = []

# -----------------------------------------------------------------------------
# Detection Logic (Stub)
# -----------------------------------------------------------------------------

def calculate_probability(email: EmailPayload) -> float:
    score = 0.0
    text = f"{email.subject} {email.body}".lower()

    phishing_words = ["urgent", "verify", "suspend", "password", "account"]
    for word in phishing_words:
        if word in text:
            score += 0.15

    if email.urls:
        score += 0.25

    return min(score, 0.99)

def risk_tier(probability: float) -> str:
    if probability >= 0.7:
        return "HOT"
    if probability >= 0.4:
        return "WARM"
    return "COLD"

def malware_scan_stub(files: List[UploadFile]) -> dict:
    return {
        "attachments": [
            {
                "filename": f.filename,
                "status": "CLEAN",
                "engine": "clamav",
            }
            for f in files
        ]
    }

# -----------------------------------------------------------------------------
# Health
# -----------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "PhishGuard AI API running"}

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": int(time.time())}

# -----------------------------------------------------------------------------
# Scan — JSON (Lovable SAFE)
# -----------------------------------------------------------------------------

@app.post("/scan")
async def scan_json(
    email: EmailPayload = Body(...),
    _: None = Depends(require_api_key),
):
    probability = calculate_probability(email)
    tier = risk_tier(probability)

    return JSONResponse(
        status_code=200,
        content={
            "email": email.dict(),
            "phishing_probability": round(probability, 2),
            "risk_score": int(probability * 100),
            "tier": tier,
            "malware_scan": {"attachments": []},
            "timestamp": int(time.time()),
        },
    )

# -----------------------------------------------------------------------------
# Scan with attachments — multipart/form-data
# -----------------------------------------------------------------------------

@app.post("/scan-with-files")
async def scan_with_files(
    email: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    _: None = Depends(require_api_key),
):
    try:
        email_payload = EmailPayload(**json.loads(email))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid email JSON")

    probability = calculate_probability(email_payload)
    tier = risk_tier(probability)

    return {
        "email": email_payload.dict(),
        "phishing_probability": round(probability, 2),
        "risk_score": int(probability * 100),
        "tier": tier,
        "malware_scan": malware_scan_stub(files or []),
        "timestamp": int(time.time()),
    }

# -----------------------------------------------------------------------------
# SOC Endpoints
# -----------------------------------------------------------------------------

@app.get("/soc/feed")
def soc_feed(_: None = Depends(require_api_key)):
    return {"incidents": []}

@app.get("/soc/metrics")
def soc_metrics(_: None = Depends(require_api_key)):
    return {
        "total_alerts": 0,
        "hot": 0,
        "warm": 0,
        "cold": 0,
        "detection_rate": 0.99,
    }
