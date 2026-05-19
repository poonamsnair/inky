import {
  drawCoherentPaperGrain,
  drawDryMediaFill,
  drawMaterialBrushStroke,
  drawMaterialHatch,
  drawMaterialScumble,
  fillClippedMaterial,
  fillMaterialGradient,
  fillMaterialLayer,
} from "../../src/material-tools.js";
import { activeSpeechBubblesForFrame, drawSpeechBubbleOverlay } from "../../src/speech-bubble-tools.js";

export const project = {
  width: 960,
  height: 620,
  fps: 12,
  totalFrames: 90,
};

const INK = "#17120d";
const SKIN = "#eeb889";
const SHIRT = "#668caa";
const APRON = "#eadab6";
const HAIR = "#d7a84a";
const HAIR_HI = "#f3d77a";
const HAIR_SHADOW = "#8c6328";
const WOOD = "#c79056";
const BOARD = "#d9a15f";
const BOWL = "#fff8e8";
const SHADOW = "rgba(61, 43, 25, 0.24)";

const SPEECH_BUBBLE_TRACK = {
  fps: 12,
  totalFrames: 90,
  style: {
    font: "700 24px Avenir Next, Trebuchet MS, Verdana, sans-serif",
    maxWidth: 330,
    radius: 24,
    strokeWidth: 3.2,
  },
  bubbles: [
    cue("fresh-fruit", 0, 9, "FRESH FRUIT DAY!", 48, 42, 250),
    cue("rinse-first", 10, 18, "QUICK RINSE FIRST.", 566, 42, 286),
    cue("board-ready", 19, 27, "BOARD'S READY.", 74, 42, 238),
    cue("slice-slice", 28, 43, "SLICE, SLICE...", 606, 38, 242),
    cue("little-cubes", 44, 58, "LITTLE CUBES!", 58, 42, 228),
    cue("into-bowl", 59, 68, "INTO THE BOWL!", 600, 40, 270),
    cue("tiny-taste", 69, 78, "TINY TASTE...", 72, 42, 232),
    cue("fruit-salad", 79, 89, "FRUIT SALAD!", 72, 40, 250),
  ],
};

const KEY_SCENES = [
  {
    action: "select",
    head: { x: 422, y: 143, tilt: -0.28, scale: 0.96, mood: "soft" },
    torso: { x: 418, y: 315, tilt: -0.12, scale: 1 },
    leftElbow: { x: 308, y: 300 },
    leftHand: { x: 238, y: 392, angle: -0.4 },
    rightElbow: { x: 535, y: 302 },
    rightHand: { x: 628, y: 388, angle: 0.32 },
    boardAlpha: 0,
    bowl: { x: 190, y: 424, w: 132, h: 70, alpha: 1 },
    fruitMode: "spread",
  },
  {
    action: "wash",
    head: { x: 526, y: 134, tilt: -0.26, scale: 0.98, mood: "focused" },
    torso: { x: 540, y: 314, tilt: -0.08, scale: 1 },
    leftElbow: { x: 425, y: 282 },
    leftHand: { x: 410, y: 352, angle: -0.1 },
    rightElbow: { x: 612, y: 286 },
    rightHand: { x: 548, y: 328, angle: 0.28 },
    boardAlpha: 0.05,
    bowl: { x: 448, y: 422, w: 210, h: 90, alpha: 1 },
    fruitMode: "wash",
  },
  {
    action: "prep",
    head: { x: 548, y: 136, tilt: -0.18, scale: 0.98, mood: "focused" },
    torso: { x: 542, y: 314, tilt: -0.03, scale: 1 },
    leftElbow: { x: 410, y: 300 },
    leftHand: { x: 322, y: 386, angle: -0.22 },
    rightElbow: { x: 650, y: 304 },
    rightHand: { x: 662, y: 384, angle: 0.14 },
    boardAlpha: 1,
    bowl: { x: 728, y: 414, w: 178, h: 78, alpha: 0.86 },
    fruitMode: "empty-board",
  },
  {
    action: "strawberry",
    head: { x: 604, y: 136, tilt: -0.17, scale: 0.97, mood: "focused" },
    torso: { x: 600, y: 314, tilt: 0.03, scale: 1 },
    leftElbow: { x: 512, y: 302 },
    leftHand: { x: 500, y: 374, angle: -0.08 },
    rightElbow: { x: 705, y: 292 },
    rightHand: { x: 626, y: 334, angle: -0.82 },
    knifeTip: { x: 548, y: 394 },
    boardAlpha: 1,
    bowl: { x: 810, y: 424, w: 150, h: 68, alpha: 0.82 },
    fruitMode: "strawberry",
  },
  {
    action: "orange",
    head: { x: 486, y: 150, tilt: -0.3, scale: 0.99, mood: "focused" },
    torso: { x: 482, y: 325, tilt: -0.14, scale: 1 },
    leftElbow: { x: 408, y: 310 },
    leftHand: { x: 492, y: 380, angle: 0.14 },
    rightElbow: { x: 338, y: 304 },
    rightHand: { x: 390, y: 338, angle: -0.42 },
    knifeTip: { x: 455, y: 396 },
    boardAlpha: 1,
    bowl: { x: 775, y: 424, w: 144, h: 66, alpha: 0.78 },
    fruitMode: "orange",
  },
  {
    action: "apple",
    head: { x: 526, y: 134, tilt: -0.22, scale: 0.97, mood: "focused" },
    torso: { x: 524, y: 316, tilt: -0.05, scale: 1 },
    leftElbow: { x: 526, y: 300 },
    leftHand: { x: 546, y: 376, angle: -0.08 },
    rightElbow: { x: 395, y: 290 },
    rightHand: { x: 458, y: 336, angle: -0.55 },
    knifeTip: { x: 524, y: 398 },
    boardAlpha: 1,
    bowl: { x: 774, y: 424, w: 146, h: 66, alpha: 0.82 },
    fruitMode: "apple",
  },
  {
    action: "kiwi",
    head: { x: 526, y: 136, tilt: -0.18, scale: 0.98, mood: "focused" },
    torso: { x: 526, y: 315, tilt: -0.02, scale: 1 },
    leftElbow: { x: 545, y: 300 },
    leftHand: { x: 556, y: 374, angle: -0.1 },
    rightElbow: { x: 396, y: 290 },
    rightHand: { x: 456, y: 334, angle: -0.55 },
    knifeTip: { x: 522, y: 398 },
    boardAlpha: 1,
    bowl: { x: 268, y: 428, w: 134, h: 62, alpha: 0.58 },
    fruitMode: "kiwi",
  },
  {
    action: "watermelon",
    head: { x: 588, y: 134, tilt: -0.17, scale: 0.98, mood: "focused" },
    torso: { x: 586, y: 314, tilt: 0.02, scale: 1 },
    leftElbow: { x: 530, y: 300 },
    leftHand: { x: 560, y: 374, angle: -0.12 },
    rightElbow: { x: 708, y: 292 },
    rightHand: { x: 630, y: 334, angle: -0.64 },
    knifeTip: { x: 558, y: 398 },
    boardAlpha: 1,
    bowl: { x: 792, y: 424, w: 150, h: 68, alpha: 0.84 },
    fruitMode: "watermelon",
  },
  {
    action: "pour",
    head: { x: 398, y: 150, tilt: 0.08, scale: 1, mood: "pleased" },
    torso: { x: 410, y: 326, tilt: 0.12, scale: 1 },
    leftElbow: { x: 290, y: 285 },
    leftHand: { x: 318, y: 298, angle: 0.1 },
    rightElbow: { x: 536, y: 324 },
    rightHand: { x: 560, y: 430, angle: 0.2 },
    boardAlpha: 0.25,
    bowl: { x: 534, y: 448, w: 360, h: 132, alpha: 1 },
    fruitMode: "pour-grapes",
  },
  {
    action: "stir",
    head: { x: 518, y: 136, tilt: -0.28, scale: 0.98, mood: "soft" },
    torso: { x: 520, y: 318, tilt: -0.08, scale: 1 },
    leftElbow: { x: 420, y: 300 },
    leftHand: { x: 486, y: 304, angle: -0.44 },
    rightElbow: { x: 682, y: 338 },
    rightHand: { x: 682, y: 430, angle: 0.05 },
    boardAlpha: 0.05,
    bowl: { x: 524, y: 448, w: 360, h: 132, alpha: 1 },
    fruitMode: "stir",
  },
  {
    action: "taste",
    head: { x: 524, y: 148, tilt: 0.12, scale: 1, mood: "taste" },
    torso: { x: 526, y: 326, tilt: 0.04, scale: 1 },
    leftElbow: { x: 438, y: 314 },
    leftHand: { x: 505, y: 238, angle: -0.82 },
    rightElbow: { x: 650, y: 344 },
    rightHand: { x: 636, y: 454, angle: 0.14 },
    boardAlpha: 0,
    bowl: { x: 484, y: 462, w: 360, h: 126, alpha: 1 },
    fruitMode: "taste",
  },
  {
    action: "present",
    head: { x: 500, y: 135, tilt: 0.02, scale: 1.06, mood: "big-smile" },
    torso: { x: 500, y: 330, tilt: 0, scale: 1.05 },
    leftElbow: { x: 350, y: 350 },
    leftHand: { x: 268, y: 462, angle: -0.36 },
    rightElbow: { x: 650, y: 350 },
    rightHand: { x: 696, y: 462, angle: 0.36 },
    boardAlpha: 0,
    bowl: { x: 482, y: 478, w: 520, h: 182, alpha: 1 },
    fruitMode: "present",
  },
];

function cue(id, frameStart, frameEnd, text, x, y, width) {
  return {
    id,
    frameStart,
    frameEnd,
    start: frameStart / project.fps,
    end: (frameEnd + 1) / project.fps,
    text,
    x,
    y,
    width,
    tail: { x: 500, y: 150 },
    type: "speech",
    speaker: "woman",
    layer: 0,
  };
}

export function drawFrame(ctx, frame) {
  const safeFrame = clamp(Math.round(frame), 0, project.totalFrames - 1);
  const state = stateForFrame(safeFrame);

  ctx.save();
  ctx.clearRect(0, 0, project.width, project.height);
  drawKitchen(ctx, state, safeFrame);
  drawCounterSet(ctx, state, safeFrame);
  drawSceneProps(ctx, state, safeFrame);
  drawDialogue(ctx, safeFrame, { mouth: mouthAnchorFor(state) });
  const anchors = drawWoman(ctx, state, safeFrame);
  drawActionForeground(ctx, state, safeFrame, anchors);
  ctx.restore();
}

function stateForFrame(frame) {
  const raw = (frame / (project.totalFrames - 1)) * (KEY_SCENES.length - 1);
  const fromIndex = clamp(Math.floor(raw), 0, KEY_SCENES.length - 1);
  const toIndex = clamp(fromIndex + 1, 0, KEY_SCENES.length - 1);
  const localT = smoothstep(raw - fromIndex);
  const a = KEY_SCENES[fromIndex];
  const b = KEY_SCENES[toIndex];
  const sceneIndex = clamp(Math.round(raw), 0, KEY_SCENES.length - 1);
  const active = KEY_SCENES[sceneIndex];
  const chop = cuttingAction(active.action) ? Math.sin(frame * 1.95) * 7 : 0;
  const stir = active.action === "stir" ? Math.sin(frame * 1.5) : 0;
  const presentBounce = active.action === "present" ? Math.sin(frame * 0.55) * 2 : 0;

  const state = {
    frame,
    raw,
    sceneIndex,
    action: active.action,
    fruitMode: active.fruitMode,
    head: lerpObject(a.head, b.head, localT),
    torso: lerpObject(a.torso, b.torso, localT),
    leftElbow: lerpPoint(a.leftElbow, b.leftElbow, localT),
    rightElbow: lerpPoint(a.rightElbow, b.rightElbow, localT),
    leftHand: lerpObject(a.leftHand, b.leftHand, localT),
    rightHand: lerpObject(a.rightHand, b.rightHand, localT),
    knifeTip: a.knifeTip && b.knifeTip ? lerpPoint(a.knifeTip, b.knifeTip, localT) : active.knifeTip,
    boardAlpha: lerpNumber(a.boardAlpha, b.boardAlpha, localT),
    bowl: lerpObject(a.bowl, b.bowl, localT),
    localT,
    chop,
    stir,
    presentBounce,
  };

  if (cuttingAction(state.action) && state.knifeTip) {
    state.rightHand = { ...state.rightHand, y: state.rightHand.y + Math.max(0, chop) };
    state.knifeTip = { ...state.knifeTip, y: state.knifeTip.y + Math.max(0, chop) * 0.9 };
  }

  if (state.action === "taste") {
    const mouth = mouthAnchorFor(state);
    state.leftHand = lerpObject(state.leftHand, { x: mouth.x - 22, y: mouth.y + 4, angle: -0.75 }, 0.45);
  }

  if (state.action === "present") {
    state.bowl = { ...state.bowl, y: state.bowl.y + presentBounce };
    state.leftHand = { ...state.leftHand, y: state.leftHand.y + presentBounce };
    state.rightHand = { ...state.rightHand, y: state.rightHand.y + presentBounce };
  }

  return state;
}

function drawKitchen(ctx, state, frame) {
  ctx.save();
  ctx.fillStyle = "#fbf1dd";
  ctx.fillRect(0, 0, project.width, project.height);
  fillMaterialGradient(
    ctx,
    { x: 0, y: 0, w: project.width, h: project.height },
    [
      { offset: 0, color: "#fff7e6" },
      { offset: 0.58, color: "#f6e1bf" },
      { offset: 1, color: "#e8cda8" },
    ],
    { angle: 1.25, alpha: 1 },
  );
  drawCoherentPaperGrain(ctx, { x: 0, y: 0, w: project.width, h: project.height }, { seed: 231, alpha: 0.045, step: 5 });

  drawTileWall(ctx);
  drawWindow(ctx);
  drawShelf(ctx);
  drawPottedHerbs(ctx, 742, 205, 0.8);
  drawBackSink(ctx, state);
  ctx.restore();
}

function drawTileWall(ctx) {
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = "#d7bd96";
  ctx.lineWidth = 1;
  for (let x = 0; x < project.width; x += 74) line(ctx, x, 0, x, 398);
  for (let y = 50; y < 398; y += 58) line(ctx, 0, y, project.width, y);
  ctx.restore();
}

function drawWindow(ctx) {
  const x = 352;
  const y = 38;
  const w = 274;
  const h = 205;
  fillShape(
    ctx,
    (p) => roundedRectPath(p, x, y, w, h, 10),
    { x, y, w, h },
    "#eaf4ee",
    "watercolor",
    { seed: 4001, alpha: 0.28, edgePool: false, blooms: 4 },
  );
  ctx.save();
  ctx.strokeStyle = "#b38c5d";
  ctx.lineWidth = 4;
  roundedRectPath(ctx, x, y, w, h, 10);
  ctx.stroke();
  ctx.lineWidth = 2;
  line(ctx, x + w / 2, y + 7, x + w / 2, y + h - 7);
  line(ctx, x + 8, y + h * 0.52, x + w - 8, y + h * 0.52);
  ctx.restore();

  drawMaterialBrushStroke(
    ctx,
    [
      [395, 103],
      [450, 88],
      [512, 100],
      [590, 82],
    ],
    "colored-pencil",
    { color: "#d7b356", alpha: 0.28, seed: 4010 },
  );
}

function drawShelf(ctx) {
  ctx.save();
  ctx.strokeStyle = "#9a6a3c";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  line(ctx, 68, 78, 246, 78);
  line(ctx, 682, 78, 862, 78);
  ctx.restore();
  [98, 142, 196, 716, 762, 822].forEach((x, index) => drawJar(ctx, x, 56 + (index % 2) * 4, 0.8));
}

function drawJar(ctx, x, y, scale) {
  fillShape(
    ctx,
    (p) => roundedRectPath(p, x - 14 * scale, y, 28 * scale, 42 * scale, 7 * scale),
    { x: x - 16 * scale, y, w: 32 * scale, h: 44 * scale },
    "rgba(255, 248, 226, 0.55)",
    "graphite-pencil",
    { seed: 4100 + Math.round(x), patternAlpha: 0.22, scumble: 4, tooth: false },
  );
  strokeRounded(ctx, x - 14 * scale, y, 28 * scale, 42 * scale, 7 * scale, "#8a6d4e", 1.4);
}

function drawPottedHerbs(ctx, x, y, scale = 1) {
  fillShape(
    ctx,
    (p) => roundedRectPath(p, x - 34 * scale, y + 48 * scale, 68 * scale, 42 * scale, 9 * scale),
    { x: x - 38 * scale, y: y + 44 * scale, w: 76 * scale, h: 48 * scale },
    "#c9804e",
    "oil-crayon",
    { seed: 4200 + Math.round(x), patternAlpha: 0.36, scumble: 5 },
  );
  const random = seededRandom(4300 + Math.round(x));
  for (let i = 0; i < 20; i += 1) {
    const bx = x + (random() - 0.5) * 70 * scale;
    const by = y + 52 * scale + random() * 16 * scale;
    const tipX = bx + (random() - 0.5) * 26 * scale;
    const tipY = y + random() * 58 * scale;
    drawMaterialBrushStroke(ctx, [[bx, by], [(bx + tipX) / 2, by - 18 * scale], [tipX, tipY]], "colored-pencil", {
      color: "#4f8a48",
      alpha: 0.5,
      tool: { size: 1.6 * scale },
      seed: 4310 + i,
    });
    ctx.save();
    ctx.fillStyle = i % 3 === 0 ? "#6fa760" : "#558f4a";
    ctx.beginPath();
    ctx.ellipse(tipX, tipY, 5 * scale, 9 * scale, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBackSink(ctx, state) {
  const visible = state.action === "wash" ? 1 : state.action === "prep" ? 0.45 : 0.22;
  ctx.save();
  ctx.globalAlpha = visible;
  fillShape(ctx, (p) => ellipsePath(p, 430, 388, 120, 32), { x: 305, y: 356, w: 250, h: 64 }, "#dde4dd", "graphite-pencil", {
    seed: 4401,
    patternAlpha: 0.2,
    scumble: 4,
  });
  ctx.strokeStyle = "#82664c";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(438, 330);
  ctx.bezierCurveTo(438, 282, 507, 286, 506, 333);
  ctx.stroke();
  ctx.lineWidth = 5;
  line(ctx, 506, 333, 490, 348);
  ctx.restore();
}

function drawCounterSet(ctx, state, frame) {
  fillShape(
    ctx,
    (p) => {
      p.rect(0, 386, project.width, 234);
    },
    { x: 0, y: 386, w: project.width, h: 234 },
    "#c89155",
    "wax-crayon",
    { seed: 5100, patternAlpha: 0.42, scumble: 54, hatchCount: 18, angle: -0.06 },
  );
  drawMaterialHatch(ctx, { x: 0, y: 400, w: project.width, h: 190 }, "graphite-pencil", 80, {
    color: "#7c5434",
    alpha: 0.16,
    angle: -0.02,
    length: 84,
    seed: 5150,
    random: seededRandom(5151),
  });

  if (state.boardAlpha > 0.03) {
    ctx.save();
    ctx.globalAlpha = state.boardAlpha;
    drawCuttingBoard(ctx, frame);
    ctx.restore();
  }
}

function drawCuttingBoard(ctx, frame) {
  const x = 302;
  const y = 374;
  const w = 398;
  const h = 150;
  fillShape(ctx, (p) => roundedRectPath(p, x, y, w, h, 18), { x, y, w, h }, BOARD, "oil-crayon", {
    seed: 5200,
    patternAlpha: 0.42,
    scumble: 26,
    hatchCount: 10,
    angle: 0.05,
  });
  drawMaterialHatch(ctx, { x: x + 20, y: y + 20, w: w - 40, h: h - 42 }, "graphite-pencil", 30, {
    color: "#6e482d",
    alpha: 0.19,
    length: 52,
    angle: 0.02,
    random: seededRandom(5201),
  });
  strokeRounded(ctx, x, y, w, h, 18, "#6b4025", 3);
}

function drawSceneProps(ctx, state, frame) {
  const mode = state.fruitMode;
  const bowl = state.bowl;
  if (bowl?.alpha > 0.05 && mode !== "present") {
    drawBowl(ctx, bowl.x, bowl.y, bowl.w, bowl.h, {
      fill: BOWL,
      alpha: bowl.alpha,
      seed: 6000 + state.sceneIndex,
      fruit: ["pour-grapes", "stir", "taste"].includes(mode),
    });
  }

  if (mode === "spread") drawFruitSpread(ctx);
  if (mode === "wash") drawWashingFruit(ctx, frame);
  if (mode === "empty-board") drawBoardPrepProps(ctx);
  if (mode === "strawberry") drawCutFruit(ctx, "strawberry", frame);
  if (mode === "orange") drawCutFruit(ctx, "orange", frame);
  if (mode === "apple") drawCutFruit(ctx, "apple", frame);
  if (mode === "kiwi") drawCutFruit(ctx, "kiwi", frame);
  if (mode === "watermelon") drawCutFruit(ctx, "watermelon", frame);
  if (mode === "pour-grapes") drawPouringGrapes(ctx, frame);
  if (mode === "stir") drawStirringFruit(ctx, frame);
  if (mode === "taste") drawStirringFruit(ctx, frame);
}

function drawFruitSpread(ctx) {
  drawBowl(ctx, 170, 438, 132, 70, { fill: "#eaf4ff", alpha: 1, seed: 6100, fruit: "blueberries" });
  clusterGrapes(ctx, 564, 416, 1.05, 6120);
  drawWatermelonWedge(ctx, 690, 405, 1.1);
  drawOrange(ctx, 332, 405, 1.08);
  drawApple(ctx, 414, 408, 1.04);
  drawKiwi(ctx, 475, 425, 0.95);
  for (let i = 0; i < 8; i += 1) {
    drawStrawberry(ctx, 280 + i * 24, 452 + (i % 3) * 11, 0.74, 6150 + i);
  }
}

function drawWashingFruit(ctx, frame) {
  drawColander(ctx, 452, 424, 220, 92);
  for (let i = 0; i < 11; i += 1) {
    drawStrawberry(ctx, 370 + (i % 6) * 28, 410 + Math.floor(i / 6) * 18, 0.58, 6200 + i);
  }
  for (let i = 0; i < 6; i += 1) {
    drawBlueberry(ctx, 410 + i * 19, 432 + (i % 2) * 9, 7, 6220 + i);
  }
  ctx.save();
  ctx.strokeStyle = "rgba(88, 146, 174, 0.62)";
  ctx.lineCap = "round";
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i += 1) {
    const x = 488 + i * 5 + Math.sin(frame * 0.4 + i) * 2;
    ctx.beginPath();
    ctx.moveTo(x, 342);
    ctx.bezierCurveTo(x - 8, 366, x + 8, 381, x - 2, 405);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoardPrepProps(ctx) {
  drawBowl(ctx, 740, 420, 178, 78, { fill: BOWL, alpha: 0.9, seed: 6240, fruit: false });
  drawMaterialBrushStroke(ctx, [[342, 430], [394, 422], [462, 428]], "graphite-pencil", {
    color: "#7a5538",
    alpha: 0.26,
    seed: 6250,
  });
}

function drawCutFruit(ctx, type, frame) {
  const seeds = { strawberry: 6300, orange: 6400, apple: 6500, kiwi: 6600, watermelon: 6700 };
  const random = seededRandom(seeds[type] || 6300);
  const baseX = type === "orange" ? 405 : type === "apple" ? 500 : type === "kiwi" ? 496 : type === "watermelon" ? 520 : 544;
  const y = 430;
  if (type === "strawberry") {
    for (let i = 0; i < 7; i += 1) {
      drawStrawberryHalf(ctx, baseX + i * 24, y + (i % 2) * 12, 0.78, seeds[type] + i);
    }
    drawBowl(ctx, 815, 430, 148, 66, { fill: BOWL, alpha: 0.85, seed: 6318, fruit: "strawberries" });
  }
  if (type === "orange") {
    for (let i = 0; i < 8; i += 1) {
      drawOrangeWedge(ctx, baseX + (i % 4) * 42, y + Math.floor(i / 4) * 28, 0.9, -0.4 + i * 0.18);
    }
    drawBowl(ctx, 785, 430, 140, 64, { fill: BOWL, alpha: 0.78, seed: 6418, fruit: "strawberries" });
  }
  if (type === "apple") {
    for (let i = 0; i < 7; i += 1) {
      drawAppleWedge(ctx, baseX + i * 38, y + (i % 2) * 14, 0.94, -0.28 + i * 0.09);
    }
    clusterGrapes(ctx, 770, 432, 0.6, 6518);
  }
  if (type === "kiwi") {
    for (let i = 0; i < 8; i += 1) {
      drawKiwiSlice(ctx, baseX + i * 34, y + (i % 2) * 14, 0.82, seeds[type] + i);
    }
    drawKiwi(ctx, 374, 425, 0.76);
  }
  if (type === "watermelon") {
    for (let i = 0; i < 12; i += 1) {
      const x = baseX + (i % 4) * 42 + random() * 7;
      const yy = y + Math.floor(i / 4) * 27 + random() * 5;
      drawWatermelonCube(ctx, x, yy, 0.9, seeds[type] + i);
    }
    drawWatermelonWedge(ctx, 344, 414, 0.86);
  }
  if (cuttingAction(type)) {
    drawMaterialBrushStroke(ctx, [[498, 488], [550, 491], [604, 486]], "graphite-pencil", {
      color: "#7c5635",
      alpha: 0.22,
      seed: 6900 + frame,
    });
  }
}

function drawPouringGrapes(ctx, frame) {
  drawBowl(ctx, 532, 456, 360, 132, { fill: BOWL, alpha: 1, seed: 7000, fruit: true });
  drawSmallTiltedBowl(ctx, 308, 318, -0.58);
  const dropT = (frame % 10) / 10;
  for (let i = 0; i < 18; i += 1) {
    const lane = i % 6;
    const t = (dropT + i * 0.13) % 1;
    const x = 340 + lane * 23 + Math.sin(t * Math.PI * 2 + i) * 10;
    const y = 336 + t * 128;
    drawGrape(ctx, x, y, 7.2, 7008 + i);
  }
}

function drawStirringFruit(ctx, frame) {
  drawBowl(ctx, 520, 456, 360, 132, { fill: BOWL, alpha: 1, seed: 7100, fruit: true });
  const swirl = frame * 0.18;
  for (let i = 0; i < 18; i += 1) {
    const a = swirl + i * 0.52;
    drawBlueberry(ctx, 520 + Math.cos(a) * (40 + (i % 4) * 12), 428 + Math.sin(a) * 17, 7, 7110 + i);
  }
}

function drawPresentedBowlBase(ctx, state) {
  const b = state.bowl;
  drawBowl(ctx, b.x, b.y, b.w, b.h, { fill: BOWL, alpha: 1, seed: 7200, fruit: "full" });
}

function drawWoman(ctx, state, frame) {
  const torso = state.torso;
  const shoulderLeft = rotateAround({ x: torso.x - 78 * torso.scale, y: torso.y - 92 * torso.scale }, torso, torso.tilt);
  const shoulderRight = rotateAround({ x: torso.x + 78 * torso.scale, y: torso.y - 92 * torso.scale }, torso, torso.tilt);
  const mouth = mouthAnchorFor(state);

  drawNeck(ctx, state);
  drawTorso(ctx, state, shoulderLeft, shoulderRight);

  drawArm(ctx, shoulderLeft, state.leftElbow, state.leftHand, { sleeve: true, seed: 8100 + state.sceneIndex * 10 });
  drawArm(ctx, shoulderRight, state.rightElbow, state.rightHand, { sleeve: true, seed: 8200 + state.sceneIndex * 10 });

  drawHairBack(ctx, state);
  drawHead(ctx, state);
  drawHairFront(ctx, state);
  drawFace(ctx, state);

  drawHand(ctx, state.leftHand.x, state.leftHand.y, state.leftHand.angle ?? 0, 1, 8300 + state.sceneIndex);
  drawHand(ctx, state.rightHand.x, state.rightHand.y, state.rightHand.angle ?? 0, 1, 8400 + state.sceneIndex);

  return {
    mouth,
    leftHand: { x: state.leftHand.x, y: state.leftHand.y },
    rightHand: { x: state.rightHand.x, y: state.rightHand.y },
    shoulderLeft,
    shoulderRight,
  };
}

function drawNeck(ctx, state) {
  const h = state.head;
  const neck = {
    x: h.x - 22 * h.scale,
    y: h.y + 58 * h.scale,
    w: 44 * h.scale,
    h: 58 * h.scale,
  };
  fillShape(
    ctx,
    (p) => roundedRectPath(p, neck.x, neck.y, neck.w, neck.h, 16 * h.scale),
    neck,
    SKIN,
    "wax-crayon",
    { seed: 8001 + state.sceneIndex, patternAlpha: 0.3, scumble: 4 },
  );
}

function drawTorso(ctx, state, shoulderLeft, shoulderRight) {
  const t = state.torso;
  const shirtHem = 92;
  const apronBottom = 76;
  const shirtBounds = { x: t.x - 118, y: t.y - 102, w: 236, h: shirtHem + 104 };
  fillShape(
    ctx,
    (p) => {
      p.moveTo(shoulderLeft.x - 22, shoulderLeft.y + 6);
      p.bezierCurveTo(t.x - 120, t.y - 38, t.x - 104, t.y + 54, t.x - 66, t.y + shirtHem);
      p.quadraticCurveTo(t.x, t.y + shirtHem + 10, t.x + 68, t.y + shirtHem);
      p.bezierCurveTo(t.x + 110, t.y + 52, t.x + 122, t.y - 42, shoulderRight.x + 22, shoulderRight.y + 6);
      p.bezierCurveTo(t.x + 54, t.y - 102, t.x - 54, t.y - 102, shoulderLeft.x - 22, shoulderLeft.y + 6);
      p.closePath();
    },
    shirtBounds,
    SHIRT,
    "wax-crayon",
    { seed: 8020 + state.sceneIndex, patternAlpha: 0.44, scumble: 15, angle: -0.65 },
  );

  const apronBounds = { x: t.x - 72, y: t.y - 74, w: 146, h: apronBottom + 98 };
  fillShape(
    ctx,
    (p) => {
      p.moveTo(t.x - 38, t.y - 84);
      p.lineTo(t.x + 38, t.y - 84);
      p.bezierCurveTo(t.x + 70, t.y - 8, t.x + 56, t.y + 42, t.x + 43, t.y + apronBottom);
      p.quadraticCurveTo(t.x, t.y + apronBottom + 8, t.x - 45, t.y + apronBottom);
      p.bezierCurveTo(t.x - 56, t.y + 42, t.x - 70, t.y - 10, t.x - 38, t.y - 84);
      p.closePath();
    },
    apronBounds,
    APRON,
    "colored-pencil",
    { seed: 8030 + state.sceneIndex, patternAlpha: 0.38, scumble: 12, hatchCount: 6 },
  );
  drawMaterialBrushStroke(ctx, [[t.x - 38, t.y - 84], [t.x - 8, t.y - 30], [t.x - 42, t.y + apronBottom - 6]], "dip-ink", {
    color: INK,
    alpha: 0.42,
    tool: { size: 1.8 },
    seed: 8041 + state.sceneIndex,
  });
  drawMaterialBrushStroke(ctx, [[t.x + 38, t.y - 84], [t.x + 8, t.y - 28], [t.x + 42, t.y + apronBottom - 6]], "dip-ink", {
    color: INK,
    alpha: 0.42,
    tool: { size: 1.8 },
    seed: 8042 + state.sceneIndex,
  });
  drawMaterialBrushStroke(ctx, [[t.x - 42, t.y + apronBottom], [t.x - 4, t.y + apronBottom + 6], [t.x + 42, t.y + apronBottom]], "technical-pen", {
    color: INK,
    alpha: 0.28,
    tool: { size: 1.2 },
    seed: 8043 + state.sceneIndex,
  });
}

function drawArm(ctx, shoulder, elbow, hand, options = {}) {
  const sleeveMid = {
    x: lerpNumber(shoulder.x, elbow.x, 0.72),
    y: lerpNumber(shoulder.y, elbow.y, 0.72),
  };
  const armLine = [
    [shoulder.x, shoulder.y],
    [elbow.x, elbow.y],
    [sleeveMid.x, sleeveMid.y],
  ];
  drawThickStroke(ctx, armLine, 34, SHIRT, "wax-crayon", options.seed + 1);
  drawMaterialBrushStroke(ctx, armLine, "dip-ink", { color: INK, alpha: 0.46, tool: { size: 2.2 }, seed: options.seed + 2 });

  const forearmLine = [
    [sleeveMid.x, sleeveMid.y],
    [lerpNumber(sleeveMid.x, hand.x, 0.5), lerpNumber(sleeveMid.y, hand.y, 0.5) + 8],
    [hand.x, hand.y],
  ];
  drawThickStroke(ctx, forearmLine, 22, SKIN, "wax-crayon", options.seed + 3);
  drawMaterialBrushStroke(ctx, forearmLine, "dip-ink", { color: INK, alpha: 0.4, tool: { size: 1.8 }, seed: options.seed + 4 });
}

function drawThickStroke(ctx, points, width, color, tool, seed) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const p = points[i];
    ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + p[0]) / 2, (prev[1] + p[1]) / 2);
  }
  ctx.stroke();
  ctx.restore();
  drawMaterialBrushStroke(ctx, points, tool, {
    color,
    alpha: 0.44,
    seed,
    patternWidth: width * 0.55,
    tool: { size: Math.max(5, width * 0.22) },
  });
}

function drawHairBack(ctx, state) {
  const h = state.head;
  const bun = rotateAround({ x: h.x + 42 * h.scale, y: h.y - 58 * h.scale }, h, h.tilt);
  fillShape(ctx, (p) => ellipsePath(p, bun.x, bun.y, 42 * h.scale, 50 * h.scale, h.tilt + 0.4), { x: bun.x - 48, y: bun.y - 54, w: 96, h: 108 }, HAIR, "oil-crayon", {
    seed: 8500 + state.sceneIndex,
    patternAlpha: 0.48,
    scumble: 10,
  });
  for (let i = 0; i < 7; i += 1) {
    const a = -1.2 + i * 0.42;
    drawMaterialBrushStroke(
      ctx,
      [
        [bun.x + Math.cos(a) * 12, bun.y + Math.sin(a) * 13],
        [bun.x + Math.cos(a + 0.45) * 36, bun.y + Math.sin(a + 0.45) * 42],
      ],
      "brush-pen",
      { color: i % 2 === 0 ? HAIR_HI : HAIR_SHADOW, alpha: 0.34, tool: { size: 2.4 }, seed: 8510 + i + state.sceneIndex * 10 },
    );
  }
}

function drawHead(ctx, state) {
  const h = state.head;
  const bounds = { x: h.x - 54 * h.scale, y: h.y - 62 * h.scale, w: 108 * h.scale, h: 126 * h.scale };
  fillShape(ctx, (p) => ellipsePath(p, h.x, h.y, 48 * h.scale, 58 * h.scale, h.tilt), bounds, SKIN, "wax-crayon", {
    seed: 8600 + state.sceneIndex,
    patternAlpha: 0.34,
    scumble: 10,
    angle: -0.35,
  });
}

function drawHairFront(ctx, state) {
  const h = state.head;
  const random = seededRandom(8700 + state.sceneIndex);
  const capPoints = [
    rotateAround({ x: h.x - 50 * h.scale, y: h.y - 20 * h.scale }, h, h.tilt),
    rotateAround({ x: h.x - 36 * h.scale, y: h.y - 62 * h.scale }, h, h.tilt),
    rotateAround({ x: h.x + 18 * h.scale, y: h.y - 68 * h.scale }, h, h.tilt),
    rotateAround({ x: h.x + 48 * h.scale, y: h.y - 20 * h.scale }, h, h.tilt),
  ];
  fillShape(
    ctx,
    (p) => {
      p.moveTo(capPoints[0].x, capPoints[0].y);
      p.bezierCurveTo(capPoints[1].x, capPoints[1].y, capPoints[2].x, capPoints[2].y, capPoints[3].x, capPoints[3].y);
      p.bezierCurveTo(h.x + 18 * h.scale, h.y - 38 * h.scale, h.x - 10 * h.scale, h.y - 34 * h.scale, capPoints[0].x, capPoints[0].y);
      p.closePath();
    },
    { x: h.x - 58, y: h.y - 74, w: 122, h: 84 },
    HAIR,
    "oil-crayon",
    { seed: 8710 + state.sceneIndex, patternAlpha: 0.5, scumble: 8 },
  );
  for (let i = 0; i < 8; i += 1) {
    const sx = h.x - 42 * h.scale + random() * 84 * h.scale;
    const sy = h.y - 55 * h.scale + random() * 22 * h.scale;
    drawMaterialBrushStroke(
      ctx,
      [
        [sx, sy],
        [sx - 8 * h.scale + random() * 16, sy + 22 * h.scale],
        [sx - 14 * h.scale + random() * 24, sy + 44 * h.scale],
      ],
      "brush-pen",
      { color: i % 3 === 0 ? HAIR_HI : HAIR_SHADOW, alpha: 0.46, tool: { size: 1.9 }, seed: 8720 + i + state.sceneIndex * 11 },
    );
  }
}

function drawFace(ctx, state) {
  const h = state.head;
  const tilt = h.tilt;
  const leftEye = rotateAround({ x: h.x - 17 * h.scale, y: h.y - 8 * h.scale }, h, tilt);
  const rightEye = rotateAround({ x: h.x + 17 * h.scale, y: h.y - 6 * h.scale }, h, tilt);
  const nose = rotateAround({ x: h.x + 2 * h.scale, y: h.y + 9 * h.scale }, h, tilt);
  const mouth = mouthAnchorFor(state);

  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineWidth = 2.1 * h.scale;
  if (h.mood === "big-smile") {
    ctx.beginPath();
    ctx.arc(leftEye.x, leftEye.y, 4.6 * h.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightEye.x, rightEye.y, 4.6 * h.scale, 0, Math.PI * 2);
    ctx.stroke();
  } else if (h.mood === "taste") {
    smileArc(ctx, leftEye.x, leftEye.y, 8 * h.scale, 0.1, Math.PI - 0.1);
    smileArc(ctx, rightEye.x, rightEye.y, 8 * h.scale, 0.1, Math.PI - 0.1);
  } else {
    smileArc(ctx, leftEye.x, leftEye.y, 8 * h.scale, 0.12, Math.PI - 0.12);
    smileArc(ctx, rightEye.x, rightEye.y, 8 * h.scale, 0.12, Math.PI - 0.12);
  }
  ctx.beginPath();
  ctx.moveTo(nose.x - 2, nose.y - 8);
  ctx.quadraticCurveTo(nose.x + 7, nose.y + 2, nose.x - 2, nose.y + 9);
  ctx.stroke();
  ctx.strokeStyle = h.mood === "big-smile" ? "#7d2c24" : INK;
  ctx.lineWidth = h.mood === "big-smile" ? 3.3 : 2.2;
  ctx.beginPath();
  if (h.mood === "taste") {
    ctx.moveTo(mouth.x - 8, mouth.y);
    ctx.quadraticCurveTo(mouth.x, mouth.y + 9, mouth.x + 10, mouth.y);
  } else if (h.mood === "big-smile") {
    ctx.moveTo(mouth.x - 18, mouth.y - 2);
    ctx.quadraticCurveTo(mouth.x, mouth.y + 22, mouth.x + 22, mouth.y - 2);
  } else {
    ctx.moveTo(mouth.x - 11, mouth.y);
    ctx.quadraticCurveTo(mouth.x, mouth.y + 8, mouth.x + 13, mouth.y + 1);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(221, 89, 84, 0.22)";
  ctx.beginPath();
  ctx.ellipse(h.x - 28 * h.scale, h.y + 22 * h.scale, 10 * h.scale, 7 * h.scale, tilt, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHand(ctx, x, y, angle = 0, scale = 1, seed = 0) {
  const bounds = { x: x - 30 * scale, y: y - 28 * scale, w: 66 * scale, h: 58 * scale };
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const palm = { x, y };

  fillShape(ctx, (p) => ellipsePath(p, palm.x, palm.y, 18 * scale, 13.5 * scale, angle), bounds, SKIN, "wax-crayon", {
    seed,
    patternAlpha: 0.34,
    scumble: 4,
    strokeWidth: 1.8,
  });

  const fingerOffsets = [-8.5, -3, 3.2, 8.2];
  fingerOffsets.forEach((offset, index) => {
    const base = offsetPoint(palm, dir, normal, 8.5 * scale, offset * scale);
    const tip = offsetPoint(palm, dir, normal, (23 + (index === 1 ? 3 : index === 2 ? 1 : -1)) * scale, (offset + (index - 1.5) * 0.7) * scale);
    drawFinger(ctx, base, tip, (3.4 - index * 0.18) * scale, seed + 20 + index);
  });

  const thumbBase = offsetPoint(palm, dir, normal, -5 * scale, 11 * scale);
  const thumbTip = offsetPoint(palm, dir, normal, 11 * scale, 23 * scale);
  drawFinger(ctx, thumbBase, thumbTip, 4.7 * scale, seed + 30);

  ctx.save();
  ctx.strokeStyle = "#9b6045";
  ctx.lineWidth = 1.15 * scale;
  ctx.lineCap = "round";
  fingerOffsets.forEach((offset, index) => {
    const crease = offsetPoint(palm, dir, normal, (13 + index * 0.7) * scale, offset * scale);
    const creaseEnd = offsetPoint(palm, dir, normal, (16 + index * 0.7) * scale, (offset + 2) * scale);
    line(ctx, crease.x, crease.y, creaseEnd.x, creaseEnd.y);
  });
  const wristA = offsetPoint(palm, dir, normal, -18 * scale, -7 * scale);
  const wristB = offsetPoint(palm, dir, normal, -18 * scale, 7 * scale);
  line(ctx, wristA.x, wristA.y, wristB.x, wristB.y);
  ctx.restore();
}

function drawFinger(ctx, start, end, radius, seed) {
  const bounds = {
    x: Math.min(start.x, end.x) - radius - 2,
    y: Math.min(start.y, end.y) - radius - 2,
    w: Math.abs(end.x - start.x) + radius * 2 + 4,
    h: Math.abs(end.y - start.y) + radius * 2 + 4,
  };
  fillShape(ctx, (p) => capsulePath(p, start, end, radius), bounds, SKIN, "wax-crayon", {
    seed,
    patternAlpha: 0.28,
    scumble: 2,
    strokeWidth: 1.35,
  });
}

function drawActionForeground(ctx, state, frame, anchors) {
  if (cuttingAction(state.action) && state.knifeTip) {
    drawKnife(ctx, state.rightHand, state.knifeTip);
    drawChopTicks(ctx, state.knifeTip, frame);
  }
  if (state.action === "stir") {
    const angle = -1.1 + state.stir * 0.28;
    drawSpoon(ctx, state.leftHand, { x: 520 + Math.cos(angle) * 34, y: 440 + Math.sin(angle) * 18 }, 1.04);
  }
  if (state.action === "taste") {
    drawSpoon(ctx, state.leftHand, anchors.mouth, 0.86);
  }
  if (state.action === "present") {
    drawPresentedBowlBase(ctx, state);
    drawHand(ctx, state.leftHand.x, state.leftHand.y, state.leftHand.angle ?? 0, 1.04, 9101 + frame);
    drawHand(ctx, state.rightHand.x, state.rightHand.y, state.rightHand.angle ?? 0, 1.04, 9102 + frame);
  }
}

function drawKnife(ctx, hand, tip) {
  const handleEnd = { x: hand.x + 16, y: hand.y - 8 };
  const dx = tip.x - handleEnd.x;
  const dy = tip.y - handleEnd.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const bladeBase = { x: handleEnd.x + ux * 38, y: handleEnd.y + uy * 38 };

  ctx.save();
  ctx.fillStyle = "#32251c";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.roundRect?.(hand.x - 5, hand.y - 15, 56, 14, 6);
  if (!ctx.roundRect) roundedRectPath(ctx, hand.x - 5, hand.y - 15, 56, 14, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#d9d7cf";
  ctx.beginPath();
  ctx.moveTo(bladeBase.x + nx * 8, bladeBase.y + ny * 8);
  ctx.lineTo(tip.x + nx * 5, tip.y + ny * 5);
  ctx.lineTo(tip.x - nx * 6, tip.y - ny * 6);
  ctx.lineTo(bladeBase.x - nx * 10, bladeBase.y - ny * 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.2;
  line(ctx, bladeBase.x + nx * 3, bladeBase.y + ny * 3, tip.x + nx * 2, tip.y + ny * 2);
  ctx.restore();
}

function drawSpoon(ctx, hand, bowlPoint, scale = 1) {
  ctx.save();
  ctx.strokeStyle = "#776c62";
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = "round";
  line(ctx, hand.x - 3, hand.y - 3, bowlPoint.x, bowlPoint.y);
  ctx.fillStyle = "#d4d0c8";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(bowlPoint.x, bowlPoint.y, 14 * scale, 8 * scale, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawChopTicks(ctx, tip, frame) {
  if (frame % 4 > 1) return;
  drawMaterialBrushStroke(
    ctx,
    [
      [tip.x + 18, tip.y - 32],
      [tip.x + 26, tip.y - 18],
    ],
    "brush-pen",
    { color: INK, alpha: 0.36, tool: { size: 2.2 }, seed: 9000 + frame },
  );
}

function drawDialogue(ctx, frame, anchors) {
  const active = activeSpeechBubblesForFrame(SPEECH_BUBBLE_TRACK, frame);
  active.forEach((bubble) => {
    drawSpeechBubbleOverlay(
      ctx,
      {
        ...bubble,
        tail: { x: anchors.mouth.x, y: anchors.mouth.y },
        style: {
          fill: "#ffffff",
          stroke: INK,
          textColor: INK,
          shadowColor: "rgba(61, 43, 25, 0.13)",
        },
      },
      { style: SPEECH_BUBBLE_TRACK.style, random: seededRandom(10000 + frame + hashString(bubble.id)) },
    );
  });
}

function drawBowl(ctx, x, y, w, h, options = {}) {
  const alpha = options.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.44, w * 0.45, h * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  fillShape(
    ctx,
    (p) => {
      p.moveTo(x - w / 2, y - h * 0.15);
      p.bezierCurveTo(x - w * 0.42, y + h * 0.62, x - w * 0.26, y + h * 0.78, x, y + h * 0.78);
      p.bezierCurveTo(x + w * 0.26, y + h * 0.78, x + w * 0.42, y + h * 0.62, x + w / 2, y - h * 0.15);
      p.closePath();
    },
    { x: x - w / 2, y: y - h * 0.15, w, h },
    options.fill || BOWL,
    "graphite-pencil",
    { seed: options.seed || 6000, patternAlpha: 0.22, scumble: 7, hatch: false },
  );
  if (options.fruit) drawFruitInBowl(ctx, x, y - h * 0.2, w * 0.74, h * 0.34, options.seed || 0, options.fruit);
  drawBowlRim(ctx, x, y, w, h, alpha);
  ctx.restore();
}

function drawBowlRim(ctx, x, y, w, h, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2.2, w / 150);
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.18, w / 2, h * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFruitInBowl(ctx, x, y, w, h, seed, type) {
  const random = seededRandom(seed + 12);
  const count = type === "full" ? 44 : type === "blueberries" ? 18 : 28;
  for (let i = 0; i < count; i += 1) {
    const px = x - w / 2 + random() * w;
    const py = y - h / 2 + random() * h;
    const choice = type === "blueberries" ? 4 : Math.floor(random() * 6);
    if (choice === 0) drawStrawberryHalf(ctx, px, py, 0.45, seed + i);
    if (choice === 1) drawOrangeWedge(ctx, px, py, 0.42, random() * Math.PI);
    if (choice === 2) drawAppleWedge(ctx, px, py, 0.43, random() * Math.PI);
    if (choice === 3) drawKiwiSlice(ctx, px, py, 0.44, seed + i);
    if (choice === 4) drawBlueberry(ctx, px, py, 6 + random() * 2, seed + i);
    if (choice === 5) drawWatermelonCube(ctx, px, py, 0.42, seed + i);
  }
}

function drawColander(ctx, x, y, w, h) {
  drawBowl(ctx, x, y, w, h, { fill: "#dfe6df", alpha: 0.92, seed: 6200, fruit: false });
  ctx.save();
  ctx.fillStyle = "rgba(51, 45, 38, 0.28)";
  for (let i = 0; i < 26; i += 1) {
    const px = x - w * 0.34 + (i % 9) * (w * 0.085);
    const py = y - h * 0.07 + Math.floor(i / 9) * 16;
    ctx.beginPath();
    ctx.ellipse(px, py, 2.1, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSmallTiltedBowl(ctx, x, y, tilt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  drawBowl(ctx, 0, 0, 144, 68, { fill: BOWL, alpha: 1, seed: 7010, fruit: "grapes" });
  ctx.restore();
}

function clusterGrapes(ctx, x, y, scale, seed) {
  const random = seededRandom(seed);
  for (let i = 0; i < 22; i += 1) {
    drawGrape(ctx, x + (random() - 0.5) * 120 * scale, y + (random() - 0.5) * 55 * scale, 8 * scale, seed + i);
  }
}

function drawGrape(ctx, x, y, r, seed) {
  fillShape(ctx, (p) => ellipsePath(p, x, y, r, r * 0.92), { x: x - r, y: y - r, w: r * 2, h: r * 2 }, "#8db34d", "oil-crayon", {
    seed,
    patternAlpha: 0.42,
    scumble: 2,
    hatch: false,
  });
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.beginPath();
  ctx.ellipse(x - r * 0.28, y - r * 0.3, r * 0.22, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBlueberry(ctx, x, y, r, seed) {
  fillShape(ctx, (p) => ellipsePath(p, x, y, r, r * 0.9), { x: x - r, y: y - r, w: r * 2, h: r * 2 }, "#455d92", "oil-crayon", {
    seed,
    patternAlpha: 0.42,
    scumble: 2,
    hatch: false,
  });
  ctx.save();
  ctx.strokeStyle = "#222a4e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 1);
  ctx.lineTo(x + 3, y - 1);
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y + 2);
  ctx.stroke();
  ctx.restore();
}

function drawStrawberry(ctx, x, y, scale, seed) {
  const random = seededRandom(seed);
  const rotation = (random() - 0.5) * 0.42;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  fillShape(
    ctx,
    (p) => {
      strawberryBodyPath(p, scale);
      p.closePath();
    },
    { x: -30 * scale, y: -28 * scale, w: 60 * scale, h: 58 * scale },
    "#e33b22",
    "oil-crayon",
    { seed, patternAlpha: 0.5, scumble: 5, stroke: "#651a14", strokeWidth: 1.8 * scale },
  );

  ctx.save();
  ctx.beginPath();
  strawberryBodyPath(ctx, scale);
  ctx.clip();
  ctx.fillStyle = "rgba(136, 25, 17, 0.22)";
  ctx.beginPath();
  ctx.ellipse(12 * scale, 3 * scale, 13 * scale, 27 * scale, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 116, 76, 0.22)";
  ctx.beginPath();
  ctx.ellipse(-9 * scale, -2 * scale, 9 * scale, 22 * scale, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawStrawberrySeeds(ctx, scale, seed, "whole");
  drawStrawberryCrown(ctx, scale, seed);
  ctx.restore();
}

function drawStrawberryHalf(ctx, x, y, scale, seed) {
  const random = seededRandom(seed + 31);
  const rotation = (random() - 0.5) * 0.36;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  fillShape(
    ctx,
    (p) => {
      strawberryBodyPath(p, scale * 0.9);
      p.closePath();
    },
    { x: -26 * scale, y: -25 * scale, w: 52 * scale, h: 52 * scale },
    "#c92d24",
    "oil-crayon",
    { seed, patternAlpha: 0.42, scumble: 3, stroke: "#711c16", strokeWidth: 1.5 * scale },
  );
  fillShape(
    ctx,
    (p) => {
      p.moveTo(0, 18 * scale);
      p.bezierCurveTo(-14 * scale, 14 * scale, -18 * scale, 2 * scale, -15 * scale, -9 * scale);
      p.bezierCurveTo(-10 * scale, -18 * scale, -2 * scale, -16 * scale, 0, -10 * scale);
      p.bezierCurveTo(4 * scale, -17 * scale, 14 * scale, -16 * scale, 17 * scale, -7 * scale);
      p.bezierCurveTo(20 * scale, 4 * scale, 15 * scale, 15 * scale, 0, 18 * scale);
      p.closePath();
    },
    { x: -19 * scale, y: -19 * scale, w: 38 * scale, h: 39 * scale },
    "#ffd9c4",
    "colored-pencil",
    { seed: seed + 4, patternAlpha: 0.38, scumble: 2, stroke: "#f0523d", strokeWidth: 1.4 * scale },
  );
  ctx.save();
  ctx.strokeStyle = "#fff2df";
  ctx.lineWidth = 1.7 * scale;
  ctx.lineCap = "round";
  line(ctx, 0, -8 * scale, 0, 15 * scale);
  line(ctx, -8 * scale, 3 * scale, 0, 8 * scale);
  line(ctx, 8 * scale, 1 * scale, 0, 8 * scale);
  ctx.restore();
  drawStrawberrySeeds(ctx, scale * 0.86, seed + 9, "half");
  ctx.restore();
}

function strawberryBodyPath(ctx, scale) {
  ctx.moveTo(0, 25 * scale);
  ctx.bezierCurveTo(-18 * scale, 23 * scale, -29 * scale, 9 * scale, -26 * scale, -7 * scale);
  ctx.bezierCurveTo(-23 * scale, -23 * scale, -6 * scale, -25 * scale, 0, -14 * scale);
  ctx.bezierCurveTo(7 * scale, -25 * scale, 24 * scale, -23 * scale, 27 * scale, -7 * scale);
  ctx.bezierCurveTo(31 * scale, 10 * scale, 20 * scale, 24 * scale, 0, 25 * scale);
}

function drawStrawberrySeeds(ctx, scale, seed, mode) {
  const random = seededRandom(seed + 71);
  const seeds =
    mode === "half"
      ? [
          [-9, -4, -0.24],
          [1, -5, 0.18],
          [10, -2, 0.28],
          [-10, 7, -0.18],
          [2, 7, 0.16],
          [10, 9, 0.28],
        ]
      : [
          [-11, -5, -0.34],
          [1, -7, 0.12],
          [13, -4, 0.32],
          [-17, 5, -0.22],
          [-5, 4, 0.16],
          [8, 5, 0.28],
          [18, 7, 0.36],
          [-15, 15, -0.18],
          [-3, 14, 0.12],
          [10, 15, 0.26],
          [-8, 23, 0.08],
          [4, 22, 0.2],
        ];

  ctx.save();
  ctx.beginPath();
  strawberryBodyPath(ctx, mode === "half" ? scale * 0.9 : scale);
  ctx.clip();
  seeds.forEach(([sx, sy, angle], index) => {
    const jitterX = (random() - 0.5) * 1.4 * scale;
    const jitterY = (random() - 0.5) * 1.4 * scale;
    ctx.beginPath();
    ctx.fillStyle = mode === "half" ? (index % 2 ? "#f7b594" : "#b43a2b") : "#6f2218";
    ctx.ellipse(sx * scale + jitterX, sy * scale + jitterY, 1.45 * scale, 3.1 * scale, angle, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function drawStrawberryCrown(ctx, scale, seed) {
  const random = seededRandom(seed + 93);
  const leaves = [
    { angle: -2.55, length: 17, width: 6 },
    { angle: -2.05, length: 20, width: 6.5 },
    { angle: -1.48, length: 18, width: 7.2 },
    { angle: -0.92, length: 21, width: 6.5 },
    { angle: -0.36, length: 17, width: 6 },
  ];

  ctx.save();
  ctx.fillStyle = "#2f7f3b";
  ctx.strokeStyle = "#123d20";
  ctx.lineWidth = 1.3 * scale;
  ctx.lineJoin = "round";
  leaves.forEach((leaf, index) => {
    const angle = leaf.angle + (random() - 0.5) * 0.12;
    const base = { x: 0, y: -15 * scale };
    const tip = {
      x: base.x + Math.cos(angle) * leaf.length * scale,
      y: base.y + Math.sin(angle) * leaf.length * scale,
    };
    const normal = { x: Math.cos(angle + Math.PI / 2), y: Math.sin(angle + Math.PI / 2) };
    const width = leaf.width * scale;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.quadraticCurveTo(base.x + normal.x * width, base.y + normal.y * width, tip.x, tip.y);
    ctx.quadraticCurveTo(base.x - normal.x * width * 0.8, base.y - normal.y * width * 0.8, base.x, base.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (index === 2) {
      ctx.strokeStyle = "#19592a";
      ctx.lineWidth = 2 * scale;
      line(ctx, base.x, base.y - 2 * scale, tip.x, tip.y);
      ctx.strokeStyle = "#123d20";
      ctx.lineWidth = 1.3 * scale;
    }
  });
  ctx.restore();
}

function drawOrange(ctx, x, y, scale) {
  fillShape(ctx, (p) => ellipsePath(p, x, y, 34 * scale, 30 * scale), { x: x - 36 * scale, y: y - 32 * scale, w: 72 * scale, h: 64 * scale }, "#de8a2e", "oil-crayon", {
    seed: 6501,
    patternAlpha: 0.46,
    scumble: 6,
  });
}

function drawOrangeWedge(ctx, x, y, scale, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  fillShape(
    ctx,
    (p) => {
      p.moveTo(-24 * scale, 8 * scale);
      p.quadraticCurveTo(0, -18 * scale, 24 * scale, 8 * scale);
      p.quadraticCurveTo(0, 18 * scale, -24 * scale, 8 * scale);
      p.closePath();
    },
    { x: -26 * scale, y: -20 * scale, w: 52 * scale, h: 40 * scale },
    "#f29b38",
    "wax-crayon",
    { seed: 6400 + Math.round(x + y), patternAlpha: 0.38, scumble: 3 },
  );
  ctx.strokeStyle = "#fff0c4";
  ctx.lineWidth = 2 * scale;
  line(ctx, -18 * scale, 7 * scale, 18 * scale, 7 * scale);
  ctx.restore();
}

function drawApple(ctx, x, y, scale) {
  fillShape(ctx, (p) => ellipsePath(p, x, y, 32 * scale, 30 * scale, 0.1), { x: x - 34 * scale, y: y - 32 * scale, w: 68 * scale, h: 64 * scale }, "#d34635", "oil-crayon", {
    seed: 6601,
    patternAlpha: 0.44,
    scumble: 5,
  });
  ctx.save();
  ctx.strokeStyle = "#5e3b22";
  ctx.lineWidth = 2;
  line(ctx, x, y - 26 * scale, x + 7 * scale, y - 40 * scale);
  ctx.restore();
}

function drawAppleWedge(ctx, x, y, scale, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  fillShape(
    ctx,
    (p) => {
      p.moveTo(-24 * scale, -6 * scale);
      p.quadraticCurveTo(-4 * scale, -20 * scale, 25 * scale, -4 * scale);
      p.quadraticCurveTo(7 * scale, 18 * scale, -24 * scale, -6 * scale);
      p.closePath();
    },
    { x: -26 * scale, y: -22 * scale, w: 52 * scale, h: 44 * scale },
    "#fff2d1",
    "colored-pencil",
    { seed: 6500 + Math.round(x + y), patternAlpha: 0.35, scumble: 3 },
  );
  ctx.strokeStyle = "#c73a2e";
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(-24 * scale, -6 * scale);
  ctx.quadraticCurveTo(-4 * scale, -20 * scale, 25 * scale, -4 * scale);
  ctx.stroke();
  ctx.restore();
}

function drawKiwi(ctx, x, y, scale) {
  fillShape(ctx, (p) => ellipsePath(p, x, y, 30 * scale, 26 * scale), { x: x - 32 * scale, y: y - 28 * scale, w: 64 * scale, h: 56 * scale }, "#8a663e", "oil-crayon", {
    seed: 6701,
    patternAlpha: 0.4,
    scumble: 6,
  });
}

function drawKiwiSlice(ctx, x, y, scale, seed) {
  fillShape(ctx, (p) => ellipsePath(p, x, y, 23 * scale, 19 * scale), { x: x - 24 * scale, y: y - 20 * scale, w: 48 * scale, h: 40 * scale }, "#8fc75a", "oil-crayon", {
    seed,
    patternAlpha: 0.42,
    scumble: 3,
  });
  ctx.save();
  ctx.fillStyle = "#edf2cd";
  ctx.beginPath();
  ctx.ellipse(x, y, 8 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * 14 * scale, y + Math.sin(a) * 11 * scale, 1 * scale, 1.4 * scale, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWatermelonWedge(ctx, x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  fillShape(
    ctx,
    (p) => {
      p.moveTo(-64 * scale, 22 * scale);
      p.quadraticCurveTo(0, -42 * scale, 76 * scale, 16 * scale);
      p.lineTo(-64 * scale, 22 * scale);
      p.closePath();
    },
    { x: -70 * scale, y: -46 * scale, w: 150 * scale, h: 76 * scale },
    "#ee6a62",
    "oil-crayon",
    { seed: 6801, patternAlpha: 0.42, scumble: 8 },
  );
  ctx.strokeStyle = "#39743f";
  ctx.lineWidth = 8 * scale;
  line(ctx, -64 * scale, 22 * scale, 76 * scale, 16 * scale);
  ctx.restore();
}

function drawWatermelonCube(ctx, x, y, scale, seed) {
  fillShape(ctx, (p) => roundedRectPath(p, x - 14 * scale, y - 12 * scale, 28 * scale, 24 * scale, 4 * scale), { x: x - 15 * scale, y: y - 13 * scale, w: 30 * scale, h: 26 * scale }, "#ef7469", "oil-crayon", {
    seed,
    patternAlpha: 0.42,
    scumble: 2,
  });
}

function fillShape(ctx, path, bounds, fill, toolName, options = {}) {
  ctx.save();
  ctx.beginPath();
  path(ctx);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();

  fillClippedMaterial(ctx, bounds, path, toolName, {
    color: options.color || fill,
    seed: options.seed,
    alpha: options.alpha,
    patternAlpha: options.patternAlpha,
    scumble: options.scumble,
    hatchCount: options.hatchCount,
    hatch: options.hatch,
    tooth: options.tooth,
    angle: options.angle,
    edgePool: options.edgePool,
    blooms: options.blooms,
  });

  ctx.save();
  ctx.beginPath();
  path(ctx);
  ctx.strokeStyle = options.stroke || INK;
  ctx.lineWidth = options.strokeWidth ?? 2.2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function roundedRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function ellipsePath(ctx, x, y, rx, ry, rotation = 0) {
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
}

function strokeRounded(ctx, x, y, w, h, r, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function smileArc(ctx, x, y, r, start, end) {
  ctx.beginPath();
  ctx.arc(x, y, r, start, end);
  ctx.stroke();
}

function mouthAnchorFor(state) {
  const h = state.head;
  return rotateAround({ x: h.x + 6 * h.scale, y: h.y + 32 * h.scale }, h, h.tilt);
}

function cuttingAction(action) {
  return ["strawberry", "orange", "apple", "kiwi", "watermelon"].includes(action);
}

function lerpObject(a, b, t) {
  const out = {};
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  keys.forEach((key) => {
    const av = a?.[key];
    const bv = b?.[key];
    if (typeof av === "number" && typeof bv === "number") out[key] = lerpNumber(av, bv, t);
    else out[key] = t < 0.5 ? av : bv;
  });
  return out;
}

function lerpPoint(a, b, t) {
  return {
    x: lerpNumber(a.x, b.x, t),
    y: lerpNumber(a.y, b.y, t),
  };
}

function lerpNumber(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function rotateAround(point, center, angle = 0) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * c - dy * s,
    y: center.y + dx * s + dy * c,
  };
}

function offsetPoint(origin, direction, normal, forward, side) {
  return {
    x: origin.x + direction.x * forward + normal.x * side,
    y: origin.y + direction.y * forward + normal.y * side,
  };
}

function capsulePath(ctx, start, end, radius) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const normalAngle = angle + Math.PI / 2;
  const nx = Math.cos(normalAngle) * radius;
  const ny = Math.sin(normalAngle) * radius;
  ctx.moveTo(start.x + nx, start.y + ny);
  ctx.lineTo(end.x + nx, end.y + ny);
  ctx.quadraticCurveTo(end.x + Math.cos(angle) * radius, end.y + Math.sin(angle) * radius, end.x - nx, end.y - ny);
  ctx.lineTo(start.x - nx, start.y - ny);
  ctx.quadraticCurveTo(start.x - Math.cos(angle) * radius, start.y - Math.sin(angle) * radius, start.x + nx, start.y + ny);
  ctx.closePath();
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
