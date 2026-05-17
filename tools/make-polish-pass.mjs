#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const [projectArg, outputArg, ...restRaw] = process.argv.slice(2);
const rest = restRaw.filter((arg) => arg !== "--");

function usage() {
  console.error("Usage: node tools/make-polish-pass.mjs <projectDirOrRequirementsMd> [outputMd] [--frames <renderedFramesDir>] [--refs <sourceFramesDir>] [--blueprints <blueprintsDir>] [--inbetweens <inbetweensDir>]");
  process.exit(1);
}

function readFlag(args, name, fallback = "") {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1] ?? fallback;
}

function firstExisting(paths, fallback) {
  return paths.find((candidate) => existsSync(candidate)) || fallback;
}

function listFiles(dir, pattern) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir).filter((file) => pattern.test(file)).sort();
}

function resolveProject(inputArg) {
  const input = resolve(inputArg);
  if (input.endsWith("requirements.md")) {
    const storyboardDir = dirname(input);
    return {
      projectDir: dirname(storyboardDir),
      requirementsPath: input,
    };
  }

  if (existsSync(join(input, "requirements.md"))) {
    return {
      projectDir: dirname(input),
      requirementsPath: join(input, "requirements.md"),
    };
  }

  return {
    projectDir: input,
    requirementsPath: join(input, "storyboard", "requirements.md"),
  };
}

function escapeCell(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function parseFrameRows(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) continue;
    if (/^\|\s*-+/.test(line)) continue;
    const cols = line.split("|").slice(1, -1).map((part) => part.trim());
    const number = Number(cols[0]);
    if (!Number.isFinite(number)) continue;
    rows.push({
      number,
      action: cols[1] || "",
      text: cols[2] || "",
      chains: cols[3] || "",
      risks: cols[4] || "",
      notes: cols[5] || "",
    });
  }
  return rows;
}

function frameNumberFromFile(file) {
  const match = file.match(/frame-(\d+)/i);
  if (!match) return 0;
  return Number.parseInt(match[1], 10) + 1;
}

function fileForFrame(files, frameNumber) {
  const zeroBased = frameNumber - 1;
  const padded2 = String(zeroBased).padStart(2, "0");
  const padded3 = String(zeroBased).padStart(3, "0");
  return files.find((file) => file.includes(`frame-${padded2}`) || file.includes(`frame-${padded3}`)) || files[zeroBased] || "";
}

function makeRelative(projectDir, pathValue) {
  if (!pathValue) return "";
  return pathValue.startsWith(projectDir) ? pathValue.slice(projectDir.length + 1) : pathValue;
}

function makeCommandPath(pathValue) {
  if (!pathValue) return "";
  const cwd = process.cwd();
  return pathValue.startsWith(cwd) ? pathValue.slice(cwd.length + 1) : pathValue;
}

if (!projectArg) usage();

const { projectDir, requirementsPath } = resolveProject(projectArg);
const storyboardDir = join(projectDir, "storyboard");
const outputPath = resolve(outputArg || join(storyboardDir, "polish-pass.md"));
const requirements = existsSync(requirementsPath) ? readFileSync(requirementsPath, "utf8") : "";
const rows = parseFrameRows(requirements);

const refsDir = resolve(readFlag(rest, "--refs", join(projectDir, "storyboard")));
const framesDir = resolve(readFlag(
  rest,
  "--frames",
  firstExisting([
    join(projectDir, "outputs", "png"),
    join(projectDir, "outputs", "frames"),
    join(projectDir, "outputs", "rendered"),
  ], join(projectDir, "outputs", "png")),
));
const blueprintsDir = resolve(readFlag(rest, "--blueprints", join(storyboardDir, "blueprints")));
const inbetweensDir = resolve(readFlag(rest, "--inbetweens", join(storyboardDir, "inbetweens")));

const sourceFrames = listFiles(refsDir, /^frame-\d+\.png$/i);
const renderedFrames = listFiles(framesDir, /^frame-\d+.*\.png$/i);
const blueprints = listFiles(blueprintsDir, /^blueprint-\d+-frame-\d+\.png$/i);
const inbetweenFiles = listFiles(inbetweensDir, /inbetween.*\.(json|md)$/i);

const frameNumbers = new Set(rows.map((row) => row.number));
sourceFrames.forEach((file) => frameNumbers.add(frameNumberFromFile(file)));
renderedFrames.forEach((file) => frameNumbers.add(frameNumberFromFile(file)));
const maxFrame = Math.max(0, ...frameNumbers);

const markdown = [
  "# Animation Polish Pass",
  "",
  `Project: \`${basename(projectDir)}\``,
  "",
  "This is the cleanup pass after the first draw or first render. Mark each frame as Pass or Fix, apply fixes in code or project notes, then rerender and review again.",
  "",
  "Root-cause rule: obvious bugs should be redrawn or rebuilt from their construction anchors, path geometry, layer order, or object-part schema. Do not pass cover-up patches, eraser seams, masks, opacity tricks, or texture camouflage.",
  "",
  "## Inputs",
  "",
  `- Requirements: \`${makeRelative(projectDir, requirementsPath)}\`${existsSync(requirementsPath) ? "" : " (missing)"}`,
  `- Lighthouse frames: \`${makeRelative(projectDir, refsDir)}\` (${sourceFrames.length} found)`,
  `- First-pass rendered frames: \`${makeRelative(projectDir, framesDir)}\` (${renderedFrames.length} found)`,
  `- Construction blueprints: \`${makeRelative(projectDir, blueprintsDir)}\` (${blueprints.length} found)`,
  `- In-between plan: \`${makeRelative(projectDir, inbetweensDir)}\` (${inbetweenFiles.length} found)`,
  "",
];

if (renderedFrames.length === 0) {
  markdown.push("> No first-pass rendered PNGs were found yet. Render the first pass, then rerun this checklist so each row can compare source, blueprint, and actual output.");
  markdown.push("");
}

markdown.push(
  "## Frame Checklist",
  "",
  "| Frame | Lighthouse | First pass | Blueprint | Focus | Required polish checks | Status |",
  "|---:|---|---|---|---|---|---|",
);

for (let frame = 1; frame <= maxFrame; frame += 1) {
  const row = rows.find((item) => item.number === frame) || {};
  const source = fileForFrame(sourceFrames, frame);
  const rendered = fileForFrame(renderedFrames, frame);
  const blueprint = fileForFrame(blueprints, frame);
  const focusParts = [
    row.action && `Action: ${row.action}`,
    row.text && `Text: ${row.text}`,
    row.chains && `Chains: ${row.chains}`,
    row.risks && `Risks: ${row.risks}`,
    row.notes && `Notes: ${row.notes}`,
  ].filter(Boolean);
  const checks = [
    "match lighthouse pose/contact",
    "close body/prop gaps",
    "verify parent-child body/clothing anchors",
    "redraw root-cause bugs, no cover-up patches",
    "remove guide artifacts",
    "preserve speaker/text ownership",
    "add texture only after form reads",
    "check in-between continuity",
  ].join("; ");
  markdown.push(`| ${frame} | ${source ? `\`${makeRelative(projectDir, join(refsDir, source))}\`` : "Missing"} | ${rendered ? `\`${makeRelative(projectDir, join(framesDir, rendered))}\`` : "Needs render"} | ${blueprint ? `\`${makeRelative(projectDir, join(blueprintsDir, blueprint))}\`` : "Missing"} | ${escapeCell(focusParts.join("; ")) || "Use requirements and lighthouse"} | ${escapeCell(checks)} | Pass / Fix |`);
}

markdown.push(
  "",
  "## Known Failure Checks",
  "",
  "- Speech or thought bubble tail points to the wrong person.",
  "- Speech bubble is repaired with a post-draw patch instead of being constructed as one continuous body+tail path.",
  "- Speech or thought bubble tail/body join has a background-colored wedge, tinted gap, eraser seam, or patch instead of one solid white fill.",
  "- Speech bubble contains visible tail socket circles, ovals, or thought-dot marks; those belong only on thought bubbles.",
  "- Any obvious bug is hidden with a white patch, colored plug, mask, opacity trick, heavy outline, or texture instead of being rebuilt.",
  "- Hair reads as a helmet/blob instead of having a part, hairline, side lock, or strand groups.",
  "- Decorative borders, labels, nameplates, frames, desks, or panels become wandering brush curves.",
  "- Hands, wrists, arms, legs, necks, or tails float without visible attachment.",
  "- Clothing floats away from its parent body part; shirt hem, waistband, openings, and limbs do not form a plausible chain.",
  "- Baggy clothing reads as a ball or prop because seams, cuffs, openings, folds, or limb exits are missing.",
  "- Shorts read as a pouch, ball, skirt, or diaper because the waistband, two leg openings, center seam/crotch split, or visible leg exits are missing.",
  "- Legs appear beside shorts/pants instead of exiting from the leg openings.",
  "- Long storyboard guide marks remain visible as strings, wires, limbs, throw arcs, or construction lines.",
  "- Texture is used to cover unclear shapes instead of clarifying the drawing.",
  "- Props or text that carry the story vanish during key frames or in-betweens.",
  "- Pixel-diff review shows unexplained movement in locked backgrounds, labels, captions, or bubbles.",
  "",
  "## Enhancement Pass",
  "",
  "- Add pen-weight variation, hatching, crayon wax gaps, pencil scratches, charcoal smears, or dry-brush marks only after the frame reads clearly.",
  "- Use the lighthouse for stroke direction, density, contact shadows, and silhouette emphasis.",
  "- Keep text readable after texture. Redraw text boxes or bubbles if texture makes them muddy.",
  "- Re-render start, middle, and end frames, then inspect browser playback and timeline scrubbing.",
  "",
  "## Tool Selection Notes",
  "",
  "| Tool | Use when | Avoid when |",
  "|---|---|---|",
  "| Anime.js | Timelines, easing, staggering, seekable object-property motion, SVG or DOM choreography. | The task is only cleaning exported canvas frame artwork. |",
  "| Motion | UI transitions, gestures, springs, layout animation, or app-control polish. | The issue is hand-drawn texture or frame-by-frame body construction. |",
  "| Fabric.js | Building an editable canvas authoring layer with selectable objects, rich text, groups, controls, or SVG import/export. | The final renderer needs deterministic procedural brush texture only. |",
  "| Atrament | Capturing live human strokes, pressure, smoothing, and replay for a brush editor. | A project only needs scripted final-frame rendering with no drawing input surface. |",
  "",
  "## Follow-up Commands",
  "",
  "```bash",
  `npm run storyboard:semantic -- ${makeCommandPath(framesDir)} ${makeCommandPath(join(projectDir, "outputs", "review-semantic"))}`,
  `npm run storyboard:review -- ${makeCommandPath(framesDir)} ${makeCommandPath(join(projectDir, "outputs", "review-adjacent"))} -- --refs ${makeCommandPath(refsDir)}`,
  `npm run storyboard:visual-diff -- ${makeCommandPath(framesDir)} ${makeCommandPath(join(projectDir, "outputs", "review-visual-diff"))}`,
  "```",
  "",
);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, markdown.join("\n"));

console.log(`Wrote polish pass checklist to ${outputPath}`);
