FROM python:3.10-slim

WORKDIR /app

# Install Node.js
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire project
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Go back to root
WORKDIR /app

# Expose port 7860 (HF Spaces default)
EXPOSE 7860

# Start the backend server
# The -m flag runs the module, so we can access backend.app
CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "7860"]
