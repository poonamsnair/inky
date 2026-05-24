#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.error(`Usage:
node tools/create-animation-project.mjs --image <storyboard-or-scene> --name <project-name> --prompt "..." [--style <image>]... [--grid <auto|3x4|4x3|CxR>]

Example:
npm run new -- --image ./storyboards/cat.png --style ./styles/crayon.png --name cat-yarn-watercolor --prompt "Animate this cat playing with yarn in ink and watercolor."`);
  process.exit(1);
}

function readFlag(args, name, fallback = "") {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function readFlags(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) values.push(args[index + 1]);
  }
  return values;
}

function parseGrid(value = "3x4") {
  if (String(value).trim().toLowerCase() === "auto") return { mode: "auto", columns: 3, rows: 4 };
  const match = String(value).trim().toLowerCase().match(/^(\d+)\s*x\s*(\d+)$/);
  if (!match) {
    console.error(`Grid must look like 3x4, 4x3, or 6x2. Received: ${value}`);
    process.exit(1);
  }
  return {
    mode: "manual",
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

function slugifyFileBase(value) {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "style"
  );
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function styleReferenceFileName(sourceStyle, index, used) {
  const extension = extname(sourceStyle).toLowerCase() || ".png";
  const base = slugifyFileBase(basename(sourceStyle, extension));
  const prefix = `style-${String(index + 1).padStart(2, "0")}`;
  let candidate = `${prefix}-${base}${extension}`;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${prefix}-${base}-${suffix}${extension}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function imageTypeForExtension(fileName) {
  const extension = extname(fileName).replace(/^\./, "").toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  return "image/png";
}

function writeAutoStoryboardBrief({ storyboardDir, slug, relativeStoryboardImage, prompt }) {
  writeFileSync(
    join(storyboardDir, "requirements.md"),
    `# ${slug} Requirements

This document holds project-specific drawing decisions. The target image has not been pre-sliced; inspect it first and decide whether it is a single scene or a multi-panel storyboard.

## Source

- Target image: \`${relativeStoryboardImage}\`
- Style inspiration folder: \`projects/${slug}/insp\`
- Grid: agent infers from the target image if panel extraction is useful

## User Request

${prompt}

## Visual Style

- Inspiration refs:
- Medium:
- Line quality:
- Palette:
- Texture density:

## Drawing Notes

- If the target image is a single scene, draw it directly.
- If the target image is a storyboard, infer the panel grid visually before extracting frames.
- Keep source and style images out of the final canvas; redraw with Inky canvas primitives.
`,
  );

  writeFileSync(
    join(storyboardDir, "storyboard-plan.md"),
    `# ${slug}

Start by inspecting \`${relativeStoryboardImage}\`. Decide whether it is one scene or a storyboard, then plan drawing, style, and motion from that reading.
`,
  );
}

const args = process.argv.slice(2);
const imageArg = readFlag(args, "--image");
const nameArg = readFlag(args, "--name");
const gridArg = readFlag(args, "--grid", "auto");
const promptArg = readFlag(
  args,
  "--prompt",
  "Use the reference image to plan the composition. Analyze any insp/ style references; if none are provided, match the target image's own style. Then draw with Inky canvas primitives.",
);
const styleArgs = readFlags(args, "--style");
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
const inspDir = join(projectRoot, "insp");
const promptDir = join(projectRoot, "prompt");
const storyboardDir = join(projectRoot, "storyboard");
const outputsDir = join(projectRoot, "outputs");
const storyboardImagePath = join(imageDir, `storyboard${extension}`);

mkdirSync(imageDir, { recursive: true });
mkdirSync(inspDir, { recursive: true });
mkdirSync(promptDir, { recursive: true });
mkdirSync(storyboardDir, { recursive: true });
mkdirSync(outputsDir, { recursive: true });
copyFileSync(sourceImage, storyboardImagePath);

const usedStyleNames = new Set();
const styleReferences = styleArgs
  .map((styleArg, index) => {
    const sourceStyle = resolve(styleArg);
    if (!existsSync(sourceStyle)) {
      console.error(`Style reference not found: ${styleArg}`);
      process.exit(1);
    }
    const savedName = styleReferenceFileName(sourceStyle, index, usedStyleNames);
    copyFileSync(sourceStyle, join(inspDir, savedName));
    return {
      path: `insp/${savedName}`,
      name: basename(sourceStyle),
      type: imageTypeForExtension(savedName),
      command: `/style insp/${savedName}`,
    };
  });

const relativeStoryboardImage = `projects/${slug}/image/storyboard${extension}`;
const relativeStoryboardDir = `projects/${slug}/storyboard`;

if (grid.mode === "auto") {
  writeAutoStoryboardBrief({ storyboardDir, slug, relativeStoryboardImage, prompt: promptArg });
} else {
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
}

const agentPrompt = `# Build Inky animation: ${slug}

Use Inky as a Canvas API and visual feedback loop for agents.
Look at the reference, decide the likely medium, choose explicit brush parameters, preview, compare against the reference overlay, and tune brush/timing values by eye.
Use any files in insp/ as a style palette for color, mood, line quality, and texture. If no style reference is provided, match the target image's own style. Do not paste source or style images into the final animation.

## Source
- Reference image: projects/${slug}/image/storyboard${extension}
- Style references folder: projects/${slug}/insp/
- Optional extracted frames: projects/${slug}/storyboard/
- Grid: ${grid.mode === "auto" ? "agent infers from the target image" : `${grid.columns} x ${grid.rows}`}

## Slash references
- /image image/storyboard${extension} (target scene/storyboard)
${styleReferences.length ? styleReferences.map((reference) => `- ${reference.command} (${reference.name})`).join("\n") : `- /style insp/<file> for optional style images saved in projects/${slug}/insp/`}

## User request
${promptArg}

## Required work
1. Read AGENTS.md, DESIGN.md, and the relevant skills.
2. Use project.json as the source of truth.
3. Build projects/${slug}/renderer.js.
4. Import createBrush, listBrushes, keyframe, timeline, and easings from src/inky-canvas.js.
5. Interpret slash references in the user request: /image points to the target scene, and /style points to one or more artistic reference images.
6. Look at the target image first and decide whether it is one scene or a multi-panel storyboard. If it is a storyboard, infer the grid visually before extracting panels.
7. If the prompt names an insp/<file> style reference, call window.inky.analyzeStyle('insp/<file>') and describe the medium, palette, mood, line quality, texture, and composition before drawing.
8. If no style reference is named, derive the medium, palette, mood, line quality, texture, and composition from the target image.
9. Use window.inky.showReference('image/storyboard${extension}', { opacity: 0.3 }) while aligning, then hide it before judging exports.
10. Capture your canvas with window.inky.captureFrameDataUrl(frame) when a still image helps you compare and self-correct.
11. Use window.inky.extractPathsFromImage('image/storyboard${extension}', { mode: 'outline' }) only as coordinate scaffolding when exact contours matter; redraw those coordinates with Inky brushes.
12. Load style-tokens.json with window.inky.loadStyleTokens() when present, and treat it as editable guidance for palette and brush contracts.
13. Analyze the storyboard and style references, choose from listBrushes() ['pencil', 'charcoal', 'crayon', 'watercolor'], and test at least two plausible brushes when the medium is not obvious.
14. Use the selected brush when drawing paths and tune size, thinning, smoothing, streamline, jitter, textureScale, color, roughness, opacity, and seed before writing lower-level texture code.
15. Compose motion with keyframe(), timeline(), and easings; expose useful getFrameDebug() values for frame-by-frame inspection.
16. Import optional companions from src/companion-tools.js only when the panel needs Rough.js, Atrament replay, irregular geometry, svg2roughjs, Vivus draw-on animation, p5.brush, or image path helpers.
17. Add speech/caption tracks only when required.
18. Preview with /?project=${slug}.
19. Render frames and update outputs.
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
  style: {
    inspDir: "insp",
    references: styleReferences,
    tokens: "style-tokens.json",
  },
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
  `import { createBrush, easings, keyframe, listBrushes, timeline } from "../../src/inky-canvas.js";

export const project = {
  width: ${width},
  height: ${height},
  fps: ${fps},
  totalFrames: ${totalFrames},
};

const availableBrushes = listBrushes();
const selectedBrush = availableBrushes.includes("pencil") ? "pencil" : availableBrushes[0];

const ink = createBrush({
  type: selectedBrush,
  color: "#17120d",
  size: 3.2,
  textureScale: 0.9,
  roughness: 0.35,
  thinning: 0.5,
  smoothing: 0.34,
  streamline: 0.18,
  jitter: 0.35,
  seed: 42,
  inkFlow: { enabled: true, endOpacity: 0.76, segments: 7 },
});

const accent = ink.clone({
  color: "#9f4f38",
  size: 1.8,
  opacity: 0.5,
  jitter: 0.55,
  seed: 84,
});

export function drawFrame(ctx, frame, helpers = {}) {
  const cursor = { x: 0 };
  timeline(frame, project.totalFrames, [
    keyframe(cursor, { x: [0, 1] }, { from: 0, to: 1, easing: easings.easeInOut }),
  ]);

  ctx.fillStyle = "#fbf6ea";
  ctx.fillRect(0, 0, project.width, project.height);

  ink.stroke(ctx, [
    [project.width * 0.24, project.height * 0.58],
    [project.width * 0.38, project.height * (0.44 + Math.sin(cursor.x * Math.PI) * 0.04)],
    [project.width * 0.55, project.height * 0.52],
    [project.width * 0.74, project.height * 0.4],
  ]);
  accent.stroke(ctx, [
    [project.width * 0.3, project.height * 0.67],
    [project.width * 0.7, project.height * 0.67],
  ]);

  helpers.drawLabel?.(ctx, "Build this renderer with Inky canvas primitives", project.width / 2, project.height * 0.78);
}

export function getFrameDebug(frame) {
  return {
    hint: "Use window.inky.showReference('image/storyboard${extension}', { opacity: 0.3 }) while aligning. Analyze style refs with window.inky.analyzeStyle(), extract contour coordinates only when needed, and tune brush parameters by eye.",
    frame,
    availableBrushes,
    selectedBrush,
    referenceOverlay: "window.inky.showReference('image/storyboard${extension}', { opacity: 0.3 })",
    canvasCapture: "window.inky.captureFrameDataUrl(frame)",
  };
}
`,
);

console.log(`Created Inky animation project: projects/${slug}`);
console.log(`Manifest: projects/${slug}/project.json`);
console.log(`Renderer stub: projects/${slug}/renderer.js`);
console.log(`Agent prompt: projects/${slug}/prompt/agent-prompt.md`);
console.log(`Style inspiration folder: projects/${slug}/insp`);
console.log(`Preview route: /?project=${slug}`);
console.log(`Source image copied from: ${basename(sourceImage)}`);
if (styleReferences.length) console.log(`Style references copied: ${styleReferences.length}`);
