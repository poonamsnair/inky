import ImageTracerModule from "imagetracerjs";

const ImageTracer = ImageTracerModule.default || ImageTracerModule;

const DEFAULT_TRACER_OPTIONS = Object.freeze({
  ltres: 1,
  qtres: 1,
  pathomit: 8,
  rightangleenhance: true,
  colorsampling: 2,
  numberofcolors: 6,
  mincolorratio: 0,
  colorquantcycles: 3,
  layering: 0,
  strokewidth: 1,
  linefilter: true,
  scale: 1,
  roundcoords: 2,
  viewbox: true,
  desc: false,
  blurradius: 0,
  blurdelta: 20,
});

const OUTLINE_TRACER_OPTIONS = Object.freeze({
  colorsampling: 0,
  colorquantcycles: 1,
  numberofcolors: 2,
  pathomit: 4,
  ltres: 0.8,
  qtres: 0.8,
  linefilter: true,
  pal: [
    { r: 0, g: 0, b: 0, a: 255 },
    { r: 255, g: 255, b: 255, a: 255 },
  ],
});

const DEFAULT_EXTRACT_OPTIONS = Object.freeze({
  mode: "outline",
  maxDimension: 1200,
  sampleStep: 8,
  simplifyTolerance: 1.2,
  maxPointsPerPath: 240,
  minPoints: 3,
  minArea: 2,
  maxPaths: 120,
  ignoreLight: true,
  lightnessThreshold: 245,
  includeSvg: true,
});

export async function extractPathsFromImage(source, options = {}) {
  if (!ImageTracer?.imagedataToTracedata) {
    throw new Error("ImageTracer is not available. Check that imagetracerjs is installed and bundled.");
  }

  const extractOptions = normalizeExtractOptions(options);
  const loaded = await loadImageData(source, extractOptions);
  const tracerOptions = traceOptionsFor(extractOptions);
  const tracedata = ImageTracer.imagedataToTracedata(loaded.imageData, tracerOptions);
  const paths = tracedataToPaths(tracedata, extractOptions);
  const limitedPaths = paths
    .sort((a, b) => b.area - a.area)
    .slice(0, extractOptions.maxPaths)
    .map((path, index) => ({ ...path, id: `path-${String(index + 1).padStart(3, "0")}` }));

  return {
    version: 1,
    engine: "imagetracerjs",
    source: {
      width: loaded.width,
      height: loaded.height,
      naturalWidth: loaded.naturalWidth,
      naturalHeight: loaded.naturalHeight,
      scale: loaded.scale,
    },
    options: {
      mode: extractOptions.mode,
      sampleStep: extractOptions.sampleStep,
      simplifyTolerance: extractOptions.simplifyTolerance,
      maxPointsPerPath: extractOptions.maxPointsPerPath,
      maxPaths: extractOptions.maxPaths,
      ignoreLight: extractOptions.ignoreLight,
      lightnessThreshold: extractOptions.lightnessThreshold,
      tracer: publicTracerOptions(tracerOptions),
    },
    paths: limitedPaths,
    pathCount: limitedPaths.length,
    pointCount: limitedPaths.reduce((total, path) => total + path.points.length, 0),
    bounds: boundsForPaths(limitedPaths),
    svg: extractOptions.includeSvg ? ImageTracer.getsvgstring(tracedata, tracerOptions) : null,
  };
}

export function drawExtractedPaths(ctx, extracted, brush, options = {}) {
  if (!ctx || !brush?.stroke) return 0;
  const paths = Array.isArray(extracted) ? extracted : extracted?.paths || [];
  let drawn = 0;

  for (const [index, path] of paths.entries()) {
    const points = path.points || path;
    if (!Array.isArray(points) || points.length < 2) continue;
    brush.stroke(ctx, options.closed === false ? points : ensureClosed(points), {
      seed: (options.seed ?? 1) + index,
      color: options.color || path.color?.hex,
      roughness: options.roughness,
      size: options.size,
      opacity: options.opacity,
      ...options.brushOverrides,
    });
    drawn += 1;
  }

  return drawn;
}

export function scaleExtractedPaths(extracted, scaleOrSize, maybeSize = {}) {
  const paths = Array.isArray(extracted) ? extracted : extracted?.paths || [];
  const sourceWidth = extracted?.source?.width || 1;
  const sourceHeight = extracted?.source?.height || 1;
  const scale =
    typeof scaleOrSize === "number"
      ? { x: scaleOrSize, y: scaleOrSize }
      : {
          x: Number(scaleOrSize?.width ?? maybeSize.width ?? sourceWidth) / sourceWidth,
          y: Number(scaleOrSize?.height ?? maybeSize.height ?? sourceHeight) / sourceHeight,
        };

  const scaledPaths = paths.map((path) => ({
    ...path,
    points: path.points.map(([x, y]) => [round(x * scale.x), round(y * scale.y)]),
    bounds: scaleBounds(path.bounds, scale),
  }));

  if (Array.isArray(extracted)) return scaledPaths;
  return {
    ...extracted,
    source: {
      ...(extracted.source || {}),
      width: round(sourceWidth * scale.x),
      height: round(sourceHeight * scale.y),
    },
    paths: scaledPaths,
    bounds: boundsForPaths(scaledPaths),
    pointCount: scaledPaths.reduce((total, path) => total + path.points.length, 0),
  };
}

function normalizeExtractOptions(options) {
  const mode = String(options.mode || DEFAULT_EXTRACT_OPTIONS.mode).toLowerCase();
  return {
    ...DEFAULT_EXTRACT_OPTIONS,
    ...options,
    mode,
    maxDimension: Math.max(64, Number(options.maxDimension ?? DEFAULT_EXTRACT_OPTIONS.maxDimension) || DEFAULT_EXTRACT_OPTIONS.maxDimension),
    sampleStep: Math.max(1, Number(options.sampleStep ?? DEFAULT_EXTRACT_OPTIONS.sampleStep) || DEFAULT_EXTRACT_OPTIONS.sampleStep),
    simplifyTolerance: Math.max(0, Number(options.simplifyTolerance ?? DEFAULT_EXTRACT_OPTIONS.simplifyTolerance) || 0),
    maxPointsPerPath: Math.max(4, Math.round(Number(options.maxPointsPerPath ?? DEFAULT_EXTRACT_OPTIONS.maxPointsPerPath) || DEFAULT_EXTRACT_OPTIONS.maxPointsPerPath)),
    minPoints: Math.max(2, Math.round(Number(options.minPoints ?? DEFAULT_EXTRACT_OPTIONS.minPoints) || DEFAULT_EXTRACT_OPTIONS.minPoints)),
    minArea: Math.max(0, Number(options.minArea ?? DEFAULT_EXTRACT_OPTIONS.minArea) || 0),
    maxPaths: Math.max(1, Math.round(Number(options.maxPaths ?? DEFAULT_EXTRACT_OPTIONS.maxPaths) || DEFAULT_EXTRACT_OPTIONS.maxPaths)),
    ignoreLight: options.ignoreLight ?? DEFAULT_EXTRACT_OPTIONS.ignoreLight,
    lightnessThreshold: clampValue(Number(options.lightnessThreshold ?? DEFAULT_EXTRACT_OPTIONS.lightnessThreshold), 0, 255),
    includeSvg: options.includeSvg ?? DEFAULT_EXTRACT_OPTIONS.includeSvg,
  };
}

function traceOptionsFor(options) {
  return {
    ...DEFAULT_TRACER_OPTIONS,
    ...(options.mode === "outline" ? OUTLINE_TRACER_OPTIONS : {}),
    ...(options.tracerOptions || {}),
  };
}

function publicTracerOptions(options) {
  const publicOptions = { ...options };
  if (Array.isArray(publicOptions.pal)) {
    publicOptions.pal = publicOptions.pal.map((color) => ({ ...color }));
  }
  return publicOptions;
}

async function loadImageData(source, options) {
  if (isImageData(source)) {
    return {
      imageData: source,
      width: source.width,
      height: source.height,
      naturalWidth: source.width,
      naturalHeight: source.height,
      scale: 1,
    };
  }

  if (isCanvasLike(source)) {
    const imageData = canvasToImageData(source, options);
    return {
      imageData,
      width: imageData.width,
      height: imageData.height,
      naturalWidth: source.width,
      naturalHeight: source.height,
      scale: imageData.width / Math.max(1, source.width),
    };
  }

  const image = await loadImageElement(source, options);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const scale = Math.min(1, options.maxDimension / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  revokeObjectUrl(image.__inkyObjectUrl);

  return {
    imageData: ctx.getImageData(0, 0, width, height),
    width,
    height,
    naturalWidth,
    naturalHeight,
    scale,
  };
}

function canvasToImageData(source, options) {
  const naturalWidth = source.width;
  const naturalHeight = source.height;
  const scale = Math.min(1, options.maxDimension / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

function loadImageElement(source, options) {
  return new Promise((resolve, reject) => {
    if (typeof Image === "undefined") {
      reject(new Error("Image path extraction needs a browser-like Image implementation."));
      return;
    }

    const image = new Image();
    const src = sourceToUrl(source);
    image.onload = () => resolve(image);
    image.onerror = () => {
      revokeObjectUrl(image.__inkyObjectUrl);
      reject(new Error(`Could not load image for path extraction: ${typeof source === "string" ? source : "provided image"}`));
    };
    if (options.crossOrigin !== false && /^https?:\/\//i.test(src)) image.crossOrigin = options.crossOrigin || "anonymous";
    image.__inkyObjectUrl = src.startsWith("blob:") && typeof Blob !== "undefined" && source instanceof Blob ? src : "";
    image.src = src;
  });
}

function sourceToUrl(source) {
  if (typeof source === "string") {
    const value = source.trim();
    if (!value) throw new Error("Image path extraction needs an image URL or data URL.");
    return value;
  }
  if (typeof Blob !== "undefined" && source instanceof Blob) return URL.createObjectURL(source);
  if (source?.src) return source.src;
  throw new Error("Unsupported image source. Pass a URL, data URL, Blob, ImageData, image, or canvas.");
}

function tracedataToPaths(tracedata, options) {
  const paths = [];
  const layers = tracedata?.layers || [];
  const palette = tracedata?.palette || [];

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex += 1) {
    const color = normalizeColor(palette[layerIndex]);
    if (options.ignoreLight && color.lightness >= options.lightnessThreshold) continue;
    const layer = layers[layerIndex] || [];

    for (let pathIndex = 0; pathIndex < layer.length; pathIndex += 1) {
      const rawPath = layer[pathIndex];
      if (!rawPath?.segments?.length || rawPath.isholepath) continue;

      const sampled = sampleSegments(rawPath.segments, options.sampleStep);
      const simplified = simplifyPoints(sampled, options.simplifyTolerance, options.maxPointsPerPath);
      const cleanPoints = removeDuplicateNeighbors(simplified);
      if (cleanPoints.length < options.minPoints) continue;

      const bounds = boundsForPoints(cleanPoints);
      const area = Math.abs(polygonArea(cleanPoints));
      if (area < options.minArea) continue;

      paths.push({
        id: `layer-${layerIndex}-path-${pathIndex}`,
        layerIndex,
        pathIndex,
        color,
        closed: true,
        d: pathToD(rawPath),
        points: cleanPoints,
        bounds,
        area: round(area),
        length: round(polylineLength(cleanPoints)),
        holes: (rawPath.holechildren || []).map((holeIndex) => {
          const hole = layer[holeIndex];
          const holePoints = hole?.segments ? simplifyPoints(sampleSegments(hole.segments, options.sampleStep), options.simplifyTolerance, options.maxPointsPerPath) : [];
          return {
            pathIndex: holeIndex,
            d: hole?.segments ? pathToD(hole) : "",
            points: removeDuplicateNeighbors(holePoints),
          };
        }),
      });
    }
  }

  return paths;
}

function sampleSegments(segments, sampleStep) {
  const points = [];
  if (!segments.length) return points;
  const first = segments[0];
  points.push([round(first.x1), round(first.y1)]);

  for (const segment of segments) {
    if (segmentHasQuadratic(segment)) {
      const start = [Number(segment.x1), Number(segment.y1)];
      const control = [Number(segment.x2), Number(segment.y2)];
      const end = [Number(segment.x3), Number(segment.y3)];
      const steps = Math.max(2, Math.ceil((distance(start, control) + distance(control, end)) / sampleStep));
      for (let index = 1; index <= steps; index += 1) {
        const t = index / steps;
        points.push([round(quadratic(start[0], control[0], end[0], t)), round(quadratic(start[1], control[1], end[1], t))]);
      }
    } else {
      points.push([round(segment.x2), round(segment.y2)]);
    }
  }

  return points;
}

function pathToD(path) {
  const segments = path?.segments || [];
  if (!segments.length) return "";
  const parts = [`M ${round(segments[0].x1)} ${round(segments[0].y1)}`];
  for (const segment of segments) {
    if (segmentHasQuadratic(segment)) {
      parts.push(`Q ${round(segment.x2)} ${round(segment.y2)} ${round(segment.x3)} ${round(segment.y3)}`);
    } else {
      parts.push(`L ${round(segment.x2)} ${round(segment.y2)}`);
    }
  }
  parts.push("Z");
  return parts.join(" ");
}

function simplifyPoints(points, tolerance, maxPoints) {
  let simplified = tolerance > 0 && points.length > 3 ? simplifyRdp(points, tolerance) : [...points];
  if (simplified.length > maxPoints) simplified = decimatePoints(simplified, maxPoints);
  return simplified;
}

function simplifyRdp(points, tolerance) {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let splitIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let index = 1; index < points.length - 1; index += 1) {
    const currentDistance = perpendicularDistance(points[index], start, end);
    if (currentDistance > maxDistance) {
      maxDistance = currentDistance;
      splitIndex = index;
    }
  }

  if (maxDistance <= tolerance) return [start, end];

  const left = simplifyRdp(points.slice(0, splitIndex + 1), tolerance);
  const right = simplifyRdp(points.slice(splitIndex), tolerance);
  return [...left.slice(0, -1), ...right];
}

function decimatePoints(points, maxPoints) {
  if (points.length <= maxPoints) return points;
  const result = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let index = 0; index < maxPoints; index += 1) {
    result.push(points[Math.round(index * step)]);
  }
  return result;
}

function removeDuplicateNeighbors(points) {
  const clean = [];
  for (const point of points) {
    const previous = clean[clean.length - 1];
    if (!previous || distance(previous, point) > 0.01) clean.push(point);
  }
  return clean;
}

function boundsForPaths(paths) {
  if (!paths.length) return { x: 0, y: 0, w: 0, h: 0, x2: 0, y2: 0 };
  const xs = [];
  const ys = [];
  for (const path of paths) {
    xs.push(path.bounds.x, path.bounds.x2);
    ys.push(path.bounds.y, path.bounds.y2);
  }
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const x2 = Math.max(...xs);
  const y2 = Math.max(...ys);
  return { x: round(x), y: round(y), w: round(x2 - x), h: round(y2 - y), x2: round(x2), y2: round(y2) };
}

function boundsForPoints(points) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const x2 = Math.max(...xs);
  const y2 = Math.max(...ys);
  return { x: round(x), y: round(y), w: round(x2 - x), h: round(y2 - y), x2: round(x2), y2: round(y2) };
}

function scaleBounds(bounds, scale) {
  if (!bounds) return bounds;
  return {
    x: round(bounds.x * scale.x),
    y: round(bounds.y * scale.y),
    w: round(bounds.w * scale.x),
    h: round(bounds.h * scale.y),
    x2: round(bounds.x2 * scale.x),
    y2: round(bounds.y2 * scale.y),
  };
}

function normalizeColor(color = {}) {
  const normalized = {
    r: clampValue(Math.round(Number(color.r) || 0), 0, 255),
    g: clampValue(Math.round(Number(color.g) || 0), 0, 255),
    b: clampValue(Math.round(Number(color.b) || 0), 0, 255),
    a: clampValue(Math.round(Number(color.a ?? 255) || 0), 0, 255),
  };
  const lightness = 0.2126 * normalized.r + 0.7152 * normalized.g + 0.0722 * normalized.b;
  return {
    ...normalized,
    lightness: round(lightness),
    hex: `#${hex(normalized.r)}${hex(normalized.g)}${hex(normalized.b)}`,
    rgba: `rgba(${normalized.r}, ${normalized.g}, ${normalized.b}, ${round(normalized.a / 255, 3)})`,
  };
}

function createCanvas(width, height) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  throw new Error("Image path extraction needs a browser canvas.");
}

function isImageData(value) {
  return typeof ImageData !== "undefined" && value instanceof ImageData;
}

function isCanvasLike(value) {
  return value && typeof value.getContext === "function" && Number.isFinite(Number(value.width)) && Number.isFinite(Number(value.height));
}

function ensureClosed(points) {
  if (!points.length) return points;
  const first = points[0];
  const last = points[points.length - 1];
  return distance(first, last) <= 0.01 ? points : [...points, first];
}

function segmentHasQuadratic(segment) {
  return segment?.type === "Q" || Object.hasOwn(segment || {}, "x3");
}

function quadratic(a, b, c, t) {
  return (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
}

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const denominator = Math.hypot(dx, dy);
  if (denominator <= 0.0001) return distance(point, start);
  return Math.abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / denominator;
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function polygonArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return area / 2;
}

function polylineLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    length += distance(points[index - 1], points[index]);
  }
  return length;
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function hex(value) {
  return clampValue(value, 0, 255).toString(16).padStart(2, "0");
}

function revokeObjectUrl(url) {
  if (url && typeof URL !== "undefined") URL.revokeObjectURL(url);
}
