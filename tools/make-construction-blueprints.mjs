#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const [framesDir, outputDir = "output/blueprints/latest", ...rest] = process.argv.slice(2);

function usage() {
  console.error("Usage: node tools/make-construction-blueprints.mjs <sourceFramesDir> [outputDir] [--requirements <text>] [--spec <json>]");
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

function defaultBlueprint(key) {
  const index = Number.parseInt(key, 10);
  const scene = index + 1;
  return {
    action: `Frame ${scene}: redraw the source pose as a new pen-and-watercolor still`,
    riskyShapes: ["face/head", "head-neck-body connection", "limbs/hands/paws", "body/clothing", "primary props", "foreground action", "background props"],
    lighthouseUse: [
      "Use the source for pose, object placement, and body contact points.",
      "Use the current project requirements for requested changes and recurring design anchors.",
      "Do not paste, trace as final art, or preserve source details that conflict with the requirements.",
    ],
    attachmentChains: [
      "head -> neck/shoulder bridge -> torso/body mass",
      "for animals: head -> neck -> ribcage/body -> hips -> tail",
      "shoulder -> sleeve -> forearm -> wrist -> hand",
      "shoulder/hip -> limb -> hand/paw/foot",
      "primary prop -> contact surface",
      "foreground action object -> hand/desk/body contact",
    ],
    silhouetteGate: [
      "body parts are nameable before texture",
      "no blank gap between attached body masses",
      "hands have wrists or cuffs",
      "facial features sit inside the head/face shape",
      "props read as separate objects before hatching and watercolor detail",
      "user-requested changes are visible as clean silhouettes",
    ],
    crops: [
      { name: "source face", box: [250, 120, 460, 430], note: "copy pose logic, not final pixels" },
      { name: "source hands", box: [160, 350, 670, 360], note: "find sleeve/forearm/wrist/hand chain" },
      { name: "source action props", box: [120, 650, 730, 330], note: "keep important props and contact points readable" },
    ],
  };
}

if (!framesDir) usage();
if (!existsSync(framesDir)) {
  console.error(`Source frame directory not found: ${framesDir}`);
  process.exit(1);
}

const requirements = readFlag(rest, "--requirements", "");
const specPath = readFlag(rest, "--spec", "");
const userSpec = specPath ? JSON.parse(readFileSync(specPath, "utf8")) : {};
const specFrames = userSpec.frames || {};

mkdirSync(outputDir, { recursive: true });

const frameFiles = readdirSync(framesDir)
  .filter((file) => /^frame-\d+\.png$/i.test(file))
  .sort();

if (frameFiles.length === 0) {
  console.error(`No source frame PNGs named frame-00.png, frame-01.png, etc. found in ${framesDir}.`);
  process.exit(1);
}

const boardPaths = [];
const markdown = [
  "# Source-Lighthouse Construction Blueprint",
  "",
  "Use this before final drawing. The source frame is a lighthouse for pose, contact, and composition; the final artwork still gets redrawn in the approved style.",
  "",
];

if (requirements) {
  markdown.push(`User changes: ${requirements}`);
  markdown.push("");
}

for (const fileName of frameFiles) {
  const key = frameKey(fileName);
  const index = Number.parseInt(key, 10);
  const blueprint = { ...defaultBlueprint(key), ...(specFrames[key] || specFrames[String(index)] || {}) };
  const sourcePath = join(framesDir, fileName);
  const size = imageSize(sourcePath);
  const tempDir = join(outputDir, `.blueprint-${key}`);
  mkdirSync(tempDir, { recursive: true });

  const sourceFull = join(tempDir, "source-full.png");
  runMagick([
    sourcePath,
    "-resize",
    "430x",
    "-bordercolor",
    "#efe0c7",
    "-border",
    "8",
    sourceFull,
  ]);

  const cropPaths = [];
  blueprint.crops.forEach((crop, cropIndex) => {
    const cropPath = join(tempDir, `crop-${String(cropIndex).padStart(2, "0")}.png`);
    runMagick([
      sourcePath,
      "-crop",
      scaledCropGeometry(crop.box, size),
      "+repage",
      "-resize",
      "350x",
      "-bordercolor",
      "#efe0c7",
      "-border",
      "8",
      cropPath,
    ]);
    cropPaths.push(cropPath);
  });

  const cropStrip = join(tempDir, "crops.png");
  runMagick([...cropPaths, "-append", cropStrip]);

  const boardPath = join(outputDir, `blueprint-${key}-${basename(fileName)}`);
  runMagick([
    sourceFull,
    cropStrip,
    "+append",
    "-background",
    "#1a1711",
    "-gravity",
    "center",
    "-extent",
    "860x1320",
    boardPath,
  ]);
  boardPaths.push(boardPath);

  markdown.push(`## ${basename(fileName)} — ${blueprint.action}`);
  markdown.push("");
  markdown.push(`Blueprint board: \`${boardPath}\``);
  markdown.push(`Source frame: \`${sourcePath}\``);
  markdown.push("");
  markdown.push("### Use The Lighthouse For");
  blueprint.lighthouseUse.forEach((item) => markdown.push(`- ${item}`));
  markdown.push("");
  markdown.push("### Risky Shapes");
  blueprint.riskyShapes.forEach((item) => markdown.push(`- ${item}`));
  markdown.push("");
  markdown.push("### Attachment Chains To Draw First");
  blueprint.attachmentChains.forEach((item) => markdown.push(`- ${item}`));
  markdown.push("");
  markdown.push("### Simple Silhouette Gate");
  blueprint.silhouetteGate.forEach((item) => markdown.push(`- ${item}`));
  markdown.push("");
  markdown.push("### Detail Lock");
  markdown.push("- Do not add watercolor washes, hatching, or dense texture until the pose reads in simple shapes.");
  markdown.push("");
}

if (boardPaths.length > 1) {
  runMagick([...boardPaths, "-append", join(outputDir, "blueprint-contact-sheet.png")]);
}

writeFileSync(join(outputDir, "construction-blueprint.md"), markdown.join("\n"));

for (const fileName of readdirSync(outputDir).filter((name) => name.startsWith(".blueprint-"))) {
  rmSync(join(outputDir, fileName), { recursive: true, force: true });
}

console.log(`Created ${boardPaths.length} construction blueprint board(s) in ${outputDir}`);
