#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const [framesDir, outputDir = "output/review/latest", ...rest] = process.argv.slice(2);

function usage() {
  console.error("Usage: node tools/make-adjacent-review-sheets.mjs <drawnFramesDir> [outputDir] [--refs <sourceFramesDir>]");
  process.exit(1);
}

function readFlag(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

if (!framesDir) usage();
if (!existsSync(framesDir)) {
  console.error(`Drawn frames directory not found: ${framesDir}`);
  process.exit(1);
}

const refsDir = readFlag(rest, "--refs", "");
mkdirSync(outputDir, { recursive: true });

const frameFiles = readdirSync(framesDir)
  .filter((file) => /^frame-\d+\.png$/i.test(file))
  .sort();

if (frameFiles.length < 2) {
  console.error(`Need at least 2 drawn frame PNGs named frame-00.png, frame-01.png, etc. Found ${frameFiles.length}.`);
  process.exit(1);
}

const pairPaths = [];

for (let index = 0; index < frameFiles.length - 1; index += 1) {
  const left = join(framesDir, frameFiles[index]);
  const right = join(framesDir, frameFiles[index + 1]);
  const pairPath = join(outputDir, `pair-${String(index).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}.png`);

  if (refsDir && existsSync(join(refsDir, frameFiles[index])) && existsSync(join(refsDir, frameFiles[index + 1]))) {
    const refRow = join(outputDir, `.ref-row-${index}.png`);
    const drawnRow = join(outputDir, `.drawn-row-${index}.png`);
    execFileSync("magick", [join(refsDir, frameFiles[index]), "-resize", "480x", join(refsDir, frameFiles[index + 1]), "-resize", "480x", "+append", refRow], { stdio: "inherit" });
    execFileSync("magick", [left, "-resize", "480x", right, "-resize", "480x", "+append", drawnRow], { stdio: "inherit" });
    execFileSync("magick", [refRow, drawnRow, "-append", pairPath], { stdio: "inherit" });
    rmSync(refRow, { force: true });
    rmSync(drawnRow, { force: true });
  } else {
    execFileSync("magick", [left, "-resize", "480x", right, "-resize", "480x", "+append", pairPath], { stdio: "inherit" });
  }

  pairPaths.push(pairPath);
}

execFileSync("magick", [...pairPaths, "-append", join(outputDir, "adjacent-contact-sheet.png")], {
  stdio: "inherit",
});

const auditRows = pairPaths
  .map((pairPath, index) => `## Pair ${index + 1}: ${basename(frameFiles[index])} -> ${basename(frameFiles[index + 1])}\n\nImage: \`${pairPath}\`\n\n### Pass\n\n- \n\n### Fix before animation\n\n- \n\n### Required Object Gate\n\n- Required props from requirements/lighthouse:\n- Missing or unclear props:\n- Props that appear/disappear during the transition:\n\n### Animation anchors\n\n- Head/neck:\n- Body chain:\n- Face details:\n- Hands/arms:\n- Legs/paws/feet:\n- Recurring props:\n- Shirt/body:\n- Locked background/set:\n`)
  .join("\n");

writeFileSync(
  join(outputDir, "consistency-audit.md"),
  `# Adjacent Frame Consistency Audit\n\nCheck character identity, face details, head/hair, clothing/body, hands/limbs, required object presence, props, background, and pen/watercolor technique before animating.\n\n${auditRows}`,
);

console.log(`Created ${pairPaths.length} adjacent review sheets in ${outputDir}`);
