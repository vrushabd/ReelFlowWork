-- Migration: add_video_quality_fields
-- Applied manually via ALTER TABLE on 2026-08-24 because no migrations dir existed.
-- This file serves as a baseline record for Prisma tracking.

ALTER TABLE "Video"
  ADD COLUMN IF NOT EXISTS "sourceWidth"       INTEGER,
  ADD COLUMN IF NOT EXISTS "sourceHeight"      INTEGER,
  ADD COLUMN IF NOT EXISTS "sourceCodec"       TEXT,
  ADD COLUMN IF NOT EXISTS "sourceFps"         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "sourceHasAudio"    BOOLEAN,
  ADD COLUMN IF NOT EXISTS "sourceAudioCodec"  TEXT,
  ADD COLUMN IF NOT EXISTS "audioCodec"        TEXT,
  ADD COLUMN IF NOT EXISTS "audioBitrate"      INTEGER,
  ADD COLUMN IF NOT EXISTS "audioSampleRate"   INTEGER,
  ADD COLUMN IF NOT EXISTS "audioChannels"     INTEGER,
  ADD COLUMN IF NOT EXISTS "cloudinaryPublicId" TEXT,
  ADD COLUMN IF NOT EXISTS "cloudinaryBytes"   BIGINT,
  ADD COLUMN IF NOT EXISTS "cloudinaryWidth"   INTEGER,
  ADD COLUMN IF NOT EXISTS "cloudinaryHeight"  INTEGER,
  ADD COLUMN IF NOT EXISTS "cloudinaryDuration" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "cloudinaryFormat"  TEXT;
