#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.error(`Usage:
node tools/create-animation-project.mjs --image <storyboard> --name <project-name> --grid <3x4|4x3|CxR> --prompt "..."

Example:
npm run new -- --image ./storyboards/cat.png --name cat-yarn-watercolor --grid 3x4 --prompt "Animate this cat playing with yarn in ink and watercolor."`);
  process.exit(1);
}

function readFlag(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function parseGrid(value = "3x4") {
  const match = String(value).trim().toLowerCase().match(/^(\d+)\s*x\s*(\d+)$/);
  if (!match) {
    console.error(`Grid must look like 3x4, 4x3, or 6x2. Received: ${value}`);
    process.exit(1);
  }
  return {
    columns: Number(match[1]),
    rows: Number(match[2]),
  };
}

function slugify(value) {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "new-storyboard-animation"
  );
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

const args = process.argv.slice(2);
const imageArg = readFlag(args, "--image");
const nameArg = readFlag(args, "--name");
const gridArg = readFlag(args, "--grid", "3x4");
const promptArg = readFlag(args, "--prompt", "Match the storyboard unless I request changes.");
const fps = Number(readFlag(args, "--fps", "12"));
const totalFrames = Number(readFlag(args, "--frames", "96"));
const width = Number(readFlag(args, "--width", "960"));
const height = Number(readFlag(args, "--height", "620"));

if (!imageArg || !nameArg) usage();

const sourceImage = resolve(imageArg);
if (!existsSync(sourceImage)) {
  console.error(`Storyboard image not found: ${imageArg}`);
  process.exit(1);
}

const slug = slugify(nameArg);
const grid = parseGrid(gridArg);
const extension = extname(sourceImage).toLowerCase() || ".png";
const projectRoot = join(root, "projects", slug);
const imageDir = join(projectRoot, "image");
const promptDir = join(projectRoot, "prompt");
const storyboardDir = join(projectRoot, "storyboard");
const outputsDir = join(projectRoot, "outputs");
const storyboardImagePath = join(imageDir, `storyboard${extension}`);

mkdirSync(imageDir, { recursive: true });
mkdirSync(promptDir, { recursive: true });
mkdirSync(storyboardDir, { recursive: true });
mkdirSync(outputsDir, { recursive: true });
copyFileSync(sourceImage, storyboardImagePath);

const relativeStoryboardImage = `projects/${slug}/image/storyboard${extension}`;
const relativeStoryboardDir = `projects/${slug}/storyboard`;

execFileSync(
  process.execPath,
  [
    join(root, "tools/start-storyboard-project.mjs"),
    relativeStoryboardImage,
    relativeStoryboardDir,
    String(grid.columns),
    String(grid.rows),
    "--requirements",
    promptArg,
    "--name",
    slug,
  ],
  { cwd: root, stdio: "inherit" },
);

const agentPrompt = `# Build Inky animation: ${slug}

Use the source storyboard as a lighthouse.
Do not paste the source image into the final animation.

## Source
- Original storyboard: projects/${slug}/image/storyboard${extension}
- Extracted frames: projects/${slug}/storyboard/
- Grid: ${grid.columns} x ${grid.rows}

## User request
${promptArg}

## Required work
1. Read AGENTS.md, DESIGN.md, and the relevant skills.
2. Use project.json as the source of truth.
3. Build projects/${slug}/renderer.js.
4. Use material tools from src/material-tools.js.
5. Add speech/caption tracks only when required.
6. Preview with /?project=${slug}.
7. Render frames and update outputs.
`;

writeFileSync(join(promptDir, "agent-prompt.md"), agentPrompt);

const manifest = {
  slug,
  title: titleFromSlug(slug),
  status: "draft",
  width,
  height,
  fps,
  totalFrames,
  grid,
  storyboard: {
    sourceImage: `image/storyboard${extension}`,
    framesDir: "storyboard",
  },
  prompt: {
    requirements: "storyboard/requirements.md",
    agentPrompt: "prompt/agent-prompt.md",
  },
  tracks: {
    speechBubbles: null,
    captions: null,
  },
  renderer: "renderer.js",
  outputs: {
    frames: "outputs/frames",
    video: null,
  },
};

writeFileSync(join(projectRoot, "project.json"), `${JSON.stringify(manifest, null, 2)}\n`);

writeFileSync(
  join(projectRoot, "renderer.js"),
  `export const project = {
  width: ${width},
  height: ${height},
  fps: ${fps},
  totalFrames: ${totalFrames},
};

export function drawFrame(ctx, frame, helpers) {
  ctx.fillStyle = "#f6ead5";
  ctx.fillRect(0, 0, project.width, project.height);

  helpers.drawLabel?.(
    ctx,
    "Renderer not built yet",
    project.width / 2,
    project.height / 2,
  );
}
`,
);

console.log(`Created Inky animation project: projects/${slug}`);
console.log(`Manifest: projects/${slug}/project.json`);
console.log(`Renderer stub: projects/${slug}/renderer.js`);
console.log(`Agent prompt: projects/${slug}/prompt/agent-prompt.md`);
console.log(`Preview route: /?project=${slug}`);
console.log(`Source image copied from: ${basename(sourceImage)}`);
