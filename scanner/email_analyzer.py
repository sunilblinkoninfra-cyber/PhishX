def analyze_email_text(subject: str, body: str):
    text = f"{subject} {body}".lower()
    score = 0.0
    signals = []

    keywords = [
        ("urgent", 0.2),
        ("verify", 0.2),
        ("suspended", 0.3),
        ("password", 0.3),
        ("immediately", 0.2),
    ]

    for word, weight in keywords:
        if word in text:
            signals.append(f"Keyword detected: {word}")
            score += weight

    return {
        "score": min(score, 1.0),
        "signals": signals
    }
