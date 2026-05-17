import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

if (args.length < 2 || args.includes("--help")) {
  printUsage();
  process.exit(args.includes("--help") ? 0 : 1);
}

const [inputPath, outputPath, ...flags] = args;
const options = parseFlags(flags);
const fps = Number(options.fps || 12);
const totalFrames = Number(options.frames || options.totalFrames || 90);
const style = {
  font: options.font || "700 24px Avenir Next, Trebuchet MS, Verdana, sans-serif",
  maxWidth: Number(options.maxWidth || 330),
  ...(options.strokeWidth ? { strokeWidth: Number(options.strokeWidth) } : {}),
};

const source = fs.readFileSync(inputPath, "utf8");
const bubbles = inputPath.endsWith(".json") ? bubblesFromJson(source) : bubblesFromText(source, totalFrames);
const track = normalizeTrack({ fps, totalFrames, style, bubbles });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(track, null, 2)}\n`);
console.log(`Created ${track.bubbles.length} speech bubble cue(s) at ${outputPath}`);

function bubblesFromJson(sourceText) {
  const parsed = JSON.parse(sourceText);
  return Array.isArray(parsed) ? parsed : parsed.bubbles || [];
}

function bubblesFromText(sourceText, frameCount) {
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  const explicit = [];
  const automatic = [];

  lines.forEach((line) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length >= 2 && /^(\d+)\s*[-–]\s*(\d+)$/.test(parts[0])) {
      const [, start, end] = parts[0].match(/^(\d+)\s*[-–]\s*(\d+)$/);
      explicit.push(parseBubbleParts(parts, Number(start), Number(end)));
      return;
    }
    automatic.push(line);
  });

  if (!automatic.length) return explicit;

  const remainingStart = explicit.length ? Math.min(frameCount - 1, Math.max(...explicit.map((bubble) => bubble.frameEnd)) + 1) : 0;
  const span = Math.max(1, Math.floor((frameCount - remainingStart) / automatic.length));
  const autoBubbles = automatic.map((line, index) => {
    const frameStart = remainingStart + index * span;
    const frameEnd = index === automatic.length - 1 ? frameCount - 1 : Math.min(frameCount - 1, remainingStart + (index + 1) * span - 1);
    return parseBubbleParts(line.split("|").map((part) => part.trim()), frameStart, frameEnd);
  });

  return [...explicit, ...autoBubbles];
}

function parseBubbleParts(parts, frameStart, frameEnd) {
  const text = parts[1] || parts[0] || "";
  const bubble = {
    frameStart,
    frameEnd,
    text,
  };

  if (parts[2]) {
    const [x, y, width] = parts[2].split(",").map(Number);
    if (Number.isFinite(x)) bubble.x = x;
    if (Number.isFinite(y)) bubble.y = y;
    if (Number.isFinite(width)) bubble.width = width;
  }

  if (parts[3]) {
    const [x, y, baseX, baseY] = parts[3].split(",").map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      bubble.tail = { x, y };
      if (Number.isFinite(baseX) && Number.isFinite(baseY)) bubble.tail.base = { x: baseX, y: baseY };
    }
  }

  if (parts[4]) bubble.type = parts[4];
  if (parts[5]) bubble.id = parts[5];
  if (parts[6]) bubble.speaker = parts[6];

  return bubble;
}

function normalizeTrack({ fps: fpsValue, totalFrames: frameCount, style: trackStyle, bubbles }) {
  const normalized = bubbles
    .map((bubble, index) => {
      const frameStart = clamp(Math.round(bubble.frameStart ?? bubble.startFrame ?? 0), 0, frameCount - 1);
      const frameEnd = clamp(Math.round(bubble.frameEnd ?? bubble.endFrame ?? frameCount - 1), frameStart, frameCount - 1);
      return {
        id: bubble.id || `bubble-${String(index + 1).padStart(2, "0")}`,
        frameStart,
        frameEnd,
        start: frameStart / fpsValue,
        end: (frameEnd + 1) / fpsValue,
        text: String(bubble.text || "").trim(),
        x: Number(bubble.x ?? 80),
        y: Number(bubble.y ?? 45),
        ...(bubble.width ? { width: Number(bubble.width) } : {}),
        ...(bubble.maxWidth ? { maxWidth: Number(bubble.maxWidth) } : {}),
        ...(bubble.tail ? { tail: bubble.tail } : {}),
        type: bubble.type || "speech",
        ...(bubble.speaker ? { speaker: bubble.speaker } : {}),
        layer: Number(bubble.layer || 0),
      };
    })
    .filter((bubble) => bubble.text)
    .sort((a, b) => a.frameStart - b.frameStart || a.layer - b.layer);

  return {
    fps: fpsValue,
    totalFrames: frameCount,
    style: trackStyle,
    bubbles: normalized,
  };
}

function parseFlags(flagArgs) {
  const out = {};
  for (let i = 0; i < flagArgs.length; i += 1) {
    const arg = flagArgs[i];
    if (!arg.startsWith("--")) continue;
    out[arg.slice(2)] = flagArgs[i + 1];
    i += 1;
  }
  return out;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function printUsage() {
  console.log(`Usage:
  npm run storyboard:speech-bubbles -- <input.txt|input.json> <output.json> -- --fps 12 --frames 90

Text format:
  frameStart-frameEnd | text | x,y,width | tailX,tailY[,baseX,baseY] | speech|thought | optional-id | optional-speaker

Example:
  0-12 | I NEED HELP WITH MY TAXES. | 45,30,270 | 185,152 | speech | worried-client | client`);
}
