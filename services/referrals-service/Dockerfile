FROM python:3.11-slim

# Set environment variables
ENV PYTHONPATH="/app:/app/libs"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY services/referrals-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared libraries
COPY libs/python_shared /app/libs/python_shared

# Copy application code
COPY services/referrals-service/app/ /app/

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash ofair_user
RUN chown -R ofair_user:ofair_user /app
USER ofair_user

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]