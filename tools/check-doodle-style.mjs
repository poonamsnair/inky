#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).filter((arg) => arg !== "--");

if (!args.length || args.includes("--help")) {
  printUsage();
  process.exit(args.includes("--help") ? 0 : 1);
}

const options = parseArgs(args);
const projectDir = resolveProjectDir(options.project);

if (!existsSync(projectDir)) {
  console.error(`Project directory not found: ${projectDir}`);
  process.exit(1);
}

const manifest = readManifest(projectDir);
const referencePaths = listReferencePngs(projectDir);
if (!referencePaths.length) {
  console.error(`No PNG reference images found in ${join(projectDir, "image")}`);
  process.exit(1);
}

const framePath = options.frame ? resolve(root, options.frame) : findDefaultFrame(projectDir, manifest);
if (!framePath || !existsSync(framePath)) {
  console.error("Could not find a rendered frame to audit. Pass --frame <path> or render frames first.");
  process.exit(1);
}

const outputDir = options.outputDir
  ? resolve(root, options.outputDir)
  : join(projectDir, "outputs", "review-doodle-style");
mkdirSync(outputDir, { recursive: true });

const references = referencePaths.map((path) => ({
  path,
  metrics: measurePng(path),
}));
const output = {
  path: framePath,
  metrics: measurePng(framePath),
};
const referenceSummary = summarizeMetrics(references.map((item) => item.metrics));
const checks = buildChecks(referenceSummary, output.metrics);
const verdict = checks.some((check) => check.status === "Review") ? "Review" : "Pass";

writeFileSync(
  join(outputDir, "doodle-style-report.json"),
  `${JSON.stringify({
    projectDir,
    framePath,
    references: references.map((item) => ({
      path: item.path,
      metrics: item.metrics,
    })),
    referenceSummary,
    output,
    checks,
    verdict,
  }, null, 2)}\n`,
);

writeFileSync(
  join(outputDir, "doodle-style-report.md"),
  buildMarkdownReport({
    projectDir,
    framePath,
    referencePaths,
    referenceSummary,
    outputMetrics: output.metrics,
    checks,
    verdict,
  }),
);

console.log(`Doodle style audit: ${verdict}. Report written to ${join(outputDir, "doodle-style-report.md")}`);

if (options.failOnReview && verdict === "Review") {
  process.exit(2);
}

function parseArgs(rawArgs) {
  const out = {
    project: "",
    frame: "",
    outputDir: "",
    failOnReview: false,
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--frame") {
      out.frame = rawArgs[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--output" || arg === "--out") {
      out.outputDir = rawArgs[index + 1] || "";
      index += 1;
      continue;
    }
    if (arg === "--fail-on-review") {
      out.failOnReview = true;
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

function printUsage() {
  console.error("Usage: node tools/check-doodle-style.mjs <projectDir|projectSlug> [--frame <png>] [--output <dir>] [--fail-on-review]");
}

function resolveProjectDir(projectArg) {
  const direct = resolve(projectArg);
  if (existsSync(direct)) return direct;
  const fromRoot = resolve(root, projectArg);
  if (existsSync(fromRoot)) return fromRoot;
  return resolve(root, "projects", projectArg);
}

function readManifest(dir) {
  const manifestPath = join(dir, "project.json");
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function listReferencePngs(dir) {
  const imageDir = join(dir, "image");
  if (!existsSync(imageDir)) return [];
  const files = readdirSync(imageDir).filter((file) => file.toLowerCase().endsWith(".png"));
  const references = files.filter((file) => /^reference[-_\d\w ]*\.png$/i.test(file));
  return (references.length ? references : files)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .map((file) => join(imageDir, file));
}

function findDefaultFrame(dir, manifest) {
  const framesDir = manifest?.outputs?.frames ? join(dir, manifest.outputs.frames) : join(dir, "outputs", "frames");
  if (existsSync(framesDir)) {
    const frameFiles = readdirSync(framesDir)
      .filter((file) => /^frame-\d+.*\.png$/i.test(file))
      .sort((left, right) => frameNumber(left) - frameNumber(right));
    if (frameFiles.length) return join(framesDir, frameFiles[frameFiles.length - 1]);
  }

  const fallbackFiles = [
    "outputs/final-check-redraw.png",
    "outputs/final-check.png",
    "outputs/final.png",
  ];
  return fallbackFiles.map((file) => join(dir, file)).find((path) => existsSync(path)) || "";
}

function frameNumber(file) {
  const match = /frame-(\d+)/i.exec(file);
  return match ? Number(match[1]) : 0;
}

function measurePng(path) {
  const png = PNG.sync.read(readFileSync(path));
  const { width, height, data } = png;
  const pixelCount = width * height;
  const luminance = new Float32Array(pixelCount);
  const totals = {
    dark: 0,
    heavyInk: 0,
    paper: 0,
    accent: 0,
    warmAccent: 0,
    pink: 0,
    yellow: 0,
    blackDominantNonPaper: 0,
    nonPaper: 0,
  };
  let saturationSum = 0;

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 4;
    const alpha = data[offset + 3] / 255;
    const r = blendOverWhite(data[offset], alpha);
    const g = blendOverWhite(data[offset + 1], alpha);
    const b = blendOverWhite(data[offset + 2], alpha);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const sat = saturation(r, g, b);
    luminance[index] = lum;
    saturationSum += sat;

    const isDark = lum < 95;
    const isHeavyInk = lum < 50;
    const isPaper = lum > 236 && sat < 0.08;
    const isAccent = sat > 0.18 && lum > 40 && lum < 248;
    const isWarmAccent = isAccent && r > b * 1.05;
    const isPink = isAccent && r > 150 && b > 120 && g < 225;
    const isYellow = isAccent && r > 160 && g > 125 && b < 140;

    if (isDark) totals.dark += 1;
    if (isHeavyInk) totals.heavyInk += 1;
    if (isPaper) totals.paper += 1;
    if (isAccent) totals.accent += 1;
    if (isWarmAccent) totals.warmAccent += 1;
    if (isPink) totals.pink += 1;
    if (isYellow) totals.yellow += 1;
    if (!isPaper) {
      totals.nonPaper += 1;
      if (isDark) totals.blackDominantNonPaper += 1;
    }
  }

  let edges = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const center = y * width + x;
      const horizontal = Math.abs(luminance[center + 1] - luminance[center - 1]);
      const vertical = Math.abs(luminance[center + width] - luminance[center - width]);
      if (horizontal + vertical > 58) edges += 1;
    }
  }

  return {
    width,
    height,
    inkCoverage: ratio(totals.dark, pixelCount),
    heavyInkCoverage: ratio(totals.heavyInk, pixelCount),
    paperCoverage: ratio(totals.paper, pixelCount),
    accentCoverage: ratio(totals.accent, pixelCount),
    warmAccentCoverage: ratio(totals.warmAccent, pixelCount),
    pinkCoverage: ratio(totals.pink, pixelCount),
    yellowCoverage: ratio(totals.yellow, pixelCount),
    blackDominance: ratio(totals.blackDominantNonPaper, totals.nonPaper || 1),
    edgeDensity: ratio(edges, Math.max(1, (width - 2) * (height - 2))),
    averageSaturation: ratio(saturationSum, pixelCount),
  };
}

function blendOverWhite(value, alpha) {
  return value * alpha + 255 * (1 - alpha);
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max <= 0 ? 0 : (max - min) / max;
}

function ratio(value, total) {
  return total <= 0 ? 0 : value / total;
}

function summarizeMetrics(metricsList) {
  const keys = Object.keys(metricsList[0]).filter((key) => typeof metricsList[0][key] === "number");
  const summary = {};
  keys.forEach((key) => {
    const values = metricsList.map((metrics) => metrics[key]);
    summary[key] = {
      min: Math.min(...values),
      mean: values.reduce((sum, value) => sum + value, 0) / values.length,
      max: Math.max(...values),
    };
  });
  return summary;
}

function buildChecks(referenceSummary, metrics) {
  const inkMean = referenceSummary.inkCoverage.mean;
  const paperMean = referenceSummary.paperCoverage.mean;
  const edgeMean = referenceSummary.edgeDensity.mean;
  const accentMax = referenceSummary.accentCoverage.max;
  const checks = [
    checkRange({
      id: "ink-coverage",
      label: "black ink coverage",
      value: metrics.inkCoverage,
      min: Math.max(0.035, inkMean * 0.45),
      max: Math.min(0.42, inkMean * 2.4 + 0.035),
      reviewLow: "The drawing may feel too faint or under-inked beside the references.",
      reviewHigh: "The drawing may feel too filled-in and lose the white doodle-paper feel.",
    }),
    checkRange({
      id: "paper-coverage",
      label: "white paper space",
      value: metrics.paperCoverage,
      min: Math.max(0.42, paperMean * 0.58),
      max: 0.98,
      reviewLow: "The image may be too dense or painted; the references leave a lot of white breathing room.",
      reviewHigh: "The image may be too empty; add enough contour, clothing pattern, or character detail to read as drawn.",
    }),
    checkRange({
      id: "edge-density",
      label: "sketchy edge activity",
      value: metrics.edgeDensity,
      min: Math.max(0.006, edgeMean * 0.35),
      max: Math.min(0.16, edgeMean * 2.7 + 0.018),
      reviewLow: "The frame may be too smooth; add hand-drawn contour breaks, hatching, stripes, or doodled detail.",
      reviewHigh: "The frame may be too noisy; simplify texture so the doodle silhouette stays readable.",
    }),
    checkRange({
      id: "accent-color",
      label: "limited color accents",
      value: metrics.accentCoverage,
      min: 0,
      max: Math.max(0.16, accentMax + 0.08),
      reviewHigh: "The references mostly use black ink with restrained pink/yellow accents; reduce broad color fills.",
    }),
    checkRange({
      id: "black-dominance",
      label: "black-dominant marks",
      value: metrics.blackDominance,
      min: 0.2,
      max: 0.96,
      reviewLow: "Colored or pale marks may be overpowering the black ink language.",
      reviewHigh: "The frame may be almost all black marks; check that sparse color accents still read when expected.",
    }),
  ];

  return checks;
}

function checkRange({ id, label, value, min, max, reviewLow = "", reviewHigh = "" }) {
  let status = "Pass";
  let note = "Within the reference-style range.";
  if (value < min) {
    status = "Review";
    note = reviewLow || `Expected at least ${formatPercent(min)}.`;
  } else if (value > max) {
    status = "Review";
    note = reviewHigh || `Expected at most ${formatPercent(max)}.`;
  }
  return {
    id,
    label,
    value,
    min,
    max,
    status,
    note,
  };
}

function buildMarkdownReport({ projectDir, framePath, referencePaths, referenceSummary, outputMetrics, checks, verdict }) {
  const lines = [
    "# Doodle Style Review",
    "",
    `Project: \`${projectDir}\``,
    `Audited frame: \`${framePath}\``,
    "",
    "## References",
    "",
    ...referencePaths.map((path) => `- \`${path}\``),
    "",
    "## Style Metrics",
    "",
    "| Metric | Reference Mean | Output |",
    "|---|---:|---:|",
  ];

  [
    ["inkCoverage", "Black ink coverage"],
    ["heavyInkCoverage", "Heavy ink coverage"],
    ["paperCoverage", "White paper space"],
    ["accentCoverage", "Color accent coverage"],
    ["pinkCoverage", "Pink accent coverage"],
    ["yellowCoverage", "Yellow accent coverage"],
    ["blackDominance", "Black dominance in non-paper marks"],
    ["edgeDensity", "Sketchy edge density"],
    ["averageSaturation", "Average saturation"],
  ].forEach(([key, label]) => {
    lines.push(`| ${label} | ${formatPercent(referenceSummary[key].mean)} | ${formatPercent(outputMetrics[key])} |`);
  });

  lines.push(
    "",
    "## Checks",
    "",
    "| Check | Expected Range | Output | Status | Notes |",
    "|---|---:|---:|---|---|",
  );

  checks.forEach((check) => {
    lines.push(`| ${check.label} | ${formatPercent(check.min)}-${formatPercent(check.max)} | ${formatPercent(check.value)} | ${check.status} | ${check.note} |`);
  });

  lines.push(
    "",
    `Verdict: **${verdict}**`,
    "",
    "This review is a style detector, not a replacement for human lighthouse review. Use it to catch outputs that are too smooth, too colorful, too dense, or too unlike the black-ink doodle references before the final polish pass.",
    "",
  );

  return lines.join("\n");
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}
