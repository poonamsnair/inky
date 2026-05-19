import {
  BufferTarget,
  CanvasSource,
  getFirstEncodableVideoCodec,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from "mediabunny";

const PREFERRED_MP4_CODECS = ["avc", "vp9", "av1"];

export async function renderMp4FromCanvasFrames({
  width,
  height,
  fps,
  totalFrames,
  playbackSpeed = 1,
  drawFrame,
  onProgress = () => {},
}) {
  if (typeof VideoEncoder === "undefined") {
    throw new Error("This browser cannot encode MP4 files because WebCodecs is unavailable.");
  }
  if (typeof drawFrame !== "function") {
    throw new Error("This project does not have a frame renderer to export.");
  }

  const safeWidth = positiveInteger(width, 960);
  const safeHeight = positiveInteger(height, 620);
  const safeFps = positiveNumber(fps, 12);
  const safeTotalFrames = positiveInteger(totalFrames, 1);
  const safeSpeed = positiveNumber(playbackSpeed, 1);
  const outputFps = safeFps * safeSpeed;

  onProgress({ phase: "checking-codec", frame: 0, totalFrames: safeTotalFrames });
  const codec = await getFirstEncodableVideoCodec(PREFERRED_MP4_CODECS, {
    width: safeWidth,
    height: safeHeight,
    bitrate: QUALITY_HIGH,
  });

  if (!codec) {
    throw new Error("This browser cannot encode an MP4 video for this canvas size.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = safeWidth;
  canvas.height = safeHeight;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not create a canvas for MP4 export.");

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat(),
    target,
  });
  const videoSource = new CanvasSource(canvas, {
    codec,
    bitrate: QUALITY_HIGH,
    keyFrameInterval: 2,
  });

  output.addVideoTrack(videoSource, { frameRate: outputFps });
  await output.start();

  const frameDuration = 1 / outputFps;
  const keyFrameEvery = Math.max(1, Math.round(outputFps * 2));
  for (let frame = 0; frame < safeTotalFrames; frame++) {
    ctx.save();
    ctx.clearRect(0, 0, safeWidth, safeHeight);
    drawFrame(ctx, frame);
    ctx.restore();

    await videoSource.add(frame * frameDuration, frameDuration, {
      keyFrame: frame % keyFrameEvery === 0,
    });

    onProgress({ phase: "rendering", frame: frame + 1, totalFrames: safeTotalFrames });
    if (frame % 6 === 0) await yieldToBrowser();
  }

  onProgress({ phase: "finalizing", frame: safeTotalFrames, totalFrames: safeTotalFrames });
  await output.finalize();

  const buffer = output.target.buffer;
  if (!buffer) throw new Error("MP4 export finished without producing a video file.");

  return {
    blob: new Blob([buffer], { type: "video/mp4" }),
    codec,
    frameRate: outputFps,
  };
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function yieldToBrowser() {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}
