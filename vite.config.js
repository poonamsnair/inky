import { mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const projectsRoot = resolve(repoRoot, "projects");
const MAX_MP4_UPLOAD_BYTES = 250 * 1024 * 1024;
const ALLOWED_SPEEDS = new Set(["0.5", "0.75", "1", "1.25", "1.5", "2"]);

export default defineConfig({
  plugins: [inkyMp4OutputPlugin()],
});

function inkyMp4OutputPlugin() {
  return {
    name: "inky-mp4-output",
    configureServer(server) {
      installMp4OutputMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      installMp4OutputMiddleware(server.middlewares);
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

      const body = await readRequestBuffer(req);
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

async function readRequestBuffer(req) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > MAX_MP4_UPLOAD_BYTES) {
      const error = new Error("MP4 upload is too large.");
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
