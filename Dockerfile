# ---- Stage 1: Builder ----
FROM python:3.11-slim AS builder

WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- Stage 2: Runtime ----
FROM python:3.11-slim

# Install minimal runtime dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo \
    zlib1g \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code and model
COPY main.py .
COPY student_model.onnx .
COPY student_model.onnx.data .

# Environment variables
ENV ANTINUDE_API_KEY=""
ENV PORT=8000

# Expose port
EXPOSE ${PORT}

# Healthcheck using the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:${PORT}/health || exit 1

# Run with gunicorn + uvicorn workers
CMD ["sh", "-c", "gunicorn main:app -w 2 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:${PORT}"]
