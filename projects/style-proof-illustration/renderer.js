import {
  drawInkDoodleHand,
  drawPaperScene,
  drawProgressiveContour,
  ellipsePath,
  fillConstructedShape,
  line,
  resolveIllustrationStyle,
  roundedRectPath,
  seededRandom,
  smoothstep,
} from "../../src/illustration-tools.js";
import {
  drawMaterialBrushStroke,
  drawMaterialHatch,
  fillClippedMaterial,
} from "../../src/material-tools.js";
import { buildDoodleToolBrief } from "../../src/doodle-style-tools.js";

export const project = {
  width: 960,
  height: 620,
  fps: 12,
  totalFrames: 72,
};

export const doodleToolBrief = buildDoodleToolBrief("striped-fashion-doodle", {
  styleChecks: ["Match the supplied pink-overalls doodle reference before broadening into other styles."],
});

const STYLE = resolveIllustrationStyle("black-ink-doodle");
const INK = STYLE.ink;
const PAPER = STYLE.paper;
const PINK = "#efc9f2";
const YELLOW = "#f0c847";

export function drawFrame(ctx, frame) {
  const safeFrame = clamp(Math.round(frame), 0, project.totalFrames - 1);
  const t = safeFrame / (project.totalFrames - 1);
  const sketchP = reveal(t, 0.06, 0.34);
  const wallP = reveal(t, 0.04, 0.28);
  const bodyP = reveal(t, 0.22, 0.54);
  const detailP = reveal(t, 0.48, 0.92);
  const settleP = reveal(t, 0.7, 1);
  const bounce = Math.sin(safeFrame * 0.26) * 2.6 * settleP;
  const wave = Math.sin(safeFrame * 0.22) * 0.1 * settleP;

  ctx.save();
  ctx.clearRect(0, 0, project.width, project.height);
  drawPaperScene(ctx, { x: 0, y: 0, w: project.width, h: project.height }, STYLE, {
    seed: 9234,
    light: "#ffffff",
    shadow: "#fafafa",
    gradientAlpha: 0.12,
    grainAlpha: 0.004,
    grainThreshold: 0.44,
  });
  drawDoodleWall(ctx, wallP);
  drawDraftConstruction(ctx, sketchP, t);
  ctx.translate(0, bounce);
  drawGroundShadow(ctx, reveal(t, 0.24, 0.44));
  drawLegsAndShoes(ctx, bodyP, detailP);
  drawBlackUnderlayer(ctx, bodyP);
  drawOveralls(ctx, bodyP, detailP);
  drawArmsAndHands(ctx, bodyP, detailP, wave);
  drawHead(ctx, bodyP, detailP);
  drawToolsAndFinishingMarks(ctx, detailP, safeFrame);
  ctx.restore();
}

export function inspectImportantBounds() {
  return [
    { id: "source-style-character", x: 140, y: 40, width: 710, height: 555 },
    { id: "organic-doodle-hands", x: 116, y: 74, width: 755, height: 230 },
    { id: "pink-striped-overalls", x: 292, y: 230, width: 430, height: 320 },
    { id: "studio-wall-doodles", x: 42, y: 28, width: 860, height: 190 },
  ];
}

function drawDoodleWall(ctx, progress) {
  const posters = [
    { x: 58, y: 38, w: 150, h: 112, r: -0.04, seed: 100, type: "rainbow" },
    { x: 252, y: 40, w: 86, h: 72, r: 0.02, seed: 110, type: "lines" },
    { x: 386, y: 44, w: 116, h: 98, r: -0.07, seed: 120, type: "note" },
    { x: 668, y: 36, w: 156, h: 116, r: 0.03, seed: 130, type: "chart" },
    { x: 92, y: 176, w: 132, h: 98, r: 0.02, seed: 140, type: "plant" },
    { x: 704, y: 184, w: 94, h: 72, r: -0.03, seed: 150, type: "lines" },
  ];
  posters.forEach((poster, index) => {
    const local = clamp((progress - index * 0.08) / 0.38);
    if (local <= 0.01) return;
    drawPoster(ctx, poster, local);
  });
}

function drawPoster(ctx, poster, progress) {
  ctx.save();
  ctx.translate(poster.x + poster.w / 2, poster.y + poster.h / 2);
  ctx.rotate(poster.r);
  ctx.translate(-poster.w / 2, -poster.h / 2);
  drawInkLine(ctx, [[0, 0], [poster.w, -4], [poster.w - 2, poster.h], [4, poster.h - 2], [0, 0]], progress, poster.seed, 2.2, 0.72);
  const p = clamp((progress - 0.28) / 0.7);
  if (p > 0) drawPosterInterior(ctx, poster, p);
  ctx.restore();
}

function drawPosterInterior(ctx, poster, progress) {
  const random = seededRandom(poster.seed + 60);
  if (poster.type === "rainbow") {
    for (let index = 0; index < 4; index += 1) {
      drawInkLine(ctx, [[24 + index * 11, 80], [poster.w * 0.5, 20 + index * 7], [poster.w - 24 - index * 9, 80]], progress, poster.seed + index, 1.5, 0.42);
    }
  } else if (poster.type === "plant") {
    drawInkLine(ctx, [[24, 76], [48, 48], [72, 76], [96, 42]], progress, poster.seed + 1, 1.6, 0.48);
    drawInkLine(ctx, [[18, 28], [50, 30], [94, 26]], progress, poster.seed + 2, 1.2, 0.38);
    drawInkLine(ctx, [[28, 76], [92, 76]], progress, poster.seed + 3, 1.2, 0.35);
  } else if (poster.type === "chart") {
    drawInkLine(ctx, [[22, 82], [54, 60], [88, 78], [124, 46]], progress, poster.seed + 1, 1.5, 0.45);
    for (let index = 0; index < 6; index += 1) {
      const y = 18 + index * 11;
      drawInkLine(ctx, [[18, y], [poster.w - 20 - random() * 22, y + random() * 4]], progress, poster.seed + 8 + index, 1.1, 0.34);
    }
  } else {
    for (let index = 0; index < 5; index += 1) {
      const y = 16 + index * 11;
      drawInkLine(ctx, [[16, y], [poster.w - 18 - random() * 12, y + random() * 4]], progress, poster.seed + index, 1.1, 0.35);
    }
  }
}

function drawDraftConstruction(ctx, progress, t) {
  if (progress <= 0.01 || progress >= 1) return;
  const alpha = 0.42 * (1 - reveal(t, 0.34, 0.48));
  ctx.save();
  ctx.globalAlpha = alpha;
  const guide = "#6a6a66";
  [
    [[392, 132], [422, 62], [500, 70], [554, 134], [534, 208], [444, 222], [392, 132]],
    [[380, 240], [308, 322], [330, 534]],
    [[530, 244], [620, 316], [704, 482]],
    [[374, 252], [264, 250], [176, 166]],
    [[552, 280], [674, 306], [808, 246]],
    [[330, 286], [486, 250], [590, 314], [558, 470], [334, 478], [330, 286]],
  ].forEach((points, index) => {
    drawProgressiveContour(ctx, points, clamp((progress - index * 0.08) / 0.44), STYLE, {
      color: guide,
      alpha: 0.5,
      size: 1.2,
      tool: "graphite-pencil",
      seed: 1000 + index,
    });
  });
  ctx.restore();
}

function drawGroundShadow(ctx, progress) {
  if (progress <= 0.01) return;
  drawMaterialBrushStroke(ctx, [[162, 570], [320, 548], [478, 558], [646, 546], [822, 560]], "doodle-ink", {
    color: INK,
    alpha: 0.56 * progress,
    seed: 1700,
    tool: { size: 22 },
    brush: { bristles: 7, grain: 0.16 },
  });
}

function drawLegsAndShoes(ctx, bodyP, detailP) {
  if (bodyP <= 0.08) return;
  drawWhiteStroke(ctx, [[382, 458], [380, 538]], 18, 2100);
  drawWhiteStroke(ctx, [[586, 430], [692, 468]], 18, 2110);
  drawShoe(ctx, 358, 550, 122, 38, -0.08, 2120);
  drawShoe(ctx, 704, 470, 110, 36, 0.28, 2130);
  if (detailP > 0.02) {
    drawSockStripes(ctx, 382, 505, -0.02, detailP, 2140);
    drawSockStripes(ctx, 666, 454, 0.35, detailP, 2150);
  }
}

function drawBlackUnderlayer(ctx, bodyP) {
  if (bodyP <= 0.16) return;
  fillShape(
    ctx,
    (path) => roundedRectPath(path, 388, 214, 188, 84, 28),
    { x: 380, y: 206, w: 204, h: 100 },
    INK,
    "charcoal",
    2200,
    { strokeWidth: 3.8, patternAlpha: 0.7, scumble: 16 },
  );
  drawBlackStroke(ctx, [[380, 262], [276, 250], [184, 168]], 38, 2210);
  drawBlackStroke(ctx, [[556, 280], [674, 306], [806, 246]], 38, 2220);
}

function drawOveralls(ctx, bodyP, detailP) {
  if (bodyP <= 0.22) return;
  const bibPath = (path) => {
    path.moveTo(358, 280);
    path.quadraticCurveTo(426, 250, 516, 266);
    path.quadraticCurveTo(568, 276, 590, 326);
    path.lineTo(562, 418);
    path.quadraticCurveTo(476, 440, 352, 418);
    path.lineTo(332, 326);
    path.quadraticCurveTo(334, 298, 358, 280);
    path.closePath();
  };
  const leftLeg = (path) => {
    path.moveTo(350, 408);
    path.lineTo(462, 420);
    path.lineTo(432, 540);
    path.quadraticCurveTo(384, 550, 336, 526);
    path.lineTo(332, 438);
    path.closePath();
  };
  const rightLeg = (path) => {
    path.moveTo(470, 414);
    path.lineTo(566, 394);
    path.lineTo(706, 456);
    path.quadraticCurveTo(696, 506, 648, 506);
    path.lineTo(526, 474);
    path.closePath();
  };

  fillShape(ctx, bibPath, { x: 326, y: 250, w: 274, h: 190 }, PINK, "marker", 2300, { strokeWidth: 5.8, patternAlpha: 0.36, scumble: 10 });
  fillShape(ctx, leftLeg, { x: 326, y: 400, w: 146, h: 154 }, PINK, "marker", 2310, { strokeWidth: 5.8, patternAlpha: 0.36, scumble: 8 });
  fillShape(ctx, rightLeg, { x: 462, y: 388, w: 252, h: 126 }, PINK, "marker", 2320, { strokeWidth: 5.8, patternAlpha: 0.36, scumble: 8 });
  drawClippedStripes(ctx, bibPath, { x: 326, y: 250, w: 274, h: 190 }, -0.08, 16, 2400, detailP);
  drawClippedStripes(ctx, leftLeg, { x: 326, y: 400, w: 146, h: 154 }, -0.03, 14, 2410, detailP);
  drawClippedStripes(ctx, rightLeg, { x: 462, y: 388, w: 252, h: 126 }, -0.76, 14, 2420, detailP);
  drawOverallStrapsAndPockets(ctx, detailP);
}

function drawOverallStrapsAndPockets(ctx, detailP) {
  if (detailP <= 0.02) return;
  drawMaterialBrushStroke(ctx, [[360, 280], [386, 230]], "doodle-ink", { color: PINK, alpha: 0.9, seed: 2500, tool: { size: 12 } });
  drawMaterialBrushStroke(ctx, [[552, 272], [532, 230]], "doodle-ink", { color: PINK, alpha: 0.9, seed: 2501, tool: { size: 12 } });
  drawInkLine(ctx, [[360, 280], [386, 230]], detailP, 2502, 2.2, 0.9);
  drawInkLine(ctx, [[552, 272], [532, 230]], detailP, 2503, 2.2, 0.9);
  drawButton(ctx, 360, 286, 9, 2510);
  drawButton(ctx, 548, 276, 9, 2511);
  fillShape(ctx, (path) => roundedRectPath(path, 420, 326, 92, 74, 12), { x: 414, y: 320, w: 104, h: 84 }, PINK, "marker", 2520, {
    strokeWidth: 4.2,
    patternAlpha: 0.2,
    scumble: 2,
  });
  drawInkLine(ctx, [[434, 344], [434, 386]], detailP, 2521, 1.3, 0.64);
  drawInkLine(ctx, [[458, 340], [458, 392]], detailP, 2522, 1.3, 0.64);
  drawSidePocket(ctx, detailP);
  drawLegOpenings(ctx, detailP);
}

function drawSidePocket(ctx, detailP) {
  fillShape(ctx, (path) => roundedRectPath(path, 270, 456, 58, 62, 8), { x: 264, y: 450, w: 70, h: 72 }, PINK, "marker", 2600, {
    strokeWidth: 4,
    patternAlpha: 0.22,
    scumble: 2,
  });
  drawScissors(ctx, 296, 452, detailP);
  drawPencil(ctx, 478, 352, -1.42, detailP);
}

function drawArmsAndHands(ctx, bodyP, detailP, wave) {
  if (bodyP <= 0.28) return;
  drawInkDoodleHand(ctx, { x: 178, y: 164 + Math.sin(wave * 12) * 3 }, {
    variant: "peace",
    style: STYLE,
    seed: 2700,
    scale: 1.1,
    angle: -0.18 + wave,
    progress: detailP,
    outlineSize: 5.6,
    solidAlpha: 0.94,
  });
  drawInkDoodleHand(ctx, { x: 806, y: 248 }, {
    variant: "open",
    style: STYLE,
    seed: 2710,
    scale: 1,
    angle: 0.12 + wave * 0.4,
    progress: detailP,
    outlineSize: 5.2,
    solidAlpha: 0.94,
  });
}

function drawHead(ctx, bodyP, detailP) {
  if (bodyP <= 0.34) return;
  drawHairCloud(ctx, detailP);
  drawEar(ctx, 400, 150, -1, 2800);
  drawEar(ctx, 550, 150, 1, 2801);
  fillShape(ctx, (path) => ellipsePath(path, 476, 146, 66, 74, -0.08), { x: 400, y: 64, w: 152, h: 166 }, PAPER, null, 2810, {
    strokeWidth: 5.2,
  });
  drawFace(ctx, detailP);
  drawForeheadCurls(ctx, detailP);
}

function drawHairCloud(ctx, detailP) {
  fillShape(
    ctx,
    (path) => {
      path.moveTo(382, 132);
      path.quadraticCurveTo(372, 92, 410, 76);
      path.quadraticCurveTo(426, 42, 462, 58);
      path.quadraticCurveTo(500, 28, 528, 64);
      path.quadraticCurveTo(574, 70, 568, 116);
      path.quadraticCurveTo(598, 152, 562, 184);
      path.quadraticCurveTo(548, 232, 492, 222);
      path.quadraticCurveTo(446, 246, 412, 212);
      path.quadraticCurveTo(370, 202, 382, 132);
      path.closePath();
    },
    { x: 360, y: 34, w: 242, h: 210 },
    PAPER,
    null,
    2900,
    { strokeWidth: 5.6 },
  );
  if (detailP > 0.01) {
    const curls = [
      [[420, 88], [444, 56], [468, 86], [438, 106]],
      [[464, 74], [492, 38], [520, 78], [488, 104]],
      [[512, 88], [552, 70], [548, 124], [514, 118]],
      [[430, 180], [404, 164], [418, 132], [446, 144]],
      [[520, 180], [554, 166], [548, 132], [518, 144]],
    ];
    curls.forEach((points, index) => drawInkLine(ctx, points, detailP, 2910 + index, 2.9, 0.76));
  }
}

function drawEar(ctx, x, y, side, seed) {
  fillShape(ctx, (path) => ellipsePath(path, x, y, 16, 21, side * 0.05), { x: x - 18, y: y - 24, w: 36, h: 48 }, PAPER, null, seed, {
    strokeWidth: 3.8,
  });
  drawInkLine(ctx, [[x - side * 4, y - 3], [x + side * 5, y - 8], [x + side * 3, y + 10]], 1, seed + 1, 1.1, 0.58);
}

function drawFace(ctx, detailP) {
  if (detailP <= 0.01) return;
  ctx.save();
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineWidth = 3.1;
  ctx.globalAlpha = detailP;
  dot(ctx, 452, 142, 4.8, 6.6);
  dot(ctx, 501, 142, 4.8, 6.6);
  ctx.beginPath();
  ctx.moveTo(476, 150);
  ctx.quadraticCurveTo(486, 160, 474, 166);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(456, 190);
  ctx.quadraticCurveTo(478, 206, 504, 186);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(446, 126, 16, Math.PI * 1.05, Math.PI * 1.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(506, 124, 16, Math.PI * 1.15, Math.PI * 1.95);
  ctx.stroke();
  for (let index = 0; index < 8; index += 1) dot(ctx, 430 + (index % 4) * 11, 162 + Math.floor(index / 4) * 13, 1.6, 2.1);
  for (let index = 0; index < 8; index += 1) dot(ctx, 504 + (index % 4) * 11, 160 + Math.floor(index / 4) * 13, 1.6, 2.1);
  ctx.restore();
}

function drawForeheadCurls(ctx, detailP) {
  if (detailP <= 0.01) return;
  [
    [[436, 92], [450, 72], [470, 92], [452, 112]],
    [[474, 88], [492, 64], [514, 92], [492, 118]],
    [[424, 118], [410, 142], [432, 158], [452, 136]],
  ].forEach((points, index) => drawInkLine(ctx, points, detailP, 3000 + index, 2.8, 0.9));
}

function drawToolsAndFinishingMarks(ctx, detailP, frame) {
  if (detailP <= 0.02) return;
  drawInkLine(ctx, [[340, 526], [382, 538], [430, 532]], detailP, 3100, 4.2, 0.86);
  drawInkLine(ctx, [[648, 504], [684, 500], [706, 456]], detailP, 3101, 4.2, 0.86);
  drawMaterialHatch(ctx, { x: 138, y: 548, w: 708, h: 44 }, "charcoal", 24, { color: INK, alpha: 0.06 * detailP, seed: 3120, angle: Math.sin(frame * 0.04) * 0.02 });
}

function fillShape(ctx, path, bounds, fill, material, seed, options = {}) {
  fillConstructedShape(ctx, path, bounds, {
    fill,
    material,
    seed,
    style: STYLE,
    patternAlpha: options.patternAlpha,
    scumble: options.scumble,
    hatchCount: options.hatchCount,
    strokeWidth: options.strokeWidth ?? 4,
    strokeColor: options.strokeColor || INK,
    shadow: options.shadow,
  });
}

function drawWhiteStroke(ctx, points, width, seed) {
  ctx.save();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  strokeCurve(ctx, points);
  ctx.restore();
  drawInkLine(ctx, points, 1, seed, 3.2, 0.9);
}

function drawBlackStroke(ctx, points, width, seed) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  strokeCurve(ctx, points);
  ctx.restore();
  drawMaterialBrushStroke(ctx, points, "charcoal", { color: INK, alpha: 0.72, seed, tool: { size: width * 0.36 } });
  drawInkLine(ctx, points, 1, seed + 1, 4.8, 0.98);
}

function drawInkLine(ctx, points, progress, seed, size = 2.2, alpha = 0.8) {
  drawProgressiveContour(ctx, points, progress, STYLE, {
    color: INK,
    alpha,
    size,
    seed,
    tool: "doodle-ink",
  });
}

function drawClippedStripes(ctx, path, bounds, angle, spacing, seed, progress) {
  if (progress <= 0.01) return;
  ctx.save();
  ctx.beginPath();
  path(ctx);
  ctx.clip();
  const random = seededRandom(seed);
  for (let x = bounds.x - bounds.h; x < bounds.x + bounds.w + bounds.h; x += spacing) {
    const local = clamp((progress - (x - bounds.x) / (bounds.w + bounds.h) * 0.28) / 0.72);
    if (local <= 0.01) continue;
    const cx = x + random() * 2.5;
    drawInkLine(
      ctx,
      [
        [cx, bounds.y - 12],
        [cx + Math.cos(angle) * bounds.h * 0.42, bounds.y + bounds.h * 0.5],
        [cx + Math.cos(angle) * bounds.h * 0.78, bounds.y + bounds.h + 14],
      ],
      local,
      seed + Math.round(x * 3),
      2.15,
      0.82,
    );
  }
  ctx.restore();
}

function drawButton(ctx, x, y, r, seed) {
  fillShape(ctx, (path) => ellipsePath(path, x, y, r, r, 0), { x: x - r - 3, y: y - r - 3, w: r * 2 + 6, h: r * 2 + 6 }, INK, "charcoal", seed, {
    strokeWidth: 0,
    patternAlpha: 0.32,
  });
}

function drawScissors(ctx, x, y, progress) {
  if (progress <= 0.01) return;
  fillShape(ctx, (path) => ellipsePath(path, x - 20, y + 10, 14, 10, -0.5), { x: x - 38, y: y - 6, w: 36, h: 32 }, YELLOW, "colored-pencil", 3200, {
    strokeWidth: 3,
    patternAlpha: 0.42,
  });
  fillShape(ctx, (path) => ellipsePath(path, x + 8, y + 4, 14, 10, 0.4), { x: x - 8, y: y - 10, w: 36, h: 32 }, YELLOW, "colored-pencil", 3201, {
    strokeWidth: 3,
    patternAlpha: 0.42,
  });
  drawInkLine(ctx, [[x - 8, y + 8], [x + 38, y - 40]], progress, 3202, 2.6, 0.9);
  drawInkLine(ctx, [[x - 4, y + 10], [x + 48, y + 32]], progress, 3203, 2.6, 0.9);
}

function drawPencil(ctx, x, y, angle, progress) {
  if (progress <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  fillShape(ctx, (path) => roundedRectPath(path, -7, -38, 14, 62, 4), { x: -10, y: -42, w: 20, h: 70 }, YELLOW, "colored-pencil", 3300, {
    strokeWidth: 2.6,
    patternAlpha: 0.45,
  });
  fillShape(
    ctx,
    (path) => {
      path.moveTo(-7, -38);
      path.lineTo(0, -54);
      path.lineTo(7, -38);
      path.closePath();
    },
    { x: -9, y: -56, w: 18, h: 20 },
    PAPER,
    null,
    3301,
    { strokeWidth: 2.4 },
  );
  ctx.restore();
}

function drawLegOpenings(ctx, progress) {
  drawInkLine(ctx, [[340, 526], [382, 538], [430, 532]], progress, 3400, 4.2, 0.9);
  drawInkLine(ctx, [[648, 504], [684, 500], [706, 456]], progress, 3401, 4.2, 0.9);
}

function drawShoe(ctx, x, y, w, h, angle, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  fillShape(
    ctx,
    (path) => {
      path.moveTo(-w * 0.45, h * 0.05);
      path.quadraticCurveTo(-w * 0.3, -h * 0.55, w * 0.28, -h * 0.35);
      path.quadraticCurveTo(w * 0.52, -h * 0.08, w * 0.4, h * 0.28);
      path.quadraticCurveTo(0, h * 0.52, -w * 0.44, h * 0.28);
      path.closePath();
    },
    { x: -w * 0.5, y: -h * 0.65, w, h: h * 1.25 },
    PAPER,
    null,
    seed,
    { strokeWidth: 5.2 },
  );
  drawMaterialBrushStroke(ctx, [[-w * 0.42, h * 0.22], [w * 0.3, h * 0.2]], "doodle-ink", { color: INK, alpha: 0.94, seed: seed + 1, tool: { size: 8 } });
  drawInkLine(ctx, [[-w * 0.12, -h * 0.24], [-w * 0.02, -h * 0.03], [w * 0.1, -h * 0.24]], 1, seed + 2, 1.5, 0.8);
  ctx.restore();
}

function drawSockStripes(ctx, x, y, angle, progress, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  for (let index = 0; index < 3; index += 1) {
    drawInkLine(ctx, [[-13, index * 11], [13, index * 8 - 2]], progress, seed + index, 1.8, 0.7);
  }
  ctx.restore();
}

function dot(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function strokeCurve(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    ctx.quadraticCurveTo(previous[0], previous[1], (previous[0] + point[0]) / 2, (previous[1] + point[1]) / 2);
  }
  ctx.stroke();
}

function reveal(value, start, end) {
  if (end <= start) return value >= end ? 1 : 0;
  return smoothstep((value - start) / (end - start));
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
