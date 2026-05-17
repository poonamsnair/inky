#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.error("Usage: node tools/start-storyboard-project.mjs <storyboardImage> <outputDir> [columns] [rows] [--requirements \"...\"] [--name \"...\"]");
  process.exit(1);
}

function readFlag(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const args = process.argv.slice(2);
const storyboardImage = args[0];
const outputDir = args[1] ?? "storyboard-frames/latest";
const columns = args[2] && !args[2].startsWith("--") ? args[2] : "3";
const rows = args[3] && !args[3].startsWith("--") ? args[3] : "4";
const requirements = readFlag(args, "--requirements", "None specified yet.");
const projectName = readFlag(args, "--name", outputDir.split(/[\\/]/).filter(Boolean).at(-1) ?? "storyboard");

if (!storyboardImage) usage();
if (!existsSync(storyboardImage)) {
  console.error(`Storyboard image not found: ${storyboardImage}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

execFileSync(
  process.execPath,
  [join(root, "tools/extract-storyboard-frames.mjs"), storyboardImage, outputDir, columns, rows],
  { stdio: "inherit" },
);

const frameFiles = readdirSync(outputDir)
  .filter((file) => /^frame-\d+\.png$/i.test(file))
  .sort();

const ledger = {
  name: projectName,
  source: storyboardImage,
  outputDir,
  requirements,
  requirementsDocument: join(outputDir, "requirements.md"),
  columns: Number(columns),
  rows: Number(rows),
  frames: frameFiles.map((file, index) => ({
    index,
    sourceFrame: join(outputDir, file),
    drawnFrame: "",
    status: "not-started",
    plan: {
      poseAndAction: "",
      userChanges: requirements,
      sharedAnchors: ["character identity", "head/hair", "face details", "clothing/body", "hands/limbs", "primary props", "environment/background"],
      lighthouseEvidence: "",
      attachmentChains: "",
      semanticRisks: "",
      densePenZones: "",
      softWatercolorZones: "",
    },
    consistencyAudit: index === 0 ? "first-frame-anchor" : "pending",
  })),
};

writeFileSync(join(outputDir, "storyboard-ledger.json"), `${JSON.stringify(ledger, null, 2)}\n`);

const frameRows = ledger.frames
  .map((frame) => `| ${frame.index + 1} | \`${frame.sourceFrame}\` | ${frame.status} | ${frame.consistencyAudit} | |`)
  .join("\n");

const requirementRows = ledger.frames
  .map((frame) => `| ${frame.index + 1} |  |  |  |  |  |`)
  .join("\n");

writeFileSync(
  join(outputDir, "requirements.md"),
  `# ${projectName} Requirements

This document holds storyboard-specific decisions for the current run. Keep reusable process rules in skills; keep concrete character, prop, style, and frame details here.

## Source

- Storyboard image: \`${storyboardImage}\`
- Extracted frames: \`${outputDir}\`
- Grid: ${columns} columns x ${rows} rows

## User Request

${requirements}

## Required Output

- Final deliverable:
- Animation length / pacing:
- Video format:
- Browser route for review:

## Visual Style

- Medium:
- Line quality:
- Watercolor palette:
- Texture density:
- Reference/lighthouse rule:

## Character And Identity Anchors

- Character identity:
- Head / hair:
- Face details:
- Mouth / expression:
- Clothing / body:
- Hands / limbs:

## Recurring Props And Environment

- Primary props:
- Surface / setting:
- Background:
- Items that must be removed or changed:

## Frame Requirements

| # | Action / pose | Lighthouse evidence | Attachment chains | Semantic risks | Notes |
|---|---|---|---|---|---|
${requirementRows}

## Validation Gates

- Construction blueprint reviewed before detailed rendering.
- Still frames pass semantic clarity review.
- Adjacent frames pass consistency review.
- Browser check confirms source images are not visible in the final art.
- Final video renders and plays back.
`,
);

writeFileSync(
  join(outputDir, "storyboard-plan.md"),
  `# ${projectName}

## Requirements

${requirements}

See \`requirements.md\` for storyboard-specific character, prop, and frame decisions.

## Workflow

1. Document the current storyboard requirements.
2. Draw frame 1 as a finished still from its lighthouse reference.
3. For each next frame, draw from its own lighthouse reference.
4. Compare the new finished frame against the previous finished frame.
5. Fix semantic clarity and consistency drift before animating.
6. Animate only after still frames are coherent.

## Shared Anchors

- Character identity: same proportions and recognizable recurring features.
- Head/hair: same color family, shape language, silhouette.
- Face details: same facial feature treatment; features never detach from the head.
- Clothing/body: same structure, scale, and recurring details.
- Hands/limbs: same simplification, attachment logic, and stroke language.
- Props: same scale, contact points, and perspective unless the story changes them.
- Background: same composition, panel style, and paper grain.

## Frame Ledger

| # | Source frame | Status | Consistency | Notes |
|---|---|---|---|---|
${frameRows}
`,
);

console.log(`Storyboard project ready: ${outputDir}`);
console.log(`Ledger: ${join(outputDir, "storyboard-ledger.json")}`);
console.log(`Requirements: ${join(outputDir, "requirements.md")}`);
console.log(`Plan: ${join(outputDir, "storyboard-plan.md")}`);
