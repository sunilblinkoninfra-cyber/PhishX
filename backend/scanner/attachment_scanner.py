import base64
import subprocess
import tempfile
import os
import shutil


def scan_attachments(attachments: list) -> list:
    """
    Scan attachments using ClamAV (if available).
    Never raises exceptions – safe for production.
    """

    findings = []

    if not attachments:
        return findings

    # Check if clamscan exists
    clamscan_path = shutil.which("clamscan")
    if not clamscan_path:
        print("ClamAV not available – skipping attachment scan")
        return findings

    for attachment in attachments:
        filename = attachment.get("filename", "attachment.bin")
        encoded = attachment.get("base64")

        if not encoded:
            continue

        tmp_path = None

        try:
            file_bytes = base64.b64decode(encoded, validate=True)

            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name

            result = subprocess.run(
                [clamscan_path, "--no-summary", tmp_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=10,
                text=True
            )

            output = result.stdout.strip()

            if "FOUND" in output:
                findings.append({
                    "filename": filename,
                    "engine": "clamav",
                    "signature": output.split(":")[-1].replace("FOUND", "").strip()
                })

        except Exception as e:
            print("ATTACHMENT_SCAN_ERROR:", repr(e))

        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

    return findings
