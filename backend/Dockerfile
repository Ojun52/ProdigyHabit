# === 1. Base Stage: Common runtime dependencies ===
FROM python:3.11-slim AS base
# Install only the runtime dependencies for PostgreSQL
RUN apt-get update && apt-get install -y libpq5 --no-install-recommends && rm -rf /var/lib/apt/lists/*

# === 2. Builder Stage: For installing python packages ===
FROM base AS builder
# Install build tools for python packages
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
# Install packages into a separate directory to be copied to other stages
RUN pip install --prefix=/install -r requirements.txt

# === 3. Dev Stage: For local development with hot-reloading ===
FROM builder AS dev
WORKDIR /app
# Install packages directly for development, including any dev-specific ones if added later
RUN pip install -r requirements.txt
# Set the default command for development with debug mode
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000", "--debug"]

# === 4. Prod Stage: For running in production ===
FROM base AS prod
WORKDIR /app
# Copy installed packages from the builder stage
COPY --from=builder /install /usr/local
# Copy application source code
COPY . .
# Create a non-root user and switch to it
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser
# Set the entrypoint to run Gunicorn
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:5000", "app:app"]