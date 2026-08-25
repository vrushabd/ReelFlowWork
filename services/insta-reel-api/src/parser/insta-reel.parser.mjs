import { execFile } from "child_process";
import { promisify } from "util";
import removeQueryFromUrl from "../utils/remove-query-from-url.mjs";

const execFileAsync = promisify(execFile);

/**
 * Use yt-dlp to extract the best available quality metadata for an Instagram reel.
 * Returns the best combined download URL and separate video/audio URLs when available.
 */
export async function getReelInfo(url) {
  const clean_url = removeQueryFromUrl(url);
  console.log(`[PARSER] Running yt-dlp for: ${clean_url}`);

  try {
    // Use --format bestvideo+bestaudio/best to prefer best quality
    // --dump-json returns metadata without downloading
    const { stdout } = await execFileAsync(
      "yt-dlp",
      [
        "--dump-json",
        "--no-playlist",
        "--no-warnings",
        "--quiet",
        "--format", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best",
        "--socket-timeout", "30",
        clean_url,
      ],
      { timeout: 60000 }
    );

    const info = JSON.parse(stdout);

    // Determine download strategy
    let download_link = null;
    let video_url = null;
    let audio_url = null;
    let needs_mux = false;
    let best_width = info.width || 0;
    let best_height = info.height || 0;
    let best_fps = info.fps || 30;
    let vcodec = info.vcodec || "unknown";
    let acodec = info.acodec || "unknown";

    if (info.requested_formats && info.requested_formats.length >= 2) {
      // Separate video and audio streams — need muxing
      const videoFmt = info.requested_formats.find(f => f.vcodec && f.vcodec !== "none");
      const audioFmt = info.requested_formats.find(f => f.acodec && f.acodec !== "none" && (!f.vcodec || f.vcodec === "none"));
      if (videoFmt && audioFmt) {
        video_url = videoFmt.url;
        audio_url = audioFmt.url;
        needs_mux = true;
        best_width = videoFmt.width || best_width;
        best_height = videoFmt.height || best_height;
        best_fps = videoFmt.fps || best_fps;
        vcodec = videoFmt.vcodec || vcodec;
        acodec = audioFmt.acodec || acodec;
        download_link = video_url; // fallback
      }
    }

    if (!download_link) {
      // Single combined format
      if (info.url) {
        download_link = info.url;
      } else if (info.formats && info.formats.length > 0) {
        // Pick highest resolution available
        const mp4Formats = info.formats.filter(f => f.url && (f.ext === "mp4" || f.ext === "m4a"));
        const sorted = mp4Formats.sort((a, b) => {
          const resA = (a.width || 0) * (a.height || 0);
          const resB = (b.width || 0) * (b.height || 0);
          return resB - resA;
        });
        const best = sorted[0] || info.formats[info.formats.length - 1];
        download_link = best.url;
        best_width = best.width || best_width;
        best_height = best.height || best_height;
        best_fps = best.fps || best_fps;
        vcodec = best.vcodec || vcodec;
        acodec = best.acodec || acodec;
      }
    }

    return {
      title: info.title || info.description || "Instagram Reel",
      url: clean_url,
      description: info.description || "",
      thumbnail: info.thumbnail || "",
      download_link,
      video_url,
      audio_url,
      needs_mux,
      width: best_width,
      height: best_height,
      fps: best_fps,
      vcodec,
      acodec,
    };
  } catch (err) {
    const errMsg = err.stderr || err.message || String(err);
    console.error(`[PARSER] yt-dlp failed: ${errMsg}`);
    throw new Error(`yt-dlp extraction failed: ${errMsg}`);
  }
}
