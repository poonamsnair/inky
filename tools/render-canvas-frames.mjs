#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const [
  url = "http://127.0.0.1:5177/?export",
  outputDir = "projects/clown-juggling/outputs/frames",
  countArg = "92",
] = process.argv.slice(2);

mkdirSync(outputDir, { recursive: true });

const frameCount = Number(countArg);

if (!Number.isFinite(frameCount) || frameCount <= 0) {
  console.error("Frame count must be a positive number.");
  process.exit(1);
}

for (let index = 0; index < frameCount; index += 1) {
  const frameUrl = new URL(url);
  frameUrl.searchParams.set("export", "");
  frameUrl.searchParams.set("frame", String(index));
  frameUrl.searchParams.set("capture", String(Date.now()));
  const outPath = join(outputDir, `frame-${String(index).padStart(3, "0")}.png`);
  execFileSync(
    "npx",
    [
      "playwright",
      "screenshot",
      "--browser=chromium",
      "--wait-for-timeout=500",
      "--viewport-size=960,620",
      frameUrl.toString(),
      outPath,
    ],
    { stdio: "inherit" },
  );
}

writeFileSync(join(outputDir, "frames-rendered.json"), `${JSON.stringify({ url, frameCount }, null, 2)}\n`);
console.log(`Rendered ${frameCount} canvas frame(s) into ${outputDir}`);
