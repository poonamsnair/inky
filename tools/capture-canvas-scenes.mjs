#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const [url, outputDir = "outputs/captured-scenes", countArg = "12"] = process.argv.slice(2);

if (!url) {
  console.error("Usage: node tools/capture-canvas-scenes.mjs <url> [outputDir] [sceneCount]");
  process.exit(1);
}

const sceneCount = Number(countArg);
mkdirSync(outputDir, { recursive: true });

for (let index = 0; index < sceneCount; index += 1) {
  const sceneUrl = new URL(url);
  sceneUrl.searchParams.set("scene", String(index));
  sceneUrl.searchParams.set("capture", String(Date.now()));
  execFileSync(
    "npx",
    [
      "playwright",
      "screenshot",
      "--browser=chromium",
      "--wait-for-timeout=450",
      "--viewport-size=1000,1200",
      sceneUrl.toString(),
      join(outputDir, `frame-${String(index).padStart(2, "0")}.png`),
    ],
    { stdio: "inherit" },
  );
}

console.log(`Captured ${sceneCount} scene screenshots into ${outputDir}`);
