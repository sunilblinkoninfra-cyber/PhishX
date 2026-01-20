def scan_attachments(attachments):
    # Placeholder for ClamAV / malware integration
    if not attachments:
        return {"score": 0.0, "signals": []}

    return {
        "score": 0.4,
        "signals": ["Attachments present (manual review recommended)"]
    }
