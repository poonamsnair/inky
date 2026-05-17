import { getStroke } from "perfect-freehand";
import chroma from "chroma-js";
import { createNoise2D } from "simplex-noise";

export const MATERIAL_TOOLKITS = {
  "technical-pen": {
    useWhen: "clean edges, small facial details, prop contours, precise hatching",
    size: 1.8,
    thinning: 0.28,
    smoothing: 0.36,
    streamline: 0.22,
    jitter: 0.45,
    passes: 1,
    alpha: 0.88,
    hatchLength: 24,
    hatchWidth: 0.55,
  },
  "dip-ink": {
    useWhen: "lively broken contours, expressive silhouettes, imperfect hand-drawn outlines",
    size: 3.0,
    thinning: 0.72,
    smoothing: 0.42,
    streamline: 0.2,
    jitter: 1.1,
    passes: 2,
    alpha: 0.78,
    hatchLength: 30,
    hatchWidth: 0.75,
  },
  "brush-pen": {
    useWhen: "bold character silhouettes, hair curls, clothing folds, energetic local motion ticks",
    size: 5.2,
    thinning: 0.82,
    smoothing: 0.5,
    streamline: 0.25,
    jitter: 1.4,
    passes: 2,
    alpha: 0.72,
    hatchLength: 34,
    hatchWidth: 1.1,
  },
  "fountain-pen": {
    useWhen: "elegant variable-width ink lines, handwriting, delicate contours, fine hair strands",
    size: 2.3,
    thinning: 0.56,
    smoothing: 0.48,
    streamline: 0.28,
    jitter: 0.62,
    passes: 1,
    alpha: 0.82,
    hatchLength: 28,
    hatchWidth: 0.55,
  },
  "ballpoint-pen": {
    useWhen: "fine scratchy crosshatching, office doodles, tiny labels, subtle pen shading",
    size: 1.15,
    thinning: 0.14,
    smoothing: 0.3,
    streamline: 0.22,
    jitter: 0.9,
    passes: 2,
    alpha: 0.52,
    hatchLength: 26,
    hatchWidth: 0.42,
  },
  marker: {
    useWhen: "broad translucent cartoon color, poster strokes, smooth but visibly hand-filled areas",
    size: 12,
    thinning: 0.04,
    smoothing: 0.56,
    streamline: 0.38,
    jitter: 0.85,
    passes: 2,
    alpha: 0.32,
    hatchLength: 58,
    hatchWidth: 5.2,
    patternSize: 112,
  },
  "graphite-pencil": {
    useWhen: "soft construction feel, delicate shadows, subtle fabric folds, gentle pose clarification",
    size: 1.2,
    thinning: 0.18,
    smoothing: 0.25,
    streamline: 0.16,
    jitter: 1.9,
    passes: 3,
    alpha: 0.34,
    hatchLength: 32,
    hatchWidth: 0.5,
  },
  "colored-pencil": {
    useWhen: "dry costume texture, local color shading, small accents that should stay tactile",
    size: 1.4,
    thinning: 0.22,
    smoothing: 0.24,
    streamline: 0.18,
    jitter: 1.6,
    passes: 3,
    alpha: 0.42,
    hatchLength: 28,
    hatchWidth: 0.65,
  },
  "wax-crayon": {
    useWhen: "chunky playful fills, broad costume areas, childlike rough color texture",
    size: 7.0,
    thinning: 0.08,
    smoothing: 0.18,
    streamline: 0.1,
    jitter: 2.8,
    passes: 2,
    alpha: 0.46,
    hatchLength: 40,
    hatchWidth: 2.4,
    patternSize: 86,
  },
  "oil-crayon": {
    useWhen: "greasy opaque crayon strokes, waxy dabs, saturated childlike fills",
    size: 8.4,
    thinning: 0.1,
    smoothing: 0.2,
    streamline: 0.12,
    jitter: 2.5,
    passes: 3,
    alpha: 0.5,
    hatchLength: 44,
    hatchWidth: 3,
    patternSize: 96,
  },
  pastel: {
    useWhen: "soft powdery fills, gentle color fields, low-detail atmospheric background areas",
    size: 8.0,
    thinning: 0.05,
    smoothing: 0.22,
    streamline: 0.12,
    jitter: 3.2,
    passes: 3,
    alpha: 0.28,
    hatchLength: 46,
    hatchWidth: 3,
    patternSize: 104,
  },
  charcoal: {
    useWhen: "smoky shadows, dramatic stage light, heavy expressive silhouettes",
    size: 6.4,
    thinning: 0.35,
    smoothing: 0.3,
    streamline: 0.12,
    jitter: 3.4,
    passes: 4,
    alpha: 0.24,
    hatchLength: 52,
    hatchWidth: 2.2,
    patternSize: 110,
  },
  watercolor: {
    useWhen: "transparent washes, blooms, soft skin/fabric color variation, quiet backgrounds",
    size: 10,
    thinning: 0.12,
    smoothing: 0.6,
    streamline: 0.32,
    jitter: 2.4,
    passes: 4,
    alpha: 0.18,
    hatchLength: 36,
    hatchWidth: 1.4,
  },
  "ink-wash": {
    useWhen: "transparent monochrome wash, comic shadows, soft gray ink tone under crisp outlines",
    size: 11,
    thinning: 0.1,
    smoothing: 0.58,
    streamline: 0.32,
    jitter: 2.1,
    passes: 4,
    alpha: 0.16,
    hatchLength: 38,
    hatchWidth: 1.6,
    patternSize: 118,
  },
  gouache: {
    useWhen: "opaque poster-like props, flat highlights, solid stage shapes",
    size: 8.5,
    thinning: 0.08,
    smoothing: 0.5,
    streamline: 0.28,
    jitter: 1.8,
    passes: 2,
    alpha: 0.58,
    hatchLength: 34,
    hatchWidth: 1.8,
  },
  acrylic: {
    useWhen: "opaque fast-drying paint texture, bright graphic fills, dry-brush edge marks",
    size: 9.2,
    thinning: 0.08,
    smoothing: 0.46,
    streamline: 0.24,
    jitter: 1.65,
    passes: 2,
    alpha: 0.56,
    hatchLength: 42,
    hatchWidth: 2.4,
    patternSize: 108,
  },
  "oil-paint": {
    useWhen: "thick painterly smears, impasto-like highlights, deliberately painterly projects",
    size: 9.5,
    thinning: 0.18,
    smoothing: 0.42,
    streamline: 0.2,
    jitter: 2.2,
    passes: 3,
    alpha: 0.44,
    hatchLength: 42,
    hatchWidth: 2.6,
    patternSize: 112,
  },
  airbrush: {
    useWhen: "soft sprayed glow, blush, atmospheric gradients, gentle cast shadows",
    size: 14,
    thinning: 0,
    smoothing: 0.64,
    streamline: 0.46,
    jitter: 4.2,
    passes: 3,
    alpha: 0.12,
    hatchLength: 40,
    hatchWidth: 2.8,
    patternSize: 120,
  },
  sponge: {
    useWhen: "irregular paint stipple, wall texture, foliage masses, handmade background mottling",
    size: 10.5,
    thinning: 0.03,
    smoothing: 0.24,
    streamline: 0.12,
    jitter: 4.0,
    passes: 3,
    alpha: 0.24,
    hatchLength: 36,
    hatchWidth: 3,
    patternSize: 116,
  },
  "salt-watercolor": {
    useWhen: "watercolor bloom texture, starry salt blooms, mottled wet paper fields",
    size: 10.5,
    thinning: 0.08,
    smoothing: 0.58,
    streamline: 0.34,
    jitter: 2.8,
    passes: 4,
    alpha: 0.16,
    hatchLength: 38,
    hatchWidth: 1.5,
    patternSize: 122,
  },
  "screen-tone": {
    useWhen: "comic halftone shading, controlled background texture, graphic shadow patches",
    size: 5.8,
    thinning: 0,
    smoothing: 0.2,
    streamline: 0.1,
    jitter: 0.15,
    passes: 1,
    alpha: 0.42,
    hatchLength: 24,
    hatchWidth: 1.2,
    patternSize: 72,
  },
};

export const MATERIAL_PRESSURE_PROFILES = {
  "technical-pen": {
    easing: (t) => t,
    startTaper: 2,
    endTaper: 2,
    capStart: true,
    capEnd: true,
  },
  "dip-ink": {
    easing: (t) => t * t * (3 - 2 * t),
    startTaper: 12,
    endTaper: 18,
    capStart: true,
    capEnd: true,
  },
  "brush-pen": {
    easing: (t) => 1 - (1 - t) ** 2,
    startTaper: 18,
    endTaper: 24,
    capStart: true,
    capEnd: true,
  },
  "fountain-pen": {
    easing: (t) => t * t * (3 - 2 * t),
    startTaper: 10,
    endTaper: 16,
    capStart: true,
    capEnd: true,
  },
  "ballpoint-pen": {
    easing: (t) => t,
    startTaper: 4,
    endTaper: 5,
    capStart: false,
    capEnd: false,
  },
  marker: {
    easing: (t) => t,
    startTaper: 8,
    endTaper: 8,
    capStart: true,
    capEnd: true,
  },
  "graphite-pencil": {
    easing: (t) => t,
    startTaper: 5,
    endTaper: 7,
    capStart: false,
    capEnd: false,
  },
  "colored-pencil": {
    easing: (t) => t,
    startTaper: 5,
    endTaper: 8,
    capStart: false,
    capEnd: false,
  },
  "wax-crayon": {
    easing: (t) => t,
    startTaper: 9,
    endTaper: 11,
    capStart: false,
    capEnd: false,
  },
  "oil-crayon": {
    easing: (t) => t * (2 - t),
    startTaper: 8,
    endTaper: 10,
    capStart: false,
    capEnd: false,
  },
  pastel: {
    easing: (t) => t,
    startTaper: 10,
    endTaper: 12,
    capStart: false,
    capEnd: false,
  },
  charcoal: {
    easing: (t) => Math.sqrt(Math.max(0, t)),
    startTaper: 14,
    endTaper: 16,
    capStart: false,
    capEnd: false,
  },
  watercolor: {
    easing: (t) => t * t * (3 - 2 * t),
    startTaper: 22,
    endTaper: 28,
    capStart: true,
    capEnd: true,
  },
  "ink-wash": {
    easing: (t) => t * t * (3 - 2 * t),
    startTaper: 24,
    endTaper: 30,
    capStart: true,
    capEnd: true,
  },
  gouache: {
    easing: (t) => t,
    startTaper: 10,
    endTaper: 12,
    capStart: true,
    capEnd: true,
  },
  acrylic: {
    easing: (t) => t,
    startTaper: 9,
    endTaper: 10,
    capStart: true,
    capEnd: true,
  },
  "oil-paint": {
    easing: (t) => t * (2 - t),
    startTaper: 12,
    endTaper: 14,
    capStart: true,
    capEnd: true,
  },
  airbrush: {
    easing: (t) => t,
    startTaper: 30,
    endTaper: 30,
    capStart: true,
    capEnd: true,
  },
  sponge: {
    easing: (t) => t,
    startTaper: 14,
    endTaper: 16,
    capStart: false,
    capEnd: false,
  },
  "salt-watercolor": {
    easing: (t) => t * t * (3 - 2 * t),
    startTaper: 24,
    endTaper: 32,
    capStart: true,
    capEnd: true,
  },
  "screen-tone": {
    easing: (t) => t,
    startTaper: 0,
    endTaper: 0,
    capStart: false,
    capEnd: false,
  },
};

const patternCache = new Map();

export function materialToolNames() {
  return Object.keys(MATERIAL_TOOLKITS);
}

export function resolveMaterialTool(name = "dip-ink") {
  return MATERIAL_TOOLKITS[name] || MATERIAL_TOOLKITS["dip-ink"];
}

function color(hex, alpha = 1, adjust = {}) {
  let c = chroma(hex);
  if (adjust.brighten) c = c.brighten(adjust.brighten);
  if (adjust.darken) c = c.darken(adjust.darken);
  if (adjust.saturate) c = c.saturate(adjust.saturate);
  if (adjust.desaturate) c = c.desaturate(adjust.desaturate);
  return c.alpha(alpha).css();
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function pressureOptions(toolName, tool, options = {}) {
  const profile = {
    ...(MATERIAL_PRESSURE_PROFILES[toolName] || MATERIAL_PRESSURE_PROFILES["dip-ink"]),
    ...(options.pressure || {}),
  };

  return {
    size: tool.size,
    thinning: tool.thinning,
    smoothing: tool.smoothing,
    streamline: tool.streamline,
    simulatePressure: options.simulatePressure ?? true,
    easing: profile.easing || ((t) => t),
    start: {
      taper: profile.startTaper ?? false,
      cap: profile.capStart ?? true,
      easing: profile.startEasing || profile.easing || ((t) => t),
    },
    end: {
      taper: profile.endTaper ?? false,
      cap: profile.capEnd ?? true,
      easing: profile.endEasing || profile.easing || ((t) => t),
    },
  };
}

function strokePath(points, tool, toolName, options = {}) {
  const stroke = getStroke(points, {
    ...pressureOptions(toolName, tool, options),
  });
  if (!stroke.length) return "";
  const d = stroke.reduce((acc, [x0, y0], i, arr) => {
    const [x1, y1] = arr[(i + 1) % arr.length];
    acc.push(`${i === 0 ? "M" : "Q"} ${x0.toFixed(2)} ${y0.toFixed(2)} ${((x0 + x1) / 2).toFixed(2)} ${((y0 + y1) / 2).toFixed(2)}`);
    return acc;
  }, []);
  d.push("Z");
  return d.join(" ");
}

function jitterPoint([x, y], amount, random) {
  return [x + (random() - 0.5) * amount, y + (random() - 0.5) * amount];
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function seededNoise(seed) {
  return createNoise2D(seededRandom(seed));
}

function solidForContrast(value, backdrop = "#fffdf7") {
  let parsed;
  try {
    parsed = chroma(value);
  } catch {
    parsed = chroma(backdrop);
  }
  const alpha = parsed.alpha();
  if (alpha >= 0.999) return parsed.alpha(1);
  return chroma.mix(chroma(backdrop), parsed.alpha(1), clamp01(alpha), "rgb").alpha(1);
}

export function contrastRatio(foreground, background, options = {}) {
  const fg = solidForContrast(foreground, options.backdrop || "#fffdf7");
  const bg = solidForContrast(background, options.backdrop || "#fffdf7");
  return chroma.contrast(fg, bg);
}

export function ensureReadableColor(foreground, background, options = {}) {
  const minContrast = options.minContrast ?? 4.5;
  const backdrop = options.backdrop || "#fffdf7";
  const original = solidForContrast(foreground, backdrop);
  const bg = solidForContrast(background, backdrop);
  const currentContrast = chroma.contrast(original, bg);

  if (currentContrast >= minContrast) {
    return {
      color: original.hex(),
      contrast: Number(currentContrast.toFixed(2)),
      adjusted: false,
    };
  }

  const candidates = [
    solidForContrast(options.dark || "#17120d", backdrop),
    solidForContrast(options.light || "#fff8e8", backdrop),
    original.luminance(0.02),
    original.luminance(0.94),
  ];
  const best = candidates
    .map((candidate) => ({ candidate, contrast: chroma.contrast(candidate, bg) }))
    .sort((a, b) => b.contrast - a.contrast)[0];

  return {
    color: best.candidate.hex(),
    contrast: Number(best.contrast.toFixed(2)),
    adjusted: true,
  };
}

function normalizeBounds(bounds) {
  return {
    x: bounds?.x ?? 0,
    y: bounds?.y ?? 0,
    w: bounds?.w ?? bounds?.width ?? 1,
    h: bounds?.h ?? bounds?.height ?? 1,
  };
}

export function createMaterialPaletteRamp(base = "#17120d", options = {}) {
  const count = options.count ?? 5;
  const mode = options.mode || "lch";
  const baseColor = chroma(base);
  const colors = options.colors || [
    baseColor.brighten(options.highlight ?? 0.55).desaturate(options.desaturateHighlight ?? 0.08),
    baseColor,
    baseColor.darken(options.shadow ?? 0.55).saturate(options.saturateShadow ?? 0.08),
  ];
  return chroma.scale(colors).mode(mode).colors(count);
}

export function createMaterialGradient(target, bounds, stops = [], options = {}) {
  const area = normalizeBounds(bounds);
  const angle = options.angle ?? -0.75;
  const radius = Math.hypot(area.w, area.h);
  const cx = area.x + area.w * (options.centerX ?? 0.5);
  const cy = area.y + area.h * (options.centerY ?? 0.5);
  const gradient =
    options.type === "radial"
      ? target.createRadialGradient(
          cx,
          cy,
          radius * (options.innerRadius ?? 0.05),
          cx + area.w * (options.radialOffsetX ?? 0),
          cy + area.h * (options.radialOffsetY ?? 0),
          radius * (options.outerRadius ?? 0.58),
        )
      : target.createLinearGradient(
          cx - Math.cos(angle) * radius * 0.5,
          cy - Math.sin(angle) * radius * 0.5,
          cx + Math.cos(angle) * radius * 0.5,
          cy + Math.sin(angle) * radius * 0.5,
        );

  const resolvedStops =
    stops.length > 0
      ? stops
      : createMaterialPaletteRamp(options.color || "#17120d", {
          count: 3,
          highlight: options.highlight,
          shadow: options.shadow,
        }).map((stopColor, index, arr) => ({
          offset: arr.length === 1 ? 0 : index / (arr.length - 1),
          color: chroma(stopColor).alpha(options.alpha ?? 1).css(),
        }));

  resolvedStops.forEach((stop, index) => {
    const offset = typeof stop.offset === "number" ? stop.offset : index / Math.max(1, resolvedStops.length - 1);
    const stopColor = stop.color || stop;
    gradient.addColorStop(clamp01(offset), stopColor);
  });
  return gradient;
}

export function fillMaterialGradient(target, bounds, stops = [], options = {}) {
  const area = normalizeBounds(bounds);
  target.save();
  target.globalCompositeOperation = options.composite || "source-over";
  target.globalAlpha = options.alpha ?? 1;
  target.fillStyle = createMaterialGradient(target, area, stops, options);
  target.fillRect(area.x, area.y, area.w, area.h);
  target.restore();
}

function offscreenLike(target, width, height) {
  const owner = target?.canvas?.ownerDocument;
  const canvas = owner?.createElement ? owner.createElement("canvas") : document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function strokeTileLine(context, random, size, options) {
  const angle = options.angle + (random() - 0.5) * options.angleJitter;
  const length = size * (options.lengthMin + random() * options.lengthRange);
  const cx = random() * size;
  const cy = random() * size;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const bend = (random() - 0.5) * options.bend * size;

  context.save();
  context.globalAlpha = options.alphaMin + random() * options.alphaRange;
  context.lineWidth = options.widthMin + random() * options.widthRange;
  context.lineCap = options.cap || "round";
  context.lineJoin = "round";
  context.strokeStyle = color(options.color, context.globalAlpha, {
    brighten: random() > 0.62 ? random() * options.brighten : 0,
    darken: random() > 0.62 ? random() * options.darken : 0,
    saturate: options.saturate || 0,
    desaturate: options.desaturate || 0,
  });
  context.beginPath();
  context.moveTo(cx - ux * length * 0.5, cy - uy * length * 0.5);
  context.quadraticCurveTo(cx + uy * bend, cy - ux * bend, cx + ux * length * 0.5, cy + uy * length * 0.5);
  context.stroke();
  context.restore();
}

function carvePaperTooth(context, random, size, count, strength = 1) {
  context.save();
  context.globalCompositeOperation = "destination-out";
  for (let index = 0; index < count; index += 1) {
    const x = random() * size;
    const y = random() * size;
    const w = (0.7 + random() * 3.2) * strength;
    const h = (0.35 + random() * 1.9) * strength;
    context.globalAlpha = 0.08 + random() * 0.25;
    context.beginPath();
    context.ellipse(x, y, w, h, random() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawMaterialPatternTile(context, toolName, base, size, random) {
  context.clearRect(0, 0, size, size);
  const baseColor = chroma(base);

  if (toolName === "screen-tone") {
    const spacing = Math.max(7, size / 9);
    for (let y = spacing * 0.55; y < size; y += spacing) {
      for (let x = spacing * 0.55; x < size; x += spacing) {
        context.globalAlpha = 0.18 + random() * 0.22;
        context.fillStyle = baseColor.alpha(1).css();
        context.beginPath();
        context.ellipse(x + (random() - 0.5) * 0.6, y + (random() - 0.5) * 0.6, spacing * 0.16, spacing * 0.16, 0, 0, Math.PI * 2);
        context.fill();
      }
    }
    return;
  }

  if (toolName === "airbrush") {
    for (let index = 0; index < 160; index += 1) {
      const radius = 0.5 + random() * 3.2;
      context.globalAlpha = 0.018 + random() * 0.07;
      context.fillStyle = color(baseColor.hex(), 1, {
        brighten: random() * 0.22,
        darken: random() * 0.12,
      });
      context.beginPath();
      context.ellipse(random() * size, random() * size, radius, radius, 0, 0, Math.PI * 2);
      context.fill();
    }
    return;
  }

  if (toolName === "sponge") {
    for (let index = 0; index < 90; index += 1) {
      const x = random() * size;
      const y = random() * size;
      const points = 7 + Math.floor(random() * 5);
      const radius = 2.5 + random() * 8.5;
      context.globalAlpha = 0.04 + random() * 0.2;
      context.fillStyle = color(baseColor.hex(), 1, {
        brighten: random() * 0.18,
        darken: random() * 0.22,
        saturate: 0.08,
      });
      context.beginPath();
      for (let point = 0; point < points; point += 1) {
        const angle = (point / points) * Math.PI * 2;
        const localRadius = radius * (0.55 + random() * 0.65);
        const px = x + Math.cos(angle) * localRadius;
        const py = y + Math.sin(angle) * localRadius;
        if (point === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.closePath();
      context.fill();
    }
    carvePaperTooth(context, random, size, 56, 0.85);
    return;
  }

  if (toolName === "marker") {
    for (let index = 0; index < 38; index += 1) {
      strokeTileLine(context, random, size, {
        color: baseColor.saturate(0.12).hex(),
        angle: -0.2,
        angleJitter: 0.45,
        lengthMin: 0.42,
        lengthRange: 0.92,
        widthMin: 8.5,
        widthRange: 12.5,
        alphaMin: 0.05,
        alphaRange: 0.12,
        bend: 0.05,
        brighten: 0.16,
        darken: 0.1,
        saturate: 0.1,
      });
    }
    return;
  }

  if (toolName === "fountain-pen" || toolName === "ballpoint-pen") {
    const fine = toolName === "ballpoint-pen";
    for (let index = 0; index < (fine ? 130 : 82); index += 1) {
      strokeTileLine(context, random, size, {
        color: baseColor.hex(),
        angle: fine ? -0.72 : -0.48,
        angleJitter: fine ? 0.72 : 0.48,
        lengthMin: 0.12,
        lengthRange: fine ? 0.46 : 0.58,
        widthMin: fine ? 0.2 : 0.38,
        widthRange: fine ? 0.38 : 0.7,
        alphaMin: fine ? 0.06 : 0.08,
        alphaRange: fine ? 0.16 : 0.22,
        bend: fine ? 0.02 : 0.05,
        brighten: 0.08,
        darken: 0.18,
        cap: fine ? "butt" : "round",
      });
    }
    carvePaperTooth(context, random, size, fine ? 34 : 22, fine ? 0.38 : 0.28);
    return;
  }

  if (toolName === "wax-crayon") {
    for (let index = 0; index < 48; index += 1) {
      strokeTileLine(context, random, size, {
        color: baseColor.hex(),
        angle: -0.35,
        angleJitter: 1.65,
        lengthMin: 0.22,
        lengthRange: 0.74,
        widthMin: 3.4,
        widthRange: 9.4,
        alphaMin: 0.16,
        alphaRange: 0.28,
        bend: 0.08,
        brighten: 0.2,
        darken: 0.14,
        saturate: 0.22,
      });
    }
    carvePaperTooth(context, random, size, 92, 1.0);
    return;
  }

  if (toolName === "oil-crayon") {
    for (let index = 0; index < 54; index += 1) {
      strokeTileLine(context, random, size, {
        color: baseColor.saturate(0.35).hex(),
        angle: -0.18,
        angleJitter: 2.0,
        lengthMin: 0.18,
        lengthRange: 0.8,
        widthMin: 3.8,
        widthRange: 8.8,
        alphaMin: 0.16,
        alphaRange: 0.32,
        bend: 0.18,
        brighten: 0.26,
        darken: 0.2,
        saturate: 0.3,
      });
    }
    carvePaperTooth(context, random, size, 64, 0.85);
    return;
  }

  if (toolName === "colored-pencil" || toolName === "graphite-pencil") {
    for (let index = 0; index < 96; index += 1) {
      strokeTileLine(context, random, size, {
        color: baseColor.hex(),
        angle: -0.65,
        angleJitter: 0.75,
        lengthMin: 0.18,
        lengthRange: 0.64,
        widthMin: 0.35,
        widthRange: toolName === "graphite-pencil" ? 0.85 : 1.15,
        alphaMin: 0.16,
        alphaRange: 0.3,
        bend: 0.04,
        brighten: 0.18,
        darken: 0.2,
        desaturate: toolName === "graphite-pencil" ? 0.72 : 0.08,
        cap: "butt",
      });
    }
    carvePaperTooth(context, random, size, 60, 0.8);
    return;
  }

  if (toolName === "charcoal") {
    for (let index = 0; index < 70; index += 1) {
      context.globalAlpha = 0.08 + random() * 0.18;
      context.fillStyle = color(base, 1, { desaturate: 0.85, darken: random() * 0.45 });
      context.beginPath();
      context.ellipse(random() * size, random() * size, 3 + random() * 12, 1.8 + random() * 8, random() * Math.PI, 0, Math.PI * 2);
      context.fill();
    }
    for (let index = 0; index < 34; index += 1) {
      strokeTileLine(context, random, size, {
        color: baseColor.desaturate(0.9).darken(0.3).hex(),
        angle: -0.45,
        angleJitter: 2.4,
        lengthMin: 0.12,
        lengthRange: 0.7,
        widthMin: 2.2,
        widthRange: 6.8,
        alphaMin: 0.08,
        alphaRange: 0.22,
        bend: 0.2,
        brighten: 0.08,
        darken: 0.3,
        desaturate: 0.85,
      });
    }
    carvePaperTooth(context, random, size, 96, 1.15);
    return;
  }

  if (toolName === "watercolor" || toolName === "ink-wash" || toolName === "salt-watercolor") {
    for (let index = 0; index < 58; index += 1) {
      const x = random() * size;
      const y = random() * size;
      const radius = 5 + random() * 22;
      const bloom = context.createRadialGradient(x, y, 0, x, y, radius);
      const washColor =
        toolName === "ink-wash" ? baseColor.desaturate(0.95).darken(random() * 0.2) : baseColor.saturate(toolName === "salt-watercolor" ? 0.18 : 0.05);
      bloom.addColorStop(0, washColor.alpha(0.08 + random() * 0.14).css());
      bloom.addColorStop(0.58, washColor.alpha(0.025 + random() * 0.075).css());
      bloom.addColorStop(1, washColor.alpha(0).css());
      context.fillStyle = bloom;
      context.beginPath();
      context.ellipse(x, y, radius, radius * (0.5 + random() * 0.6), random() * Math.PI, 0, Math.PI * 2);
      context.fill();
    }
    for (let index = 0; index < 34; index += 1) {
      strokeTileLine(context, random, size, {
        color: baseColor.hex(),
        angle: -0.35,
        angleJitter: 1.8,
        lengthMin: 0.16,
        lengthRange: 0.66,
        widthMin: 1.1,
        widthRange: 3.6,
        alphaMin: 0.02,
        alphaRange: 0.08,
        bend: 0.32,
        brighten: 0.25,
        darken: 0.08,
        desaturate: toolName === "ink-wash" ? 0.9 : 0,
      });
    }
    if (toolName === "salt-watercolor") {
      carvePaperTooth(context, random, size, 58, 1.4);
    }
    return;
  }

  if (toolName === "oil-paint" || toolName === "gouache" || toolName === "acrylic") {
    for (let index = 0; index < 58; index += 1) {
      strokeTileLine(context, random, size, {
        color: baseColor.saturate(toolName === "oil-paint" ? 0.25 : toolName === "acrylic" ? 0.16 : 0.08).hex(),
        angle: -0.1,
        angleJitter: 1.4,
        lengthMin: 0.22,
        lengthRange: 0.82,
        widthMin: toolName === "oil-paint" ? 4.8 : toolName === "acrylic" ? 3.8 : 3.2,
        widthRange: toolName === "oil-paint" ? 9.8 : toolName === "acrylic" ? 7.8 : 6.2,
        alphaMin: toolName === "oil-paint" ? 0.18 : toolName === "acrylic" ? 0.16 : 0.14,
        alphaRange: 0.3,
        bend: toolName === "acrylic" ? 0.1 : 0.22,
        brighten: 0.28,
        darken: 0.22,
        saturate: toolName === "oil-paint" ? 0.2 : toolName === "acrylic" ? 0.12 : 0.05,
      });
    }
    return;
  }

  for (let index = 0; index < 46; index += 1) {
    strokeTileLine(context, random, size, {
      color: baseColor.hex(),
      angle: -0.5,
      angleJitter: 2.0,
      lengthMin: 0.12,
      lengthRange: 0.7,
      widthMin: 1,
      widthRange: 4,
      alphaMin: 0.1,
      alphaRange: 0.25,
      bend: 0.12,
      brighten: 0.2,
      darken: 0.2,
    });
  }
}

export function createMaterialPattern(target, toolName, base = "#17120d", options = {}) {
  const tool = { ...resolveMaterialTool(toolName), ...options.tool };
  const size = Math.round(options.size || tool.patternSize || 72);
  const seed = options.seed ?? hashString(`${toolName}:${base}:${size}`);
  const cacheKey = `${toolName}:${base}:${size}:${seed}`;
  let tile = patternCache.get(cacheKey);
  if (!tile) {
    tile = offscreenLike(target, size, size);
    const tileContext = tile.getContext("2d");
    drawMaterialPatternTile(tileContext, toolName, base, size, seededRandom(seed));
    patternCache.set(cacheKey, tile);
  }
  return target.createPattern(tile, "repeat");
}

export function fillMaterialPattern(target, bounds, toolName, options = {}) {
  const pattern = createMaterialPattern(target, toolName, options.color || "#17120d", options);
  if (!pattern) return;
  target.save();
  target.globalAlpha = options.alpha ?? 0.7;
  target.globalCompositeOperation = options.composite || materialBrushProfile(toolName, resolveMaterialTool(toolName)).composite;
  target.fillStyle = pattern;
  target.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
  target.restore();
}

export function drawCoherentPaperGrain(target, bounds, options = {}) {
  const seed = options.seed ?? 1701;
  const noise = seededNoise(seed);
  const scale = options.scale ?? 72;
  const step = options.step ?? 4;
  const alpha = options.alpha ?? 0.04;
  const colorValue = options.color || "#9a805d";
  const threshold = options.threshold ?? 0.2;

  target.save();
  target.globalCompositeOperation = options.composite || "multiply";
  for (let y = bounds.y; y < bounds.y + bounds.h; y += step) {
    for (let x = bounds.x; x < bounds.x + bounds.w; x += step) {
      const n = (noise(x / scale, y / scale) + 1) / 2;
      if (n < threshold) continue;
      const localAlpha = alpha * ((n - threshold) / Math.max(0.001, 1 - threshold));
      target.fillStyle = color(colorValue, localAlpha, {
        brighten: n > 0.76 ? 0.15 : 0,
        darken: n < 0.42 ? 0.12 : 0,
      });
      target.fillRect(x, y, step, step);
    }
  }
  target.restore();
}

function materialBrushProfile(toolName, tool, options = {}) {
  const profiles = {
    "technical-pen": {
      vectorStroke: true,
      spacing: 2,
      bristles: 1,
      grain: 0.02,
      coherentGrain: 0.15,
      dabW: 1.2,
      dabH: 0.5,
      smear: 1.1,
      composite: "source-over",
    },
    "dip-ink": {
      vectorStroke: true,
      spacing: 2.4,
      bristles: 2,
      grain: 0.06,
      coherentGrain: 0.35,
      dabW: 2.4,
      dabH: 0.9,
      smear: 1.8,
      composite: "source-over",
    },
    "brush-pen": {
      vectorStroke: true,
      spacing: 2.8,
      bristles: 3,
      grain: 0.08,
      coherentGrain: 0.45,
      dabW: 3.5,
      dabH: 1.1,
      smear: 2.2,
      composite: "source-over",
    },
    "fountain-pen": {
      vectorStroke: true,
      spacing: 2.1,
      bristles: 2,
      grain: 0.05,
      coherentGrain: 0.25,
      dabW: 1.8,
      dabH: 0.55,
      smear: 1.4,
      composite: "source-over",
    },
    "ballpoint-pen": {
      vectorStroke: true,
      spacing: 1.8,
      bristles: 1,
      grain: 0.22,
      coherentGrain: 0.65,
      dabW: 1.15,
      dabH: 0.28,
      smear: 1.8,
      composite: "multiply",
    },
    marker: {
      spacing: 3.8,
      bristles: 3,
      grain: 0.05,
      coherentGrain: 0.35,
      dabW: 13.5,
      dabH: 4.5,
      smear: 9.5,
      composite: "multiply",
      patternStroke: true,
      saturate: 0.12,
    },
    "graphite-pencil": {
      spacing: 2.8,
      bristles: 1,
      grain: 0.42,
      coherentGrain: 0.9,
      dabW: 2.6,
      dabH: 0.55,
      smear: 2.8,
      composite: "multiply",
      desaturate: 0.75,
    },
    "colored-pencil": {
      spacing: 2.6,
      bristles: 1,
      grain: 0.35,
      coherentGrain: 0.8,
      dabW: 3.3,
      dabH: 0.72,
      smear: 3.4,
      composite: "multiply",
    },
    "wax-crayon": {
      spacing: 3.8,
      bristles: 3,
      grain: 0.24,
      coherentGrain: 1.25,
      dabW: 8.2,
      dabH: 2.7,
      smear: 5.4,
      composite: "multiply",
      patternStroke: true,
      saturate: 0.2,
    },
    "oil-crayon": {
      spacing: 2.9,
      bristles: 5,
      grain: 0.1,
      coherentGrain: 1.1,
      dabW: 10.2,
      dabH: 3.4,
      smear: 7.4,
      composite: "multiply",
      patternStroke: true,
      saturate: 0.35,
    },
    pastel: {
      spacing: 4.2,
      bristles: 4,
      grain: 0.28,
      coherentGrain: 1.0,
      dabW: 9.5,
      dabH: 4.1,
      smear: 6.8,
      composite: "multiply",
      desaturate: 0.15,
    },
    charcoal: {
      spacing: 3.2,
      bristles: 5,
      grain: 0.46,
      coherentGrain: 1.35,
      dabW: 8.2,
      dabH: 3.5,
      smear: 7.8,
      composite: "multiply",
      patternStroke: true,
      desaturate: 0.85,
    },
    watercolor: {
      spacing: 5,
      bristles: 2,
      grain: 0.14,
      coherentGrain: 0.55,
      dabW: 11,
      dabH: 4.4,
      smear: 8.4,
      composite: "source-over",
    },
    "ink-wash": {
      spacing: 5.4,
      bristles: 2,
      grain: 0.18,
      coherentGrain: 0.72,
      dabW: 12.5,
      dabH: 4.6,
      smear: 9.2,
      composite: "multiply",
      desaturate: 0.95,
    },
    gouache: {
      spacing: 3.2,
      bristles: 4,
      grain: 0.12,
      coherentGrain: 0.55,
      dabW: 9.3,
      dabH: 3.4,
      smear: 6.8,
      composite: "source-over",
    },
    acrylic: {
      spacing: 2.9,
      bristles: 5,
      grain: 0.1,
      coherentGrain: 0.48,
      dabW: 9.8,
      dabH: 3.2,
      smear: 7.6,
      composite: "source-over",
      patternStroke: true,
      saturate: 0.16,
    },
    "oil-paint": {
      spacing: 2.6,
      bristles: 6,
      grain: 0.06,
      coherentGrain: 0.65,
      dabW: 10.5,
      dabH: 3.2,
      smear: 8.6,
      composite: "source-over",
      patternStroke: true,
      saturate: 0.25,
    },
    airbrush: {
      spacing: 3.6,
      bristles: 10,
      grain: 0.08,
      coherentGrain: 0.85,
      dabW: 10.5,
      dabH: 10.5,
      smear: 11.5,
      composite: "source-over",
      softDabs: true,
    },
    sponge: {
      spacing: 5.2,
      bristles: 7,
      grain: 0.2,
      coherentGrain: 1.15,
      dabW: 11.8,
      dabH: 7.5,
      smear: 6.4,
      composite: "multiply",
      patternStroke: true,
      roughDabs: true,
    },
    "salt-watercolor": {
      spacing: 5.5,
      bristles: 2,
      grain: 0.16,
      coherentGrain: 0.82,
      dabW: 12.8,
      dabH: 4.8,
      smear: 9.8,
      composite: "source-over",
      desaturate: 0.03,
    },
    "screen-tone": {
      spacing: 5.8,
      bristles: 1,
      grain: 0.02,
      coherentGrain: 0.05,
      dabW: 3.8,
      dabH: 3.8,
      smear: 1,
      composite: "multiply",
      patternStroke: true,
    },
  };

  return {
    spacing: Math.max(1.2, tool.size * 0.55),
    bristles: 2,
    grain: 0.18,
    coherentGrain: 0.45,
    dabW: tool.size,
    dabH: tool.size * 0.35,
    smear: tool.size * 0.65,
    composite: "source-over",
    ...profiles[toolName],
    ...options.brush,
  };
}

function samplePolyline(points, spacing) {
  const samples = [];
  if (points.length < 2) return samples;
  let leftover = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[index];
    const [x1, y1] = points[index + 1];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const length = Math.hypot(dx, dy);
    if (length < 0.01) continue;
    const angle = Math.atan2(dy, dx);
    let distance = index === 0 ? 0 : spacing - leftover;
    while (distance <= length) {
      const t = distance / length;
      samples.push({
        x: x0 + dx * t,
        y: y0 + dy * t,
        angle,
      });
      distance += spacing;
    }
    leftover = length - (distance - spacing);
  }

  return samples;
}

function dab(target, sample, profile, tool, toolName, base, alpha, random, noise) {
  const normal = sample.angle + Math.PI / 2;
  const grainX = noise ? noise(sample.x / 38, sample.y / 38) : random() - 0.5;
  const grainY = noise ? noise((sample.x + 119) / 44, (sample.y - 73) / 44) : random() - 0.5;
  const along = ((random() - 0.5) * 0.55 + grainX * profile.coherentGrain * 0.45) * profile.smear;
  const across = ((random() - 0.5) * 0.55 + grainY * profile.coherentGrain * 0.45) * tool.jitter * 2.2;
  const x = sample.x + Math.cos(sample.angle) * along + Math.cos(normal) * across;
  const y = sample.y + Math.sin(sample.angle) * along + Math.sin(normal) * across;
  const waxGap = toolName === "wax-crayon" || toolName === "oil-crayon" ? Math.max(0.38, 0.72 + grainX * 0.32) : 1;
  const w = profile.dabW * (0.35 + random() * 0.95) * waxGap;
  const h = profile.dabH * (0.35 + random() * 0.95) * Math.max(0.42, 1 + grainY * 0.18);
  const adjust = {
    brighten: random() > 0.62 ? random() * 0.32 : 0,
    darken: random() > 0.68 ? random() * 0.28 : 0,
    saturate: profile.saturate || 0,
    desaturate: profile.desaturate || 0,
  };

  target.save();
  target.translate(x, y);
  target.rotate(sample.angle + (random() - 0.5) * 0.42);
  const dabAlpha = alpha * (0.28 + random() * 0.62);
  target.fillStyle = color(base, dabAlpha, adjust);
  target.beginPath();

  if (profile.softDabs || toolName === "airbrush") {
    const radius = Math.max(w, h) * (0.45 + random() * 0.4);
    const soft = target.createRadialGradient(0, 0, 0, 0, 0, radius);
    const softColor = chroma(base);
    soft.addColorStop(0, softColor.alpha(dabAlpha * 0.42).css());
    soft.addColorStop(0.62, softColor.alpha(dabAlpha * 0.12).css());
    soft.addColorStop(1, softColor.alpha(0).css());
    target.fillStyle = soft;
    target.ellipse(0, 0, radius, radius * (0.7 + random() * 0.3), 0, 0, Math.PI * 2);
  } else if (profile.roughDabs || toolName === "sponge") {
    const points = 6 + Math.floor(random() * 5);
    for (let index = 0; index < points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const radius = (0.45 + random() * 0.65) * Math.max(w, h) * 0.55;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius * (0.65 + random() * 0.25);
      if (index === 0) target.moveTo(px, py);
      else target.lineTo(px, py);
    }
    target.closePath();
  } else if (toolName === "colored-pencil" || toolName === "graphite-pencil" || toolName === "ballpoint-pen") {
    target.rect(-w * 0.5, -h * 0.5, w, Math.max(0.35, h));
  } else if (toolName === "marker") {
    target.roundRect?.(-w * 0.5, -h * 0.5, w, Math.max(2.2, h), Math.max(1.5, h * 0.45));
    if (!target.roundRect) target.rect(-w * 0.5, -h * 0.5, w, Math.max(2.2, h));
  } else {
    target.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
  }
  target.fill();
  target.restore();
}

export function drawMaterialStroke(target, points, toolName, options = {}) {
  const tool = { ...resolveMaterialTool(toolName), ...options.tool };
  const random = options.random || Math.random;
  const base = options.color || "#17120d";
  const passes = options.passes ?? tool.passes;

  target.save();
  for (let pass = 0; pass < passes; pass += 1) {
    const jittered = points.map((point) => jitterPoint(point, tool.jitter * (0.8 + pass * 0.25), random));
    const path = strokePath(jittered, tool, toolName, options);
    if (!path) continue;
    target.fillStyle = color(base, (options.alpha ?? tool.alpha) / Math.max(1, passes * 0.72), {
      brighten: pass % 2 === 0 ? 0 : 0.2,
      darken: pass % 2 === 0 ? 0.1 : 0,
      desaturate: toolName === "graphite-pencil" || toolName === "charcoal" ? 0.6 : 0,
    });
    target.fill(new Path2D(path));
  }
  target.restore();
}

export function drawMaterialBrushStroke(target, points, toolName, options = {}) {
  const tool = { ...resolveMaterialTool(toolName), ...options.tool };
  const random = options.random || Math.random;
  const base = options.color || "#17120d";
  const alpha = options.alpha ?? tool.alpha;
  const profile = materialBrushProfile(toolName, tool, options);
  const noise = options.noise || seededNoise(options.seed ?? hashString(`${toolName}:${base}:${points.length}:${points[0]?.join(",") || ""}`));

  target.save();
  if (profile.vectorStroke) {
    drawMaterialStroke(target, points, toolName, {
      color: base,
      alpha,
      tool: options.tool,
      passes: options.passes,
      random,
    });
  }

  if (profile.patternStroke) {
    target.save();
    target.strokeStyle = createMaterialPattern(target, toolName, base, {
      seed: options.seed,
      size: options.patternSize,
      tool: options.tool,
    });
    target.globalAlpha = alpha * 0.72;
    target.globalCompositeOperation = options.composite || profile.composite;
    target.lineCap = "round";
    target.lineJoin = "round";
    target.lineWidth = options.patternWidth || tool.size * (0.95 + random() * 0.4);
    target.beginPath();
    target.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) {
      const [x0, y0] = points[index - 1];
      const [x1, y1] = points[index];
      target.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    target.stroke();
    target.restore();
  }

  target.globalCompositeOperation = options.composite || profile.composite;
  const samples = samplePolyline(points, options.spacing || profile.spacing);
  samples.forEach((sample) => {
    if (random() < profile.grain) return;
    for (let bristle = 0; bristle < profile.bristles; bristle += 1) {
      if (random() < profile.grain * 0.45) continue;
      dab(target, sample, profile, tool, toolName, base, alpha / Math.max(1, profile.bristles * 0.9), random, noise);
    }
  });
  target.restore();
}

export function drawMaterialScumble(target, bounds, toolName, count, options = {}) {
  const tool = { ...resolveMaterialTool(toolName), ...options.tool };
  const random = options.random || Math.random;
  const base = options.color || "#17120d";
  const profile = materialBrushProfile(toolName, tool, options);
  const lengthBase = options.length ?? Math.max(tool.hatchLength, Math.min(bounds.w, bounds.h) * 0.42);
  const baseAngle = options.angle ?? -0.5;
  const angleJitter = options.angleJitter ?? 1.55;

  for (let i = 0; i < count; i += 1) {
    const cx = bounds.x + random() * bounds.w;
    const cy = bounds.y + random() * bounds.h;
    const length = lengthBase * (0.35 + random() * 0.95);
    const angle = baseAngle + (random() - 0.5) * angleJitter;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const nx = -uy;
    const ny = ux;
    const bend = (random() - 0.5) * length * 0.24;
    const wobble = (random() - 0.5) * length * 0.12;
    const points = [
      [cx - ux * length * 0.5 + nx * wobble, cy - uy * length * 0.5 + ny * wobble],
      [cx - ux * length * 0.18 + nx * bend, cy - uy * length * 0.18 + ny * bend],
      [cx + ux * length * 0.18 - nx * bend * 0.45, cy + uy * length * 0.18 - ny * bend * 0.45],
      [cx + ux * length * 0.5 - nx * wobble, cy + uy * length * 0.5 - ny * wobble],
    ];
    drawMaterialBrushStroke(target, points, toolName, {
      color: base,
      alpha: options.alpha ?? tool.alpha,
      tool: options.tool,
      brush: {
        ...profile,
        grain: options.grain ?? profile.grain,
        bristles: options.bristles ?? profile.bristles,
      },
      random,
    });
  }
}

export function drawMaterialHatch(target, bounds, toolName, count, options = {}) {
  const tool = { ...resolveMaterialTool(toolName), ...options.tool };
  const random = options.random || Math.random;
  const base = options.color || "#17120d";

  target.save();
  target.strokeStyle = color(base, options.alpha ?? tool.alpha);
  target.lineWidth = options.width ?? tool.hatchWidth;
  target.lineCap = "round";
  for (let i = 0; i < count; i += 1) {
    const x = bounds.x + random() * bounds.w;
    const y = bounds.y + random() * bounds.h;
    const length = (options.length ?? tool.hatchLength) * (0.45 + random());
    const angle = (options.angle ?? -0.65) + (random() - 0.5) * (options.angleJitter ?? 1.4);
    target.globalAlpha = (options.alpha ?? tool.alpha) * (0.35 + random() * 0.65);
    target.beginPath();
    target.moveTo(x + (random() - 0.5) * tool.jitter, y + (random() - 0.5) * tool.jitter);
    target.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    target.stroke();
  }
  target.restore();
}

export function scatterMaterialTexture(target, bounds, toolName, count, options = {}) {
  const tool = { ...resolveMaterialTool(toolName), ...options.tool };
  const random = options.random || Math.random;
  const base = options.color || "#17120d";

  target.save();
  for (let i = 0; i < count; i += 1) {
    const x = bounds.x + random() * bounds.w;
    const y = bounds.y + random() * bounds.h;
    const w = (options.size ?? tool.size) * (0.35 + random());
    const h = (options.size ?? tool.size) * (0.18 + random() * 0.5);
    target.fillStyle = color(base, (options.alpha ?? tool.alpha) * (0.25 + random() * 0.5), {
      brighten: random() > 0.5 ? 0.25 : 0,
      darken: random() > 0.5 ? 0 : 0.2,
    });
    target.beginPath();
    target.ellipse(x, y, w, h, random() * Math.PI, 0, Math.PI * 2);
    target.fill();
  }
  target.restore();
}

export function applyPaperTooth(target, bounds, options = {}) {
  const area = normalizeBounds(bounds);
  const seed = options.seed ?? hashString(`paper-tooth:${area.x}:${area.y}:${area.w}:${area.h}`);
  const random = options.random || seededRandom(seed);
  const count = options.count ?? Math.max(24, Math.round((area.w * area.h) / 900));

  target.save();
  target.globalCompositeOperation = options.composite || "destination-out";
  for (let index = 0; index < count; index += 1) {
    const x = area.x + random() * area.w;
    const y = area.y + random() * area.h;
    const w = (options.size ?? 2.4) * (0.35 + random() * 1.65);
    const h = (options.size ?? 2.4) * (0.18 + random() * 0.72);
    target.globalAlpha = (options.alpha ?? 0.12) * (0.35 + random() * 0.8);
    target.beginPath();
    target.ellipse(x, y, w, h, random() * Math.PI, 0, Math.PI * 2);
    target.fill();
  }
  target.restore();
}

export function drawMaterialWash(target, bounds, toolName = "watercolor", options = {}) {
  const area = normalizeBounds(bounds);
  const tool = { ...resolveMaterialTool(toolName), ...options.tool };
  const base = options.color || "#6ea7c8";
  const seed = options.seed ?? hashString(`wash:${toolName}:${base}:${area.x}:${area.y}:${area.w}:${area.h}`);
  const random = options.random || seededRandom(seed);
  const noise = options.noise || seededNoise(seed);
  const ramp = createMaterialPaletteRamp(base, {
    count: 5,
    highlight: options.highlight ?? 0.65,
    shadow: options.shadow ?? 0.42,
    desaturateHighlight: toolName === "ink-wash" ? 0.85 : 0.05,
    saturateShadow: toolName === "ink-wash" ? 0 : 0.12,
  });
  const alpha = options.alpha ?? tool.alpha;
  const composite = options.composite || (toolName === "ink-wash" ? "multiply" : "source-over");

  target.save();
  target.globalCompositeOperation = composite;
  fillMaterialGradient(
    target,
    area,
    [
      { offset: 0, color: chroma(ramp[0]).alpha(alpha * 0.52).css() },
      { offset: 0.45, color: chroma(ramp[2]).alpha(alpha * 0.34).css() },
      { offset: 1, color: chroma(ramp[4]).alpha(alpha * 0.5).css() },
    ],
    {
      angle: options.angle ?? -0.82,
      composite,
      alpha: 1,
    },
  );

  const bloomCount = options.blooms ?? Math.max(5, Math.round((area.w * area.h) / 8800));
  for (let index = 0; index < bloomCount; index += 1) {
    const x = area.x + random() * area.w;
    const y = area.y + random() * area.h;
    const radius = Math.min(area.w, area.h) * (0.08 + random() * 0.24);
    const bloomColor = chroma(ramp[Math.floor(random() * ramp.length)]);
    const gradient = target.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, bloomColor.alpha(alpha * (0.8 + random() * 0.55)).css());
    gradient.addColorStop(0.55, bloomColor.alpha(alpha * 0.28).css());
    gradient.addColorStop(1, bloomColor.alpha(0).css());
    target.fillStyle = gradient;
    target.beginPath();
    target.ellipse(x, y, radius, radius * (0.48 + random() * 0.52), random() * Math.PI, 0, Math.PI * 2);
    target.fill();
  }

  const step = options.granulationStep ?? 5;
  const threshold = options.granulationThreshold ?? 0.5;
  target.globalCompositeOperation = options.granulationComposite || "multiply";
  for (let y = area.y; y < area.y + area.h; y += step) {
    for (let x = area.x; x < area.x + area.w; x += step) {
      const n = (noise(x / 42, y / 42) + 1) / 2;
      if (n < threshold) continue;
      target.globalAlpha = alpha * 0.18 * ((n - threshold) / Math.max(0.001, 1 - threshold));
      target.fillStyle = chroma(base)
        .darken(toolName === "ink-wash" ? 0.75 : 0.32)
        .desaturate(toolName === "ink-wash" ? 0.9 : 0)
        .css();
      target.fillRect(x, y, step, step);
    }
  }

  if (options.edgePool !== false) {
    target.globalCompositeOperation = "multiply";
    target.strokeStyle = chroma(base)
      .darken(toolName === "ink-wash" ? 0.8 : 0.38)
      .alpha(alpha * 0.45)
      .css();
    target.lineWidth = options.edgeWidth ?? 2.2;
    target.strokeRect(area.x + 1, area.y + 1, Math.max(0, area.w - 2), Math.max(0, area.h - 2));
  }

  if (toolName === "salt-watercolor" || options.salt) {
    applyPaperTooth(target, area, {
      seed: seed + 41,
      count: options.saltCount ?? Math.max(12, Math.round((area.w * area.h) / 4200)),
      size: options.saltSize ?? 5.5,
      alpha: options.saltAlpha ?? 0.18,
    });
  }

  target.restore();
}

export function drawDryMediaFill(target, bounds, toolName = "colored-pencil", options = {}) {
  const area = normalizeBounds(bounds);
  const tool = { ...resolveMaterialTool(toolName), ...options.tool };
  const seed = options.seed ?? hashString(`dry:${toolName}:${options.color || "#17120d"}:${area.x}:${area.y}:${area.w}:${area.h}`);
  const random = options.random || seededRandom(seed);

  fillMaterialPattern(target, area, toolName, {
    color: options.color || "#17120d",
    alpha: options.patternAlpha ?? Math.min(0.72, tool.alpha * 1.45),
    composite: options.composite || "multiply",
    seed,
    tool: options.tool,
  });
  drawMaterialScumble(target, area, toolName, options.scumble ?? Math.max(12, Math.round((area.w * area.h) / 5200)), {
    color: options.color || "#17120d",
    alpha: options.scumbleAlpha ?? tool.alpha * 0.65,
    angle: options.angle,
    angleJitter: options.angleJitter,
    random,
  });
  if (options.hatch !== false) {
    drawMaterialHatch(target, area, toolName, options.hatchCount ?? Math.max(6, Math.round((area.w * area.h) / 11000)), {
      color: options.color || "#17120d",
      alpha: options.hatchAlpha ?? tool.alpha * 0.45,
      angle: options.hatchAngle ?? options.angle,
      random,
    });
  }
  if (options.tooth !== false) {
    applyPaperTooth(target, area, {
      seed: seed + 7,
      alpha: options.toothAlpha ?? (toolName === "wax-crayon" || toolName === "oil-crayon" ? 0.16 : 0.09),
      size: options.toothSize ?? (toolName === "charcoal" || toolName === "pastel" ? 3.8 : 2.2),
      count: options.toothCount,
    });
  }
}

export function drawBristleStroke(target, points, toolName = "brush-pen", options = {}) {
  const tool = { ...resolveMaterialTool(toolName), ...options.tool };
  const bristleCount = options.bristleCount ?? options.bristles ?? Math.max(2, Math.round(tool.size / 2));
  drawMaterialBrushStroke(target, points, toolName, {
    ...options,
    brush: {
      bristles: bristleCount,
      grain: options.grain ?? 0.12,
      coherentGrain: options.coherentGrain ?? 0.72,
      smear: options.smear ?? tool.size * 0.85,
      ...(options.brush || {}),
    },
  });
}

export function fillMaterialLayer(target, bounds, toolName, options = {}) {
  const area = normalizeBounds(bounds);
  const wetTools = new Set(["watercolor", "ink-wash", "salt-watercolor"]);
  const dryTools = new Set(["graphite-pencil", "colored-pencil", "wax-crayon", "oil-crayon", "pastel", "charcoal", "screen-tone"]);
  const paintTools = new Set(["marker", "gouache", "acrylic", "oil-paint", "sponge", "airbrush"]);

  if (options.baseFill) {
    target.save();
    target.globalAlpha = options.baseAlpha ?? 1;
    target.fillStyle = options.baseFill;
    target.fillRect(area.x, area.y, area.w, area.h);
    target.restore();
  }

  if (options.gradient) {
    fillMaterialGradient(target, area, options.gradient.stops || [], {
      ...options.gradient,
      color: options.color,
    });
  }

  if (wetTools.has(toolName)) {
    drawMaterialWash(target, area, toolName, options);
    return;
  }

  if (dryTools.has(toolName)) {
    drawDryMediaFill(target, area, toolName, options);
    return;
  }

  if (paintTools.has(toolName)) {
    fillMaterialPattern(target, area, toolName, {
      color: options.color || "#17120d",
      alpha: options.patternAlpha ?? 0.45,
      composite: options.composite || (toolName === "airbrush" ? "source-over" : "multiply"),
      seed: options.seed,
      tool: options.tool,
    });
    drawMaterialScumble(target, area, toolName, options.scumble ?? Math.max(10, Math.round((area.w * area.h) / 7200)), {
      color: options.color || "#17120d",
      alpha: options.scumbleAlpha,
      random: options.random,
      brush: options.brush,
    });
    return;
  }

  drawMaterialHatch(target, area, toolName, options.hatchCount ?? 18, options);
}

export function fillClippedMaterial(target, bounds, drawPath, toolName, options = {}) {
  target.save();
  if (typeof drawPath === "function") {
    target.beginPath();
    drawPath(target);
    target.clip();
  }
  fillMaterialLayer(target, bounds, toolName, options);
  target.restore();
}
