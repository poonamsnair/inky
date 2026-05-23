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
  opacity: 1,
  seed: 1,
  composite: "source-over",
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
  ctx.fillStyle = brush.color;

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
  ctx.strokeStyle = config.color;
  ctx.lineWidth = config.size;
  ctx.lineCap = config.lineCap || "round";
  ctx.lineJoin = config.lineJoin || "round";
  ctx.beginPath();
  preparedPoints.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
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
  if (!path2d) beginDrawablePath(ctx, path);

  if (options.fill) {
    ctx.fillStyle = typeof options.fill === "string" ? options.fill : config.color;
    if (path2d) ctx.fill(path2d, options.fillRule || "nonzero");
    else ctx.fill(options.fillRule || "nonzero");
  }

  if (options.stroke !== false) {
    ctx.strokeStyle = options.stroke || config.color;
    ctx.lineWidth = options.lineWidth ?? config.size;
    ctx.lineCap = options.lineCap || "round";
    ctx.lineJoin = options.lineJoin || "round";
    if (path2d) ctx.stroke(path2d);
    else ctx.stroke();
  }

  ctx.restore();
  return true;
}

export function fillPath(ctx, path, options = {}) {
  return drawPath(ctx, path, {
    ...options,
    fill: options.fill || options.color || true,
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
  ctx.fillStyle = config.color;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * (options.aspect ?? 1), options.rotation ?? 0, 0, TAU);
  ctx.fill();
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
  const merged = mergeBrushConfig(DEFAULT_BRUSH, config);
  merged.seed = Number.isFinite(Number(merged.seed)) ? Number(merged.seed) : hashString(merged.type || "brush");
  merged.size = Math.max(0.1, Number(merged.size) || DEFAULT_BRUSH.size);
  merged.opacity = clamp01(Number(merged.opacity ?? 1));
  return merged;
}

function mergeBrushConfig(base = {}, overrides = {}) {
  const next = {
    ...base,
    ...overrides,
  };
  for (const key of ["pressure", "inkFlow", "start", "end", "freehand"]) {
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
  };
}

function prepareBrushPoints(points, brush) {
  const normalized = points.map(normalizePoint).filter(Boolean);
  const progress = pointProgress(normalized);
  const random = seededRandom(brush.seed ?? 1);
  const jitter = brush.jitter ?? 0;

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
  ctx.fill();
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
