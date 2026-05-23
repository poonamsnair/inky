import {
  drawCoherentPaperGrain,
  drawMaterialBrushStroke,
  drawMaterialHatch,
  drawMaterialScumble,
  drawMaterialStroke,
  fillMaterialGradient,
} from "../../src/material-tools.js";
import { activeCaptionForFrame, drawCaptionOverlay } from "../../src/caption-tools.js";

export const project = {
  width: 960,
  height: 620,
  fps: 12,
  totalFrames: 96,
};

const INK = "#111111";
const PAPER = "#fbfaf5";
const PAPER_WARM = "#f1f0ea";
const SKIN = "#faf8f0";
const SKIN_SHADOW = "#d8d6cf";
const HOODIE = "#f7f6ef";
const HOODIE_DARK = "#dfddd5";
const DESK = "#f2f1ea";
const BLUE = "#eeeeea";
const TEAL = "#e6e5df";
const MINT = "#f0efe8";
const CORAL = "#2b2b2b";
const GOLD = "#d9d8d0";
const LAVENDER = "#e7e6df";
const SHADOW = "rgba(17, 17, 17, 0.14)";

const FRAMES_PER_SCENE = 8;
const CAPTION_TRACK = {
  fps: 12,
  totalFrames: 96,
  style: {
    position: "bottom",
    margin: 14,
    maxWidthRatio: 0.82,
    font: "700 24px Chalkboard SE, Comic Sans MS, Avenir Next, sans-serif",
    lineHeight: 30,
    paddingX: 18,
    paddingY: 12,
    radius: 5,
    textColor: INK,
    backgroundColor: "rgba(255, 255, 250, 0.94)",
    outlineColor: "rgba(17, 17, 17, 0.72)",
  },
  cues: [
    cue("caption-01", 0, 7, "I wanted to make animated videos."),
    cue("caption-02", 8, 15, "LLMs could almost help."),
    cue("caption-03", 16, 23, "But the results never felt alive."),
    cue("caption-04", 24, 31, "The workflow had too much friction."),
    cue("caption-05", 32, 39, "Prompt, tweak, wait, repeat."),
    cue("caption-06", 40, 47, "And somehow it still felt stiff."),
    cue("caption-07", 48, 55, "I liked drawing it more than generating it."),
    cue("caption-08", 56, 63, "I wanted something handmade."),
    cue("caption-09", 64, 71, "Sketch, colour, and animate in one place."),
    cue("caption-10", 72, 79, "That first spark became Inky."),
    cue("caption-11", 80, 87, "AI helps, but the artist still leads."),
    cue("caption-12", 88, 95, "That is why I built Inky."),
  ],
};

export function drawFrame(ctx, frame) {
  const safeFrame = clamp(Math.round(frame), 0, project.totalFrames - 1);
  const scene = clamp(Math.floor(safeFrame / FRAMES_PER_SCENE), 0, 11);
  const localFrame = safeFrame - scene * FRAMES_PER_SCENE;
  const t = localFrame / (FRAMES_PER_SCENE - 1);
  const enter = easeOutCubic(clamp(t * 1.35, 0, 1));
  const pulse = Math.sin((safeFrame + scene * 3) * 0.45);

  ctx.save();
  ctx.clearRect(0, 0, project.width, project.height);
  drawPaper(ctx, scene);

  if (scene <= 2) drawInkHatchPatch(ctx, 642, 104, 248, 196, BLUE, 400 + scene);
  if (scene >= 6 && scene <= 9) drawInkHatchPatch(ctx, 650, 95, 210, 170, GOLD, 460 + scene);
  if (scene >= 10) drawInkHatchPatch(ctx, 662, 88, 232, 194, TEAL, 480 + scene);

  switch (scene) {
    case 0:
      drawOpeningDesk(ctx, enter, pulse);
      break;
    case 1:
      drawPromptingLlm(ctx, enter, pulse);
      break;
    case 2:
      drawRobotMismatch(ctx, enter, pulse);
      break;
    case 3:
      drawToolFriction(ctx, enter, pulse);
      break;
    case 4:
      drawPromptLoop(ctx, enter, pulse);
      break;
    case 5:
      drawStiffPreview(ctx, enter, pulse);
      break;
    case 6:
      drawDrawingFeelsBetter(ctx, enter, pulse);
      break;
    case 7:
      drawMotionNotebook(ctx, enter, pulse);
      break;
    case 8:
      drawOnePlace(ctx, enter, pulse);
      break;
    case 9:
      drawInkySpark(ctx, enter, pulse);
      break;
    case 10:
      drawInkyApp(ctx, enter, pulse);
      break;
    default:
      drawFinalStudio(ctx, enter, pulse);
      break;
  }

  drawInkTransitionDust(ctx, scene, t);
  const caption = activeCaptionForFrame(CAPTION_TRACK, safeFrame);
  drawCaptionOverlay(ctx, caption, {
    width: project.width,
    height: project.height,
    style: CAPTION_TRACK.style,
    backdrop: PAPER,
  });
  ctx.restore();
}

export function inspectImportantBounds(frame) {
  const scene = clamp(Math.floor(Math.round(frame) / FRAMES_PER_SCENE), 0, 11);
  const base = [
    { id: "active-art-safe-area", x: 22, y: 22, width: 916, height: 514 },
    { id: "caption-band", x: 170, y: 544, width: 620, height: 66 },
  ];
  if ([1, 2, 4, 5, 6, 8, 11].includes(scene)) {
    base.push({ id: "creator-character", x: 88, y: 86, width: 330, height: 430 });
  }
  if ([1, 2, 4, 5, 10, 11].includes(scene)) {
    base.push({ id: "screen-or-tablet", x: 442, y: 112, width: 405, height: 330 });
  }
  return base;
}

function cue(id, frameStart, frameEnd, text) {
  return {
    id,
    frameStart,
    frameEnd,
    start: frameStart / project.fps,
    end: (frameEnd + 1) / project.fps,
    text,
    position: "bottom",
  };
}

function drawPaper(ctx, scene) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, project.width, project.height);
  fillMaterialGradient(
    ctx,
    { x: 0, y: 0, w: project.width, h: project.height },
    [
      { offset: 0, color: "#ffffff" },
      { offset: 0.52, color: PAPER },
      { offset: 1, color: "#e9e7df" },
    ],
    { angle: -0.7, alpha: 0.62 },
  );
  drawCoherentPaperGrain(ctx, { x: 0, y: 0, w: project.width, h: project.height }, {
    seed: 7200 + scene,
    step: 5,
    scale: 86,
    alpha: 0.026,
    threshold: 0.24,
  });
}

function drawOpeningDesk(ctx, enter, pulse) {
  drawDeskSurface(ctx, 0, 184, 960, 350, 101);
  drawOverheadCreator(ctx, 224, 346 + pulse * 1.5, 0.92, 102);

  ctx.save();
  ctx.translate(470, 246 - (1 - enter) * 24);
  ctx.rotate(-0.05);
  drawLaptopTop(ctx, -150, -92, 300, 184, "WORK", 120);
  ctx.restore();

  drawPaperStack(ctx, 660, 78, 166, 118, -0.18, 130);
  drawIdeaNote(ctx, 108, 116, -0.32, 140);
  drawNotebook(ctx, 638, 330, 188, 126, 0.05, 150, "notes");
  drawCoffee(ctx, 713, 250, 0.88, 160);
  drawPen(ctx, 86, 234, -0.45, 0.8, 170);
  drawPen(ctx, 812, 356, 0.12, 0.86, 171);
  drawGlasses(ctx, 360, 410, 0.82, 172);
  drawSmallSpark(ctx, 585, 137, enter, 173);
}

function drawPromptingLlm(ctx, enter, pulse) {
  drawDeskSurface(ctx, 0, 386, 960, 148, 201);
  drawSideWoman(ctx, {
    x: 244,
    y: 157 + pulse * 1.4,
    scale: 1.0,
    mood: "hopeful",
    armMode: "typing",
    seed: 210,
  });
  drawOpenLaptop(ctx, 518, 196, 290, 184, 0.03, 220, (screen) => {
    label(screen, "LLM", 20, 33, 18, { weight: 900 });
    drawScreenLine(screen, 18, 62, 218, "PROMPT:", 221);
    drawScreenLine(screen, 18, 88, 210, "A tiny paper airplane", 222);
    drawScreenLine(screen, 18, 112, 182, "flying over a city", 223);
    drawTinyButton(screen, 218, 142, 42, 26, "GO");
  });
  drawThought(ctx, 620, 78, 248, 86, "This could work", 230, enter);
  drawCoffee(ctx, 754, 405, 0.92, 231);
  drawMousePad(ctx, 476, 407, 148, 72, 232);
}

function drawRobotMismatch(ctx, enter, pulse) {
  drawDeskSurface(ctx, 0, 392, 960, 142, 301);
  drawSideWoman(ctx, {
    x: 220,
    y: 150 + pulse,
    scale: 1.0,
    mood: "doubt",
    armMode: "chin",
    seed: 310,
  });
  drawOpenLaptop(ctx, 526, 170, 314, 208, -0.01, 320, (screen) => {
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const x = 28 + col * 118;
        const y = 32 + row * 76;
        sketchRect(screen, x, y, 92, 58, 3, 321 + row * 7 + col);
        drawRobotThumb(screen, x + 46, y + 31, 0.72, 330 + row * 4 + col, enter);
      }
    }
  });
  drawScribbleCloud(ctx, 421, 94, 112, 80, 336, enter);
}

function drawToolFriction(ctx, enter, pulse) {
  drawInkHatchPatch(ctx, 455, 260, 390, 210, CORAL, 404);
  drawToolCard(ctx, 92, 92, 206, 124, -0.05, "ANIMATION", ["Tool", "settings", "layers"], 410, enter);
  drawToolCard(ctx, 354, 68, 172, 118, 0.04, "EXPORT", ["codec", "queue", "retry"], 411, enter);
  drawToolCard(ctx, 548, 160, 214, 128, -0.07, "RENDER QUEUE", ["37%", "waiting", "assets"], 412, enter);
  drawToolCard(ctx, 640, 338, 218, 112, 0.06, "ASSET LIBRARY", ["missing", "folders", "more tabs"], 413, enter);
  drawTimelineCard(ctx, 155, 354, 392, 124, pulse, 414, enter);
  drawTab(ctx, 164, 48, "TAB 17", 416, enter);
  drawTab(ctx, 744, 70, "TAB 23", 417, enter);
  drawTab(ctx, 833, 196, "TAB 9", 418, enter);
  drawLocalArrow(ctx, 310, 116, 378, 118, 421, enter);
  drawLocalArrow(ctx, 502, 134, 557, 182, 422, enter);
  drawLocalArrow(ctx, 548, 392, 628, 384, 423, enter);
  drawLocalArrow(ctx, 284, 320, 230, 248, 424, enter);
}

function drawPromptLoop(ctx, enter, pulse) {
  drawDeskSurface(ctx, 0, 382, 960, 152, 501);
  drawWindowNight(ctx, 119, 66, 172, 150, 502, enter);
  drawSideWoman(ctx, {
    x: 572,
    y: 155 + pulse * 1.2,
    scale: 1.05,
    mood: "tired",
    armMode: "face",
    seed: 510,
  });
  drawOpenLaptop(ctx, 269, 227, 254, 165, -0.02, 520, (screen) => {
    label(screen, "LLM", 20, 28, 17, { weight: 900 });
    drawScreenLine(screen, 22, 58, 170, "PROMPT v47", 521);
    drawScreenLine(screen, 22, 82, 184, "rewrite...", 522);
    drawScreenLine(screen, 22, 108, 134, "wait...", 523);
    drawTinyButton(screen, 172, 124, 54, 25, "SEND");
  });
  drawNotebook(ctx, 512, 398, 210, 98, -0.14, 530, "scratch");
  drawCoffee(ctx, 146, 410, 0.86, 531, "FUEL");
  drawPen(ctx, 704, 424, -0.15, 0.82, 532);
}

function drawStiffPreview(ctx, enter, pulse) {
  drawDeskSurface(ctx, 0, 394, 960, 142, 601);
  drawSideWoman(ctx, {
    x: 178,
    y: 162 + pulse,
    scale: 0.96,
    mood: "concern",
    armMode: "chin",
    seed: 610,
  });
  drawPreviewMonitor(ctx, 384, 92, 430, 278, 620, enter);
  drawWarningBox(ctx, 392, 395, 404, 86, "LOW FLUIDITY", "TRY DIFFERENT SETTINGS", 625, enter);
}

function drawDrawingFeelsBetter(ctx, enter, pulse) {
  drawDeskSurface(ctx, 0, 384, 960, 150, 701);
  drawSideWoman(ctx, {
    x: 258,
    y: 140 + pulse * 0.8,
    scale: 1.02,
    mood: "focused",
    armMode: "drawing",
    seed: 710,
  });
  drawNotebook(ctx, 370, 342, 302, 146, -0.16, 720, "thumbnails");
  drawOpenLaptopBack(ctx, 662, 231, 190, 132, 0.18, 721);
  drawPen(ctx, 726, 441, -0.08, 0.92, 722);
  drawCoffee(ctx, 122, 444, 0.82, 723);
  drawSmallMotionLines(ctx, 425, 336, enter, 724);
}

function drawMotionNotebook(ctx, enter, pulse) {
  drawDeskSurface(ctx, 0, 64, 960, 470, 801);
  drawNotebookCloseup(ctx, enter, pulse);
  drawPen(ctx, 762, 84, 0.18, 1.12, 814);
  drawInkHatchPatch(ctx, 230, 112, 250, 188, MINT, 815);
}

function drawOnePlace(ctx, enter, pulse) {
  drawDeskSurface(ctx, 0, 398, 960, 138, 901);
  drawSideWoman(ctx, {
    x: 238,
    y: 153 + pulse,
    scale: 0.98,
    mood: "thinking",
    armMode: "finger",
    seed: 910,
  });
  drawPinnedCard(ctx, 512, 80, 154, 116, -0.08, "SKETCH", 920, enter, "stick");
  drawPinnedCard(ctx, 716, 96, 150, 114, 0.1, "COLOUR", 921, enter, "swatch");
  drawPinnedCard(ctx, 612, 256, 184, 126, -0.03, "ANIMATE", 922, enter, "walk");
  drawNotebook(ctx, 374, 396, 222, 102, 0.05, 923, "open");
  drawCoffee(ctx, 833, 430, 0.8, 924);
  drawSmallSpark(ctx, 484, 192, enter, 925);
}

function drawInkySpark(ctx, enter, pulse) {
  drawInkHatchPatch(ctx, 404, 160, 330, 260, GOLD, 1001);
  ctx.save();
  ctx.translate(448, 234 - (1 - enter) * 30 + pulse * 2);
  ctx.rotate(-0.12);
  drawPinnedPaper(ctx, -150, -108, 300, 216, 1002);
  label(ctx, "INKY", 0, -10, 58, { weight: 900, align: "center" });
  swoop(ctx, -62, 42, 62, 42, 1003);
  drawHeart(ctx, 78, 70, 16, 1004);
  ctx.restore();
  drawLightbulb(ctx, 706, 328, 1.08 + enter * 0.05, 1005);
  drawRadiatingTicks(ctx, 448, 234, 238, enter, 1006);
}

function drawInkyApp(ctx, enter, pulse) {
  drawAppWindow(ctx, 86, 64, 784, 430, 1101, enter);
  drawAppCanvasScene(ctx, 210, 122, 350, 220, 1102, pulse);
  drawAppTimeline(ctx, 214, 376, 340, 74, 1103, enter);
  drawHelperPanel(ctx, 598, 116, 204, 260, 1104, enter, pulse);
  drawToolRail(ctx, 112, 128, 52, 236, 1105);
}

function drawFinalStudio(ctx, enter, pulse) {
  drawDeskSurface(ctx, 0, 380, 960, 156, 1201);
  drawPlant(ctx, 104, 260, 1, 1202, enter);
  drawBackCreator(ctx, 312, 276 + pulse, 0.95, 1203);
  drawTablet(ctx, 536, 256, 292, 190, -0.04, 1204, enter);
  drawPinnedCard(ctx, 740, 70, 140, 128, 0.06, "MAKE\nSTUFF\nLIKE YOU", 1205, enter, "heart");
  drawNotebook(ctx, 724, 420, 184, 88, 0.1, 1206, "notes");
  drawPen(ctx, 872, 486, -0.15, 0.78, 1207);
  drawSmallSpark(ctx, 826, 236, enter, 1208);
}

function drawDeskSurface(ctx, x, y, w, h, seed) {
  ctx.save();
  fillMaterialGradient(
    ctx,
    { x, y, w, h },
    [
      { offset: 0, color: "#fbfaf5" },
      { offset: 0.54, color: DESK },
      { offset: 1, color: "#e2e0d7" },
    ],
    { angle: 0.08, alpha: 0.72 },
  );
  drawMaterialHatch(ctx, { x, y: y + 8, w, h: h - 12 }, "ballpoint-pen", 30, {
    color: INK,
    alpha: 0.08,
    angle: 0.04,
    length: 42,
    random: seededRandom(seed + 21),
  });
  drawMaterialScumble(ctx, { x, y: y + 18, w, h: h - 32 }, "graphite-pencil", 9, {
    color: INK,
    alpha: 0.025,
    random: seededRandom(seed + 41),
  });
  ctx.strokeStyle = "rgba(17, 17, 17, 0.26)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + 2);
  ctx.stroke();
  ctx.restore();
}

function drawInkHatchPatch(ctx, cx, cy, w, h, _tone, seed) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, -0.08, 0, Math.PI * 2);
  ctx.clip();
  drawMaterialHatch(ctx, { x: cx - w / 2, y: cy - h / 2, w, h }, "ballpoint-pen", 18, {
    color: INK,
    alpha: 0.038,
    angle: -0.44,
    length: 38,
    random: seededRandom(seed),
  });
  drawMaterialScumble(ctx, { x: cx - w / 2, y: cy - h / 2, w, h }, "graphite-pencil", 10, {
    color: INK,
    alpha: 0.025,
    random: seededRandom(seed + 17),
  });
  ctx.restore();
}

function drawOverheadCreator(ctx, x, y, scale, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  fillShape(ctx, { x: -102, y: 20, w: 196, h: 112 }, (p) => {
    p.moveTo(-96, 74);
    p.bezierCurveTo(-76, 16, -42, -6, 6, -2);
    p.bezierCurveTo(62, -6, 96, 28, 96, 84);
    p.bezierCurveTo(38, 106, -36, 104, -96, 74);
  }, HOODIE, seed + 1, 0.72);
  strokeInk(ctx, [
    [-82, 82],
    [-58, 34],
    [-20, 12],
    [20, 12],
    [62, 36],
    [84, 84],
  ], seed + 2, { size: 4.4, tool: "brush-pen" });

  fillShape(ctx, { x: -68, y: -74, w: 126, h: 118 }, (p) => {
    p.ellipse(-9, -18, 55, 52, -0.06, 0, Math.PI * 2);
  }, "#1b1713", seed + 3, 0.7);
  drawHairMass(ctx, -10, -18, 1, seed + 4, "back");
  fillShape(ctx, { x: -58, y: -24, w: 108, h: 70 }, (p) => {
    p.ellipse(-2, 10, 42, 34, -0.05, 0, Math.PI * 2);
  }, SKIN, seed + 5, 0.32);
  ctx.restore();
}

function drawBackCreator(ctx, x, y, scale, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  fillShape(ctx, { x: -94, y: 82, w: 198, h: 188 }, (p) => {
    p.moveTo(-72, 210);
    p.bezierCurveTo(-94, 146, -72, 84, -18, 72);
    p.bezierCurveTo(52, 54, 102, 116, 92, 214);
    p.lineTo(-72, 210);
  }, HOODIE, seed + 1, 0.76);
  drawHood(ctx, -4, 102, 1, seed + 2);
  drawHairMass(ctx, -8, 12, 1.1, seed + 3, "back");
  drawArmTo(ctx, -55, 178, -118, 276, seed + 4, -0.55);
  drawArmTo(ctx, 52, 178, 168, 258, seed + 5, 0.26);
  ctx.restore();
}

function drawSideWoman(ctx, options) {
  const { x, y, scale = 1, mood = "focused", armMode = "typing", seed = 1 } = options;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  drawHood(ctx, -15, 118, 1.0, seed + 5);
  fillShape(ctx, { x: -120, y: 92, w: 230, h: 300 }, (p) => {
    p.moveTo(-82, 360);
    p.bezierCurveTo(-104, 250, -82, 150, -16, 96);
    p.bezierCurveTo(42, 108, 82, 170, 96, 360);
    p.closePath();
  }, HOODIE, seed + 6, 0.7);
  drawHoodieDetails(ctx, seed + 7);
  drawProfileHead(ctx, 0, 32, mood, seed + 8);

  if (armMode === "typing") {
    drawSleeve(ctx, -2, 180, 114, 252, seed + 20);
    drawHand(ctx, 124, 250, 0.16, 0.82, seed + 21, "typing");
    drawSleeve(ctx, 34, 188, 176, 266, seed + 22);
    drawHand(ctx, 186, 264, -0.12, 0.78, seed + 23, "typing");
  } else if (armMode === "chin") {
    drawSleeve(ctx, -22, 178, 24, 122, seed + 24);
    drawHand(ctx, 28, 118, -0.72, 0.86, seed + 25, "chin");
  } else if (armMode === "face") {
    drawSleeve(ctx, -24, 182, 8, 118, seed + 26);
    drawHand(ctx, 14, 112, -0.95, 0.9, seed + 27, "face");
    drawSleeve(ctx, 22, 202, 118, 284, seed + 28);
    drawHand(ctx, 126, 284, -0.24, 0.78, seed + 29, "writing");
  } else if (armMode === "drawing") {
    drawSleeve(ctx, -38, 184, 112, 280, seed + 30);
    drawHand(ctx, 124, 280, -0.2, 0.82, seed + 31, "writing");
    drawSleeve(ctx, 36, 198, 260, 274, seed + 32);
    drawHand(ctx, 270, 272, -0.1, 0.82, seed + 33, "flat");
  } else if (armMode === "finger") {
    drawSleeve(ctx, -14, 188, 40, 126, seed + 34);
    drawHand(ctx, 42, 116, -0.64, 0.84, seed + 35, "finger");
  }
  ctx.restore();
}

function drawProfileHead(ctx, x, y, mood, seed) {
  drawHairMass(ctx, x - 28, y - 20, 0.95, seed + 1, "profile");
  fillShape(ctx, { x: x - 48, y: y - 44, w: 98, h: 116 }, (p) => {
    p.moveTo(x - 42, y - 8);
    p.bezierCurveTo(x - 38, y - 42, x - 4, y - 54, x + 22, y - 36);
    p.bezierCurveTo(x + 38, y - 18, x + 34, y - 2, x + 50, y + 8);
    p.bezierCurveTo(x + 32, y + 12, x + 34, y + 36, x + 4, y + 46);
    p.bezierCurveTo(x - 34, y + 54, x - 54, y + 24, x - 42, y - 8);
  }, SKIN, seed + 2, 0.68);
  strokeInk(ctx, [
    [x - 32, y - 32],
    [x + 10, y - 45],
    [x + 34, y - 20],
    [x + 48, y + 7],
    [x + 26, y + 14],
    [x + 16, y + 40],
    [x - 18, y + 42],
  ], seed + 3, { size: 3.2, tool: "dip-ink" });
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(x + 12, y - 12, 4, 0, Math.PI * 1.1);
  ctx.stroke();
  ctx.beginPath();
  const mouthY = mood === "tired" || mood === "doubt" || mood === "concern" ? y + 18 : y + 16;
  if (mood === "hopeful" || mood === "focused") ctx.arc(x + 30, mouthY, 9, 0.18, 0.9);
  else if (mood === "thinking") ctx.moveTo(x + 24, mouthY), ctx.lineTo(x + 38, mouthY + 1);
  else ctx.arc(x + 30, mouthY + 2, 8, Math.PI * 1.1, Math.PI * 1.72);
  ctx.stroke();
  ctx.fillStyle = "rgba(17, 17, 17, 0.055)";
  ctx.beginPath();
  ctx.ellipse(x + 10, y + 12, 12, 8, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHairMass(ctx, x, y, scale, seed, mode) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const random = seededRandom(seed);
  fillShape(ctx, { x: -72, y: -64, w: 130, h: 116 }, (p) => {
    p.ellipse(-10, -2, mode === "back" ? 54 : 46, mode === "back" ? 50 : 56, -0.15, 0, Math.PI * 2);
  }, "#17120d", seed + 1, 0.86);
  if (mode !== "back") {
    fillShape(ctx, { x: -90, y: -88, w: 72, h: 72 }, (p) => {
      p.ellipse(-54, -42, 28, 24, 0.2, 0, Math.PI * 2);
    }, "#17120d", seed + 2, 0.82);
  } else {
    fillShape(ctx, { x: -72, y: -108, w: 78, h: 78 }, (p) => {
      p.ellipse(-22, -62, 30, 28, -0.1, 0, Math.PI * 2);
    }, "#17120d", seed + 2, 0.82);
  }
  for (let i = 0; i < 18; i += 1) {
    const startX = -52 + random() * 72;
    const startY = -48 + random() * 52;
    const curl = 16 + random() * 32;
    drawMaterialBrushStroke(
      ctx,
      [
        [startX, startY],
        [startX + curl * 0.2, startY - curl * 0.35],
        [startX + curl * 0.66, startY + curl * 0.15],
        [startX + curl, startY - curl * 0.2],
      ],
      "brush-pen",
      {
        color: "#080604",
        alpha: 0.72,
        tool: { size: 3.8 },
        random: seededRandom(seed + 30 + i),
        seed: seed + i,
      },
    );
  }
  ctx.restore();
}

function drawHood(ctx, x, y, scale, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  fillShape(ctx, { x: -88, y: -32, w: 150, h: 122 }, (p) => {
    p.moveTo(-72, 78);
    p.bezierCurveTo(-72, 0, -18, -38, 42, -12);
    p.bezierCurveTo(60, 20, 56, 54, 24, 86);
    p.lineTo(-72, 78);
  }, HOODIE_DARK, seed, 0.42);
  ctx.restore();
}

function drawHoodieDetails(ctx, seed) {
  strokeInk(ctx, [
    [-36, 142],
    [-8, 190],
    [18, 142],
  ], seed, { size: 2.3, tool: "fountain-pen", alpha: 0.74 });
  strokeInk(ctx, [
    [-8, 188],
    [-12, 232],
  ], seed + 1, { size: 1.8, tool: "technical-pen", alpha: 0.8 });
  strokeInk(ctx, [
    [18, 190],
    [28, 232],
  ], seed + 2, { size: 1.8, tool: "technical-pen", alpha: 0.8 });
  drawMaterialHatch(ctx, { x: -66, y: 170, w: 104, h: 148 }, "ballpoint-pen", 14, {
    color: INK,
    alpha: 0.12,
    angle: 1.05,
    length: 24,
    random: seededRandom(seed + 3),
  });
}

function drawSleeve(ctx, x1, y1, x2, y2, seed) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const w1 = 24;
  const w2 = 18;
  fillShape(ctx, {
    x: Math.min(x1, x2) - 34,
    y: Math.min(y1, y2) - 34,
    w: Math.abs(dx) + 68,
    h: Math.abs(dy) + 68,
  }, (p) => {
    p.moveTo(x1 + nx * w1, y1 + ny * w1);
    p.bezierCurveTo(x1 + dx * 0.35 + nx * 24, y1 + dy * 0.35 + ny * 24, x1 + dx * 0.75 + nx * 18, y1 + dy * 0.75 + ny * 18, x2 + nx * w2, y2 + ny * w2);
    p.lineTo(x2 - nx * w2, y2 - ny * w2);
    p.bezierCurveTo(x1 + dx * 0.65 - nx * 18, y1 + dy * 0.65 - ny * 18, x1 + dx * 0.28 - nx * 22, y1 + dy * 0.28 - ny * 22, x1 - nx * w1, y1 - ny * w1);
    p.closePath();
  }, HOODIE, seed, 0.7);
  strokeInk(ctx, [
    [x1 + nx * w1, y1 + ny * w1],
    [x1 + dx * 0.45 + nx * 20, y1 + dy * 0.45 + ny * 20],
    [x2 + nx * w2, y2 + ny * w2],
  ], seed + 2, { size: 2.4, tool: "dip-ink" });
}

function drawArmTo(ctx, x1, y1, x2, y2, seed) {
  drawSleeve(ctx, x1, y1, x2, y2, seed);
  drawHand(ctx, x2, y2, 0, 0.78, seed + 10, "flat");
}

function drawHand(ctx, x, y, angle, scale, seed, mode = "flat") {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  fillShape(ctx, { x: -18, y: -15, w: 42, h: 34 }, (p) => {
    p.ellipse(2, 0, mode === "finger" ? 12 : 15, 10, 0.1, 0, Math.PI * 2);
  }, SKIN, seed, 0.72);
  const fingerCount = mode === "typing" ? 4 : 3;
  for (let i = 0; i < fingerCount; i += 1) {
    const yy = -8 + i * 5.5;
    const len = mode === "finger" && i === 0 ? 30 : 18 - i * 1.2;
    strokeInk(ctx, [[8, yy], [8 + len, yy - 2 + i]], seed + 3 + i, {
      size: mode === "finger" && i === 0 ? 2.5 : 1.8,
      tool: "technical-pen",
      alpha: 0.86,
    });
  }
  if (mode === "writing") drawPen(ctx, 21, -1, -0.3, 0.46, seed + 12);
  ctx.restore();
}

function drawLaptopTop(ctx, x, y, w, h, word, seed) {
  sketchRect(ctx, x, y, w, h, 10, seed, { fill: "#e9eef0", wash: BLUE });
  sketchRect(ctx, x + 40, y + 42, w - 80, h - 68, 4, seed + 1, { fill: "#1b1713" });
  label(ctx, word, x + w / 2, y + h / 2 + 8, 34, { color: "#fff8e8", weight: 900, align: "center", tracking: 11 });
  for (let r = 0; r < 5; r += 1) {
    for (let c = 0; c < 10; c += 1) {
      ctx.fillStyle = "rgba(21,17,13,0.82)";
      ctx.fillRect(x + 62 + c * 13, y + 116 + r * 8, 8, 4);
    }
  }
  sketchRect(ctx, x + w / 2 - 28, y + h - 29, 56, 20, 3, seed + 4, { fill: "#d9d0bf" });
}

function drawOpenLaptop(ctx, x, y, w, h, angle, seed, screenDraw) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawShadow(ctx, -12, h + 82, w + 64, 28);
  sketchRect(ctx, 0, 0, w, h, 10, seed, { fill: "#e8eef0", wash: BLUE });
  sketchRect(ctx, 18, 18, w - 36, h - 36, 5, seed + 1, { fill: "#fffaf0", wash: "#d6f0eb" });
  ctx.save();
  ctx.translate(18, 18);
  screenDraw(ctx);
  ctx.restore();
  sketchRect(ctx, -18, h + 8, w + 54, 58, 8, seed + 2, { fill: "#d9d1c0", wash: "#b9ced7" });
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      ctx.fillStyle = "rgba(21,17,13,0.62)";
      ctx.fillRect(18 + col * 18, h + 24 + row * 9, 11, 4);
    }
  }
  sketchRect(ctx, w / 2 - 34, h + 41, 68, 18, 3, seed + 4, { fill: "#b9afa0" });
  ctx.restore();
}

function drawOpenLaptopBack(ctx, x, y, w, h, angle, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  sketchRect(ctx, 0, 0, w, h, 9, seed, { fill: "#e5ebed", wash: BLUE });
  label(ctx, "heart", w / 2, h / 2 + 6, 0, { custom: "heart" });
  sketchRect(ctx, -20, h + 6, w + 48, 32, 6, seed + 1, { fill: "#d0c6b8" });
  ctx.restore();
}

function drawMousePad(ctx, x, y, w, h, seed) {
  sketchRect(ctx, x, y, w, h, 12, seed, { fill: "#d6caba", wash: "#c4b39b" });
}

function drawRobotThumb(ctx, x, y, scale, seed, enter) {
  ctx.save();
  ctx.translate(x, y + (1 - enter) * 10);
  ctx.scale(scale, scale);
  sketchRect(ctx, -16, -24, 32, 30, 4, seed, { fill: "#f8f1e6", wash: "#d9eef1" });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-7, -8);
  ctx.lineTo(-7, -8);
  ctx.moveTo(8, -8);
  ctx.lineTo(8, -8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 2, 7, 0.2, Math.PI - 0.2);
  ctx.stroke();
  strokeInk(ctx, [[-10, 8], [-20, 28]], seed + 1, { size: 1.7, tool: "technical-pen" });
  strokeInk(ctx, [[10, 8], [20, 28]], seed + 2, { size: 1.7, tool: "technical-pen" });
  strokeInk(ctx, [[-9, 36], [-18, 56]], seed + 3, { size: 1.7, tool: "technical-pen" });
  strokeInk(ctx, [[9, 36], [18, 56]], seed + 4, { size: 1.7, tool: "technical-pen" });
  sketchRect(ctx, -15, 8, 30, 28, 4, seed + 5, { fill: "#f8f1e6", wash: "#edf3d7" });
  ctx.restore();
}

function drawToolCard(ctx, x, y, w, h, angle, title, rows, seed, enter) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 - (1 - enter) * 24);
  ctx.rotate(angle + Math.sin(seed) * 0.02);
  sketchRect(ctx, -w / 2, -h / 2, w, h, 7, seed, { fill: "#fffaf0", wash: "#e4edf2" });
  label(ctx, title, -w / 2 + 18, -h / 2 + 28, 16, { weight: 900 });
  rows.forEach((row, index) => {
    drawScreenLine(ctx, -w / 2 + 18, -h / 2 + 56 + index * 22, w - 58, row, seed + 5 + index);
  });
  ctx.restore();
}

function drawTimelineCard(ctx, x, y, w, h, pulse, seed, enter) {
  ctx.save();
  ctx.translate(x, y + (1 - enter) * 20);
  sketchRect(ctx, 0, 0, w, h, 7, seed, { fill: "#fffaf0", wash: "#f2e3c6" });
  label(ctx, "TIMELINE", 24, 28, 17, { weight: 900 });
  for (let i = 0; i < 8; i += 1) {
    const xx = 24 + i * 38;
    sketchRect(ctx, xx, 50, 28, 34, 3, seed + 10 + i, { fill: i % 2 ? "#e7f2ef" : "#f4ddc8" });
  }
  strokeInk(ctx, [[36, 102], [62, 102], [54, 92]], seed + 40, { size: 2, tool: "technical-pen" });
  strokeInk(ctx, [[100, 102], [122, 94], [122, 110], [100, 102]], seed + 41, { size: 2, tool: "technical-pen" });
  const playX = 58 + Math.max(0, pulse) * 190;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(playX, 70, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTab(ctx, x, y, text, seed, enter) {
  ctx.save();
  ctx.translate(x, y - (1 - enter) * 12);
  sketchRect(ctx, 0, 0, 86, 48, 4, seed, { fill: "#fff7e8", wash: "#ead5b9" });
  label(ctx, text, 12, 28, 15, { weight: 900 });
  ctx.restore();
}

function drawPromptLoopItems(ctx) {
  drawScreenLine(ctx, 22, 58, 170, "PROMPT v47", 521);
}

function drawPreviewMonitor(ctx, x, y, w, h, seed, enter) {
  ctx.save();
  ctx.translate(x, y);
  sketchRect(ctx, 0, 0, w, h, 10, seed, { fill: "#edf2f2", wash: BLUE });
  sketchRect(ctx, 24, 28, w - 48, h - 78, 6, seed + 1, { fill: "#fffaf0", wash: "#dcefe8" });
  for (let i = 0; i < 5; i += 1) {
    const x0 = 70 + i * 64;
    const walk = Math.sin((i + enter) * 1.4) * 7;
    drawStickFigure(ctx, x0, 122 + walk, 1.0, seed + 20 + i, i % 2 ? "step" : "stiff");
  }
  sketchRect(ctx, 24, h - 38, w - 48, 16, 4, seed + 4, { fill: "#e4dac9" });
  ctx.fillStyle = CORAL;
  ctx.fillRect(48 + enter * 240, h - 35, 34, 10);
  ctx.restore();
}

function drawWarningBox(ctx, x, y, w, h, title, subtitle, seed, enter) {
  ctx.save();
  ctx.translate(x, y + (1 - enter) * 14);
  sketchRect(ctx, 0, 0, w, h, 9, seed, { fill: "#fff6e4", wash: "#f3d1c4" });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(30, 58);
  ctx.lineTo(50, 24);
  ctx.lineTo(70, 58);
  ctx.closePath();
  ctx.stroke();
  label(ctx, "!", 50, 49, 24, { weight: 900, align: "center" });
  label(ctx, title, 92, 36, 20, { weight: 900 });
  label(ctx, subtitle, 92, 64, 14, { weight: 800, color: "#3a3a3a" });
  ctx.restore();
}

function drawNotebook(ctx, x, y, w, h, angle, seed, mode = "notes") {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  sketchRect(ctx, -w / 2, -h / 2, w, h, 8, seed, { fill: "#fff8e8", wash: "#e4d7bd" });
  strokeInk(ctx, [[-w / 2 + 20, -h / 2 + 6], [-w / 2 + 20, h / 2 - 6]], seed + 1, { size: 2.2, tool: "technical-pen" });
  for (let i = 0; i < 7; i += 1) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(-w / 2 + 13, -h / 2 + 18 + i * 14, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mode === "thumbnails") {
    for (let i = 0; i < 6; i += 1) {
      const xx = -w / 2 + 52 + (i % 3) * 68;
      const yy = -h / 2 + 26 + Math.floor(i / 3) * 50;
      sketchRect(ctx, xx, yy, 48, 34, 3, seed + 10 + i, { fill: "#fbf5e8" });
      drawStickFigure(ctx, xx + 24, yy + 20, 0.35, seed + 30 + i, i % 2 ? "step" : "jump");
    }
  } else if (mode === "scratch") {
    for (let i = 0; i < 5; i += 1) {
      drawScreenLine(ctx, -w / 2 + 48, -h / 2 + 24 + i * 15, 110 + (i % 2) * 24, "revise", seed + 15 + i);
    }
  } else if (mode === "open") {
    drawScreenLine(ctx, -w / 2 + 44, -h / 2 + 32, 126, "ideas", seed + 15);
    drawScreenLine(ctx, -w / 2 + 44, -h / 2 + 58, 146, "one canvas", seed + 16);
  } else if (mode === "notes") {
    label(ctx, "NOTES", -w / 2 + 52, -h / 2 + 34, 14, { weight: 900 });
  }
  ctx.restore();
}

function drawNotebookCloseup(ctx, enter, pulse) {
  ctx.save();
  ctx.translate(448, 286 + pulse * 0.6);
  ctx.rotate(-0.06);
  sketchRect(ctx, -278, -210, 556, 384, 14, 802, { fill: "#fff8e8", wash: "#eadfc9" });
  strokeInk(ctx, [[-245, -190], [-245, 158]], 803, { size: 3.4, tool: "technical-pen" });
  for (let i = 0; i < 10; i += 1) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(-258, -168 + i * 32, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const xx = -160 + col * 66;
      const yy = -138 + row * 82;
      drawStickFigure(ctx, xx, yy + Math.sin(col + row) * 4, 0.58, 804 + row * 20 + col, col % 2 ? "step" : "jump");
      strokeInk(ctx, [[xx - 24, yy + 38], [xx + 36, yy + 38]], 840 + row * 10 + col, { size: 1.3, tool: "technical-pen", alpha: 0.5 });
    }
  }
  label(ctx, "squash + stretch", -164, 70, 20, { weight: 800 });
  label(ctx, "follow through", -164, 106, 20, { weight: 800 });
  label(ctx, "timing", 120, 70, 20, { weight: 800 });
  label(ctx, "arcs", 120, 106, 20, { weight: 800 });
  label(ctx, "overlap", 120, 142, 20, { weight: 800 });
  drawLocalArrow(ctx, -210, 68, -182, 68, 860, enter);
  drawLocalArrow(ctx, -210, 104, -182, 104, 861, enter);
  ctx.restore();
}

function drawPinnedCard(ctx, x, y, w, h, angle, title, seed, enter, kind = "none") {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2 - (1 - enter) * 16);
  ctx.rotate(angle);
  sketchRect(ctx, -w / 2, -h / 2, w, h, 6, seed, { fill: "#fffaf0", wash: "#eadfc9" });
  ctx.fillStyle = "#c8c8c1";
  ctx.beginPath();
  ctx.ellipse(0, -h / 2 + 6, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  const lines = String(title).split("\n");
  lines.forEach((line, index) => label(ctx, line, 0, -h / 2 + 36 + index * 25, 20, { weight: 900, align: "center" }));
  if (kind === "stick") drawStickFigure(ctx, 0, 40, 0.62, seed + 10, "wide");
  if (kind === "swatch") {
    [CORAL, BLUE, GOLD].forEach((color, index) => {
      ctx.fillStyle = color;
      ctx.fillRect(-42 + index * 30, 36, 22, 22);
      drawMaterialHatch(ctx, { x: -42 + index * 30, y: 36, w: 22, h: 22 }, "colored-pencil", 3, {
        color: INK,
        alpha: 0.2,
        random: seededRandom(seed + 20 + index),
      });
    });
  }
  if (kind === "walk") {
    for (let i = 0; i < 3; i += 1) drawStickFigure(ctx, -45 + i * 45, 48, 0.44, seed + 30 + i, i % 2 ? "step" : "jump");
  }
  if (kind === "heart") drawHeart(ctx, 18, h / 2 - 24, 10, seed + 40);
  ctx.restore();
}

function drawPinnedPaper(ctx, x, y, w, h, seed) {
  sketchRect(ctx, x, y, w, h, 8, seed, { fill: "#fff8e8", wash: "#f1d9a6" });
  ctx.fillStyle = "#c8c8c1";
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 5, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawIdeaNote(ctx, x, y, angle, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  sketchRect(ctx, 0, 0, 112, 86, 5, seed, { fill: "#fff8e8", wash: "#f0e4cf" });
  label(ctx, "IDEAS", 17, 24, 15, { weight: 900 });
  drawScreenLine(ctx, 18, 44, 64, "video", seed + 1);
  drawScreenLine(ctx, 18, 62, 50, "draw", seed + 2);
  ctx.restore();
}

function drawPaperStack(ctx, x, y, w, h, angle, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (let i = 0; i < 3; i += 1) {
    sketchRect(ctx, i * 14, i * 10, w, h, 5, seed + i, { fill: "#fffaf0", wash: "#e7ddcb" });
  }
  ctx.restore();
}

function drawCoffee(ctx, x, y, scale, seed, text = "") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  fillShape(ctx, { x: -40, y: -34, w: 82, h: 76 }, (p) => {
    p.ellipse(0, 0, 31, 36, 0, 0, Math.PI * 2);
  }, "#fff6e6", seed, 0.75);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(34, 2, 18, 22, 0, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(0, -14, 25, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  if (text) label(ctx, text, 0, 10, 15, { align: "center", weight: 900 });
  strokeInk(ctx, [[-10, -56], [-4, -70], [-8, -82]], seed + 2, { size: 1.5, tool: "fountain-pen", alpha: 0.42 });
  strokeInk(ctx, [[13, -54], [19, -68], [14, -78]], seed + 3, { size: 1.5, tool: "fountain-pen", alpha: 0.42 });
  ctx.restore();
}

function drawPen(ctx, x, y, angle, scale, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  strokeInk(ctx, [[-42, 0], [38, 0]], seed, { size: 4.2, tool: "technical-pen" });
  ctx.fillStyle = INK;
  ctx.fillRect(28, -4, 18, 8);
  ctx.fillStyle = INK;
  ctx.fillRect(-22, -3, 34, 6);
  ctx.restore();
}

function drawGlasses(ctx, x, y, scale, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.ellipse(-18, 0, 18, 12, -0.1, 0, Math.PI * 2);
  ctx.ellipse(22, 0, 18, 12, 0.1, 0, Math.PI * 2);
  ctx.moveTo(0, -1);
  ctx.lineTo(6, -1);
  ctx.stroke();
  strokeInk(ctx, [[-36, -2], [-58, -10]], seed, { size: 1.6, tool: "technical-pen" });
  strokeInk(ctx, [[40, -2], [62, -10]], seed + 1, { size: 1.6, tool: "technical-pen" });
  ctx.restore();
}

function drawThought(ctx, x, y, w, h, text, seed, enter) {
  ctx.save();
  ctx.globalAlpha = 0.9 * enter;
  fillShape(ctx, { x, y, w, h }, (p) => {
    p.moveTo(x + 28, y + h * 0.52);
    p.bezierCurveTo(x + 8, y + 28, x + 40, y - 5, x + 88, y + 10);
    p.bezierCurveTo(x + 108, y - 18, x + 176, y - 12, x + 182, y + 18);
    p.bezierCurveTo(x + 228, y + 8, x + 250, y + 48, x + 222, y + 72);
    p.bezierCurveTo(x + 184, y + 102, x + 52, y + 96, x + 28, y + h * 0.52);
  }, "#fffaf0", seed, 0.78);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.3;
  label(ctx, text, x + w / 2, y + h / 2 + 2, 20, { align: "center", weight: 800 });
  ctx.beginPath();
  ctx.ellipse(x + 70, y + h + 18, 8, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 52, y + h + 34, 4, 3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawScribbleCloud(ctx, x, y, w, h, seed, enter) {
  ctx.save();
  ctx.globalAlpha = enter;
  const random = seededRandom(seed);
  for (let i = 0; i < 14; i += 1) {
    const cx = x + random() * w;
    const cy = y + random() * h;
    const r = 18 + random() * 26;
    strokeInk(ctx, [
      [cx - r, cy],
      [cx - r * 0.2, cy - r],
      [cx + r, cy - r * 0.2],
      [cx + r * 0.1, cy + r],
      [cx - r, cy],
    ], seed + 10 + i, { size: 2.6, tool: "dip-ink", alpha: 0.72 });
  }
  ctx.restore();
}

function drawWindowNight(ctx, x, y, w, h, seed, enter) {
  sketchRect(ctx, x, y, w, h, 5, seed, { fill: "#181612", wash: "#20243a" });
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(x + w - 52, y + 38, 20, 0.3, Math.PI * 1.55);
  ctx.lineTo(x + w - 44, y + 37);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 16; i += 1) {
    const random = seededRandom(seed + 20 + i);
    ctx.fillStyle = `rgba(255,255,255,${0.35 + random() * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(x + 18 + random() * (w - 36), y + 20 + random() * (h - 40), 1.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawLocalArrow(ctx, x + 18, y + h + 30, x + 76 + enter * 20, y + h + 30, seed + 40, enter);
}

function drawStickFigure(ctx, x, y, scale, seed, pose) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, -34, 11, 0, Math.PI * 2);
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 16);
  if (pose === "wide") {
    ctx.moveTo(0, -6); ctx.lineTo(-28, -18);
    ctx.moveTo(0, -6); ctx.lineTo(28, -18);
    ctx.moveTo(0, 16); ctx.lineTo(-30, 44);
    ctx.moveTo(0, 16); ctx.lineTo(30, 44);
  } else if (pose === "jump") {
    ctx.moveTo(0, -6); ctx.lineTo(-24, -28);
    ctx.moveTo(0, -6); ctx.lineTo(26, -28);
    ctx.moveTo(0, 16); ctx.lineTo(-14, 50);
    ctx.moveTo(0, 16); ctx.lineTo(26, 40);
  } else if (pose === "step") {
    ctx.moveTo(0, -6); ctx.lineTo(-26, 4);
    ctx.moveTo(0, -6); ctx.lineTo(25, -2);
    ctx.moveTo(0, 16); ctx.lineTo(-26, 46);
    ctx.moveTo(0, 16); ctx.lineTo(30, 34);
  } else {
    ctx.moveTo(0, -6); ctx.lineTo(-15, 18);
    ctx.moveTo(0, -6); ctx.lineTo(15, 18);
    ctx.moveTo(0, 16); ctx.lineTo(-12, 48);
    ctx.moveTo(0, 16); ctx.lineTo(12, 48);
  }
  ctx.stroke();
  ctx.restore();
}

function drawScreenLine(ctx, x, y, width, text, seed) {
  strokeInk(ctx, [[x, y], [x + width, y + Math.sin(seed) * 1.5]], seed, {
    size: 1.5,
    tool: "technical-pen",
    alpha: 0.55,
  });
  if (text) label(ctx, text, x + 2, y - 5, 11, { weight: 800, color: "#333333" });
}

function drawTinyButton(ctx, x, y, w, h, text) {
  sketchRect(ctx, x, y, w, h, 4, x + y, { fill: "#f2e6d1", wash: GOLD });
  label(ctx, text, x + w / 2, y + h / 2 + 4, 11, { align: "center", weight: 900 });
}

function drawLocalArrow(ctx, x1, y1, x2, y2, seed, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  strokeInk(ctx, [[x1, y1], [(x1 + x2) / 2, (y1 + y2) / 2 - 10], [x2, y2]], seed, {
    size: 2.1,
    tool: "fountain-pen",
    alpha: 0.7,
  });
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.translate(x2, y2);
  ctx.rotate(angle);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -6);
  ctx.lineTo(0, 0);
  ctx.lineTo(-12, 6);
  ctx.stroke();
  ctx.restore();
}

function drawSmallMotionLines(ctx, x, y, enter, seed) {
  for (let i = 0; i < 4; i += 1) {
    const yy = y + i * 13;
    strokeInk(ctx, [[x - 36, yy], [x + 22 + enter * 28, yy - 4]], seed + i, {
      size: 1.7,
      tool: "fountain-pen",
      alpha: 0.62,
    });
  }
}

function drawSmallSpark(ctx, x, y, enter, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = enter;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 5; i += 1) {
    const angle = i * (Math.PI * 2 / 5) + 0.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
    ctx.lineTo(Math.cos(angle) * (24 + enter * 10), Math.sin(angle) * (24 + enter * 10));
    ctx.stroke();
  }
  drawMaterialScumble(ctx, { x: -26, y: -24, w: 52, h: 48 }, "graphite-pencil", 6, {
    color: INK,
    alpha: 0.08,
    random: seededRandom(seed),
  });
  ctx.restore();
}

function drawRadiatingTicks(ctx, x, y, radius, enter, seed) {
  ctx.save();
  ctx.globalAlpha = enter;
  for (let i = 0; i < 12; i += 1) {
    const a = i * (Math.PI * 2 / 12);
    const r1 = radius * (0.72 + (i % 2) * 0.08);
    const r2 = radius * (0.86 + (i % 3) * 0.05);
    strokeInk(ctx, [[x + Math.cos(a) * r1, y + Math.sin(a) * r1], [x + Math.cos(a) * r2, y + Math.sin(a) * r2]], seed + i, {
      size: 2.2,
      tool: "fountain-pen",
      alpha: 0.52,
    });
  }
  ctx.restore();
}

function drawLightbulb(ctx, x, y, scale, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  fillShape(ctx, { x: -44, y: -62, w: 88, h: 112 }, (p) => {
    p.ellipse(0, -18, 31, 38, 0, 0, Math.PI * 2);
  }, "#fff1a8", seed, 0.54);
  sketchRect(ctx, -20, 18, 40, 30, 6, seed + 1, { fill: "#d6cab8", wash: "#c8b69d" });
  strokeInk(ctx, [[-18, 30], [18, 30]], seed + 2, { size: 2, tool: "technical-pen" });
  strokeInk(ctx, [[-14, 42], [14, 42]], seed + 3, { size: 2, tool: "technical-pen" });
  ctx.restore();
}

function drawAppWindow(ctx, x, y, w, h, seed, enter) {
  ctx.save();
  ctx.translate(x, y + (1 - enter) * 20);
  sketchRect(ctx, 0, 0, w, h, 12, seed, { fill: "#fffaf0", wash: "#e7efe9" });
  sketchRect(ctx, 0, 0, w, 44, 10, seed + 1, { fill: "#f5e4c8", wash: "#ead1ae" });
  label(ctx, "Inky", 24, 29, 22, { weight: 900 });
  label(ctx, "undo", w - 120, 28, 13, { weight: 800, color: "#333333" });
  label(ctx, "menu", w - 60, 28, 13, { weight: 800, color: "#333333" });
  ctx.restore();
}

function drawAppCanvasScene(ctx, x, y, w, h, seed, pulse) {
  ctx.save();
  sketchRect(ctx, x, y, w, h, 7, seed, { fill: "#fff8e8", wash: "#d8edf4" });
  drawMaterialHatch(ctx, { x: x + 16, y: y + 22, w: w - 32, h: h - 44 }, "ballpoint-pen", 12, {
    color: INK,
    alpha: 0.045,
    angle: -0.34,
    length: 32,
    random: seededRandom(seed + 1),
  });
  drawStickFigure(ctx, x + 152 + pulse * 3, y + 122, 0.62, seed + 2, "wide");
  drawPaperPlane(ctx, x + 206 + pulse * 8, y + 86, 0.78, seed + 3);
  drawCity(ctx, x + 34, y + 164, w - 68, seed + 4);
  ctx.restore();
}

function drawAppTimeline(ctx, x, y, w, h, seed, enter) {
  sketchRect(ctx, x, y, w, h, 7, seed, { fill: "#fff8e8", wash: "#f0dfc8" });
  sketchRect(ctx, x + 18, y + 17, 42, 40, 5, seed + 1, { fill: "#1c1712" });
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.moveTo(x + 34, y + 26);
  ctx.lineTo(x + 34, y + 48);
  ctx.lineTo(x + 50, y + 37);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 6; i += 1) {
    sketchRect(ctx, x + 78 + i * 38, y + 18, 30, 38, 3, seed + 10 + i, { fill: i % 2 ? "#e5f1ec" : "#f5e1ca" });
    strokeInk(ctx, [[x + 86 + i * 38, y + 44], [x + 99 + i * 38, y + 30]], seed + 30 + i, { size: 1.3, tool: "technical-pen" });
  }
  ctx.fillStyle = CORAL;
  ctx.fillRect(x + 80 + enter * 170, y + 15, 7, 44);
}

function drawHelperPanel(ctx, x, y, w, h, seed, enter, pulse) {
  sketchRect(ctx, x, y, w, h, 8, seed, { fill: "#fff8e8", wash: "#dbeee8" });
  label(ctx, "LLM HELPER", x + 18, y + 30, 16, { weight: 900 });
  drawRobotThumb(ctx, x + w / 2, y + 102 + pulse * 2, 0.8, seed + 1, enter);
  sketchRect(ctx, x + 20, y + 166, w - 40, 62, 8, seed + 2, { fill: "#fffaf0", wash: "#f0e2ca" });
  label(ctx, "How can I", x + 38, y + 194, 13, { weight: 800 });
  label(ctx, "help your story?", x + 38, y + 214, 13, { weight: 800 });
  sketchRect(ctx, x + 20, y + 236, w - 40, 26, 6, seed + 3, { fill: "#f8f2e6" });
}

function drawToolRail(ctx, x, y, w, h, seed) {
  sketchRect(ctx, x, y, w, h, 7, seed, { fill: "#fffaf0", wash: "#e5d8bd" });
  ["pen", "ink", "text", "move"].forEach((item, index) => {
    const yy = y + 24 + index * 48;
    if (item === "pen") drawPen(ctx, x + w / 2, yy, -0.8, 0.34, seed + index);
    else if (item === "ink") drawMaterialBrushStroke(ctx, [[x + 18, yy], [x + 35, yy - 11], [x + 36, yy + 14]], "brush-pen", { color: INK, alpha: 0.62, random: seededRandom(seed + index) });
    else label(ctx, item[0].toUpperCase(), x + w / 2, yy + 5, 18, { align: "center", weight: 900 });
  });
  ctx.fillStyle = INK;
  ctx.fillRect(x + 14, y + h - 42, w - 28, 26);
}

function drawPaperPlane(ctx, x, y, scale, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  fillShape(ctx, { x: -48, y: -28, w: 92, h: 62 }, (p) => {
    p.moveTo(-42, -12);
    p.lineTo(46, -22);
    p.lineTo(6, 28);
    p.lineTo(-8, 6);
    p.lineTo(-42, -12);
  }, "#fff8e8", seed, 0.76);
  strokeInk(ctx, [[-39, -11], [46, -22], [-8, 6], [6, 28]], seed + 1, { size: 2.1, tool: "technical-pen" });
  ctx.restore();
}

function drawCity(ctx, x, y, w, seed) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const bw = 22 + (i % 3) * 12;
    const bh = 34 + (i % 4) * 16;
    const xx = x + i * (w / 8);
    sketchRect(ctx, xx, y - bh, bw, bh, 0, seed + i, { fill: "#f2e8d6", wash: "#d5e8ee" });
    ctx.beginPath();
    ctx.moveTo(xx + 6, y - bh + 10);
    ctx.lineTo(xx + bw - 7, y - bh + 10);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTablet(ctx, x, y, w, h, angle, seed, enter) {
  ctx.save();
  ctx.translate(x, y + (1 - enter) * 20);
  ctx.rotate(angle);
  sketchRect(ctx, 0, 0, w, h, 10, seed, { fill: "#1b1713", wash: "#1e2728" });
  sketchRect(ctx, 16, 16, w - 32, h - 32, 6, seed + 1, { fill: "#fff8e8", wash: "#d7eef0" });
  drawToolRail(ctx, 24, 32, 36, 122, seed + 2);
  drawAppCanvasScene(ctx, 70, 32, 128, 92, seed + 3, 0);
  drawMiniHelperPanel(ctx, 208, 32, 54, 112, seed + 4, enter);
  drawAppTimeline(ctx, 70, 138, 192, 34, seed + 5, enter);
  ctx.restore();
}

function drawMiniHelperPanel(ctx, x, y, w, h, seed, enter) {
  sketchRect(ctx, x, y, w, h, 6, seed, { fill: "#fff8e8", wash: "#dbeee8" });
  label(ctx, "AI", x + w / 2, y + 22, 13, { align: "center", weight: 900 });
  drawRobotThumb(ctx, x + w / 2, y + 64, 0.34, seed + 1, enter);
  sketchRect(ctx, x + 8, y + h - 23, w - 16, 14, 4, seed + 2, { fill: "#f8f2e6" });
}

function drawPlant(ctx, x, y, scale, seed, enter) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  sketchRect(ctx, -32, 68, 78, 68, 8, seed, { fill: "#f2e8d6", wash: "#d6c6ac" });
  for (let i = 0; i < 9; i += 1) {
    const angle = -1.35 + i * 0.32;
    const len = 70 + (i % 3) * 18 + enter * 10;
    strokeInk(ctx, [[8, 70], [8 + Math.cos(angle) * len * 0.55, 70 + Math.sin(angle) * len * 0.55], [8 + Math.cos(angle) * len, 70 + Math.sin(angle) * len]], seed + 10 + i, {
      size: 3.2,
      tool: "brush-pen",
      color: INK,
      alpha: 0.68,
    });
  }
  ctx.restore();
}

function drawHeart(ctx, x, y, size, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.7);
  ctx.bezierCurveTo(-size * 1.3, -size * 0.2, -size * 0.55, -size * 1.25, 0, -size * 0.48);
  ctx.bezierCurveTo(size * 0.55, -size * 1.25, size * 1.3, -size * 0.2, 0, size * 0.7);
  ctx.fill();
  strokeInk(ctx, [[-size, 0], [0, size * 0.65], [size, 0]], seed, { size: 1.2, tool: "technical-pen", alpha: 0.5 });
  ctx.restore();
}

function drawShadow(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = SHADOW;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function fillShape(ctx, bounds, pathFn, color, seed, alpha = 0.7) {
  const dark = isDarkInkColor(color);
  ctx.save();
  ctx.beginPath();
  pathFn(ctx);
  ctx.fillStyle = dark ? INK : PAPER;
  ctx.globalAlpha = dark ? Math.min(0.94, Math.max(0.64, alpha)) : 1;
  ctx.fill();
  ctx.restore();

  if (!dark) {
    ctx.save();
    ctx.beginPath();
    pathFn(ctx);
    ctx.clip();
    drawMaterialHatch(ctx, bounds, "ballpoint-pen", 12, {
      color: INK,
      alpha: Math.min(0.11, 0.035 + alpha * 0.055),
      angle: -0.72,
      length: 26,
      random: seededRandom(seed + 5),
    });
    drawMaterialScumble(ctx, bounds, "graphite-pencil", 5, {
      color: INK,
      alpha: 0.026,
      random: seededRandom(seed + 11),
    });
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  pathFn(ctx);
  ctx.stroke();
  ctx.restore();
}

function sketchRect(ctx, x, y, w, h, radius, seed, options = {}) {
  ctx.save();
  roundedRect(ctx, x, y, w, h, radius);
  const dark = isDarkInkColor(options.fill);
  ctx.fillStyle = dark ? INK : PAPER;
  ctx.fill();
  if (options.wash && !dark) {
    ctx.save();
    roundedRect(ctx, x + 1, y + 1, Math.max(0, w - 2), Math.max(0, h - 2), Math.max(0, radius - 1));
    ctx.clip();
    drawMaterialHatch(ctx, { x, y, w, h }, "ballpoint-pen", Math.max(5, Math.floor((w + h) / 34)), {
      color: INK,
      alpha: options.washAlpha ?? 0.045,
      angle: -0.58,
      length: 24,
      random: seededRandom(seed + 3),
    });
    drawMaterialScumble(ctx, { x, y, w, h }, "graphite-pencil", 3, {
      color: INK,
      alpha: 0.024,
      random: seededRandom(seed + 13),
    });
    ctx.restore();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = options.lineWidth || 2.2;
  ctx.lineJoin = "round";
  roundedRect(ctx, x, y, w, h, radius);
  ctx.stroke();
  ctx.restore();
}

function strokeInk(ctx, points, seed, options = {}) {
  drawMaterialStroke(ctx, points, options.tool || "dip-ink", {
    color: options.color || INK,
    alpha: options.alpha ?? 0.84,
    passes: options.passes ?? 2,
    tool: { size: options.size ?? 2.8, ...(options.toolOptions || {}) },
    random: seededRandom(seed),
  });
}

function label(ctx, text, x, y, size, options = {}) {
  if (options.custom === "heart") {
    drawHeart(ctx, x, y, 16, 99);
    return;
  }
  const lines = String(text).split("\n");
  ctx.save();
  ctx.fillStyle = options.color || INK;
  ctx.font = `${options.weight || 700} ${size}px Chalkboard SE, Comic Sans MS, Avenir Next, Trebuchet MS, sans-serif`;
  ctx.textAlign = options.align || "left";
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    if (options.tracking) {
      const letters = Array.from(line);
      const totalWidth = letters.reduce((width, letter) => width + ctx.measureText(letter).width, 0)
        + Math.max(0, letters.length - 1) * options.tracking;
      let cursor = x - totalWidth / 2;
      for (const letter of line) {
        ctx.fillText(letter, cursor + ctx.measureText(letter).width / 2, y + index * size * 1.18);
        cursor += ctx.measureText(letter).width + options.tracking;
      }
    } else {
      ctx.fillText(line, x, y + index * size * 1.18);
    }
  });
  ctx.restore();
}

function isDarkInkColor(color) {
  if (!color || typeof color !== "string") return false;
  if (color === INK || color === "black") return true;
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (!hex) return /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.test(color) && averageRgb(color) < 70;
  const raw = hex[1].length === 3
    ? hex[1].split("").map((char) => char + char).join("")
    : hex[1].slice(0, 6);
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  return (r + g + b) / 3 < 72;
}

function averageRgb(color) {
  const parts = color.match(/\d+/g)?.slice(0, 3).map(Number) || [255, 255, 255];
  return parts.reduce((sum, value) => sum + value, 0) / 3;
}

function swoop(ctx, x1, y1, x2, y2, seed) {
  strokeInk(ctx, [[x1, y1], [(x1 + x2) / 2, y1 + 18], [x2, y2]], seed, {
    size: 4.5,
    tool: "brush-pen",
    alpha: 0.82,
  });
}

function roundedRect(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawInkTransitionDust(ctx, scene, t) {
  if (t < 0.72) return;
  const a = easeInOut((t - 0.72) / 0.28);
  for (let i = 0; i < 7; i += 1) {
    const x = 118 + i * 116;
    const y = 502 - a * 34 + Math.sin(scene + i) * 10;
    ctx.fillStyle = `rgba(21,17,13,${0.06 * a})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + i % 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return function next() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function easeOutCubic(t) {
  const safe = clamp(t, 0, 1);
  return 1 - (1 - safe) ** 3;
}

function easeInOut(t) {
  const safe = clamp(t, 0, 1);
  return safe * safe * (3 - 2 * safe);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
