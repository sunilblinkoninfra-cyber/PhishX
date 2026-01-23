from joblib import load
from pathlib import Path
from scanner.feature_extractor import extract_url_features
import pandas as pd

MODEL_PATH = Path("models/url_rf_v2.joblib")

_model = None

def load_model():
    global _model
    if _model is None and MODEL_PATH.exists():
        _model = load(MODEL_PATH)

def analyze_urls(urls: list[str]) -> dict:
    load_model()

    if not urls or _model is None:
        return {"score": 0.0, "signals": [], "model": "url-ml-unavailable"}

    features = pd.DataFrame([extract_url_features(u) for u in urls])
    probs = _model.predict_proba(features)[:, 1]

    score = float(probs.max())
    signals = [f"High-risk URL detected ({round(score,2)})"] if score > 0.7 else []

    return {
        "score": score,
        "signals": signals,
        "model": "url-ml-v2"
    }
