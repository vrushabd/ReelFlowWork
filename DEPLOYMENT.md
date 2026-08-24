# Deployment Guide

ReelFlow is designed to run continuously on an Azure Linux VPS.

## 1. Server Provisioning
1. Create a standard Ubuntu 22.04 VM in Azure.
2. Open ports `80` (HTTP), `443` (HTTPS), `3000` (Web UI), and `4000` (API) in the Network Security Group.

## 2. Dependencies Setup
SSH into the server and install Docker:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
```

## 3. Application Deployment
Clone the repository:
```bash
git clone <your-repo-url> reelflow
cd reelflow
```

Create environment file:
```bash
cp .env.example .env
nano .env
```
Ensure you configure:
- `DATABASE_URL` (use internal docker networking if self-hosting Postgres, e.g. `postgresql://reelflow:password@postgres:5432/reelflow`)
- `REDIS_URL` (e.g., `redis://redis:6379`)
- `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`
- `AI_API_KEY`

> **Note:** `DOWNLOADER_API_URL` does **not** need to be set in `.env` when using Docker Compose.
> The `docker-compose.yml` automatically wires the `worker` service to use `http://downloader:8080` via the internal Docker network.

Start the system:
```bash
docker compose up -d --build
```

This starts:
- **postgres** — Database
- **redis** — Job queue
- **downloader** — VirtualPirate/insta-reel-api (headless browser downloader, internal only)
- **api** — REST API on port 4000
- **worker** — Background processor
- **web** — Dashboard on port 3000

## 4. Automatic Recovery
The `docker-compose.yml` is configured with `restart: unless-stopped`. If the Azure VPS reboots, the database, Redis, API, Worker, and Downloader will all automatically restart. BullMQ ensures that any interrupted jobs are retried safely.
