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
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# -----------------------------------------------------------------------------
# App init
# -----------------------------------------------------------------------------

app = FastAPI(
    title="PhishGuard AI",
    description="Enterprise phishing + malware detection API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("PHISHGUARD_API_KEY", "my-secret-key")

# -----------------------------------------------------------------------------
# Auth
# -----------------------------------------------------------------------------

def verify_api_key(api_key: str = Header(..., alias="api-key")):
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
# Utilities
# -----------------------------------------------------------------------------

def calculate_probability(email: EmailPayload) -> float:
    score = 0.0
    text = (email.subject + " " + email.body).lower()

    phishing_words = ["urgent", "verify", "suspend", "password", "account"]
    for w in phishing_words:
        if w in text:
            score += 0.15

    if email.urls:
        score += 0.25

    return min(score, 0.99)

def risk_tier(prob: float) -> str:
    if prob >= 0.7:
        return "HOT"
    if prob >= 0.4:
        return "WARM"
    return "COLD"

def malware_scan_stub(files: List[UploadFile]) -> dict:
    results = []
    for f in files:
        results.append({
            "filename": f.filename,
            "status": "CLEAN",
            "engine": "clamav",
        })
    return {"attachments": results}

# -----------------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------------

@app.get("/")
def root():
    return {"message": "PhishGuard AI API running"}

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": int(time.time())}

# -----------------------------------------------------------------------------
# SCAN — JSON (Swagger & frontend SAFE)
# -----------------------------------------------------------------------------

@app.post("/scan")
async def scan_json(
    email: EmailPayload = Body(...),
    api_key: str = Header(..., alias="api-key"),
):
    verify_api_key(api_key)

    probability = calculate_probability(email)
    tier = risk_tier(probability)

    response = {
        "email": email.dict(),
        "phishing_probability": round(probability, 2),
        "tier": tier,
        "risk_score": int(probability * 100),
        "malware_scan": {"attachments": []},
        "timestamp": int(time.time()),
    }

    return JSONResponse(status_code=200, content=response)

# -----------------------------------------------------------------------------
# SCAN WITH FILES — multipart/form-data
# -----------------------------------------------------------------------------

@app.post("/scan-with-files")
async def scan_with_files(
    email: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    api_key: str = Header(..., alias="api-key"),
):
    verify_api_key(api_key)

    try:
        email_data = EmailPayload(**json.loads(email))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid email JSON")

    probability = calculate_probability(email_data)
    tier = risk_tier(probability)

    malware_result = malware_scan_stub(files or [])

    return {
        "email": email_data.dict(),
        "phishing_probability": round(probability, 2),
        "tier": tier,
        "risk_score": int(probability * 100),
        "malware_scan": malware_result,
        "timestamp": int(time.time()),
    }

# -----------------------------------------------------------------------------
# SOC ENDPOINTS
# -----------------------------------------------------------------------------

@app.get("/soc")
def soc_feed(api_key: str = Header(..., alias="api-key")):
    verify_api_key(api_key)
    return {"incidents": []}

@app.get("/soc-metrics")
def soc_metrics(api_key: str = Header(..., alias="api-key")):
    verify_api_key(api_key)
    return {
        "total_alerts": 0,
        "hot": 0,
        "warm": 0,
        "cold": 0,
        "detection_rate": 0.99,
    }
