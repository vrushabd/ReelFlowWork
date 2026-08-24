# ReelFlow - Instagram Automation Platform

ReelFlow is a full-stack, production-ready web application for automating Instagram Reel content management. 

## Features
- **Queue System**: Process authorized reels through a multi-stage background pipeline.
- **Duplicate Detection**: Advanced URL normalization and SHA-256 file hashing prevents re-uploading identical videos.
- **Video Processing**: Automatically normalizes video formats using FFmpeg (9:16 aspect ratio, optimized bitrate).
- **AI Captions**: Automatically generates captions and hashtags using AI (e.g. OpenAI/Gemini).
- **Scheduling**: BullMQ delayed jobs let you schedule posts in advance.
- **Safe Publishing**: Configurable daily rate limits strictly adhere to Meta API guidelines to keep your account safe.

## Architecture
- **Frontend**: Next.js 14 App Router, Tailwind CSS, shadcn/ui.
- **Backend API**: Node.js + Express REST API.
- **Worker**: Independent Node.js background processor.
- **Queue**: Redis + BullMQ.
- **Database**: PostgreSQL + Prisma ORM.

## Setup
1. Copy `.env.example` to `.env` and fill in credentials.
2. Run `docker compose up -d`
3. Access the dashboard at `http://localhost:3000`.

*Note: This platform strictly adheres to Meta's Content Publishing API and requires an Instagram Professional Account. It is not designed for unauthorized mass scraping or copyright infringement.*

# ReelFlow
