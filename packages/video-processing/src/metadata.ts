import ffmpeg from 'fluent-ffmpeg';

export interface VideoStats {
  width: number;
  height: number;
  duration: number;
  fps: number;
  codec: string;
  pixelFormat?: string;
  bitrate?: number;
  size: number;
  format?: string;
  hasAudio: boolean;
  audioCodec?: string;
  audioBitrate?: number;
  audioSampleRate?: number;
  audioChannels?: number;
}

export function getVideoMetadata(filePath: string): Promise<VideoStats> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      if (!videoStream) {
        return reject(new Error('No video stream found in file.'));
      }

      // Calculate approximate FPS
      let fps = 30;
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split('/');
        if (num && den) {
          fps = parseInt(num, 10) / parseInt(den, 10);
        }
      }

      resolve({
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        duration: metadata.format.duration || 0,
        fps,
        codec: videoStream.codec_name || 'unknown',
        pixelFormat: videoStream.pix_fmt,
        bitrate: videoStream.bit_rate ? parseInt(videoStream.bit_rate, 10) : undefined,
        size: Number(metadata.format.size || 0),
        format: metadata.format.format_name,
        hasAudio: !!audioStream,
        audioCodec: audioStream?.codec_name,
        audioBitrate: audioStream?.bit_rate ? parseInt(audioStream.bit_rate, 10) : undefined,
        audioSampleRate: audioStream?.sample_rate ? Number(audioStream.sample_rate) : undefined,
        audioChannels: audioStream?.channels,
      });
    });
  });
}
