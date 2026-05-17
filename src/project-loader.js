import { createEmptyRenderer } from "./renderers/empty-renderer.js";

export async function loadProject(slug) {
  const safeSlug = normalizeProjectSlug(slug);
  const manifestUrl = `/projects/${safeSlug}/project.json`;
  const response = await fetch(manifestUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Project manifest not found: ${manifestUrl}`);
  }

  const manifest = normalizeManifest(await response.json(), safeSlug);
  const renderer = await loadRenderer(safeSlug, manifest);

  return { manifest, renderer };
}

async function loadRenderer(slug, manifest) {
  if (!manifest.renderer) return createEmptyRenderer("Renderer not built yet");

  try {
    const rendererUrl = `/projects/${slug}/${manifest.renderer}`;
    const module = await import(/* @vite-ignore */ rendererUrl);
    return {
      project: {
        ...manifest,
        ...(module.project || {}),
      },
      drawFrame: module.drawFrame,
    };
  } catch (error) {
    console.warn("Falling back to empty renderer", error);
    return createEmptyRenderer("Renderer not built yet");
  }
}

function normalizeManifest(raw, fallbackSlug) {
  const width = numberOr(raw.width, 960);
  const height = numberOr(raw.height, 620);
  const fps = numberOr(raw.fps, 12);
  const totalFrames = numberOr(raw.totalFrames, 96);

  return {
    slug: normalizeProjectSlug(raw.slug || fallbackSlug),
    title: raw.title || titleFromSlug(raw.slug || fallbackSlug),
    status: raw.status || "draft",
    width,
    height,
    fps,
    totalFrames,
    grid: {
      columns: numberOr(raw.grid?.columns, 3),
      rows: numberOr(raw.grid?.rows, 4),
    },
    storyboard: raw.storyboard || {},
    prompt: raw.prompt || {},
    tracks: raw.tracks || {},
    renderer: raw.renderer || "renderer.js",
    outputs: raw.outputs || {},
  };
}

function normalizeProjectSlug(slug) {
  return (
    String(slug)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-project"
  );
}

function titleFromSlug(slug) {
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
