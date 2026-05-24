#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { projectRefForDir, resolveProjectDir } from "./project-paths.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const options = parseArgs(process.argv.slice(2));
if (!options.project || options.help) {
  printUsage();
  process.exit(options.help ? 0 : 1);
}

const projectDir = resolveProjectDir(options.project, { root });
const manifestPath = join(projectDir, "project.json");
if (!existsSync(manifestPath)) {
  console.error(`Project manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const projectRef = projectRefForDir(projectDir, manifest, { root });
const rootSlug = manifest.sceneCollection?.rootSlug || projectRef.split("/")[0] || manifest.slug;
const rootDir = resolveProjectDir(rootSlug, { root });
const sourceDir = options.sourceProject ? resolveProjectDir(options.sourceProject, { root }) : rootDir;
const sourceManifestPath = join(sourceDir, "project.json");
const sourceManifest = existsSync(sourceManifestPath) ? JSON.parse(await readFile(sourceManifestPath, "utf8")) : {};
const sourceRendererPath = resolve(sourceDir, options.renderer || sourceManifest.renderer || "renderer.js");
if (!existsSync(sourceRendererPath)) {
  console.error(`Renderer not found for style extraction: ${sourceRendererPath}`);
  process.exit(1);
}

const rendererSource = await readFile(sourceRendererPath, "utf8");
const sourceProjectRef = projectRefForDir(sourceDir, sourceManifest, { root });
const outputPath = resolve(projectDir, options.out || "style-tokens.json");
const tokens = buildStyleTokens({
  manifest,
  projectRef,
  sourceProjectRef,
  sourceRendererPath,
  rendererSource,
  rootDir,
  projectDir,
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(tokens, null, 2)}\n`);

if (options.updateManifest) {
  manifest.style = {
    ...(manifest.style || {}),
    tokens: projectRelative(projectDir, outputPath),
    inheritsProjectStyle: manifest.style?.inheritsProjectStyle ?? projectDir !== rootDir,
    sharedTokens: projectDir === rootDir ? undefined : "../../style-tokens.json",
  };
  if (manifest.style.sharedTokens === undefined) delete manifest.style.sharedTokens;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

console.log(`Saved style tokens: ${projectRelative(root, outputPath)}`);
console.log(`Palette tokens: ${Object.keys(tokens.palette.tokens).length}; brush contracts: ${tokens.brushContracts.length}`);

function buildStyleTokens({ manifest, projectRef, sourceProjectRef, sourceRendererPath, rendererSource, rootDir, projectDir }) {
  const colors = extractColorConstants(rendererSource);
  const brushes = extractBrushContracts(rendererSource);
  const rootTokenPath = join(rootDir, "style-tokens.json");
  const inheritsFromRoot = projectDir !== rootDir;

  return {
    version: 1,
    engine: "inky-style-tokenizer",
    project: manifest.slug || basename(projectDir),
    projectRef,
    generatedAt: new Date().toISOString(),
    source: {
      projectRef: sourceProjectRef,
      renderer: projectRelative(root, sourceRendererPath),
    },
    inheritance: inheritsFromRoot
      ? {
          mode: "inherits-project-style",
          rootProjectRef: sourceProjectRef,
          rootStyleTokens: existsSync(rootTokenPath) ? "../../style-tokens.json" : "",
        }
      : {
          mode: "root-style",
          rootProjectRef: projectRef,
        },
    palette: {
      tokens: colors,
      roles: inferPaletteRoles(colors),
    },
    brushContracts: brushes,
    drawingGuidance: [
      "Draw big silhouettes before detail lines: hair cap, head, neck, torso, limbs, props, lettering.",
      "Hair should be built from an outer ink mass plus a few inner lock strokes, not a flat face-covering patch.",
      "Sleeves, wrists, and hands must be one connected chain before stripe texture is added.",
      "Keep watercolor fills semi-transparent and inside established ink contours.",
      "When matching a reference closely, use the overlay and canvas captures first; numeric bounds review is an optional final check.",
    ],
    lineQuality: {
      mood: "friendly hand-drawn pen ink with soft watercolor fills",
      preferredBrushes: brushes.map((brush) => brush.id).slice(0, 5),
      avoid: ["solid vector masks for hair or face", "unanchored hands", "decorative patches over anatomy errors"],
    },
  };
}

function extractColorConstants(source) {
  const tokens = {};
  const regex = /\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*["'](#[0-9a-fA-F]{3,8})["']/g;
  for (const match of source.matchAll(regex)) {
    tokens[match[1]] = match[2].toLowerCase();
  }
  return tokens;
}

function extractBrushContracts(source) {
  const brushes = [];
  const createRegex = /\bconst\s+([a-zA-Z][\w]*)\s*=\s*createBrush\s*\(\s*(\{[\s\S]*?\n\})\s*\);/g;
  for (const match of source.matchAll(createRegex)) {
    brushes.push(brushContract(match[1], "createBrush", match[2]));
  }

  const cloneRegex = /\bconst\s+([a-zA-Z][\w]*)\s*=\s*([a-zA-Z][\w]*)\.clone\s*\(\s*(\{[\s\S]*?\n\})\s*\);/g;
  for (const match of source.matchAll(cloneRegex)) {
    brushes.push({
      ...brushContract(match[1], `${match[2]}.clone`, match[3]),
      inheritsFrom: match[2],
    });
  }

  return brushes;
}

function brushContract(id, factory, block) {
  return {
    id,
    factory,
    settings: extractSimpleSettings(block),
    raw: block
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .join("\n"),
  };
}

function extractSimpleSettings(block) {
  const settings = {};
  const regex = /^\s*([a-zA-Z][\w]*)\s*:\s*([^,\n{}]+),?/gm;
  for (const match of block.matchAll(regex)) {
    const raw = match[2].trim();
    settings[match[1]] = raw.replace(/^["']|["']$/g, "");
  }
  return settings;
}

function inferPaletteRoles(tokens) {
  const roles = {};
  for (const [name, value] of Object.entries(tokens)) {
    const key = name.toLowerCase();
    if (key.includes("paper") || key.includes("background")) roles.paper = value;
    else if (key.includes("ink")) roles.ink = value;
    else if (key.includes("hair")) roles.hair = value;
    else if (key.includes("skin")) roles.skin = value;
    else if (key.includes("cheek")) roles.cheek = value;
    else if (key.includes("sweater")) roles.sweater = value;
    else if (key.includes("pant")) roles.pants = value;
    else if (key.includes("shoe")) roles.shoes = value;
  }
  return roles;
}

function parseArgs(args) {
  const out = {
    project: "",
    sourceProject: "",
    renderer: "",
    out: "",
    updateManifest: true,
    help: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help") out.help = true;
    else if (arg === "--project") out.project = args[++index] || "";
    else if (arg === "--source-project") out.sourceProject = args[++index] || "";
    else if (arg === "--renderer") out.renderer = args[++index] || "";
    else if (arg === "--out") out.out = args[++index] || "";
    else if (arg === "--no-update-manifest") out.updateManifest = false;
    else if (!arg.startsWith("--") && !out.project) out.project = arg;
  }
  return out;
}

function printUsage() {
  console.error(
    "Usage: npm run style:tokens -- --project <project-ref-or-path> [--source-project inky-opening] [--out style-tokens.json]",
  );
}

function projectRelative(base, target) {
  return target.replace(resolve(base), "").replace(/^[/\\]+/, "").replace(/\\/g, "/");
}
