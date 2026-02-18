import sys
from pathlib import Path

# Add project root to Python path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BACKEND_DIR))


import pandas as pd
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report

from nlp.feature_extraction import create_tfidf_features


def train_phishing_model():
    # Load cleaned dataset
    df = pd.read_csv(BACKEND_DIR / "data" / "processed" / "emails_cleaned.csv")

    X_text = df["clean_text"]
    y = df["label"]

    # Convert text to TF-IDF features
    X, vectorizer = create_tfidf_features(X_text)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    # Train model
    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)

    print("Accuracy:", accuracy_score(y_test, y_pred))
    print("\nClassification Report:\n")
    print(classification_report(y_test, y_pred))

    # Save artifacts
    joblib.dump(model, BACKEND_DIR / "models" / "phishing_model.pkl")
    joblib.dump(vectorizer, BACKEND_DIR / "models" / "tfidf_vectorizer.pkl")

    print("\nModel and vectorizer saved successfully.")


if __name__ == "__main__":
    train_phishing_model()
