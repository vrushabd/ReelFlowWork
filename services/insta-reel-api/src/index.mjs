import express from "express";
import cors from "cors";
import { execFile } from "child_process";
import { promisify } from "util";
import { createReadStream, existsSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { getReelInfo } from "./parser/insta-reel.parser.mjs";

import * as dotenv from "dotenv";
dotenv.config();

const execFileAsync = promisify(execFile);
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors({ origin: "*" }));

// ─── GET / ─ fetch metadata only (no download) ────────────────────────────
app.get("/", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing 'url' query parameter." });

  try {
    console.log(`[GET] Fetching reel info for: ${url}`);
    const info = await getReelInfo(url);
    if (!info || !info.download_link) {
      return res.status(502).json({ error: "Could not extract download link from the reel." });
    }
    console.log(`[OK] Successfully extracted info for: ${url} (${info.width}x${info.height})`);
    res.json(info);
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /download ─ download highest-quality file and stream it back ─────
// Worker calls this to get a ready-made high-quality MP4 (muxed if needed)
app.get("/download", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing 'url' query parameter." });

  const tmpFile = join(tmpdir(), `reel_${randomUUID()}.mp4`);

  try {
    console.log(`[DOWNLOAD] Starting best-quality download for: ${url}`);

    // yt-dlp downloads and auto-muxes the best video+audio into a single MP4
    await execFileAsync(
      "yt-dlp",
      [
        "--no-playlist",
        "--no-warnings",
        "--quiet",
        "--format", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best",
        "--merge-output-format", "mp4",
        "--output", tmpFile,
        "--socket-timeout", "30",
        url,
      ],
      { timeout: 300000 }  // 5 minute timeout for large files
    );

    if (!existsSync(tmpFile)) {
      return res.status(500).json({ error: "yt-dlp did not produce output file." });
    }

    console.log(`[DOWNLOAD] Download complete, streaming to worker: ${url}`);

    // Stream the file back to the worker, then delete temp file
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="reel.mp4"`);
    const stream = createReadStream(tmpFile);
    stream.pipe(res);
    stream.on("close", () => {
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
      console.log(`[DOWNLOAD] Temp file cleaned up`);
    });
    stream.on("error", (err) => {
      console.error(`[DOWNLOAD] Stream error: ${err.message}`);
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
    });
  } catch (error) {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
    console.error(`[DOWNLOAD] Failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /formats ─ list all available formats (debug) ───────────────────
app.get("/formats", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing 'url' query parameter." });

  try {
    const { stdout } = await execFileAsync(
      "yt-dlp",
      ["--list-formats", "--no-warnings", "--quiet", url],
      { timeout: 60000 }
    );
    res.type("text").send(stdout);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Health check ─────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Legacy ping
app.get("/ping", (req, res) => {
  res.json({ health: "fine" });
});

app.listen(PORT, () => {
  console.log(`🚀 Insta Downloader API listening on port ${PORT}`);
});
