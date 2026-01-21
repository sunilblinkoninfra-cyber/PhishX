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
WORKDIR /app

# ------------------------------------------------------------
# Python dependencies
# ------------------------------------------------------------
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ------------------------------------------------------------
# Application source
# ------------------------------------------------------------
COPY . .

# ------------------------------------------------------------
# Expose FastAPI port (Render injects $PORT)
# ------------------------------------------------------------
EXPOSE 8000

# ------------------------------------------------------------
# Start ClamAV daemon + FastAPI
# ------------------------------------------------------------
CMD service clamav-daemon start && \
    uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
