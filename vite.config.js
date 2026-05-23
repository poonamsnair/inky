import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { defineConfig } from "vite";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const projectsRoot = resolve(repoRoot, "projects");
const execFileAsync = promisify(execFile);
const MAX_MP4_UPLOAD_BYTES = 250 * 1024 * 1024;
const MAX_ANNOTATION_UPLOAD_BYTES = 60 * 1024 * 1024;
const MAX_STORYBOARD_UPLOAD_BYTES = 120 * 1024 * 1024;
const MAX_REFERENCE_IMAGES = 3;
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
      installProjectCreateMiddleware(server.middlewares);
      installMp4OutputMiddleware(server.middlewares);
      installAnnotationMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      installProjectCreateMiddleware(server.middlewares);
      installMp4OutputMiddleware(server.middlewares);
      installAnnotationMiddleware(server.middlewares);
    },
  };
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
      const prompt = String(payload.prompt || "").trim() || "Use the reference image to plan the composition, then draw with Inky canvas primitives.";
      const storyboardImage = decodeStoryboardDataUrl(payload.imageDataUrl || payload.image || "", payload.imageName || "storyboard.png");

      const projectDir = resolve(projectsRoot, slug);
      if (!isInside(projectsRoot, projectDir)) {
        return sendJson(res, 400, { ok: false, error: "Invalid project path." });
      }

      const extension = storyboardImage.extension || extensionForFileName(payload.imageName || "storyboard.png");
      const safeExtension = STORYBOARD_IMAGE_EXTENSIONS[storyboardImage.type] || extension || "png";
      const imageDir = resolve(projectDir, "image");
      const promptDir = resolve(projectDir, "prompt");
      const storyboardDir = resolve(projectDir, "storyboard");
      const outputsDir = resolve(projectDir, "outputs");
      const storyboardImagePath = resolve(imageDir, `storyboard.${safeExtension}`);

      for (const path of [imageDir, promptDir, storyboardDir, outputsDir, storyboardImagePath]) {
        if (!isInside(projectDir, path)) {
          return sendJson(res, 400, { ok: false, error: "Invalid project file path." });
        }
      }

      await mkdir(imageDir, { recursive: true });
      await mkdir(promptDir, { recursive: true });
      await mkdir(outputsDir, { recursive: true });
      await writeFile(storyboardImagePath, storyboardImage.buffer);

      const relativeStoryboardImage = `projects/${slug}/image/storyboard.${safeExtension}`;
      const relativeStoryboardDir = `projects/${slug}/storyboard`;
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

      const agentPrompt = generateAgentPrompt({
        slug,
        extension: safeExtension,
        grid,
        prompt,
      });
      await writeFile(resolve(promptDir, "agent-prompt.md"), `${agentPrompt}\n`);

      const manifestPath = resolve(projectDir, "project.json");
      const existingManifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")) : {};
      const manifest = createProjectManifest({
        existingManifest,
        slug,
        grid,
        extension: safeExtension,
      });
      await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

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
        storyboardDir: relativeStoryboardDir,
        previewPath: `/?project=${slug}`,
        command: generateCliCommand({ slug, prompt, grid, imageName: payload.imageName || `storyboard.${safeExtension}` }),
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

      const projectDir = resolve(projectsRoot, slug);
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
      const projectDir = resolve(projectsRoot, slug);
      if (!isInside(projectsRoot, projectDir)) {
        return sendJson(res, 400, { ok: false, error: "Invalid project path." });
      }

      const manifestPath = resolve(projectDir, "project.json");
      if (!isInside(projectDir, manifestPath) || !existsSync(manifestPath)) {
        return sendJson(res, 404, { ok: false, error: "Project manifest was not found." });
      }

      const storyboardDir = resolve(projectDir, "storyboard");
      const annotationsPath = resolve(storyboardDir, "annotations.json");
      if (!isInside(projectDir, storyboardDir) || !isInside(storyboardDir, annotationsPath)) {
        return sendJson(res, 400, { ok: false, error: "Invalid annotation path." });
      }

      if (req.method === "GET") {
        if (!existsSync(annotationsPath)) {
          return sendJson(res, 200, { ok: true, version: 1, project: slug, annotations: [] });
        }
        const annotations = JSON.parse(await readFile(annotationsPath, "utf8"));
        return sendJson(res, 200, { ok: true, ...annotations });
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

function normalizeGrid(value) {
  const columns = finiteNumber(value?.columns, NaN);
  const rows = finiteNumber(value?.rows, NaN);
  const safeColumns = Number.isFinite(columns) ? Math.min(12, Math.max(1, Math.round(columns))) : 3;
  const safeRows = Number.isFinite(rows) ? Math.min(12, Math.max(1, Math.round(rows))) : 4;
  return { columns: safeColumns, rows: safeRows };
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

function createProjectManifest({ existingManifest, slug, grid, extension }) {
  const existingOutputs = objectOrEmpty(existingManifest.outputs);
  return {
    slug,
    title: existingManifest.title || titleFromSlug(slug),
    status: existingManifest.status || "draft",
    width: finiteNumber(existingManifest.width, 960),
    height: finiteNumber(existingManifest.height, 620),
    fps: finiteNumber(existingManifest.fps, 12),
    totalFrames: finiteNumber(existingManifest.totalFrames, 96),
    grid,
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
  return `import { createBrush, easings, keyframe, timeline } from "../../src/inky-canvas.js";

export const project = {
  width: ${manifest.width},
  height: ${manifest.height},
  fps: ${manifest.fps},
  totalFrames: ${manifest.totalFrames},
};

const ink = createBrush({
  type: "agent-pen",
  color: "#17120d",
  size: 3.2,
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

  helpers.drawLabel?.(ctx, "Build this renderer with Inky canvas primitives", project.width / 2, project.height * 0.78);
}

export function getFrameDebug(frame) {
  return {
    hint: "Tune brush config and keyframes by inspecting the preview.",
    frame,
    referenceOverlay: "window.inky.showReference('image/storyboard.${manifest.storyboard?.sourceImage?.split(".").pop() || "png"}', { opacity: 0.3 })",
  };
}
`;
}

function generateAgentPrompt({ slug, extension, grid, prompt }) {
  return [
    `# Build Inky animation: ${slug}`,
    "",
    "Use Inky as a Canvas API for agents.",
    "Look at the reference, write drawing code, preview, compare, and tune brush/timing values by eye.",
    "Do not paste the source image into the final animation.",
    "",
    "## Source",
    `- Reference image: projects/${slug}/image/storyboard.${extension}`,
    `- Optional extracted frames: projects/${slug}/storyboard/`,
    `- Grid: ${grid.columns} x ${grid.rows}`,
    "",
    "## User request",
    prompt,
    "",
    "## Required work",
    "1. Read AGENTS.md, DESIGN.md, and the relevant skills.",
    "2. Use project.json as the source of truth.",
    `3. Build projects/${slug}/renderer.js.`,
    "4. Import createBrush, keyframe, timeline, and easings from src/inky-canvas.js.",
    "5. Import optional companions from src/companion-tools.js only when the panel needs Rough.js, Atrament replay, irregular geometry, svg2roughjs, Vivus, or p5.brush.",
    `6. Use window.inky.showReference('image/storyboard.${extension}', { opacity: 0.3 }) in the browser while aligning, then hide it before judging exports.`,
    "7. Add speech/caption tracks only when required.",
    `8. Preview with /?project=${slug}.`,
    "9. Render frames and update outputs.",
  ].join("\n");
}

function generateCliCommand({ slug, prompt, grid, imageName }) {
  return [
    "npm run new --",
    "--image",
    shellQuote(`./${imageName || "storyboard.png"}`),
    "--name",
    shellQuote(slug),
    "--grid",
    shellQuote(`${grid.columns}x${grid.rows}`),
    "--prompt",
    shellQuote(prompt),
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
