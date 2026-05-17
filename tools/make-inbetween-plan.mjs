#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import {
  easeBackInOut,
  easeBackOut,
  easeBounceOut,
  easeCubicInOut,
  easeCubicOut,
  easeLinear,
  easeQuadInOut,
} from "d3-ease";

const [projectPathArg, outputDirArg = "output/inbetweens/latest", ...rest] = process.argv.slice(2);

function usage() {
  console.error("Usage: node tools/make-inbetween-plan.mjs <projectDirOrRequirementsMd> [outputDir] [--scene-count 12] [--inbetweens 5] [--hold 2] [--fps 12] [--loop false] [--locked \"paper,panel border,wall notes,desk\"] [--anchored \"laptop,mug,phone\"]");
  process.exit(1);
}

function readFlag(args, name, fallback = "") {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1] ?? fallback;
}

function boolFlag(args, name, fallback = false) {
  const value = readFlag(args, name, String(fallback));
  return ["1", "true", "yes", "y"].includes(String(value).toLowerCase());
}

function numberFlag(args, name, fallback) {
  const value = Number(readFlag(args, name, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

function projectName(projectPath) {
  return basename(projectPath.replace(/\/requirements\.md$/i, "")) || "storyboard";
}

function readRequirements(projectPath) {
  if (!projectPath) return "";
  if (!existsSync(projectPath)) return "";
  if (projectPath.endsWith(".md")) return readFileSync(projectPath, "utf8");
  const requirementsPath = join(projectPath, "requirements.md");
  return existsSync(requirementsPath) ? readFileSync(requirementsPath, "utf8") : "";
}

function inferSceneCount(projectPath, fallback) {
  if (!projectPath || projectPath.endsWith(".md")) return fallback;
  const ledgerPath = join(projectPath, "storyboard-ledger.json");
  if (!existsSync(ledgerPath)) return fallback;
  try {
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
    return Array.isArray(ledger.frames) && ledger.frames.length ? ledger.frames.length : fallback;
  } catch {
    return fallback;
  }
}

function parseFrameRequirements(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith("|")) continue;
    if (/^\|\s*-+/.test(line)) continue;
    const cols = line.split("|").slice(1, -1).map((part) => part.trim());
    const index = Number(cols[0]);
    if (!Number.isFinite(index)) continue;
    rows[index - 1] = {
      action: cols[1] || "",
      lighthouseEvidence: cols[2] || "",
      attachmentChains: cols[3] || "",
      semanticRisks: cols[4] || "",
      notes: cols[5] || "",
    };
  }
  return rows;
}

function pairComplexity(from, to) {
  const text = `${from?.action || ""} ${to?.action || ""} ${from?.semanticRisks || ""} ${to?.semanticRisks || ""}`.toLowerCase();
  let score = 1;
  if (/yawn|head-down|head down|folded|close-up|closeup|dream|morning/.test(text)) score += 1;
  if (/hand|wrist|arm|sleeve|mouth|face|detach|blob/.test(text)) score += 1;
  if (/large|wide|window|light|cloud/.test(text)) score += 1;
  return Math.min(score, 4);
}

const EASING_PROFILES = {
  linear: {
    fn: easeLinear,
    description: "even spacing; use only for locked or mechanical motion",
  },
  "ease-in-out": {
    fn: easeCubicInOut,
    description: "slow start, quicker middle, slow settle",
  },
  "ease-out": {
    fn: easeCubicOut,
    description: "fast pickup, gentle arrival",
  },
  settle: {
    fn: easeBackOut,
    motionFn: easeCubicOut,
    description: "overshoot-and-settle; clamp before using as a spatial interpolation",
  },
  "anticipate-settle": {
    fn: easeBackInOut,
    motionFn: easeCubicInOut,
    description: "small anticipation before moving, then a settling arrival",
  },
  "soft-bridge": {
    fn: easeQuadInOut,
    description: "subtle handmade bridge without a strong snap",
  },
  bounce: {
    fn: easeBounceOut,
    motionFn: easeCubicOut,
    description: "impact or bounce effect timing; use motionT for spatial anchors and easedT for local bounce accents",
  },
};

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function easingName(index, complexity, from, to) {
  const text = `${from?.action || ""} ${to?.action || ""} ${from?.notes || ""} ${to?.notes || ""}`.toLowerCase();
  if (/bounce|drop|fall|jump|impact|land/.test(text)) return "bounce";
  if (complexity >= 4) return "anticipate-settle";
  if (complexity === 3) return "settle";
  return index % 2 === 0 ? "ease-in-out" : "ease-out";
}

function timingValues(name, t) {
  const profile = EASING_PROFILES[name] || EASING_PROFILES["ease-in-out"];
  return {
    easedT: Number(clamp01(profile.fn(t)).toFixed(4)),
    motionT: Number(clamp01((profile.motionFn || profile.fn)(t)).toFixed(4)),
  };
}

if (!projectPathArg) usage();

const projectPath = resolve(projectPathArg);
const outputDir = resolve(outputDirArg);
const requirements = readRequirements(projectPath);
const sceneCount = inferSceneCount(projectPath, numberFlag(rest, "--scene-count", 12));
const baseInbetweens = Math.max(0, Math.floor(numberFlag(rest, "--inbetweens", 5)));
const keyHold = Math.max(1, Math.floor(numberFlag(rest, "--hold", 2)));
const fps = Math.max(1, Math.floor(numberFlag(rest, "--fps", 12)));
const loop = boolFlag(rest, "--loop", false);
const lockedLayers = readFlag(rest, "--locked", "paper grain,panel border,wall notes/posters,table/desk,static background lighting")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const anchoredLayers = readFlag(rest, "--anchored", "laptop,mug,notebooks,papers,phone,lamp,plant,recurring desk props")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const animatedLayers = readFlag(rest, "--animated", "head,torso,shoulders,arms,wrists,hands,facial expression,hair droop,dream/sleep/motion marks")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const frameRows = parseFrameRequirements(requirements);
const transitions = [];
const timeline = [];

mkdirSync(outputDir, { recursive: true });

let globalFrame = 0;
for (let scene = 0; scene < sceneCount; scene += 1) {
  for (let hold = 0; hold < keyHold; hold += 1) {
    timeline.push({
      globalFrame: globalFrame++,
      kind: "key",
      scene,
      t: 0,
      linearT: 0,
      easedT: 0,
      timeMs: Number(((globalFrame - 1) * (1000 / fps)).toFixed(2)),
      sourceScene: scene,
      targetScene: scene,
      note: hold === 0 ? "story beat hold" : "held key frame",
    });
  }

  const hasNext = scene < sceneCount - 1 || loop;
  if (!hasNext) continue;
  const next = (scene + 1) % sceneCount;
  const complexity = pairComplexity(frameRows[scene], frameRows[next]);
  const inbetweenCount = baseInbetweens + Math.max(0, complexity - 2);
  const easing = easingName(scene, complexity, frameRows[scene], frameRows[next]);
  const transitionFrames = [];

  for (let step = 1; step <= inbetweenCount; step += 1) {
    const t = step / (inbetweenCount + 1);
    const linearT = Number(t.toFixed(4));
    const { easedT, motionT } = timingValues(easing, t);
    const entry = {
      globalFrame: globalFrame++,
      kind: "inbetween",
      sourceScene: scene,
      targetScene: next,
      t: linearT,
      linearT,
      easedT,
      motionT,
      timeMs: Number(((globalFrame - 1) * (1000 / fps)).toFixed(2)),
      easing,
      easingDescription: EASING_PROFILES[easing]?.description || "",
      redrawInk: true,
      keepAttached: ["head-face-details", "shoulder-sleeve-forearm-wrist-hand", "props-contact-surface"],
      lockedLayers,
      anchoredLayers,
      animatedLayers,
    };
    timeline.push(entry);
    transitionFrames.push(entry.globalFrame);
  }

  transitions.push({
    fromScene: scene,
    toScene: next,
    sourceAction: frameRows[scene]?.action || `Scene ${scene + 1}`,
    targetAction: frameRows[next]?.action || `Scene ${next + 1}`,
    complexity,
    inbetweenCount,
    easing,
    easingDescription: EASING_PROFILES[easing]?.description || "",
    transitionFrames,
    anchorsToInterpolate: animatedLayers,
    anchorsToHold: anchoredLayers,
    lockedLayers,
    clarityRisks: [frameRows[scene]?.semanticRisks, frameRows[next]?.semanticRisks].filter(Boolean),
  });
}

const durationSeconds = timeline.length / fps;
const plan = {
  project: projectName(projectPath),
  source: projectPath,
  outputDir,
  sceneCount,
  fps,
  keyHold,
  baseInbetweens,
  loop,
  totalFrames: timeline.length,
  durationSeconds: Number(durationSeconds.toFixed(3)),
  lockedLayers,
  anchoredLayers,
  animatedLayers,
  transitions,
  timeline,
};

writeFileSync(join(outputDir, "inbetweens.json"), `${JSON.stringify(plan, null, 2)}\n`);

const transitionRows = transitions
  .map((transition) => `| ${transition.fromScene + 1} -> ${transition.toScene + 1} | ${transition.inbetweenCount} | ${transition.easing} | ${transition.easingDescription} | ${transition.sourceAction} -> ${transition.targetAction} | ${transition.clarityRisks.join("; ") || "none listed"} |`)
  .join("\n");

writeFileSync(
  join(outputDir, "inbetween-plan.md"),
  `# ${plan.project} In-Between Plan

This plan turns key storyboard panels into a smoother handmade animation. Use the source frames as lighthouses and redraw bridge frames; do not rely on crossfades alone.

## Timing

- FPS: ${fps}
- Key-frame hold: ${keyHold} frame(s)
- Base in-betweens per transition: ${baseInbetweens}
 - Total video frames: ${timeline.length}
- Estimated duration: ${durationSeconds.toFixed(2)} seconds
- Loop final scene to first scene: ${loop ? "yes" : "no"}
- Machine timing: each in-between keeps legacy \`t\`/\`linearT\`, adds \`motionT\` for spatial anchor interpolation, and keeps \`easedT\` for effect accents such as settle or bounce.

## Layer Locking

- Locked set layers: ${lockedLayers.join(", ")}
- Anchored props/layers: ${anchoredLayers.join(", ")}
- Animated layers: ${animatedLayers.join(", ")}

## Transition Schedule

| Transition | In-betweens | Easing | Timing Feel | Action Change | Clarity Risks |
|---|---:|---|---|---|---|
${transitionRows}

## Drawing Notes

- Reuse locked set layers during bridge frames so posters, walls, table, and static lighting do not swim.
- Keep anchored props in stable positions unless the story says they move.
- Interpolate animated anchors first: head, torso, shoulders, forearms, wrists, hands, expression, and story-critical marks.
- Keep face details attached to the head.
- Keep hands attached through wrist, forearm, and sleeve.
- Keep props attached to the desk or hand.
- Redraw ink and watercolor texture mainly on moving forms so the result feels handmade without making the whole set jitter.
- Use motion marks only after body attachment is clear.
`,
);

console.log(`Created in-between plan with ${timeline.length} frames (${durationSeconds.toFixed(2)}s) in ${outputDir}`);
