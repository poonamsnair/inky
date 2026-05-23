import { createBrush, easings, hatch, lerp, seededRandom } from "../../src/inky-canvas.js";
import { drawIrregularShape, drawRoughShape, irregularEllipse, irregularPolygon, irregularRect } from "../../src/companion-tools.js";

export const project = {
  width: 960,
  height: 620,
  fps: 12,
  totalFrames: 96,
};

const ink = createBrush({
  type: "loose-ink",
  color: "#1b1713",
  size: 3.8,
  thinning: 0.58,
  smoothing: 0.28,
  streamline: 0.16,
  jitter: 0.55,
  seed: 1107,
  inkFlow: { enabled: true, startOpacity: 0.98, endOpacity: 0.64, dryness: 0.14, segments: 9 },
});

const fineInk = ink.clone({
  type: "fine-ink",
  size: 1.75,
  thinning: 0.28,
  jitter: 0.68,
  opacity: 0.82,
  seed: 2217,
});

const fatInk = ink.clone({
  type: "fat-wet-ink",
  size: 6.3,
  thinning: 0.72,
  jitter: 0.25,
  opacity: 0.9,
  seed: 3317,
});

const paleInk = ink.clone({
  type: "dry-background-ink",
  size: 2.2,
  color: "#3d352c",
  opacity: 0.5,
  jitter: 0.85,
  seed: 4417,
});

const dryInk = ink.clone({
  type: "scratchy-dry-ink",
  size: 1.05,
  color: "#251f19",
  opacity: 0.42,
  thinning: 0.12,
  jitter: 1.05,
  seed: 5517,
  inkFlow: { enabled: true, startOpacity: 0.7, endOpacity: 0.24, dryness: 0.42, segments: 7 },
});

const paperRandom = seededRandom(9128);
const paperSpecks = Array.from({ length: 1200 }, () => ({
  x: paperRandom() * project.width,
  y: paperRandom() * project.height,
  r: 0.25 + paperRandom() * 1.3,
  a: 0.018 + paperRandom() * 0.045,
}));

const soilScratches = Array.from({ length: 46 }, (_, index) => {
  const random = seededRandom(3030 + index);
  const x = 88 + random() * 790;
  const y = 430 + random() * 112;
  return {
    points: [
      [x, y],
      [x + 32 + random() * 54, y - 6 + random() * 15],
      [x + 86 + random() * 72, y - 10 + random() * 18],
    ],
    opacity: 0.13 + random() * 0.22,
    seed: 3300 + index,
  };
});

export function drawFrame(ctx, frame) {
  const t = frame / Math.max(1, project.totalFrames - 1);
  const story = getStoryState(t, frame);

  drawPaper(ctx);
  drawGarden(ctx, t);
  drawShovelShadow(ctx, story);
  drawAntTrail(ctx, story);
  drawAnt(ctx, story.ant);
  drawShovel(ctx, story);
  drawImpactDust(ctx, story);
  drawForegroundLeaves(ctx, t);
  drawForegroundInk(ctx);
}

export function getFrameDebug(frame) {
  const t = frame / Math.max(1, project.totalFrames - 1);
  const story = getStoryState(t, frame);
  return {
    beat: story.beat,
    ant: story.ant,
    shovel: {
      descent: story.shovelDescent,
      landed: story.impact > 0,
    },
  };
}

export function inspectImportantBounds(frame) {
  const story = getStoryState(frame / Math.max(1, project.totalFrames - 1), frame);
  return [
    { name: "ant", x: story.ant.x - 56, y: story.ant.y - 34, width: 112, height: 68 },
    { name: "shovel-impact", x: 548, y: 266, width: 192, height: 190 },
  ];
}

function getStoryState(t, frame) {
  const shovelDescent = clamp01((t - 0.38) / 0.18);
  const impact = clamp01((t - 0.565) / 0.1);
  const escape = clamp01((t - 0.61) / 0.34);
  const crawl = clamp01(t / 0.56);
  const startle = clamp01((t - 0.54) / 0.08);
  const x = escape > 0 ? lerp(440, 172, easings.easeOut(escape)) : lerp(116, 440, easings.easeInOut(crawl));
  const pace = escape > 0 ? 3.8 : 1.45;
  const gait = frame * pace;
  const y = 454 + Math.sin(gait * 0.72) * (escape > 0 ? 3.5 : 1.8);
  return {
    beat: impact > 0.2 ? "run-away" : shovelDescent > 0.3 ? "shovel-descends" : "garden-crawl",
    t,
    frame,
    shovelDescent,
    impact,
    escape,
    startle,
    ant: {
      x,
      y,
      facing: escape > 0.05 ? -1 : 1,
      scale: 1.16 + startle * 0.14,
      gait,
      panic: escape,
      crouch: Math.sin(clamp01((t - 0.5) / 0.1) * Math.PI) * 0.12,
    },
  };
}

function drawPaper(ctx) {
  ctx.save();
  ctx.fillStyle = "#fbf3e3";
  ctx.fillRect(0, 0, project.width, project.height);

  ctx.globalAlpha = 0.55;
  const wash = ctx.createRadialGradient(420, 310, 80, 420, 310, 620);
  wash.addColorStop(0, "rgba(255,255,255,0.28)");
  wash.addColorStop(0.62, "rgba(225,210,184,0.12)");
  wash.addColorStop(1, "rgba(180,160,130,0.08)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, project.width, project.height);

  for (const speck of paperSpecks) {
    ctx.globalAlpha = speck.a;
    ctx.fillStyle = "#6a5b48";
    ctx.beginPath();
    ctx.ellipse(speck.x, speck.y, speck.r, speck.r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = "#d0b895";
  ctx.lineWidth = 1;
  for (let line = 0; line < 18; line += 1) {
    const y = 18 + line * 34;
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(line * 1.7) * 4);
    ctx.bezierCurveTo(240, y - 9, 520, y + 11, project.width, y - 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGarden(ctx, t) {
  drawBackScraps(ctx);

  watercolorBlob(ctx, [
    [72, 410],
    [150, 360],
    [320, 352],
    [518, 370],
    [760, 342],
    [895, 395],
    [914, 524],
    [780, 570],
    [510, 552],
    [248, 566],
    [60, 520],
  ], {
    fill: "#b58a5b",
    alpha: 0.28,
    seed: 10,
  });

  watercolorBlob(ctx, [
    [52, 388],
    [210, 346],
    [370, 362],
    [510, 344],
    [710, 330],
    [918, 374],
    [890, 442],
    [636, 430],
    [404, 440],
    [176, 424],
  ], {
    fill: "#93a672",
    alpha: 0.11,
    seed: 11,
  });

  watercolorBlob(ctx, [
    [70, 450],
    [238, 430],
    [424, 440],
    [652, 428],
    [896, 450],
    [870, 560],
    [140, 552],
  ], {
    fill: "#8d6c48",
    alpha: 0.24,
    seed: 13,
  });

  drawGardenBedOutline(ctx);
  drawSoilRows(ctx);
  drawLooseSoil(ctx);
  drawPlants(ctx, t);
  drawGardenStones(ctx);
}

function drawGardenBedOutline(ctx) {
  const bed = [
    [72, 410],
    [150, 360],
    [320, 352],
    [518, 370],
    [760, 342],
    [895, 395],
    [914, 524],
    [780, 570],
    [510, 552],
    [248, 566],
    [60, 520],
    [72, 410],
  ];
  paleInk.stroke(ctx, bed, { seed: 691, size: 1.7, opacity: 0.3 });
  dryInk.stroke(ctx, [[88, 538], [280, 552], [520, 542], [756, 556], [900, 522]], {
    seed: 692,
    size: 1.35,
    opacity: 0.34,
  });
}

function drawBackScraps(ctx) {
  const scraps = [
    { x: 96, y: 80, w: 160, h: 112, color: "#efd5b3", seed: 1, title: "seed map" },
    { x: 296, y: 54, w: 94, h: 70, color: "#d9e0df", seed: 2, title: "rain" },
    { x: 542, y: 72, w: 122, h: 100, color: "#f0d08f", seed: 3, title: "soil" },
    { x: 728, y: 88, w: 138, h: 120, color: "#eee2cf", seed: 4, title: "beds" },
    { x: 142, y: 220, w: 130, h: 116, color: "#f3ead8", seed: 5, title: "sprouts" },
    { x: 710, y: 246, w: 96, h: 74, color: "#f2d28d", seed: 6, title: "note" },
  ];

  for (const scrap of scraps) {
    watercolorBlob(ctx, irregularRect(scrap, { seed: scrap.seed, jitter: 2.4, chunkLength: 28 }), {
      fill: scrap.color,
      alpha: 0.42,
      seed: scrap.seed,
      stroke: false,
    });
    drawIrregularShape(ctx, irregularRect(scrap, { seed: scrap.seed + 100, jitter: 2.2, chunkLength: 22 }), {
      stroke: "#2a241e",
      size: 1.9,
      opacity: 0.72,
      seed: scrap.seed + 200,
      closed: true,
      fill: false,
    });

    for (let line = 0; line < 4; line += 1) {
      const y = scrap.y + 28 + line * 13;
      fineInk.stroke(ctx, [
        [scrap.x + 20, y],
        [scrap.x + scrap.w * (0.62 + (line % 2) * 0.13), y + Math.sin(line + scrap.seed) * 2],
      ], { seed: 500 + scrap.seed * 10 + line, opacity: 0.42 });
    }
  }

  drawTinyGardenDiagram(ctx, 126, 104);
  drawTinyGardenDiagram(ctx, 162, 246, 0.78);
  drawPlantPin(ctx, 796, 251, "#8aa8c2");
}

function drawTinyGardenDiagram(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  fineInk.stroke(ctx, [[0, 46], [32, 22], [70, 45], [112, 12]], { seed: x + y, opacity: 0.65 });
  watercolorBlob(ctx, [[8, 52], [38, 34], [62, 55], [104, 22], [110, 64], [12, 72]], {
    fill: "#5f8a78",
    alpha: 0.2,
    seed: x * 3,
    stroke: false,
  });
  ctx.restore();
}

function drawPlantPin(ctx, x, y, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  fatInk.stroke(ctx, [[x - 5, y - 7], [x + 6, y + 7]], { size: 1.2, seed: x + y, opacity: 0.5 });
  ctx.restore();
}

function drawSoilRows(ctx) {
  const rows = [
    [[86, 484], [250, 462], [430, 474], [592, 452], [850, 470]],
    [[78, 516], [250, 506], [452, 512], [650, 492], [878, 515]],
    [[126, 548], [354, 532], [582, 538], [812, 546]],
  ];

  rows.forEach((row, index) => {
    ink.stroke(ctx, row, {
      size: index === 0 ? 4.4 : 2.8,
      opacity: index === 0 ? 0.9 : 0.55,
      seed: 700 + index,
    });
    dryInk.stroke(ctx, row.map(([x, y]) => [x + 3, y + 4]), {
      size: index === 0 ? 1.4 : 0.95,
      opacity: 0.28,
      seed: 710 + index,
    });
  });

  hatch(ctx, { x: 86, y: 442, w: 782, h: 120 }, {
    brush: fineInk.clone({ color: "#49382a", opacity: 0.28, size: 1.05, seed: 821 }),
    angle: -0.22,
    gap: 18,
    jitter: 5.5,
    seed: 822,
  });
}

function drawLooseSoil(ctx) {
  soilScratches.forEach((scratch) => {
    dryInk.stroke(ctx, scratch.points, {
      seed: scratch.seed,
      size: 0.75 + (scratch.seed % 3) * 0.18,
      opacity: scratch.opacity,
    });
  });

  const random = seededRandom(3721);
  ctx.save();
  for (let index = 0; index < 95; index += 1) {
    ctx.globalAlpha = 0.08 + random() * 0.18;
    ctx.fillStyle = random() > 0.45 ? "#513b2a" : "#a17953";
    const x = 86 + random() * 790;
    const y = 424 + random() * 122;
    const r = 0.9 + random() * 3.4;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.38 + random() * 0.48), random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPlants(ctx, t) {
  const plants = [
    { x: 176, y: 420, h: 92, color: "#5f8a78", seed: 1 },
    { x: 278, y: 430, h: 66, color: "#7f9d62", seed: 2 },
    { x: 746, y: 406, h: 102, color: "#6f9264", seed: 3 },
    { x: 830, y: 430, h: 72, color: "#557f6d", seed: 4 },
    { x: 114, y: 454, h: 54, color: "#8e9866", seed: 5 },
    { x: 676, y: 436, h: 76, color: "#5b866f", seed: 6 },
  ];

  for (const plant of plants) {
    const sway = Math.sin(t * Math.PI * 2 + plant.seed) * 4;
    fineInk.stroke(ctx, [[plant.x, plant.y], [plant.x + sway, plant.y - plant.h]], {
      seed: 900 + plant.seed,
      opacity: 0.68,
      size: 1.85,
    });
    drawLeaf(ctx, plant.x + sway * 0.4, plant.y - plant.h * 0.5, -28, plant.color, plant.seed);
    drawLeaf(ctx, plant.x + sway * 0.55, plant.y - plant.h * 0.64, 24, plant.color, plant.seed + 10);
    drawLeaf(ctx, plant.x + sway, plant.y - plant.h * 0.82, -14, plant.color, plant.seed + 20);
  }

  drawFlower(ctx, 226, 404, "#c96d50", 1);
  drawFlower(ctx, 794, 394, "#d9aa4e", 2);
}

function drawLeaf(ctx, x, y, angle, color, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  watercolorBlob(ctx, irregularEllipse({ x: -6, y: -18, w: 34, h: 18 }, { seed, jitter: 1.2, chunkLength: 8 }), {
    fill: color,
    alpha: 0.46,
    seed,
    stroke: false,
  });
  fineInk.stroke(ctx, [[-3, -7], [24, -8]], { seed: seed + 30, size: 1.1, opacity: 0.45 });
  ctx.restore();
}

function drawFlower(ctx, x, y, color, seed) {
  for (let petal = 0; petal < 5; petal += 1) {
    const angle = (petal / 5) * Math.PI * 2;
    watercolorBlob(ctx, irregularEllipse({
      x: x + Math.cos(angle) * 9 - 8,
      y: y + Math.sin(angle) * 7 - 6,
      w: 18,
      h: 14,
    }, { seed: seed * 10 + petal, jitter: 1.2, chunkLength: 5 }), {
      fill: color,
      alpha: 0.5,
      seed: seed * 100 + petal,
      stroke: false,
    });
  }
  fineInk.dot(ctx, x, y, { size: 5, opacity: 0.6, seed });
}

function drawGardenStones(ctx) {
  const stones = [
    { x: 96, y: 404, w: 40, h: 20, seed: 1 },
    { x: 332, y: 394, w: 54, h: 24, seed: 2 },
    { x: 618, y: 470, w: 46, h: 22, seed: 3 },
    { x: 846, y: 392, w: 38, h: 18, seed: 4 },
  ];
  for (const stone of stones) {
    watercolorBlob(ctx, irregularEllipse(stone, { seed: stone.seed, jitter: 2, chunkLength: 10 }), {
      fill: "#a7a59b",
      alpha: 0.34,
      seed: stone.seed + 20,
      stroke: false,
    });
    paleInk.stroke(ctx, irregularEllipse(stone, { seed: stone.seed + 30, jitter: 1.6, chunkLength: 12 }), {
      seed: stone.seed + 44,
      opacity: 0.46,
      size: 1.1,
    });
  }
}

function drawShovelShadow(ctx, story) {
  const grow = clamp01((story.t - 0.43) / 0.16);
  ctx.save();
  ctx.globalAlpha = 0.12 + grow * 0.18;
  ctx.fillStyle = "#3d352c";
  ctx.beginPath();
  ctx.ellipse(644, 455, 50 + grow * 56, 10 + grow * 17, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShovel(ctx, story) {
  const d = easings.easeIn(story.shovelDescent);
  const yOffset = lerp(-470, 0, d);
  const impactJitter = story.impact > 0 && story.impact < 0.22 ? Math.sin(story.frame * 2.4) * 4 : 0;

  ctx.save();
  ctx.translate(0, yOffset + impactJitter);
  ctx.rotate(-0.05);

  const handle = ink.clone({ color: "#7f5534", size: 8.8, thinning: 0.22, opacity: 0.82, seed: 1201 });
  handle.stroke(ctx, [[626, -40], [635, 94], [636, 238], [634, 318]], { seed: 1202 });
  fineInk.stroke(ctx, [[621, -36], [630, 316]], { color: "#33261d", size: 1.55, opacity: 0.44, seed: 1203 });
  dryInk.stroke(ctx, [[640, -26], [646, 308]], { color: "#f2d0a4", size: 0.75, opacity: 0.28, seed: 1204 });

  watercolorBlob(ctx, [
    [570, 300],
    [704, 296],
    [718, 374],
    [642, 438],
    [562, 374],
  ], {
    fill: "#9eabb0",
    alpha: 0.62,
    seed: 1221,
    stroke: false,
  });

  drawIrregularShape(ctx, irregularPolygon([
    [570, 300],
    [704, 296],
    [718, 374],
    [642, 438],
    [562, 374],
  ], { seed: 1222, jitter: 3, chunkLength: 20 }), {
    stroke: "#1b1713",
    size: 4.2,
    opacity: 0.95,
    seed: 1223,
    closed: true,
    fill: false,
  });

  fineInk.stroke(ctx, [[608, 319], [644, 420], [686, 320]], { seed: 1224, opacity: 0.42, size: 1.45 });
  dryInk.stroke(ctx, [[584, 350], [620, 362], [650, 360], [704, 352]], { seed: 1225, opacity: 0.22, size: 0.9 });
  ctx.restore();
}

function drawAntTrail(ctx, story) {
  if (story.escape <= 0.04) return;
  ctx.save();
  const alpha = story.escape * 0.45;
  const startX = story.ant.x + 42;
  for (let index = 0; index < 5; index += 1) {
    const x = startX + index * 22 + Math.sin(story.frame + index) * 4;
    const y = story.ant.y - 9 + (index % 2) * 11;
    fineInk.stroke(ctx, [[x, y], [x + 20, y - 4]], {
      seed: 1400 + index,
      size: 1.3,
      opacity: alpha * (1 - index * 0.12),
    });
  }
  ctx.restore();
}

function drawAnt(ctx, ant) {
  ctx.save();
  ctx.translate(ant.x, ant.y);
  ctx.scale(ant.facing * ant.scale, ant.scale * (1 - ant.crouch));
  ctx.rotate(Math.sin(ant.gait * 0.33) * 0.05);

  const bodyAlpha = ant.panic > 0 ? 0.96 : 0.9;
  drawAntLegs(ctx, ant);

  drawAntSegment(ctx, -29, 0, 38, 28, 1, bodyAlpha);
  drawAntSegment(ctx, 2, -1, 30, 23, 2, bodyAlpha);
  drawAntSegment(ctx, 30, -2, 28, 23, 3, bodyAlpha);

  dryInk.stroke(ctx, [[-42, 4], [-22, 10], [-2, 8], [20, 5]], {
    seed: 1490,
    size: 0.8,
    opacity: 0.2,
  });

  fineInk.stroke(ctx, [[41, -11], [60, -27], [76, -25]], { seed: 1501, size: 1.8, opacity: 0.9 });
  fineInk.stroke(ctx, [[41, 6], [62, 17], [76, 12]], { seed: 1502, size: 1.8, opacity: 0.9 });
  fineInk.dot(ctx, 39, -6, { size: 3.8, opacity: 0.98, seed: 1503 });

  if (ant.panic > 0.05) {
    fineInk.stroke(ctx, [[-48, -25], [-56, -35], [-64, -31]], {
      seed: 1506,
      size: 1.2,
      opacity: ant.panic * 0.55,
    });
    fineInk.stroke(ctx, [[-44, 25], [-55, 34], [-64, 29]], {
      seed: 1507,
      size: 1.2,
      opacity: ant.panic * 0.48,
    });
  }

  if (ant.panic > 0.15) {
    fatInk.stroke(ctx, [[16, -28], [24, -40]], { size: 2, opacity: ant.panic * 0.6, seed: 1504 });
    fatInk.stroke(ctx, [[-4, -28], [-8, -40]], { size: 2, opacity: ant.panic * 0.45, seed: 1505 });
  }
  ctx.restore();
}

function drawAntSegment(ctx, x, y, w, h, seed, alpha) {
  watercolorBlob(ctx, irregularEllipse({ x: x - w / 2, y: y - h / 2, w, h }, { seed: 1600 + seed, jitter: 1.5, chunkLength: 7 }), {
    fill: "#1f1a15",
    alpha,
    seed: 1700 + seed,
    stroke: false,
  });
  drawIrregularShape(ctx, irregularEllipse({ x: x - w / 2, y: y - h / 2, w, h }, { seed: 1800 + seed, jitter: 1.2, chunkLength: 7 }), {
    stroke: "#15110e",
    size: 2.8,
    opacity: 0.94,
    seed: 1900 + seed,
    closed: true,
    fill: false,
  });
  dryInk.stroke(ctx, [[x - w * 0.26, y - h * 0.18], [x + w * 0.18, y - h * 0.08]], {
    seed: 1950 + seed,
    size: 0.55,
    opacity: 0.28,
  });
}

function drawAntLegs(ctx, ant) {
  const cycle = ant.gait;
  const legs = [
    { root: [-6, -7], knee: [-20, -22], foot: [-39, -18], phase: 0 },
    { root: [4, -8], knee: [0, -26], foot: [16, -36], phase: 1.3 },
    { root: [16, -6], knee: [22, -24], foot: [42, -27], phase: 2.1 },
    { root: [-6, 7], knee: [-22, 21], foot: [-42, 18], phase: 2.6 },
    { root: [4, 8], knee: [2, 27], foot: [20, 36], phase: 0.9 },
    { root: [17, 6], knee: [26, 22], foot: [46, 25], phase: 1.8 },
  ];

  for (const [index, leg] of legs.entries()) {
    const lift = Math.sin(cycle + leg.phase) * (ant.panic > 0 ? 7 : 3);
    const stride = Math.cos(cycle + leg.phase) * (ant.panic > 0 ? 7 : 3);
    fineInk.stroke(ctx, [
      leg.root,
      [leg.knee[0] + stride * 0.3, leg.knee[1] + lift * 0.2],
      [leg.foot[0] + stride, leg.foot[1] - Math.abs(lift) * 0.35],
    ], {
      seed: 2000 + index,
      size: 2.05,
      opacity: 0.9,
    });
    if (index % 2 === 0) {
      dryInk.stroke(ctx, [
        [leg.root[0] + 1.5, leg.root[1] + 1],
        [leg.foot[0] + stride * 0.7, leg.foot[1] - Math.abs(lift) * 0.25 + 1],
      ], {
        seed: 2040 + index,
        size: 0.65,
        opacity: 0.22,
      });
    }
  }
}

function drawImpactDust(ctx, story) {
  if (story.impact <= 0) return;
  const burst = Math.sin(Math.min(1, story.impact) * Math.PI);
  const fade = 1 - clamp01((story.t - 0.68) / 0.22);

  ctx.save();
  watercolorBlob(ctx, irregularEllipse({ x: 578, y: 426, w: 132, h: 46 }, { seed: 2377, jitter: 3.6, chunkLength: 14 }), {
    fill: "#7f6040",
    alpha: 0.13 * fade,
    seed: 2378,
    stroke: false,
  });
  dryInk.stroke(ctx, [[586, 434], [628, 445], [678, 430], [710, 438]], {
    seed: 2379,
    size: 1.2,
    opacity: 0.28 * fade,
  });

  const random = seededRandom(2400);
  for (let index = 0; index < 36; index += 1) {
    const angle = random() * Math.PI * 2;
    const distance = (22 + random() * 96) * burst;
    const x = 638 + Math.cos(angle) * distance;
    const y = 432 + Math.sin(angle) * distance * 0.55 - random() * 24 * burst;
    const r = 2 + random() * 10;
    ctx.globalAlpha = Math.max(0, fade) * (0.14 + random() * 0.22);
    ctx.fillStyle = random() > 0.45 ? "#9b7a56" : "#c8ad7f";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.58, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let index = 0; index < 11; index += 1) {
    const x = 600 + index * 12;
    fineInk.stroke(ctx, [[x, 440 + (index % 2) * 7], [x - 18, 456 + (index % 3) * 4]], {
      seed: 2500 + index,
      opacity: fade * 0.46,
      size: 1.35,
    });
  }
  ctx.restore();
}

function drawForegroundInk(ctx) {
  drawRoughShape(ctx, { kind: "line", x1: 54, y1: 566, x2: 902, y2: 562 }, {
    seed: 2601,
    roughness: 0.9,
    bowing: 0.35,
    stroke: "#1b1713",
    strokeWidth: 2,
    opacity: 0.5,
  });
}

function drawForegroundLeaves(ctx, t) {
  const leaves = [
    { x: 22, y: 558, angle: -0.85, scale: 1.18, color: "#617f55", seed: 1 },
    { x: 54, y: 586, angle: -0.46, scale: 0.86, color: "#79905f", seed: 2 },
    { x: 920, y: 548, angle: 0.76, scale: 1.02, color: "#557865", seed: 3 },
    { x: 875, y: 590, angle: 0.36, scale: 0.8, color: "#8b9862", seed: 4 },
  ];

  for (const leaf of leaves) {
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.angle + Math.sin(t * Math.PI * 2 + leaf.seed) * 0.035);
    ctx.scale(leaf.scale, leaf.scale);
    fineInk.stroke(ctx, [[0, 0], [30, -48], [62, -80]], { seed: 2700 + leaf.seed, size: 1.5, opacity: 0.44 });
    for (let index = 0; index < 3; index += 1) {
      const y = -24 - index * 19;
      watercolorBlob(ctx, irregularEllipse({ x: 17 + index * 10, y: y - 11, w: 54, h: 20 }, {
        seed: 2720 + leaf.seed * 10 + index,
        jitter: 2,
        chunkLength: 9,
      }), {
        fill: leaf.color,
        alpha: 0.21,
        seed: 2740 + leaf.seed * 10 + index,
        stroke: false,
      });
      dryInk.stroke(ctx, [[24 + index * 10, y - 2], [62 + index * 13, y - 10]], {
        seed: 2760 + leaf.seed * 10 + index,
        size: 0.8,
        opacity: 0.2,
      });
    }
    ctx.restore();
  }
}

function watercolorBlob(ctx, points, options = {}) {
  const fill = options.fill || "#c9b28c";
  const alpha = options.alpha ?? 0.25;
  const seed = options.seed ?? 1;

  ctx.save();
  for (let pass = 0; pass < 3; pass += 1) {
    const shifted = points.map(([x, y], index) => [
      x + Math.sin(seed + pass + index * 1.7) * (2 + pass * 1.5),
      y + Math.cos(seed * 0.7 + pass + index * 1.3) * (2 + pass * 1.2),
    ]);
    ctx.globalAlpha = alpha / (pass + 1.25);
    ctx.fillStyle = fill;
    ctx.beginPath();
    shifted.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}
