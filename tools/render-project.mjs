#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projectPathForDir, projectRefForDir, resolveProjectDir } from "./project-paths.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readFlag(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

const args = process.argv.slice(2);
const projectArg = readFlag(args, "--project", args[0] || "");
const baseUrl = readFlag(args, "--url", "http://127.0.0.1:5176/");

if (!projectArg) {
  console.error("Usage: npm run render -- --project <project-ref-or-path> [--url http://127.0.0.1:5176/]");
  process.exit(1);
}

const projectDir = resolveProjectDir(projectArg, { root });
const manifestPath = join(projectDir, "project.json");
if (!existsSync(manifestPath)) {
  console.error(`Project manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const projectRef = projectRefForDir(projectDir, manifest, { root });
const projectPath = projectPathForDir(projectDir, manifest, { root });
const url = new URL(baseUrl);
url.searchParams.set("project", projectRef);
url.searchParams.set("export", "");

execFileSync(
  process.execPath,
  [
    join(root, "tools/render-canvas-frames.mjs"),
    url.toString(),
    join(projectPath, manifest.outputs?.frames || "outputs/frames"),
    String(manifest.totalFrames || 1),
  ],
  { cwd: root, stdio: "inherit" },
);
