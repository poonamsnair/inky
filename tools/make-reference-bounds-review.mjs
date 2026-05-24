#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { compareBoundsToConstruction } from "../src/reference-construction.js";
import { projectRefForDir, resolveProjectDir } from "./project-paths.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const options = parseArgs(process.argv.slice(2));
if (!options.project || options.help) {
  printUsage();
  process.exit(options.help ? 0 : 1);
}

const projectDir = resolveProjectDir(options.project, { root });
const manifestPath = join(projectDir, "project.json");
if (!existsSync(manifestPath)) {
  console.error(`Project manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const projectRef = projectRefForDir(projectDir, manifest, { root });
const constructionPath = resolve(projectDir, options.construction || manifest.storyboard?.construction || "storyboard/construction.json");
const rendererPath = resolve(projectDir, manifest.renderer || "renderer.js");
const outputPath = resolve(projectDir, options.out || manifest.storyboard?.referenceBoundsReview || "storyboard/reference-bounds-review.json");

if (!existsSync(constructionPath)) {
  console.error(`Optional reference alignment map not found: ${projectRelative(root, constructionPath)}`);
  console.error("Create one only when you need numeric alignment help: npm run storyboard:construction -- --project " + projectRef);
  process.exit(1);
}
if (!existsSync(rendererPath)) {
  console.error(`Renderer not found: ${projectRelative(root, rendererPath)}`);
  process.exit(1);
}

const construction = JSON.parse(await readFile(constructionPath, "utf8"));
const renderer = await import(`${pathToFileURL(rendererPath).href}?t=${Date.now()}`);
const getBounds = renderer.inspectImportantBounds || renderer.getImportantBounds;
if (typeof getBounds !== "function") {
  console.error("Renderer does not export inspectImportantBounds() or getImportantBounds(), so there are no optional bounds to compare.");
  process.exit(1);
}

const frames = selectFrames(manifest, options);
const frameResults = [];
for (const frame of frames) {
  const raw = getBounds(frame, { manifest }) || [];
  const boxes = (Array.isArray(raw) ? raw : raw.boxes || []).map((box) => ({ ...box, frame }));
  const comparisons = compareBoundsToConstruction(boxes, construction, {
    canvas: {
      width: Number(manifest.width) || construction.canvas?.width || 960,
      height: Number(manifest.height) || construction.canvas?.height || 620,
    },
    centerTolerance: options.centerTolerance,
    sizeMin: options.sizeMin,
    sizeMax: options.sizeMax,
  });
  frameResults.push({ frame, boxes, comparisons });
}

const flat = frameResults.flatMap((result) => result.comparisons.map((item) => ({ ...item, frame: result.frame })));
const summary = {
  pass: flat.filter((item) => item.verdict === "pass").length,
  warn: flat.filter((item) => item.verdict === "warn").length,
  needsTarget: flat.filter((item) => item.verdict === "needs-target").length,
  fail: flat.filter((item) => item.verdict === "fail").length,
};

const report = {
  version: 1,
  engine: "inky-reference-bounds-review",
  project: manifest.slug,
  projectRef,
  generatedAt: new Date().toISOString(),
  construction: projectRelative(projectDir, constructionPath),
  renderer: projectRelative(projectDir, rendererPath),
  frames,
  summary,
  results: frameResults,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownPath(outputPath), markdownReport(report));

if (options.updateManifest) {
  manifest.storyboard = {
    ...(manifest.storyboard || {}),
    construction: projectRelative(projectDir, constructionPath),
    referenceBoundsReview: projectRelative(projectDir, outputPath),
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`Optional reference-bounds review: ${projectRef}`);
console.log(`Frames checked: ${frames.join(", ")}`);
console.log(`Result: ${summary.pass} pass, ${summary.warn} warn, ${summary.needsTarget} needs-target, ${summary.fail} fail`);
console.log(`Saved: ${projectRelative(root, outputPath)}`);
process.exit(summary.fail ? 1 : 0);

function parseArgs(args) {
  const out = {
    project: "",
    construction: "",
    out: "",
    frames: "",
    allFrames: false,
    centerTolerance: undefined,
    sizeMin: undefined,
    sizeMax: undefined,
    updateManifest: true,
    help: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help") out.help = true;
    else if (arg === "--project") out.project = args[++index] || "";
    else if (arg === "--construction") out.construction = args[++index] || "";
    else if (arg === "--out") out.out = args[++index] || "";
    else if (arg === "--frames") out.frames = args[++index] || "";
    else if (arg === "--all-frames") out.allFrames = true;
    else if (arg === "--center-tolerance") out.centerTolerance = Number(args[++index]);
    else if (arg === "--size-min") out.sizeMin = Number(args[++index]);
    else if (arg === "--size-max") out.sizeMax = Number(args[++index]);
    else if (arg === "--no-update-manifest") out.updateManifest = false;
    else if (!arg.startsWith("--") && !out.project) out.project = arg;
  }
  return out;
}

function selectFrames(manifest, options) {
  const totalFrames = Math.max(1, Math.round(Number(manifest.totalFrames) || 1));
  if (options.allFrames) return Array.from({ length: totalFrames }, (_, index) => index);
  if (options.frames) {
    return [...new Set(
      options.frames
        .split(",")
        .map((value) => Math.max(0, Math.min(totalFrames - 1, Math.round(Number(value)))))
        .filter(Number.isFinite),
    )].sort((a, b) => a - b);
  }
  return [...new Set([0, Math.floor((totalFrames - 1) / 2), totalFrames - 1])];
}

function markdownReport(report) {
  const lines = [
    "# Optional Reference-Bounds Review",
    "",
    `Project: \`${report.projectRef}\``,
    `Construction: \`${report.construction}\``,
    `Renderer: \`${report.renderer}\``,
    `Frames: ${report.frames.join(", ")}`,
    "",
    `Summary: ${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.needsTarget} needs-target, ${report.summary.fail} fail.`,
    "",
  ];

  for (const frame of report.results) {
    lines.push(`## Frame ${frame.frame}`);
    if (!frame.comparisons.length) {
      lines.push("");
      lines.push("No important bounds were returned.");
      lines.push("");
      continue;
    }
    for (const item of frame.comparisons) {
      const target = item.referenceObject ? ` -> ${item.referenceObject.id}` : "";
      const metrics = item.metrics
        ? ` center ${item.metrics.centerDistance}px, width ${item.metrics.widthRatio}x, height ${item.metrics.heightRatio}x`
        : " no metrics";
      lines.push(`- ${item.verdict}: ${item.id}${target};${metrics}`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function markdownPath(jsonPath) {
  return jsonPath.replace(/\.json$/i, ".md");
}

function printUsage() {
  console.error(
    `Usage: npm run storyboard:reference-bounds -- --project <project-ref-or-path> [--frames 0,48,95] [--all-frames]
Optional numeric alignment check for projects that already chose to create a reference alignment map.`,
  );
}

function projectRelative(base, target) {
  return target.replace(resolve(base), "").replace(/^[/\\]+/, "").replace(/\\/g, "/");
}
