#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const [input, output = "storyboard-frames/latest", columns = "3", rows = "4"] = process.argv.slice(2);

if (!input) {
  console.error("Usage: node tools/extract-storyboard-frames.mjs <image> [outputDir] [columns] [rows]");
  process.exit(1);
}

if (!existsSync(input)) {
  console.error(`Input image not found: ${input}`);
  process.exit(1);
}

mkdirSync(output, { recursive: true });

const framePattern = join(output, "frame-%02d.png");
execFileSync("magick", [input, "-crop", `${columns}x${rows}@`, "+repage", framePattern], {
  stdio: "inherit",
});

const generated = Number(columns) * Number(rows);
const frames = [];
const rowPaths = [];
for (let row = 0; row < Number(rows); row += 1) {
  const rowFrames = [];
  for (let column = 0; column < Number(columns); column += 1) {
    const index = row * Number(columns) + column;
    const framePath = join(output, `frame-${String(index).padStart(2, "0")}.png`);
    frames.push({ index, row, column, path: framePath });
    rowFrames.push(framePath);
  }
  const rowPath = join(output, `row-${row + 1}.png`);
  execFileSync("magick", [...rowFrames, "+append", rowPath], { stdio: "inherit" });
  rowPaths.push(rowPath);
}

execFileSync("magick", [...rowPaths, "-append", join(output, "contact-sheet.png")], {
  stdio: "inherit",
});

rowPaths.forEach((rowPath) => rmSync(rowPath, { force: true }));

writeFileSync(
  join(output, "frames.json"),
  `${JSON.stringify({
    source: input,
    columns: Number(columns),
    rows: Number(rows),
    count: generated,
    frames,
  }, null, 2)}\n`,
);

console.log(`Extracted ${generated} frames from ${basename(input)} into ${output}`);
