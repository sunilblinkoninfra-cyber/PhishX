FROM python:3.11-slim

# ------------------------------------------------------------
# System dependencies (minimal + ClamAV)
# ------------------------------------------------------------
RUN apt-get update && apt-get install -y \
    clamav \
    clamav-daemon \
    curl \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------
# Update ClamAV virus database (build-time)
# ------------------------------------------------------------
RUN mkdir -p /var/lib/clamav && freshclam || true

# ------------------------------------------------------------
# Working directory
# ------------------------------------------------------------
WORKDIR /app/backend

# ------------------------------------------------------------
# Python dependencies
# ------------------------------------------------------------
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# ------------------------------------------------------------
# Application source
# ------------------------------------------------------------
COPY . /app

# Ensure both backend modules and top-level services are importable
ENV PYTHONPATH=/app/backend:/app

# ------------------------------------------------------------
# Expose FastAPI port (Render injects $PORT)
# ------------------------------------------------------------
EXPOSE 8000

# ------------------------------------------------------------
# Start FastAPI application (ClamAV runs as a separate service in compose)
CMD uvicorn app_new:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WORKERS:-4}
