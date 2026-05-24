import {
  drawCoherentPaperGrain,
  drawDryMediaFill,
  drawMaterialBrushStroke,
  drawMaterialHatch,
  ensureReadableColor,
  fillClippedMaterial,
  fillMaterialGradient,
} from "./material-tools.js";

const TAU = Math.PI * 2;

export const ILLUSTRATION_STYLE_KITS = {
  "reference-crayon-ink": {
    name: "Reference crayon ink",
    paper: "#fbf2dd",
    paperShadow: "#e8d2ad",
    ink: "#17120d",
    fineInk: "#302519",
    skin: "#edb989",
    skinShadow: "#b56f4e",
    hair: "#5b341c",
    hairHighlight: "#9d6a36",
    shirt: "#6d91ad",
    shirtShadow: "#3f6687",
    apron: "#ead9b4",
    wood: "#c28a4c",
    blue: "#496f8a",
    red: "#ce503d",
    green: "#6d8840",
    yellow: "#d6a742",
    lineTool: "dip-ink",
    fineLineTool: "technical-pen",
    hairTool: "brush-pen",
    colorTool: "wax-crayon",
    accentTool: "oil-crayon",
    shadowTool: "graphite-pencil",
    washTool: "watercolor",
  },
  "storybook-watercolor-ink": {
    name: "Storybook watercolor ink",
    paper: "#fbf6e7",
    paperShadow: "#e4d7bf",
    ink: "#14120f",
    fineInk: "#2c251d",
    skin: "#efbe91",
    skinShadow: "#b97955",
    hair: "#2b241b",
    hairHighlight: "#615039",
    shirt: "#789fbd",
    shirtShadow: "#496f8c",
    apron: "#efe0ba",
    wood: "#bc8450",
    blue: "#6f9bb8",
    red: "#d4624b",
    green: "#6c8946",
    yellow: "#d7b357",
    lineTool: "fountain-pen",
    fineLineTool: "technical-pen",
    hairTool: "brush-pen",
    colorTool: "watercolor",
    accentTool: "colored-pencil",
    shadowTool: "graphite-pencil",
    washTool: "watercolor",
  },
  "comic-ink-gouache": {
    name: "Comic ink gouache",
    paper: "#f8f2df",
    paperShadow: "#d2bea0",
    ink: "#101010",
    fineInk: "#242424",
    skin: "#f3d4b1",
    skinShadow: "#bf8060",
    hair: "#26201b",
    hairHighlight: "#4c4034",
    shirt: "#f27929",
    shirtShadow: "#9f441b",
    apron: "#f5f1e5",
    wood: "#a96536",
    blue: "#2f6890",
    red: "#d24b40",
    green: "#67792f",
    yellow: "#f2c63d",
    lineTool: "brush-pen",
    fineLineTool: "technical-pen",
    hairTool: "brush-pen",
    colorTool: "marker",
    accentTool: "gouache",
    shadowTool: "ink-wash",
    washTool: "ink-wash",
  },
  "black-ink-doodle": {
    name: "Black ink doodle",
    paper: "#fbfbfa",
    paperShadow: "#ecebea",
    ink: "#090909",
    fineInk: "#202020",
    skin: "#fffefd",
    skinShadow: "#d8d8d6",
    hair: "#080808",
    hairHighlight: "#2a2a28",
    shirt: "#090909",
    shirtShadow: "#000000",
    apron: "#efc9f2",
    wood: "#ffffff",
    blue: "#ffffff",
    red: "#ffffff",
    green: "#ffffff",
    yellow: "#f0c847",
    lineTool: "doodle-ink",
    fineLineTool: "technical-pen",
    hairTool: "doodle-ink",
    colorTool: "marker",
    accentTool: "colored-pencil",
    shadowTool: "charcoal",
    washTool: "ink-wash",
  },
};

export function resolveIllustrationStyle(name = "reference-crayon-ink") {
  if (name && typeof name === "object") return name;
  return ILLUSTRATION_STYLE_KITS[name] || ILLUSTRATION_STYLE_KITS["reference-crayon-ink"];
}

export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < String(value).length; index += 1) {
    hash ^= String(value).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

export function easeOutCubic(value) {
  const t = clamp(value);
  return 1 - (1 - t) ** 3;
}

export function easeInOutCubic(value) {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function lerpNumber(a, b, t) {
  return a + (b - a) * t;
}

export function lerpPoint(a, b, t) {
  return {
    x: lerpNumber(a.x, b.x, t),
    y: lerpNumber(a.y, b.y, t),
  };
}

export function lerpObject(a, b, t) {
  const result = { ...a };
  for (const key of Object.keys(b || {})) {
    result[key] =
      typeof a?.[key] === "number" && typeof b[key] === "number" ? lerpNumber(a[key], b[key], t) : b[key] ?? a?.[key];
  }
  return result;
}

export function rotateAround(point, center, angle = 0) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function offsetPoint(origin, axis, normal, along = 0, across = 0) {
  return {
    x: origin.x + axis.x * along + normal.x * across,
    y: origin.y + axis.y * along + normal.y * across,
  };
}

export function drawPaperScene(ctx, bounds, styleInput = "reference-crayon-ink", options = {}) {
  const style = typeof styleInput === "string" ? resolveIllustrationStyle(styleInput) : styleInput;
  const area = normalizeBounds(bounds);

  ctx.save();
  ctx.fillStyle = style.paper;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  fillMaterialGradient(
    ctx,
    area,
    [
      { offset: 0, color: options.light || "#fffaf0" },
      { offset: 0.58, color: style.paper },
      { offset: 1, color: options.shadow || style.paperShadow },
    ],
    { angle: options.angle ?? -0.72, alpha: options.gradientAlpha ?? 0.82 },
  );
  drawCoherentPaperGrain(ctx, area, {
    seed: options.seed ?? 1101,
    alpha: options.grainAlpha ?? 0.042,
    step: options.grainStep ?? 4,
    scale: options.grainScale ?? 82,
    threshold: options.grainThreshold ?? 0.22,
  });
  ctx.restore();
}

export function fillConstructedShape(ctx, drawPath, bounds, options = {}) {
  const area = normalizeBounds(bounds);
  const style = resolveIllustrationStyle(options.style);
  const fill = options.fill || style.paper;
  const material = options.material || style.colorTool;
  const seed = options.seed ?? hashString(`shape:${fill}:${area.x}:${area.y}:${area.w}:${area.h}`);

  ctx.save();
  ctx.beginPath();
  drawPath(ctx);
  ctx.fillStyle = fill;
  ctx.globalAlpha = options.baseAlpha ?? 1;
  ctx.fill();
  ctx.restore();

  if (material) {
    fillClippedMaterial(ctx, area, drawPath, material, {
      color: options.materialColor || fill,
      seed,
      alpha: options.alpha,
      patternAlpha: options.patternAlpha,
      scumble: options.scumble,
      hatchCount: options.hatchCount,
      hatch: options.hatch,
      tooth: options.tooth,
      angle: options.angle,
      edgePool: options.edgePool,
      blooms: options.blooms,
      gradient: options.gradient,
    });
  }

  if (options.shadow) {
    ctx.save();
    ctx.beginPath();
    drawPath(ctx);
    ctx.clip();
    drawDryMediaFill(ctx, area, options.shadowTool || style.shadowTool, {
      color: options.shadowColor || style.fineInk,
      seed: seed + 17,
      patternAlpha: options.shadowAlpha ?? 0.14,
      scumble: options.shadowScumble ?? 4,
      hatchCount: options.shadowHatch ?? 3,
      angle: options.shadowAngle ?? -0.45,
    });
    ctx.restore();
  }

  if (options.stroke !== false) {
    ctx.save();
    ctx.beginPath();
    drawPath(ctx);
    ctx.strokeStyle = options.strokeColor || style.ink;
    ctx.lineWidth = options.strokeWidth ?? 2.2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalAlpha = options.strokeAlpha ?? 1;
    ctx.stroke();
    if (options.doubleStroke) {
      ctx.globalAlpha = (options.strokeAlpha ?? 1) * 0.35;
      ctx.lineWidth = Math.max(0.8, (options.strokeWidth ?? 2.2) * 0.55);
      ctx.translate(0.8, -0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawProgressivePolyline(ctx, points, progress = 1, toolName = "dip-ink", options = {}) {
  const partial = partialPolyline(points, progress);
  if (partial.length < 2) return;
  drawMaterialBrushStroke(ctx, partial, toolName, options);
}

export function drawProgressiveContour(ctx, points, progress = 1, styleInput = "reference-crayon-ink", options = {}) {
  const style = typeof styleInput === "string" ? resolveIllustrationStyle(styleInput) : styleInput;
  drawProgressivePolyline(ctx, points, progress, options.tool || style.lineTool, {
    color: options.color || style.ink,
    alpha: options.alpha ?? 0.82,
    tool: { size: options.size ?? 2.6, ...(options.toolOptions || {}) },
    seed: options.seed,
  });
}

export function drawCapsuleShape(ctx, start, end, radius, options = {}) {
  const bounds = {
    x: Math.min(start.x, end.x) - radius - 4,
    y: Math.min(start.y, end.y) - radius - 4,
    w: Math.abs(end.x - start.x) + radius * 2 + 8,
    h: Math.abs(end.y - start.y) + radius * 2 + 8,
  };
  fillConstructedShape(ctx, (path) => capsulePath(path, start, end, radius), bounds, options);
}

export function drawJointedLimb(ctx, anchors, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  const shoulder = anchors.shoulder;
  const elbow = anchors.elbow;
  const wrist = anchors.wrist || anchors.hand;
  const sleeveEnd = lerpPoint(shoulder, elbow, options.sleeveT ?? 0.72);
  const sleevePoints = [shoulder, elbow, sleeveEnd].map(pointToArray);
  const forearmMid = lerpPoint(sleeveEnd, wrist, 0.52);
  forearmMid.y += options.forearmBend ?? 7;
  const forearmPoints = [sleeveEnd, forearmMid, wrist].map(pointToArray);

  drawThickMaterialStroke(ctx, sleevePoints, options.sleeveWidth ?? 32, {
    fill: options.sleeveFill || style.shirt,
    material: options.sleeveMaterial || style.colorTool,
    seed: (options.seed ?? 0) + 1,
    style: options.style,
  });
  drawProgressiveContour(ctx, sleevePoints, options.progress ?? 1, style, {
    seed: (options.seed ?? 0) + 2,
    alpha: 0.5,
    size: options.sleeveInkSize ?? 2.1,
  });

  drawThickMaterialStroke(ctx, forearmPoints, options.forearmWidth ?? 20, {
    fill: options.skinFill || style.skin,
    material: options.skinMaterial || style.colorTool,
    seed: (options.seed ?? 0) + 3,
    style: options.style,
  });
  drawProgressiveContour(ctx, forearmPoints, options.progress ?? 1, style, {
    seed: (options.seed ?? 0) + 4,
    alpha: 0.46,
    size: options.forearmInkSize ?? 1.8,
  });

  return {
    sleeveEnd,
    wrist,
  };
}

export function drawConstructedHand(ctx, anchor, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  const scale = options.scale ?? 1;
  const angle = options.angle ?? 0;
  const seed = options.seed ?? 0;
  const axis = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const palm = { x: anchor.x, y: anchor.y };
  const bounds = { x: palm.x - 31 * scale, y: palm.y - 29 * scale, w: 68 * scale, h: 60 * scale };

  fillConstructedShape(ctx, (path) => ellipsePath(path, palm.x, palm.y, 18 * scale, 13.5 * scale, angle), bounds, {
    fill: options.fill || style.skin,
    material: options.material || style.colorTool,
    seed,
    style: options.style,
    patternAlpha: options.patternAlpha ?? 0.34,
    scumble: 4,
    strokeWidth: options.strokeWidth ?? 1.75,
    shadow: true,
    shadowAlpha: 0.08,
  });

  const fingerOffsets = options.fingerOffsets || [-8.5, -3, 3.2, 8.2];
  fingerOffsets.forEach((offset, index) => {
    const base = offsetPoint(palm, axis, normal, 8.5 * scale, offset * scale);
    const reach = (23 + (index === 1 ? 3 : index === 2 ? 1 : -1)) * scale;
    const tip = offsetPoint(palm, axis, normal, reach, (offset + (index - 1.5) * 0.75) * scale);
    drawCapsuleShape(ctx, base, tip, (3.35 - index * 0.15) * scale, {
      fill: options.fill || style.skin,
      material: options.material || style.colorTool,
      seed: seed + 20 + index,
      style: options.style,
      patternAlpha: 0.28,
      scumble: 2,
      strokeWidth: 1.25 * scale,
    });
  });

  const thumbBase = offsetPoint(palm, axis, normal, -5 * scale, 11 * scale);
  const thumbTip = offsetPoint(palm, axis, normal, 11 * scale, 23 * scale);
  drawCapsuleShape(ctx, thumbBase, thumbTip, 4.7 * scale, {
    fill: options.fill || style.skin,
    material: options.material || style.colorTool,
    seed: seed + 30,
    style: options.style,
    patternAlpha: 0.3,
    scumble: 2,
    strokeWidth: 1.25 * scale,
  });

  ctx.save();
  ctx.strokeStyle = options.creaseColor || style.skinShadow;
  ctx.lineWidth = 1.05 * scale;
  ctx.lineCap = "round";
  fingerOffsets.forEach((offset, index) => {
    const crease = offsetPoint(palm, axis, normal, (13 + index * 0.7) * scale, offset * scale);
    const creaseEnd = offsetPoint(palm, axis, normal, (16 + index * 0.7) * scale, (offset + 2) * scale);
    line(ctx, crease.x, crease.y, creaseEnd.x, creaseEnd.y);
  });
  const wristA = offsetPoint(palm, axis, normal, -18 * scale, -7 * scale);
  const wristB = offsetPoint(palm, axis, normal, -18 * scale, 7 * scale);
  line(ctx, wristA.x, wristA.y, wristB.x, wristB.y);
  ctx.restore();
}

export function drawInkDoodleHand(ctx, anchor, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  const variant = options.variant || "open";
  const scale = options.scale ?? 1;
  const angle = options.angle ?? 0;
  const seed = options.seed ?? 0;
  const progress = options.progress ?? 1;
  const fill = options.fill || style.paper || "#fffefd";
  const outlineSize = options.outlineSize ?? (variant === "peace" ? 4.8 : 4.4);
  const points = variant === "peace" ? peaceHandPoints() : openHandPoints();
  const bounds = variant === "peace" ? { x: -58, y: -86, w: 116, h: 158 } : { x: -72, y: -72, w: 144, h: 116 };

  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  fillConstructedShape(ctx, (path) => smoothClosedPath(path, points), bounds, {
    fill,
    material: null,
    seed,
    style,
    stroke: false,
  });

  drawProgressiveContour(ctx, [...points, points[0]], progress, style, {
    color: options.strokeColor || style.ink,
    alpha: options.alpha ?? 0.96,
    size: outlineSize,
    seed,
  });
  if (progress > 0.96) {
    ctx.save();
    ctx.strokeStyle = options.strokeColor || style.ink;
    ctx.lineWidth = outlineSize * 0.62;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.globalAlpha = options.solidAlpha ?? 0.78;
    ctx.beginPath();
    smoothClosedPath(ctx, jitterPolyline(points, seed + 71, 0.6));
    ctx.stroke();
    ctx.restore();
  }
  drawProgressiveContour(ctx, [...jitterPolyline(points, seed + 19, 1.3), points[0]], progress, style, {
    color: options.strokeColor || style.ink,
    alpha: options.secondaryAlpha ?? 0.28,
    size: Math.max(1.2, outlineSize * 0.38),
    seed: seed + 3,
  });

  const creaseLines = variant === "peace" ? peaceHandCreases() : openHandCreases();
  creaseLines.forEach((linePoints, index) => {
    drawProgressiveContour(ctx, linePoints, progress, style, {
      color: options.strokeColor || style.ink,
      alpha: options.creaseAlpha ?? 0.62,
      size: options.creaseSize ?? 1.55,
      seed: seed + 40 + index,
      tool: style.fineLineTool,
    });
  });

  ctx.restore();
}

export function drawExpressiveHead(ctx, anchor, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  const scale = options.scale ?? 1;
  const tilt = options.tilt ?? 0;
  const seed = options.seed ?? 0;
  const mood = options.mood || "soft";
  const neck = {
    x: anchor.x - 20 * scale,
    y: anchor.y + 53 * scale,
    w: 40 * scale,
    h: 54 * scale,
  };

  if (options.neck !== false) {
    fillConstructedShape(ctx, (path) => roundedRectPath(path, neck.x, neck.y, neck.w, neck.h, 15 * scale), neck, {
      fill: options.skin || style.skin,
      material: style.colorTool,
      seed: seed + 1,
      style: options.style,
      patternAlpha: 0.28,
      scumble: 4,
      strokeWidth: 1.5,
    });
  }

  drawHairBack(ctx, anchor, { ...options, seed: seed + 10, scale, tilt, style });
  const headBounds = { x: anchor.x - 55 * scale, y: anchor.y - 62 * scale, w: 110 * scale, h: 126 * scale };
  fillConstructedShape(ctx, (path) => ellipsePath(path, anchor.x, anchor.y, 48 * scale, 58 * scale, tilt), headBounds, {
    fill: options.skin || style.skin,
    material: style.colorTool,
    seed: seed + 20,
    style: options.style,
    patternAlpha: 0.32,
    scumble: 9,
    angle: -0.35,
    shadow: true,
    shadowAlpha: 0.07,
  });
  drawHairCap(ctx, anchor, { ...options, seed: seed + 30, scale, tilt, style });
  drawFaceFeatures(ctx, anchor, { ...options, mood, scale, tilt, seed: seed + 50, style });

  return {
    neckBase: { x: anchor.x, y: anchor.y + 100 * scale },
    mouth: mouthAnchor(anchor, { scale, tilt, mood }),
  };
}

export function drawApronTorso(ctx, torso, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  const scale = options.scale ?? 1;
  const tilt = options.tilt ?? 0;
  const shoulderLeft = rotateAround({ x: torso.x - 80 * scale, y: torso.y - 92 * scale }, torso, tilt);
  const shoulderRight = rotateAround({ x: torso.x + 80 * scale, y: torso.y - 92 * scale }, torso, tilt);
  const shirtHem = 92 * scale;
  const apronBottom = 80 * scale;
  const shirtBounds = { x: torso.x - 124 * scale, y: torso.y - 106 * scale, w: 248 * scale, h: 212 * scale };

  fillConstructedShape(
    ctx,
    (path) => {
      path.moveTo(shoulderLeft.x - 20 * scale, shoulderLeft.y + 4 * scale);
      path.bezierCurveTo(torso.x - 122 * scale, torso.y - 42 * scale, torso.x - 108 * scale, torso.y + 56 * scale, torso.x - 68 * scale, torso.y + shirtHem);
      path.quadraticCurveTo(torso.x, torso.y + shirtHem + 9 * scale, torso.x + 70 * scale, torso.y + shirtHem);
      path.bezierCurveTo(torso.x + 112 * scale, torso.y + 52 * scale, torso.x + 124 * scale, torso.y - 42 * scale, shoulderRight.x + 20 * scale, shoulderRight.y + 4 * scale);
      path.bezierCurveTo(torso.x + 52 * scale, torso.y - 104 * scale, torso.x - 52 * scale, torso.y - 104 * scale, shoulderLeft.x - 20 * scale, shoulderLeft.y + 4 * scale);
      path.closePath();
    },
    shirtBounds,
    {
      fill: options.shirt || style.shirt,
      material: options.shirtMaterial || style.colorTool,
      seed: (options.seed ?? 0) + 100,
      style: options.style,
      patternAlpha: 0.43,
      scumble: 18,
      angle: -0.55,
      strokeWidth: 2.2,
      shadow: true,
      shadowAlpha: 0.08,
    },
  );

  const apronBounds = { x: torso.x - 76 * scale, y: torso.y - 86 * scale, w: 152 * scale, h: 172 * scale };
  fillConstructedShape(
    ctx,
    (path) => {
      path.moveTo(torso.x - 38 * scale, torso.y - 84 * scale);
      path.lineTo(torso.x + 38 * scale, torso.y - 84 * scale);
      path.bezierCurveTo(torso.x + 72 * scale, torso.y - 6 * scale, torso.x + 58 * scale, torso.y + 44 * scale, torso.x + 42 * scale, torso.y + apronBottom);
      path.quadraticCurveTo(torso.x, torso.y + apronBottom + 8 * scale, torso.x - 44 * scale, torso.y + apronBottom);
      path.bezierCurveTo(torso.x - 58 * scale, torso.y + 44 * scale, torso.x - 72 * scale, torso.y - 8 * scale, torso.x - 38 * scale, torso.y - 84 * scale);
      path.closePath();
    },
    apronBounds,
    {
      fill: options.apron || style.apron,
      material: options.apronMaterial || "colored-pencil",
      seed: (options.seed ?? 0) + 130,
      style: options.style,
      patternAlpha: 0.38,
      scumble: 12,
      hatchCount: 5,
      strokeWidth: 2,
    },
  );

  drawProgressiveContour(
    ctx,
    [
      [torso.x - 38 * scale, torso.y - 84 * scale],
      [torso.x - 8 * scale, torso.y - 30 * scale],
      [torso.x - 42 * scale, torso.y + apronBottom - 6 * scale],
    ],
    1,
    style,
    { seed: (options.seed ?? 0) + 141, size: 1.8, alpha: 0.46 },
  );
  drawProgressiveContour(
    ctx,
    [
      [torso.x + 38 * scale, torso.y - 84 * scale],
      [torso.x + 8 * scale, torso.y - 28 * scale],
      [torso.x + 42 * scale, torso.y + apronBottom - 6 * scale],
    ],
    1,
    style,
    { seed: (options.seed ?? 0) + 142, size: 1.8, alpha: 0.46 },
  );

  return { shoulderLeft, shoulderRight, shirtHemY: torso.y + shirtHem, apronBottomY: torso.y + apronBottom };
}

export function drawShortsChain(ctx, waist, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  const scale = options.scale ?? 1;
  const width = (options.width ?? 104) * scale;
  const height = (options.height ?? 64) * scale;
  const left = waist.x - width / 2;
  const top = waist.y;
  const bounds = { x: left - 6 * scale, y: top - 8 * scale, w: width + 12 * scale, h: height + 20 * scale };

  fillConstructedShape(
    ctx,
    (path) => {
      path.moveTo(left + 8 * scale, top);
      path.lineTo(left + width - 8 * scale, top);
      path.quadraticCurveTo(left + width, top + height * 0.36, left + width - 28 * scale, top + height);
      path.quadraticCurveTo(waist.x + 12 * scale, top + height - 6 * scale, waist.x, top + height * 0.62);
      path.quadraticCurveTo(waist.x - 12 * scale, top + height - 6 * scale, left + 28 * scale, top + height);
      path.quadraticCurveTo(left, top + height * 0.36, left + 8 * scale, top);
      path.closePath();
    },
    bounds,
    {
      fill: options.fill || style.blue,
      material: options.material || style.colorTool,
      seed: options.seed ?? 0,
      style: options.style,
      patternAlpha: 0.46,
      scumble: 10,
      strokeWidth: 2,
      shadow: true,
      shadowAlpha: 0.09,
    },
  );

  ctx.save();
  ctx.strokeStyle = options.strokeColor || style.ink;
  ctx.lineWidth = 1.6 * scale;
  ctx.lineCap = "round";
  line(ctx, left + 10 * scale, top + 12 * scale, left + width - 10 * scale, top + 12 * scale);
  line(ctx, waist.x, top + 15 * scale, waist.x, top + height * 0.62);
  line(ctx, left + 28 * scale, top + height - 2 * scale, left + 48 * scale, top + height - 7 * scale);
  line(ctx, left + width - 28 * scale, top + height - 2 * scale, left + width - 48 * scale, top + height - 7 * scale);
  ctx.restore();

  return {
    leftLegOpening: { x: left + 38 * scale, y: top + height - 2 * scale },
    rightLegOpening: { x: left + width - 38 * scale, y: top + height - 2 * scale },
  };
}

export function drawWoodBoard(ctx, x, y, w, h, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  fillConstructedShape(ctx, (path) => roundedRectPath(path, x, y, w, h, options.radius ?? 10), { x, y, w, h }, {
    fill: options.fill || style.wood,
    material: options.material || "colored-pencil",
    seed: options.seed ?? 0,
    style: options.style,
    patternAlpha: 0.42,
    scumble: 20,
    hatchCount: 7,
    angle: 0.08,
    strokeWidth: 2.2,
  });

  const random = seededRandom((options.seed ?? 0) + 80);
  for (let index = 0; index < (options.grainLines ?? 12); index += 1) {
    const yy = y + h * (0.18 + random() * 0.68);
    const start = x + w * (0.08 + random() * 0.12);
    const end = x + w * (0.82 + random() * 0.12);
    drawProgressiveContour(
      ctx,
      [
        [start, yy],
        [lerpNumber(start, end, 0.45), yy + (random() - 0.5) * 16],
        [end, yy + (random() - 0.5) * 9],
      ],
      1,
      style,
      { color: options.grainColor || "#8a5c34", alpha: 0.28, size: 1.1, seed: (options.seed ?? 0) + 100 + index },
    );
  }
}

export function drawSimpleFruit(ctx, type, x, y, scale = 1, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  const seed = options.seed ?? hashString(`${type}:${x}:${y}`);
  if (type === "strawberry") {
    fillConstructedShape(
      ctx,
      (path) => {
        path.moveTo(x, y - 16 * scale);
        path.bezierCurveTo(x - 24 * scale, y - 13 * scale, x - 21 * scale, y + 22 * scale, x, y + 28 * scale);
        path.bezierCurveTo(x + 21 * scale, y + 22 * scale, x + 24 * scale, y - 13 * scale, x, y - 16 * scale);
        path.closePath();
      },
      { x: x - 25 * scale, y: y - 18 * scale, w: 50 * scale, h: 50 * scale },
      { fill: style.red, material: style.accentTool, seed, style: options.style, patternAlpha: 0.46, scumble: 4, strokeWidth: 1.8 },
    );
    drawLeafCrown(ctx, x, y - 17 * scale, scale, { ...options, seed: seed + 4 });
    return;
  }

  if (type === "blueberry") {
    fillConstructedShape(ctx, (path) => ellipsePath(path, x, y, 13 * scale, 12 * scale, 0.1), { x: x - 15 * scale, y: y - 14 * scale, w: 30 * scale, h: 28 * scale }, {
      fill: options.fill || style.blue,
      material: "colored-pencil",
      seed,
      style: options.style,
      patternAlpha: 0.44,
      scumble: 2,
      strokeWidth: 1.4,
    });
    return;
  }

  if (type === "kiwi") {
    fillConstructedShape(ctx, (path) => ellipsePath(path, x, y, 17 * scale, 13 * scale, -0.2), { x: x - 19 * scale, y: y - 15 * scale, w: 38 * scale, h: 30 * scale }, {
      fill: "#94a94b",
      material: "colored-pencil",
      seed,
      style: options.style,
      patternAlpha: 0.45,
      scumble: 3,
      strokeWidth: 1.5,
    });
    ctx.save();
    ctx.strokeStyle = style.ink;
    ctx.globalAlpha = 0.48;
    ctx.lineWidth = 0.8 * scale;
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * TAU;
      line(ctx, x, y, x + Math.cos(angle) * 11 * scale, y + Math.sin(angle) * 8 * scale);
    }
    ctx.restore();
    return;
  }

  const color = type === "orange" ? "#d9892e" : type === "apple" ? "#cf533f" : style.yellow;
  fillConstructedShape(ctx, (path) => ellipsePath(path, x, y, 16 * scale, 15 * scale, 0.05), { x: x - 18 * scale, y: y - 17 * scale, w: 36 * scale, h: 34 * scale }, {
    fill: color,
    material: style.accentTool,
    seed,
    style: options.style,
    patternAlpha: 0.43,
    scumble: 3,
    strokeWidth: 1.6,
  });
}

export function drawReadableLabel(ctx, text, x, y, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  const background = options.background || "#fff8ea";
  const readable = ensureReadableColor(options.color || style.ink, background, { minContrast: options.minContrast ?? 4.5 });
  ctx.save();
  ctx.fillStyle = readable.color;
  ctx.textAlign = options.align || "center";
  ctx.textBaseline = options.baseline || "middle";
  ctx.font = options.font || "700 20px Avenir Next, Trebuchet MS, Verdana, sans-serif";
  ctx.fillText(text, x, y);
  ctx.restore();
  return readable;
}

export function drawMotionTicks(ctx, x, y, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  const count = options.count ?? 3;
  const spread = options.spread ?? 18;
  const angle = options.angle ?? -0.8;
  for (let index = 0; index < count; index += 1) {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const local = angle + (t - 0.5) * (options.angleSpread ?? 0.8);
    const px = x + (t - 0.5) * spread;
    const py = y + Math.sin(t * Math.PI) * (options.arc ?? 8);
    drawProgressiveContour(
      ctx,
      [
        [px, py],
        [px + Math.cos(local) * (options.length ?? 18), py + Math.sin(local) * (options.length ?? 18)],
      ],
      options.progress ?? 1,
      style,
      { color: options.color || style.ink, alpha: options.alpha ?? 0.58, size: options.size ?? 1.6, seed: (options.seed ?? 0) + index },
    );
  }
}

export function roundedRectPath(ctx, x, y, w, h, radius = 8) {
  const r = Math.min(radius, w / 2, h / 2);
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

export function ellipsePath(ctx, x, y, rx, ry, rotation = 0) {
  ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
}

export function capsulePath(ctx, start, end, radius) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const normal = angle + Math.PI / 2;
  ctx.moveTo(start.x + Math.cos(normal) * radius, start.y + Math.sin(normal) * radius);
  ctx.lineTo(end.x + Math.cos(normal) * radius, end.y + Math.sin(normal) * radius);
  ctx.arc(end.x, end.y, radius, normal, normal + Math.PI);
  ctx.lineTo(start.x - Math.cos(normal) * radius, start.y - Math.sin(normal) * radius);
  ctx.arc(start.x, start.y, radius, normal + Math.PI, normal);
  ctx.closePath();
}

export function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function normalizeBounds(bounds) {
  return {
    x: bounds?.x ?? 0,
    y: bounds?.y ?? 0,
    w: bounds?.w ?? bounds?.width ?? 1,
    h: bounds?.h ?? bounds?.height ?? 1,
  };
}

function pointToArray(point) {
  return [point.x, point.y];
}

function partialPolyline(points, progress = 1) {
  const safe = clamp(progress);
  if (safe >= 0.999) return points;
  if (safe <= 0 || points.length < 2) return [];

  const lengths = [];
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    lengths.push(length);
    total += length;
  }

  const target = total * safe;
  const partial = [points[0]];
  let walked = 0;
  for (let index = 0; index < lengths.length; index += 1) {
    const segment = lengths[index];
    const a = points[index];
    const b = points[index + 1];
    if (walked + segment <= target) {
      partial.push(b);
      walked += segment;
      continue;
    }
    const localT = segment <= 0 ? 0 : (target - walked) / segment;
    partial.push([lerpNumber(a[0], b[0], localT), lerpNumber(a[1], b[1], localT)]);
    break;
  }
  return partial;
}

function drawThickMaterialStroke(ctx, points, width, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  ctx.save();
  ctx.strokeStyle = options.fill || style.skin;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const point = points[index];
    ctx.quadraticCurveTo(prev[0], prev[1], (prev[0] + point[0]) / 2, (prev[1] + point[1]) / 2);
  }
  ctx.stroke();
  ctx.restore();

  drawMaterialBrushStroke(ctx, points, options.material || style.colorTool, {
    color: options.fill || style.skin,
    alpha: options.alpha ?? 0.42,
    seed: options.seed,
    patternWidth: width * 0.55,
    tool: { size: Math.max(5, width * 0.22), ...(options.tool || {}) },
  });
}

function drawHairBack(ctx, anchor, options = {}) {
  const style = options.style || resolveIllustrationStyle();
  const scale = options.scale ?? 1;
  const tilt = options.tilt ?? 0;
  const bun = rotateAround({ x: anchor.x + 42 * scale, y: anchor.y - 58 * scale }, anchor, tilt);
  fillConstructedShape(ctx, (path) => ellipsePath(path, bun.x, bun.y, 40 * scale, 48 * scale, tilt + 0.42), { x: bun.x - 46 * scale, y: bun.y - 52 * scale, w: 92 * scale, h: 104 * scale }, {
    fill: options.hair || style.hair,
    material: "oil-crayon",
    seed: options.seed,
    style: options.styleName,
    patternAlpha: 0.5,
    scumble: 10,
    strokeWidth: 1.9,
  });

  for (let index = 0; index < 7; index += 1) {
    const angle = -1.2 + index * 0.42;
    drawMaterialBrushStroke(
      ctx,
      [
        [bun.x + Math.cos(angle) * 12 * scale, bun.y + Math.sin(angle) * 13 * scale],
        [bun.x + Math.cos(angle + 0.45) * 36 * scale, bun.y + Math.sin(angle + 0.45) * 42 * scale],
      ],
      style.hairTool,
      {
        color: index % 2 === 0 ? style.hairHighlight : style.hair,
        alpha: 0.35,
        tool: { size: 2.3 * scale },
        seed: (options.seed ?? 0) + 20 + index,
      },
    );
  }
}

function peaceHandPoints() {
  return [
    [-22, 58],
    [-36, 42],
    [-38, 22],
    [-54, 12],
    [-46, -5],
    [-30, 4],
    [-30, -28],
    [-34, -66],
    [-18, -78],
    [-8, -22],
    [2, -82],
    [20, -80],
    [15, -18],
    [36, -38],
    [48, -24],
    [27, 2],
    [38, 22],
    [24, 42],
    [6, 48],
    [-4, 68],
  ];
}

function openHandPoints() {
  return [
    [-50, 28],
    [-34, 16],
    [-28, 0],
    [-58, -20],
    [-45, -38],
    [-17, -14],
    [-24, -56],
    [-6, -66],
    [2, -20],
    [16, -62],
    [34, -58],
    [25, -16],
    [58, -36],
    [70, -20],
    [38, 4],
    [54, 20],
    [36, 34],
    [12, 28],
    [-8, 34],
    [-28, 36],
  ];
}

function peaceHandCreases() {
  return [
    [[-10, -16], [2, -10], [14, -17]],
    [[-22, 12], [-4, 20], [18, 12]],
    [[-30, 36], [-8, 30], [14, 34]],
    [[-24, 58], [-4, 64], [10, 62]],
  ];
}

function openHandCreases() {
  return [
    [[-24, 2], [-10, 10], [8, 7]],
    [[-18, 22], [3, 18], [22, 23]],
    [[-34, 16], [-18, 2]],
    [[24, -12], [28, 0]],
    [[8, -18], [10, -4]],
  ];
}

function smoothClosedPath(path, points) {
  if (!points.length) return;
  path.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    path.quadraticCurveTo(previous[0], previous[1], (previous[0] + point[0]) / 2, (previous[1] + point[1]) / 2);
  }
  const last = points[points.length - 1];
  const first = points[0];
  path.quadraticCurveTo(last[0], last[1], (last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  path.closePath();
}

function jitterPolyline(points, seed, amount = 1) {
  const random = seededRandom(seed);
  return points.map(([x, y]) => [x + (random() - 0.5) * amount, y + (random() - 0.5) * amount]);
}

function drawHairCap(ctx, anchor, options = {}) {
  const style = options.style || resolveIllustrationStyle();
  const scale = options.scale ?? 1;
  const tilt = options.tilt ?? 0;
  const random = seededRandom(options.seed ?? 0);
  const capPoints = [
    rotateAround({ x: anchor.x - 50 * scale, y: anchor.y - 20 * scale }, anchor, tilt),
    rotateAround({ x: anchor.x - 36 * scale, y: anchor.y - 62 * scale }, anchor, tilt),
    rotateAround({ x: anchor.x + 18 * scale, y: anchor.y - 68 * scale }, anchor, tilt),
    rotateAround({ x: anchor.x + 48 * scale, y: anchor.y - 20 * scale }, anchor, tilt),
  ];

  fillConstructedShape(
    ctx,
    (path) => {
      path.moveTo(capPoints[0].x, capPoints[0].y);
      path.bezierCurveTo(capPoints[1].x, capPoints[1].y, capPoints[2].x, capPoints[2].y, capPoints[3].x, capPoints[3].y);
      path.bezierCurveTo(anchor.x + 18 * scale, anchor.y - 38 * scale, anchor.x - 10 * scale, anchor.y - 34 * scale, capPoints[0].x, capPoints[0].y);
      path.closePath();
    },
    { x: anchor.x - 60 * scale, y: anchor.y - 76 * scale, w: 124 * scale, h: 86 * scale },
    {
      fill: options.hair || style.hair,
      material: "oil-crayon",
      seed: options.seed,
      style: options.styleName,
      patternAlpha: 0.5,
      scumble: 8,
      strokeWidth: 1.9,
    },
  );

  for (let index = 0; index < 9; index += 1) {
    const sx = anchor.x - 42 * scale + random() * 84 * scale;
    const sy = anchor.y - 55 * scale + random() * 22 * scale;
    drawMaterialBrushStroke(
      ctx,
      [
        [sx, sy],
        [sx - 8 * scale + random() * 16 * scale, sy + 22 * scale],
        [sx - 14 * scale + random() * 24 * scale, sy + 44 * scale],
      ],
      style.hairTool,
      {
        color: index % 3 === 0 ? style.hairHighlight : style.hair,
        alpha: 0.45,
        tool: { size: 1.9 * scale },
        seed: (options.seed ?? 0) + 30 + index,
      },
    );
  }
}

function drawFaceFeatures(ctx, anchor, options = {}) {
  const style = options.style || resolveIllustrationStyle();
  const scale = options.scale ?? 1;
  const tilt = options.tilt ?? 0;
  const mood = options.mood || "soft";
  const leftEye = rotateAround({ x: anchor.x - 17 * scale, y: anchor.y - 8 * scale }, anchor, tilt);
  const rightEye = rotateAround({ x: anchor.x + 17 * scale, y: anchor.y - 6 * scale }, anchor, tilt);
  const nose = rotateAround({ x: anchor.x + 2 * scale, y: anchor.y + 9 * scale }, anchor, tilt);
  const mouth = mouthAnchor(anchor, { scale, tilt, mood });

  ctx.save();
  ctx.strokeStyle = style.ink;
  ctx.lineCap = "round";
  ctx.lineWidth = 2.05 * scale;
  if (mood === "big-smile") {
    ctx.beginPath();
    ctx.arc(leftEye.x, leftEye.y, 4.6 * scale, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightEye.x, rightEye.y, 4.6 * scale, 0, TAU);
    ctx.stroke();
  } else if (mood === "wonder") {
    ctx.beginPath();
    ctx.arc(leftEye.x, leftEye.y, 5.2 * scale, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightEye.x, rightEye.y, 5.2 * scale, 0, TAU);
    ctx.stroke();
  } else {
    smileArc(ctx, leftEye.x, leftEye.y, 8 * scale, 0.12, Math.PI - 0.12);
    smileArc(ctx, rightEye.x, rightEye.y, 8 * scale, 0.12, Math.PI - 0.12);
  }

  ctx.beginPath();
  ctx.moveTo(nose.x - 2 * scale, nose.y - 8 * scale);
  ctx.quadraticCurveTo(nose.x + 7 * scale, nose.y + 2 * scale, nose.x - 2 * scale, nose.y + 9 * scale);
  ctx.stroke();

  ctx.strokeStyle = mood === "big-smile" ? "#7d2c24" : style.ink;
  ctx.lineWidth = mood === "big-smile" ? 3.2 * scale : 2.1 * scale;
  ctx.beginPath();
  if (mood === "big-smile") {
    ctx.moveTo(mouth.x - 18 * scale, mouth.y - 2 * scale);
    ctx.quadraticCurveTo(mouth.x, mouth.y + 22 * scale, mouth.x + 22 * scale, mouth.y - 2 * scale);
  } else if (mood === "wonder") {
    ctx.ellipse(mouth.x, mouth.y + 2 * scale, 7 * scale, 10 * scale, tilt, 0, TAU);
  } else {
    ctx.moveTo(mouth.x - 11 * scale, mouth.y);
    ctx.quadraticCurveTo(mouth.x, mouth.y + 8 * scale, mouth.x + 13 * scale, mouth.y + 1 * scale);
  }
  ctx.stroke();

  ctx.fillStyle = "rgba(221, 89, 84, 0.2)";
  ctx.beginPath();
  ctx.ellipse(anchor.x - 28 * scale, anchor.y + 22 * scale, 10 * scale, 7 * scale, tilt, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function mouthAnchor(anchor, options = {}) {
  const scale = options.scale ?? 1;
  const tilt = options.tilt ?? 0;
  return rotateAround({ x: anchor.x + 2 * scale, y: anchor.y + 30 * scale }, anchor, tilt);
}

function smileArc(ctx, x, y, radius, start, end) {
  ctx.beginPath();
  ctx.arc(x, y, radius, start, end);
  ctx.stroke();
}

function drawLeafCrown(ctx, x, y, scale, options = {}) {
  const style = resolveIllustrationStyle(options.style);
  ctx.save();
  ctx.strokeStyle = style.green;
  ctx.lineWidth = 2.2 * scale;
  ctx.lineCap = "round";
  for (let index = 0; index < 5; index += 1) {
    const angle = -Math.PI / 2 + (index - 2) * 0.36;
    line(ctx, x, y, x + Math.cos(angle) * 12 * scale, y + Math.sin(angle) * 10 * scale);
  }
  ctx.restore();
}
