#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inactiveStatuses = new Set(["deleted", "removed", "archived"]);
const doneStatuses = new Set(["done", "complete", "completed"]);

const args = process.argv.slice(2);
const options = parseArgs(args);

if (options.help || !options.project) {
  printUsage();
  process.exit(options.help ? 0 : 1);
}

const projectDir = resolveProjectDir(options.project);
const manifestPath = path.join(projectDir, "project.json");

if (!fs.existsSync(projectDir)) {
  fail(`Project directory was not found: ${projectDir}`);
}

if (!fs.existsSync(manifestPath)) {
  fail(`Project manifest was not found: ${manifestPath}`);
}

const manifest = readJson(manifestPath, "project manifest");
const projectSlug = manifest.slug || path.basename(projectDir);
const projectTitle = manifest.title || projectSlug;
const fps = Number(manifest.fps) || 12;
const totalFrames = Number(manifest.totalFrames) || 1;
const inputLabel = options.input || "storyboard/annotations.json";
const annotationsPath = resolveInputPath(projectDir, options.input);

if (options.input !== "-" && !fs.existsSync(annotationsPath)) {
  fail(`Annotation file was not found: ${annotationsPath}`);
}

const annotationSource = options.input === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(annotationsPath, "utf8");
const annotationData = readJsonText(annotationSource, inputLabel);
const annotations = normalizeAnnotations(annotationData, { fps, totalFrames, includeDone: options.includeDone });

if (!annotations.length) {
  fail("No active annotations were found. Deleted/removed/archived annotations are ignored, and done annotations require --include-done.");
}

const prompt = buildPrompt({
  projectDir,
  projectSlug,
  projectTitle,
  manifest,
  annotations,
  annotationData,
  annotationsPath: options.input === "-" ? "stdin" : annotationsPath,
  inputLabel,
});

const outputPath = resolveOutputPath(projectDir, options.output);

if (outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${prompt}\n`);
}

if (options.print || !outputPath) {
  process.stdout.write(`${prompt}\n`);
} else {
  console.log(`Created annotation fix prompt at ${path.relative(root, outputPath)}`);
  console.log(`Included ${annotations.length} active annotation(s).`);
}

function parseArgs(rawArgs) {
  const out = {
    project: "",
    input: "",
    output: "",
    includeDone: false,
    print: false,
    help: false,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    if (arg === "--input") {
      out.input = rawArgs[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--output") {
      out.output = rawArgs[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--include-done") {
      out.includeDone = true;
      continue;
    }
    if (arg === "--print") {
      out.print = true;
      continue;
    }
    if (!arg.startsWith("--") && !out.project) out.project = arg;
  }

  return out;
}

function resolveProjectDir(projectArg) {
  const directPath = path.resolve(root, projectArg);
  if (fs.existsSync(directPath)) return directPath;
  return path.resolve(root, "projects", projectArg);
}

function resolveInputPath(projectDir, input) {
  if (!input) return path.join(projectDir, "storyboard", "annotations.json");
  if (input === "-") return input;
  return path.isAbsolute(input) ? input : path.resolve(projectDir, input);
}

function resolveOutputPath(projectDir, output) {
  if (output === "-") return "";
  if (!output) return path.join(projectDir, "prompt", "annotation-prompt.md");
  return path.isAbsolute(output) ? output : path.resolve(projectDir, output);
}

function normalizeAnnotations(rawData, { fps: fpsValue, totalFrames: frameCount, includeDone }) {
  const rawAnnotations = Array.isArray(rawData) ? rawData : rawData.annotations || rawData.items || rawData.tasks || [];
  return rawAnnotations
    .map((annotation, index) => normalizeAnnotation(annotation, index, fpsValue, frameCount))
    .filter((annotation) => {
      if (inactiveStatuses.has(annotation.status)) return false;
      if (!includeDone && doneStatuses.has(annotation.status)) return false;
      return true;
    })
    .sort((a, b) => a.frame - b.frame || a.id.localeCompare(b.id));
}

function normalizeAnnotation(annotation, index, fpsValue, frameCount) {
  const frame = clamp(
    Math.round(firstFiniteNumber(annotation.frame, annotation.frameIndex, annotation.startFrame, annotation.target?.frame, 0)),
    0,
    Math.max(0, frameCount - 1),
  );
  const time = firstFiniteNumber(annotation.time, annotation.seconds, annotation.timestampSeconds, annotation.target?.time, frame / fpsValue);
  const status = normalizeStatus(annotation.status || annotation.state || "to do");
  const rect = normalizeRect(annotation);
  const screenshots = normalizeScreenshots(annotation);

  return {
    id: String(annotation.id || annotation.annotationId || annotation.taskId || `annotation-${String(index + 1).padStart(2, "0")}`),
    status,
    intent: String(annotation.intent || annotation.kind || annotation.type || "").trim(),
    frame,
    time,
    comment: normalizeComment(annotation),
    rect,
    screenshots,
  };
}

function normalizeStatus(status) {
  return String(status || "to do").trim().toLowerCase();
}

function normalizeComment(annotation) {
  const candidates = [
    annotation.comment,
    annotation.note,
    annotation.text,
    annotation.value,
    annotation.body?.value,
    annotation.body?.text,
    annotation.body?.comment,
  ];

  if (Array.isArray(annotation.body)) {
    annotation.body.forEach((body) => {
      candidates.push(body?.value, body?.text, body?.comment);
    });
  }

  const found = candidates.find((value) => value != null && String(value).trim());
  return found ? String(found).trim() : "(No comment text supplied.)";
}

function normalizeRect(annotation) {
  const rect =
    annotation.rect ||
    annotation.bounds ||
    annotation.boundingRect ||
    annotation.boundingBox ||
    annotation.target?.rect ||
    annotation.target?.bounds ||
    annotation.target?.selector;

  const parsed = rectFromValue(rect) || rectFromValue(annotation.xywh) || rectFromValue(annotation.xyxy);
  const normalized = annotation.normalized || annotation.normalizedRect || rect?.normalized || rect?.percent;

  return {
    ...(parsed || {}),
    ...(normalized ? { normalized: normalizeNormalizedRect(normalized) } : {}),
  };
}

function rectFromValue(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const xywhMatch = value.match(/xywh=(?:pixel:)?([\d.-]+),([\d.-]+),([\d.-]+),([\d.-]+)/i);
    if (xywhMatch) {
      return {
        x: Number(xywhMatch[1]),
        y: Number(xywhMatch[2]),
        width: Number(xywhMatch[3]),
        height: Number(xywhMatch[4]),
      };
    }
    const numbers = value.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
    if (numbers.length >= 4) return { x: numbers[0], y: numbers[1], width: numbers[2], height: numbers[3] };
    return null;
  }

  if (Array.isArray(value) && value.length >= 4) {
    return { x: Number(value[0]), y: Number(value[1]), width: Number(value[2]), height: Number(value[3]) };
  }

  if (typeof value !== "object") return null;

  if (Array.isArray(value.xywh)) return rectFromValue(value.xywh);
  if (Array.isArray(value.xyxy)) {
    const [x1, y1, x2, y2] = value.xyxy.map(Number);
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  const x = firstFiniteNumber(value.x, value.left, value.x1);
  const y = firstFiniteNumber(value.y, value.top, value.y1);
  const width = firstFiniteNumber(value.width, value.w);
  const height = firstFiniteNumber(value.height, value.h);

  if ([x, y, width, height].every(Number.isFinite)) return { x, y, width, height };

  const right = firstFiniteNumber(value.right, value.x2);
  const bottom = firstFiniteNumber(value.bottom, value.y2);
  if ([x, y, right, bottom].every(Number.isFinite)) {
    return { x, y, width: right - x, height: bottom - y };
  }

  return null;
}

function normalizeNormalizedRect(value) {
  if (!value || typeof value !== "object") return value;
  return {
    x: firstFiniteNumber(value.x, value.left),
    y: firstFiniteNumber(value.y, value.top),
    width: firstFiniteNumber(value.width, value.w),
    height: firstFiniteNumber(value.height, value.h),
  };
}

function normalizeScreenshots(annotation) {
  const values = [
    annotation.screenshot,
    annotation.screenshotPath,
    annotation.crop,
    annotation.image,
    annotation.media?.screenshot,
    annotation.target?.screenshot,
  ];
  if (Array.isArray(annotation.screenshots)) values.push(...annotation.screenshots);
  return [...new Set(values.filter((value) => value != null && String(value).trim()).map((value) => String(value).trim()))];
}

function buildPrompt({ projectDir, projectSlug, projectTitle, manifest, annotations, annotationData, annotationsPath, inputLabel }) {
  const projectRelative = relativePath(projectDir);
  const manifestRelative = relativePath(path.join(projectDir, "project.json"));
  const rendererRelative = relativePath(path.join(projectDir, manifest.renderer || "renderer.js"));
  const requirementsPath = manifest.prompt?.requirements || "storyboard/requirements.md";
  const requirementsRelative = relativePath(path.join(projectDir, requirementsPath));
  const annotationRelative = annotationsPath === "stdin" ? "embedded/stdin annotation JSON" : relativePath(annotationsPath);
  const framesDir = manifest.outputs?.frames || "outputs/frames";

  const lines = [
    `# Fix Inky annotations: ${projectTitle}`,
    "",
    "Use the `annotation-fix-pipeline` skill.",
    "",
    "## Project",
    "",
    `- Slug: \`${projectSlug}\``,
    `- Project directory: \`${projectRelative}\``,
    `- Manifest: \`${manifestRelative}\``,
    `- Renderer: \`${rendererRelative}\``,
    `- Requirements: \`${requirementsRelative}\``,
    `- Annotations JSON: \`${annotationRelative}\``,
    `- Rendered frames: \`${relativePath(path.join(projectDir, framesDir))}\``,
    "",
    "## Required Workflow",
    "",
    "1. Read `AGENTS.md`, `DESIGN.md`, this project manifest, requirements, annotation JSON, and referenced screenshots.",
    "2. For each active annotation, inspect the frame/time, selected bounds, screenshot, and user comment.",
    "3. Before editing, do an applicability sweep: decide whether the marked element is one-off or recurring, find the shared renderer helper/scene data/action mode that owns it, and list the annotated frame plus adjacent/related frames that must be checked.",
    "4. Fix the root drawing cause in the shared renderer construction when the issue recurs. Do not cover defects with patches, masks, white fills, opacity tricks, or extra texture.",
    "5. Only use a frame-specific branch when the annotation is truly frame-specific, and state why.",
    "6. Keep fixes project-scoped unless the annotation reveals a reusable Inky tooling bug.",
    "7. Update each active annotation status in `storyboard/annotations.json` to `doing`, then `done` or `needs review`.",
    "8. Rerender frames, run polish, visual diff, inspector, and open the updated browser preview.",
    "9. In the final reply, report the affected frame ranges checked for each annotation.",
    "",
    "## Verification Commands",
    "",
    "```bash",
    `npm run render -- --project ${projectSlug}`,
    `npm run storyboard:polish -- projects/${projectSlug}`,
    `npm run storyboard:visual-diff -- projects/${projectSlug}/outputs/frames projects/${projectSlug}/outputs/review-visual-diff`,
    `npm run storyboard:inspect -- projects/${projectSlug}`,
    "npm run preview -- --port 5176",
    "```",
    "",
    "Preview URL after the server is running:",
    "",
    `- \`http://127.0.0.1:5176/?project=${projectSlug}\``,
    "",
    "## Active Annotations",
    "",
  ];

  annotations.forEach((annotation, index) => {
    lines.push(`### ${index + 1}. ${annotation.id}`, "");
    lines.push(`- Status: \`${annotation.status}\``);
    if (annotation.intent) lines.push(`- Intent: \`${annotation.intent}\``);
    lines.push(`- Frame: \`${annotation.frame}\` zero-based / \`${annotation.frame + 1}\` one-based`);
    lines.push(`- Time: \`${formatSeconds(annotation.time)}s\``);
    lines.push(`- Selected bounds: ${formatRect(annotation.rect)}`);
    if (annotation.screenshots.length) {
      lines.push(`- Screenshot${annotation.screenshots.length === 1 ? "" : "s"}: ${annotation.screenshots.map((item) => `\`${item}\``).join(", ")}`);
    }
    lines.push("- User comment:");
    lines.push("");
    lines.push(blockquote(annotation.comment));
    lines.push("");
  });

  lines.push("## Annotation Source Snapshot", "");
  lines.push("Use this only to recover missing metadata if the file path is unavailable.");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(trimAnnotationSource(annotationData, annotations), null, 2));
  lines.push("```");

  return lines.join("\n");
}

function trimAnnotationSource(value, activeAnnotations) {
  return {
    version: value.version || 1,
    project: value.project || value.slug,
    annotations: activeAnnotations.map((annotation) => ({
      id: annotation.id,
      status: annotation.status,
      frame: annotation.frame,
      time: annotation.time,
      rect: annotation.rect,
      screenshot: annotation.screenshots[0],
      comment: annotation.comment,
    })),
  };
}

function formatRect(rect) {
  if (!rect || !Object.keys(rect).length) return "`not supplied`";
  const parts = [];
  if ([rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) {
    parts.push(`x=${round(rect.x)}`, `y=${round(rect.y)}`, `width=${round(rect.width)}`, `height=${round(rect.height)}`);
  }
  if (rect.normalized) {
    parts.push(
      `normalized x=${round(rect.normalized.x)}`,
      `y=${round(rect.normalized.y)}`,
      `width=${round(rect.normalized.width)}`,
      `height=${round(rect.normalized.height)}`,
    );
  }
  return parts.length ? `\`${parts.join(", ")}\`` : `\`${JSON.stringify(rect)}\``;
}

function blockquote(value) {
  return String(value)
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function readJson(filePath, label) {
  return readJsonText(fs.readFileSync(filePath, "utf8"), label);
}

function readJsonText(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`Could not parse ${label}: ${error.message}`);
  }
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return NaN;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(3).replace(/\.?0+$/, "") : String(value);
}

function formatSeconds(value) {
  return round(Number(value));
}

function relativePath(filePath) {
  return path.relative(root, filePath) || ".";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function printUsage() {
  console.log(`Usage:
  npm run storyboard:annotation-prompt -- projects/<project-name>
  npm run storyboard:annotation-prompt -- <project-slug> -- --input storyboard/annotations.json --print
  npm run storyboard:annotation-prompt -- <project-slug> -- --input - --output -

Reads saved Inky browser annotations and writes a paste-ready Codex prompt to:
  projects/<project-name>/prompt/annotation-prompt.md

Options:
  --input <path|->     Annotation JSON path relative to the project, absolute path, or stdin.
  --output <path|->    Prompt output path relative to the project, absolute path, or stdout.
  --include-done       Include annotations already marked done.
  --print              Also print the generated prompt to stdout.`);
}
