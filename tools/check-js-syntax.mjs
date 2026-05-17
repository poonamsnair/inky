#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["src", "tools"];
const extensions = new Set([".js", ".mjs"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, files);
    } else if ([...extensions].some((extension) => path.endsWith(extension))) {
      files.push(path);
    }
  }
  return files;
}

const files = roots.flatMap((root) => walk(root));

for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

console.log(`Checked ${files.length} JavaScript file(s).`);
