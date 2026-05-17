import {
  MATERIAL_TOOLKITS,
  drawCoherentPaperGrain,
  drawMaterialBrushStroke,
  drawMaterialScumble,
  drawMaterialStroke,
  fillMaterialPattern,
  materialToolNames,
} from "./material-tools.js";
import {
  createSpeechBubbleTrack,
  drawSpeechBubbleTrack,
  validateSpeechBubbleOwnership,
} from "./speech-bubble-tools.js";
import speechBubbleData from "../projects/leafy-plant-rescue-comic/storyboard/speech-bubbles.json";
import "./styles.css";

const WIDTH = 960;
const HEIGHT = 620;
const FPS = 12;
const FRAME_MS = 1000 / FPS;
const TOTAL_FRAMES = 96;
const TAU = Math.PI * 2;

const PROJECT = {
  slug: "leafy-plant-rescue-comic",
  mp4: "/projects/leafy-plant-rescue-comic/outputs/leafy-plant-rescue-comic.mp4",
  mp4BySpeed: {
    "0.5": "/projects/leafy-plant-rescue-comic/outputs/leafy-plant-rescue-comic-0.5x.mp4",
    "0.75": "/projects/leafy-plant-rescue-comic/outputs/leafy-plant-rescue-comic-0.75x.mp4",
    "1": "/projects/leafy-plant-rescue-comic/outputs/leafy-plant-rescue-comic.mp4",
    "1.25": "/projects/leafy-plant-rescue-comic/outputs/leafy-plant-rescue-comic-1.25x.mp4",
    "1.5": "/projects/leafy-plant-rescue-comic/outputs/leafy-plant-rescue-comic-1.5x.mp4",
    "2": "/projects/leafy-plant-rescue-comic/outputs/leafy-plant-rescue-comic-2x.mp4",
  },
};

const canvas = document.querySelector("#whiteboard");
const ctx = canvas.getContext("2d", { alpha: false });
const playButton = document.querySelector("#play");
const pauseButton = document.querySelector("#pause");
const timeline = document.querySelector("#timeline");
const frameCounter = document.querySelector("#frameCounter");
const speedSelect = document.querySelector("#playbackSpeed");
const exportPngButton = document.querySelector("#exportPng");
const exportMp4Button = document.querySelector("#exportMp4");
const statusOutput = document.querySelector("#paintStatus");

canvas.width = WIDTH;
canvas.height = HEIGHT;
timeline.max = String(TOTAL_FRAMES - 1);

const params = new URLSearchParams(window.location.search);
const exportMode = params.has("export");
const requestedFrame = params.has("frame") ? Number(params.get("frame")) : null;
const fixedFrame = Number.isFinite(requestedFrame) ? clamp(Math.round(requestedFrame), 0, TOTAL_FRAMES - 1) : null;
const requestedSpeed = params.has("speed") ? Number(params.get("speed")) : null;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (exportMode) document.body.classList.add("export-mode");

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
let currentFrame = fixedFrame ?? 0;
let isPlaying = !exportMode && !Number.isFinite(fixedFrame) && !reduceMotion;
let lastFrameTick = 0;
let playbackSpeed = nearestPlaybackSpeed(requestedSpeed ?? Number(speedSelect.value));
speedSelect.value = String(playbackSpeed);

const palette = {
  ink: "#14110d",
  softInk: "#33291f",
  paper: "#f6ead5",
  wall: "#2f7681",
  wallDark: "#1d5360",
  wallBlue: "#2b6f94",
  floor: "#6b4a31",
  desk: "#8f5a2f",
  deskDark: "#4b2a15",
  shirt: "#f47a19",
  shirtDark: "#a7440f",
  shorts: "#27659c",
  skinWhite: "#fff9ee",
  faceShadow: "#d8cde5",
  glove: "#fff7e7",
  leaf: "#7d8c25",
  leafLight: "#9cac38",
  leafDark: "#3f541a",
  sickLeaf: "#8d8124",
  brownLeaf: "#8b5425",
  pot: "#bd6538",
  potDark: "#6e321c",
  potLight: "#e0864d",
  soil: "#4b2f1d",
  water: "#5bbfe8",
  waterDark: "#2176a5",
  sunlight: "#ffd85a",
  sunWarm: "#ffec9a",
  poster: "#9ab0d8",
};

const sceneStarts = Array.from({ length: 12 }, (_, index) => index * 8);

const speechTrack = createSpeechBubbleTrack({
  ...speechBubbleData,
  totalFrames: TOTAL_FRAMES,
  style: {
    ...speechBubbleData.style,
    font: "800 24px Avenir Next, Trebuchet MS, Verdana, sans-serif",
    lineHeight: 30,
    fill: "#ffffff",
    stroke: palette.ink,
    strokeWidth: 3,
    radius: 24,
    jitter: 0.7,
  },
});

const speechOwnershipWarnings = validateSpeechBubbleOwnership(speechTrack, (bubble) => speakerAnchorsForFrame(bubble.frameStart), {
  maxDistance: 145,
});
if (speechOwnershipWarnings.length) console.warn("Speech bubble ownership warnings", speechOwnershipWarnings);

function draw(frame) {
  const safeFrame = clamp(Math.round(frame), 0, TOTAL_FRAMES - 1);
  const sceneIndex = locateScene(safeFrame);
  const sceneStart = sceneStarts[sceneIndex];
  const sceneEnd = sceneIndex === sceneStarts.length - 1 ? TOTAL_FRAMES - 1 : sceneStarts[sceneIndex + 1] - 1;
  const beatT = sceneEnd === sceneStart ? 1 : (safeFrame - sceneStart) / (sceneEnd - sceneStart);
  const random = mulberry32(90210 + safeFrame * 131);
  const staticRandom = mulberry32(4400 + sceneIndex * 73);

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawPaper(staticRandom);
  drawLeafyScene(sceneIndex, beatT, random);
  drawSpeechBubbleTrack(ctx, speechTrack, safeFrame, {
    width: WIDTH,
    height: HEIGHT,
    random: mulberry32(7000 + sceneIndex),
  });
  updateUi(safeFrame);
}

function drawLeafyScene(index, t, random) {
  switch (index) {
    case 0:
      drawBedroomSet({ shelf: true, chair: true, lamp: true, deskY: 412, beam: true }, random);
      drawPlant(575, 392, 0.78, { mood: "wilting", label: true, wobble: t }, random);
      drawNotebook(430, 432, 0.8, random);
      drawHero(220, 382, 0.92, { pose: "gasp", expression: "gasp", lookAt: "plant", t }, random);
      drawShockTicks(168, 105, random);
      break;
    case 1:
      drawPlainCloseSet(random);
      drawPlant(482, 430, 1.65, { mood: "close-sad", label: true, distress: true, wobble: t }, random);
      drawDistressSwirl(646, 122, 1.15, random);
      break;
    case 2:
      drawBedroomSet({ bed: true, window: true, posters: true, deskY: 430 }, random);
      drawPlant(360, 398, 0.84, { mood: "wilting", label: true, wobble: t }, random);
      drawHero(720, 398, 0.9, { pose: "cry", expression: "cry", t }, random);
      break;
    case 3:
      drawCloseDeskSet(random);
      drawPlant(568, 428, 1.1, { mood: "wilting", label: true, wet: 0.32, wobble: t }, random);
      drawHero(160, 432, 1.18, { pose: "dropper", expression: "careful", t }, random);
      drawDropper(338, 236, t, random);
      break;
    case 4:
      drawCloseDeskSet(random);
      drawPlant(622, 428, 1.0, { mood: "wilting", label: true, wet: 0.2, wobble: t }, random);
      drawHero(270, 408, 0.95, { pose: "think", expression: "worried", t }, random);
      break;
    case 5:
      drawActionWaterSet(random);
      drawPlant(435, 424, 1.0, { mood: "panic", label: true, wet: 0.8, wobble: t }, random);
      drawHero(765, 402, 0.93, { pose: "pour", expression: "shout", t }, random);
      drawBucketPour(646, 220, 422, 346, t, random);
      drawSplashBurst(424, 352, 1.05, random);
      break;
    case 6:
      drawPlainCloseSet(random);
      drawPlant(472, 444, 1.72, { mood: "drowned", label: true, wet: 1, mud: true, wobble: t }, random);
      drawMudSplashes(472, 430, 1.3, random);
      break;
    case 7:
      drawSunRoomSet(random);
      drawPlant(616, 428, 0.62, { mood: "wilting", label: true, wobble: t }, random);
      drawCart(610, 474, 1.0, random);
      drawHero(330, 434, 0.76, { pose: "push-cart", expression: "urgent", t }, random);
      break;
    case 8:
      drawSunburstSet(random);
      drawPlant(444, 425, 0.96, { mood: "hopeful", label: true, sun: true, wobble: t }, random);
      drawHero(760, 420, 0.95, { pose: "believe", expression: "shout-happy", t }, random);
      break;
    case 9:
      drawTiredRoomSet(random);
      drawPlant(588, 420, 0.9, { mood: "wilting", label: true, wet: 0.35, wobble: t }, random);
      drawHero(252, 435, 0.84, { pose: "slump", expression: "exhausted", t }, random);
      drawTissues(random);
      break;
    case 10:
      drawPlainCloseSet(random);
      drawHeroPeek(82, 310, 1.02, random);
      drawPlant(522, 430, 1.2, { mood: "sprout", label: true, sprout: true, wobble: t }, random);
      drawSproutRays(542, 246, random);
      break;
    default:
      drawPartySet(random);
      drawPlant(586, 430, 1.02, { mood: "meh", label: true, sprout: true, mud: true, wobble: t }, random);
      drawHero(250, 430, 0.9, { pose: "victory", expression: "laugh", t }, random);
      drawConfetti(random);
      break;
  }
}

function drawPaper(random) {
  ctx.fillStyle = palette.paper;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  drawCoherentPaperGrain(ctx, { x: 0, y: 0, w: WIDTH, h: HEIGHT }, {
    seed: 220516,
    color: "#a78a61",
    alpha: 0.034,
    step: 5,
    scale: 92,
    threshold: 0.16,
  });
  drawMaterialScumble(ctx, { x: 0, y: 0, w: WIDTH, h: HEIGHT }, "graphite-pencil", 46, {
    color: "#b09265",
    alpha: 0.025,
    length: 85,
    random,
  });
}

function drawBedroomSet(options, random) {
  drawWall(options.beam ? palette.wallBlue : palette.wall, random);
  drawFloor(505, random);
  if (options.window) drawWindow(120, 90, 165, 250, random, { blinds: true });
  if (options.bed) drawBed(700, 372, 0.95, random);
  if (options.posters) {
    drawPoster(780, 78, 122, 112, "HANG IN\nTHERE!", random, "koala");
    drawPoster(815, 232, 56, 66, "", random, "plant");
  }
  if (options.shelf) drawShelf(44, 72, 128, 265, random);
  if (options.chair) drawChair(58, 436, 0.88, random);
  if (options.lamp) drawDeskLamp(704, 154, 1, random);
  drawDesk(options.deskY ?? 420, 220, random);
  if (options.beam) drawLampBeam(660, 168, 356, 412, random);
}

function drawPlainCloseSet(random) {
  drawWall("#2e7476", random);
  drawDesk(424, 220, random);
}

function drawCloseDeskSet(random) {
  drawWall("#2e777a", random);
  drawDesk(418, 232, random);
  drawWallSeam(730, 0, 730, 420, random);
}

function drawActionWaterSet(random) {
  drawWall("#2f7891", random);
  drawDesk(420, 230, random);
  drawMaterialScumble(ctx, { x: 30, y: 70, w: 880, h: 360 }, "colored-pencil", 48, {
    color: "#8fc7df",
    alpha: 0.07,
    length: 120,
    random,
  });
}

function drawSunRoomSet(random) {
  drawWall("#7c8486", random);
  drawFloor(500, random);
  drawShelf(44, 92, 128, 260, random);
  drawWindow(598, 48, 248, 275, random, { sun: true, trees: true });
  drawLightCone(556, 80, 448, 466, "#ffe985", 0.42, random);
}

function drawSunburstSet(random) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#ffef88");
  gradient.addColorStop(0.55, "#ffd84c");
  gradient.addColorStop(1, "#f8bd30");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  for (let i = 0; i < 42; i += 1) {
    const angle = (i / 42) * TAU;
    line([[455, 275], [455 + Math.cos(angle) * 720, 275 + Math.sin(angle) * 720]], 1.1, "rgba(126,80,13,0.22)", random, 0.45, "technical-pen");
  }
  drawDesk(432, 220, random);
}

function drawTiredRoomSet(random) {
  drawWall("#244d70", random);
  drawFloor(504, random);
  drawShelf(35, 82, 136, 265, random);
  drawPoster(710, 92, 142, 118, "PLANTS\nARE\nHARD", random, "text");
  drawChair(210, 436, 1.05, random);
  drawTrash(72, 510, 0.9, random);
  drawDesk(412, 215, random);
}

function drawPartySet(random) {
  drawWall("#2a6781", random);
  drawDesk(432, 220, random);
  drawPoster(748, 92, 124, 118, "NEVER\nGIVE\nUP!", random, "plant");
}

function drawWall(fill, random) {
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  fillMaterialPattern(ctx, { x: 0, y: 0, w: WIDTH, h: HEIGHT }, "colored-pencil", {
    color: "#1b4853",
    alpha: 0.13,
    composite: "multiply",
    seed: 771,
  });
  drawMaterialScumble(ctx, { x: 0, y: 0, w: WIDTH, h: HEIGHT }, "colored-pencil", 42, {
    color: "#98bdc0",
    alpha: 0.035,
    length: 120,
    random,
  });
}

function drawFloor(y, random) {
  ctx.fillStyle = "#7d5b3b";
  ctx.fillRect(0, y, WIDTH, HEIGHT - y);
  fillMaterialPattern(ctx, { x: 0, y, w: WIDTH, h: HEIGHT - y }, "colored-pencil", {
    color: "#3f2715",
    alpha: 0.18,
    composite: "multiply",
    seed: 355,
  });
  for (let i = 0; i < 6; i += 1) {
    line([[0, y + 24 + i * 28], [WIDTH, y + 20 + i * 30]], 1.2, "rgba(51,29,12,0.38)", random, 0.8, "technical-pen");
  }
}

function drawDesk(y, h, random) {
  const top = [
    [42, y],
    [918, y + 2],
    [940, y + h - 20],
    [18, y + h - 12],
  ];
  materialShape(top, palette.desk, "#5c3218", "colored-pencil", random, {
    outlineSize: 2.5,
    patternAlpha: 0.28,
  });
  for (let i = 0; i < 8; i += 1) {
    const yy = y + 20 + i * 24;
    line([[34, yy], [922, yy + Math.sin(i) * 5]], 1.25, "rgba(58,32,15,0.5)", random, 0.78, "technical-pen");
  }
  drawMaterialScumble(ctx, { x: 55, y: y + 8, w: 840, h: h - 28 }, "colored-pencil", 80, {
    color: "#3e2414",
    alpha: 0.09,
    length: 120,
    angle: 0.04,
    random,
  });
}

function drawLampBeam(x, y, targetX, targetY, random) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  const gradient = ctx.createRadialGradient(targetX, targetY, 20, targetX, targetY, 360);
  gradient.addColorStop(0, "rgba(255,240,130,0.62)");
  gradient.addColorStop(1, "rgba(255,240,130,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(targetX - 210, targetY + 100);
  ctx.lineTo(targetX + 190, targetY - 35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  drawLightCone(x, y, targetX, targetY, "#fff3a1", 0.18, random);
}

function drawLightCone(x, y, targetX, targetY, color, alpha, random) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(targetX - 180, targetY + 130);
  ctx.lineTo(targetX + 180, targetY - 40);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  line([[x, y], [targetX + 180, targetY - 40]], 0.8, "rgba(255,240,160,0.38)", random, 0.5, "technical-pen");
}

function drawDeskLamp(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  line([[0, 92], [18, 26], [52, -4]], 7, "#1c3437", random, 1, "brush-pen");
  line([[18, 26], [48, 96]], 4, "#122326", random, 0.9, "technical-pen");
  materialEllipse(60, -8, 38, 22, "#26626c", "#11333a", "colored-pencil", random, { rotate: -0.55, outlineSize: 2.5 });
  materialEllipse(48, 18, 30, 12, "#fff39a", "#c69a27", "wax-crayon", random, { rotate: -0.55, outlineAlpha: 0.55 });
  materialEllipse(0, 102, 32, 12, "#245d62", "#123337", "colored-pencil", random);
  ctx.restore();
}

function drawShelf(x, y, w, h, random) {
  materialShape([[x, y], [x + w, y - 6], [x + w, y + h], [x, y + h + 8]], "#654326", "#2d1b0d", "colored-pencil", random, { outlineSize: 2.2 });
  for (let row = 0; row < 3; row += 1) {
    const shelfY = y + 48 + row * 74;
    line([[x + 8, shelfY], [x + w - 8, shelfY - 4]], 4, "#2e1b0d", random, 0.8, "technical-pen");
    for (let i = 0; i < 5; i += 1) {
      roundedRect(x + 18 + i * 18, shelfY - 45, 12 + (i % 2) * 5, 40, 1.5, i % 3 === 0 ? "#395d86" : i % 3 === 1 ? "#a76235" : "#678346", "#18120b", 1.2, random);
    }
  }
  materialEllipse(x + w * 0.55, y + h - 18, 26, 19, "#c89b38", "#765a18", "colored-pencil", random, { outlineSize: 2 });
}

function drawChair(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  roundedRect(-54, -82, 96, 106, 14, "#388274", "#153c36", 2.4, random);
  materialEllipse(-8, 28, 74, 18, "#3c8b80", "#174c45", "colored-pencil", random, { outlineSize: 2.2 });
  line([[-36, 38], [-54, 86]], 4, palette.ink, random);
  line([[28, 38], [42, 86]], 4, palette.ink, random);
  line([[-70, 88], [-30, 88]], 4, palette.ink, random);
  line([[20, 88], [58, 88]], 4, palette.ink, random);
  ctx.restore();
}

function drawBed(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  roundedRect(-45, -72, 200, 98, 8, "#7d5571", "#342333", 2.5, random);
  materialShape([[-78, -18], [140, -48], [184, 24], [-40, 58]], "#86a54f", "#475b22", "colored-pencil", random, { outlineSize: 2 });
  materialShape([[-68, -48], [8, -62], [26, -18], [-50, -2]], "#e7d6be", "#8c7c64", "colored-pencil", random, { outlineSize: 1.8 });
  ctx.restore();
}

function drawWindow(x, y, w, h, random, options = {}) {
  roundedRect(x, y, w, h, 2, "#e6d49c", "#372b1e", 2.4, random);
  roundedRect(x + 12, y + 14, w - 24, h - 28, 1, "#a8d7ee", "#51432c", 1.8, random);
  if (options.blinds) {
    for (let i = 0; i < 10; i += 1) {
      line([[x + 18, y + 28 + i * 18], [x + w - 18, y + 24 + i * 18]], 1.2, "rgba(94,72,40,0.42)", random, 0.8, "technical-pen");
    }
  }
  if (options.trees) {
    for (let i = 0; i < 5; i += 1) {
      materialEllipse(x + 54 + i * 38, y + h - 50 - (i % 2) * 20, 34, 28, "#6bb45f", "#2e692f", "colored-pencil", random, { outlineAlpha: 0.2 });
    }
  }
  if (options.sun) {
    materialEllipse(x + w - 56, y + 58, 28, 28, "#ffe36b", "#d9991a", "wax-crayon", random, { outlineSize: 1.5 });
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * TAU;
      line([[x + w - 56 + Math.cos(a) * 38, y + 58 + Math.sin(a) * 38], [x + w - 56 + Math.cos(a) * 56, y + 58 + Math.sin(a) * 56]], 1.8, "#e6a01d", random, 0.7, "technical-pen");
    }
    drawLabelText(":)", x + w - 56, y + 58, 20, "center", "#b36c17");
  }
}

function drawPoster(x, y, w, h, text, random, icon) {
  roundedRect(x, y, w, h, 3, palette.poster, "#2c3650", 2, random);
  drawLabelText(text, x + w / 2, y + 30, 18, "center", "#263044");
  if (icon === "koala") {
    materialEllipse(x + w / 2, y + h - 38, 25, 21, "#bfc8cc", "#5b696f", "colored-pencil", random, { outlineSize: 1.6 });
    materialEllipse(x + w / 2 - 24, y + h - 40, 10, 12, "#bfc8cc", "#5b696f", "colored-pencil", random, { outlineSize: 1.2 });
    materialEllipse(x + w / 2 + 24, y + h - 40, 10, 12, "#bfc8cc", "#5b696f", "colored-pencil", random, { outlineSize: 1.2 });
  }
  if (icon === "plant") {
    line([[x + w / 2, y + h - 18], [x + w / 2, y + h - 46]], 2.8, "#2b7332", random);
    materialEllipse(x + w / 2 - 12, y + h - 44, 13, 7, "#5bae42", "#275c24", "colored-pencil", random, { rotate: -0.4, outlineSize: 1 });
    materialEllipse(x + w / 2 + 12, y + h - 50, 13, 7, "#5bae42", "#275c24", "colored-pencil", random, { rotate: 0.4, outlineSize: 1 });
  }
}

function drawWallSeam(x0, y0, x1, y1, random) {
  line([[x0, y0], [x1, y1]], 1.1, "rgba(20,18,15,0.24)", random, 0.7, "technical-pen");
}

function drawCart(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  roundedRect(-88, -56, 176, 18, 4, "#c6c8b8", "#393935", 2, random);
  roundedRect(-78, 10, 156, 16, 4, "#c6c8b8", "#393935", 2, random);
  line([[-70, -38], [-70, 34]], 4, "#323331", random, 1, "technical-pen");
  line([[70, -38], [70, 34]], 4, "#323331", random, 1, "technical-pen");
  line([[-96, -48], [-130, -78]], 4, "#323331", random, 1, "technical-pen");
  line([[-114, 42], [96, 42]], 3, "#323331", random, 1, "technical-pen");
  materialEllipse(-72, 48, 12, 12, "#2c2d2f", "#090909", "technical-pen", random, { pattern: false });
  materialEllipse(72, 48, 12, 12, "#2c2d2f", "#090909", "technical-pen", random, { pattern: false });
  ctx.restore();
}

function drawTrash(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  materialShape([[-30, -34], [30, -34], [22, 44], [-22, 44]], "#9ba8b0", "#566168", "colored-pencil", random, { outlineSize: 2 });
  for (let i = 0; i < 6; i += 1) line([[-22 + i * 9, -28], [-18 + i * 7, 36]], 0.9, "#4f5b62", random, 0.7, "technical-pen");
  ctx.restore();
}

function drawNotebook(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  materialShape([[-62, -22], [62, -32], [72, 20], [-56, 30]], "#eed666", "#aa7b1a", "colored-pencil", random, { outlineSize: 1.6 });
  line([[-45, -2], [35, -10]], 1, "#8a6a1d", random, 0.8, "technical-pen");
  ctx.restore();
}

function drawTissues(random) {
  for (let i = 0; i < 9; i += 1) {
    const x = 70 + (i % 4) * 50 + (i > 5 ? 120 : 0);
    const y = 548 + Math.floor(i / 4) * 24 + (i % 2) * 7;
    materialShape(
      [[x - 22, y], [x - 4, y - 14], [x + 24, y - 5], [x + 8, y + 14], [x - 18, y + 12]],
      "#e9e4da",
      "#aaa092",
      "graphite-pencil",
      random,
      { outlineSize: 1.3, outlineAlpha: 0.55, patternAlpha: 0.12 },
    );
  }
}

function drawHero(x, y, scale, options, random) {
  const pose = heroPose(options.pose, options.t || 0);
  const shorts = shortsGeometryForPose(pose);
  const legChains = anchorLegChainsToShorts(pose.legs, shorts);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(pose.rotate || 0);

  drawHeroLimbs(legChains, random, "leg");
  drawHeroBody(pose, random, shorts);
  drawHeroLimbs(pose.arms, random, "arm");
  pose.gloves.forEach((hand) => drawGlove(hand[0], hand[1], hand[2] || 1, random, hand[3] || 0));
  drawHeroHead(pose.head[0], pose.head[1], pose.head[2], options.expression, options, random);

  ctx.restore();
}

function shortsGeometryForPose(pose) {
  const leftBody = pose.body?.[3] || [-34, -18];
  const rightBody = pose.body?.[2] || [34, -18];
  const bodyCenterX = (leftBody[0] + rightBody[0]) / 2;
  const bodyBottomY = Math.max(leftBody[1], rightBody[1]);
  const width = clamp(Math.abs(rightBody[0] - leftBody[0]) + 24, 78, 108);
  const leftEdge = bodyCenterX - width / 2;
  const rightEdge = bodyCenterX + width / 2;
  const waistTopY = bodyBottomY - 22;
  const waistBottomY = bodyBottomY - 5;
  const legBottomY = bodyBottomY + 45;

  return {
    centerX: bodyCenterX,
    leftEdge,
    rightEdge,
    waistTopY,
    waistBottomY,
    legBottomY,
    leftOpening: { x: bodyCenterX - width * 0.22, y: legBottomY },
    rightOpening: { x: bodyCenterX + width * 0.22, y: legBottomY },
  };
}

function anchorLegChainsToShorts(chains, shorts) {
  return chains.map((chain, index) => {
    const opening = index === 0 ? shorts.leftOpening : shorts.rightOpening;
    const knee = chain[1] || chain[0] || [opening.x, opening.y + 28];
    const foot = chain[chain.length - 1] || knee;
    return [
      [opening.x, opening.y - 3],
      [opening.x * 0.35 + knee[0] * 0.65, Math.max(opening.y + 14, knee[1])],
      foot,
    ];
  });
}

function heroPose(name, t) {
  const wob = Math.sin(t * TAU) * 4;
  const base = {
    head: [0, -178, 58],
    body: [[-42, -112], [40, -108], [34, -18], [-32, -20]],
    shirtMark: [[-18, -92], [4, -66], [-14, -66], [10, -32]],
    arms: [[[-42, -96], [-70, -55], [-84, -34]], [[40, -94], [72, -64], [92, -42]]],
    legs: [[[-24, -22], [-48, 42], [-66, 82]], [[22, -20], [42, 40], [62, 80]]],
    gloves: [[-84, -34, 1, -0.7], [92, -42, 1, 0.8]],
  };

  const poses = {
    gasp: {
      ...base,
      head: [-8, -186 + wob * 0.25, 62],
      body: [[-45, -112], [35, -106], [26, -16], [-34, -18]],
      arms: [[[-42, -92], [-78, -54], [-72, -28]], [[36, -92], [76, -75], [102, -58]]],
      legs: [[[-24, -20], [-56, 34], [-72, 90]], [[18, -20], [36, 42], [54, 80]]],
      gloves: [[-72, -28, 0.9, -0.5], [102, -58, 1.1, 0.5]],
    },
    cry: {
      ...base,
      head: [0, -190, 64],
      arms: [[[-36, -92], [-16, -58], [0, -48]], [[36, -92], [18, -58], [0, -48]]],
      legs: [[[-24, -20], [-44, 40], [-56, 78]], [[22, -20], [44, 38], [52, 76]]],
      gloves: [[-8, -48, 0.88, -0.2], [8, -48, 0.88, 0.2]],
    },
    dropper: {
      ...base,
      head: [-30, -190, 76],
      body: [[-84, -112], [-4, -104], [-2, -14], [-76, -22]],
      arms: [[[-78, -88], [-102, -40], [-112, -4]], [[-6, -90], [58, -120], [106, -154]]],
      legs: [[[-64, -20], [-74, 38], [-92, 84]], [[-28, -18], [-18, 44], [-12, 82]]],
      gloves: [[-112, -4, 1, -0.2], [106, -154, 0.9, 0.5]],
    },
    think: {
      ...base,
      head: [-4, -188, 64],
      arms: [[[-42, -92], [-70, -52], [-72, -20]], [[38, -92], [58, -72], [34, -126]]],
      legs: [[[-20, -20], [-34, 42], [-48, 82]], [[24, -20], [38, 40], [50, 82]]],
      gloves: [[-72, -20, 0.9, -0.2], [34, -126, 0.82, 0.1]],
    },
    pour: {
      ...base,
      head: [-2, -184, 62],
      arms: [[[-42, -92], [-94, -60], [-120, -38]], [[38, -92], [82, -114], [124, -160]]],
      legs: [[[-22, -20], [-54, 38], [-80, 78]], [[24, -20], [54, 44], [92, 70]]],
      gloves: [[-120, -38, 1, -0.2], [124, -160, 1, 0.2]],
    },
    "push-cart": {
      ...base,
      rotate: -0.08,
      head: [0, -172, 56],
      body: [[-40, -102], [34, -106], [24, -20], [-44, -14]],
      arms: [[[-38, -84], [10, -64], [76, -62]], [[34, -90], [62, -64], [104, -62]]],
      legs: [[[-24, -18], [-76, 30], [-118, 82]], [[22, -18], [16, 46], [2, 86]]],
      gloves: [[76, -62, 0.82, 0.1], [104, -62, 0.82, 0.1]],
    },
    believe: {
      ...base,
      head: [0, -184, 62],
      arms: [[[-42, -92], [-92, -72], [-118, -54]], [[38, -94], [70, -148], [88, -214]]],
      legs: [[[-24, -20], [-50, 42], [-74, 82]], [[24, -20], [52, 38], [78, 74]]],
      gloves: [[-118, -54, 1, -0.3], [88, -214, 1.1, 0.6]],
    },
    slump: {
      ...base,
      rotate: -0.08,
      head: [-8, -172, 58],
      body: [[-46, -108], [34, -104], [22, -20], [-38, -8]],
      arms: [[[-40, -88], [-64, -38], [-72, 18]], [[34, -88], [66, -52], [74, -18]]],
      legs: [[[-24, -18], [-10, 42], [-42, 92]], [[20, -18], [48, 42], [76, 86]]],
      gloves: [[-72, 18, 0.9, -0.1], [74, -18, 0.9, 0.2]],
    },
    victory: {
      ...base,
      head: [-2, -198 - wob * 0.4, 62],
      body: [[-42, -118], [40, -116], [30, -24], [-32, -24]],
      arms: [[[-42, -102], [-76, -168], [-92, -224]], [[38, -102], [70, -168], [92, -220]]],
      legs: [[[-24, -22], [-70, 28], [-114, 56]], [[24, -22], [54, 42], [78, 96]]],
      gloves: [[-92, -224, 1.15, -0.3], [92, -220, 1.15, 0.4]],
    },
  };
  return poses[name] || base;
}

function drawHeroBody(pose, random, shorts) {
  materialShape(pose.body, palette.shirt, palette.shirtDark, "wax-crayon", random, {
    outlineSize: 3.2,
    patternAlpha: 0.34,
  });
  line(pose.shirtMark, 3.2, "#fff7d7", random, 0.9, "technical-pen");
  line(
    [[pose.body[3][0] + 8, pose.body[3][1] - 1], [pose.body[2][0] - 8, pose.body[2][1] - 1]],
    2.7,
    palette.ink,
    random,
    0.86,
    "technical-pen",
  );
  drawHeroShorts(random, shorts);
}

function drawHeroShorts(random, shorts) {
  const { centerX, leftEdge, rightEdge, waistTopY, waistBottomY, legBottomY } = shorts;
  const leftLeg = [[leftEdge, waistBottomY - 1], [centerX - 4, waistBottomY], [centerX - 5, legBottomY - 2], [leftEdge + 12, legBottomY + 3], [leftEdge - 5, waistBottomY + 20]];
  const rightLeg = [[centerX + 4, waistBottomY], [rightEdge, waistBottomY - 1], [rightEdge + 5, waistBottomY + 20], [rightEdge - 12, legBottomY + 3], [centerX + 5, legBottomY - 2]];
  const waistband = [[leftEdge - 4, waistTopY], [rightEdge + 4, waistTopY], [rightEdge + 2, waistBottomY], [leftEdge - 2, waistBottomY]];

  straightMaterialShape(leftLeg, palette.shorts, "#163a5f", "colored-pencil", random, {
    outlineSize: 2.4,
    patternAlpha: 0.24,
  });
  straightMaterialShape(rightLeg, palette.shorts, "#163a5f", "colored-pencil", random, {
    outlineSize: 2.4,
    patternAlpha: 0.24,
  });
  straightMaterialShape(waistband, "#1f5b91", "#102d4d", "colored-pencil", random, {
    outlineSize: 2.1,
    patternAlpha: 0.22,
  });

  line([[centerX, waistBottomY], [centerX, legBottomY - 1]], 1.9, "#102840", random, 0.9, "technical-pen");
  line([[leftEdge + 13, legBottomY - 1], [centerX - 8, legBottomY - 4]], 2.2, "#102840", random, 0.88, "technical-pen");
  line([[centerX + 8, legBottomY - 4], [rightEdge - 13, legBottomY - 1]], 2.2, "#102840", random, 0.88, "technical-pen");
  line([[leftEdge + 9, waistBottomY + 2], [leftEdge + 7, legBottomY - 9]], 1.4, "rgba(13,35,57,0.75)", random, 0.75, "technical-pen");
  line([[rightEdge - 9, waistBottomY + 2], [rightEdge - 7, legBottomY - 9]], 1.4, "rgba(13,35,57,0.75)", random, 0.75, "technical-pen");
  materialEllipse(centerX - 20, legBottomY - 1, 15, 4, "rgba(8,22,35,0.32)", "#081623", "graphite-pencil", random, { outlineAlpha: 0, patternAlpha: 0.08 });
  materialEllipse(centerX + 20, legBottomY - 1, 15, 4, "rgba(8,22,35,0.32)", "#081623", "graphite-pencil", random, { outlineAlpha: 0, patternAlpha: 0.08 });
}

function drawHeroLimbs(chains, random, type) {
  chains.forEach((chain) => {
    line(chain, type === "leg" ? 8 : 7, palette.ink, random, 1, "brush-pen");
  });
  if (type === "leg") {
    chains.forEach((chain) => {
      const foot = chain[chain.length - 1];
      materialEllipse(foot[0] + 12, foot[1] + 4, 22, 8, "#f6f4eb", "#54504a", "graphite-pencil", random, { outlineSize: 2.2 });
    });
  }
}

function drawHeroHead(x, y, r, expression, options, random) {
  materialEllipse(x, y, r, r * 0.98, palette.skinWhite, "#b9adc7", "colored-pencil", random, {
    outlineSize: 3.2,
    patternAlpha: 0.12,
  });
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x - r * 0.34, y + 2, r * 0.28, r * 0.86, -0.12, 0, TAU);
  ctx.fillStyle = "rgba(174,160,205,0.35)";
  ctx.fill();
  ctx.restore();
  line([[x - 20, y - r - 2], [x - 34, y - r - 34]], 2.2, palette.ink, random, 1, "technical-pen");
  line([[x + 2, y - r - 5], [x + 2, y - r - 38]], 2.2, palette.ink, random, 1, "technical-pen");
  line([[x + 24, y - r], [x + 38, y - r - 28]], 2.2, palette.ink, random, 1, "technical-pen");
  drawFace(x, y, r, expression, options, random);
}

function drawFace(x, y, r, expression, options, random) {
  const eyes = {
    gasp: [[x - 20, y - 10, 15, 20, 6, -4], [x + 22, y - 10, 15, 20, 6, -4]],
    cry: [[x - 21, y - 12, 15, 22, -4, -2], [x + 20, y - 12, 15, 22, -5, -2]],
    careful: [[x - 20, y - 8, 14, 18, 5, -1], [x + 19, y - 10, 13, 18, 4, -1]],
    worried: [[x - 20, y - 8, 16, 18, 1, 3], [x + 20, y - 8, 16, 18, -1, 3]],
    shout: [[x - 20, y - 10, 14, 19, 7, -2], [x + 20, y - 10, 14, 19, 7, -2]],
    urgent: [[x - 18, y - 8, 14, 18, 5, -1], [x + 22, y - 8, 14, 18, 5, -1]],
    "shout-happy": [[x - 20, y - 8, 14, 18, 3, -2], [x + 20, y - 8, 14, 18, 3, -2]],
    exhausted: [[x - 20, y - 6, 18, 10, -1, 1], [x + 22, y - 8, 18, 10, -2, 1]],
    laugh: [[x - 22, y - 8, 17, 8, 0, 0], [x + 22, y - 8, 17, 8, 0, 0]],
  }[expression] || [[x - 20, y - 8, 14, 18, 0, 0], [x + 20, y - 8, 14, 18, 0, 0]];

  eyes.forEach(([cx, cy, rx, ry, px, py]) => {
    materialEllipse(cx, cy, rx, ry, "#fffefa", "#e1d7c4", "graphite-pencil", random, { outlineSize: 2.2, pattern: false });
    materialEllipse(cx + px, cy + py, 5.2, 6.5, palette.ink, palette.ink, "technical-pen", random, { outlineAlpha: 0, pattern: false });
  });

  if (expression === "cry") {
    line([[x - 36, y - 35], [x - 16, y - 49]], 2.4, palette.ink, random);
    line([[x + 12, y - 48], [x + 34, y - 33]], 2.4, palette.ink, random);
    drawTear(x - 30, y + 14, 1.05, random);
    drawTear(x + 28, y + 14, 0.9, random);
  } else if (expression === "careful") {
    line([[x - 36, y - 35], [x - 16, y - 46]], 2.4, palette.ink, random);
    line([[x + 12, y - 46], [x + 36, y - 34]], 2.4, palette.ink, random);
  } else if (expression === "exhausted") {
    line([[x - 40, y - 28], [x - 8, y - 22]], 2.2, palette.ink, random);
    line([[x + 7, y - 24], [x + 40, y - 31]], 2.2, palette.ink, random);
  } else {
    line([[x - 36, y - 34], [x - 16, y - 42]], 2.2, palette.ink, random);
    line([[x + 12, y - 42], [x + 36, y - 34]], 2.2, palette.ink, random);
  }

  drawMouth(x, y, r, expression, random);
}

function drawMouth(x, y, r, expression, random) {
  if (["gasp", "shout", "shout-happy"].includes(expression)) {
    materialEllipse(x + 6, y + 28, r * 0.3, r * 0.25, "#1b1110", "#050505", "technical-pen", random, { outlineSize: 2.2, pattern: false });
    materialEllipse(x + 7, y + 39, r * 0.18, r * 0.07, "#e35d54", "#8b2727", "colored-pencil", random, { outlineAlpha: 0, patternAlpha: 0.18 });
    return;
  }
  if (expression === "cry") {
    materialEllipse(x + 8, y + 30, r * 0.28, r * 0.21, "#1b1110", "#050505", "technical-pen", random, { outlineSize: 2, pattern: false });
    return;
  }
  if (expression === "laugh") {
    materialEllipse(x + 6, y + 28, r * 0.37, r * 0.3, "#1b1110", "#050505", "technical-pen", random, { outlineSize: 2.2, pattern: false });
    materialEllipse(x + 10, y + 42, r * 0.2, r * 0.09, "#ef5e52", "#8b2727", "colored-pencil", random, { outlineAlpha: 0 });
    return;
  }
  if (expression === "careful") {
    line([[x - 14, y + 28], [x - 3, y + 22], [x + 10, y + 25]], 2.4, "#4b1c1a", random);
    return;
  }
  if (expression === "exhausted") {
    line([[x - 18, y + 28], [x, y + 35], [x + 18, y + 26]], 2.6, "#4b1c1a", random);
    return;
  }
  line([[x - 18, y + 30], [x, y + 20], [x + 18, y + 30]], 2.5, "#4b1c1a", random);
}

function drawGlove(x, y, scale, random, rotate = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);
  ctx.scale(scale, scale);
  materialEllipse(0, 0, 14, 12, palette.glove, "#b8afa2", "graphite-pencil", random, { outlineSize: 2.2, patternAlpha: 0.1 });
  for (let i = -1; i <= 1; i += 1) {
    line([[4, -2], [18, i * 7 - 2]], 2.2, palette.ink, random, 0.9, "technical-pen");
  }
  ctx.restore();
}

function drawHeroPeek(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  drawHeroHead(0, 0, 82, "gasp", {}, random);
  ctx.restore();
}

function drawTear(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  materialShape([[0, -16], [11, 4], [0, 20], [-11, 4]], palette.water, palette.waterDark, "colored-pencil", random, { outlineSize: 1.6, patternAlpha: 0.22 });
  ctx.restore();
}

function drawPlant(x, y, scale, state, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const wobble = Math.sin((state.wobble || 0) * TAU) * 4;
  drawSaucer(0, 60, random);
  drawPot(0, 0, state, random);
  drawSoil(0, -36, state, random);
  const mood = state.mood || "wilting";
  const wilt = mood === "sprout" ? 0.72 : mood === "meh" ? 0.58 : mood === "hopeful" ? 0.52 : mood === "drowned" ? 0.9 : mood === "close-sad" ? 0.82 : 0.7;
  drawStem(0, -48, -72, -145 + wilt * 45 + wobble, -118, -108 + wilt * 40, random, 1.05);
  drawStem(0, -50, 0, -190 + wilt * 58 - wobble, -6, -138 + wilt * 44, random, 1.2);
  drawStem(4, -48, 78, -154 + wilt * 48 - wobble, 120, -106 + wilt * 40, random, 1.05);
  drawLeaf(-126, -100 + wilt * 36 + wobble * 0.4, 42, 24, -0.82, state, random, true);
  drawLeaf(-64, -166 + wilt * 50, 36, 22, -1.2, state, random, true);
  drawLeaf(118, -96 + wilt * 36 - wobble * 0.4, 44, 24, 0.76, state, random, true);
  drawLeaf(58, -154 + wilt * 42, 36, 21, 1.1, state, random, true);
  drawLeafyFace(0, -88 + wilt * 20, mood, random);
  if (state.sprout) drawSprout(16, -95, random, mood === "meh" ? 0.9 : 1.08);
  if (state.wet) drawWaterOnPot(state.wet, random);
  if (state.mud) drawMudDrips(random);
  ctx.restore();
}

function drawPot(x, y, state, random) {
  materialShape([[-78, -84], [78, -84], [62, 58], [-62, 58]], palette.pot, palette.potDark, "colored-pencil", random, {
    outlineSize: 3,
    patternAlpha: 0.26,
  });
  materialEllipse(0, -84, 86, 18, palette.potLight, palette.potDark, "colored-pencil", random, { outlineSize: 3 });
  roundedRect(-44, -8, 88, 34, 4, "#f1d68d", "#6d3a1f", 2, random);
  drawLabelText("LEAFY", -9, 9, 19, "center", palette.ink);
  materialShape([[31, 2], [39, -5], [47, 2], [39, 12]], "#d35049", "#8c211f", "colored-pencil", random, { outlineSize: 1.2 });
  drawMaterialScumble(ctx, { x: -56, y: -64, w: 112, h: 96 }, "colored-pencil", 18, {
    color: "#5e2c18",
    alpha: 0.09,
    length: 36,
    random,
  });
}

function drawSaucer(x, y, random) {
  materialEllipse(x, y, 96, 18, "#a9522f", "#572a18", "colored-pencil", random, { outlineSize: 2.4 });
}

function drawSoil(x, y, state, random) {
  materialEllipse(x, y, 74, 18, palette.soil, "#1f130b", "charcoal", random, { outlineSize: 2.4, patternAlpha: 0.24 });
  for (let i = 0; i < 26; i += 1) {
    materialEllipse(-54 + random() * 108, y - 8 + random() * 20, 3 + random() * 5, 2 + random() * 4, "#2f1b10", "#160d08", "charcoal", random, { outlineAlpha: 0, patternAlpha: 0.2 });
  }
  if (state.wet) {
    materialEllipse(2, y + 1, 62, 13, "rgba(54,118,142,0.72)", palette.waterDark, "colored-pencil", random, { outlineAlpha: 0.35, patternAlpha: 0.18 });
  }
}

function drawStem(x0, y0, cx, cy, x1, y1, random, weight = 1) {
  drawMaterialBrushStroke(ctx, [[x0, y0], [cx, cy], [x1, y1]], "brush-pen", {
    color: palette.leafDark,
    alpha: 0.92,
    tool: { size: 8 * weight, thinning: 0.12, streamline: 0.34 },
    brush: { bristles: 2, grain: 0.04 },
    random,
  });
  drawMaterialStroke(ctx, [[x0, y0], [cx, cy], [x1, y1]], "technical-pen", {
    color: palette.ink,
    alpha: 0.55,
    tool: { size: 2.4 * weight, thinning: 0.1 },
    random,
  });
}

function drawLeaf(x, y, rx, ry, rotate, state, random, spots = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotate);
  const fill = state.mood === "sprout" ? "#8fb839" : state.mood === "meh" ? "#818f2b" : palette.sickLeaf;
  materialShape([[-rx, 0], [-rx * 0.25, -ry], [rx, 0], [-rx * 0.25, ry]], fill, palette.leafDark, "colored-pencil", random, {
    outlineSize: 2.5,
    patternAlpha: 0.26,
  });
  line([[-rx * 0.72, 0], [rx * 0.72, 0]], 1.5, "rgba(32,54,17,0.68)", random, 0.8, "technical-pen");
  if (spots) {
    for (let i = 0; i < 4; i += 1) {
      materialEllipse(-rx * 0.2 + random() * rx * 0.7, -ry * 0.4 + random() * ry * 0.75, 6 + random() * 7, 3 + random() * 5, palette.brownLeaf, "#4c2717", "colored-pencil", random, { outlineAlpha: 0.25 });
    }
  }
  if (state.wet) {
    for (let i = 0; i < 3; i += 1) {
      materialEllipse(-rx * 0.4 + random() * rx, ry * 0.5 + i * 9, 4, 8, palette.water, palette.waterDark, "colored-pencil", random, { outlineSize: 1.1 });
    }
  }
  ctx.restore();
}

function drawLeafyFace(x, y, mood, random) {
  materialEllipse(x, y, 34, 42, "#788829", palette.leafDark, "colored-pencil", random, { outlineSize: 2.8, patternAlpha: 0.25 });
  if (mood === "drowned") {
    line([[x - 13, y - 10], [x - 4, y - 2], [x + 4, y - 10]], 2, palette.ink, random);
    line([[x + 9, y - 10], [x + 18, y - 2], [x + 26, y - 10]], 2, palette.ink, random);
    materialEllipse(x + 2, y + 20, 17, 14, "#301311", "#050505", "technical-pen", random, { pattern: false });
    return;
  }
  if (mood === "meh") {
    materialEllipse(x - 12, y - 8, 5, 7, palette.ink, palette.ink, "technical-pen", random, { pattern: false, outlineAlpha: 0 });
    materialEllipse(x + 12, y - 8, 5, 7, palette.ink, palette.ink, "technical-pen", random, { pattern: false, outlineAlpha: 0 });
    line([[x - 16, y + 16], [x + 16, y + 14]], 2.3, "#2c1711", random);
    return;
  }
  materialEllipse(x - 12, y - 10, 4, 7, palette.ink, palette.ink, "technical-pen", random, { pattern: false, outlineAlpha: 0 });
  materialEllipse(x + 12, y - 10, 4, 7, palette.ink, palette.ink, "technical-pen", random, { pattern: false, outlineAlpha: 0 });
  line([[x - 18, y + 20], [x, y + 8], [x + 18, y + 20]], 2.4, "#2c1711", random);
}

function drawSprout(x, y, random, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  line([[0, 0], [0, -64]], 5, "#2f8b2d", random);
  drawLeaf(-20, -44, 24, 12, -0.38, { mood: "sprout" }, random, false);
  drawLeaf(22, -54, 24, 12, 0.38, { mood: "sprout" }, random, false);
  materialEllipse(0, -68, 7, 8, "#79c94b", "#2f8b2d", "colored-pencil", random, { outlineSize: 1.2 });
  ctx.restore();
}

function drawWaterOnPot(amount, random) {
  for (let i = 0; i < 12 * amount; i += 1) {
    const x = -72 + random() * 144;
    const y = -72 + random() * 92;
    drawDroplet(x, y, 0.5 + random() * 0.75, random);
  }
  for (let i = 0; i < 8 * amount; i += 1) {
    materialEllipse(-82 + random() * 164, 64 + random() * 26, 8 + random() * 12, 3 + random() * 7, "rgba(83,193,232,0.78)", palette.waterDark, "colored-pencil", random, { outlineAlpha: 0.35 });
  }
}

function drawMudDrips(random) {
  for (let i = 0; i < 18; i += 1) {
    const x = -70 + random() * 140;
    const y = -70 + random() * 112;
    line([[x, y], [x + (random() - 0.5) * 4, y + 18 + random() * 26]], 5 + random() * 3, "#5b2b18", random, 0.86, "brush-pen");
    materialEllipse(x, y + 23 + random() * 24, 4 + random() * 5, 6 + random() * 9, "#5b2b18", "#2c130b", "charcoal", random, { outlineAlpha: 0.2 });
  }
}

function drawDropper(x, y, t, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.48);
  roundedRect(-8, -48, 16, 58, 6, "#f2fbff", "#152428", 2.2, random);
  roundedRect(-10, -66, 20, 18, 8, "#3a8898", "#152428", 2, random);
  materialEllipse(0, 18, 8, 12, palette.water, palette.waterDark, "colored-pencil", random, { outlineSize: 1.4 });
  ctx.restore();
  drawDroplet(x + 40, y + 110 + Math.sin(t * Math.PI) * 22, 0.9, random);
}

function drawDroplet(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  materialShape([[0, -12], [8, 4], [0, 14], [-8, 4]], palette.water, palette.waterDark, "colored-pencil", random, { outlineSize: 1.4, patternAlpha: 0.22 });
  ctx.restore();
}

function drawBucketPour(x, y, targetX, targetY, t, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.55);
  roundedRect(-48, -34, 96, 68, 10, "#5e788d", "#1c2a35", 3, random);
  line([[-34, -34], [0, -72], [34, -34]], 4, "#1c2a35", random);
  ctx.restore();
  const flow = 0.75 + Math.sin(t * Math.PI) * 0.3;
  for (let i = 0; i < 14; i += 1) {
    const off = (i - 7) * 6 + (random() - 0.5) * 12;
    drawMaterialBrushStroke(ctx, [[x - 28 + off * 0.15, y + 34], [targetX + off, targetY - 72], [targetX + off * 0.4, targetY]], "watercolor", {
      color: i % 2 ? palette.water : "#9ce8ff",
      alpha: 0.26 * flow,
      tool: { size: 11 + random() * 5, thinning: 0.04 },
      brush: { bristles: 3, grain: 0.04, composite: "source-over" },
      random,
    });
  }
}

function drawSplashBurst(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  for (let i = 0; i < 22; i += 1) {
    const a = -Math.PI * 0.92 + (i / 21) * Math.PI * 1.55;
    const len = 45 + random() * 76;
    line([[0, 0], [Math.cos(a) * len, Math.sin(a) * len]], 1.4, i % 3 ? "#8ee8ff" : "#f7db4d", random, 0.7, "technical-pen");
  }
  for (let i = 0; i < 24; i += 1) {
    drawDroplet(-100 + random() * 200, -42 + random() * 110, 0.45 + random() * 0.55, random);
  }
  ctx.restore();
}

function drawMudSplashes(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  for (let i = 0; i < 26; i += 1) {
    const a = -Math.PI + random() * Math.PI;
    const dist = 96 + random() * 160;
    materialEllipse(Math.cos(a) * dist, Math.sin(a) * 80, 8 + random() * 16, 4 + random() * 9, i % 3 ? "#5c2d18" : palette.water, i % 3 ? "#2b1209" : palette.waterDark, i % 3 ? "charcoal" : "colored-pencil", random, { rotate: a, outlineAlpha: 0.4 });
  }
  ctx.restore();
}

function drawSproutRays(x, y, random) {
  for (let i = 0; i < 8; i += 1) {
    const a = -Math.PI * 0.85 + (i / 7) * Math.PI * 0.9;
    line([[x + Math.cos(a) * 24, y + Math.sin(a) * 24], [x + Math.cos(a) * 54, y + Math.sin(a) * 54]], 4, "#ffd33d", random, 0.95, "technical-pen");
  }
}

function drawShockTicks(x, y, random) {
  for (let i = 0; i < 4; i += 1) {
    const a = -1.7 + i * 0.35;
    line([[x + Math.cos(a) * 22, y + Math.sin(a) * 22], [x + Math.cos(a) * 54, y + Math.sin(a) * 54]], 3, "#fff9e9", random, 0.95, "technical-pen");
  }
}

function drawDistressSwirl(x, y, scale, random) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const points = [];
  for (let i = 0; i < 56; i += 1) {
    const t = i / 55;
    const a = t * TAU * 3.4;
    const r = 8 + t * 42;
    points.push([Math.cos(a) * r, Math.sin(a) * r * 0.5]);
  }
  drawMaterialStroke(ctx, points, "brush-pen", { color: palette.ink, alpha: 0.82, tool: { size: 3, thinning: 0.22 }, random });
  ctx.restore();
}

function drawConfetti(random) {
  const colors = ["#ff5757", "#ffd33d", "#58c7ff", "#7adf68", "#a879ff", "#ff8ad1"];
  for (let i = 0; i < 96; i += 1) {
    const x = 90 + random() * 790;
    const y = 36 + random() * 270;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(random() * TAU);
    ctx.fillStyle = colors[i % colors.length];
    ctx.strokeStyle = palette.ink;
    ctx.globalAlpha = 0.88;
    ctx.lineWidth = 0.7;
    ctx.fillRect(-3, -6, 6, 12);
    ctx.strokeRect(-3, -6, 6, 12);
    ctx.restore();
  }
}

function materialShape(points, fill, textureColor, tool, random, options = {}) {
  const bounds = boundsFor(points);
  ctx.save();
  smoothClosedPath(points);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
  fillMaterialPattern(ctx, bounds, tool, {
    color: textureColor,
    alpha: options.patternAlpha ?? 0.22,
    composite: "multiply",
    seed: Math.round(bounds.x * 5 + bounds.y * 7 + bounds.w * 11 + bounds.h * 13),
  });
  if (options.scumble) {
    drawMaterialScumble(ctx, bounds, tool, options.scumble, {
      color: textureColor,
      alpha: options.scumbleAlpha ?? 0.12,
      length: options.scumbleLength,
      random,
    });
  }
  ctx.restore();
  if ((options.outlineAlpha ?? 0.9) > 0) {
    strokeClosedPath(points, options.outlineSize || 2.6, options.outlineColor || palette.ink, options.outlineAlpha ?? 0.9);
  }
}

function straightMaterialShape(points, fill, textureColor, tool, random, options = {}) {
  const bounds = boundsFor(points);
  ctx.save();
  straightClosedPath(points);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
  fillMaterialPattern(ctx, bounds, tool, {
    color: textureColor,
    alpha: options.patternAlpha ?? 0.2,
    composite: "multiply",
    seed: Math.round(bounds.x * 13 + bounds.y * 17 + bounds.w * 19 + bounds.h * 23),
  });
  ctx.restore();
  if ((options.outlineAlpha ?? 0.9) > 0) {
    ctx.save();
    straightClosedPath(points);
    ctx.strokeStyle = options.outlineColor || palette.ink;
    ctx.globalAlpha = options.outlineAlpha ?? 0.9;
    ctx.lineWidth = options.outlineSize || 2.4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
  }
}

function materialEllipse(cx, cy, rx, ry, fill, textureColor, tool, random, options = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, options.rotate || 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
  if (options.pattern !== false) {
    fillMaterialPattern(ctx, { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 }, tool, {
      color: textureColor,
      alpha: options.patternAlpha ?? 0.22,
      composite: "multiply",
      seed: Math.round((cx + 19) * 17 + (cy + 31) * 23 + rx * 11),
    });
  }
  ctx.restore();
  if ((options.outlineAlpha ?? 0.9) > 0) {
    const points = ellipsePoints(cx, cy, rx, ry, options.rotate || 0, 34);
    line([...points, points[0]], options.outlineSize || 2.4, options.outlineColor || palette.ink, random, options.outlineAlpha ?? 0.9, "technical-pen");
  }
}

function roundedRect(x, y, w, h, radius, fill, stroke, lineWidth, random) {
  ctx.save();
  roundedPath(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
  fillMaterialPattern(ctx, { x, y, w, h }, "colored-pencil", {
    color: stroke,
    alpha: 0.12,
    composite: "multiply",
    seed: Math.round(x * 3 + y * 7 + w * 11),
  });
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  roundedPath(x, y, w, h, radius);
  ctx.stroke();
  ctx.restore();
}

function strokeClosedPath(points, width, color, alpha = 1) {
  ctx.save();
  smoothClosedPath(points);
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function line(points, size = 2, color = palette.ink, random = Math.random, alpha = 1, tool = "brush-pen") {
  drawMaterialStroke(ctx, points, tool, {
    color,
    alpha,
    tool: { size, thinning: tool === "technical-pen" ? 0.12 : 0.22, streamline: 0.42 },
    random,
  });
}

function smoothClosedPath(points) {
  const last = points.length - 1;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[i === last ? 0 : i + 1];
    ctx.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
  }
  ctx.closePath();
}

function straightClosedPath(points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
}

function roundedPath(x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
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

function ellipsePoints(cx, cy, rx, ry, rotate = 0, count = 32) {
  const cos = Math.cos(rotate);
  const sin = Math.sin(rotate);
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * TAU;
    const x = Math.cos(angle) * rx;
    const y = Math.sin(angle) * ry;
    return [cx + x * cos - y * sin, cy + x * sin + y * cos];
  });
}

function boundsFor(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}

function drawLabelText(text, x, y, size, align = "center", color = palette.ink) {
  ctx.save();
  ctx.font = `800 ${size}px Avenir Next, Trebuchet MS, Verdana, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  String(text).split("\n").forEach((lineText, index, lines) => {
    ctx.fillText(lineText, x, y + (index - (lines.length - 1) / 2) * size * 1.08);
  });
  ctx.restore();
}

function locateScene(frame) {
  for (let i = sceneStarts.length - 1; i >= 0; i -= 1) {
    if (frame >= sceneStarts[i]) return i;
  }
  return 0;
}

function speakerAnchorsForFrame(frame) {
  const scene = locateScene(frame);
  const anchors = [
    { hero: { x: 462, y: 126 }, leafy: { x: 575, y: 298 } },
    { leafy: { x: 482, y: 285 } },
    { hero: { x: 628, y: 184 }, leafy: { x: 360, y: 314 } },
    { hero: { x: 472, y: 188 }, leafy: { x: 568, y: 330 } },
    { hero: { x: 480, y: 172 }, leafy: { x: 622, y: 330 } },
    { hero: { x: 632, y: 146 }, leafy: { x: 435, y: 330 } },
    { leafy: { x: 472, y: 280 } },
    { hero: { x: 410, y: 170 }, leafy: { x: 616, y: 340 } },
    { hero: { x: 790, y: 176 }, leafy: { x: 444, y: 330 } },
    { hero: { x: 340, y: 160 }, leafy: { x: 588, y: 330 } },
    { hero: { x: 190, y: 182 }, leafy: { x: 522, y: 325 } },
    { hero: { x: 250, y: 146 }, leafy: { x: 680, y: 318 } },
  ];
  return anchors[scene] || {};
}

function exportPng() {
  draw(currentFrame);
  const anchor = document.createElement("a");
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = `${PROJECT.slug}-frame-${String(currentFrame + 1).padStart(3, "0")}.png`;
  anchor.click();
  statusOutput.textContent = "PNG frame exported";
}

function exportMp4() {
  const anchor = document.createElement("a");
  const speedLabel = formatSpeedLabel(playbackSpeed);
  anchor.href = mp4PathForSpeed(playbackSpeed);
  anchor.download = `${PROJECT.slug}-${speedLabel}x.mp4`;
  anchor.click();
  statusOutput.textContent = `MP4 export opened at ${speedLabel}x`;
}

function updateUi(frame) {
  currentFrame = frame;
  timeline.value = String(frame);
  frameCounter.textContent = `${frame + 1} / ${TOTAL_FRAMES}`;
  frameCounter.setAttribute("aria-label", `Frame ${frame + 1} of ${TOTAL_FRAMES}`);
  playButton.setAttribute("aria-pressed", String(isPlaying));
  pauseButton.setAttribute("aria-pressed", String(!isPlaying));
}

function tick(timestamp) {
  if (!lastFrameTick) lastFrameTick = timestamp;
  const frameDuration = FRAME_MS / playbackSpeed;
  const elapsed = timestamp - lastFrameTick;
  if (isPlaying && elapsed >= frameDuration) {
    const frameSteps = Math.max(1, Math.floor(elapsed / frameDuration));
    currentFrame = (currentFrame + frameSteps) % TOTAL_FRAMES;
    draw(currentFrame);
    lastFrameTick += frameSteps * frameDuration;
  }
  if (!exportMode && !Number.isFinite(fixedFrame)) window.requestAnimationFrame(tick);
}

function nearestPlaybackSpeed(value) {
  const speed = Number(value);
  if (!Number.isFinite(speed)) return 1;
  return PLAYBACK_SPEEDS.reduce((nearest, option) => {
    return Math.abs(option - speed) < Math.abs(nearest - speed) ? option : nearest;
  }, 1);
}

function formatSpeedLabel(speed) {
  return String(nearestPlaybackSpeed(speed)).replace(/\.0$/, "");
}

function mp4PathForSpeed(speed) {
  const key = formatSpeedLabel(speed);
  return PROJECT.mp4BySpeed?.[key] ?? PROJECT.mp4;
}

function setPlaybackSpeed(value) {
  playbackSpeed = nearestPlaybackSpeed(value);
  speedSelect.value = String(playbackSpeed);
  lastFrameTick = 0;
  statusOutput.textContent = `Playback speed ${playbackSpeed}x`;
  return playbackSpeed;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

playButton.addEventListener("click", () => {
  isPlaying = true;
  lastFrameTick = 0;
  updateUi(currentFrame);
});

pauseButton.addEventListener("click", () => {
  isPlaying = false;
  updateUi(currentFrame);
});

timeline.addEventListener("input", (event) => {
  isPlaying = false;
  draw(Number(event.target.value));
});

speedSelect.addEventListener("change", (event) => {
  setPlaybackSpeed(event.target.value);
  updateUi(currentFrame);
});

exportPngButton.addEventListener("click", exportPng);
exportMp4Button.addEventListener("click", exportMp4);

draw(currentFrame);
if (!exportMode && !Number.isFinite(fixedFrame)) window.requestAnimationFrame(tick);

window.storyboardApp = {
  drawFrame: draw,
  totalFrames: TOTAL_FRAMES,
  fps: FPS,
  get playbackSpeed() {
    return playbackSpeed;
  },
  setPlaybackSpeed,
  mp4PathForSpeed,
  speechTrack,
  speechOwnershipWarnings,
  materialTools: {
    MATERIAL_TOOLKITS,
    names: materialToolNames(),
  },
};
