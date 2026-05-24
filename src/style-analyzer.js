const DEFAULT_STYLE_OPTIONS = Object.freeze({
  maxDimension: 640,
  sampleStep: 4,
  colorCount: 6,
  alphaThreshold: 24,
  tileSize: 96,
  tileSeed: 73,
  crossOrigin: "anonymous",
});

export async function analyzeStyle(source, options = {}) {
  const styleOptions = normalizeStyleOptions(options);
  const loaded = await loadImageData(source, styleOptions);
  const samples = collectSamples(loaded.imageData, styleOptions);
  const palette = buildPalette(samples, styleOptions.colorCount);
  const metrics = analyzeImageMetrics(loaded.imageData, samples, styleOptions);
  const suggested = suggestBrushSettings(metrics, palette);
  const textureTile = createSeamlessTextureTile(loaded.imageData, metrics, styleOptions);
  const paletteRoles = paletteRoleAliases(palette);

  return {
    version: 1,
    engine: "inky-style-analyzer",
    source: {
      width: loaded.width,
      height: loaded.height,
      naturalWidth: loaded.naturalWidth,
      naturalHeight: loaded.naturalHeight,
      scale: loaded.scale,
    },
    palette: {
      dominant: palette,
      background: palette[0] || null,
      accents: palette.slice(1, 4),
      ...paletteRoles,
    },
    metrics,
    suggested,
    suggestedBrush: suggested.brush,
    suggestedRoughness: suggested.roughness,
    suggestedTextureScale: suggested.textureScale,
    texture: textureTile,
    notes: [
      "Use these values as style evidence, not as a final layer.",
      "The texture tile is an abstract grain sample for brush tuning; redraw finished artwork with canvas primitives.",
    ],
  };
}

function paletteRoleAliases(palette) {
  if (!palette.length) return { dark: null, light: null };
  const byLightness = [...palette].sort((a, b) => a.lightness - b.lightness);
  return {
    dark: byLightness[0]?.hex || null,
    light: byLightness[byLightness.length - 1]?.hex || null,
  };
}

function normalizeStyleOptions(options) {
  return {
    ...DEFAULT_STYLE_OPTIONS,
    ...options,
    maxDimension: Math.max(64, Number(options.maxDimension ?? DEFAULT_STYLE_OPTIONS.maxDimension) || DEFAULT_STYLE_OPTIONS.maxDimension),
    sampleStep: Math.max(1, Math.round(Number(options.sampleStep ?? DEFAULT_STYLE_OPTIONS.sampleStep) || DEFAULT_STYLE_OPTIONS.sampleStep)),
    colorCount: Math.max(1, Math.round(Number(options.colorCount ?? DEFAULT_STYLE_OPTIONS.colorCount) || DEFAULT_STYLE_OPTIONS.colorCount)),
    alphaThreshold: clamp(Number(options.alphaThreshold ?? DEFAULT_STYLE_OPTIONS.alphaThreshold), 0, 255),
    tileSize: Math.max(16, Math.min(256, Math.round(Number(options.tileSize ?? DEFAULT_STYLE_OPTIONS.tileSize) || DEFAULT_STYLE_OPTIONS.tileSize))),
    tileSeed: Math.round(Number(options.tileSeed ?? DEFAULT_STYLE_OPTIONS.tileSeed) || DEFAULT_STYLE_OPTIONS.tileSeed),
  };
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
      reject(new Error("Style analysis needs a browser-like Image implementation."));
      return;
    }

    const image = new Image();
    const src = sourceToUrl(source);
    image.onload = () => resolve(image);
    image.onerror = () => {
      revokeObjectUrl(image.__inkyObjectUrl);
      reject(new Error(`Could not load image for style analysis: ${typeof source === "string" ? source : "provided image"}`));
    };
    if (options.crossOrigin !== false && /^https?:\/\//i.test(src)) image.crossOrigin = options.crossOrigin || "anonymous";
    image.__inkyObjectUrl = src.startsWith("blob:") && typeof Blob !== "undefined" && source instanceof Blob ? src : "";
    image.src = src;
  });
}

function sourceToUrl(source) {
  if (typeof source === "string") {
    const value = source.trim();
    if (!value) throw new Error("Style analysis needs an image URL or data URL.");
    return value;
  }
  if (typeof Blob !== "undefined" && source instanceof Blob) return URL.createObjectURL(source);
  if (source?.src) return source.src;
  throw new Error("Unsupported style source. Pass a URL, data URL, Blob, ImageData, image, or canvas.");
}

function collectSamples(imageData, options) {
  const samples = [];
  const { width, height, data } = imageData;

  for (let y = 0; y < height; y += options.sampleStep) {
    for (let x = 0; x < width; x += options.sampleStep) {
      const index = (y * width + x) * 4;
      const a = data[index + 3];
      if (a <= options.alphaThreshold) continue;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const hsl = rgbToHsl(r, g, b);
      samples.push({
        r,
        g,
        b,
        a,
        lightness: hsl.l,
        saturation: hsl.s,
        luminance: luminance(r, g, b),
      });
    }
  }

  return samples;
}

function buildPalette(samples, colorCount) {
  const buckets = new Map();
  const bucketSize = 24;

  for (const sample of samples) {
    const key = [bucket(sample.r, bucketSize), bucket(sample.g, bucketSize), bucket(sample.b, bucketSize)].join(",");
    const current = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0, lightness: 0, saturation: 0 };
    current.count += 1;
    current.r += sample.r;
    current.g += sample.g;
    current.b += sample.b;
    current.lightness += sample.lightness;
    current.saturation += sample.saturation;
    buckets.set(key, current);
  }

  const total = Math.max(1, samples.length);
  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, colorCount)
    .map((entry) => {
      const rgb = {
        r: Math.round(entry.r / entry.count),
        g: Math.round(entry.g / entry.count),
        b: Math.round(entry.b / entry.count),
      };
      return {
        hex: rgbToHex(rgb.r, rgb.g, rgb.b),
        rgb,
        count: entry.count,
        coverage: round(entry.count / total, 4),
        lightness: round(entry.lightness / entry.count, 3),
        saturation: round(entry.saturation / entry.count, 3),
      };
    });
}

function analyzeImageMetrics(imageData, samples, options) {
  const total = Math.max(1, samples.length);
  const avgLuminance = samples.reduce((sum, sample) => sum + sample.luminance, 0) / total;
  const avgSaturation = samples.reduce((sum, sample) => sum + sample.saturation, 0) / total;
  const avgLightness = samples.reduce((sum, sample) => sum + sample.lightness, 0) / total;
  const variance = samples.reduce((sum, sample) => sum + (sample.luminance - avgLuminance) ** 2, 0) / total;
  const luminanceStd = Math.sqrt(variance);
  const edgeDensity = estimateEdgeDensity(imageData, Math.max(1, options.sampleStep));
  const contrast = clamp(luminanceStd / 92, 0, 1);
  const grain = clamp(edgeDensity * 0.68 + contrast * 0.32, 0, 1);

  return {
    sampleCount: samples.length,
    averageLuminance: round(avgLuminance, 3),
    averageLightness: round(avgLightness, 3),
    averageSaturation: round(avgSaturation, 3),
    luminanceStd: round(luminanceStd, 3),
    contrast: round(contrast, 3),
    edgeDensity: round(edgeDensity, 3),
    grain: round(grain, 3),
    mood: moodLabel({ avgLightness, avgSaturation, contrast }),
    lineQuality: lineQualityLabel({ edgeDensity, contrast }),
  };
}

function suggestBrushSettings(metrics, palette) {
  const roughness = clamp(0.18 + metrics.grain * 0.62 + metrics.edgeDensity * 0.24, 0.12, 0.96);
  const textureScale = clamp(0.58 + metrics.grain * 1.1, 0.45, 1.9);
  const saturation = metrics.averageSaturation;
  const contrast = metrics.contrast;
  const edgeDensity = metrics.edgeDensity;
  const brush = suggestBrush({ saturation, contrast, edgeDensity, grain: metrics.grain });

  return {
    brush,
    roughness: round(roughness, 3),
    textureScale: round(textureScale, 3),
    opacity: round(clamp(0.68 + contrast * 0.24, 0.58, 0.94), 3),
    color: palette[0]?.hex || "#17120d",
    accentColor: palette.find((color) => color.saturation > 0.22)?.hex || palette[1]?.hex || palette[0]?.hex || "#9f4f38",
  };
}

function suggestBrush({ saturation, contrast, edgeDensity, grain }) {
  if (saturation > 0.34 && grain > 0.34) return "crayon";
  if (contrast > 0.5 && saturation < 0.18 && edgeDensity > 0.22) return "charcoal";
  if (edgeDensity < 0.18 && saturation > 0.18) return "watercolor";
  if (contrast > 0.42 && edgeDensity > 0.2) return "pencil";
  return saturation > 0.28 ? "crayon" : "pencil";
}

function createSeamlessTextureTile(imageData, metrics, options) {
  const size = options.tileSize;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const output = ctx.createImageData(size, size);
  const source = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const mean = metrics.averageLuminance;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sxSeed = Math.min(x, size - 1 - x);
      const sySeed = Math.min(y, size - 1 - y);
      const hash = hash2(sxSeed + options.tileSeed, sySeed + options.tileSeed * 3);
      const sx = hash % width;
      const sy = Math.floor(hash / width) % height;
      const sourceIndex = (sy * width + sx) * 4;
      const grainValue = luminance(source[sourceIndex], source[sourceIndex + 1], source[sourceIndex + 2]);
      const noise = (hashUnit(hash) - 0.5) * 44;
      const gray = clamp(Math.round(148 + (grainValue - mean) * 0.42 + noise), 68, 226);
      const index = (y * size + x) * 4;
      output.data[index] = gray;
      output.data[index + 1] = gray;
      output.data[index + 2] = gray;
      output.data[index + 3] = 255;
    }
  }

  ctx.putImageData(output, 0, 0);
  return {
    kind: "abstract-seamless-grain",
    width: size,
    height: size,
    dataUrl: canvas.toDataURL("image/png"),
  };
}

function estimateEdgeDensity(imageData, step) {
  const { width, height, data } = imageData;
  let total = 0;
  let count = 0;

  for (let y = 0; y < height - step; y += step) {
    for (let x = 0; x < width - step; x += step) {
      const index = (y * width + x) * 4;
      const rightIndex = (y * width + (x + step)) * 4;
      const downIndex = ((y + step) * width + x) * 4;
      const current = luminance(data[index], data[index + 1], data[index + 2]);
      const right = luminance(data[rightIndex], data[rightIndex + 1], data[rightIndex + 2]);
      const down = luminance(data[downIndex], data[downIndex + 1], data[downIndex + 2]);
      total += (Math.abs(current - right) + Math.abs(current - down)) / 510;
      count += 1;
    }
  }

  return count ? clamp(total / count * 2.2, 0, 1) : 0;
}

function moodLabel({ avgLightness, avgSaturation, contrast }) {
  if (avgLightness < 0.36 && contrast > 0.38) return "dark and moody";
  if (avgLightness > 0.72 && avgSaturation > 0.24) return "bright and lively";
  if (avgSaturation < 0.16) return "muted and quiet";
  if (contrast > 0.5) return "high-contrast and energetic";
  return "soft and balanced";
}

function lineQualityLabel({ edgeDensity, contrast }) {
  if (edgeDensity > 0.42) return "busy, broken, heavily textured";
  if (edgeDensity > 0.26 && contrast > 0.36) return "confident, varied-width, textured";
  if (edgeDensity > 0.18) return "loose, sketchy, softly broken";
  return "soft, low-edge, wash-like";
}

function bucket(value, bucketSize) {
  return clamp(Math.round(value / bucketSize) * bucketSize, 0, 255);
}

function rgbToHsl(r, g, b) {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === nr) h = (ng - nb) / d + (ng < nb ? 6 : 0);
  else if (max === ng) h = (nb - nr) / d + 2;
  else h = (nr - ng) / d + 4;
  return { h: h / 6, s, l };
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function hash2(x, y) {
  let value = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y ^ 0xc2b2ae35, 0x27d4eb2f);
  value ^= value >>> 15;
  value = Math.imul(value, 0x2c1b3c6d);
  value ^= value >>> 12;
  return value >>> 0;
}

function hashUnit(value) {
  return (value % 10000) / 10000;
}

function isImageData(value) {
  return typeof ImageData !== "undefined" && value instanceof ImageData;
}

function isCanvasLike(value) {
  return value && typeof value.getContext === "function" && Number.isFinite(value.width) && Number.isFinite(value.height);
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function revokeObjectUrl(value) {
  if (value) URL.revokeObjectURL(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, places = 3) {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}
