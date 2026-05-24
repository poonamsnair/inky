import { getStroke } from "perfect-freehand";
import rough from "roughjs";

const TAU = Math.PI * 2;

export { rough };

export const easings = Object.freeze({
  linear: (t) => t,
  smoothstep: (t) => t * t * (3 - 2 * t),
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  anticipate: (t) => t * t * (2.7 * t - 1.7),
  settle: (t) => 1 - Math.cos((t * Math.PI) / 2) * (1 - t * 0.08),
  bounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
});

const DEFAULT_BRUSH = {
  type: "pen",
  color: "#17120d",
  size: 3,
  thinning: 0.45,
  smoothing: 0.35,
  streamline: 0.22,
  jitter: 0,
  roughness: 0,
  opacity: 1,
  seed: 1,
  composite: "source-over",
  texture: false,
  textureScale: 1,
  smudge: 0,
  simulatePressure: false,
  pressure: {
    enabled: true,
    base: 0.55,
    amplitude: 0.08,
    frequency: 1.4,
    noise: 0.035,
    midSwell: 0.1,
    min: 0.18,
    max: 0.98,
    startRamp: 0.05,
    endRamp: 0.08,
  },
  inkFlow: {
    enabled: false,
    startOpacity: 1,
    endOpacity: 0.82,
    amplitude: 0.04,
    frequency: 2.1,
    dryness: 0.04,
    dryStart: 0.65,
    min: 0.5,
    max: 1.05,
    segments: 8,
  },
};

const MEDIA_BRUSH_NAMES = Object.freeze(["pencil", "charcoal", "crayon", "watercolor"]);

const MEDIA_BRUSH_PRESETS = Object.freeze({
  pencil: {
    type: "pencil",
    color: "#312b25",
    size: 2.1,
    thinning: 0.2,
    smoothing: 0.22,
    streamline: 0.12,
    jitter: 0.45,
    roughness: 0.35,
    opacity: 0.72,
    textureScale: 0.9,
    pressure: { base: 0.42, amplitude: 0.1, noise: 0.16, midSwell: 0.03, min: 0.16, max: 0.82 },
    texture: {
      name: "pencil",
      asset: "/textures/brushes/pencil-medium.svg",
      tile: 72,
      alpha: 0.78,
      baseOpacity: 0.18,
      density: 0.45,
      contrast: 0.5,
      direction: -0.28,
      seed: 101,
    },
  },
  charcoal: {
    type: "charcoal",
    color: "#1f1b18",
    size: 5.8,
    thinning: 0.08,
    smoothing: 0.42,
    streamline: 0.18,
    jitter: 0.75,
    roughness: 0.65,
    opacity: 0.64,
    textureScale: 1.15,
    smudge: 0.35,
    pressure: { base: 0.5, amplitude: 0.12, noise: 0.2, midSwell: 0.12, min: 0.18, max: 0.9 },
    texture: {
      name: "charcoal",
      asset: "/textures/brushes/charcoal-medium.svg",
      tile: 96,
      alpha: 0.86,
      baseOpacity: 0.16,
      density: 0.64,
      contrast: 0.72,
      direction: 0.18,
      seed: 202,
    },
  },
  crayon: {
    type: "crayon",
    color: "#b35a3c",
    size: 6.2,
    thinning: 0.05,
    smoothing: 0.3,
    streamline: 0.16,
    jitter: 0.55,
    roughness: 0.55,
    opacity: 0.82,
    textureScale: 1,
    pressure: { base: 0.54, amplitude: 0.06, noise: 0.12, midSwell: 0.06, min: 0.2, max: 0.92 },
    texture: {
      name: "crayon",
      asset: "/textures/brushes/crayon-medium.svg",
      tile: 88,
      alpha: 0.92,
      baseOpacity: 0.22,
      density: 0.58,
      contrast: 0.82,
      direction: -0.7,
      seed: 303,
    },
  },
  watercolor: {
    type: "watercolor",
    color: "#4f8fa8",
    size: 8,
    thinning: 0.18,
    smoothing: 0.62,
    streamline: 0.32,
    jitter: 0.25,
    roughness: 0.18,
    opacity: 0.46,
    textureScale: 1.25,
    smudge: 0.45,
    pressure: { base: 0.6, amplitude: 0.08, noise: 0.08, midSwell: 0.08, min: 0.22, max: 0.96 },
    inkFlow: { enabled: true, startOpacity: 0.82, endOpacity: 0.56, amplitude: 0.08, dryness: 0.03, segments: 10 },
    texture: {
      name: "watercolor",
      asset: "/textures/brushes/watercolor-medium.svg",
      tile: 112,
      alpha: 0.72,
      baseOpacity: 0.42,
      density: 0.36,
      contrast: 0.38,
      direction: 0.4,
      seed: 404,
    },
  },
});

const TEXTURE_CANVAS_CACHE = new Map();
const CSS_COLOR_CACHE = new Map();

export function listBrushes() {
  return [...MEDIA_BRUSH_NAMES];
}

export function getBrushPreset(name) {
  const preset = MEDIA_BRUSH_PRESETS[String(name || "").trim().toLowerCase()];
  return preset ? cloneConfig(preset) : null;
}

export function createBrush(config = {}) {
  const baseConfig = normalizeBrushConfig(config);

  return {
    get config() {
      return cloneConfig(baseConfig);
    },
    clone(overrides = {}) {
      return createBrush(mergeBrushConfig(baseConfig, overrides));
    },
    stroke(ctx, points, overrides = {}) {
      return drawBrushStroke(ctx, points, mergeBrushConfig(baseConfig, overrides));
    },
    polyline(ctx, points, overrides = {}) {
      return drawPolyline(ctx, points, mergeBrushConfig(baseConfig, overrides));
    },
    fill(ctx, path, overrides = {}) {
      return fillPath(ctx, path, mergeBrushConfig(baseConfig, overrides));
    },
    hatch(ctx, bounds, overrides = {}) {
      return hatch(ctx, bounds, { ...mergeBrushConfig(baseConfig, overrides), brush: this });
    },
    dot(ctx, x, y, overrides = {}) {
      return dot(ctx, x, y, mergeBrushConfig(baseConfig, overrides));
    },
  };
}

export function drawBrushStroke(ctx, points, config = {}) {
  if (!ctx || !Array.isArray(points) || points.length === 0) return null;

  const brush = normalizeBrushConfig(config);
  const preparedPoints = prepareBrushPoints(points, brush);
  const windows = inkWindows(preparedPoints, brush);

  ctx.save();
  ctx.globalCompositeOperation = brush.composite || "source-over";
  if (brush.smudge && "filter" in ctx) ctx.filter = `blur(${Math.max(0, Number(brush.smudge))}px)`;

  for (const window of windows) {
    ctx.globalAlpha = clamp01((brush.opacity ?? 1) * window.opacity);
    drawStrokeShape(ctx, window.points, brush);
  }

  ctx.restore();
  return {
    type: brush.type,
    points: preparedPoints,
    config: cloneConfig(brush),
  };
}

export function drawPolyline(ctx, points, options = {}) {
  if (!ctx || !Array.isArray(points) || points.length < 2) return false;
  const config = normalizeBrushConfig(options);
  const preparedPoints = prepareBrushPoints(points, { ...config, pressure: false, inkFlow: false });

  ctx.save();
  ctx.globalAlpha = clamp01(config.opacity ?? 1);
  ctx.globalCompositeOperation = config.composite || "source-over";
  if (config.smudge && "filter" in ctx) ctx.filter = `blur(${Math.max(0, Number(config.smudge))}px)`;
  ctx.lineWidth = config.size;
  ctx.lineCap = config.lineCap || "round";
  ctx.lineJoin = config.lineJoin || "round";
  ctx.beginPath();
  preparedPoints.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  strokeCurrentPathWithBrush(ctx, config);
  ctx.restore();
  return true;
}

export function drawPath(ctx, path, options = {}) {
  if (!ctx || !path) return false;
  const config = normalizeBrushConfig(options);
  const path2d = isPath2D(path) ? path : null;

  ctx.save();
  ctx.globalAlpha = clamp01(config.opacity ?? 1);
  ctx.globalCompositeOperation = config.composite || "source-over";
  if (config.smudge && "filter" in ctx) ctx.filter = `blur(${Math.max(0, Number(config.smudge))}px)`;
  if (!path2d) beginDrawablePath(ctx, path);

  if (options.fill) {
    if (typeof options.fill === "string") fillCurrentPathSolid(ctx, options.fill, path2d, options.fillRule || "nonzero");
    else fillCurrentPathWithBrush(ctx, config, path2d, options.fillRule || "nonzero");
  }

  if (options.stroke !== false) {
    ctx.lineWidth = options.lineWidth ?? config.size;
    ctx.lineCap = options.lineCap || "round";
    ctx.lineJoin = options.lineJoin || "round";
    const strokeColor = typeof options.stroke === "string" ? options.stroke : config.color;
    strokeCurrentPathWithBrush(ctx, { ...config, color: strokeColor }, path2d);
  }

  ctx.restore();
  return true;
}

export function fillPath(ctx, path, options = {}) {
  return drawPath(ctx, path, {
    ...options,
    fill: options.fill ?? true,
    stroke: options.stroke ?? false,
  });
}

export function hatch(ctx, bounds, options = {}) {
  if (!ctx) return false;
  const box = normalizeBounds(bounds);
  const angle = options.angle ?? -Math.PI / 5;
  const gap = Math.max(1, options.gap ?? 12);
  const overdraw = Math.hypot(box.w, box.h);
  const count = Math.ceil((box.w + box.h + overdraw) / gap);
  const brush = options.brush?.stroke ? options.brush : createBrush(options.brushConfig || options);
  const seed = options.seed ?? 1;
  const random = seededRandom(seed);

  ctx.save();
  if (options.clipPath) {
    beginDrawablePath(ctx, options.clipPath);
    ctx.clip(options.fillRule || "nonzero");
  } else {
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
  }

  for (let index = -count; index <= count; index += 1) {
    const offset = index * gap + (random() - 0.5) * (options.jitter ?? 0);
    const cx = box.x + box.w / 2 + Math.cos(angle + Math.PI / 2) * offset;
    const cy = box.y + box.h / 2 + Math.sin(angle + Math.PI / 2) * offset;
    const dx = Math.cos(angle) * overdraw;
    const dy = Math.sin(angle) * overdraw;
    brush.stroke(
      ctx,
      [
        [cx - dx, cy - dy],
        [cx + dx, cy + dy],
      ],
      {
        seed: seed + index + count,
        size: options.size ?? 1.2,
        opacity: options.opacity ?? 0.4,
      },
    );
  }

  ctx.restore();
  return true;
}

export function dot(ctx, x, y, options = {}) {
  if (!ctx) return false;
  const config = normalizeBrushConfig(options);
  const radius = Math.max(0.1, (config.size ?? 3) / 2);
  ctx.save();
  ctx.globalAlpha = clamp01(config.opacity ?? 1);
  ctx.globalCompositeOperation = config.composite || "source-over";
  if (config.smudge && "filter" in ctx) ctx.filter = `blur(${Math.max(0, Number(config.smudge))}px)`;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * (options.aspect ?? 1), options.rotation ?? 0, 0, TAU);
  fillCurrentPathWithBrush(ctx, config);
  ctx.restore();
  return true;
}

export function createRoughCanvas(ctxOrCanvas, options = {}) {
  const canvas = ctxOrCanvas?.canvas || ctxOrCanvas;
  if (!canvas) return null;
  return rough.canvas(canvas, options);
}

export const createRough = createRoughCanvas;

export function keyframe(target, properties = {}, options = {}) {
  const track = {
    target,
    properties,
    from: options.from ?? 0,
    to: options.to ?? 1,
    easing: options.easing ?? "linear",
    valueAt(frameOrTime, totalFrames = 1) {
      const rawTime = resolveTimelineTime(frameOrTime, totalFrames);
      const t = progressBetween(rawTime, track.from, track.to);
      const eased = resolveEasing(track.easing)(t);
      return interpolateProperties(track.properties, eased, {
        frame: frameOrTime,
        totalFrames,
        time: rawTime,
        progress: t,
      });
    },
    apply(frameOrTime, totalFrames = 1) {
      const values = track.valueAt(frameOrTime, totalFrames);
      if (target && typeof target === "object") Object.assign(target, values);
      return target || values;
    },
  };
  return track;
}

export function timeline(frame, totalFrames, tracks = []) {
  const time = resolveTimelineTime(frame, totalFrames);
  const context = { frame, totalFrames, time };
  const list = Array.isArray(tracks) ? tracks : Object.values(tracks);
  const values = [];

  for (const track of list) {
    if (typeof track === "function") {
      values.push(track(context));
    } else if (track?.apply) {
      values.push(track.apply(frame, totalFrames));
    }
  }

  return {
    frame,
    totalFrames,
    time,
    values,
  };
}

export function sequence(...tracks) {
  return tracks.flat();
}

export function lerp(a, b, t) {
  return a + (b - a) * clamp01(t);
}

export function seededRandom(seed = 1) {
  let value = Number(seed) >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < String(value).length; index += 1) {
    hash ^= String(value).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeBrushConfig(config = {}) {
  const input = normalizeBrushInput(config);
  const requestedType = String(input.type ?? input.name ?? DEFAULT_BRUSH.type).trim().toLowerCase();
  const preset = MEDIA_BRUSH_PRESETS[requestedType] || null;
  const base = preset ? mergeBrushConfig(DEFAULT_BRUSH, preset) : DEFAULT_BRUSH;
  const merged = mergeBrushConfig(base, { ...input, type: requestedType || DEFAULT_BRUSH.type });
  merged.seed = Number.isFinite(Number(merged.seed)) ? Number(merged.seed) : hashString(merged.type || "brush");
  merged.size = Math.max(0.1, Number(merged.size) || DEFAULT_BRUSH.size);
  merged.opacity = clamp01(Number(merged.opacity ?? 1));
  merged.roughness = Math.max(0, Number(merged.roughness) || 0);
  merged.texture = normalizeTextureConfig(merged, preset);
  merged.textureScale = merged.texture ? merged.texture.scale : Math.max(0.1, Number(merged.textureScale) || 1);
  merged.smudge = Math.max(0, Number(merged.smudge) || 0);
  return merged;
}

function mergeBrushConfig(base = {}, overrides = {}) {
  const next = {
    ...base,
    ...overrides,
  };
  for (const key of ["pressure", "inkFlow", "start", "end", "freehand", "texture"]) {
    if (isPlainObject(base[key]) && isPlainObject(overrides[key])) {
      next[key] = { ...base[key], ...overrides[key] };
    }
  }
  return next;
}

function cloneConfig(config) {
  return {
    ...config,
    pressure: isPlainObject(config.pressure) ? { ...config.pressure } : config.pressure,
    inkFlow: isPlainObject(config.inkFlow) ? { ...config.inkFlow } : config.inkFlow,
    start: isPlainObject(config.start) ? { ...config.start } : config.start,
    end: isPlainObject(config.end) ? { ...config.end } : config.end,
    freehand: isPlainObject(config.freehand) ? { ...config.freehand } : config.freehand,
    texture: isPlainObject(config.texture) ? { ...config.texture } : config.texture,
  };
}

function prepareBrushPoints(points, brush) {
  const normalized = points.map(normalizePoint).filter(Boolean);
  const progress = pointProgress(normalized);
  const random = seededRandom(brush.seed ?? 1);
  const jitter = (Number(brush.jitter) || 0) + (Number(brush.roughness) || 0) * Math.max(0.5, (brush.size ?? 3) * 0.36);

  return normalized.map((point, index) => {
    const t = progress[index] ?? index / Math.max(1, normalized.length - 1);
    const amount = typeof jitter === "function" ? jitter(t, point, index, random) : Number(jitter) || 0;
    const pressure = point[2] ?? pressureAt(t, brush, index);
    return [
      point[0] + (random() - 0.5) * amount,
      point[1] + (random() - 0.5) * amount,
      pressure,
    ];
  });
}

function normalizeBrushInput(config = {}) {
  if (typeof config === "string") return { type: config };
  if (isPlainObject(config)) return config;
  return {};
}

function normalizeTextureConfig(brush, preset) {
  if (brush.texture === false || brush.texture == null) return false;

  const presetTexture = isPlainObject(preset?.texture) ? preset.texture : {};
  const texture =
    brush.texture === true
      ? { name: brush.type }
      : typeof brush.texture === "string"
        ? { name: brush.texture }
        : isPlainObject(brush.texture)
          ? brush.texture
          : {};
  const name = String(texture.name || presetTexture.name || brush.type || "pencil").trim().toLowerCase();
  const scale = Math.max(0.15, Number(brush.textureScale ?? texture.scale ?? presetTexture.scale ?? 1) || 1);

  return {
    ...presetTexture,
    ...texture,
    enabled: texture.enabled !== false,
    name,
    scale,
    tile: Math.max(24, Math.round(Number(texture.tile ?? presetTexture.tile ?? 72) * scale)),
    alpha: clamp01(texture.alpha ?? presetTexture.alpha ?? 0.8),
    baseOpacity: clamp01(texture.baseOpacity ?? presetTexture.baseOpacity ?? 0.18),
    density: clamp01(texture.density ?? presetTexture.density ?? 0.5),
    contrast: clamp01(texture.contrast ?? presetTexture.contrast ?? 0.5),
    direction: Number(texture.direction ?? presetTexture.direction ?? 0) || 0,
    seed: Number(texture.seed ?? presetTexture.seed ?? brush.seed ?? hashString(name)) || hashString(name),
  };
}

function normalizePoint(point) {
  if (Array.isArray(point)) {
    const x = Number(point[0]);
    const y = Number(point[1]);
    const p = Number(point[2]);
    if (Number.isFinite(x) && Number.isFinite(y)) return Number.isFinite(p) ? [x, y, clamp01(p)] : [x, y];
  }
  if (point && typeof point === "object") {
    const x = Number(point.x ?? point[0]);
    const y = Number(point.y ?? point[1]);
    const p = Number(point.pressure ?? point.p ?? point[2]);
    if (Number.isFinite(x) && Number.isFinite(y)) return Number.isFinite(p) ? [x, y, clamp01(p)] : [x, y];
  }
  return null;
}

function pointProgress(points) {
  if (points.length <= 1) return points.map(() => 0);
  const distances = [0];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    total += Math.hypot(point[0] - previous[0], point[1] - previous[1]);
    distances.push(total);
  }
  if (total <= 0.0001) return points.map((_, index) => index / Math.max(1, points.length - 1));
  return distances.map((distance) => distance / total);
}

function pressureAt(t, brush, index) {
  const pressure = brush.pressure;
  if (pressure === false) return undefined;
  if (typeof pressure === "number") return clamp01(pressure);
  if (typeof pressure === "function") return clamp01(pressure(t, brush, index));

  const flow = isPlainObject(pressure) ? pressure : DEFAULT_BRUSH.pressure;
  if (flow.enabled === false) return undefined;

  const phase = ((brush.seed ?? 1) % 997) / 997;
  const base = flow.base ?? 0.55;
  const wave = Math.sin((t * (flow.frequency ?? 1.4) + phase) * TAU) * (flow.amplitude ?? 0.08);
  const noise = valueNoise(t * (flow.noiseScale ?? 5.5) + index * 0.17, brush.seed ?? 1) * (flow.noise ?? 0.035);
  const swell = Math.sin(Math.PI * t) * (flow.midSwell ?? 0.1);
  const start = smoothstep(t / Math.max(0.001, flow.startRamp ?? 0.05));
  const end = smoothstep((1 - t) / Math.max(0.001, flow.endRamp ?? 0.08));
  const lift = Math.min(start, end);
  return clampValue((base + wave + noise + swell) * lift, flow.min ?? 0.18, flow.max ?? 0.98);
}

function inkWindows(points, brush) {
  const flow = brush.inkFlow;
  if (!isPlainObject(flow) || flow.enabled !== true || points.length < 5) {
    return [{ points, opacity: 1 }];
  }

  const segmentCount = Math.min(flow.segments ?? 8, Math.max(1, Math.floor(points.length / 2)));
  const windows = [];
  const lastIndex = points.length - 1;

  for (let index = 0; index < segmentCount; index += 1) {
    const start = Math.max(0, Math.floor((index / segmentCount) * lastIndex) - 1);
    const end = Math.min(lastIndex, Math.ceil(((index + 1) / segmentCount) * lastIndex) + 1);
    const segment = points.slice(start, end + 1);
    if (segment.length < 2) continue;
    const t = (index + 0.5) / segmentCount;
    windows.push({
      points: segment,
      opacity: inkOpacityAt(t, flow, brush.seed ?? 1),
    });
  }

  return windows.length ? windows : [{ points, opacity: 1 }];
}

function inkOpacityAt(t, flow, seed) {
  const phase = (seed % 991) / 991;
  const drift = lerp(flow.startOpacity ?? 1, flow.endOpacity ?? 0.82, t);
  const wave = Math.sin((t * (flow.frequency ?? 2.1) + phase) * TAU) * (flow.amplitude ?? 0.04);
  const dry = smoothstep((t - (flow.dryStart ?? 0.65)) / Math.max(0.001, 1 - (flow.dryStart ?? 0.65))) * (flow.dryness ?? 0.04);
  return clampValue(drift + wave - dry, flow.min ?? 0.5, flow.max ?? 1.05);
}

function drawStrokeShape(ctx, points, brush) {
  if (points.length === 1) {
    dot(ctx, points[0][0], points[0][1], brush);
    return;
  }

  const stroke = getStroke(points, {
    size: brush.size,
    thinning: brush.thinning,
    smoothing: brush.smoothing,
    streamline: brush.streamline,
    simulatePressure: brush.simulatePressure ?? false,
    easing: resolveEasing(brush.easing),
    start: normalizeTaper(brush.start),
    end: normalizeTaper(brush.end),
    ...(brush.freehand || {}),
  });

  if (!stroke.length) return;

  ctx.beginPath();
  stroke.forEach(([x0, y0], index) => {
    const [x1, y1] = stroke[(index + 1) % stroke.length];
    const midX = (x0 + x1) / 2;
    const midY = (y0 + y1) / 2;
    if (index === 0) ctx.moveTo(midX, midY);
    else ctx.quadraticCurveTo(x0, y0, midX, midY);
  });
  ctx.closePath();
  fillCurrentPathWithBrush(ctx, brush);
}

function fillCurrentPathSolid(ctx, color, path2d, fillRule = "nonzero") {
  ctx.fillStyle = color;
  if (path2d) ctx.fill(path2d, fillRule);
  else ctx.fill(fillRule);
}

function strokeCurrentPathSolid(ctx, color, path2d) {
  ctx.strokeStyle = color;
  if (path2d) ctx.stroke(path2d);
  else ctx.stroke();
}

function fillCurrentPathWithBrush(ctx, brush, path2d, fillRule = "nonzero") {
  const texture = brush.texture;
  const pattern = texture?.enabled ? createBrushPattern(ctx, brush) : null;

  if (!pattern) {
    fillCurrentPathSolid(ctx, brush.color, path2d, fillRule);
    return;
  }

  const previousAlpha = ctx.globalAlpha;
  const baseOpacity = clamp01(texture.baseOpacity ?? 0);
  if (baseOpacity > 0) {
    ctx.globalAlpha = clamp01(previousAlpha * baseOpacity);
    fillCurrentPathSolid(ctx, brush.color, path2d, fillRule);
  }

  ctx.globalAlpha = clamp01(previousAlpha * (texture.alpha ?? 1));
  ctx.fillStyle = pattern;
  if (path2d) ctx.fill(path2d, fillRule);
  else ctx.fill(fillRule);
  ctx.globalAlpha = previousAlpha;
}

function strokeCurrentPathWithBrush(ctx, brush, path2d) {
  const texture = brush.texture;
  const pattern = texture?.enabled ? createBrushPattern(ctx, brush) : null;

  if (!pattern) {
    strokeCurrentPathSolid(ctx, brush.color, path2d);
    return;
  }

  const previousAlpha = ctx.globalAlpha;
  const baseOpacity = clamp01(texture.baseOpacity ?? 0);
  if (baseOpacity > 0) {
    ctx.globalAlpha = clamp01(previousAlpha * baseOpacity);
    strokeCurrentPathSolid(ctx, brush.color, path2d);
  }

  ctx.globalAlpha = clamp01(previousAlpha * (texture.alpha ?? 1));
  ctx.strokeStyle = pattern;
  if (path2d) ctx.stroke(path2d);
  else ctx.stroke();
  ctx.globalAlpha = previousAlpha;
}

function createBrushPattern(ctx, brush) {
  if (!ctx?.createPattern || !brush.texture?.enabled) return null;

  const source = getBrushTextureCanvas(brush);
  if (!source) return null;

  const pattern = ctx.createPattern(source, "repeat");
  if (pattern?.setTransform && typeof DOMMatrix !== "undefined") {
    const offset = ((brush.seed ?? 1) % Math.max(1, brush.texture.tile || 1)) * 0.37;
    pattern.setTransform(new DOMMatrix().translateSelf(offset, offset * 0.6));
  }
  return pattern;
}

function getBrushTextureCanvas(brush) {
  const texture = brush.texture;
  const color = parseBrushColor(brush.color);
  const key = [
    texture.name,
    texture.tile,
    texture.alpha,
    texture.density,
    texture.contrast,
    texture.direction,
    texture.seed,
    color.r,
    color.g,
    color.b,
  ].join("|");

  if (TEXTURE_CANVAS_CACHE.has(key)) return TEXTURE_CANVAS_CACHE.get(key);
  const canvas = createScratchCanvas(texture.tile, texture.tile);
  const textureCtx = canvas?.getContext?.("2d");
  if (!canvas || !textureCtx) return null;

  renderBrushTexture(textureCtx, texture.tile, texture, color);
  if (TEXTURE_CANVAS_CACHE.size > 96) TEXTURE_CANVAS_CACHE.clear();
  TEXTURE_CANVAS_CACHE.set(key, canvas);
  return canvas;
}

function renderBrushTexture(ctx, size, texture, color) {
  ctx.clearRect(0, 0, size, size);
  const name = texture.name || "pencil";
  if (name === "charcoal") renderCharcoalTexture(ctx, size, texture, color);
  else if (name === "crayon") renderCrayonTexture(ctx, size, texture, color);
  else if (name === "watercolor") renderWatercolorTexture(ctx, size, texture, color);
  else renderPencilTexture(ctx, size, texture, color);
}

function renderPencilTexture(ctx, size, texture, color) {
  paintNoisePixels(ctx, size, texture, color, { alpha: 78, threshold: 0.42, grainScale: 15 });
  drawDirectionalFibers(ctx, size, texture, color, {
    count: Math.round(68 * (0.45 + texture.density)),
    length: [10, 36],
    alpha: [0.05, 0.2],
    width: [0.45, 1.15],
    angleSpread: 0.28,
  });
}

function renderCharcoalTexture(ctx, size, texture, color) {
  const random = seededRandom(texture.seed);
  paintNoisePixels(ctx, size, texture, color, { alpha: 118, threshold: 0.24, grainScale: 8 });

  ctx.save();
  ctx.filter = "blur(0.7px)";
  for (let index = 0; index < 90 * (0.55 + texture.density); index += 1) {
    const x = random() * size;
    const y = random() * size;
    const rx = 4 + random() * 16;
    const ry = 2 + random() * 9;
    ctx.fillStyle = rgba(color, 0.025 + random() * 0.13);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, random() * TAU, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function renderCrayonTexture(ctx, size, texture, color) {
  paintNoisePixels(ctx, size, texture, color, { alpha: 150, threshold: 0.34, grainScale: 11 });
  drawDirectionalFibers(ctx, size, texture, color, {
    count: Math.round(96 * (0.55 + texture.density)),
    length: [7, 24],
    alpha: [0.08, 0.26],
    width: [1.3, 3.4],
    angleSpread: 0.5,
  });
  cutWaxGaps(ctx, size, texture);
}

function renderWatercolorTexture(ctx, size, texture, color) {
  const random = seededRandom(texture.seed);
  paintNoisePixels(ctx, size, texture, color, { alpha: 50, threshold: 0.5, grainScale: 13 });

  ctx.save();
  ctx.filter = "blur(0.9px)";
  for (let index = 0; index < 28 * (0.5 + texture.density); index += 1) {
    const x = random() * size;
    const y = random() * size;
    const radius = size * (0.08 + random() * 0.24);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, rgba(color, 0.08 + random() * 0.14));
    gradient.addColorStop(0.68, rgba(color, 0.03 + random() * 0.06));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function paintNoisePixels(ctx, size, texture, color, options) {
  const image = ctx.createImageData(size, size);
  const threshold = options.threshold ?? 0.45;
  const maxAlpha = options.alpha ?? 90;
  const grainScale = options.grainScale ?? 12;
  const density = texture.density ?? 0.5;
  const contrast = texture.contrast ?? 0.5;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const n1 = valueNoise((x / size) * grainScale + 0.17, texture.seed + y * 0.03);
      const n2 = valueNoise((y / size) * grainScale - 0.23, texture.seed + x * 0.04);
      const directional = valueNoise((x * Math.cos(texture.direction) + y * Math.sin(texture.direction)) / 9, texture.seed + 91);
      const value = (n1 + n2 + directional * 0.7) / 2.7;
      const visible = value > threshold - density * 0.45 ? (value + 1) / 2 : 0;
      const alpha = Math.round(maxAlpha * clamp01(visible * (0.45 + contrast)));
      image.data[index] = color.r;
      image.data[index + 1] = color.g;
      image.data[index + 2] = color.b;
      image.data[index + 3] = alpha;
    }
  }

  ctx.putImageData(image, 0, 0);
}

function drawDirectionalFibers(ctx, size, texture, color, options) {
  const random = seededRandom(texture.seed + 31);
  const angle = texture.direction ?? 0;
  const count = options.count ?? 80;
  ctx.save();
  ctx.lineCap = "round";

  for (let index = 0; index < count; index += 1) {
    const length = lerp(options.length[0], options.length[1], random());
    const theta = angle + (random() - 0.5) * (options.angleSpread ?? 0.4);
    const x = random() * size;
    const y = random() * size;
    const half = length / 2;
    ctx.strokeStyle = rgba(color, lerp(options.alpha[0], options.alpha[1], random()));
    ctx.lineWidth = lerp(options.width[0], options.width[1], random());
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(theta) * half, y - Math.sin(theta) * half);
    ctx.lineTo(x + Math.cos(theta) * half, y + Math.sin(theta) * half);
    ctx.stroke();
  }

  ctx.restore();
}

function cutWaxGaps(ctx, size, texture) {
  const random = seededRandom(texture.seed + 73);
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.34)";
  ctx.lineCap = "round";
  for (let index = 0; index < 36; index += 1) {
    const y = random() * size;
    const x = random() * size;
    const length = 8 + random() * 30;
    const angle = (texture.direction ?? 0) + (random() - 0.5) * 0.7;
    ctx.lineWidth = 0.8 + random() * 2.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
  ctx.restore();
}

function createScratchCanvas(width, height) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return null;
}

function parseBrushColor(value) {
  const key = String(value || "").trim() || DEFAULT_BRUSH.color;
  if (CSS_COLOR_CACHE.has(key)) return CSS_COLOR_CACHE.get(key);

  let parsed = parseHexColor(key) || parseRgbColor(key);
  if (!parsed && typeof document !== "undefined") {
    const canvas = createScratchCanvas(1, 1);
    const ctx = canvas?.getContext?.("2d");
    if (ctx) {
      ctx.fillStyle = DEFAULT_BRUSH.color;
      ctx.fillStyle = key;
      parsed = parseHexColor(ctx.fillStyle) || parseRgbColor(ctx.fillStyle);
    }
  }

  const color = parsed || { r: 23, g: 18, b: 13 };
  CSS_COLOR_CACHE.set(key, color);
  return color;
}

function parseHexColor(value) {
  const match = String(value || "").trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex =
    match[1].length === 3
      ? match[1]
          .split("")
          .map((part) => part + part)
          .join("")
      : match[1];
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function parseRgbColor(value) {
  const match = String(value || "").match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => Number(part.trim()));
  if (parts.length < 3 || parts.some((part, index) => index < 3 && !Number.isFinite(part))) return null;
  return {
    r: clampValue(Math.round(parts[0]), 0, 255),
    g: clampValue(Math.round(parts[1]), 0, 255),
    b: clampValue(Math.round(parts[2]), 0, 255),
  };
}

function rgba(color, alpha) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${clamp01(alpha)})`;
}

function normalizeTaper(value) {
  if (value === false) return undefined;
  if (typeof value === "number") return { taper: value };
  if (isPlainObject(value)) {
    return {
      ...value,
      easing: resolveEasing(value.easing),
    };
  }
  return undefined;
}

function beginDrawablePath(ctx, path) {
  ctx.beginPath();
  if (typeof path === "function") {
    path(ctx);
    return;
  }
  if (Array.isArray(path)) {
    path.forEach((point, index) => {
      const [x, y] = normalizePoint(point) || [0, 0];
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (path.closed) ctx.closePath();
  }
}

function isPath2D(value) {
  return typeof Path2D !== "undefined" && value instanceof Path2D;
}

function normalizeBounds(bounds) {
  if (Array.isArray(bounds)) {
    return {
      x: Number(bounds[0]) || 0,
      y: Number(bounds[1]) || 0,
      w: Number(bounds[2]) || 0,
      h: Number(bounds[3]) || 0,
    };
  }
  return {
    x: Number(bounds?.x ?? bounds?.left ?? 0),
    y: Number(bounds?.y ?? bounds?.top ?? 0),
    w: Number(bounds?.w ?? bounds?.width ?? 0),
    h: Number(bounds?.h ?? bounds?.height ?? 0),
  };
}

function resolveTimelineTime(frameOrTime, totalFrames = 1) {
  const value = Number(frameOrTime) || 0;
  if (value >= 0 && value <= 1 && totalFrames > 1) return value;
  return clamp01(value / Math.max(1, Number(totalFrames) - 1));
}

function progressBetween(time, from, to) {
  const start = Number(from) || 0;
  const end = Number(to) || 1;
  if (Math.abs(end - start) <= 0.000001) return time >= end ? 1 : 0;
  return clamp01((time - start) / (end - start));
}

function interpolateProperties(properties, t, context) {
  const values = {};
  for (const [key, value] of Object.entries(properties || {})) {
    values[key] = interpolateValue(value, t, context);
  }
  return values;
}

function interpolateValue(value, t, context) {
  if (typeof value === "function") return value(t, context);
  if (Array.isArray(value) && value.length === 2) return lerpValue(value[0], value[1], t);
  if (isPlainObject(value) && "from" in value && "to" in value) return lerpValue(value.from, value.to, t);
  return value;
}

function lerpValue(from, to, t) {
  if (typeof from === "number" && typeof to === "number") return lerp(from, to, t);
  if (Array.isArray(from) && Array.isArray(to)) {
    return from.map((value, index) => lerpValue(value, to[index], t));
  }
  if (isPlainObject(from) && isPlainObject(to)) {
    const result = {};
    for (const key of Object.keys({ ...from, ...to })) {
      result[key] = lerpValue(from[key], to[key], t);
    }
    return result;
  }
  return t < 1 ? from : to;
}

function resolveEasing(easing = "linear") {
  if (typeof easing === "function") return easing;
  return easings[easing] || easings.linear;
}

function valueNoise(value, seed) {
  const raw = Math.sin(value * 127.1 + seed * 311.7) * 43758.5453123;
  return (raw - Math.floor(raw)) * 2 - 1;
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function clamp01(value) {
  return clampValue(Number(value) || 0, 0, 1);
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}
