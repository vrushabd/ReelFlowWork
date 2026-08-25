# Use multi-arch compatible node image (no platform lock)
FROM node:20-slim

# Install yt-dlp and its dependencies (python3, ffmpeg, curl)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    wget \
    --no-install-recommends && \
    # Install yt-dlp via curl (latest stable binary)
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    # Verify installation
    yt-dlp --version && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=optional

COPY . .

EXPOSE 8080

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["npm", "run", "start"]
