import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { defineConfig } from "vite";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const projectsRoot = resolve(repoRoot, "projects");
const execFileAsync = promisify(execFile);
const MAX_MP4_UPLOAD_BYTES = 250 * 1024 * 1024;
const MAX_ANNOTATION_UPLOAD_BYTES = 60 * 1024 * 1024;
const MAX_EDIT_LAYER_BYTES = 20 * 1024 * 1024;
const MAX_CONSTRUCTION_BYTES = 12 * 1024 * 1024;
const MAX_STYLE_TOKENS_BYTES = 4 * 1024 * 1024;
const MAX_STORYBOARD_UPLOAD_BYTES = 120 * 1024 * 1024;
const MAX_SCENE_REQUEST_BYTES = 120 * 1024 * 1024;
const MAX_REFERENCE_IMAGES = 3;
const MAX_STYLE_REFERENCES = 12;
const ALLOWED_SPEEDS = new Set(["0.5", "0.75", "1", "1.25", "1.5", "2"]);
const REFERENCE_IMAGE_EXTENSIONS = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const STORYBOARD_IMAGE_EXTENSIONS = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export default defineConfig({
  plugins: [inkyMp4OutputPlugin()],
});

function inkyMp4OutputPlugin() {
  return {
    name: "inky-mp4-output",
    configureServer(server) {
      installProjectListMiddleware(server.middlewares);
      installProjectCreateMiddleware(server.middlewares);
      installMp4OutputMiddleware(server.middlewares);
      installAnnotationMiddleware(server.middlewares);
      installEditLayerMiddleware(server.middlewares);
      installProjectMemoryMiddleware(server.middlewares);
      installSceneMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      installProjectListMiddleware(server.middlewares);
      installProjectCreateMiddleware(server.middlewares);
      installMp4OutputMiddleware(server.middlewares);
      installAnnotationMiddleware(server.middlewares);
      installEditLayerMiddleware(server.middlewares);
      installProjectMemoryMiddleware(server.middlewares);
      installSceneMiddleware(server.middlewares);
    },
  };
}

function installProjectListMiddleware(middlewares) {
  middlewares.use(async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname !== "/api/projects") return next();
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return sendJson(res, 405, { ok: false, error: "Use GET to list projects." });
    }

    try {
      const projects = await listSavedProjects();
      return sendJson(res, 200, { ok: true, projects });
    } catch (error) {
      console.error("[inky-project-list] Failed to list projects", error);
      return sendJson(res, 500, { ok: false, error: "Could not load saved projects." });
    }
  });
}

async function listSavedProjects() {
  if (!existsSync(projectsRoot)) return [];

  const entries = await readdir(projectsRoot, { withFileTypes: true });
  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const projectDir = resolve(projectsRoot, entry.name);
    if (!isInside(projectsRoot, projectDir)) continue;

    const manifest = await readOptionalProjectManifest(projectDir);
    if (!manifest) continue;

    projects.push(projectIndexEntry(manifest, entry.name));
  }

  return projects.sort(compareProjectIndexEntries);
}

async function readOptionalProjectManifest(projectDir) {
  const manifestPath = resolve(projectDir, "project.json");
  if (!isInside(projectDir, manifestPath) || !existsSync(manifestPath)) return null;

  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function projectIndexEntry(manifest, projectRef, options = {}) {
  const safeProjectRef = normalizeProjectRef(manifest.projectRef || manifest.sceneCollection?.projectRef || projectRef, projectRef);
  const slug = slugify(manifest.slug || safeProjectRef.split("/").pop() || "");
  const rootSlug = slugify(options.rootSlug || manifest.sceneCollection?.rootSlug || safeProjectRef.split("/")[0] || slug);
  const isScene = Boolean(options.isScene || safeProjectRef.includes("/scenes/"));

  return {
    slug,
    projectRef: safeProjectRef,
    title: String(manifest.title || titleFromSlug(slug)).trim(),
    status: String(manifest.status || "draft").trim(),
    isScene,
    rootSlug,
    rootTitle: String(options.rootTitle || "").trim(),
    sceneNumber: finiteNumber(manifest.sceneCollection?.sceneNumber, null),
    href: `/?project=${encodeURIComponent(safeProjectRef)}`,
  };
}

function compareProjectIndexEntries(first, second) {
  const firstRoot = first.isScene ? first.rootSlug : first.slug;
  const secondRoot = second.isScene ? second.rootSlug : second.slug;
  if (firstRoot !== secondRoot) {
    const firstRootTitle = first.isScene ? first.rootTitle || firstRoot : first.title || firstRoot;
    const secondRootTitle = second.isScene ? second.rootTitle || secondRoot : second.title || secondRoot;
    return firstRootTitle.localeCompare(secondRootTitle);
  }
  if (first.isScene !== second.isScene) return first.isScene ? 1 : -1;
  return (first.sceneNumber || 0) - (second.sceneNumber || 0) || first.title.localeCompare(second.title);
}

function installProjectCreateMiddleware(middlewares) {
  middlewares.use(async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    if (url.pathname !== "/api/projects/from-storyboard") return next();
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJson(res, 405, { ok: false, error: "Use POST to create a storyboard project." });
    }

    try {
      const body = await readRequestBuffer(req, MAX_STORYBOARD_UPLOAD_BYTES);
      const payload = JSON.parse(body.toString("utf8") || "{}");
      const slug = slugify(payload.slug || payload.projectName || payload.name);
      if (!slug) {
        return sendJson(res, 400, { ok: false, error: "Project name is required." });
      }

      const grid = normalizeGrid(payload.grid);
      const prompt =
        String(payload.prompt || "").trim() ||
        "Use the reference image to plan the composition. Analyze any insp/ style references with window.inky.analyzeStyle(); if none are provided, match the target image's own style. Use window.inky.showReference() while aligning, extract paths only when contours need coordinate scaffolding, compare brush starting points from listBrushes(), then draw with explicit Inky canvas primitives.";
      const storyboardImage = decodeStoryboardDataUrl(payload.imageDataUrl || payload.image || "", payload.imageName || "storyboard.png");
      const styleUploads = normalizeStyleReferenceUploads(payload.styleReferences).slice(0, MAX_STYLE_REFERENCES);

      const projectDir = await resolveExistingProjectDir(slug);
      if (!isInside(projectsRoot, projectDir)) {
        return sendJson(res, 400, { ok: false, error: "Invalid project path." });
      }

      const extension = storyboardImage.extension || extensionForFileName(payload.imageName || "storyboard.png");
      const safeExtension = STORYBOARD_IMAGE_EXTENSIONS[storyboardImage.type] || extension || "png";
      const imageDir = resolve(projectDir, "image");
      const inspDir = resolve(projectDir, "insp");
      const promptDir = resolve(projectDir, "prompt");
      const storyboardDir = resolve(projectDir, "storyboard");
      const outputsDir = resolve(projectDir, "outputs");
      const storyboardImagePath = resolve(imageDir, `storyboard.${safeExtension}`);

      for (const path of [imageDir, inspDir, promptDir, storyboardDir, outputsDir, storyboardImagePath]) {
        if (!isInside(projectDir, path)) {
          return sendJson(res, 400, { ok: false, error: "Invalid project file path." });
        }
      }

      await mkdir(imageDir, { recursive: true });
      await mkdir(inspDir, { recursive: true });
      await mkdir(promptDir, { recursive: true });
      await mkdir(storyboardDir, { recursive: true });
      await mkdir(outputsDir, { recursive: true });
      await writeFile(storyboardImagePath, storyboardImage.buffer);

      const styleReferences = [];
      for (const upload of styleUploads) {
        const stylePath = resolve(inspDir, upload.savedName);
        if (!isInside(inspDir, stylePath)) {
          return sendJson(res, 400, { ok: false, error: "Invalid style reference file path." });
        }
        await writeFile(stylePath, upload.buffer);
        styleReferences.push({
          path: `insp/${upload.savedName}`,
          name: upload.name,
          type: upload.type,
          command: `/style insp/${upload.savedName}`,
        });
      }

      const relativeStoryboardImage = `projects/${slug}/image/storyboard.${safeExtension}`;
      const relativeStoryboardDir = `projects/${slug}/storyboard`;
      if (grid.mode === "auto") {
        await writeAutoStoryboardBrief({
          storyboardDir,
          slug,
          relativeStoryboardImage,
          prompt,
        });
      } else {
        await execFileAsync(
          process.execPath,
          [
            join(repoRoot, "tools/start-storyboard-project.mjs"),
            relativeStoryboardImage,
            relativeStoryboardDir,
            String(grid.columns),
            String(grid.rows),
            "--requirements",
            prompt,
            "--name",
            slug,
          ],
          { cwd: repoRoot },
        );
      }

      const agentPrompt = generateAgentPrompt({
        slug,
        extension: safeExtension,
        grid,
        prompt,
        styleReferences,
      });
      await writeFile(resolve(promptDir, "agent-prompt.md"), `${agentPrompt}\n`);

      const manifestPath = resolve(projectDir, "project.json");
      const existingManifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")) : {};
      const manifest = createProjectManifest({
        existingManifest,
        slug,
        grid,
        extension: safeExtension,
        styleReferences,
      });
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      await ensureSceneGraphFiles(projectDir, manifest);

      const rendererPath = resolve(projectDir, manifest.renderer || "renderer.js");
      if (!isInside(projectDir, rendererPath)) {
        return sendJson(res, 400, { ok: false, error: "Invalid renderer path." });
      }
      if (!existsSync(rendererPath)) {
        await writeFile(rendererPath, createRendererStub(manifest));
      }

      return sendJson(res, 200, {
        ok: true,
        slug,
        projectPath: `projects/${slug}`,
        manifestPath: `projects/${slug}/project.json`,
        rendererPath: `projects/${slug}/${manifest.renderer || "renderer.js"}`,
        storyboardImage: relativeStoryboardImage,
        inspDir: `projects/${slug}/insp`,
        styleReferences,
        storyboardDir: relativeStoryboardDir,
        previewPath: `/?project=${slug}`,
        command: generateCliCommand({ slug, prompt, grid, imageName: payload.imageName || `storyboard.${safeExtension}`, styleReferences }),
        agentPrompt,
      });
    } catch (error) {
      if (error?.statusCode) {
        return sendJson(res, error.statusCode, { ok: false, error: error.message });
      }
      console.error("[inky-project-create] Failed to create project", error);
      return sendJson(res, 500, { ok: false, error: "Could not create the storyboard project." });
    }
  });
}

function installMp4OutputMiddleware(middlewares) {
  middlewares.use(async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    const match = url.pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/outputs\/mp4$/);
    if (!match) return next();
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJson(res, 405, { ok: false, error: "Use POST to save an MP4 export." });
    }

    try {
      const slug = match[1];
      const speed = normalizeSpeedLabel(url.searchParams.get("speed"));
      if (!speed) {
        return sendJson(res, 400, { ok: false, error: "Unsupported playback speed." });
      }

      const projectDir = await resolveExistingProjectDir(slug);
      if (!isInside(projectsRoot, projectDir)) {
        return sendJson(res, 400, { ok: false, error: "Invalid project path." });
      }

      const body = await readRequestBuffer(req, MAX_MP4_UPLOAD_BYTES);
      if (!body.byteLength) {
        return sendJson(res, 400, { ok: false, error: "No MP4 data was uploaded." });
      }

      const manifestPath = resolve(projectDir, "project.json");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      const outputsDir = resolve(projectDir, "outputs");
      if (!isInside(projectDir, outputsDir)) {
        return sendJson(res, 400, { ok: false, error: "Invalid output path." });
      }

      await mkdir(outputsDir, { recursive: true });
      const filename = `${slug}-${speed}x.mp4`;
      const outputPath = resolve(outputsDir, filename);
      if (!isInside(outputsDir, outputPath)) {
        return sendJson(res, 400, { ok: false, error: "Invalid output file path." });
      }

      await writeFile(outputPath, body);

      const projectRelativePath = `outputs/${filename}`;
      const outputs = objectOrEmpty(manifest.outputs);
      const videoBySpeed = objectOrEmpty(outputs.videoBySpeed);
      videoBySpeed[speed] = projectRelativePath;
      outputs.videoBySpeed = videoBySpeed;
      if (speed === "1") outputs.video = projectRelativePath;
      manifest.outputs = outputs;

      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      return sendJson(res, 200, {
        ok: true,
        path: projectRelativePath,
        outputs,
      });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return sendJson(res, 404, { ok: false, error: "Project manifest was not found." });
      }
      if (error?.statusCode) {
        return sendJson(res, error.statusCode, { ok: false, error: error.message });
      }
      console.error("[inky-mp4-output] Failed to save MP4", error);
      return sendJson(res, 500, { ok: false, error: "Could not save the MP4 export." });
    }
  });
}

function installAnnotationMiddleware(middlewares) {
  middlewares.use(async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    const match = url.pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/annotations$/);
    if (!match) return next();

    try {
      const slug = match[1];
      const projectDir = await resolveExistingProjectDir(slug);
      if (!isInside(projectsRoot, projectDir)) {
        return sendJson(res, 400, { ok: false, error: "Invalid project path." });
      }

      const manifestPath = resolve(projectDir, "project.json");
      if (!isInside(projectDir, manifestPath) || !existsSync(manifestPath)) {
        return sendJson(res, 404, { ok: false, error: "Project manifest was not found." });
      }
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      const projectRef = manifest.projectRef || manifest.sceneCollection?.projectRef || slug;

      const storyboardDir = resolve(projectDir, "storyboard");
      const annotationsPath = resolve(storyboardDir, "annotations.json");
      if (!isInside(projectDir, storyboardDir) || !isInside(storyboardDir, annotationsPath)) {
        return sendJson(res, 400, { ok: false, error: "Invalid annotation path." });
      }

      if (req.method === "GET") {
        if (!existsSync(annotationsPath)) {
          return sendJson(res, 200, { ok: true, version: 1, project: slug, projectRef, annotations: [] });
        }
        const annotations = JSON.parse(await readFile(annotationsPath, "utf8"));
        return sendJson(res, 200, { ok: true, ...annotations, project: annotations.project || slug, projectRef });
      }

      if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return sendJson(res, 405, { ok: false, error: "Use GET or POST for annotations." });
      }

      const body = await readRequestBuffer(req, MAX_ANNOTATION_UPLOAD_BYTES);
      const payload = JSON.parse(body.toString("utf8") || "{}");
      const annotations = Array.isArray(payload.annotations) ? payload.annotations : [];
      const normalizedAnnotations = await normalizeAnnotationUpload({ annotations, projectDir, slug });
      const saved = {
        version: Number(payload.version) || 1,
        project: slug,
        projectRef,
        updatedAt: new Date().toISOString(),
        annotations: normalizedAnnotations,
      };

      await mkdir(storyboardDir, { recursive: true });
      await writeFile(annotationsPath, `${JSON.stringify(saved, null, 2)}\n`);

      let promptPath = "";
      if (typeof payload.prompt === "string" && payload.prompt.trim()) {
        const promptDir = resolve(projectDir, "prompt");
        const nextPromptPath = resolve(promptDir, "annotation-prompt.md");
        if (!isInside(projectDir, promptDir) || !isInside(promptDir, nextPromptPath)) {
          return sendJson(res, 400, { ok: false, error: "Invalid prompt path." });
        }
        await mkdir(promptDir, { recursive: true });
        await writeFile(nextPromptPath, `${payload.prompt.trim()}\n`);
        promptPath = "prompt/annotation-prompt.md";
      }

      return sendJson(res, 200, {
        ok: true,
        path: "storyboard/annotations.json",
        promptPath,
        annotations: normalizedAnnotations,
      });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return sendJson(res, 404, { ok: false, error: "Project was not found." });
      }
      if (error?.statusCode) {
        return sendJson(res, error.statusCode, { ok: false, error: error.message });
      }
      console.error("[inky-annotations] Failed to save annotations", error);
      return sendJson(res, 500, { ok: false, error: "Could not save annotations." });
    }
  });
}

function installEditLayerMiddleware(middlewares) {
  middlewares.use(async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    const match = url.pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/edit-layer$/);
    if (!match) return next();

    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return sendJson(res, 405, { ok: false, error: "Use GET or POST for the edit layer." });
    }

    try {
      const slug = match[1];
      const projectDir = await resolveExistingProjectDir(slug);
      if (!isInside(projectsRoot, projectDir)) {
        return sendJson(res, 400, { ok: false, error: "Invalid project path." });
      }

      const manifest = await readProjectManifest(projectDir);
      const projectRef = manifest.projectRef || manifest.sceneCollection?.projectRef || slug;
      const storyboardDir = resolve(projectDir, "storyboard");
      const sceneObjectsPath = resolve(storyboardDir, "scene-objects.json");
      const editLayerPath = resolve(storyboardDir, "edit-layer.json");
      if (!isInside(projectDir, storyboardDir) || !isInside(storyboardDir, sceneObjectsPath) || !isInside(storyboardDir, editLayerPath)) {
        return sendJson(res, 400, { ok: false, error: "Invalid edit layer path." });
      }

      if (req.method === "GET") {
        const baseGraph = existsSync(sceneObjectsPath)
          ? normalizeSceneObjectsJson(JSON.parse(await readFile(sceneObjectsPath, "utf8")), manifest)
          : emptySceneObjects(manifest);
        const editLayer = existsSync(editLayerPath)
          ? normalizeEditLayerJson(JSON.parse(await readFile(editLayerPath, "utf8")))
          : emptyEditLayer();
        return sendJson(res, 200, {
          ok: true,
          project: slug,
          projectRef,
          baseGraph,
          editLayer,
          paths: {
            baseGraph: "storyboard/scene-objects.json",
            editLayer: "storyboard/edit-layer.json",
          },
        });
      }

      const body = await readRequestBuffer(req, MAX_EDIT_LAYER_BYTES);
      const payload = body.byteLength ? JSON.parse(body.toString("utf8")) : {};
      const editLayer = normalizeEditLayerJson(payload);
      await mkdir(storyboardDir, { recursive: true });
      await writeFile(editLayerPath, `${JSON.stringify(editLayer, null, 2)}\n`);
      if (!existsSync(sceneObjectsPath)) {
        await writeFile(sceneObjectsPath, `${JSON.stringify(emptySceneObjects(manifest), null, 2)}\n`);
      }

      return sendJson(res, 200, {
        ok: true,
        project: slug,
        projectRef,
        path: "storyboard/edit-layer.json",
        editLayer,
      });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return sendJson(res, 404, { ok: false, error: "Project was not found." });
      }
      if (error?.statusCode) {
        return sendJson(res, error.statusCode, { ok: false, error: error.message });
      }
      console.error("[inky-edit-layer] Failed to handle edit layer", error);
      return sendJson(res, 500, { ok: false, error: "Could not update the edit layer." });
    }
  });
}

function installProjectMemoryMiddleware(middlewares) {
  middlewares.use(async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    const match = url.pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/(construction|style-tokens)$/);
    if (!match) return next();

    const slug = match[1];
    const memoryType = match[2];
    if (!["GET", "POST"].includes(req.method || "")) {
      res.setHeader("Allow", "GET, POST");
      return sendJson(res, 405, { ok: false, error: "Use GET or POST for project memory files." });
    }

    try {
      const projectDir = await resolveExistingProjectDir(slug);
      const manifest = await readProjectManifest(projectDir);
      const memory = projectMemoryFile(projectDir, memoryType);

      if (req.method === "GET") {
        if (!existsSync(memory.path)) {
          return sendJson(res, 404, { ok: false, error: `${memory.label} has not been created yet.`, path: memory.projectPath });
        }
        const value = JSON.parse(await readFile(memory.path, "utf8"));
        return sendJson(res, 200, { ok: true, project: slug, path: memory.projectPath, [memory.key]: value });
      }

      const body = await readRequestBuffer(req, memory.maxBytes);
      const parsedPayload = body.byteLength ? JSON.parse(body.toString("utf8")) : {};
      const payload = parsedPayload && typeof parsedPayload === "object" ? parsedPayload : {};
      const value = payload[memory.key] || payload.data || payload;
      const normalized = normalizeProjectMemoryJson(value, {
        type: memoryType,
        project: slug,
        projectRef: manifest.projectRef || manifest.sceneCollection?.projectRef || slug,
      });

      await mkdir(memory.dir, { recursive: true });
      await writeFile(memory.path, `${JSON.stringify(normalized, null, 2)}\n`);
      return sendJson(res, 200, {
        ok: true,
        project: slug,
        path: memory.projectPath,
        [memory.key]: normalized,
      });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return sendJson(res, 404, { ok: false, error: "Project was not found." });
      }
      if (error?.statusCode) {
        return sendJson(res, error.statusCode, { ok: false, error: error.message });
      }
      console.error("[inky-project-memory] Failed to update project memory", error);
      return sendJson(res, 500, { ok: false, error: "Could not update project memory." });
    }
  });
}

function projectMemoryFile(projectDir, memoryType) {
  if (memoryType === "construction") {
    const dir = resolve(projectDir, "storyboard");
    const path = resolve(dir, "construction.json");
    if (!isInside(projectDir, dir) || !isInside(dir, path)) {
      throw statusError(400, "Invalid construction path.");
    }
    return {
      key: "construction",
      label: "Optional reference alignment",
      dir,
      path,
      projectPath: "storyboard/construction.json",
      maxBytes: MAX_CONSTRUCTION_BYTES,
    };
  }

  const dir = projectDir;
  const path = resolve(dir, "style-tokens.json");
  if (!isInside(projectDir, path)) {
    throw statusError(400, "Invalid style token path.");
  }
  return {
    key: "styleTokens",
    label: "Style tokens",
    dir,
    path,
    projectPath: "style-tokens.json",
    maxBytes: MAX_STYLE_TOKENS_BYTES,
  };
}

function installSceneMiddleware(middlewares) {
  middlewares.use(async (req, res, next) => {
    const url = new URL(req.url || "/", "http://localhost");
    const match = url.pathname.match(/^\/api\/projects\/([a-z0-9-]+)\/scenes(?:\/(save|new|rename|delete))?$/);
    if (!match) return next();

    const slug = match[1];
    const action = match[2] || "";

    if (!action && req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return sendJson(res, 405, { ok: false, error: "Use GET to load scenes." });
    }
    if (action && req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendJson(res, 405, { ok: false, error: "Use POST to update scenes." });
    }

    try {
      let payload = {};
      if (req.method === "POST") {
        const body = await readRequestBuffer(req, MAX_SCENE_REQUEST_BYTES);
        const parsedPayload = body.byteLength ? JSON.parse(body.toString("utf8")) : {};
        payload = parsedPayload && typeof parsedPayload === "object" ? parsedPayload : {};
      }

      if (!action) {
        const collection = await resolveSceneCollection(slug, { create: true });
        return sendJson(res, 200, sceneResponse(collection, slug));
      }

      if (action === "save") {
        const collection = await saveCurrentScene(slug);
        return sendJson(res, 200, sceneResponse(collection, slug));
      }

      if (action === "new") {
        const result = await createNextSceneProject(slug, {
          prompt: payload.prompt || payload.brief,
          imageName: payload.imageName,
          imageDataUrl: payload.imageDataUrl,
          styleReferences: payload.styleReferences,
        });
        return sendJson(res, 200, {
          ...sceneResponse(result.collection, result.slug),
          slug: result.slug,
          projectRef: result.projectRef,
          scene: result.scene,
          projectPath: result.projectPath,
          manifestPath: result.manifestPath,
          rendererPath: result.rendererPath,
          storyboardImage: result.storyboardImage,
          styleReferences: result.styleReferences,
          agentPrompt: result.agentPrompt,
          previewPath: `/?project=${result.projectRef}`,
        });
      }

      if (action === "rename") {
        const collection = await renameSceneProject(slug, payload.title);
        return sendJson(res, 200, sceneResponse(collection, slug));
      }

      if (action === "delete") {
        const result = await deleteSceneProject(slug);
        return sendJson(res, 200, {
          ...sceneResponse(result.collection, result.redirectSlug),
          deletedSlug: slug,
          redirectSlug: result.redirectSlug,
          redirectProjectRef: result.redirectProjectRef,
        });
      }

      return sendJson(res, 404, { ok: false, error: "Unknown scene action." });
    } catch (error) {
      if (error?.code === "ENOENT") {
        return sendJson(res, 404, { ok: false, error: "Project was not found." });
      }
      if (error?.statusCode) {
        return sendJson(res, error.statusCode, { ok: false, error: error.message });
      }
      console.error("[inky-scenes] Failed to update scenes", error);
      return sendJson(res, 500, { ok: false, error: "Could not update scenes." });
    }
  });
}

async function resolveSceneCollection(slug, options = {}) {
  const projectDir = await resolveExistingProjectDir(slug);
  const manifestPath = resolve(projectDir, "project.json");
  const manifest = await readProjectManifest(projectDir);
  const metadata = objectOrEmpty(manifest.sceneCollection);
  let rootSlug = slugify(metadata.rootSlug || "");

  if (!rootSlug) {
    rootSlug = (await findSceneRootForSlug(slug)) || slug;
  }

  const rootDir = resolveProjectDir(rootSlug);
  const indexPath = resolve(rootDir, "scenes.json");
  if (!isInside(rootDir, indexPath)) {
    throw statusError(400, "Invalid scene index path.");
  }

  let index;
  if (existsSync(indexPath)) {
    index = normalizeSceneIndex(JSON.parse(await readFile(indexPath, "utf8")), rootSlug);
  } else if (options.create) {
    const rootManifest = rootSlug === slug && isInside(projectDir, rootDir) ? manifest : await readProjectManifest(rootDir);
    index = createSceneIndex(rootSlug, rootManifest);
    await writeSceneIndex(indexPath, index);
  } else {
    throw statusError(404, "Scene library was not found.");
  }

  const existingScene = index.scenes.find((scene) => scene.slug === slug);
  if (!existingScene) {
    const nextOrder = nextSceneOrder(index);
    index.scenes.push(
      sceneEntryFromManifest(manifest, slug, nextOrder, {
        rootSlug,
        projectRef: projectRefForProjectDir(rootSlug, slug, projectDir, rootDir),
      }),
    );
    await writeSceneIndex(indexPath, index);
  }

  return {
    slug,
    projectDir,
    manifestPath,
    manifest,
    rootSlug,
    rootDir,
    indexPath,
    index: normalizeSceneIndex(index, rootSlug),
  };
}

async function saveCurrentScene(slug) {
  const collection = await resolveSceneCollection(slug, { create: true });
  const existingScene = collection.index.scenes.find((scene) => scene.slug === slug);
  const order = existingScene?.order || nextSceneOrder(collection.index);
  const scene = {
    ...existingScene,
    ...sceneEntryFromManifest(collection.manifest, slug, order, {
      rootSlug: collection.rootSlug,
      projectRef: existingScene?.projectRef || projectRefForProjectDir(collection.rootSlug, slug, collection.projectDir, collection.rootDir),
    }),
    createdAt: existingScene?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  collection.index.scenes = collection.index.scenes.filter((entry) => entry.slug !== slug);
  collection.index.scenes.push(scene);
  const existingMetadata = objectOrEmpty(collection.manifest.sceneCollection);
  collection.manifest.sceneCollection = sceneCollectionMetadata(
    collection.rootSlug,
    scene,
    existingMetadata.previousSlug || existingScene?.sourceSlug || null,
  );

  await writeFile(collection.manifestPath, `${JSON.stringify(collection.manifest, null, 2)}\n`);
  await writeSceneIndex(collection.indexPath, collection.index);
  collection.index = normalizeSceneIndex(collection.index, collection.rootSlug);
  return collection;
}

async function createNextSceneProject(slug, options = {}) {
  const collection = await saveCurrentScene(slug);
  const rootManifest = await readProjectManifest(collection.rootDir);
  const sourceScene = collection.index.scenes.find((scene) => scene.slug === slug);
  const sourceManifest = collection.manifest;
  const sceneBrief = normalizeSceneBrief(options.prompt ?? options.brief);
  let order = nextSceneOrder(collection.index);
  let nextSlug = sceneSlugFor(collection.rootSlug, order);
  let targetDir = sceneProjectDir(collection.rootDir, nextSlug);

  while (existsSync(targetDir) || existsSync(resolveProjectDir(nextSlug, { mustExist: false }))) {
    order += 1;
    nextSlug = sceneSlugFor(collection.rootSlug, order);
    targetDir = sceneProjectDir(collection.rootDir, nextSlug);
  }

  if (!isInside(collection.rootDir, targetDir)) {
    throw statusError(400, "Invalid nested scene path.");
  }

  const targetProjectRef = sceneProjectRef(collection.rootSlug, nextSlug);
  const now = new Date().toISOString();
  const scene = sceneEntryFromManifest(
    {
      slug: nextSlug,
      title: `${collection.index.title || titleFromSlug(collection.rootSlug)} Scene ${String(order).padStart(2, "0")}`,
      status: "draft",
    },
    nextSlug,
    order,
    { rootSlug: collection.rootSlug, sourceSlug: slug, projectRef: targetProjectRef, createdAt: now, updatedAt: now },
  );

  await copySceneStarterFiles(collection.projectDir, targetDir);
  const sceneSourceImage = await saveSceneStoryboardImage(targetDir, {
    imageName: options.imageName,
    imageDataUrl: options.imageDataUrl,
  });
  const sceneStyleReferences = await saveSceneStyleReferences(targetDir, options.styleReferences);

  const targetManifest = createClonedSceneManifest({
    sourceManifest,
    rootManifest,
    collection,
    scene,
    projectRef: targetProjectRef,
    brief: sceneBrief,
    sourceImage: sceneSourceImage,
    styleReferences: sceneStyleReferences,
    sourceScene,
  });

  const targetManifestPath = resolve(targetDir, "project.json");
  const rendererPath = resolve(targetDir, targetManifest.renderer || "renderer.js");
  if (!isInside(targetDir, targetManifestPath) || !isInside(targetDir, rendererPath)) {
    throw statusError(400, "Invalid copied scene file path.");
  }
  if (!existsSync(rendererPath)) {
    throw statusError(404, "The source scene renderer could not be copied.");
  }
  await rebaseCopiedRendererImports({
    sourceDir: collection.projectDir,
    targetDir,
    renderer: targetManifest.renderer || "renderer.js",
  });

  await writeFile(targetManifestPath, `${JSON.stringify(targetManifest, null, 2)}\n`);
  await writeSceneReferenceReadmes(targetDir, collection, rootManifest, targetManifest, sourceScene);
  await writeSceneRequirements(targetDir, collection, scene, targetManifest);
  const agentPrompt = await writeScenePrompt(targetDir, collection, scene, targetManifest);
  await resetSceneAnnotations(targetDir, nextSlug);
  await ensureSceneGraphFiles(targetDir, targetManifest);

  collection.index.scenes.push(scene);
  await writeSceneIndex(collection.indexPath, collection.index);
  collection.index = normalizeSceneIndex(collection.index, collection.rootSlug);

  return {
    slug: nextSlug,
    projectRef: targetProjectRef,
    scene,
    collection,
    agentPrompt,
    projectPath: `projects/${targetProjectRef}`,
    manifestPath: `projects/${targetProjectRef}/project.json`,
    rendererPath: `projects/${targetProjectRef}/${targetManifest.renderer || "renderer.js"}`,
    storyboardImage: targetManifest.storyboard?.sourceImage || "",
    styleReferences: targetManifest.style?.references || [],
  };
}

function createClonedSceneManifest({
  sourceManifest,
  rootManifest,
  collection,
  scene,
  projectRef,
  brief,
  sourceImage,
  styleReferences = [],
  sourceScene = {},
}) {
  const source = objectOrEmpty(sourceManifest);
  const sourceStoryboard = objectOrEmpty(source.storyboard);
  const sourceStyle = objectOrEmpty(source.style);
  const sourcePrompt = objectOrEmpty(source.prompt);
  const sourceNotes = objectOrEmpty(source.notes);
  const sourceScenePlan = objectOrEmpty(source.scenePlan);
  const rootStyleReferences = Array.isArray(rootManifest.style?.references) ? rootManifest.style.references : [];
  const rootSourceImage = rootManifest.storyboard?.sourceImage || "";
  const sharedSourceImage = sourceStoryboard.sharedSourceImage || (rootSourceImage ? `../../${rootSourceImage.replace(/^\.?\//, "")}` : null);
  const localSourceImage = sourceImage?.path || sourceStoryboard.sourceImage || null;
  const copiedStyleReferences = Array.isArray(sourceStyle.references) ? sourceStyle.references : [];
  const hasNewSceneStyle = styleReferences.length > 0;
  const activeStyleReferences = hasNewSceneStyle ? styleReferences : copiedStyleReferences;
  const sourceProjectRef =
    source.projectRef || source.sceneCollection?.projectRef || sourceScene.projectRef || projectRefForProjectDir(collection.rootSlug, collection.slug, collection.projectDir, collection.rootDir);
  const sourceTitle = source.title || sourceScene.title || titleFromSlug(sourceScene.slug || collection.slug);

  return {
    ...source,
    slug: scene.slug,
    projectRef,
    title: scene.title,
    status: "draft",
    width: finiteNumber(source.width, finiteNumber(rootManifest.width, 960)),
    height: finiteNumber(source.height, finiteNumber(rootManifest.height, 620)),
    fps: finiteNumber(source.fps, finiteNumber(rootManifest.fps, 12)),
    totalFrames: finiteNumber(source.totalFrames, finiteNumber(rootManifest.totalFrames, 96)),
    grid: source.grid || { mode: "auto", columns: 1, rows: 1 },
    notes: {
      ...sourceNotes,
      clonedFrom: `Copied from ${sourceTitle} (${sourceProjectRef}) as the starting point for this scene.`,
      frameCount:
        sourceNotes.frameCount ||
        `Copied from ${sourceTitle}. Keep this timing while the new scene is still a duplicate, and adjust totalFrames when the next scene's action needs different pacing.`,
      style:
        hasNewSceneStyle
          ? "New scene-specific style references were provided during duplication. Analyze them first, then use the copied scene style only for continuity."
          : sourceNotes.style || "Style references were copied from the source scene so the new scene starts with the same look.",
      references:
        sourceImage?.path
          ? "A new scene-specific target image was provided during duplication. Use it as the first visual alignment reference."
          : sourceNotes.references || `Reference files were copied from ${sourceTitle}. Replace or add references when this scene's details change.`,
    },
    scenePlan: {
      ...sourceScenePlan,
      brief,
      frameCountStatus: "copied-from-source",
      frameCountReason: sourceScenePlan.frameCountReason || `Initial timing copied from ${sourceTitle}.`,
      styleReason: hasNewSceneStyle ? "New scene style references were supplied during duplication." : sourceScenePlan.styleReason || "Initial style copied from the source scene.",
      referencePolicy: sourceImage?.path
        ? "new scene-specific references override copied source references"
        : "copied source scene references are the starting point",
      copiedFrom: {
        slug: sourceScene.slug || collection.slug,
        projectRef: sourceProjectRef,
        title: sourceTitle,
      },
      sharedProjectRef: collection.rootSlug,
      sharedStyleTokens: sourceScenePlan.sharedStyleTokens || "../../style-tokens.json",
      sharedSourceImage,
      sceneSourceImage: localSourceImage,
      sharedStyleReferences:
        sourceScenePlan.sharedStyleReferences ||
        rootStyleReferences.map((reference) => ({
          ...reference,
          scenePath: reference.path ? `../../${String(reference.path).replace(/^\.?\//, "")}` : "",
        })),
    },
    style: {
      ...sourceStyle,
      inspDir: sourceStyle.inspDir || "insp",
      references: activeStyleReferences,
      tokens: sourceStyle.tokens || (sourceStyle.inheritsProjectStyle ? "../../style-tokens.json" : "style-tokens.json"),
      inheritsProjectStyle: hasNewSceneStyle ? false : sourceStyle.inheritsProjectStyle === true,
      sharedInspDir: sourceStyle.sharedInspDir || "../../insp",
      sharedTokens: sourceStyle.sharedTokens || "../../style-tokens.json",
      sharedReferences:
        sourceStyle.sharedReferences ||
        rootStyleReferences.map((reference) => ({
          ...reference,
          scenePath: reference.path ? `../../${String(reference.path).replace(/^\.?\//, "")}` : "",
        })),
    },
    storyboard: {
      ...sourceStoryboard,
      sourceImage: localSourceImage,
      sourceImageName: sourceImage?.name || sourceStoryboard.sourceImageName || "",
      framesDir: sourceStoryboard.framesDir || "storyboard",
      sharedSourceImage,
    },
    prompt: {
      ...sourcePrompt,
      requirements: "storyboard/requirements.md",
      agentPrompt: "prompt/agent-prompt.md",
      scenePrompt: "prompt/scene-prompt.md",
    },
    tracks: source.tracks || {
      speechBubbles: null,
      captions: null,
    },
    renderer: source.renderer || "renderer.js",
    outputs: {
      frames: "outputs/frames",
      video: null,
    },
    sceneCollection: sceneCollectionMetadata(collection.rootSlug, scene, scene.sourceSlug),
  };
}

async function renameSceneProject(slug, title) {
  const collection = await resolveSceneCollection(slug, { create: true });
  const nextTitle = normalizeSceneTitle(title);
  const existingScene = collection.index.scenes.find((scene) => scene.slug === slug);
  if (!existingScene) {
    throw statusError(404, "Scene was not found.");
  }

  collection.manifest.title = nextTitle;
  const updatedScene = {
    ...existingScene,
    title: nextTitle,
    updatedAt: new Date().toISOString(),
  };
  collection.index.scenes = collection.index.scenes.map((scene) => (scene.slug === slug ? updatedScene : scene));

  await writeFile(collection.manifestPath, `${JSON.stringify(collection.manifest, null, 2)}\n`);
  await writeSceneIndex(collection.indexPath, collection.index);
  collection.index = normalizeSceneIndex(collection.index, collection.rootSlug);
  collection.manifest = await readProjectManifest(collection.projectDir);
  return collection;
}

async function deleteSceneProject(slug) {
  const collection = await resolveSceneCollection(slug, { create: true });
  const existingScene = collection.index.scenes.find((scene) => scene.slug === slug);
  if (!existingScene) {
    throw statusError(404, "Scene was not found.");
  }
  if (collection.index.scenes.length <= 1) {
    throw statusError(400, "Keep at least one scene.");
  }
  if (slug === collection.rootSlug) {
    throw statusError(400, "Scene 01 stores this scene library and cannot be deleted.");
  }

  collection.index.scenes = collection.index.scenes.filter((scene) => scene.slug !== slug);
  await writeSceneIndex(collection.indexPath, collection.index);
  await rm(collection.projectDir, { recursive: true, force: true });

  collection.index = normalizeSceneIndex(collection.index, collection.rootSlug);
  const redirectScene = collection.index.scenes[0];
  return {
    collection,
    redirectSlug: redirectScene?.slug || collection.rootSlug,
    redirectProjectRef: redirectScene?.projectRef || redirectScene?.slug || collection.rootSlug,
  };
}

const SCENE_COPY_EXCLUDES = new Set(["outputs", "scenes", "scenes.json"]);

async function copySceneStarterFiles(sourceDir, targetDir) {
  if (!existsSync(sourceDir)) {
    throw statusError(404, "The source scene folder was not found.");
  }
  if (!isInside(projectsRoot, sourceDir) || !isInside(projectsRoot, targetDir)) {
    throw statusError(400, "Invalid scene copy path.");
  }

  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (SCENE_COPY_EXCLUDES.has(entry.name) || entry.name === ".DS_Store") continue;

    const sourcePath = resolve(sourceDir, entry.name);
    const targetPath = resolve(targetDir, entry.name);
    if (!isInside(sourceDir, sourcePath) || !isInside(targetDir, targetPath)) {
      throw statusError(400, "Invalid copied scene file path.");
    }
    await cp(sourcePath, targetPath, { recursive: true, force: true });
  }

  for (const folder of ["image", "insp", "prompt", "storyboard", "outputs", "outputs/frames"]) {
    const folderPath = resolve(targetDir, folder);
    if (!isInside(targetDir, folderPath)) {
      throw statusError(400, "Invalid copied scene folder path.");
    }
    await mkdir(folderPath, { recursive: true });
  }
}

async function rebaseCopiedRendererImports({ sourceDir, targetDir, renderer }) {
  const sourceRendererPath = resolve(sourceDir, renderer);
  const targetRendererPath = resolve(targetDir, renderer);
  if (!isInside(sourceDir, sourceRendererPath) || !isInside(targetDir, targetRendererPath)) {
    throw statusError(400, "Invalid copied renderer path.");
  }
  if (!existsSync(targetRendererPath)) return;

  const sourceRendererDir = dirname(sourceRendererPath);
  const targetRendererDir = dirname(targetRendererPath);
  const source = await readFile(targetRendererPath, "utf8");
  const rewritten = rewriteExternalRelativeModuleSpecifiers(source, sourceRendererDir, targetRendererDir);
  if (rewritten !== source) {
    await writeFile(targetRendererPath, rewritten);
  }
}

function rewriteExternalRelativeModuleSpecifiers(source, sourceDir, targetDir) {
  const specifierPattern =
    /(\b(?:import|export)\s+[^"'`]*?\s+from\s*|\bimport\s*\(\s*|\bimport\s*)(["'])(\.{1,2}\/[^"']+)\2/g;

  return source.replace(specifierPattern, (match, prefix, quote, specifier) => {
    const absoluteTarget = resolve(sourceDir, specifier);
    if (isInside(sourceDir, absoluteTarget) || !isInside(repoRoot, absoluteTarget)) return match;
    return `${prefix}${quote}${relativeModuleSpecifier(targetDir, absoluteTarget)}${quote}`;
  });
}

function relativeModuleSpecifier(fromDir, targetPath) {
  const relativePath = relative(fromDir, targetPath).replace(/\\/g, "/");
  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

async function saveSceneStoryboardImage(projectDir, options = {}) {
  const imageDataUrl = String(options.imageDataUrl || "").trim();
  if (!imageDataUrl) return null;

  const storyboardImage = decodeStoryboardDataUrl(imageDataUrl, options.imageName || "storyboard.png");
  const extension = STORYBOARD_IMAGE_EXTENSIONS[storyboardImage.type] || storyboardImage.extension || "png";
  const imageDir = resolve(projectDir, "image");
  const imagePath = resolve(imageDir, `storyboard.${extension}`);
  if (!isInside(projectDir, imageDir) || !isInside(imageDir, imagePath)) {
    throw statusError(400, "Invalid scene image path.");
  }

  await mkdir(imageDir, { recursive: true });
  await writeFile(imagePath, storyboardImage.buffer);
  return {
    path: `image/storyboard.${extension}`,
    name: String(options.imageName || `storyboard.${extension}`).trim(),
    type: storyboardImage.type,
    command: `/image image/storyboard.${extension}`,
  };
}

async function saveSceneStyleReferences(projectDir, value) {
  const styleUploads = normalizeStyleReferenceUploads(value).slice(0, MAX_STYLE_REFERENCES);
  if (!styleUploads.length) return [];

  const inspDir = resolve(projectDir, "insp");
  if (!isInside(projectDir, inspDir)) {
    throw statusError(400, "Invalid scene insp path.");
  }
  await mkdir(inspDir, { recursive: true });

  const styleReferences = [];
  for (const upload of styleUploads) {
    const stylePath = resolve(inspDir, upload.savedName);
    if (!isInside(inspDir, stylePath)) {
      throw statusError(400, "Invalid scene style reference file path.");
    }
    await writeFile(stylePath, upload.buffer);
    styleReferences.push({
      path: `insp/${upload.savedName}`,
      name: upload.name,
      type: upload.type,
      command: `/style insp/${upload.savedName}`,
    });
  }
  return styleReferences;
}

async function writeSceneReferenceReadmes(projectDir, collection, rootManifest, manifest, sourceScene = {}) {
  const imageReadmePath = resolve(projectDir, "image", "README.md");
  const inspReadmePath = resolve(projectDir, "insp", "README.md");
  if (!isInside(projectDir, imageReadmePath) || !isInside(projectDir, inspReadmePath)) {
    throw statusError(400, "Invalid scene reference README path.");
  }

  const sharedImage = manifest.storyboard?.sharedSourceImage || rootManifest.storyboard?.sourceImage || "none";
  const sourceLabel = sourceScene?.title || sourceScene?.slug || "the source scene";
  await writeFile(
    imageReadmePath,
    `# Scene Image References

This folder was copied from ${sourceLabel}. Keep, replace, or add scene-specific target images here as the next scene changes.

- Root project: \`projects/${collection.rootSlug}\`
- Shared project image from this scene: \`${sharedImage}\`
`,
  );
  await writeFile(
    inspReadmePath,
    `# Scene Style References

This folder was copied from ${sourceLabel}. Keep these style references for continuity, or replace/add scene-specific artistic style references.

Style images guide palette, texture, mood, and line quality; they should not be pasted into final frames.
`,
  );
}

async function writeSceneRequirements(projectDir, collection, scene, manifest) {
  const storyboardDir = resolve(projectDir, "storyboard");
  const requirementsPath = resolve(storyboardDir, "requirements.md");
  if (!isInside(projectDir, storyboardDir) || !isInside(storyboardDir, requirementsPath)) {
    throw statusError(400, "Invalid scene requirements path.");
  }

  const styleReferences = manifest.style?.references?.length
    ? manifest.style.references.map((reference) => `- \`${reference.path}\` (${reference.name || reference.path})`).join("\n")
    : "- No new scene-specific style references. Continue from the copied scene style and inherited project style if available.";
  const sourceImage = manifest.storyboard?.sourceImage
    ? `\`${manifest.storyboard.sourceImage}\``
    : manifest.storyboard?.sharedSourceImage
      ? `No scene image. Shared project reference: \`${manifest.storyboard.sharedSourceImage}\``
      : "No scene image.";
  const clonedFrom = manifest.scenePlan?.copiedFrom;
  const clonedLabel = clonedFrom?.title || clonedFrom?.slug || "the source scene";
  const clonedPath = clonedFrom?.projectRef ? `projects/${clonedFrom.projectRef}` : "";
  const requirements = `# ${scene.slug} Requirements

This scene was copied from ${clonedPath ? `\`${clonedPath}\`` : clonedLabel} and starts with that scene's renderer, references, editable objects, and timing.

## Scene Prompt

${manifest.scenePlan?.brief || "No scene-specific prompt was supplied yet."}

## References

- Scene image: ${sourceImage}
- Style policy: ${manifest.style?.inheritsProjectStyle ? "inherit project style unless the prompt says otherwise" : "use scene-local style references first"}
- Style tokens: \`${manifest.style?.tokens || "style-tokens.json"}\`

## Scene Style References

${styleReferences}

## Frame Count

The current \`totalFrames\` value was copied from ${clonedLabel}. Keep it while this scene remains a duplicate, or change it when the new action needs different pacing and explain the reason in \`notes.frameCount\`.

## Drawing Rules

- Start from the copied renderer and edit it deliberately for this scene.
- Use scene-local references first.
- If a scene image exists, use \`window.inky.showReference()\` while aligning and \`window.inky.extractPathsFromImage()\` only when contours need coordinate scaffolding.
- Load \`style-tokens.json\` or inherited \`../../style-tokens.json\` when present, then treat those values as editable brush and palette guidance.
- Create \`storyboard/scene-objects.json\` only for high-level elements that should be manually selectable later.
- If no new scene style was provided, continue from the copied style references.
- If no new scene image was provided, continue from the copied scene image or shared project references.
- Use \`getFrameDebug()\` to expose placement, brush, and timing values that help frame-by-frame inspection.
- Redraw everything with Canvas and Inky brushes; do not paste source or style images into final frames.
`;

  await mkdir(storyboardDir, { recursive: true });
  await writeFile(requirementsPath, requirements);
}

async function writeScenePrompt(projectDir, collection, scene, manifest) {
  const promptDir = resolve(projectDir, "prompt");
  const promptPath = resolve(promptDir, "scene-prompt.md");
  const agentPromptPath = resolve(promptDir, "agent-prompt.md");
  if (!isInside(projectDir, promptDir) || !isInside(promptDir, promptPath) || !isInside(promptDir, agentPromptPath)) {
    throw statusError(400, "Invalid scene prompt path.");
  }

  await mkdir(promptDir, { recursive: true });
  const prompt = generateSceneAgentPrompt({ collection, scene, manifest });
  await writeFile(promptPath, `${prompt}\n`);
  await writeFile(agentPromptPath, `${prompt}\n`);
  return prompt;
}

async function resetSceneAnnotations(projectDir, slug) {
  const storyboardDir = resolve(projectDir, "storyboard");
  if (!isInside(projectDir, storyboardDir) || !existsSync(storyboardDir)) return;

  const annotationsPath = resolve(storyboardDir, "annotations.json");
  if (!isInside(storyboardDir, annotationsPath)) {
    throw statusError(400, "Invalid annotation path.");
  }

  await writeFile(
    annotationsPath,
    `${JSON.stringify({ version: 1, project: slug, updatedAt: new Date().toISOString(), annotations: [] }, null, 2)}\n`,
  );
}

async function findSceneRootForSlug(slug) {
  if (!existsSync(projectsRoot)) return "";
  const entries = await readdir(projectsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidateRoot = entry.name;
    const indexPath = resolve(projectsRoot, candidateRoot, "scenes.json");
    if (!existsSync(indexPath)) continue;

    try {
      const index = normalizeSceneIndex(JSON.parse(await readFile(indexPath, "utf8")), candidateRoot);
      if (index.scenes.some((scene) => scene.slug === slug)) return index.rootSlug;
    } catch {
      // Ignore malformed scene indexes while looking for the active project.
    }
  }
  return "";
}

function createSceneIndex(rootSlug, manifest) {
  return normalizeSceneIndex(
    {
      version: 1,
      rootSlug,
      title: manifest.title || titleFromSlug(rootSlug),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scenes: [sceneEntryFromManifest(manifest, rootSlug, 1, { rootSlug, projectRef: rootSlug })],
    },
    rootSlug,
  );
}

function normalizeSceneIndex(value, fallbackRootSlug) {
  const index = objectOrEmpty(value);
  const rootSlug = slugify(index.rootSlug || fallbackRootSlug);
  const scenes = Array.isArray(index.scenes)
    ? index.scenes
        .map((scene, index) => normalizeSceneEntry(scene, index + 1, rootSlug))
        .filter(Boolean)
        .sort((a, b) => a.order - b.order)
    : [];

  return {
    version: Number(index.version) || 1,
    rootSlug,
    title: String(index.title || titleFromSlug(rootSlug)).trim(),
    createdAt: index.createdAt || new Date().toISOString(),
    updatedAt: index.updatedAt || new Date().toISOString(),
    scenes,
  };
}

function normalizeSceneEntry(value, fallbackOrder, rootSlug) {
  const scene = objectOrEmpty(value);
  const slug = slugify(scene.slug || "");
  if (!slug) return null;
  const order = Math.max(1, Math.round(finiteNumber(scene.order, fallbackOrder)));
  const projectRef = normalizeProjectRef(scene.projectRef || scene.projectPath || "", inferProjectRefForScene(rootSlug, slug));
  return {
    id: String(scene.id || `scene-${String(order).padStart(2, "0")}`).trim(),
    slug,
    projectRef,
    title: String(scene.title || titleFromSlug(slug)).trim(),
    order,
    status: String(scene.status || "draft").trim(),
    createdAt: scene.createdAt || "",
    updatedAt: scene.updatedAt || "",
    ...(scene.sourceSlug ? { sourceSlug: slugify(scene.sourceSlug) } : {}),
  };
}

function normalizeSceneTitle(value) {
  const title = String(value || "").trim().replace(/\s+/g, " ").slice(0, 90);
  if (!title) {
    throw statusError(400, "Scene name is required.");
  }
  return title;
}

function normalizeSceneBrief(value) {
  const brief = String(value || "").trim().replace(/\r\n/g, "\n").slice(0, 12000);
  return (
    brief ||
    "Continue from the copied source scene. Keep the duplicate as the starting point, then adjust the action, staging, timing, and references when the next scene details are supplied."
  );
}

function sceneEntryFromManifest(manifest, slug, order, overrides = {}) {
  const safeOrder = Math.max(1, Math.round(Number(order) || 1));
  const rootSlug = slugify(overrides.rootSlug || manifest.sceneCollection?.rootSlug || slug);
  const projectRef = normalizeProjectRef(
    overrides.projectRef || manifest.projectRef || manifest.sceneCollection?.projectRef || "",
    inferProjectRefForScene(rootSlug, slug),
  );
  return {
    id: `scene-${String(safeOrder).padStart(2, "0")}`,
    slug,
    projectRef,
    title: manifest.title || titleFromSlug(slug),
    order: safeOrder,
    status: manifest.status || "draft",
    createdAt: overrides.createdAt || "",
    updatedAt: overrides.updatedAt || new Date().toISOString(),
    ...(overrides.sourceSlug ? { sourceSlug: overrides.sourceSlug } : {}),
  };
}

function sceneCollectionMetadata(rootSlug, scene, previousSlug) {
  const projectRef = normalizeProjectRef(scene.projectRef || "", sceneProjectRef(rootSlug, scene.slug));
  return {
    rootSlug,
    projectRef,
    sceneId: scene.id,
    sceneNumber: scene.order,
    scenes: `projects/${rootSlug}/scenes.json`,
    projectPath: `projects/${projectRef}`,
    ...(previousSlug ? { previousSlug } : {}),
  };
}

function nextSceneOrder(index) {
  const scenes = Array.isArray(index.scenes) ? index.scenes : [];
  return scenes.reduce((maxOrder, scene) => Math.max(maxOrder, Number(scene.order) || 0), 0) + 1;
}

function sceneSlugFor(rootSlug, order) {
  if (order <= 1) return rootSlug;
  return `${rootSlug}-scene-${String(order).padStart(2, "0")}`;
}

async function writeSceneIndex(indexPath, index) {
  const sceneIndex = normalizeSceneIndex(
    {
      ...index,
      updatedAt: new Date().toISOString(),
    },
    index.rootSlug,
  );
  await writeFile(indexPath, `${JSON.stringify(sceneIndex, null, 2)}\n`);
}

function sceneResponse(collection, activeSlug) {
  const index = normalizeSceneIndex(collection.index, collection.rootSlug);
  const activeScene = index.scenes.find((scene) => scene.slug === activeSlug);
  return {
    ok: true,
    version: index.version,
    rootSlug: index.rootSlug,
    title: index.title,
    activeSlug,
    activeProjectRef: activeScene?.projectRef || projectRefForProjectDir(collection.rootSlug, activeSlug, collection.projectDir, collection.rootDir),
    scenes: index.scenes,
  };
}

async function resolveExistingProjectDir(slug) {
  const safeSlug = slugify(slug);
  if (!safeSlug || safeSlug !== slug) {
    throw statusError(400, "Invalid project slug.");
  }

  const directProjectDir = resolveProjectDir(safeSlug, { mustExist: false });
  if (existsSync(directProjectDir)) return directProjectDir;

  const sceneProjectDir = await findSceneProjectDirForSlug(safeSlug);
  if (sceneProjectDir) return sceneProjectDir;

  throw statusError(404, "Project was not found.");
}

async function findSceneProjectDirForSlug(slug) {
  if (!existsSync(projectsRoot)) return "";
  const entries = await readdir(projectsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidateRoot = entry.name;
    const rootDir = resolveProjectDir(candidateRoot, { mustExist: false });
    const indexPath = resolve(rootDir, "scenes.json");
    if (!existsSync(indexPath)) continue;

    try {
      const index = normalizeSceneIndex(JSON.parse(await readFile(indexPath, "utf8")), candidateRoot);
      const scene = index.scenes.find((entry) => entry.slug === slug);
      if (!scene) continue;

      const indexedProjectDir = projectDirForRef(scene.projectRef);
      if (existsSync(indexedProjectDir)) return indexedProjectDir;

      const nestedProjectDir = sceneProjectDirForRoot(rootDir, slug);
      if (existsSync(nestedProjectDir)) return nestedProjectDir;

      const legacyProjectDir = resolveProjectDir(slug, { mustExist: false });
      if (existsSync(legacyProjectDir)) return legacyProjectDir;
    } catch {
      // Ignore malformed scene indexes while looking for nested scene folders.
    }
  }
  return "";
}

function sceneProjectRef(rootSlug, slug) {
  return slug === rootSlug ? rootSlug : `${rootSlug}/scenes/${slug}`;
}

function sceneProjectDir(rootDir, slug) {
  return sceneProjectDirForRoot(rootDir, slug);
}

function sceneProjectDirForRoot(rootDir, slug) {
  return resolve(rootDir, "scenes", slug);
}

function projectDirForRef(projectRef) {
  const safeProjectRef = normalizeProjectRef(projectRef);
  const projectDir = resolve(projectsRoot, safeProjectRef);
  if (!isInside(projectsRoot, projectDir)) {
    throw statusError(400, "Invalid project path.");
  }
  return projectDir;
}

function inferProjectRefForScene(rootSlug, slug) {
  const safeRootSlug = slugify(rootSlug || "");
  const safeSlug = slugify(slug || "");
  if (!safeSlug) return "";
  if (!safeRootSlug || safeSlug === safeRootSlug) return safeSlug;

  const rootDir = resolveProjectDir(safeRootSlug, { mustExist: false });
  if (existsSync(sceneProjectDirForRoot(rootDir, safeSlug))) {
    return sceneProjectRef(safeRootSlug, safeSlug);
  }
  if (existsSync(resolveProjectDir(safeSlug, { mustExist: false }))) {
    return safeSlug;
  }
  return sceneProjectRef(safeRootSlug, safeSlug);
}

function projectRefForProjectDir(rootSlug, slug, projectDir, rootDir) {
  if (samePath(projectDir, rootDir)) return rootSlug;
  const relativeProjectDir = relative(projectsRoot, projectDir).replace(/\\/g, "/");
  return normalizeProjectRef(relativeProjectDir, inferProjectRefForScene(rootSlug, slug));
}

function normalizeProjectRef(projectRef, fallback = "") {
  const segments = projectRefSegments(projectRef);
  if (segments.length) return segments.join("/");
  const fallbackSegments = projectRefSegments(fallback);
  return fallbackSegments.join("/");
}

function projectRefSegments(projectRef) {
  const cleaned = String(projectRef || "")
    .trim()
    .replace(/^\.?\//, "")
    .replace(/^projects[\\/]+/, "");
  return cleaned
    .split(/[\\/]+/)
    .map((segment) => slugify(segment))
    .filter(Boolean);
}

function samePath(first, second) {
  return resolve(first) === resolve(second);
}

function resolveProjectDir(slug, options = {}) {
  const safeSlug = slugify(slug);
  if (!safeSlug || safeSlug !== slug) {
    throw statusError(400, "Invalid project slug.");
  }

  const projectDir = resolve(projectsRoot, safeSlug);
  if (!isInside(projectsRoot, projectDir)) {
    throw statusError(400, "Invalid project path.");
  }
  if (options.mustExist !== false && !existsSync(projectDir)) {
    throw statusError(404, "Project was not found.");
  }
  return projectDir;
}

async function readProjectManifest(projectDir) {
  const manifestPath = resolve(projectDir, "project.json");
  if (!isInside(projectDir, manifestPath) || !existsSync(manifestPath)) {
    throw statusError(404, "Project manifest was not found.");
  }
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

function emptySceneObjects(manifest = {}) {
  return {
    version: 1,
    width: finiteNumber(manifest.width, null),
    height: finiteNumber(manifest.height, null),
    objects: [],
  };
}

function emptyEditLayer() {
  return {
    version: 1,
    baseHash: "",
    deletedIds: [],
    overrides: {},
    addedObjects: [],
  };
}

function normalizeProjectMemoryJson(value, context = {}) {
  const memory = objectOrEmpty(value);
  return {
    ...memory,
    version: Number(memory.version) || 1,
    project: String(memory.project || context.project || "").trim(),
    projectRef: normalizeProjectRef(memory.projectRef || context.projectRef || ""),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeSceneObjectsJson(value, manifest = {}) {
  const graph = objectOrEmpty(value);
  return {
    version: Number(graph.version) || 1,
    width: finiteNumber(graph.width, finiteNumber(manifest.width, null)),
    height: finiteNumber(graph.height, finiteNumber(manifest.height, null)),
    objects: Array.isArray(graph.objects) ? graph.objects.map(normalizeSceneGraphObjectJson).filter(Boolean) : [],
  };
}

function normalizeEditLayerJson(value) {
  const editLayer = objectOrEmpty(value);
  const overrides = {};
  for (const [id, override] of Object.entries(objectOrEmpty(editLayer.overrides))) {
    const objectId = safeSceneObjectId(id);
    if (objectId) overrides[objectId] = normalizeSceneGraphOverride(override);
  }

  return {
    version: Number(editLayer.version) || 1,
    baseHash: String(editLayer.baseHash || "").trim().slice(0, 160),
    deletedIds: Array.isArray(editLayer.deletedIds)
      ? [...new Set(editLayer.deletedIds.map((id) => safeSceneObjectId(id)).filter(Boolean))]
      : [],
    overrides,
    addedObjects: Array.isArray(editLayer.addedObjects) ? editLayer.addedObjects.map(normalizeSceneGraphObjectJson).filter(Boolean) : [],
  };
}

function normalizeSceneGraphObjectJson(value) {
  const object = objectOrEmpty(value);
  const id = safeSceneObjectId(object.id);
  const type = String(object.type || "path").trim();
  if (!id || !["path", "polyline", "rect", "ellipse"].includes(type)) return null;
  return {
    ...object,
    id,
    type,
    points: normalizeSceneGraphPoints(object.points).slice(0, 20000),
    frameRange: normalizeSceneGraphFrameRange(object.frameRange),
    transform: normalizeSceneGraphTransform(object.transform),
    brush: normalizeSceneGraphBrush(object.brush),
    draggable: object.draggable !== false,
    locked: object.locked === true,
  };
}

function normalizeSceneGraphOverride(value) {
  const override = objectOrEmpty(value);
  return {
    offsetX: finiteNumber(override.offsetX, 0),
    offsetY: finiteNumber(override.offsetY, 0),
    rotationDelta: finiteNumber(override.rotationDelta, 0),
    scaleXDelta: finiteNumber(override.scaleXDelta, 1) || 1,
    scaleYDelta: finiteNumber(override.scaleYDelta, 1) || 1,
    visible: override.visible !== false,
  };
}

function normalizeSceneGraphTransform(value) {
  const transform = objectOrEmpty(value);
  return {
    x: finiteNumber(transform.x, 0),
    y: finiteNumber(transform.y, 0),
    rotation: finiteNumber(transform.rotation, 0),
    scaleX: finiteNumber(transform.scaleX, 1) || 1,
    scaleY: finiteNumber(transform.scaleY, 1) || 1,
    opacity: finiteNumber(transform.opacity, 1),
  };
}

function normalizeSceneGraphBrush(value) {
  const brush = objectOrEmpty(value);
  return {
    ...brush,
    type: String(brush.type || "pencil").trim(),
    color: String(brush.color || "#201b15").trim(),
    size: finiteNumber(brush.size, 3),
    roughness: finiteNumber(brush.roughness, 0.35),
    textureScale: finiteNumber(brush.textureScale, 0.9),
    opacity: finiteNumber(brush.opacity, 1),
  };
}

function normalizeSceneGraphPoints(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((point) => {
      if (Array.isArray(point)) return [finiteNumber(point[0], NaN), finiteNumber(point[1], NaN)];
      if (point && typeof point === "object") return [finiteNumber(point.x, NaN), finiteNumber(point.y, NaN)];
      return null;
    })
    .filter((point) => point && Number.isFinite(point[0]) && Number.isFinite(point[1]));
}

function normalizeSceneGraphFrameRange(value) {
  if (!Array.isArray(value) || value.length < 2) return null;
  const start = Math.max(0, Math.round(finiteNumber(value[0], 0)));
  const end = Math.max(start, Math.round(finiteNumber(value[1], start)));
  return [start, end];
}

function safeSceneObjectId(value) {
  return (
    String(value || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || ""
  );
}

async function normalizeAnnotationUpload({ annotations, projectDir, slug }) {
  const screenshotDir = resolve(projectDir, "outputs", "annotation-screenshots");
  const referenceDir = resolve(projectDir, "outputs", "annotation-references");
  if (!isInside(projectDir, screenshotDir)) {
    throw statusError(400, "Invalid screenshot output path.");
  }
  if (!isInside(projectDir, referenceDir)) {
    throw statusError(400, "Invalid reference output path.");
  }

  const normalized = [];
  for (const [index, annotation] of annotations.entries()) {
    const id = safeAnnotationId(annotation.id || `annotation-${index + 1}`);
    const savedAnnotation = {
      id,
      status: normalizeAnnotationStatus(annotation.status),
      frame: Math.max(0, Math.round(Number(annotation.frame) || 0)),
      time: Math.max(0, Number(annotation.time) || 0),
      rect: normalizeRect(annotation.rect),
      comment: String(annotation.comment || "").trim(),
      createdAt: annotation.createdAt || "",
      updatedAt: new Date().toISOString(),
    };

    const references = normalizeExistingReferences(annotation.references, projectDir).slice(0, MAX_REFERENCE_IMAGES);
    const remainingReferenceSlots = Math.max(0, MAX_REFERENCE_IMAGES - references.length);
    const referenceDataUrls = normalizeReferenceDataUrls(annotation.referenceDataUrls).slice(0, remainingReferenceSlots);

    if (annotation.screenshot && typeof annotation.screenshot === "string") {
      savedAnnotation.screenshot = annotation.screenshot;
    }

    if (typeof annotation.screenshotDataUrl === "string" && annotation.screenshotDataUrl.startsWith("data:image/png;base64,")) {
      await mkdir(screenshotDir, { recursive: true });
      const filename = `${id}.png`;
      const screenshotPath = resolve(screenshotDir, filename);
      if (!isInside(screenshotDir, screenshotPath)) {
        throw statusError(400, "Invalid screenshot file path.");
      }
      const pngData = annotation.screenshotDataUrl.replace(/^data:image\/png;base64,/, "");
      await writeFile(screenshotPath, Buffer.from(pngData, "base64"));
      savedAnnotation.screenshot = `outputs/annotation-screenshots/${filename}`;
    }

    if (referenceDataUrls.length) {
      await mkdir(referenceDir, { recursive: true });
    }

    const initialReferenceCount = references.length;
    for (const [referenceIndex, reference] of referenceDataUrls.entries()) {
      const extension = REFERENCE_IMAGE_EXTENSIONS[reference.type];
      if (!extension) continue;
      const filename = `${id}-${initialReferenceCount + referenceIndex + 1}.${extension}`;
      const referencePath = resolve(referenceDir, filename);
      if (!isInside(referenceDir, referencePath)) {
        throw statusError(400, "Invalid reference file path.");
      }
      await writeFile(referencePath, reference.buffer);
      references.push({
        path: `outputs/annotation-references/${filename}`,
        name: reference.name,
        type: reference.type,
      });
    }

    if (references.length) savedAnnotation.references = references.slice(0, MAX_REFERENCE_IMAGES);
    normalized.push(savedAnnotation);
  }

  return normalized;
}

function normalizeExistingReferences(value, projectDir) {
  if (!Array.isArray(value)) return [];
  return value
    .map((reference, index) => {
      if (typeof reference === "string") {
        return normalizeReferencePath({ path: reference, name: reference.split("/").pop() || `reference-${index + 1}`, type: "" }, projectDir);
      }
      if (!reference || typeof reference !== "object") return null;
      return normalizeReferencePath(
        {
          path: reference.path || reference.url || reference.href || "",
          name: reference.name || reference.filename || String(reference.path || "").split("/").pop() || `reference-${index + 1}`,
          type: reference.type || reference.mime || "",
        },
        projectDir,
      );
    })
    .filter(Boolean);
}

function normalizeReferencePath(reference, projectDir) {
  const pathValue = String(reference.path || "").trim();
  if (!pathValue || pathValue.startsWith("data:") || isAbsolute(pathValue)) return null;
  const resolved = resolve(projectDir, pathValue);
  if (!isInside(projectDir, resolved)) return null;
  return {
    path: pathValue,
    name: String(reference.name || pathValue.split("/").pop() || "reference image").trim(),
    type: String(reference.type || "").trim(),
  };
}

function normalizeReferenceDataUrls(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((reference, index) => {
      if (typeof reference === "string") {
        return decodeImageDataUrl(reference, `reference-${index + 1}`);
      }
      if (!reference || typeof reference !== "object") return null;
      return decodeImageDataUrl(reference.dataUrl || reference.data || "", reference.name || `reference-${index + 1}`, reference.type || "");
    })
    .filter(Boolean);
}

function normalizeStyleReferenceUploads(value) {
  if (!Array.isArray(value)) return [];
  const used = new Set();
  return value
    .map((reference, index) => {
      if (!reference || typeof reference !== "object") return null;
      const decoded = decodeImageDataUrl(reference.dataUrl || reference.data || "", reference.name || `style-${index + 1}`, reference.type || "");
      if (!decoded) return null;
      const extension = REFERENCE_IMAGE_EXTENSIONS[decoded.type];
      const savedName =
        typeof reference.savedName === "string" && reference.savedName.trim()
          ? normalizeProvidedInspFileName(reference.savedName, extension, used)
          : safeInspFileName(reference.fileName || decoded.name, extension, index, used);
      return {
        ...decoded,
        savedName,
      };
    })
    .filter(Boolean);
}

function normalizeProvidedInspFileName(fileName, extension, used) {
  const rawName = String(fileName || "style").split(/[\\/]/).pop() || "style";
  const base = slugifyFileBase(rawName);
  let candidate = `${base}.${extension || extensionForFileName(rawName) || "png"}`;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}.${extension || "png"}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function safeInspFileName(fileName, extension, index, used) {
  const rawName = String(fileName || `style-${index + 1}`).split(/[\\/]/).pop() || `style-${index + 1}`;
  const base = slugifyFileBase(rawName.replace(/\.[^.]+$/, ""));
  const prefix = `style-${String(index + 1).padStart(2, "0")}`;
  let candidate = `${prefix}-${base}.${extension || extensionForFileName(rawName) || "png"}`;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${prefix}-${base}-${suffix}.${extension || "png"}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

function normalizeGrid(value) {
  if (value === "auto" || value?.mode === "auto") return { mode: "auto", columns: 3, rows: 4 };
  const columns = finiteNumber(value?.columns, NaN);
  const rows = finiteNumber(value?.rows, NaN);
  const safeColumns = Number.isFinite(columns) ? Math.min(12, Math.max(1, Math.round(columns))) : 3;
  const safeRows = Number.isFinite(rows) ? Math.min(12, Math.max(1, Math.round(rows))) : 4;
  return { mode: "manual", columns: safeColumns, rows: safeRows };
}

async function writeAutoStoryboardBrief({ storyboardDir, slug, relativeStoryboardImage, prompt }) {
  const requirements = `# ${slug} Requirements

This document holds project-specific drawing decisions. The target image has not been pre-sliced; inspect it first and decide whether it is a single scene or a multi-panel storyboard.

## Source

- Target image: \`${relativeStoryboardImage}\`
- Style inspiration folder: \`projects/${slug}/insp\`
- Grid: agent infers from the target image if panel extraction is useful

## User Request

${prompt}

## Visual Style

- Inspiration refs:
- Medium:
- Line quality:
- Palette:
- Texture density:

## Drawing Notes

- If the target image is a single scene, draw it directly.
- If the target image is a storyboard, infer the panel grid visually before extracting frames.
- Keep source and style images out of the final canvas; redraw with Inky canvas primitives.
`;

  await writeFile(resolve(storyboardDir, "requirements.md"), requirements);
  await writeFile(
    resolve(storyboardDir, "storyboard-plan.md"),
    `# ${slug}

Start by inspecting \`${relativeStoryboardImage}\`. Decide whether it is one scene or a storyboard, then plan drawing, style, and motion from that reading.
`,
  );
}

async function ensureSceneGraphFiles(projectDir, manifest = {}) {
  const storyboardDir = resolve(projectDir, "storyboard");
  const sceneObjectsPath = resolve(storyboardDir, "scene-objects.json");
  const editLayerPath = resolve(storyboardDir, "edit-layer.json");
  if (!isInside(projectDir, storyboardDir) || !isInside(storyboardDir, sceneObjectsPath) || !isInside(storyboardDir, editLayerPath)) {
    throw statusError(400, "Invalid scene graph path.");
  }
  await mkdir(storyboardDir, { recursive: true });
  if (!existsSync(sceneObjectsPath)) {
    await writeFile(sceneObjectsPath, `${JSON.stringify(emptySceneObjects(manifest), null, 2)}\n`);
  }
  if (!existsSync(editLayerPath)) {
    await writeFile(editLayerPath, `${JSON.stringify(emptyEditLayer(), null, 2)}\n`);
  }
}

function decodeStoryboardDataUrl(dataUrl, name) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:gif|jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) {
    throw statusError(400, "Upload a storyboard image before creating the project.");
  }
  const type = match[1];
  const extension = STORYBOARD_IMAGE_EXTENSIONS[type] || extensionForFileName(name);
  if (!extension) {
    throw statusError(400, "Unsupported storyboard image type.");
  }
  return {
    type,
    extension,
    buffer: Buffer.from(match[2], "base64"),
  };
}

function decodeImageDataUrl(dataUrl, name, declaredType = "") {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return null;
  const type = REFERENCE_IMAGE_EXTENSIONS[declaredType] ? declaredType : match[1];
  if (!REFERENCE_IMAGE_EXTENSIONS[type]) return null;
  return {
    name: String(name || "reference image").trim(),
    type,
    buffer: Buffer.from(match[2], "base64"),
  };
}

function createProjectManifest({ existingManifest, slug, grid, extension, styleReferences = [] }) {
  const existingOutputs = objectOrEmpty(existingManifest.outputs);
  const existingStyleReferences = Array.isArray(existingManifest.style?.references) ? existingManifest.style.references : [];
  return {
    slug,
    title: existingManifest.title || titleFromSlug(slug),
    status: existingManifest.status || "draft",
    width: finiteNumber(existingManifest.width, 960),
    height: finiteNumber(existingManifest.height, 620),
    fps: finiteNumber(existingManifest.fps, 12),
    totalFrames: finiteNumber(existingManifest.totalFrames, 96),
    grid,
    style: {
      inspDir: existingManifest.style?.inspDir || "insp",
      references: styleReferences.length ? styleReferences : existingStyleReferences,
    },
    storyboard: {
      sourceImage: `image/storyboard.${extension}`,
      framesDir: "storyboard",
    },
    prompt: {
      requirements: "storyboard/requirements.md",
      agentPrompt: "prompt/agent-prompt.md",
    },
    tracks: {
      speechBubbles: existingManifest.tracks?.speechBubbles ?? null,
      captions: existingManifest.tracks?.captions ?? null,
    },
    renderer: existingManifest.renderer || "renderer.js",
    outputs: {
      frames: existingOutputs.frames || "outputs/frames",
      video: existingOutputs.video || null,
      ...(existingOutputs.videoBySpeed ? { videoBySpeed: existingOutputs.videoBySpeed } : {}),
    },
  };
}

function createRendererStub(manifest) {
  return `import { createBrush, easings, keyframe, listBrushes, timeline } from "../../src/inky-canvas.js";

export const project = {
  width: ${manifest.width},
  height: ${manifest.height},
  fps: ${manifest.fps},
  totalFrames: ${manifest.totalFrames},
};

const availableBrushes = listBrushes();
const selectedBrush = availableBrushes.includes("pencil") ? "pencil" : availableBrushes[0];

const ink = createBrush({
  type: selectedBrush,
  color: "#17120d",
  size: 3.2,
  textureScale: 0.9,
  roughness: 0.35,
  thinning: 0.5,
  smoothing: 0.34,
  streamline: 0.18,
  jitter: 0.35,
  seed: 42,
  inkFlow: { enabled: true, endOpacity: 0.76, segments: 7 },
});

const accent = ink.clone({
  color: "#9f4f38",
  size: 1.8,
  opacity: 0.5,
  jitter: 0.55,
  seed: 84,
});

export function drawFrame(ctx, frame, helpers = {}) {
  const cursor = { x: 0 };
  timeline(frame, project.totalFrames, [
    keyframe(cursor, { x: [0, 1] }, { from: 0, to: 1, easing: easings.easeInOut }),
  ]);

  ctx.fillStyle = "#fbf6ea";
  ctx.fillRect(0, 0, project.width, project.height);

  ink.stroke(ctx, [
    [project.width * 0.24, project.height * 0.58],
    [project.width * 0.38, project.height * (0.44 + Math.sin(cursor.x * Math.PI) * 0.04)],
    [project.width * 0.55, project.height * 0.52],
    [project.width * 0.74, project.height * 0.4],
  ]);
  accent.stroke(ctx, [
    [project.width * 0.3, project.height * 0.67],
    [project.width * 0.7, project.height * 0.67],
  ]);

  helpers.sceneGraph?.draw?.(ctx, frame);

  helpers.drawLabel?.(ctx, "Build this renderer with Inky canvas primitives", project.width / 2, project.height * 0.78);
}

export function getFrameDebug(frame) {
  return {
    hint: "Use window.inky.showReference('image/storyboard.${manifest.storyboard?.sourceImage?.split(".").pop() || "png"}', { opacity: 0.3 }) while aligning. Analyze style refs with window.inky.analyzeStyle(), extract contour coordinates only when needed, and tune brush parameters by eye.",
    frame,
    availableBrushes,
    selectedBrush,
    referenceOverlay: "window.inky.showReference('image/storyboard.${manifest.storyboard?.sourceImage?.split(".").pop() || "png"}', { opacity: 0.3 })",
    canvasCapture: "window.inky.captureFrameDataUrl(frame)",
  };
}
`;
}

function generateAgentPrompt({ slug, extension, grid, prompt, styleReferences = [] }) {
  const imageCommand = `/image image/storyboard.${extension}`;
  const gridLabel = grid.mode === "auto" ? "agent infers from the target image" : `${grid.columns} x ${grid.rows}`;
  const styleLines = styleReferences.length
    ? styleReferences.map((reference) => `- ${reference.command || `/style ${reference.path}`} (${reference.name || reference.path})`)
    : [`- /style insp/<file> for optional style images saved in projects/${slug}/insp/`];

  return [
    `# Build Inky animation: ${slug}`,
    "",
    "Use Inky as a Canvas API and visual feedback loop for agents.",
    "Look at the reference, decide the likely medium, choose explicit brush parameters, preview, compare against the reference overlay, and tune brush/timing values by eye.",
    "Use any files in insp/ as a style palette for color, mood, line quality, and texture. If no style reference is provided, match the target image's own style. Do not paste source or style images into the final animation.",
    "",
    "## Source",
    `- Reference image: projects/${slug}/image/storyboard.${extension}`,
    `- Style references folder: projects/${slug}/insp/`,
    `- Optional extracted frames: projects/${slug}/storyboard/`,
    `- Grid: ${gridLabel}`,
    "",
    "## Slash references",
    `- ${imageCommand} (target scene/storyboard)`,
    ...styleLines,
    "",
    "## User request",
    prompt,
    "",
    "## Required work",
    "1. Read AGENTS.md, DESIGN.md, and the relevant skills.",
    "2. Use project.json as the source of truth.",
    `3. Build projects/${slug}/renderer.js.`,
    "4. Import createBrush, listBrushes, keyframe, timeline, and easings from src/inky-canvas.js.",
    "5. Interpret slash references in the user request: /image points to the target scene, and /style points to one or more artistic reference images.",
    "6. Look at the target image first and decide whether it is one scene or a multi-panel storyboard. If it is a storyboard, infer the grid visually before extracting panels.",
    "7. If the prompt names an insp/<file> style reference, call window.inky.analyzeStyle('insp/<file>') and describe the medium, palette, mood, line quality, texture, and composition before drawing. If no style reference is named, derive those style choices from the target image.",
    `8. Use window.inky.showReference('image/storyboard.${extension}', { opacity: 0.3 }) while aligning, then hide it before judging exports.`,
    "9. Capture your canvas with window.inky.captureFrameDataUrl(frame) when a still image helps you compare and self-correct.",
    `10. Use window.inky.extractPathsFromImage('image/storyboard.${extension}', { mode: 'outline' }) only as coordinate scaffolding when exact contours matter; redraw those coordinates with Inky brushes.`,
    "11. Analyze the storyboard and style references, choose from listBrushes() ['pencil', 'charcoal', 'crayon', 'watercolor'], and test at least two plausible brushes when the medium is not obvious.",
    "12. Use the selected brush when drawing paths and tune size, thinning, smoothing, streamline, jitter, textureScale, color, roughness, opacity, and seed before writing lower-level texture code.",
    "13. Compose motion with keyframe(), timeline(), and easings; expose useful getFrameDebug() values for frame-by-frame inspection.",
    "14. Create storyboard/scene-objects.json only for elements that should be manually selectable later. Use stable IDs, frameRange, transform, animation, and brush settings.",
    "15. Import optional companions from src/companion-tools.js only when the panel needs Rough.js, Atrament replay, irregular geometry, svg2roughjs, Vivus draw-on animation, p5.brush, or image path helpers.",
    "16. Add speech/caption tracks only when required.",
    `17. Preview with /?project=${slug}.`,
    "18. Render frames and update outputs.",
  ].join("\n");
}

function generateSceneAgentPrompt({ collection, scene, manifest }) {
  const projectRef = manifest.projectRef || scene.projectRef || sceneProjectRef(collection.rootSlug, scene.slug);
  const sceneImage = manifest.storyboard?.sourceImage || "";
  const sharedImage = manifest.storyboard?.sharedSourceImage || "";
  const imageForPreview = sceneImage || sharedImage || "";
  const localStyles = Array.isArray(manifest.style?.references) ? manifest.style.references : [];
  const sharedStyles = Array.isArray(manifest.style?.sharedReferences) ? manifest.style.sharedReferences : [];
  const styleTokens = manifest.style?.tokens || (manifest.style?.inheritsProjectStyle ? "../../style-tokens.json" : "style-tokens.json");
  const imageSlashLine = sceneImage
    ? `- /image ${sceneImage} (scene-specific target image)`
    : sharedImage
      ? `- /image ${sharedImage} (shared project reference for continuity only)`
      : "- No /image file was supplied for this scene.";
  const styleSlashLines = localStyles.length
    ? localStyles.map((reference) => `- ${reference.command || `/style ${reference.path}`} (${reference.name || reference.path})`)
    : [
        "- No new scene-specific /style was supplied; continue from the copied scene style.",
        ...sharedStyles.map((reference) => `- inherited /style ${reference.scenePath || reference.path} (${reference.name || reference.path})`),
      ];
  const styleInstruction = localStyles.length
    ? "Use the scene-local insp/ references first. Analyze each named style with window.inky.analyzeStyle(), then apply its palette, texture, mood, and line quality across the whole scene."
    : "No new style was supplied during duplication. Continue from the copied scene style references and inherited project style, then adjust only where the new scene direction requires it.";
  const imageInstruction = sceneImage
    ? `Use window.inky.showReference('${sceneImage}', { opacity: 0.3 }) while aligning. If exact contours matter, use window.inky.extractPathsFromImage('${sceneImage}', { mode: 'outline' }) as coordinate scaffolding only.`
    : sharedImage
      ? `No new scene-specific image was supplied during duplication. Keep using '${sharedImage}' as copied continuity scaffolding until a new scene image is provided.`
      : "No image was supplied. Draw from the scene prompt and project continuity notes.";
  const copiedFrom = manifest.scenePlan?.copiedFrom;
  const copiedLabel = copiedFrom?.title || copiedFrom?.slug || "the source scene";
  const copiedPath = copiedFrom?.projectRef ? `projects/${copiedFrom.projectRef}` : "";

  return [
    `# Build Inky scene: ${scene.slug}`,
    "",
    `This is scene ${String(scene.order).padStart(2, "0")} in the ${collection.index.title || collection.rootSlug} project.`,
    `This scene was copied from ${copiedPath ? `\`${copiedPath}\`` : copiedLabel}. Start from the copied renderer, references, editable objects, and timing, then edit only what the new scene direction changes.`,
    "",
    "## Paths",
    `- Scene project: projects/${projectRef}`,
    `- Manifest: projects/${projectRef}/project.json`,
    `- Renderer: projects/${projectRef}/${manifest.renderer || "renderer.js"}`,
    `- Requirements: projects/${projectRef}/${manifest.prompt?.requirements || "storyboard/requirements.md"}`,
    `- Style tokens: projects/${projectRef}/${styleTokens}`,
    "",
    "## Slash References",
    imageSlashLine,
    ...styleSlashLines,
    "",
    "## Scene Prompt",
    manifest.scenePlan?.brief || "No scene-specific prompt was supplied.",
    "",
    "## Required Thinking",
    "1. Read AGENTS.md, DESIGN.md, this scene manifest, requirements, the copied renderer, and any scene-local reference files.",
    "2. Identify what should remain from the copied source scene and what the new scene direction changes.",
    "3. Keep the copied totalFrames while the action is still a duplicate; update project.json totalFrames and notes.frameCount only when the new action needs different pacing.",
    `4. ${imageInstruction}`,
    "5. Use window.inky.captureFrameDataUrl(frame) when a still canvas image helps compare the drawing to the reference and self-correct.",
    `6. Load ${styleTokens} with window.inky.loadStyleTokens() when present, then treat palette, texture, mood, line quality, and brush contracts as editable guidance.`,
    `7. ${styleInstruction}`,
    "8. If the prompt references /image or /style, honor those exact scene-local paths first.",
    "9. If no new style was supplied, keep the copied look for continuity, but still make this scene's action and timing specific to the scene prompt.",
    "10. Use createBrush, listBrushes, keyframe, timeline, and easings from src/inky-canvas.js. Choose explicit brush settings instead of hidden defaults.",
    "11. Tune size, thinning, smoothing, streamline, jitter, textureScale, color, roughness, opacity, and seed before reaching for lower-level texture code.",
    "12. Compose motion with keyframe(), timeline(), and easings; expose useful getFrameDebug() values so the frame debugger explains timing and placement.",
    "13. Create storyboard/scene-objects.json only for high-level elements that should be manually selectable later. Use stable IDs, frameRange, transform, animation, and brush settings.",
    "14. Draw final artwork with Canvas code only. Do not paste, hide, mask, sample, or export source/reference/style images in final frames.",
    "15. Preview start, middle, and end frames at the scene URL, then render outputs.",
    "",
    "## Preview Helpers",
    imageForPreview ? `- Reference helper: window.inky.showReference('${imageForPreview}', { opacity: 0.3 })` : "- No reference helper path is available yet.",
    "- Canvas capture: window.inky.captureFrameDataUrl(frame)",
    imageForPreview ? `- Path extraction: await window.inky.extractPathsFromImage('${imageForPreview}', { mode: 'outline' })` : "- Add a scene image if exact contour extraction is needed.",
    `- Style tokens: await window.inky.loadStyleTokens('${styleTokens}')`,
    localStyles.length
      ? `- Style analysis: ${localStyles.map((reference) => `await window.inky.analyzeStyle('${reference.path}')`).join("; ")}`
      : "- Style analysis: no new scene style was supplied, so inspect copied and inherited style references if present.",
    "",
    `Preview with /?project=${projectRef}`,
  ].join("\n");
}

function generateCliCommand({ slug, prompt, grid, imageName, styleReferences = [] }) {
  return [
    "npm run new --",
    "--image",
    shellQuote(`./${imageName || "storyboard.png"}`),
    "--name",
    shellQuote(slug),
    "--prompt",
    shellQuote(prompt),
    ...styleReferences.flatMap((reference) => ["--style", shellQuote(`./${reference.name || reference.path || "style.png"}`)]),
  ].join(" ");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function slugify(value) {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || ""
  );
}

function slugifyFileBase(value) {
  return (
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "style"
  );
}

function titleFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function extensionForFileName(fileName) {
  const extension = extname(String(fileName || "")).replace(/^\./, "").toLowerCase();
  if (["gif", "jpg", "jpeg", "png", "webp"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }
  return "png";
}

async function readRequestBuffer(req, maxBytes) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > maxBytes) {
      const error = new Error("Upload is too large.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks, totalBytes);
}

function normalizeSpeedLabel(value) {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  const label = String(parsed).replace(/\.0$/, "");
  return ALLOWED_SPEEDS.has(label) ? label : null;
}

function normalizeAnnotationStatus(value) {
  const status = String(value || "to do").trim().toLowerCase();
  if (["to do", "doing", "done", "needs review", "deleted", "removed", "archived"].includes(status)) return status;
  return "to do";
}

function normalizeRect(rect = {}) {
  const x = finiteNumber(rect.x ?? rect.left ?? rect.x1, 0);
  const y = finiteNumber(rect.y ?? rect.top ?? rect.y1, 0);
  let width = finiteNumber(rect.width ?? rect.w, 0);
  let height = finiteNumber(rect.height ?? rect.h, 0);
  const right = finiteNumber(rect.right ?? rect.x2, NaN);
  const bottom = finiteNumber(rect.bottom ?? rect.y2, NaN);
  if ((!width || !height) && Number.isFinite(right) && Number.isFinite(bottom)) {
    width = right - x;
    height = bottom - y;
  }
  return {
    x,
    y,
    width,
    height,
    ...(rect.normalized && typeof rect.normalized === "object" ? { normalized: rect.normalized } : {}),
  };
}

function finiteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeAnnotationId(value) {
  return String(value || "annotation")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "annotation";
}

function statusError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...value } : {};
}

function isInside(parent, child) {
  const childRelativePath = relative(parent, child);
  return childRelativePath === "" || (!childRelativePath.startsWith("..") && !isAbsolute(childRelativePath));
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
