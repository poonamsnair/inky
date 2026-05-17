#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readFlag(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const args = process.argv.slice(2);
const projectSlug = readFlag(args, "--project", args[0] || "");
const baseUrl = readFlag(args, "--url", "http://127.0.0.1:5176/");

if (!projectSlug) {
  console.error("Usage: npm run render -- --project <project-slug> [--url http://127.0.0.1:5176/]");
  process.exit(1);
}

const manifestPath = join(root, "projects", projectSlug, "project.json");
if (!existsSync(manifestPath)) {
  console.error(`Project manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const url = new URL(baseUrl);
url.searchParams.set("project", manifest.slug);
url.searchParams.set("export", "");

execFileSync(
  process.execPath,
  [
    join(root, "tools/render-canvas-frames.mjs"),
    url.toString(),
    join("projects", manifest.slug, manifest.outputs?.frames || "outputs/frames"),
    String(manifest.totalFrames || 1),
  ],
  { cwd: root, stdio: "inherit" },
);
