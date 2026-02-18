from sklearn.feature_extraction.text import TfidfVectorizer
import joblib
from pathlib import Path


def create_tfidf_features(texts, max_features=2000):
    """
    Convert cleaned text into TF-IDF features.
    """

    vectorizer = TfidfVectorizer(
        max_features=max_features,
        ngram_range=(1, 1),
        min_df=2,
        max_df=0.95
    )

    X = vectorizer.fit_transform(texts)

    return X, vectorizer


def save_vectorizer(vectorizer, path=None):
    if path is None:
        path = Path(__file__).resolve().parents[1] / "models" / "tfidf_vectorizer.pkl"
    joblib.dump(vectorizer, path)
