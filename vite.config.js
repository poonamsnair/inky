import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const projectsRoot = resolve(repoRoot, "projects");
const MAX_MP4_UPLOAD_BYTES = 250 * 1024 * 1024;
const MAX_ANNOTATION_UPLOAD_BYTES = 60 * 1024 * 1024;
const ALLOWED_SPEEDS = new Set(["0.5", "0.75", "1", "1.25", "1.5", "2"]);

export default defineConfig({
  plugins: [inkyMp4OutputPlugin()],
});

function inkyMp4OutputPlugin() {
  return {
    name: "inky-mp4-output",
    configureServer(server) {
      installMp4OutputMiddleware(server.middlewares);
      installAnnotationMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      installMp4OutputMiddleware(server.middlewares);
      installAnnotationMiddleware(server.middlewares);
    },
  };
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
  if (!isInside(projectDir, screenshotDir)) {
    throw statusError(400, "Invalid screenshot output path.");
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

    normalized.push(savedAnnotation);
  }

  return normalized;
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
