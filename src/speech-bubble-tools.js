import { ensureReadableColor } from "./material-tools.js";

const DEFAULT_BUBBLE_STYLE = {
  type: "speech",
  fill: "#ffffff",
  stroke: "#17120d",
  textColor: "#17120d",
  font: "700 24px Avenir Next, Trebuchet MS, Verdana, sans-serif",
  lineHeight: 29,
  paddingX: 22,
  paddingY: 16,
  radius: 24,
  strokeWidth: 3.2,
  maxWidth: 330,
  shadowColor: "rgba(0, 0, 0, 0.12)",
  jitter: 1.8,
};

export function createSpeechBubbleTrack({ bubbles = [], fps = 12, totalFrames = 1, style = {} } = {}) {
  const trackStyle = { ...DEFAULT_BUBBLE_STYLE, ...style };
  const normalized = bubbles
    .map((bubble, index) => normalizeBubble(bubble, index, fps, totalFrames, trackStyle))
    .filter((bubble) => bubble.text && bubble.frameEnd >= bubble.frameStart)
    .sort((a, b) => a.frameStart - b.frameStart || a.layer - b.layer);

  return {
    fps,
    totalFrames,
    style: trackStyle,
    bubbles: normalized,
  };
}

export function validateSpeechBubbleOwnership(track, speakerAnchors, options = {}) {
  const maxDistance = options.maxDistance ?? 95;
  const warnings = [];

  (track?.bubbles || []).forEach((bubble) => {
    if (!bubble.speaker || !bubble.tail) return;
    const anchors = typeof speakerAnchors === "function" ? speakerAnchors(bubble) : speakerAnchors;
    const expected = anchors?.[bubble.speaker];
    if (!expected) {
      warnings.push({
        id: bubble.id,
        speaker: bubble.speaker,
        issue: "missing-speaker-anchor",
      });
      return;
    }
    const tip = Array.isArray(bubble.tail) ? { x: bubble.tail[0], y: bubble.tail[1] } : { x: bubble.tail.x ?? bubble.tail.tip?.x, y: bubble.tail.y ?? bubble.tail.tip?.y };
    const distance = Math.hypot((tip.x ?? 0) - expected.x, (tip.y ?? 0) - expected.y);
    if (!Number.isFinite(distance) || distance > maxDistance) {
      warnings.push({
        id: bubble.id,
        speaker: bubble.speaker,
        issue: "tail-too-far-from-speaker",
        distance: Number.isFinite(distance) ? Math.round(distance) : null,
        tail: tip,
        expected,
      });
    }
  });

  return warnings;
}

export function activeSpeechBubblesForFrame(track, frame) {
  if (!track?.bubbles?.length) return [];
  return track.bubbles.filter((bubble) => frame >= bubble.frameStart && frame <= bubble.frameEnd).sort((a, b) => a.layer - b.layer);
}

export function drawSpeechBubbleOverlay(ctx, bubble, options = {}) {
  if (!bubble?.text) return;

  const style = { ...DEFAULT_BUBBLE_STYLE, ...(options.style || {}), ...(bubble.style || {}) };
  const random = options.random || seededRandom(hashString(`${bubble.id}-${bubble.frameStart}-${bubble.text}`));
  const box = measureBubble(ctx, bubble, style);
  const tail = normalizeTail(bubble.tail, box);

  ctx.save();
  ctx.globalAlpha = bubble.alpha ?? 1;
  ctx.shadowColor = style.shadowColor;
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  if (style.type === "thought" || bubble.type === "thought") {
    const fill = bubble.fill || style.fill;
    drawThoughtBubblePath(ctx, box, style, random);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = bubble.stroke || style.stroke;
    ctx.lineWidth = bubble.strokeWidth || style.strokeWidth;
    ctx.stroke();
    drawThoughtDots(ctx, box, tail, { ...style, fill }, random);
  } else {
    const fill = bubble.fill || style.fill;
    drawSpeechBubblePath(ctx, box, tail, style, random);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = bubble.stroke || style.stroke;
    ctx.lineWidth = bubble.strokeWidth || style.strokeWidth;
    ctx.stroke();
  }

  drawBubbleText(ctx, bubble, box, style);
  ctx.restore();
}

export function drawSpeechBubbleTrack(ctx, track, frame, options = {}) {
  const bubbles = activeSpeechBubblesForFrame(track, frame);
  bubbles.forEach((bubble) => {
    drawSpeechBubbleOverlay(ctx, bubble, { ...options, style: track.style });
  });
}

export function speechBubbleTrackToJson(track) {
  return `${JSON.stringify(track, null, 2)}\n`;
}

function normalizeBubble(bubble, index, fps, totalFrames, trackStyle) {
  const frameStart = bubble.frameStart ?? bubble.startFrame ?? secondsToFrame(bubble.start, fps) ?? 0;
  const rawFrameEnd = bubble.frameEnd ?? bubble.endFrame ?? secondsToFrame(bubble.end, fps, -1);
  const frameEnd = rawFrameEnd ?? totalFrames - 1;
  const safeStart = clamp(Math.round(frameStart), 0, Math.max(0, totalFrames - 1));
  const safeEnd = clamp(Math.round(frameEnd), safeStart, Math.max(0, totalFrames - 1));

  return {
    id: bubble.id || `bubble-${String(index + 1).padStart(2, "0")}`,
    text: String(bubble.text || "").trim(),
    frameStart: safeStart,
    frameEnd: safeEnd,
    start: safeStart / fps,
    end: (safeEnd + 1) / fps,
    x: Number(bubble.x ?? trackStyle.x ?? 80),
    y: Number(bubble.y ?? trackStyle.y ?? 50),
    width: bubble.width == null ? null : Number(bubble.width),
    maxWidth: Number(bubble.maxWidth ?? trackStyle.maxWidth),
    type: bubble.type || trackStyle.type,
    speaker: bubble.speaker || null,
    tail: bubble.tail || null,
    layer: Number(bubble.layer || 0),
    align: bubble.align || "center",
    style: bubble.style || null,
  };
}

function measureBubble(ctx, bubble, style) {
  ctx.save();
  ctx.font = bubble.font || style.font;
  const maxTextWidth = Math.max(120, (bubble.width || bubble.maxWidth || style.maxWidth) - style.paddingX * 2);
  const lines = wrapText(ctx, bubble.text, maxTextWidth);
  const textWidth = Math.max(...lines.map((line) => ctx.measureText(line).width), 1);
  const width = bubble.width || Math.min(bubble.maxWidth || style.maxWidth, textWidth + style.paddingX * 2);
  const height = lines.length * style.lineHeight + style.paddingY * 2;
  ctx.restore();

  return {
    x: bubble.x,
    y: bubble.y,
    width,
    height,
    lines,
  };
}

function drawSpeechBubblePath(ctx, box, tail, style, random) {
  const x0 = box.x;
  const y0 = box.y;
  const x1 = box.x + box.width;
  const y1 = box.y + box.height;
  const r = Math.max(4, Math.min(style.radius, box.width / 2 - 2, box.height / 2 - 2));
  const tailShape = tail ? speechTailShape(box, tail, r) : null;

  ctx.beginPath();
  ctx.moveTo(x0 + r, y0);

  if (tailShape?.side === "top") {
    ctx.lineTo(tailShape.start.x, tailShape.start.y);
    drawIntegratedTail(ctx, tailShape);
    ctx.lineTo(x1 - r, y0);
  } else {
    ctx.lineTo(x1 - r, y0);
  }

  ctx.quadraticCurveTo(x1, y0, x1, y0 + r);

  if (tailShape?.side === "right") {
    ctx.lineTo(tailShape.start.x, tailShape.start.y);
    drawIntegratedTail(ctx, tailShape);
    ctx.lineTo(x1, y1 - r);
  } else {
    ctx.lineTo(x1, y1 - r);
  }

  ctx.quadraticCurveTo(x1, y1, x1 - r, y1);

  if (tailShape?.side === "bottom") {
    ctx.lineTo(tailShape.start.x, tailShape.start.y);
    drawIntegratedTail(ctx, tailShape);
    ctx.lineTo(x0 + r, y1);
  } else {
    ctx.lineTo(x0 + r, y1);
  }

  ctx.quadraticCurveTo(x0, y1, x0, y1 - r);

  if (tailShape?.side === "left") {
    ctx.lineTo(tailShape.start.x, tailShape.start.y);
    drawIntegratedTail(ctx, tailShape);
    ctx.lineTo(x0, y0 + r);
  } else {
    ctx.lineTo(x0, y0 + r);
  }

  ctx.quadraticCurveTo(x0, y0, x0 + r, y0);
  ctx.closePath();
}

function drawIntegratedTail(ctx, tailShape) {
  const c1 = {
    x: (tailShape.start.x + tailShape.tip.x) / 2,
    y: (tailShape.start.y + tailShape.tip.y) / 2,
  };
  const c2 = {
    x: (tailShape.end.x + tailShape.tip.x) / 2,
    y: (tailShape.end.y + tailShape.tip.y) / 2,
  };
  ctx.quadraticCurveTo(c1.x, c1.y, tailShape.tip.x, tailShape.tip.y);
  ctx.quadraticCurveTo(c2.x, c2.y, tailShape.end.x, tailShape.end.y);
}

function speechTailShape(box, tail, radius) {
  const x0 = box.x;
  const y0 = box.y;
  const x1 = box.x + box.width;
  const y1 = box.y + box.height;
  const side = tailSideForBox(box, tail.tip);
  const baseWidth = Math.max(14, tail.width || 26);
  const horizontal = side === "top" || side === "bottom";
  const usable = horizontal ? box.width - radius * 2 - 8 : box.height - radius * 2 - 8;
  const half = Math.min(baseWidth / 2, Math.max(7, usable / 2));

  if (side === "top") {
    const x = clamp(tail.base?.x ?? tail.tip.x, x0 + radius + half, x1 - radius - half);
    return { side, start: { x: x - half, y: y0 }, end: { x: x + half, y: y0 }, tip: tail.tip };
  }
  if (side === "right") {
    const y = clamp(tail.base?.y ?? tail.tip.y, y0 + radius + half, y1 - radius - half);
    return { side, start: { x: x1, y: y - half }, end: { x: x1, y: y + half }, tip: tail.tip };
  }
  if (side === "left") {
    const y = clamp(tail.base?.y ?? tail.tip.y, y0 + radius + half, y1 - radius - half);
    return { side, start: { x: x0, y: y + half }, end: { x: x0, y: y - half }, tip: tail.tip };
  }

  const x = clamp(tail.base?.x ?? tail.tip.x, x0 + radius + half, x1 - radius - half);
  return { side: "bottom", start: { x: x + half, y: y1 }, end: { x: x - half, y: y1 }, tip: tail.tip };
}

function tailSideForBox(box, tip) {
  const left = Math.abs(tip.x - box.x);
  const right = Math.abs(tip.x - (box.x + box.width));
  const top = Math.abs(tip.y - box.y);
  const bottom = Math.abs(tip.y - (box.y + box.height));
  const distances = [
    ["left", left],
    ["right", right],
    ["top", top],
    ["bottom", bottom],
  ].sort((a, b) => a[1] - b[1]);
  if (tip.y >= box.y + box.height) return "bottom";
  if (tip.y <= box.y) return "top";
  if (tip.x <= box.x) return "left";
  if (tip.x >= box.x + box.width) return "right";
  return distances[0][0];
}

function drawThoughtBubblePath(ctx, box, style, random) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rx = box.width / 2;
  const ry = box.height / 2;
  const points = [];
  const count = 44;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const wobble = 1 + Math.sin(angle * 7) * 0.04 + (random() - 0.5) * 0.035;
    points.push([cx + Math.cos(angle) * rx * wobble, cy + Math.sin(angle) * ry * wobble]);
  }
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
}

function drawThoughtDots(ctx, box, tail, style, random) {
  if (!tail) return;
  const base = tail.base || nearestTailBase(box, tail.tip);
  const dots = [
    { x: base.x * 0.72 + tail.tip.x * 0.28, y: base.y * 0.72 + tail.tip.y * 0.28, r: 8 },
    { x: base.x * 0.5 + tail.tip.x * 0.5, y: base.y * 0.5 + tail.tip.y * 0.5, r: 5.5 },
    { x: base.x * 0.32 + tail.tip.x * 0.68, y: base.y * 0.32 + tail.tip.y * 0.68, r: 3.6 },
  ];
  dots.forEach((dot) => {
    ctx.beginPath();
    ctx.ellipse(dot.x + (random() - 0.5) * 2, dot.y + (random() - 0.5) * 2, dot.r, dot.r * 0.86, 0, 0, Math.PI * 2);
    ctx.fillStyle = style.fill;
    ctx.fill();
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = Math.max(1.4, style.strokeWidth * 0.66);
    ctx.stroke();
  });
}

function drawBubbleText(ctx, bubble, box, style) {
  ctx.font = bubble.font || style.font;
  const readableText = ensureReadableColor(bubble.textColor || style.textColor, bubble.fill || style.fill, {
    minContrast: style.minTextContrast ?? 4.5,
    dark: "#17120d",
    light: "#fff8e8",
    backdrop: "#f7eedf",
  });
  ctx.fillStyle = readableText.color;
  ctx.textAlign = bubble.align || "center";
  ctx.textBaseline = "middle";
  const x = bubble.align === "left" ? box.x + style.paddingX : box.x + box.width / 2;
  const firstY = box.y + style.paddingY + style.lineHeight / 2;
  box.lines.forEach((line, index) => {
    ctx.fillText(line, x, firstY + index * style.lineHeight);
  });
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  String(text)
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (!line || ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        lines.push(line);
        line = word;
      }
    });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function normalizeTail(tail, box) {
  if (!tail) return null;
  const tip = Array.isArray(tail) ? { x: tail[0], y: tail[1] } : { x: tail.x ?? tail.tip?.x, y: tail.y ?? tail.tip?.y };
  if (!Number.isFinite(tip.x) || !Number.isFinite(tip.y)) return null;
  const base = tail.base ? (Array.isArray(tail.base) ? { x: tail.base[0], y: tail.base[1] } : tail.base) : nearestTailBase(box, tip);
  return { tip, base, width: tail.width };
}

function nearestTailBase(box, tip) {
  const cx = clamp(tip.x, box.x + 20, box.x + box.width - 20);
  if (tip.y > box.y + box.height) return { x: cx, y: box.y + box.height - 4 };
  if (tip.y < box.y) return { x: cx, y: box.y + 4 };
  if (tip.x < box.x) return { x: box.x + 4, y: clamp(tip.y, box.y + 20, box.y + box.height - 20) };
  return { x: box.x + box.width - 4, y: clamp(tip.y, box.y + 20, box.y + box.height - 20) };
}

function roundedRectPoints(x, y, width, height, radius, steps, jitter, random) {
  const corners = [
    { cx: x + width - radius, cy: y + radius, start: -Math.PI / 2, end: 0 },
    { cx: x + width - radius, cy: y + height - radius, start: 0, end: Math.PI / 2 },
    { cx: x + radius, cy: y + height - radius, start: Math.PI / 2, end: Math.PI },
    { cx: x + radius, cy: y + radius, start: Math.PI, end: Math.PI * 1.5 },
  ];
  const points = [];
  corners.forEach((corner) => {
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const angle = corner.start + (corner.end - corner.start) * t;
      points.push([
        corner.cx + Math.cos(angle) * radius + (random() - 0.5) * jitter,
        corner.cy + Math.sin(angle) * radius + (random() - 0.5) * jitter,
      ]);
    }
  });
  return points;
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

function seededRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
