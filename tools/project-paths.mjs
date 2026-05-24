import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function resolveProjectDir(projectArg, options = {}) {
  const root = options.root || repoRoot;
  const projectsRoot = resolve(root, "projects");
  const raw = String(projectArg || "").trim();
  const directPath = resolve(root, raw);
  if (existsSync(directPath)) return directPath;

  const projectRef = normalizeProjectRef(raw);
  if (projectRef) {
    const refPath = resolve(projectsRoot, projectRef);
    if (existsSync(refPath)) return refPath;
  }

  const slug = slugify(raw.split(/[\\/]/).pop() || raw);
  const nestedPath = slug ? findSceneProjectDir(projectsRoot, slug) : "";
  if (nestedPath) return nestedPath;

  return resolve(projectsRoot, projectRef || slug || raw);
}

export function readProjectManifest(projectDir) {
  return JSON.parse(readFileSync(resolve(projectDir, "project.json"), "utf8"));
}

export function projectRefForDir(projectDir, manifest = {}, options = {}) {
  const root = options.root || repoRoot;
  const projectsRoot = resolve(root, "projects");
  const explicitRef = normalizeProjectRef(manifest.projectRef || manifest.sceneCollection?.projectRef || "");
  if (explicitRef) return explicitRef;

  const projectRelative = relative(projectsRoot, projectDir).replace(/\\/g, "/");
  return normalizeProjectRef(projectRelative) || slugify(manifest.slug || "");
}

export function projectPathForDir(projectDir, manifest = {}, options = {}) {
  return `projects/${projectRefForDir(projectDir, manifest, options)}`;
}

export function normalizeProjectRef(projectRef) {
  return String(projectRef || "")
    .trim()
    .replace(/^\.?\//, "")
    .replace(/^projects[\\/]+/, "")
    .split(/[\\/]+/)
    .map((segment) => slugify(segment))
    .filter(Boolean)
    .join("/");
}

function findSceneProjectDir(projectsRoot, slug) {
  if (!existsSync(projectsRoot)) return "";

  for (const entry of readdirSync(projectsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const rootDir = resolve(projectsRoot, entry.name);
    const indexPath = resolve(rootDir, "scenes.json");
    if (!existsSync(indexPath)) continue;

    try {
      const index = JSON.parse(readFileSync(indexPath, "utf8"));
      const scenes = Array.isArray(index.scenes) ? index.scenes : [];
      const scene = scenes.find((item) => slugify(item?.slug || "") === slug);
      if (!scene) continue;

      const indexedRef = normalizeProjectRef(scene.projectRef || scene.projectPath || "");
      if (indexedRef) {
        const indexedDir = resolve(projectsRoot, indexedRef);
        if (existsSync(indexedDir)) return indexedDir;
      }

      const nestedDir = resolve(rootDir, "scenes", slug);
      if (existsSync(nestedDir)) return nestedDir;
    } catch {
      // Ignore malformed scene indexes while resolving a project path.
    }
  }

  return "";
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
