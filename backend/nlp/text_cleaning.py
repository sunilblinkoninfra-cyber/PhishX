import re
import nltk
from nltk.corpus import stopwords

# Load English stopwords once
STOP_WORDS = set(stopwords.words("english"))


def clean_text(text):
    """
    Clean raw email text for NLP processing.
    Input: raw string
    Output: cleaned string
    """

    # 1. Convert to lowercase
    text = text.lower()

    # 2. Remove URLs
    text = re.sub(r"http\S+|www\S+", "", text)

    # 3. Remove numbers
    text = re.sub(r"\d+", "", text)

    # 4. Remove punctuation
    text = re.sub(r"[^\w\s]", "", text)

    # 5. Remove extra spaces
    text = re.sub(r"\s+", " ", text).strip()

    # 6. Remove stopwords
    words = text.split()
    words = [word for word in words if word not in STOP_WORDS]

    return " ".join(words)
