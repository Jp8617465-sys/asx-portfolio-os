FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for LightGBM and other packages
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Create output directories with proper permissions
# Note: Using 755 for security - writable only by owner
RUN mkdir -p /app/outputs /app/data/training && \
    chmod -R 755 /app/outputs /app/data/training

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:10000/health', timeout=5).raise_for_status()" || exit 1

EXPOSE 10000

# Add startup logging
CMD echo "🚀 Starting ASX Portfolio OS API..." && \
    echo "📁 Working directory: $(pwd)" && \
    echo "📁 Output directory exists: $(test -d /app/outputs && echo 'YES' || echo 'NO')" && \
    echo "📁 Output directory permissions: $(ls -ld /app/outputs)" && \
    uvicorn app.main:app --host 0.0.0.0 --port 10000
