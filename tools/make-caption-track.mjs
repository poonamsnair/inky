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
const position = options.position || "bottom";
const style = {
  position,
  ...(options.maxWidthRatio ? { maxWidthRatio: Number(options.maxWidthRatio) } : {}),
};

const source = fs.readFileSync(inputPath, "utf8");
const cues = inputPath.endsWith(".json") ? cuesFromJson(source, fps, totalFrames, position) : cuesFromText(source, fps, totalFrames, position);
const track = normalizeTrack({ fps, totalFrames, style, cues });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(track, null, 2)}\n`);

if (!options.noSidecars) {
  const basename = outputPath.replace(/\.json$/i, "");
  fs.writeFileSync(`${basename}.vtt`, toVtt(track));
  fs.writeFileSync(`${basename}.srt`, toSrt(track));
}

console.log(`Created ${track.cues.length} caption cue(s) at ${outputPath}`);

function cuesFromJson(sourceText, fpsValue, frameCount, fallbackPosition) {
  const parsed = JSON.parse(sourceText);
  const rawCues = Array.isArray(parsed) ? parsed : parsed.cues || [];
  return rawCues.map((cue) => ({ position: fallbackPosition, ...cue }));
}

function cuesFromText(sourceText, fpsValue, frameCount, fallbackPosition) {
  const lines = sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const explicit = [];
  const automatic = [];

  lines.forEach((line) => {
    const frameMatch = line.match(/^(\d+)\s*[-–]\s*(\d+)\s*\|\s*(.+)$/);
    if (frameMatch) {
      explicit.push({
        frameStart: Number(frameMatch[1]),
        frameEnd: Number(frameMatch[2]),
        text: frameMatch[3].trim(),
        position: fallbackPosition,
      });
      return;
    }

    const timeMatch = line.match(/^([\d:.,]+)\s*-->\s*([\d:.,]+)\s*\|\s*(.+)$/);
    if (timeMatch) {
      explicit.push({
        frameStart: Math.round(parseTime(timeMatch[1]) * fpsValue),
        frameEnd: Math.max(0, Math.round(parseTime(timeMatch[2]) * fpsValue) - 1),
        text: timeMatch[3].trim(),
        position: fallbackPosition,
      });
      return;
    }

    automatic.push(line);
  });

  if (!automatic.length) return explicit;

  const remainingStart = explicit.length ? Math.min(frameCount - 1, Math.max(...explicit.map((cue) => cue.frameEnd)) + 1) : 0;
  const remainingFrames = Math.max(1, frameCount - remainingStart);
  const span = Math.max(1, Math.floor(remainingFrames / automatic.length));
  const automaticCues = automatic.map((text, index) => ({
    frameStart: remainingStart + index * span,
    frameEnd: index === automatic.length - 1 ? frameCount - 1 : Math.min(frameCount - 1, remainingStart + (index + 1) * span - 1),
    text,
    position: fallbackPosition,
  }));

  return [...explicit, ...automaticCues];
}

function normalizeTrack({ fps: fpsValue, totalFrames: frameCount, style: trackStyle, cues }) {
  const normalized = cues
    .map((cue, index) => {
      const frameStart = clamp(Math.round(cue.frameStart ?? cue.startFrame ?? 0), 0, frameCount - 1);
      const frameEnd = clamp(Math.round(cue.frameEnd ?? cue.endFrame ?? frameCount - 1), frameStart, frameCount - 1);
      return {
        id: cue.id || `caption-${String(index + 1).padStart(2, "0")}`,
        frameStart,
        frameEnd,
        start: frameStart / fpsValue,
        end: (frameEnd + 1) / fpsValue,
        text: String(cue.text || "").trim(),
        position: cue.position || trackStyle.position || "bottom",
      };
    })
    .filter((cue) => cue.text && cue.frameEnd >= cue.frameStart)
    .sort((a, b) => a.frameStart - b.frameStart || a.frameEnd - b.frameEnd);

  return {
    fps: fpsValue,
    totalFrames: frameCount,
    style: trackStyle,
    cues: normalized,
  };
}

function toVtt(track) {
  return `WEBVTT\n\n${track.cues
    .map((cue) => `${cue.id}\n${formatVttTime(cue.start)} --> ${formatVttTime(cue.end)}\n${cue.text}`)
    .join("\n\n")}\n`;
}

function toSrt(track) {
  return `${track.cues
    .map((cue, index) => `${index + 1}\n${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}\n${cue.text}`)
    .join("\n\n")}\n`;
}

function parseFlags(flagArgs) {
  const out = {};
  for (let i = 0; i < flagArgs.length; i += 1) {
    const arg = flagArgs[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "no-sidecars") {
      out.noSidecars = true;
      continue;
    }
    out[key] = flagArgs[i + 1];
    i += 1;
  }
  return out;
}

function parseTime(value) {
  const raw = String(value).trim().replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  const parts = raw.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(raw);
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

function printUsage() {
  console.log(`Usage:
  npm run storyboard:captions -- <input.txt|input.json> <output.json> -- --fps 12 --frames 90 --position top

Input text supports either plain lines, evenly spread across the movie, or explicit ranges:
  0-7 | Fresh fruit waits on the counter.
  00:01.000 --> 00:02.500 | She rinses the berries.

By default the tool writes JSON, VTT, and SRT files with the same basename.`);
}
