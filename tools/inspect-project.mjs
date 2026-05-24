#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";
import { projectRefForDir, resolveProjectDir as resolveProjectDirectory } from "./project-paths.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const allowedSpeeds = new Set(["0.5", "0.75", "1", "1.25", "1.5", "2"]);
const deterministicPatterns = [
  { code: "math-random", label: "Math.random", pattern: /\bMath\.random\s*\(/ },
  { code: "date-now", label: "Date.now", pattern: /\bDate\.now\s*\(/ },
  { code: "performance-now", label: "performance.now", pattern: /\bperformance\.now\s*\(/ },
];

const args = process.argv.slice(2);

if (!args.length || args.includes("--help")) {
  printUsage();
  process.exit(args.includes("--help") ? 0 : 1);
}

const options = parseArgs(args);
const projectDir = resolveProjectDirectory(options.project, { root });
const report = createReport(projectDir);

if (!existsSync(projectDir)) {
  addIssue(report, "error", "project-missing", `Project directory was not found: ${projectDir}`);
  finish(report);
}

const manifestPath = join(projectDir, "project.json");
if (!existsSync(manifestPath)) {
  addIssue(report, "error", "manifest-missing", `Project manifest was not found: ${manifestPath}`);
  finish(report);
}

const manifest = readJsonFile(manifestPath, report, "project.json");
if (!manifest) finish(report);
const projectRef = projectRefForDir(projectDir, manifest, { root });

const manifestContext = inspectManifest(report, manifest, projectDir);
inspectRendererDeterminism(report, manifestContext.rendererPath);
const speechTrack = readTrack(report, manifest, projectDir, "speechBubbles");
const captionTrack = readTrack(report, manifest, projectDir, "captions");
inspectOutputs(report, manifest, projectDir);

if (!options.noBrowser && manifestContext.rendererPath && existsSync(manifestContext.rendererPath)) {
  try {
    await inspectInBrowser(report, manifest, {
      projectDir,
      speechTrack,
      captionTrack,
      sampleFrames: selectFrames(manifest, speechTrack, captionTrack, options),
      projectRef,
      url: options.url,
      offscreenTolerance: options.offscreenTolerance,
    });
  } catch (error) {
    addIssue(
      report,
      "error",
      "browser-inspect-failed",
      `Browser inspection failed: ${error?.message || String(error)}`,
    );
  }
} else if (options.noBrowser) {
  addIssue(report, "info", "browser-skipped", "Browser checks were skipped by --no-browser.");
}

finish(report);

function parseArgs(rawArgs) {
  const out = {
    project: "",
    url: "",
    noBrowser: false,
    allFrames: true,
    offscreenTolerance: 80,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--project") {
      out.project = rawArgs[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--url") {
      out.url = rawArgs[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--no-browser") {
      out.noBrowser = true;
      continue;
    }
    if (arg === "--sample") {
      out.allFrames = false;
      continue;
    }
    if (arg === "--all-frames") {
      out.allFrames = true;
      continue;
    }
    if (arg === "--offscreen-tolerance") {
      out.offscreenTolerance = numberOr(rawArgs[index + 1], out.offscreenTolerance);
      index += 1;
      continue;
    }
    if (!arg.startsWith("--") && !out.project) out.project = arg;
  }

  if (!out.project) {
    console.error("Project is required.");
    printUsage();
    process.exit(1);
  }

  return out;
}

function createReport(projectDirValue) {
  return {
    projectDir: projectDirValue,
    projectSlug: "",
    issues: [],
  };
}

function inspectManifest(report, manifest, dir) {
  report.projectSlug = manifest.slug || "";
  const context = {
    rendererPath: null,
  };

  if (!manifest.slug || !/^[a-z0-9-]+$/.test(manifest.slug)) {
    addIssue(report, "error", "manifest-slug", "project.json must include a lowercase slug using letters, numbers, and dashes.");
  } else if (basename(dir) !== manifest.slug) {
    addIssue(report, "warn", "manifest-slug-dir", `Manifest slug "${manifest.slug}" does not match project folder "${basename(dir)}".`);
  }

  [
    ["width", manifest.width],
    ["height", manifest.height],
    ["fps", manifest.fps],
    ["totalFrames", manifest.totalFrames],
  ].forEach(([name, value]) => {
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
      addIssue(report, "error", `manifest-${name}`, `project.json must include a positive ${name}.`);
    }
  });

  if (!manifest.renderer) {
    addIssue(report, "warn", "renderer-missing", "No renderer is registered in project.json.");
  } else {
    context.rendererPath = resolveSafeProjectPath(report, dir, manifest.renderer, "renderer");
    if (context.rendererPath && !existsSync(context.rendererPath)) {
      addIssue(report, "error", "renderer-file-missing", `Renderer file is registered but missing: ${manifest.renderer}`);
    }
  }

  if (!manifest.outputs || typeof manifest.outputs !== "object" || Array.isArray(manifest.outputs)) {
    addIssue(report, "warn", "outputs-missing", "project.json has no outputs object.");
  }

  if (!manifest.tracks || typeof manifest.tracks !== "object" || Array.isArray(manifest.tracks)) {
    addIssue(report, "info", "tracks-missing", "project.json has no tracks object.");
  }

  return context;
}

function inspectRendererDeterminism(report, rendererPath) {
  if (!rendererPath || !existsSync(rendererPath)) return;
  const source = readFileSync(rendererPath, "utf8");
  const lines = source.split(/\r?\n/);
  const relativePath = relative(root, rendererPath);

  lines.forEach((line, index) => {
    const code = stripLineComment(line);
    deterministicPatterns.forEach((pattern) => {
      if (pattern.pattern.test(code)) {
        addIssue(
          report,
          "error",
          `renderer-${pattern.code}`,
          `${relativePath}:${index + 1} uses ${pattern.label}; renderer frames should use seeded values based on frame/project data.`,
        );
      }
    });
  });
}

function readTrack(report, manifest, dir, trackName) {
  const trackValue = manifest.tracks?.[trackName];
  if (!trackValue) return null;
  if (typeof trackValue !== "string") {
    addIssue(report, "error", `${trackName}-track-path`, `tracks.${trackName} must be a project-relative JSON path.`);
    return null;
  }

  const trackPath = resolveSafeProjectPath(report, dir, trackValue, `${trackName} track`);
  if (!trackPath) return null;
  if (!existsSync(trackPath)) {
    addIssue(report, "error", `${trackName}-track-missing`, `${trackName} track is registered but missing: ${trackValue}`);
    return null;
  }

  const track = readJsonFile(trackPath, report, trackValue);
  if (!track) return null;
  const items = trackName === "captions" ? track.cues || [] : track.bubbles || [];
  const itemLabel = trackName === "captions" ? "caption cue" : "speech bubble";

  if (!Array.isArray(items)) {
    addIssue(report, "error", `${trackName}-track-shape`, `${trackValue} must include an array of ${itemLabel}s.`);
    return track;
  }

  if (Number(track.totalFrames) !== Number(manifest.totalFrames)) {
    addIssue(report, "warn", `${trackName}-frames`, `${trackValue} totalFrames does not match project.json.`);
  }
  if (Number(track.fps) !== Number(manifest.fps)) {
    addIssue(report, "warn", `${trackName}-fps`, `${trackValue} fps does not match project.json.`);
  }

  items.forEach((item, index) => {
    const id = item.id || `${itemLabel} ${index + 1}`;
    const frameStart = Number(item.frameStart);
    const frameEnd = Number(item.frameEnd);
    if (!item.text || !String(item.text).trim()) {
      addIssue(report, "error", `${trackName}-empty-text`, `${trackValue} ${id} has no text.`);
    }
    if (!Number.isFinite(frameStart) || !Number.isFinite(frameEnd) || frameStart < 0 || frameEnd < frameStart || frameEnd >= Number(manifest.totalFrames)) {
      addIssue(report, "error", `${trackName}-range`, `${trackValue} ${id} has an invalid frame range.`);
    }
  });

  return track;
}

function inspectOutputs(report, manifest, dir) {
  const outputs = manifest.outputs || {};

  if (outputs.frames) {
    const framesDir = resolveSafeProjectPath(report, dir, outputs.frames, "frames output");
    if (framesDir && existsSync(framesDir)) {
      const frameFiles = readdirSync(framesDir).filter((file) => /^frame-\d+\.png$/i.test(file));
      const expected = Number(manifest.totalFrames || 0);
      if (expected && frameFiles.length < expected) {
        addIssue(report, "warn", "frames-count", `Rendered frame folder has ${frameFiles.length}/${expected} PNG frame(s).`);
      }
    } else if (framesDir) {
      addIssue(report, "warn", "frames-dir-missing", `Rendered frame folder is registered but missing: ${outputs.frames}`);
    }
  }

  const videoBySpeed = outputs.videoBySpeed && typeof outputs.videoBySpeed === "object" && !Array.isArray(outputs.videoBySpeed) ? outputs.videoBySpeed : {};
  const checkedPaths = new Set();

  if (outputs.video) {
    inspectOutputFile(report, dir, outputs.video, "outputs.video", checkedPaths);
    if (videoBySpeed["1"] && videoBySpeed["1"] !== outputs.video) {
      addIssue(report, "error", "video-canonical-mismatch", "outputs.video must match outputs.videoBySpeed[\"1\"] when both are present.");
    }
    if (!videoBySpeed["1"]) {
      addIssue(report, "warn", "video-speed-1-missing", "outputs.video exists, but outputs.videoBySpeed[\"1\"] is not registered.");
    }
  } else if (Object.keys(videoBySpeed).length) {
    addIssue(report, "warn", "video-canonical-missing", "outputs.video is empty even though speed-specific MP4s are registered.");
  } else {
    addIssue(report, "warn", "video-missing", "No MP4 output is registered yet.");
  }

  Object.entries(videoBySpeed).forEach(([speed, filePath]) => {
    if (!allowedSpeeds.has(String(speed))) {
      addIssue(report, "warn", "video-speed-label", `outputs.videoBySpeed has an unexpected speed key: ${speed}`);
    }
    inspectOutputFile(report, dir, filePath, `outputs.videoBySpeed["${speed}"]`, checkedPaths);
  });
}

function inspectOutputFile(report, dir, projectRelativePath, label, checkedPaths) {
  if (typeof projectRelativePath !== "string" || !projectRelativePath) {
    addIssue(report, "error", "output-path-empty", `${label} must be a project-relative file path.`);
    return;
  }
  const outputPath = resolveSafeProjectPath(report, dir, projectRelativePath, label);
  if (!outputPath || checkedPaths.has(outputPath)) return;
  checkedPaths.add(outputPath);
  if (!existsSync(outputPath)) {
    addIssue(report, "error", "output-file-missing", `${label} points to a missing file: ${projectRelativePath}`);
    return;
  }
  if (!statSync(outputPath).isFile()) {
    addIssue(report, "error", "output-not-file", `${label} does not point to a file: ${projectRelativePath}`);
  }
}

async function inspectInBrowser(report, manifest, browserOptions) {
  const serverInfo = browserOptions.url ? null : await startViteServer();
  const baseUrl = browserOptions.url || serverInfo.url;
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({
      viewport: {
        width: Number(manifest.width) || 960,
        height: Number(manifest.height) || 620,
      },
    });
    const consoleErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(error?.message || String(error));
    });

    await page.goto(projectUrl(baseUrl, browserOptions.projectRef, { preview: true }), { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.storyboardApp?.hasLoadedAnimation === true, null, { timeout: 8000 });

    await page.goto(projectUrl(baseUrl, browserOptions.projectRef, { exportMode: true, frame: 0 }), { waitUntil: "networkidle" });
    await page.waitForFunction(() => typeof window.storyboardApp?.drawFrame === "function", null, { timeout: 8000 });

    await page.addScriptTag({ content: `${browserInspectorSource()}\nwindow.__inkyInspectProject = inkyInspectProject;` });

    const browserResult = await page.evaluate(
      ({ speechTrack, captionTrack, manifest: manifestForPage, frames, offscreenTolerance }) => {
        return window.__inkyInspectProject({
          speechTrack,
          captionTrack,
          manifest: manifestForPage,
          frames,
          offscreenTolerance,
        });
      },
      {
        speechTrack: browserOptions.speechTrack,
        captionTrack: browserOptions.captionTrack,
        manifest,
        frames: browserOptions.sampleFrames,
        offscreenTolerance: browserOptions.offscreenTolerance,
      },
    );

    browserResult.issues.forEach((issue) => addIssue(report, issue.level, issue.code, issue.message));

    const uniqueConsoleErrors = [...new Set(consoleErrors)];
    uniqueConsoleErrors.forEach((message) => {
      addIssue(report, "error", "console-error", `Preview/export console error: ${message}`);
    });

    if (!uniqueConsoleErrors.length) {
      addIssue(report, "pass", "console-clean", "Preview and export routes opened without console errors.");
    }
  } finally {
    await browser.close();
    if (serverInfo) await serverInfo.close();
  }
}

async function startViteServer() {
  const server = await createServer({
    root,
    configFile: resolve(root, "vite.config.js"),
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
    },
  });
  await server.listen();
  const url = server.resolvedUrls?.local?.[0] || "http://127.0.0.1:5173/";
  return {
    url,
    close: () => server.close(),
  };
}

function projectUrl(baseUrl, slug, options = {}) {
  const url = new URL(baseUrl);
  url.searchParams.set("project", slug);
  if (options.exportMode) url.searchParams.set("export", "");
  if (options.frame != null) url.searchParams.set("frame", String(options.frame));
  if (options.preview) url.searchParams.set("inspect", "preview");
  return url.toString();
}

function selectFrames(manifest, speechTrack, captionTrack, options) {
  const totalFrames = Math.max(1, Number(manifest.totalFrames) || 1);
  if (options.allFrames) return Array.from({ length: totalFrames }, (_, index) => index);

  const frames = new Set([0, Math.floor((totalFrames - 1) / 2), totalFrames - 1]);
  [speechTrack?.bubbles || [], captionTrack?.cues || []].flat().forEach((item) => {
    [item.frameStart, item.frameEnd].forEach((frame) => {
      const parsed = Number(frame);
      if (Number.isFinite(parsed)) frames.add(clamp(Math.round(parsed), 0, totalFrames - 1));
    });
  });
  return [...frames].sort((a, b) => a - b);
}

function browserInspectorSource() {
  return String.raw`
function inkyInspectProject({ speechTrack, captionTrack, manifest, frames, offscreenTolerance }) {
  const issues = [];
  const width = Number(manifest.width) || 960;
  const height = Number(manifest.height) || 620;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const measureCtx = canvas.getContext("2d");

  inspectSpeechBubbles(issues, measureCtx, speechTrack, width, height);
  inspectCaptions(issues, measureCtx, captionTrack, width, height);
  inspectDrawBounds(issues, frames, width, height, offscreenTolerance);
  inspectImportantBounds(issues, frames, width, height);

  return { issues };
}

function inspectSpeechBubbles(issues, ctx, track, width, height) {
  if (!track?.bubbles?.length) return;
  const defaults = {
    font: "700 24px Avenir Next, Trebuchet MS, Verdana, sans-serif",
    lineHeight: 29,
    paddingX: 22,
    paddingY: 16,
    maxWidth: 330,
  };
  const trackStyle = { ...defaults, ...(track.style || {}) };

  track.bubbles.forEach((bubble, index) => {
    const style = { ...trackStyle, ...(bubble.style || {}) };
    const id = bubble.id || "bubble-" + String(index + 1).padStart(2, "0");
    ctx.font = bubble.font || style.font;
    const rawWidth = Number(bubble.width || bubble.maxWidth || style.maxWidth);
    const maxTextWidth = Math.max(120, rawWidth - style.paddingX * 2);
    const lines = wrapText(ctx, bubble.text, maxTextWidth);
    const lineWidths = lines.map((line) => ctx.measureText(line).width);
    const textWidth = Math.max(...lineWidths, 1);
    const boxWidth = bubble.width || Math.min(bubble.maxWidth || style.maxWidth, textWidth + style.paddingX * 2);
    const boxHeight = lines.length * style.lineHeight + style.paddingY * 2;
    const box = { x: Number(bubble.x), y: Number(bubble.y), width: Number(boxWidth), height: Number(boxHeight) };
    const overflowLine = lineWidths.find((lineWidth) => lineWidth > maxTextWidth + 2);

    if (!finiteBox(box)) {
      issues.push({ level: "error", code: "speech-bubble-bounds", message: "Speech bubble " + id + " has invalid numeric bounds." });
    } else if (!insideCanvas(box, width, height, 0)) {
      issues.push({ level: "error", code: "speech-bubble-off-canvas", message: "Speech bubble " + id + " extends outside the canvas." });
    }

    if (overflowLine) {
      issues.push({ level: "error", code: "speech-bubble-text-overflow", message: "Speech bubble " + id + " has text wider than its readable area." });
    }

    const tail = normalizeTail(bubble.tail);
    if (tail && !pointInsideCanvas(tail, width, height, 0)) {
      issues.push({ level: "error", code: "speech-bubble-tail-off-canvas", message: "Speech bubble " + id + " tail points outside the canvas." });
    }
  });
}

function inspectCaptions(issues, ctx, track, width, height) {
  if (!track?.cues?.length) return;
  const defaults = {
    position: "bottom",
    margin: 28,
    maxWidthRatio: 0.72,
    font: "700 26px Avenir Next, Trebuchet MS, Verdana, sans-serif",
    lineHeight: 34,
    paddingX: 20,
    paddingY: 13,
    radius: 8,
  };
  const trackStyle = { ...defaults, ...(track.style || {}) };

  track.cues.forEach((cue, index) => {
    const style = { ...trackStyle, ...(cue.style || {}) };
    const id = cue.id || "caption-" + String(index + 1).padStart(2, "0");
    ctx.font = cue.font || style.font;
    const maxTextWidth = width * style.maxWidthRatio;
    const allLines = wrapText(ctx, cue.text, maxTextWidth);
    const lines = allLines.slice(0, 3);
    const lineWidths = lines.map((line) => ctx.measureText(line).width);
    const textWidth = Math.max(...lineWidths, 1);
    const boxWidth = Math.min(maxTextWidth + style.paddingX * 2, textWidth + style.paddingX * 2);
    const boxHeight = lines.length * style.lineHeight + style.paddingY * 2;
    const box = {
      x: (width - boxWidth) / 2,
      y: captionY(cue.position || style.position, height, boxHeight, style.margin),
      width: boxWidth,
      height: boxHeight,
    };

    if (allLines.length > 3) {
      issues.push({ level: "error", code: "caption-line-limit", message: "Caption " + id + " wraps past 3 lines and will be truncated." });
    }
    if (!insideCanvas(box, width, height, 0)) {
      issues.push({ level: "error", code: "caption-off-canvas", message: "Caption " + id + " extends outside the canvas." });
    }
    if (lineWidths.some((lineWidth) => lineWidth > maxTextWidth + 2)) {
      issues.push({ level: "error", code: "caption-text-overflow", message: "Caption " + id + " has text wider than its readable area." });
    }
  });
}

function inspectDrawBounds(issues, frames, width, height, tolerance) {
  const drawFrame = window.storyboardApp?.drawFrame;
  if (typeof drawFrame !== "function") {
    issues.push({ level: "error", code: "preview-draw-frame-missing", message: "window.storyboardApp.drawFrame is not available." });
    return;
  }

  const probe = installCanvasProbe(width, height, tolerance);
  frames.forEach((frame) => {
    probe.setFrame(frame);
    drawFrame(frame);
  });
  probe.restore();

  const bySignature = new Map();
  probe.records.forEach((record) => {
    const key = record.method + ":" + Math.round(record.box.x) + ":" + Math.round(record.box.y) + ":" + Math.round(record.box.width) + ":" + Math.round(record.box.height);
    if (!bySignature.has(key)) bySignature.set(key, record);
  });

  [...bySignature.values()].slice(0, 12).forEach((record) => {
    issues.push({
      level: "warn",
      code: "draw-command-off-canvas",
      message: "Frame " + record.frame + " draws " + record.method + " beyond the canvas by more than " + tolerance + "px.",
    });
  });
}

function inspectImportantBounds(issues, frames, width, height) {
  const renderer = window.inkyApp?.renderer;
  const getBounds = renderer?.inspectImportantBounds || renderer?.getImportantBounds;
  if (typeof getBounds !== "function") return;

  frames.forEach((frame) => {
    const rawBounds = getBounds(frame, { manifest: window.inkyApp?.manifest }) || [];
    const bounds = Array.isArray(rawBounds) ? rawBounds : rawBounds.boxes || [];
    bounds.forEach((box, index) => {
      const id = box.id || box.label || "important-shape-" + index;
      const normalized = {
        x: Number(box.x),
        y: Number(box.y),
        width: Number(box.width ?? box.w),
        height: Number(box.height ?? box.h),
      };
      if (!finiteBox(normalized) || !insideCanvas(normalized, width, height, 0)) {
        issues.push({ level: "error", code: "important-shape-off-canvas", message: "Frame " + frame + " important shape " + id + " extends outside the canvas." });
      }
    });
  });
}

function installCanvasProbe(width, height, tolerance) {
  const records = [];
  const originals = new Map();
  let currentFrame = 0;
  const proto = CanvasRenderingContext2D.prototype;
  const methods = {
    fillRect(args, ctx) {
      return rectBox(args[0], args[1], args[2], args[3], ctx);
    },
    strokeRect(args, ctx) {
      return rectBox(args[0], args[1], args[2], args[3], ctx);
    },
    rect(args, ctx) {
      return rectBox(args[0], args[1], args[2], args[3], ctx);
    },
    moveTo(args, ctx) {
      return pointsBox([transformPoint(ctx, args[0], args[1])]);
    },
    lineTo(args, ctx) {
      return pointsBox([transformPoint(ctx, args[0], args[1])]);
    },
    quadraticCurveTo(args, ctx) {
      return pointsBox([transformPoint(ctx, args[0], args[1]), transformPoint(ctx, args[2], args[3])]);
    },
    bezierCurveTo(args, ctx) {
      return pointsBox([transformPoint(ctx, args[0], args[1]), transformPoint(ctx, args[2], args[3]), transformPoint(ctx, args[4], args[5])]);
    },
    arc(args, ctx) {
      const center = transformPoint(ctx, args[0], args[1]);
      const radius = Math.abs(Number(args[2]) || 0);
      return { x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2 };
    },
    ellipse(args, ctx) {
      const center = transformPoint(ctx, args[0], args[1]);
      const rx = Math.abs(Number(args[2]) || 0);
      const ry = Math.abs(Number(args[3]) || 0);
      return { x: center.x - rx, y: center.y - ry, width: rx * 2, height: ry * 2 };
    },
    fillText(args, ctx) {
      return textBox(args, ctx);
    },
    strokeText(args, ctx) {
      return textBox(args, ctx);
    },
  };

  Object.entries(methods).forEach(([name, toBox]) => {
    const original = proto[name];
    if (typeof original !== "function") return;
    originals.set(name, original);
    proto[name] = function patchedCanvasMethod(...args) {
      const box = toBox(args, this);
      if (box && finiteBox(box) && !insideCanvas(box, width, height, tolerance) && !isFullCanvasClear(name, box, width, height)) {
        records.push({ frame: currentFrame, method: name, box });
      }
      return original.apply(this, args);
    };
  });

  return {
    records,
    setFrame(frame) {
      currentFrame = frame;
    },
    restore() {
      originals.forEach((original, name) => {
        proto[name] = original;
      });
    },
  };
}

function textBox(args, ctx) {
  const [text, x, y] = args;
  const point = transformPoint(ctx, x, y);
  const metrics = ctx.measureText(String(text));
  const fontSize = Number(String(ctx.font).match(/(\d+(?:\.\d+)?)px/)?.[1]) || 24;
  let left = point.x;
  if (ctx.textAlign === "center") left -= metrics.width / 2;
  if (ctx.textAlign === "right" || ctx.textAlign === "end") left -= metrics.width;
  let top = point.y - fontSize * 0.8;
  if (ctx.textBaseline === "top" || ctx.textBaseline === "hanging") top = point.y;
  if (ctx.textBaseline === "middle") top = point.y - fontSize / 2;
  return { x: left, y: top, width: metrics.width, height: fontSize * 1.2 };
}

function rectBox(x, y, width, height, ctx) {
  const points = [
    transformPoint(ctx, x, y),
    transformPoint(ctx, Number(x) + Number(width), y),
    transformPoint(ctx, Number(x) + Number(width), Number(y) + Number(height)),
    transformPoint(ctx, x, Number(y) + Number(height)),
  ];
  return pointsBox(points);
}

function transformPoint(ctx, x, y) {
  const transform = ctx.getTransform();
  const point = new DOMPoint(Number(x), Number(y)).matrixTransform(transform);
  return { x: point.x, y: point.y };
}

function pointsBox(points) {
  const finitePoints = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!finitePoints.length) return null;
  const xs = finitePoints.map((point) => point.x);
  const ys = finitePoints.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? line + " " + word : word;
    if (!line || ctx.measureText(test).width <= maxWidth) {
      line = test;
      return;
    }
    lines.push(line);
    line = word;
  });
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function captionY(position, height, boxHeight, margin) {
  if (position === "top") return margin;
  if (position === "middle") return (height - boxHeight) / 2;
  return height - boxHeight - margin;
}

function normalizeTail(tail) {
  if (!tail) return null;
  if (Array.isArray(tail)) return { x: Number(tail[0]), y: Number(tail[1]) };
  if (tail.tip) return { x: Number(tail.tip.x), y: Number(tail.tip.y) };
  return { x: Number(tail.x), y: Number(tail.y) };
}

function finiteBox(box) {
  return [box.x, box.y, box.width, box.height].every(Number.isFinite);
}

function insideCanvas(box, width, height, tolerance) {
  return box.x >= -tolerance && box.y >= -tolerance && box.x + box.width <= width + tolerance && box.y + box.height <= height + tolerance;
}

function pointInsideCanvas(point, width, height, tolerance) {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= -tolerance && point.y >= -tolerance && point.x <= width + tolerance && point.y <= height + tolerance;
}

function isFullCanvasClear(name, box, width, height) {
  if (name !== "fillRect" && name !== "strokeRect") return false;
  return box.x <= 0 && box.y <= 0 && box.width >= width && box.height >= height;
}
`;
}

function resolveSafeProjectPath(report, projectDir, projectRelativePath, label) {
  if (typeof projectRelativePath !== "string" || !projectRelativePath.trim()) {
    addIssue(report, "error", "path-empty", `${label} path is empty.`);
    return null;
  }
  const resolved = resolve(projectDir, projectRelativePath);
  if (!isInside(projectDir, resolved)) {
    addIssue(report, "error", "path-traversal", `${label} path must stay inside the project folder: ${projectRelativePath}`);
    return null;
  }
  return resolved;
}

function readJsonFile(filePath, report, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    addIssue(report, "error", "json-invalid", `${label} is not valid JSON: ${error.message}`);
    return null;
  }
}

function stripLineComment(line) {
  const index = line.indexOf("//");
  return index === -1 ? line : line.slice(0, index);
}

function addIssue(report, level, code, message) {
  report.issues.push({ level, code, message });
}

function finish(report) {
  const levels = {
    error: report.issues.filter((issue) => issue.level === "error"),
    warn: report.issues.filter((issue) => issue.level === "warn"),
    info: report.issues.filter((issue) => issue.level === "info"),
    pass: report.issues.filter((issue) => issue.level === "pass"),
  };

  console.log(`Inky inspect: ${report.projectSlug || basename(report.projectDir)}`);
  if (levels.error.length || levels.warn.length || levels.info.length) {
    [...levels.error, ...levels.warn, ...levels.info].forEach((issue) => {
      console.log(`${iconFor(issue.level)} [${issue.code}] ${issue.message}`);
    });
  }
  levels.pass.forEach((issue) => {
    console.log(`${iconFor(issue.level)} [${issue.code}] ${issue.message}`);
  });

  console.log(
    `Result: ${levels.error.length} error(s), ${levels.warn.length} warning(s), ${levels.info.length} note(s).`,
  );
  process.exit(levels.error.length ? 1 : 0);
}

function iconFor(level) {
  if (level === "error") return "x";
  if (level === "warn") return "!";
  if (level === "pass") return "+";
  return "-";
}

function printUsage() {
  console.log(`Usage:
  npm run storyboard:inspect -- <project-dir-or-slug> [--url http://127.0.0.1:5173/]
  npm run storyboard:inspect -- --project cutting-fruit

Checks:
  - project.json manifest and output path consistency
  - missing registered MP4 files
  - Math.random, Date.now, and performance.now in project renderer code
  - speech bubble text overflow and canvas bounds
  - caption text overflow and canvas bounds
  - preview/export console errors in a real browser
  - suspicious draw commands beyond the canvas

Flags:
  --sample                 Inspect start/middle/end plus text cue frames instead of all frames.
  --all-frames             Inspect every frame in the animation. Default.
  --no-browser             Run only file and manifest checks.
  --offscreen-tolerance N  Warn when drawing commands extend more than N pixels outside the canvas. Default 80.`);
}

function basename(value) {
  return value.split(/[\\/]/).filter(Boolean).at(-1) || value;
}

function isInside(parent, child) {
  const childRelativePath = relative(parent, child);
  return childRelativePath === "" || (!childRelativePath.startsWith("..") && !isAbsolute(childRelativePath));
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
