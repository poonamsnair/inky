export function createProjectContext(manifest = {}) {
  const activeProjectRef = normalizeProjectRef(manifest.projectRef || manifest.sceneCollection?.projectRef || manifest.slug);
  const sceneCollection = manifest.sceneCollection && typeof manifest.sceneCollection === "object" ? manifest.sceneCollection : null;
  const activeSlug = normalizeSlug(manifest.slug || lastProjectRefSegment(activeProjectRef));
  const rootSlug = normalizeSlug(sceneCollection?.rootSlug || firstProjectRefSegment(activeProjectRef) || activeSlug);
  const isSceneLibrary = Boolean(sceneCollection?.rootSlug || activeProjectRef.includes("/scenes/"));
  const isRootScene = activeSlug === rootSlug;
  const scene = isSceneLibrary
    ? {
        slug: activeSlug,
        projectRef: activeProjectRef,
        title: manifest.title || titleFromSlug(activeSlug),
        id: sceneCollection?.sceneId || null,
        number: positiveIntegerOrNull(sceneCollection?.sceneNumber),
        scenesPath: sceneCollection?.scenes || null,
        projectPath: sceneCollection?.projectPath || `projects/${activeProjectRef}`,
        previousSlug: sceneCollection?.previousSlug || null,
        isRoot: isRootScene,
      }
    : null;

  return {
    project: {
      slug: rootSlug,
      projectRef: rootSlug,
      title: isRootScene ? manifest.title || titleFromSlug(rootSlug) : titleFromSlug(rootSlug),
    },
    activeSlug,
    activeProjectRef,
    scene,
    isSceneLibrary,
    isNestedScene: Boolean(scene && !scene.isRoot),
  };
}

function normalizeProjectRef(projectRef) {
  const segments = String(projectRef || "")
    .trim()
    .replace(/^\.?\//, "")
    .replace(/^projects[\\/]+/, "")
    .split(/[\\/]+/)
    .map((segment) => normalizeSlug(segment))
    .filter(Boolean);
  return segments.join("/") || "untitled-project";
}

function firstProjectRefSegment(projectRef) {
  return normalizeProjectRef(projectRef).split("/").filter(Boolean)[0] || "";
}

function lastProjectRefSegment(projectRef) {
  const segments = normalizeProjectRef(projectRef).split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

function normalizeSlug(value) {
  return (
    String(value || "")
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

function positiveIntegerOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Math.round(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
