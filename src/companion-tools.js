import { createBrush, createRoughCanvas, hashString, seededRandom } from "./inky-canvas.js";
export { drawExtractedPaths, extractPathsFromImage, scaleExtractedPaths } from "./image-path-extractor.js";
export { analyzeStyle } from "./style-analyzer.js";

export const companionToolGuide = Object.freeze({
  roughjs: "Sketchy geometric primitives with explicit roughness, bowing, hachure, and seed controls.",
  atrament: "Live handwriting or captured freehand input with adaptive smoothing and stroke recording.",
  irregular: "Deterministic chunked distortion for wobbly hand-built rectangles, ellipses, and polygons.",
  svg2roughjs: "Optional browser SVG-to-RoughJS sketch conversion for crisp source SVGs.",
  imagePaths: "Browser image-to-path extraction for turning reference pixels into drawable path coordinates.",
  styleAnalysis: "Browser style-reference analysis for palette, texture grain, and brush parameter hints.",
  vivus: "DOM/SVG draw-on animation for paths that should visibly write themselves in real time.",
  p5Brush: "Optional p5.brush standalone runtime for natural media marks, hatching, washes, and flow fields.",
});

export function createIrregularPoints(points, options = {}) {
  const normalized = normalizePoints(points);
  if (normalized.length < 2) return normalized;

  const seed = options.seed ?? hashString(`irregular:${JSON.stringify(normalized)}`);
  const random = seededRandom(seed);
  const chunkLength = Math.max(2, Number(options.chunkLength ?? 18));
  const jitter = Number(options.jitter ?? 2.5);
  const normalJitter = Number(options.normalJitter ?? jitter);
  const tangentJitter = Number(options.tangentJitter ?? jitter * 0.35);
  const closed = Boolean(options.closed);
  const source = closed ? [...normalized, normalized[0]] : normalized;
  const distorted = [];

  for (let index = 0; index < source.length - 1; index += 1) {
    const a = source[index];
    const b = source[index + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.max(0.0001, Math.hypot(dx, dy));
    const steps = Math.max(1, Math.ceil(length / chunkLength));
    const nx = -dy / length;
    const ny = dx / length;
    const tx = dx / length;
    const ty = dy / length;

    for (let step = 0; step <= steps; step += 1) {
      if (distorted.length && step === 0) continue;
      const t = step / steps;
      const edgeEase = Math.sin(Math.PI * t);
      const normalOffset = (random() - 0.5) * 2 * normalJitter * (options.distortEndpoints ? 1 : edgeEase);
      const tangentOffset = (random() - 0.5) * 2 * tangentJitter * edgeEase;
      distorted.push([
        a[0] + dx * t + nx * normalOffset + tx * tangentOffset,
        a[1] + dy * t + ny * normalOffset + ty * tangentOffset,
      ]);
    }
  }

  return options.smoothing ? smoothPoints(distorted, options.smoothing) : distorted;
}

export function irregularRect(bounds, options = {}) {
  const box = normalizeBounds(bounds);
  return createIrregularPoints(
    [
      [box.x, box.y],
      [box.x + box.w, box.y],
      [box.x + box.w, box.y + box.h],
      [box.x, box.y + box.h],
    ],
    { closed: true, ...options },
  );
}

export function irregularEllipse(bounds, options = {}) {
  const box = normalizeBounds(bounds);
  const steps = Math.max(12, Math.round(options.steps ?? 40));
  const points = [];
  for (let index = 0; index < steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    points.push([
      box.x + box.w / 2 + Math.cos(angle) * (box.w / 2),
      box.y + box.h / 2 + Math.sin(angle) * (box.h / 2),
    ]);
  }
  return createIrregularPoints(points, { closed: true, chunkLength: Math.max(3, (box.w + box.h) / steps), ...options });
}

export function irregularPolygon(points, options = {}) {
  return createIrregularPoints(points, { closed: true, ...options });
}

export function drawIrregularShape(ctx, points, options = {}) {
  if (!ctx) return [];
  const irregular = createIrregularPoints(points, options);
  const closed = options.closed ?? true;

  ctx.save();
  if (options.fill) {
    ctx.globalAlpha = options.fillOpacity ?? 1;
    ctx.fillStyle = typeof options.fill === "string" ? options.fill : options.color || "#17120d";
    tracePoints(ctx, irregular, { closed });
    ctx.fill(options.fillRule || "nonzero");
  }

  if (options.stroke !== false) {
    const brush =
      options.brush ||
      createBrush({
        type: "irregular-line",
        color: options.stroke || options.color || "#17120d",
        size: options.size ?? 2,
        thinning: options.thinning ?? 0.25,
        jitter: options.strokeJitter ?? 0.15,
        seed: (options.seed ?? 1) + 404,
        opacity: options.opacity ?? 1,
      });
    brush.stroke(ctx, closed ? ensureClosed(irregular) : irregular, options.brushOverrides || {});
  }
  ctx.restore();
  return irregular;
}

export function drawRoughShape(ctx, shape, options = {}) {
  const rc = createRoughCanvas(ctx, options.roughCanvasOptions);
  if (!rc || !shape?.kind) return false;
  const roughOptions = {
    seed: options.seed ?? 1,
    roughness: options.roughness ?? 0.9,
    bowing: options.bowing ?? 0.55,
    stroke: options.stroke || options.color || "#17120d",
    strokeWidth: options.strokeWidth ?? options.size ?? 1.8,
    fill: options.fill,
    fillStyle: options.fillStyle || "hachure",
    hachureGap: options.hachureGap ?? 8,
    hachureAngle: options.hachureAngle ?? -35,
    ...options.roughOptions,
  };

  ctx.save();
  ctx.globalAlpha = options.opacity ?? 1;
  if (shape.kind === "rect") rc.rectangle(shape.x, shape.y, shape.w, shape.h, roughOptions);
  else if (shape.kind === "ellipse") rc.ellipse(shape.cx, shape.cy, shape.w, shape.h, roughOptions);
  else if (shape.kind === "circle") rc.circle(shape.cx, shape.cy, shape.diameter, roughOptions);
  else if (shape.kind === "line") rc.line(shape.x1, shape.y1, shape.x2, shape.y2, roughOptions);
  else if (shape.kind === "polygon") rc.polygon(shape.points, roughOptions);
  else if (shape.kind === "path") rc.path(shape.d, roughOptions);
  else {
    ctx.restore();
    return false;
  }
  ctx.restore();
  return true;
}

export async function createAtramentRecorder(canvas, options = {}) {
  const mod = await import("atrament");
  const Atrament = mod.default || mod.Atrament;
  if (!Atrament) throw new Error("Atrament could not be loaded.");

  const atrament = new Atrament(canvas, options);
  atrament.recordStrokes = options.recordStrokes ?? true;
  if (options.weight != null) atrament.weight = Number(options.weight);
  if (options.color) atrament.color = options.color;
  if (options.smoothing != null) atrament.smoothing = Number(options.smoothing);
  if (options.adaptiveStroke != null) atrament.adaptiveStroke = Boolean(options.adaptiveStroke);

  const strokes = [];
  const onRecorded = ({ stroke }) => {
    strokes.push(normalizeAtramentStroke(stroke));
  };
  atrament.addEventListener("strokerecorded", onRecorded);

  return {
    atrament,
    modes: {
      draw: mod.MODE_DRAW,
      erase: mod.MODE_ERASE,
      fill: mod.MODE_FILL,
      disabled: mod.MODE_DISABLED,
    },
    strokes,
    clear() {
      atrament.clear();
      strokes.length = 0;
    },
    destroy() {
      atrament.removeEventListener("strokerecorded", onRecorded);
      atrament.destroy();
    },
    replay(ctx, replayOptions = {}) {
      return strokes.map((stroke) => replayAtramentStroke(ctx, stroke, replayOptions));
    },
  };
}

export function atramentStrokeToPoints(stroke, options = {}) {
  const scaleX = Number(options.scaleX ?? 1);
  const scaleY = Number(options.scaleY ?? 1);
  return (stroke?.segments || [])
    .map((segment) => {
      const point = segment.point || segment;
      const x = Number(point.x);
      const y = Number(point.y);
      const pressure = Number(segment.pressure ?? point.pressure ?? 0.5);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return [x * scaleX, y * scaleY, Number.isFinite(pressure) ? pressure : 0.5];
    })
    .filter(Boolean);
}

export function replayAtramentStroke(ctx, stroke, options = {}) {
  const points = atramentStrokeToPoints(stroke, options);
  if (points.length < 2) return null;
  const brush =
    options.brush ||
    createBrush({
      type: "atrament-replay",
      color: options.color || stroke.color || "#17120d",
      size: options.size ?? stroke.weight ?? 2,
      smoothing: options.smoothing ?? stroke.smoothing ?? 0.5,
      thinning: options.thinning ?? 0.45,
      streamline: options.streamline ?? 0.18,
      jitter: options.jitter ?? 0,
      seed: options.seed ?? hashString(`atrament:${points.length}`),
      pressure: options.pressure ?? false,
      opacity: options.opacity ?? 1,
    });
  return brush.stroke(ctx, points, options.brushOverrides || {});
}

export async function createVivusDrawOn(target, options = {}, callback) {
  const mod = await import("vivus");
  const Vivus = mod.default || mod.Vivus;
  if (!Vivus) throw new Error("Vivus could not be loaded.");
  return new Vivus(
    target,
    {
      type: "oneByOne",
      start: "manual",
      duration: 96,
      ...options,
    },
    callback,
  );
}

export async function loadP5Brush(options = {}) {
  if (options.standalone === false) return import("p5.brush");
  return import("p5.brush/standalone");
}

export async function createP5BrushCanvas(canvas, options = {}) {
  const brush = await loadP5Brush({ standalone: true });
  if (typeof brush.load === "function") brush.load(canvas);
  if (options.seed != null && typeof brush.seed === "function") brush.seed(Number(options.seed));
  if (options.noiseSeed != null && typeof brush.noiseSeed === "function") brush.noiseSeed(Number(options.noiseSeed));
  if (options.scaleBrushes != null && typeof brush.scaleBrushes === "function") brush.scaleBrushes(Number(options.scaleBrushes));
  return brush;
}

export async function createSvg2RoughSketch({ target, sourceSvg, outputType = "svg", roughConfig = {}, options = {} } = {}) {
  const mod = await loadSvg2Roughjs(options);
  const Svg2Roughjs = mod.Svg2Roughjs;
  if (!Svg2Roughjs) throw new Error("svg2roughjs loaded but did not expose Svg2Roughjs.");

  const converter = new Svg2Roughjs(target, resolveSvg2RoughOutputType(mod.OutputType, outputType), roughConfig);
  converter.svg = resolveSvgElement(sourceSvg);
  for (const [key, value] of Object.entries(options.properties || {})) {
    converter[key] = value;
  }
  const result = await converter.sketch(true);
  return { converter, result };
}

export async function loadSvg2Roughjs(options = {}) {
  if (globalThis.svg2roughjs?.Svg2Roughjs) return globalThis.svg2roughjs;

  const scriptUrls = options.scriptUrls || [
    "/node_modules/svg2roughjs/dist/svg2roughjs.umd.min.js",
    "https://unpkg.com/svg2roughjs@3.2.3/dist/svg2roughjs.umd.min.js",
  ];

  if (typeof document === "undefined") {
    throw new Error("svg2roughjs sketching is browser-only in Inky. Use it from the preview or a browser render page.");
  }

  let lastError = null;
  for (const url of scriptUrls) {
    try {
      await loadScriptOnce(url);
      if (globalThis.svg2roughjs?.Svg2Roughjs) return globalThis.svg2roughjs;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Could not load svg2roughjs. ${lastError?.message || "No script source exposed Svg2Roughjs."}`);
}

function normalizeAtramentStroke(stroke = {}) {
  return {
    mode: stroke.mode,
    weight: stroke.weight,
    smoothing: stroke.smoothing,
    color: stroke.color,
    adaptiveStroke: stroke.adaptiveStroke,
    segments: (stroke.segments || []).map((segment) => ({
      point: {
        x: Number(segment.point?.x ?? segment.x ?? 0),
        y: Number(segment.point?.y ?? segment.y ?? 0),
      },
      time: Number(segment.time ?? 0),
      pressure: Number(segment.pressure ?? 0.5),
    })),
  };
}

function resolveSvg2RoughOutputType(OutputType, value) {
  if (!OutputType) return undefined;
  if (typeof value === "number") return value;
  return String(value).toLowerCase() === "canvas" ? OutputType.CANVAS : OutputType.SVG;
}

function resolveSvgElement(sourceSvg) {
  if (typeof SVGSVGElement !== "undefined" && sourceSvg instanceof SVGSVGElement) return sourceSvg;
  if (typeof sourceSvg === "string") {
    const found = document.querySelector(sourceSvg);
    if (typeof SVGSVGElement !== "undefined" && found instanceof SVGSVGElement) return found;
    const parsed = new DOMParser().parseFromString(sourceSvg, "image/svg+xml").documentElement;
    if (typeof SVGSVGElement !== "undefined" && parsed instanceof SVGSVGElement) return parsed;
  }
  throw new Error("sourceSvg must be an SVG element, selector, or SVG markup string.");
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find((script) => script.dataset.inkyCompanionSrc === src);
    if (existing?.dataset.loaded === "true") {
      resolve(existing);
      return;
    }

    const script = existing || document.createElement("script");
    script.dataset.inkyCompanionSrc = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve(script);
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    if (!existing) {
      script.src = src;
      document.head.append(script);
    }
  });
}

function normalizePoints(points) {
  return (points || [])
    .map((point) => {
      if (Array.isArray(point)) return [Number(point[0]), Number(point[1])];
      return [Number(point?.x), Number(point?.y)];
    })
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
}

function normalizeBounds(bounds = {}) {
  if (Array.isArray(bounds)) {
    return {
      x: Number(bounds[0]) || 0,
      y: Number(bounds[1]) || 0,
      w: Number(bounds[2]) || 0,
      h: Number(bounds[3]) || 0,
    };
  }
  return {
    x: Number(bounds.x ?? bounds.left ?? 0),
    y: Number(bounds.y ?? bounds.top ?? 0),
    w: Number(bounds.w ?? bounds.width ?? 0),
    h: Number(bounds.h ?? bounds.height ?? 0),
  };
}

function smoothPoints(points, amount = 0.5) {
  const alpha = Math.min(0.95, Math.max(0, Number(amount)));
  return points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    return [
      point[0] * (1 - alpha) + ((previous[0] + next[0]) / 2) * alpha,
      point[1] * (1 - alpha) + ((previous[1] + next[1]) / 2) * alpha,
    ];
  });
}

function tracePoints(ctx, points, options = {}) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (options.closed) ctx.closePath();
}

function ensureClosed(points) {
  if (!points.length) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points;
  return [...points, first];
}
