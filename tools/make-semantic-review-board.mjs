#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const [framesDir, outputDir = "output/review/latest-semantic", ...rest] = process.argv.slice(2);

function usage() {
  console.error("Usage: node tools/make-semantic-review-board.mjs <drawnFramesDir> [outputDir] [--spec <semanticRegionsJson>]");
  process.exit(1);
}

function readFlag(args, name, fallback = "") {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1] ?? fallback;
}

function runMagick(args) {
  execFileSync("magick", args, { stdio: "inherit" });
}

function imageSize(imagePath) {
  const output = execFileSync("magick", ["identify", "-format", "%w %h", imagePath], { encoding: "utf8" });
  const [width, height] = output.trim().split(/\s+/).map(Number);
  return { width, height };
}

function scaledCropGeometry(box, size) {
  const designWidth = 960;
  const designHeight = 1120;
  const [rawX, rawY, rawW, rawH] = box;
  const x = Math.max(0, Math.round(rawX * size.width / designWidth));
  const y = Math.max(0, Math.round(rawY * size.height / designHeight));
  const maxW = Math.max(1, size.width - x);
  const maxH = Math.max(1, size.height - y);
  const w = Math.max(1, Math.min(maxW, Math.round(rawW * size.width / designWidth)));
  const h = Math.max(1, Math.min(maxH, Math.round(rawH * size.height / designHeight)));
  return `${w}x${h}+${x}+${y}`;
}

function frameKey(fileName) {
  return fileName.match(/^frame-(\d+)\.png$/i)?.[1] ?? "";
}

function defaultFrameSpec(key) {
  const index = Number.parseInt(key, 10);
  const scene = index + 1;
  return {
    intent: `Frame ${scene}: clear hand-drawn desk scene`,
    mustReadAs: [
      "character, pose, foreground action, and important props read without the source image",
      "hands and arms are visibly attached",
      "body, clothing, and limbs form a plausible parent-child chain",
      "clothing and props show their named identifying parts, not just a colored blob",
      "speech bubbles are solid white shapes with no background-colored tail gaps",
      "speech bubbles use one continuous body+tail path, not a patched tail join",
      "speech bubbles do not contain visible socket circles, ovals, or thought-dot marks",
      "obvious bugs are redrawn at their source instead of covered by patches",
      "no removed or changed source objects survive as vague leftover shapes",
    ],
    regions: [
      { name: "face-head-features", box: [300, 130, 380, 440], expect: "head and facial features are attached and readable" },
      { name: "hands-arms-body", box: [165, 390, 650, 390], expect: "hands connect to arms/body and support the pose" },
      { name: "torso-clothing-limbs", box: [210, 430, 560, 390], expect: "shirt, waistband, openings, and limbs connect as one physical body chain" },
      { name: "foreground-props", box: [270, 650, 520, 320], expect: "important props read clearly and contact the surface/body" },
    ],
  };
}

if (!framesDir) usage();
if (!existsSync(framesDir)) {
  console.error(`Drawn frames directory not found: ${framesDir}`);
  process.exit(1);
}

const specPath = readFlag(rest, "--spec", "");
const userSpec = specPath ? JSON.parse(readFileSync(specPath, "utf8")) : {};
const defaultOverrides = userSpec.default || userSpec.defaults || {};
const specFrames = userSpec.frames || {};

mkdirSync(outputDir, { recursive: true });

const frameFiles = readdirSync(framesDir)
  .filter((file) => /^frame-\d+\.png$/i.test(file))
  .sort();

if (frameFiles.length === 0) {
  console.error(`No drawn frame PNGs named frame-00.png, frame-01.png, etc. found in ${framesDir}.`);
  process.exit(1);
}

const boardPaths = [];
const markdown = [
  "# Semantic Clarity Audit",
  "",
  "Use these boards before animation. Each full frame is paired with close crops of the places most likely to create confusing blobs or detached body parts.",
  "",
];

for (const fileName of frameFiles) {
  const key = frameKey(fileName);
  const frameSpec = {
    ...defaultFrameSpec(key),
    ...defaultOverrides,
    ...(specFrames[key] || specFrames[String(Number.parseInt(key, 10))] || {}),
  };
  const sourcePath = join(framesDir, fileName);
  const size = imageSize(sourcePath);
  const frameOutDir = join(outputDir, `.semantic-${key}`);
  mkdirSync(frameOutDir, { recursive: true });

  const fullPath = join(frameOutDir, "full.png");
  runMagick([sourcePath, "-resize", "420x", "-bordercolor", "#efe0c7", "-border", "8", fullPath]);

  const cropPaths = [];
  frameSpec.regions.forEach((region, regionIndex) => {
    const cropPath = join(frameOutDir, `crop-${String(regionIndex).padStart(2, "0")}.png`);
    runMagick([
      sourcePath,
      "-crop",
      scaledCropGeometry(region.box, size),
      "+repage",
      "-resize",
      "360x",
      "-bordercolor",
      "#efe0c7",
      "-border",
      "8",
      cropPath,
    ]);
    cropPaths.push(cropPath);
  });

  const cropsStrip = join(frameOutDir, "crops.png");
  runMagick([...cropPaths, "-append", cropsStrip]);

  const boardPath = join(outputDir, `semantic-${key}-${basename(fileName)}`);
  runMagick([
    fullPath,
    cropsStrip,
    "+append",
    "-background",
    "#1a1711",
    "-gravity",
    "center",
    "-extent",
    "820x1320",
    boardPath,
  ]);
  boardPaths.push(boardPath);

  markdown.push(`## ${basename(fileName)} — ${frameSpec.intent}`);
  markdown.push("");
  markdown.push(`Image: \`${boardPath}\``);
  markdown.push("");
  markdown.push("### Must Read As");
  frameSpec.mustReadAs.forEach((item) => markdown.push(`- ${item}`));
  markdown.push("");
  markdown.push("### Crop Checks");
  frameSpec.regions.forEach((region) => markdown.push(`- ${region.name}: ${region.expect}`));
  markdown.push("");
  markdown.push("### Object Identity Checks");
  markdown.push("- Clothing: garment-specific parts are visible before texture; shorts need waistband, two leg openings, center seam/crotch split, and legs exiting underneath.");
  markdown.push("- Body chain: clothing is anchored to the body, for example shirt hem -> waistband -> leg openings -> legs. If the body moves, the clothing anchor moves with it.");
  markdown.push("- Props: required parts are visible before texture, such as pot rim/body/saucer, watering-can handle/spout/body, book cover/spine/pages, or desk top/contact shadow.");
  markdown.push("- Speech bubbles: body, tail, and tail socket are one solid white fill with no background color leaking through.");
  markdown.push("- Speech bubble construction: speech bubbles are one continuous body+tail path, not a post-draw patch.");
  markdown.push("- Speech bubble cleanup: no visible socket circles, ovals, eraser seams, or dot trails unless the bubble type is a thought bubble.");
  markdown.push("- Root-cause fixes: visible defects should be corrected by rebuilding anchors, paths, layer order, or object-part schemas; cover-up patches fail semantic review.");
  markdown.push("- If a shape can only be named by explanation, mark it Fix and redraw its silhouette/parts.");
  markdown.push("");
  markdown.push("### Verdict");
  markdown.push("- Pass / Fix:");
  markdown.push("- Notes:");
  markdown.push("");
}

if (boardPaths.length > 1) {
  runMagick([...boardPaths, "-append", join(outputDir, "semantic-contact-sheet.png")]);
}

writeFileSync(join(outputDir, "semantic-clarity-audit.md"), markdown.join("\n"));

for (const fileName of readdirSync(outputDir).filter((name) => name.startsWith(".semantic-"))) {
  rmSync(join(outputDir, fileName), { recursive: true, force: true });
}

console.log(`Created ${boardPaths.length} semantic review board(s) in ${outputDir}`);
