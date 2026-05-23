import {
  drawInkDoodleHand,
  drawPaperScene,
  drawProgressiveContour,
  ellipsePath,
  fillConstructedShape,
  roundedRectPath,
  resolveIllustrationStyle,
  seededRandom,
  smoothstep,
} from "../../src/illustration-tools.js";
import {
  drawMaterialBrushStroke,
  drawMaterialHatch,
} from "../../src/material-tools.js";
import { buildDoodleToolBrief } from "../../src/doodle-style-tools.js";

export const project = {
  width: 960,
  height: 620,
  fps: 12,
  totalFrames: 72,
};

export const doodleToolBrief = buildDoodleToolBrief("doodle-wall-studio", {
  styleChecks: [
    "Research scene must read through woman, open book, laptop search page, desk books, and loose wall notes.",
    "Keep the Google search page hand-drawn and sparse, not like a polished browser screenshot.",
  ],
});

const STYLE = resolveIllustrationStyle("black-ink-doodle");
const INK = STYLE.ink;
const PAPER = STYLE.paper;
const PINK = "#efc9f2";
const YELLOW = "#f0c847";
const BLUE = "#6ea6e8";
const GREEN = "#70b66a";
const RED = "#de6057";

export function drawFrame(ctx, frame) {
  const safeFrame = clamp(Math.round(frame), 0, project.totalFrames - 1);
  const t = safeFrame / (project.totalFrames - 1);
  const wallP = reveal(t, 0.03, 0.18);
  const deskP = reveal(t, 0.05, 0.2);
  const bookP = reveal(t, 0.1, 0.28);
  const bodyP = reveal(t, 0.08, 0.32);
  const writingP = reveal(t, 0.18, 0.42);
  const computerP = reveal(t, 0.38, 0.68);
  const researchP = reveal(t, 0.62, 1);
  const detailP = Math.max(writingP * 0.9, computerP * 0.9, researchP);
  const settleP = reveal(t, 0.76, 1);
  const breathe = Math.sin(safeFrame * 0.18) * 1.8 * settleP;
  const eyeShift = (-1.2 * writingP - 2.4 * computerP + 1.6 * researchP + Math.sin(safeFrame * 0.12) * 0.9) * Math.max(bodyP, settleP);
  const sparkleP = Math.max(reveal(t, 0.48, 0.68), reveal(t, 0.72, 1));

  ctx.save();
  ctx.clearRect(0, 0, project.width, project.height);
  drawPaperScene(ctx, { x: 0, y: 0, w: project.width, h: project.height }, STYLE, {
    seed: 18420,
    light: "#ffffff",
    shadow: "#fafafa",
    gradientAlpha: 0.1,
    grainAlpha: 0.004,
    grainThreshold: 0.45,
  });

  drawWallNotes(ctx, wallP);
  drawResearchDesk(ctx, deskP);
  drawLaptopSearch(ctx, computerP, computerP, sparkleP);
  drawBookStacks(ctx, bookP, Math.max(writingP, researchP));
  drawResearchFlow(ctx, researchP, safeFrame);
  drawThoughtCloud(ctx, researchP, safeFrame);
  ctx.translate(0, breathe);
  drawWomanBody(ctx, bodyP);
  drawWomanHead(ctx, bodyP, detailP, eyeShift);
  drawOpenBook(ctx, Math.max(bookP, writingP), Math.max(writingP, researchP), writingP);
  drawResearchArmsAndHands(ctx, bodyP, writingP, computerP, researchP, t, safeFrame);
  drawSmallDeskDetails(ctx, Math.max(writingP, researchP), sparkleP, safeFrame);
  ctx.restore();
}

export function inspectImportantBounds() {
  return [
    { id: "researcher-head-and-hair", x: 380, y: 70, width: 225, height: 210 },
    { id: "organic-reading-hands", x: 310, y: 344, width: 320, height: 130 },
    { id: "google-search-laptop", x: 78, y: 224, width: 310, height: 210 },
    { id: "open-research-book", x: 384, y: 414, width: 280, height: 138 },
    { id: "book-stack-and-notes", x: 620, y: 168, width: 260, height: 330 },
    { id: "thinking-concept-cloud", x: 585, y: 24, width: 300, height: 178 },
  ];
}

function drawWallNotes(ctx, progress) {
  const notes = [
    { x: 70, y: 44, w: 154, h: 112, r: -0.06, seed: 10, type: "chart" },
    { x: 266, y: 36, w: 104, h: 76, r: 0.03, seed: 20, type: "lines" },
    { x: 744, y: 194, w: 94, h: 70, r: -0.05, seed: 40, type: "note" },
    { x: 92, y: 188, w: 132, h: 92, r: 0.04, seed: 50, type: "book" },
  ];

  notes.forEach((note, index) => {
    const local = clamp((progress - index * 0.08) / 0.44);
    if (local <= 0.01) return;
    drawPinnedNote(ctx, note, local);
  });
}

function drawPinnedNote(ctx, note, progress) {
  ctx.save();
  ctx.translate(note.x + note.w / 2, note.y + note.h / 2);
  ctx.rotate(note.r);
  ctx.translate(-note.w / 2, -note.h / 2);

  fillShape(ctx, (path) => roundedRectPath(path, 0, 0, note.w, note.h, 3), { x: -2, y: -2, w: note.w + 4, h: note.h + 4 }, PAPER, null, note.seed, {
    strokeWidth: 2.2,
    strokeAlpha: 0.74,
    baseAlpha: progress,
  });

  const p = clamp((progress - 0.22) / 0.76);
  if (p > 0) {
    if (note.type === "chart") {
      drawInkLine(ctx, [[18, 82], [52, 48], [90, 74], [132, 34]], p, note.seed + 1, 1.5, 0.38);
      for (let i = 0; i < 4; i += 1) drawInkLine(ctx, [[18, 24 + i * 13], [68 + i * 8, 23 + i * 11]], p, note.seed + 5 + i, 1.1, 0.3);
    } else if (note.type === "search") {
      drawInkLine(ctx, [[22, 26], [150, 26]], p, note.seed + 1, 1.6, 0.35);
      drawInkLine(ctx, [[22, 50], [118, 50]], p, note.seed + 2, 1.2, 0.3);
      drawInkLine(ctx, [[22, 70], [144, 70]], p, note.seed + 3, 1.2, 0.3);
      drawColoredDot(ctx, 28, 26, 4, BLUE, p);
    } else if (note.type === "book") {
      drawInkLine(ctx, [[24, 22], [48, 68], [72, 22]], p, note.seed + 1, 1.7, 0.36);
      drawInkLine(ctx, [[82, 26], [112, 26]], p, note.seed + 2, 1.1, 0.3);
      drawInkLine(ctx, [[84, 42], [118, 42]], p, note.seed + 3, 1.1, 0.3);
    } else {
      for (let i = 0; i < 5; i += 1) drawInkLine(ctx, [[16, 16 + i * 10], [note.w - 18 - i * 7, 16 + i * 10]], p, note.seed + i, 1.1, 0.32);
    }
  }
  ctx.restore();
}

function drawResearchDesk(ctx, progress) {
  if (progress <= 0.01) return;
  fillShape(
    ctx,
    (path) => {
      path.moveTo(76, 410);
      path.quadraticCurveTo(320, 392, 548, 408);
      path.quadraticCurveTo(730, 396, 884, 404);
      path.lineTo(902, 470);
      path.quadraticCurveTo(506, 492, 66, 468);
      path.closePath();
    },
    { x: 60, y: 390, w: 850, h: 100 },
    PAPER,
    null,
    900,
    { strokeWidth: 4.4, strokeAlpha: 0.95, baseAlpha: progress },
  );
  drawInkLine(ctx, [[78, 412], [286, 402], [548, 410], [884, 404]], progress, 902, 4.3, 0.92);
  drawMaterialHatch(ctx, { x: 78, y: 468, w: 796, h: 44 }, "charcoal", 22, {
    color: INK,
    alpha: 0.035 * progress,
    seed: 904,
    angle: -0.02,
  });
}

function drawLaptopSearch(ctx, progress, detailP, sparkleP) {
  if (progress <= 0.01) return;
  const screenP = clamp(progress / 0.72);
  const details = clamp((detailP - 0.08) / 0.72);

  fillShape(ctx, (path) => roundedRectPath(path, 104, 238, 280, 172, 10), { x: 96, y: 230, w: 296, h: 188 }, PAPER, null, 1000, {
    strokeWidth: 4.6,
    strokeAlpha: 0.95,
    baseAlpha: screenP,
  });
  drawInkLine(ctx, [[114, 410], [386, 410], [430, 440], [82, 438], [114, 410]], screenP, 1001, 3.7, 0.88);
  drawMaterialBrushStroke(ctx, [[92, 438], [424, 440]], "charcoal", { color: INK, alpha: 0.4 * screenP, seed: 1002, tool: { size: 9 } });

  if (details > 0.02) {
    drawGoogleWord(ctx, 176, 288, details);
    fillShape(ctx, (path) => roundedRectPath(path, 138, 312, 214, 26, 13), { x: 136, y: 310, w: 218, h: 30 }, PAPER, null, 1010, {
      strokeWidth: 2.2,
      strokeAlpha: 0.78 * details,
      baseAlpha: details,
    });
    drawSearchIcon(ctx, 156, 325, details);
    drawTypedQuery(ctx, "hand drawn research", 182, 330, details);
    drawResultLine(ctx, 134, 356, 178, BLUE, details, 1020);
    drawResultLine(ctx, 134, 374, 214, INK, details, 1021);
    drawResultLine(ctx, 134, 392, 154, INK, details, 1022);
    drawColoredDot(ctx, 342, 282, 5, YELLOW, sparkleP);
    drawSparkTicks(ctx, 350, 278, sparkleP, 1030);
  }
}

function drawBookStacks(ctx, progress, detailP) {
  if (progress <= 0.01) return;
  const books = [
    { x: 690, y: 354, w: 164, h: 34, c: PAPER, seed: 1110 },
    { x: 668, y: 388, w: 188, h: 36, c: PINK, seed: 1120 },
    { x: 704, y: 424, w: 148, h: 32, c: YELLOW, seed: 1130 },
    { x: 660, y: 456, w: 204, h: 34, c: PAPER, seed: 1140 },
  ];
  books.forEach((book, index) => {
    const local = clamp((progress - index * 0.1) / 0.58);
    if (local <= 0.01) return;
    fillShape(ctx, (path) => roundedRectPath(path, book.x, book.y, book.w, book.h, 5), { x: book.x - 3, y: book.y - 3, w: book.w + 6, h: book.h + 6 }, book.c, book.c === PAPER ? null : "marker", book.seed, {
      strokeWidth: 3.4,
      baseAlpha: local,
      patternAlpha: 0.22,
      scumble: 2,
    });
    drawInkLine(ctx, [[book.x + 16, book.y + book.h * 0.5], [book.x + book.w - 18, book.y + book.h * 0.5]], local, book.seed + 1, 1.2, 0.32);
  });

  if (detailP > 0.04) {
    drawMug(ctx, 774, 318, detailP);
    drawLoosePaper(ctx, 626, 326, -0.08, detailP, 1160);
    drawLoosePaper(ctx, 820, 294, 0.1, detailP, 1170);
  }
}

function drawResearchFlow(ctx, progress, frame) {
  if (progress <= 0.01) return;
  const local = clamp((progress - 0.12) / 0.8);
  const pulse = 0.45 + Math.sin(frame * 0.18) * 0.18;
  const trails = [
    {
      points: [[522, 424], [466, 366], [356, 338], [248, 326]],
      seed: 1210,
      color: BLUE,
      count: 7,
    },
    {
      points: [[354, 306], [454, 230], [598, 180], [684, 126]],
      seed: 1220,
      color: YELLOW,
      count: 8,
    },
  ];

  trails.forEach((trail, trailIndex) => {
    for (let i = 0; i < trail.count; i += 1) {
      const step = i / Math.max(1, trail.count - 1);
      const visible = clamp((local - step * 0.12) / 0.42);
      if (visible <= 0.01) continue;
      const point = quadraticTrailPoint(trail.points, step);
      const active = Math.max(0, 1 - Math.abs(((frame * 0.025 + trailIndex * 0.35) % 1) - step) * 5);
      drawIdeaDot(ctx, point.x, point.y, 3.2 + active * 2.1, trail.color, visible * (0.46 + pulse * active), trail.seed + i);
    }
  });

  drawInkLine(ctx, [[454, 398], [424, 374], [392, 352]], local, 1235, 1.4, 0.24);
  drawSparkTicks(ctx, 408, 356, local, 1238);
}

function drawThoughtCloud(ctx, progress, frame) {
  if (progress <= 0.01) return;
  const local = clamp((progress - 0.08) / 0.86);
  const iconP = clamp((progress - 0.28) / 0.68);
  const pulse = Math.sin(frame * 0.16) * 2.5;

  fillShape(
    ctx,
    (path) => {
      path.moveTo(626, 118);
      path.quadraticCurveTo(596, 112, 600, 84);
      path.quadraticCurveTo(604, 52, 640, 58);
      path.quadraticCurveTo(658, 26, 698, 42);
      path.quadraticCurveTo(728, 16, 762, 48);
      path.quadraticCurveTo(816, 42, 820, 86);
      path.quadraticCurveTo(858, 102, 832, 134);
      path.quadraticCurveTo(808, 164, 768, 150);
      path.quadraticCurveTo(734, 178, 696, 154);
      path.quadraticCurveTo(650, 164, 626, 118);
      path.closePath();
    },
    { x: 590, y: 22, w: 270, h: 152 },
    PAPER,
    null,
    1240,
    { strokeWidth: 3.4, strokeAlpha: 0.88, baseAlpha: local },
  );

  drawThoughtDot(ctx, 612, 150, 9, local, 1241);
  drawThoughtDot(ctx, 588, 178, 6.5, local, 1242);
  drawThoughtDot(ctx, 566, 202, 4.8, local, 1243);

  if (iconP <= 0.01) return;
  drawBookIcon(ctx, 640, 100 + pulse * 0.18, iconP);
  drawMagnifierIcon(ctx, 704, 92 - pulse * 0.12, iconP);
  drawQuestionIcon(ctx, 754, 104 + pulse * 0.1, iconP);
  drawLightbulbIcon(ctx, 796, 94 - pulse * 0.22, iconP);
  drawSparkTicks(ctx, 798, 56 + pulse * 0.2, iconP, 1260);
}

function drawWomanBody(ctx, progress) {
  if (progress <= 0.01) return;
  fillShape(
    ctx,
    (path) => {
      path.moveTo(386, 274);
      path.quadraticCurveTo(474, 236, 580, 276);
      path.quadraticCurveTo(620, 340, 594, 430);
      path.quadraticCurveTo(496, 464, 390, 424);
      path.quadraticCurveTo(350, 338, 386, 274);
      path.closePath();
    },
    { x: 350, y: 238, w: 270, h: 230 },
    INK,
    "charcoal",
    1300,
    { strokeWidth: 5, baseAlpha: progress, patternAlpha: 0.68, scumble: 20 },
  );
  drawClippedCheck(ctx, (path) => {
    path.moveTo(408, 286);
    path.quadraticCurveTo(484, 260, 562, 288);
    path.quadraticCurveTo(582, 344, 568, 404);
    path.quadraticCurveTo(498, 424, 420, 400);
    path.quadraticCurveTo(392, 340, 408, 286);
    path.closePath();
  }, { x: 392, y: 272, w: 190, h: 144 }, progress, 1308);
}

function drawWomanHead(ctx, progress, detailP, eyeShift) {
  if (progress <= 0.08) return;
  const local = clamp((progress - 0.08) / 0.86);

  fillShape(ctx, (path) => roundedRectPath(path, 456, 240, 54, 64, 18), { x: 450, y: 232, w: 66, h: 78 }, PAPER, null, 1400, {
    strokeWidth: 3.4,
    baseAlpha: local,
  });
  drawHairMass(ctx, local);
  drawEar(ctx, 420, 172, -1, local, 1420);
  drawEar(ctx, 566, 174, 1, local, 1421);
  fillShape(ctx, (path) => ellipsePath(path, 494, 172, 66, 76, -0.06), { x: 416, y: 88, w: 156, h: 170 }, PAPER, null, 1430, {
    strokeWidth: 5.4,
    baseAlpha: local,
  });
  drawHairStrands(ctx, detailP);
  drawFace(ctx, detailP, eyeShift);
}

function drawHairMass(ctx, progress) {
  fillShape(
    ctx,
    (path) => {
      path.moveTo(414, 156);
      path.quadraticCurveTo(392, 98, 442, 70);
      path.quadraticCurveTo(492, 34, 554, 74);
      path.quadraticCurveTo(608, 112, 584, 190);
      path.quadraticCurveTo(570, 258, 510, 250);
      path.quadraticCurveTo(438, 256, 414, 156);
      path.closePath();
    },
    { x: 386, y: 48, w: 224, h: 218 },
    INK,
    "charcoal",
    1500,
    { strokeWidth: 5.4, baseAlpha: progress, patternAlpha: 0.64, scumble: 24 },
  );
}

function drawHairStrands(ctx, progress) {
  if (progress <= 0.02) return;
  const strands = [
    [[440, 96], [454, 132], [426, 174]],
    [[468, 80], [476, 130], [458, 196]],
    [[504, 74], [498, 138], [518, 206]],
    [[538, 88], [552, 138], [548, 202]],
    [[420, 148], [404, 200], [430, 242]],
    [[574, 150], [590, 206], [552, 244]],
  ];
  strands.forEach((points, index) => drawInkLine(ctx, points, progress, 1510 + index, 2.4, 0.82));
}

function drawEar(ctx, x, y, side, progress, seed) {
  fillShape(ctx, (path) => ellipsePath(path, x, y, 15, 21, side * 0.07), { x: x - 19, y: y - 24, w: 38, h: 48 }, PAPER, null, seed, {
    strokeWidth: 3.2,
    baseAlpha: progress,
  });
  drawInkLine(ctx, [[x - side * 5, y - 5], [x + side * 5, y - 9], [x + side * 2, y + 10]], progress, seed + 1, 1.1, 0.54);
}

function drawFace(ctx, progress, eyeShift) {
  if (progress <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = progress;
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  dot(ctx, 470 + eyeShift, 168, 4.6, 6);
  dot(ctx, 520 + eyeShift, 168, 4.6, 6);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(494, 174);
  ctx.quadraticCurveTo(506, 184, 492, 191);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(474, 210);
  ctx.quadraticCurveTo(496, 226, 522, 210);
  ctx.stroke();
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(470, 166, 24, 30, -0.04, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(522, 166, 24, 30, 0.04, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(494, 166);
  ctx.lineTo(498, 166);
  ctx.stroke();
  for (let i = 0; i < 10; i += 1) dot(ctx, 454 + (i % 5) * 10, 188 + Math.floor(i / 5) * 12, 1.6, 2);
  for (let i = 0; i < 10; i += 1) dot(ctx, 512 + (i % 5) * 10, 188 + Math.floor(i / 5) * 12, 1.6, 2);
  ctx.restore();
}

function drawResearchArmsAndHands(ctx, bodyP, writingP, computerP, researchP, t, frame) {
  if (bodyP <= 0.18) return;
  const local = clamp((bodyP - 0.18) / 0.78);
  const toComputer = reveal(t, 0.34, 0.54);
  const backToBook = reveal(t, 0.58, 0.76);
  const writingHand = { x: 600, y: 462 };
  const computerHand = { x: 326, y: 394 };
  const researchHand = { x: 588, y: 430 };
  const rightFirst = mixPoint(writingHand, computerHand, toComputer);
  const rightHand = mixPoint(rightFirst, researchHand, backToBook);
  const handProgress = Math.max(writingP, computerP, researchP);
  const penOnPage = writingP * (1 - reveal(t, 0.38, 0.54));
  const searchAction = computerP * (1 - reveal(t, 0.62, 0.78));

  drawBlackStroke(ctx, [[392, 316], [352, 360], [330, 404]], 34, 1600, local);
  drawBlackStroke(ctx, [[590, 318], [626, 360], [rightHand.x, rightHand.y]], 34, 1610, local);
  if (handProgress > 0.02) {
    drawInkDoodleHand(ctx, { x: 330, y: 404 }, {
      variant: "open",
      style: STYLE,
      seed: 1620,
      scale: 0.56,
      angle: -0.18,
      progress: handProgress,
      outlineSize: 5,
      solidAlpha: 0.86,
    });
    drawInkDoodleHand(ctx, rightHand, {
      variant: "open",
      style: STYLE,
      seed: 1630,
      scale: 0.52,
      angle: mixNumber(0.52, -0.18, toComputer) + backToBook * 0.42,
      progress: handProgress,
      outlineSize: 4.8,
      solidAlpha: 0.84,
    });
  }

  if (penOnPage > 0.02) {
    drawActivePen(ctx, rightHand.x + 24 + Math.sin(frame * 0.22) * 6, rightHand.y + 28 + Math.sin(frame * 0.38) * 3, -0.92, penOnPage, 1640);
    drawWritingMotionTicks(ctx, rightHand.x + 48, rightHand.y + 26, penOnPage, 1648);
  }

  if (searchAction > 0.02) {
    drawTypingTicks(ctx, rightHand.x - 10, rightHand.y + 18, searchAction, 1658);
  }
}

function drawOpenBook(ctx, progress, detailP, writingP = 0) {
  if (progress <= 0.12) return;
  const local = clamp((progress - 0.12) / 0.82);
  const leftPage = (path) => {
    path.moveTo(390, 430);
    path.quadraticCurveTo(464, 400, 526, 432);
    path.lineTo(510, 540);
    path.quadraticCurveTo(448, 508, 382, 544);
    path.closePath();
  };
  const rightPage = (path) => {
    path.moveTo(526, 432);
    path.quadraticCurveTo(598, 398, 662, 432);
    path.lineTo(648, 542);
    path.quadraticCurveTo(586, 508, 510, 540);
    path.closePath();
  };

  fillShape(ctx, leftPage, { x: 374, y: 398, w: 158, h: 156 }, PAPER, null, 1700, { strokeWidth: 4.3, baseAlpha: local });
  fillShape(ctx, rightPage, { x: 506, y: 398, w: 164, h: 156 }, PAPER, null, 1710, { strokeWidth: 4.3, baseAlpha: local });
  drawInkLine(ctx, [[526, 432], [520, 486], [510, 540]], local, 1720, 2.8, 0.76);
  const textP = clamp((detailP - 0.04) / 0.7);
  for (let i = 0; i < 6; i += 1) {
    drawInkLine(ctx, [[414, 450 + i * 13], [494 - i * 5, 444 + i * 14]], textP, 1730 + i, 1.2, 0.34);
    drawInkLine(ctx, [[548, 448 + i * 13], [628 - i * 4, 448 + i * 13]], textP, 1740 + i, 1.2, 0.34);
  }
  drawWritingStrokes(ctx, writingP);
  drawColoredDot(ctx, 414, 424, 5, YELLOW, detailP);
}

function drawSmallDeskDetails(ctx, detailP, sparkleP, frame) {
  if (detailP <= 0.02) return;
  drawLoosePaper(ctx, 228, 452, 0.08, detailP, 1800);
  drawInkLine(ctx, [[255, 466], [326, 468]], detailP, 1801, 1.2, 0.34);
  drawInkLine(ctx, [[258, 484], [310, 488]], detailP, 1802, 1.2, 0.32);
  drawSparkTicks(ctx, 650, 406 + Math.sin(frame * 0.2) * 2, sparkleP, 1810);
}

function drawWritingStrokes(ctx, progress) {
  if (progress <= 0.01) return;
  const strokes = [
    [[548, 456], [580, 452], [620, 456]],
    [[548, 472], [596, 468], [634, 474]],
    [[548, 488], [584, 486], [624, 490]],
    [[548, 504], [600, 500], [640, 506]],
    [[414, 466], [448, 462], [492, 468]],
    [[414, 482], [462, 478], [500, 484]],
  ];
  strokes.forEach((points, index) => {
    const local = clamp((progress - index * 0.09) / 0.36);
    drawInkLine(ctx, points, local, 1820 + index, 1.55, 0.62);
  });
}

function drawActivePen(ctx, x, y, angle, progress, seed) {
  if (progress <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  fillShape(ctx, (path) => roundedRectPath(path, -6, -42, 12, 76, 4), { x: -9, y: -46, w: 18, h: 84 }, YELLOW, "colored-pencil", seed, {
    strokeWidth: 2.2,
    baseAlpha: progress,
    patternAlpha: 0.42,
  });
  fillShape(
    ctx,
    (path) => {
      path.moveTo(-6, -42);
      path.lineTo(0, -58);
      path.lineTo(6, -42);
      path.closePath();
    },
    { x: -8, y: -60, w: 16, h: 20 },
    PAPER,
    null,
    seed + 1,
    { strokeWidth: 2, baseAlpha: progress },
  );
  ctx.restore();
}

function drawWritingMotionTicks(ctx, x, y, progress, seed) {
  if (progress <= 0.01) return;
  [
    [[x - 12, y - 12], [x - 2, y - 18]],
    [[x + 8, y - 4], [x + 20, y - 10]],
    [[x - 6, y + 10], [x + 8, y + 14]],
  ].forEach((points, index) => drawInkLine(ctx, points, progress, seed + index, 1.2, 0.36));
}

function drawTypingTicks(ctx, x, y, progress, seed) {
  if (progress <= 0.01) return;
  drawInkLine(ctx, [[x - 34, y + 12], [x + 70, y + 10]], progress, seed, 1.25, 0.3);
  [
    [[x - 12, y - 10], [x - 3, y - 18]],
    [[x + 12, y - 12], [x + 26, y - 20]],
    [[x + 38, y - 6], [x + 52, y - 12]],
  ].forEach((points, index) => drawInkLine(ctx, points, progress, seed + index + 1, 1.3, 0.42));
  drawColoredDot(ctx, x + 78, y + 8, 3.4, BLUE, progress);
}

function drawMug(ctx, x, y, progress) {
  fillShape(ctx, (path) => roundedRectPath(path, x, y, 54, 60, 10), { x: x - 4, y: y - 4, w: 68, h: 70 }, PAPER, null, 1900, {
    strokeWidth: 3.6,
    baseAlpha: progress,
  });
  drawInkLine(ctx, [[x + 52, y + 16], [x + 78, y + 22], [x + 52, y + 42]], progress, 1902, 3.1, 0.76);
  drawInkLine(ctx, [[x + 12, y + 18], [x + 38, y + 18]], progress, 1903, 1.2, 0.35);
}

function drawLoosePaper(ctx, x, y, angle, progress, seed) {
  ctx.save();
  ctx.translate(x + 42, y + 28);
  ctx.rotate(angle);
  ctx.translate(-42, -28);
  fillShape(ctx, (path) => roundedRectPath(path, 0, 0, 84, 56, 3), { x: -2, y: -2, w: 88, h: 60 }, PAPER, null, seed, {
    strokeWidth: 2,
    baseAlpha: progress,
    strokeAlpha: 0.72,
  });
  drawInkLine(ctx, [[14, 16], [66, 16]], progress, seed + 1, 1, 0.28);
  drawInkLine(ctx, [[14, 31], [58, 31]], progress, seed + 2, 1, 0.26);
  ctx.restore();
}

function drawPencil(ctx, x, y, angle, progress) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  fillShape(ctx, (path) => roundedRectPath(path, -7, -40, 14, 72, 4), { x: -10, y: -44, w: 20, h: 80 }, YELLOW, "colored-pencil", 2000, {
    strokeWidth: 2.4,
    baseAlpha: progress,
    patternAlpha: 0.42,
  });
  fillShape(
    ctx,
    (path) => {
      path.moveTo(-7, -40);
      path.lineTo(0, -56);
      path.lineTo(7, -40);
      path.closePath();
    },
    { x: -9, y: -58, w: 18, h: 20 },
    PAPER,
    null,
    2001,
    { strokeWidth: 2.2, baseAlpha: progress },
  );
  ctx.restore();
}

function drawGoogleWord(ctx, x, y, progress) {
  const letters = [
    ["G", BLUE],
    ["o", RED],
    ["o", YELLOW],
    ["g", BLUE],
    ["l", GREEN],
    ["e", RED],
  ];
  ctx.save();
  ctx.globalAlpha = progress;
  ctx.font = "700 27px Arial, sans-serif";
  ctx.textBaseline = "alphabetic";
  let cursor = x;
  letters.forEach(([letter, color], index) => {
    if (progress < index / letters.length) return;
    ctx.fillStyle = color;
    ctx.fillText(letter, cursor, y + Math.sin(index) * 1.2);
    cursor += ctx.measureText(letter).width + 1;
  });
  ctx.restore();
}

function drawTypedQuery(ctx, text, x, y, progress) {
  const count = Math.floor(text.length * clamp(progress));
  ctx.save();
  ctx.globalAlpha = progress;
  ctx.fillStyle = INK;
  ctx.font = "12px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(text.slice(0, count), x, y);
  ctx.restore();
}

function drawSearchIcon(ctx, x, y, progress) {
  ctx.save();
  ctx.globalAlpha = progress * 0.75;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(x, y - 2, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 2);
  ctx.lineTo(x + 10, y + 8);
  ctx.stroke();
  ctx.restore();
}

function drawBookIcon(ctx, x, y, progress) {
  ctx.save();
  ctx.globalAlpha = progress;
  fillShape(
    ctx,
    (path) => {
      path.moveTo(x - 28, y - 14);
      path.quadraticCurveTo(x - 8, y - 24, x, y - 10);
      path.quadraticCurveTo(x + 18, y - 24, x + 34, y - 12);
      path.lineTo(x + 28, y + 22);
      path.quadraticCurveTo(x + 10, y + 12, x, y + 24);
      path.quadraticCurveTo(x - 14, y + 10, x - 34, y + 22);
      path.closePath();
    },
    { x: x - 38, y: y - 28, w: 76, h: 58 },
    PAPER,
    null,
    2100,
    { strokeWidth: 2.2, baseAlpha: progress, strokeAlpha: 0.82 },
  );
  drawInkLine(ctx, [[x, y - 10], [x, y + 24]], progress, 2101, 1.4, 0.48);
  drawInkLine(ctx, [[x - 22, y], [x - 8, y + 2]], progress, 2102, 1.1, 0.34);
  drawInkLine(ctx, [[x + 10, y + 2], [x + 25, y + 1]], progress, 2103, 1.1, 0.34);
  ctx.restore();
}

function drawMagnifierIcon(ctx, x, y, progress) {
  ctx.save();
  ctx.globalAlpha = progress;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.ellipse(x, y, 18, 18, -0.12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 14);
  ctx.lineTo(x + 34, y + 34);
  ctx.stroke();
  drawColoredDot(ctx, x - 4, y - 2, 3.2, BLUE, progress);
  ctx.restore();
}

function drawQuestionIcon(ctx, x, y, progress) {
  ctx.save();
  ctx.globalAlpha = progress;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = 4.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 10);
  ctx.quadraticCurveTo(x, y - 30, x + 16, y - 12);
  ctx.quadraticCurveTo(x + 24, y + 2, x + 4, y + 12);
  ctx.quadraticCurveTo(x - 2, y + 16, x - 2, y + 24);
  ctx.stroke();
  dot(ctx, x - 2, y + 38, 3.7, 4.2);
  ctx.restore();
}

function drawLightbulbIcon(ctx, x, y, progress) {
  ctx.save();
  ctx.globalAlpha = progress;
  fillShape(ctx, (path) => ellipsePath(path, x, y - 6, 18, 23, -0.05), { x: x - 22, y: y - 34, w: 44, h: 52 }, YELLOW, "colored-pencil", 2130, {
    strokeWidth: 2.5,
    baseAlpha: progress,
    patternAlpha: 0.38,
  });
  drawInkLine(ctx, [[x - 9, y + 16], [x + 9, y + 16]], progress, 2131, 2.1, 0.74);
  drawInkLine(ctx, [[x - 7, y + 24], [x + 7, y + 24]], progress, 2132, 2.1, 0.74);
  drawInkLine(ctx, [[x - 6, y - 6], [x, y + 6], [x + 7, y - 6]], progress, 2133, 1.2, 0.34);
  ctx.restore();
}

function drawResultLine(ctx, x, y, width, color, progress, seed) {
  drawInkLine(ctx, [[x, y], [x + width, y + seededJitter(seed) * 3]], progress, seed, color === INK ? 1.2 : 1.6, color === INK ? 0.34 : 0.56, color);
}

function drawSparkTicks(ctx, x, y, progress, seed) {
  if (progress <= 0.01) return;
  const ticks = [
    [[x - 18, y], [x - 6, y - 2]],
    [[x + 10, y - 14], [x + 18, y - 24]],
    [[x + 14, y + 12], [x + 26, y + 18]],
  ];
  ticks.forEach((points, index) => drawInkLine(ctx, points, progress, seed + index, 1.7, 0.46));
}

function drawClippedCheck(ctx, path, bounds, progress, seed) {
  if (progress <= 0.01) return;
  ctx.save();
  ctx.beginPath();
  path(ctx);
  ctx.clip();
  for (let x = bounds.x - 20; x < bounds.x + bounds.w + 20; x += 18) {
    drawInkLine(ctx, [[x, bounds.y - 8], [x + 18, bounds.y + bounds.h + 10]], progress, seed + Math.round(x), 1.2, 0.28);
  }
  for (let y = bounds.y + 8; y < bounds.y + bounds.h; y += 18) {
    drawInkLine(ctx, [[bounds.x - 8, y], [bounds.x + bounds.w + 12, y + 7]], progress, seed + Math.round(y) + 500, 1.2, 0.25);
  }
  ctx.restore();
}

function drawBlackStroke(ctx, points, width, seed, progress = 1) {
  if (progress <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = progress;
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  strokeCurve(ctx, points);
  ctx.restore();
  drawMaterialBrushStroke(ctx, points, "charcoal", { color: INK, alpha: 0.62 * progress, seed, tool: { size: width * 0.34 } });
  drawInkLine(ctx, points, progress, seed + 1, 4.3, 0.94);
}

function fillShape(ctx, path, bounds, fill, material, seed, options = {}) {
  fillConstructedShape(ctx, path, bounds, {
    fill,
    material,
    seed,
    style: STYLE,
    baseAlpha: options.baseAlpha,
    patternAlpha: options.patternAlpha,
    scumble: options.scumble,
    hatchCount: options.hatchCount,
    strokeWidth: options.strokeWidth ?? 4,
    strokeAlpha: options.strokeAlpha,
    strokeColor: options.strokeColor || INK,
    shadow: options.shadow,
  });
}

function drawInkLine(ctx, points, progress, seed, size = 2.2, alpha = 0.8, color = INK) {
  drawProgressiveContour(ctx, points, progress, STYLE, {
    color,
    alpha,
    size,
    seed,
    tool: "doodle-ink",
  });
}

function drawColoredDot(ctx, x, y, r, color, progress) {
  if (progress <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = progress;
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.9, 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawIdeaDot(ctx, x, y, r, color, progress, seed) {
  if (progress <= 0.01) return;
  const jitter = seededJitter(seed) * 0.9;
  ctx.save();
  ctx.globalAlpha = progress;
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x + jitter, y - jitter, r, r * 0.82, jitter * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawThoughtDot(ctx, x, y, r, progress, seed) {
  drawIdeaDot(ctx, x, y, r, PAPER, progress, seed);
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

function seededJitter(seed) {
  return seededRandom(seed)() * 2 - 1;
}

function quadraticTrailPoint(points, t) {
  const clamped = clamp(t);
  if (points.length < 4) {
    const start = points[0];
    const end = points[points.length - 1];
    return {
      x: start[0] + (end[0] - start[0]) * clamped,
      y: start[1] + (end[1] - start[1]) * clamped,
    };
  }
  const [a, b, c, d] = points;
  const segment = clamped < 0.5 ? clamped * 2 : (clamped - 0.5) * 2;
  const p0 = clamped < 0.5 ? a : b;
  const p1 = clamped < 0.5 ? b : c;
  const p2 = clamped < 0.5 ? c : d;
  const inv = 1 - segment;
  return {
    x: inv * inv * p0[0] + 2 * inv * segment * p1[0] + segment * segment * p2[0],
    y: inv * inv * p0[1] + 2 * inv * segment * p1[1] + segment * segment * p2[1],
  };
}

function mixNumber(a, b, t) {
  return a + (b - a) * clamp(t);
}

function mixPoint(a, b, t) {
  return {
    x: mixNumber(a.x, b.x, t),
    y: mixNumber(a.y, b.y, t),
  };
}

function reveal(value, start, end) {
  if (end <= start) return value >= end ? 1 : 0;
  return smoothstep((value - start) / (end - start));
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
