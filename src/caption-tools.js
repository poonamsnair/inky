import { ensureReadableColor } from "./material-tools.js";

const DEFAULT_STYLE = {
  position: "bottom",
  margin: 28,
  maxWidthRatio: 0.72,
  font: "700 26px Avenir Next, Trebuchet MS, Verdana, sans-serif",
  lineHeight: 34,
  paddingX: 20,
  paddingY: 13,
  radius: 8,
  textColor: "#fff8e8",
  backgroundColor: "rgba(24, 18, 12, 0.78)",
  outlineColor: "rgba(255, 244, 214, 0.5)",
  shadowColor: "rgba(0, 0, 0, 0.22)",
};

export function createCaptionTrack({ cues = [], fps = 12, totalFrames = 1, style = {} } = {}) {
  const normalized = cues
    .map((cue, index) => normalizeCaptionCue(cue, index, fps, totalFrames, style))
    .filter((cue) => cue.text && cue.frameEnd >= cue.frameStart)
    .sort((a, b) => a.frameStart - b.frameStart || a.frameEnd - b.frameEnd);

  return {
    fps,
    totalFrames,
    style: { ...DEFAULT_STYLE, ...style },
    cues: normalized,
  };
}

export function captionTrackFromSceneLines(lines, { fps = 12, totalFrames = 1, position = "bottom" } = {}) {
  const textLines = lines.map((line) => line.trim()).filter(Boolean);
  const span = Math.max(1, Math.floor(totalFrames / Math.max(1, textLines.length)));
  const cues = textLines.map((text, index) => ({
    frameStart: index * span,
    frameEnd: index === textLines.length - 1 ? totalFrames - 1 : Math.min(totalFrames - 1, (index + 1) * span - 1),
    text,
    position,
  }));

  return createCaptionTrack({ cues, fps, totalFrames, style: { position } });
}

export function activeCaptionForFrame(track, frame) {
  if (!track?.cues?.length) return null;
  return track.cues.find((cue) => frame >= cue.frameStart && frame <= cue.frameEnd) || null;
}

export function drawCaptionOverlay(ctx, caption, options = {}) {
  if (!caption?.text) return;

  const style = { ...DEFAULT_STYLE, ...(options.style || {}), ...(caption.style || {}) };
  const width = options.width ?? ctx.canvas.width;
  const height = options.height ?? ctx.canvas.height;
  const maxWidth = width * (style.maxWidthRatio ?? DEFAULT_STYLE.maxWidthRatio);
  const font = caption.font || style.font;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = caption.align || "center";
  ctx.textBaseline = "middle";

  const lines = wrapCaptionText(ctx, caption.text, maxWidth);
  const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width), 1);
  const boxWidth = Math.min(maxWidth + style.paddingX * 2, textWidth + style.paddingX * 2);
  const boxHeight = lines.length * style.lineHeight + style.paddingY * 2;
  const x = (width - boxWidth) / 2;
  const y = captionY(caption.position || style.position, height, boxHeight, style.margin);

  ctx.shadowColor = style.shadowColor;
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 5;
  roundedRect(ctx, x, y, boxWidth, boxHeight, style.radius);
  ctx.fillStyle = caption.backgroundColor || style.backgroundColor;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = caption.outlineColor || style.outlineColor;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  const readableText = ensureReadableColor(caption.textColor || style.textColor, caption.backgroundColor || style.backgroundColor, {
    minContrast: style.minTextContrast ?? 4.5,
    dark: "#17120d",
    light: "#fff8e8",
    backdrop: options.backdrop || "#f7eedf",
  });
  ctx.fillStyle = readableText.color;
  const firstLineY = y + style.paddingY + style.lineHeight / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, firstLineY + index * style.lineHeight);
  });

  ctx.restore();
}

export function captionTrackToVtt(track) {
  const cues = track?.cues || [];
  return `WEBVTT\n\n${cues
    .map((cue) => `${cue.id || ""}\n${formatVttTime(cue.start)} --> ${formatVttTime(cue.end)}\n${cue.text}`.trim())
    .join("\n\n")}\n`;
}

export function captionTrackToSrt(track) {
  const cues = track?.cues || [];
  return `${cues
    .map((cue, index) => `${index + 1}\n${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}\n${cue.text}`)
    .join("\n\n")}\n`;
}

export function downloadCaptionText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function normalizeCaptionCue(cue, index, fps, totalFrames, style) {
  const frameStart = cue.frameStart ?? cue.startFrame ?? secondsToFrame(cue.start, fps) ?? 0;
  const rawFrameEnd = cue.frameEnd ?? cue.endFrame ?? secondsToFrame(cue.end, fps, -1);
  const frameEnd = rawFrameEnd ?? totalFrames - 1;
  const safeStart = clamp(Math.round(frameStart), 0, Math.max(0, totalFrames - 1));
  const safeEnd = clamp(Math.round(frameEnd), safeStart, Math.max(0, totalFrames - 1));

  return {
    id: cue.id || `caption-${String(index + 1).padStart(2, "0")}`,
    text: String(cue.text || "").trim(),
    frameStart: safeStart,
    frameEnd: safeEnd,
    start: safeStart / fps,
    end: (safeEnd + 1) / fps,
    position: cue.position || style.position || DEFAULT_STYLE.position,
    align: cue.align || "center",
    style: cue.style,
  };
}

function secondsToFrame(value, fps, offset = 0) {
  if (value == null || value === "") return null;
  const seconds = typeof value === "number" ? value : parseTimestamp(value);
  if (!Number.isFinite(seconds)) return null;
  return Math.max(0, Math.round(seconds * fps) + offset);
}

function parseTimestamp(value) {
  const raw = String(value).trim().replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const parts = raw.split(":").map(Number);
  if (parts.some((part) => Number.isNaN(part))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return NaN;
}

function wrapCaptionText(ctx, text, maxWidth) {
  const words = String(text).replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
      return;
    }
    lines.push(line);
    line = word;
  });

  if (line) lines.push(line);
  return lines.length ? lines.slice(0, 3) : [""];
}

function captionY(position, height, boxHeight, margin) {
  if (position === "top") return margin;
  if (position === "middle") return (height - boxHeight) / 2;
  return height - boxHeight - margin;
}

function roundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function formatVttTime(seconds) {
  const { hours, minutes, wholeSeconds, millis } = splitTime(seconds);
  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)}.${String(millis).padStart(3, "0")}`;
}

function formatSrtTime(seconds) {
  const { hours, minutes, wholeSeconds, millis } = splitTime(seconds);
  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)},${String(millis).padStart(3, "0")}`;
}

function splitTime(seconds) {
  const totalMillis = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMillis / 3600000);
  const minutes = Math.floor((totalMillis % 3600000) / 60000);
  const wholeSeconds = Math.floor((totalMillis % 60000) / 1000);
  const millis = totalMillis % 1000;
  return { hours, minutes, wholeSeconds, millis };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
