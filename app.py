import os
import uuid
import json
from typing import List, Optional
from enum import Enum

import requests
from fastapi import FastAPI, Depends, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from db import get_db
from models.soc import (
    FalsePositiveRequest,
    ConfirmMaliciousRequest,
    ReleaseQuarantineRequest,
)

from scanner.url_ml_v2 import analyze_urls
from scanner.risk_engine import calculate_risk

# --------------------------------------------------
# App init
# --------------------------------------------------

app = FastAPI(
    title="PhishGuardAI Backend",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# --------------------------------------------------
# GLOBAL EXCEPTION HANDLER (ONE ONLY)
# --------------------------------------------------

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    print("UNHANDLED_EXCEPTION:", repr(exc))
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": "Internal server error"},
    )

# --------------------------------------------------
# Environment
# --------------------------------------------------

API_KEY = os.getenv("API_KEY")
NLP_SERVICE_URL = os.getenv("NLP_SERVICE_URL")

if not API_KEY:
    raise RuntimeError("API_KEY environment variable is required")

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
# Auth (FIXED)
# --------------------------------------------------

api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

def authenticate(api_key: Optional[str] = Depends(api_key_header)):
    if not api_key:
        raise HTTPException(status_code=401, detail="Missing API key")

    api_key = api_key.strip()

    # Accept both:
    # Authorization: my-key
    # Authorization: Bearer my-key
    if api_key.lower().startswith("bearer "):
        api_key = api_key.split(" ", 1)[1].strip()

    if api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return True

# --------------------------------------------------
# Tenant Resolution
# --------------------------------------------------

def resolve_tenant(x_tenant_id: str = Header(..., alias="X-Tenant-ID")) -> str:
    if not x_tenant_id:
        raise HTTPException(status_code=400, detail="X-Tenant-ID required")
    return x_tenant_id

# --------------------------------------------------
# Health
# --------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}

# --------------------------------------------------
# Models
# --------------------------------------------------

class EmailCategory(str, Enum):
    COLD = "COLD"
    WARM = "WARM"
    HOT = "HOT"

class Decision(str, Enum):
    ALLOW = "ALLOW"
    QUARANTINE = "QUARANTINE"

class Attachment(BaseModel):
    filename: str
    base64: str

class EmailIngestRequest(BaseModel):
    subject: str
    sender: str
    body: str
    urls: List[str] = []
    attachments: List[Attachment] = []

# --------------------------------------------------
# Tenant Policy
# --------------------------------------------------

def get_active_policy(tenant_id: str):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT cold_threshold, warm_threshold
        FROM tenant_policies
        WHERE tenant_id = %s AND active = TRUE
        ORDER BY created_at DESC
        LIMIT 1
    """, (tenant_id,))

    row = cur.fetchone()
    cur.close()
    conn.close()

    if not row:
        return {"cold": 40, "warm": 75}

    return {
        "cold": int(row["cold_threshold"]),
        "warm": int(row["warm_threshold"]),
    }

# --------------------------------------------------
# NLP
# --------------------------------------------------

def call_nlp_service(subject: str, body: str) -> dict:
    if not NLP_SERVICE_URL:
        return {"text_ml_score": 0.0, "model_version": "disabled"}

    try:
        r = requests.post(
            NLP_SERVICE_URL,
            json={"subject": subject, "body": body},
            timeout=2,
        )
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print("NLP ERROR:", repr(e))
        return {"text_ml_score": 0.0, "model_version": "error"}

# --------------------------------------------------
# Persist Decision
# --------------------------------------------------

def persist_decision(
    email_id: str,
    risk_score: int,
    category: EmailCategory,
    decision: Decision,
    findings: dict,
):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO email_decisions
        (id, risk_score, category, decision, findings)
        VALUES (%s, %s, %s, %s, %s)
    """, (
        email_id,
        risk_score,
        category,
        decision,
        json.dumps(findings),
    ))

    if category in (EmailCategory.WARM, EmailCategory.HOT):
        cur.execute("""
            INSERT INTO soc_alerts (id, email_id, category)
            VALUES (%s, %s, %s)
        """, (
            str(uuid.uuid4()),
            email_id,
            category,
        ))

    conn.commit()
    cur.close()
    conn.close()

# --------------------------------------------------
# INGEST ENDPOINT (FIXED)
# --------------------------------------------------

@app.post("/ingest/email", dependencies=[Depends(authenticate)])
def ingest_email(
    payload: EmailIngestRequest,
    tenant_id: str = Depends(resolve_tenant),
):
    policy = get_active_policy(tenant_id)

    required_keys = {"cold_threshold", "warm_threshold"}
    missing = required_keys - policy.keys()
    if missing:
        raise RuntimeError(f"Invalid policy config, missing: {missing}")

    nlp = call_nlp_service(payload.subject, payload.body)
    text_score = float(nlp.get("text_ml_score", 0.0))

    url_result = analyze_urls(payload.urls) if payload.urls else []

    risk_eval = calculate_risk(
        text_ml_score=text_score,
        text_findings={},
        url_result=url_result,
        malware_hits=[],
    )

    # HARD NORMALIZATION
    if isinstance(risk_eval, dict):
        risk_score = int(risk_eval.get("risk_score", 0))
        findings = risk_eval.get("findings", {})
    else:
        risk_score = int(risk_eval)
        findings = {}

    cold_threshold = int(policy["cold_threshold"])
    warm_threshold = int(policy["warm_threshold"])

    if risk_score >= warm_threshold:
        category = EmailCategory.HOT
        decision = Decision.QUARANTINE
    elif risk_score >= cold_threshold:
        category = EmailCategory.WARM
        decision = Decision.ALLOW
    else:
        category = EmailCategory.COLD
        decision = Decision.ALLOW

    email_id = str(uuid.uuid4())
    persist_decision(email_id, risk_score, category, decision, findings)

    return {
        "email_id": email_id,
        "risk_score": risk_score,
        "category": category,
        "decision": decision,
        "findings": findings,
    }

# --------------------------------------------------
# SMTP Enforcement
# --------------------------------------------------

@app.post("/enforce/smtp", dependencies=[Depends(authenticate)])
def enforce_smtp(payload: dict):
    result = ingest_email(
        EmailIngestRequest(
            subject=payload.get("subject", ""),
            sender=payload["mail_from"],
            body=payload.get("body", ""),
            urls=payload.get("urls", []),
            attachments=[],
        ),
        payload["tenant_id"],
    )

    if result["category"] == EmailCategory.HOT:
        return {"smtp_code": 550, "message": "Rejected"}

    return {"smtp_code": 250, "message": "Accepted"}

# --------------------------------------------------
# Graph Enforcement
# --------------------------------------------------

@app.post("/enforce/graph", dependencies=[Depends(authenticate)])
def enforce_graph(payload: dict):
    ingest_email(
        EmailIngestRequest(
            subject=payload["subject"],
            sender=payload["sender"],
            body=payload["body"],
            urls=payload.get("urls", []),
            attachments=[],
        ),
        payload["tenant_id"],
    )
    return {"status": "processed"}

# --------------------------------------------------
# SOC Actions (UNCHANGED)
# --------------------------------------------------

@app.post("/soc/false-positive", dependencies=[Depends(authenticate)])
def mark_false_positive(payload: FalsePositiveRequest):
    return {"status": "ok"}

@app.post("/soc/confirm-malicious", dependencies=[Depends(authenticate)])
def confirm_malicious(payload: ConfirmMaliciousRequest):
    return {"status": "ok"}

@app.post("/soc/release-quarantine", dependencies=[Depends(authenticate)])
def release_quarantine(payload: ReleaseQuarantineRequest):
    return {"status": "ok"}

# --------------------------------------------------
# Entrypoint
# --------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT", 10000)))
