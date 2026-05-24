import { createEmptyRenderer } from "./renderers/empty-renderer.js";

export async function loadProject(projectRef) {
  const safeProjectRef = normalizeProjectRef(projectRef);
  const manifestUrl = `/projects/${safeProjectRef}/project.json`;
  const response = await fetch(manifestUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Project manifest not found: ${manifestUrl}`);
  }

  const manifest = normalizeManifest(await response.json(), safeProjectRef);
  const renderer = await loadRenderer(safeProjectRef, manifest);

  return { manifest, renderer };
}

async function loadRenderer(projectRef, manifest) {
  if (!manifest.renderer) return createEmptyRenderer("Renderer not built yet");

  const rendererUrl = `/projects/${projectRef}/${manifest.renderer}`;
  const rendererPath = `projects/${projectRef}/${manifest.renderer}`;
  const exists = await rendererExists(rendererUrl);
  if (!exists) return createEmptyRenderer("Renderer not built yet");

  try {
    const module = await import(/* @vite-ignore */ `${rendererUrl}?v=${Date.now()}`);
    return {
      ...module,
      rendererPath,
      exportNames: Object.keys(module),
      project: {
        ...manifest,
        ...(module.project || {}),
      },
      drawFrame: module.drawFrame,
    };
  } catch (error) {
    throw decorateRendererLoadError(error, {
      projectRef,
      manifest,
      rendererPath,
    });
  }
}

async function rendererExists(rendererUrl) {
  try {
    const response = await fetch(rendererUrl, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

function decorateRendererLoadError(error, { projectRef, manifest, rendererPath }) {
  error.inky = {
    kind: "renderer-import",
    project: manifest.slug || projectRef,
    projectRef,
    renderer: rendererPath,
    manifest,
    message: error?.message || "The renderer module could not be imported.",
    suggestion: `Fix ${rendererPath}, then refresh the preview. Syntax and import errors are no longer hidden by the empty renderer.`,
  };
  return error;
}

function normalizeManifest(raw, fallbackSlug) {
  const fallbackProjectRef = normalizeProjectRef(fallbackSlug);
  const fallbackProjectSlug = projectSlugFromRef(fallbackProjectRef);
  const manifestSlug = normalizeProjectSlug(raw.slug || fallbackProjectSlug);
  const projectRef = normalizeProjectRef(raw.projectRef || raw.sceneCollection?.projectRef || fallbackProjectRef);
  const width = numberOr(raw.width, 960);
  const height = numberOr(raw.height, 620);
  const fps = numberOr(raw.fps, 12);
  const totalFrames = numberOr(raw.totalFrames, 96);
  const sceneCollection = normalizeSceneCollection(raw.sceneCollection, {
    manifestSlug,
    projectRef,
  });

  return {
    slug: manifestSlug,
    projectRef,
    title: raw.title || titleFromSlug(raw.slug || fallbackProjectSlug),
    status: raw.status || "draft",
    width,
    height,
    fps,
    totalFrames,
    grid: {
      mode: raw.grid?.mode === "auto" ? "auto" : "manual",
      columns: numberOr(raw.grid?.columns, 3),
      rows: numberOr(raw.grid?.rows, 4),
    },
    style: {
      ...(raw.style && typeof raw.style === "object" && !Array.isArray(raw.style) ? raw.style : {}),
      inspDir: raw.style?.inspDir || "insp",
      references: Array.isArray(raw.style?.references) ? raw.style.references : [],
    },
    storyboard: raw.storyboard || {},
    prompt: raw.prompt || {},
    notes: raw.notes || {},
    scenePlan: raw.scenePlan || {},
    tracks: raw.tracks || {},
    renderer: raw.renderer || "renderer.js",
    outputs: raw.outputs || {},
    ...(sceneCollection ? { sceneCollection } : {}),
  };
}

function normalizeSceneCollection(raw, { manifestSlug, projectRef }) {
  if (!raw || typeof raw !== "object") return null;

  const rootSlug = normalizeProjectSlug(raw.rootSlug || projectRef.split("/")[0] || manifestSlug);
  const sceneNumber = positiveIntegerOrNull(raw.sceneNumber);
  const sceneId = String(raw.sceneId || "").trim();
  const scenes = String(raw.scenes || "").trim();
  const projectPath = String(raw.projectPath || "").trim();
  const previousSlug = raw.previousSlug ? normalizeProjectSlug(raw.previousSlug) : "";

  return {
    rootSlug,
    projectRef: normalizeProjectRef(raw.projectRef || projectRef),
    ...(sceneId ? { sceneId } : {}),
    ...(sceneNumber ? { sceneNumber } : {}),
    ...(scenes ? { scenes } : {}),
    ...(projectPath ? { projectPath } : {}),
    ...(previousSlug ? { previousSlug } : {}),
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

function normalizeProjectRef(projectRef) {
  const segments = String(projectRef || "")
    .trim()
    .replace(/^\.?\//, "")
    .replace(/^projects[\\/]+/, "")
    .split(/[\\/]+/)
    .map((segment) => normalizeProjectSlug(segment))
    .filter(Boolean);
  return segments.join("/") || "untitled-project";
}

function projectSlugFromRef(projectRef) {
  const segments = normalizeProjectRef(projectRef).split("/").filter(Boolean);
  return segments[segments.length - 1] || "untitled-project";
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

function positiveIntegerOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
