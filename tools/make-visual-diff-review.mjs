#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const [framesDirArg, outputDirArg = "output/review/visual-diff", ...restRaw] = process.argv.slice(2);
const rest = restRaw.filter((arg) => arg !== "--");

function usage() {
  console.error("Usage: node tools/make-visual-diff-review.mjs <framesDir> [outputDir] [--baseline <previousFramesDir>] [--threshold 0.1] [--max-diff-ratio 0.08] [--every 1] [--fail-on-review false]");
  process.exit(1);
}

function readFlag(args, name, fallback = "") {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1] ?? fallback;
}

function numberFlag(args, name, fallback) {
  const value = Number(readFlag(args, name, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

function boolFlag(args, name, fallback = false) {
  const value = readFlag(args, name, String(fallback));
  return ["1", "true", "yes", "y"].includes(String(value).toLowerCase());
}

function listFramePngs(dir) {
  return readdirSync(dir)
    .filter((file) => /^frame-\d+.*\.png$/i.test(file))
    .sort();
}

function readPng(pathValue) {
  return PNG.sync.read(readFileSync(pathValue));
}

function comparePair({ leftPath, rightPath, diffPath, threshold }) {
  const left = readPng(leftPath);
  const right = readPng(rightPath);
  if (left.width !== right.width || left.height !== right.height) {
    return {
      skipped: true,
      reason: `dimension mismatch: ${left.width}x${left.height} vs ${right.width}x${right.height}`,
    };
  }

  const diff = new PNG({ width: left.width, height: left.height });
  const diffPixels = pixelmatch(left.data, right.data, diff.data, left.width, left.height, {
    threshold,
    includeAA: false,
    alpha: 0.15,
    aaColor: [255, 211, 74],
    diffColor: [220, 38, 38],
    diffColorAlt: [37, 99, 235],
  });

  writeFileSync(diffPath, PNG.sync.write(diff));
  const pixels = left.width * left.height;
  return {
    skipped: false,
    width: left.width,
    height: left.height,
    diffPixels,
    diffRatio: diffPixels / pixels,
  };
}

function tryContactSheet(paths, outputPath) {
  if (!paths.length) return false;
  try {
    execFileSync("magick", [...paths, "-resize", "360x", "-append", outputPath], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!framesDirArg) usage();

const framesDir = resolve(framesDirArg);
if (!existsSync(framesDir)) {
  console.error(`Frames directory not found: ${framesDir}`);
  process.exit(1);
}

const outputDir = resolve(outputDirArg);
const baselineDir = readFlag(rest, "--baseline", "");
const threshold = numberFlag(rest, "--threshold", 0.1);
const maxDiffRatio = numberFlag(rest, "--max-diff-ratio", 0.08);
const every = Math.max(1, Math.floor(numberFlag(rest, "--every", 1)));
const failOnReview = boolFlag(rest, "--fail-on-review", false);

mkdirSync(outputDir, { recursive: true });

const frameFiles = listFramePngs(framesDir);
if (frameFiles.length < 2 && !baselineDir) {
  console.error(`Need at least 2 frame PNGs for adjacent review. Found ${frameFiles.length}.`);
  process.exit(1);
}

const pairs = [];
if (baselineDir) {
  const resolvedBaselineDir = resolve(baselineDir);
  if (!existsSync(resolvedBaselineDir)) {
    console.error(`Baseline directory not found: ${resolvedBaselineDir}`);
    process.exit(1);
  }
  const baselineFiles = new Set(listFramePngs(resolvedBaselineDir));
  frameFiles.forEach((file) => {
    if (!baselineFiles.has(file)) return;
    pairs.push({
      label: file,
      leftPath: join(resolvedBaselineDir, file),
      rightPath: join(framesDir, file),
    });
  });
} else {
  for (let index = 0; index < frameFiles.length - 1; index += every) {
    pairs.push({
      label: `${frameFiles[index]} -> ${frameFiles[index + 1]}`,
      leftPath: join(framesDir, frameFiles[index]),
      rightPath: join(framesDir, frameFiles[index + 1]),
    });
  }
}

const results = pairs.map((pair, index) => {
  const diffFile = `diff-${String(index).padStart(3, "0")}.png`;
  const diffPath = join(outputDir, diffFile);
  const comparison = comparePair({
    ...pair,
    diffPath,
    threshold,
  });
  const status = comparison.skipped ? "Skipped" : comparison.diffRatio > maxDiffRatio ? "Review" : "Pass";
  return {
    ...pair,
    diffFile,
    diffPath,
    status,
    ...comparison,
  };
});

const contactSheetPath = join(outputDir, "visual-diff-contact-sheet.png");
const contactSheetCreated = tryContactSheet(
  results.filter((result) => !result.skipped).map((result) => result.diffPath),
  contactSheetPath,
);

const markdown = [
  "# Visual Diff Review",
  "",
  baselineDir
    ? `Mode: baseline comparison from \`${baselineDir}\` to \`${framesDir}\`.`
    : `Mode: adjacent frame comparison in \`${framesDir}\`.`,
  "",
  `Pixel threshold: ${threshold}`,
  `Review threshold: ${(maxDiffRatio * 100).toFixed(2)}% changed pixels`,
  "",
  contactSheetCreated ? `Contact sheet: \`${contactSheetPath}\`` : "Contact sheet: not created; ImageMagick was unavailable or no diff images were written.",
  "",
  "| Pair | Changed Pixels | Changed % | Diff Image | Status | Notes |",
  "|---|---:|---:|---|---|---|",
];

results.forEach((result) => {
  const changedPixels = result.skipped ? "-" : String(result.diffPixels);
  const changedRatio = result.skipped ? "-" : `${(result.diffRatio * 100).toFixed(2)}%`;
  const diff = result.skipped ? "-" : `\`${result.diffPath}\``;
  const notes = result.skipped
    ? result.reason
    : result.status === "Review"
      ? "Inspect for drift, flicker, missing props, bubble jumps, or intended large motion."
      : "Diff is within the configured review threshold.";
  markdown.push(`| ${basename(result.label)} | ${changedPixels} | ${changedRatio} | ${diff} | ${result.status} | ${notes} |`);
});

markdown.push(
  "",
  "## How To Use This",
  "",
  "- Bright red/blue regions show where pixels changed between frames.",
  "- Large differences can be valid during big action, but they should be explainable by the animation.",
  "- Small repeated differences in locked backgrounds, labels, speech bubbles, or paper texture usually mean unwanted shimmer.",
  "- Use this with the polish pass; it is a detector, not a replacement for lighthouse review.",
  "",
);

writeFileSync(join(outputDir, "visual-diff-report.md"), markdown.join("\n"));
writeFileSync(
  join(outputDir, "visual-diff-report.json"),
  `${JSON.stringify({
    framesDir,
    baselineDir: baselineDir ? resolve(baselineDir) : null,
    threshold,
    maxDiffRatio,
    every,
    contactSheet: contactSheetCreated ? contactSheetPath : null,
    results: results.map(({ leftPath, rightPath, diffPath, status, skipped, reason, width, height, diffPixels, diffRatio }) => ({
      leftPath,
      rightPath,
      diffPath: skipped ? null : diffPath,
      status,
      skipped,
      reason: reason || null,
      width: width || null,
      height: height || null,
      diffPixels: diffPixels ?? null,
      diffRatio: diffRatio ?? null,
    })),
  }, null, 2)}\n`,
);

const reviewCount = results.filter((result) => result.status === "Review").length;
console.log(`Created visual diff review for ${results.length} pair(s) in ${outputDir}${reviewCount ? `; ${reviewCount} need review` : ""}`);

if (failOnReview && reviewCount > 0) {
  process.exit(2);
}
