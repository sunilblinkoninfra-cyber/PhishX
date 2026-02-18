import sys
import joblib
from pathlib import Path

# Ensure project root is on path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BACKEND_DIR))

from nlp.text_cleaning import clean_text


# -----------------------------
# Load trained artifacts
# -----------------------------
MODEL_PATH = BACKEND_DIR / "models" / "phishing_model.pkl"
VECTORIZER_PATH = BACKEND_DIR / "models" / "tfidf_vectorizer.pkl"

model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)


# -----------------------------
# Risk scoring logic
# -----------------------------
def calculate_risk(probability):
    """
    Convert probability (0–1) to risk score and verdict.
    """
    score = int(probability * 100)

    if score < 30:
        verdict = "SAFE"
    elif score < 60:
        verdict = "SUSPICIOUS"
    else:
        verdict = "PHISHING"

    return score, verdict


# -----------------------------
# Prediction function
# -----------------------------
def scan_email(subject, body, urls=""):
    """
    Scan a new email and return risk assessment.
    """

    # Combine inputs
    raw_text = f"{subject} {body} {urls}"

    # Clean text
    cleaned = clean_text(raw_text)

    # Vectorize
    X = vectorizer.transform([cleaned])

    # Predict probability of phishing (label = 1)
    probability = model.predict_proba(X)[0][1]

    # Risk score
    score, verdict = calculate_risk(probability)

    return {
        "phishing_probability": round(float(probability), 4),
        "risk_score": score,
        "verdict": verdict
    }


# -----------------------------
# Manual test
# -----------------------------
if __name__ == "__main__":
    test_subject = "Team meeting tomorrow"
    test_body = "Reminder about the project sync at 10 AM"
    test_urls = ""


    result = scan_email(test_subject, test_body, test_urls)
    print(result)
