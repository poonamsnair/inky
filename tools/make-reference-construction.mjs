#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";
import { projectRefForDir, resolveProjectDir } from "./project-paths.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const options = parseArgs(process.argv.slice(2));
if (!options.project || options.help) {
  printUsage();
  process.exit(options.help ? 0 : 1);
}

const projectDir = resolveProjectDir(options.project, { root });
const manifestPath = join(projectDir, "project.json");
if (!existsSync(manifestPath)) {
  console.error(`Project manifest not found: ${manifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const projectRef = projectRefForDir(projectDir, manifest, { root });
const imagePath = options.image || manifest.storyboard?.sourceImage || "image/storyboard.png";
const outputPath = resolve(projectDir, options.out || manifest.storyboard?.construction || "storyboard/construction.json");

const serverInfo = options.url ? null : await startViteServer();
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: {
      width: Number(manifest.width) || 960,
      height: Number(manifest.height) || 620,
    },
  });
  await page.goto(projectUrl(options.url || serverInfo.url, projectRef), { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof window.inky?.buildReferenceConstruction === "function", null, { timeout: 10000 });

  const construction = await page.evaluate(
    async ({ imagePath: sourceImage, projectRef: activeProjectRef, manifest: activeManifest }) => {
      return window.inky.buildReferenceConstruction(sourceImage, {
        projectRef: activeProjectRef,
        sourceImage,
        canvas: {
          width: activeManifest.width,
          height: activeManifest.height,
        },
      });
    },
    { imagePath, projectRef, manifest },
  );

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(construction, null, 2)}\n`);
  if (options.updateManifest) {
    manifest.storyboard = {
      ...(manifest.storyboard || {}),
      construction: projectRelative(projectDir, outputPath),
    };
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  console.log(`Saved optional reference alignment map: ${projectRelative(root, outputPath)}`);
  console.log(`Objects: ${construction.objects.length}; source paths: ${construction.pathCount}`);
} finally {
  await browser.close();
  if (serverInfo) await serverInfo.close();
}

function parseArgs(args) {
  const out = {
    project: "",
    image: "",
    out: "",
    url: "",
    updateManifest: true,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help") out.help = true;
    else if (arg === "--project") out.project = args[++index] || "";
    else if (arg === "--image") out.image = args[++index] || "";
    else if (arg === "--out") out.out = args[++index] || "";
    else if (arg === "--url") out.url = args[++index] || "";
    else if (arg === "--no-update-manifest") out.updateManifest = false;
    else if (!arg.startsWith("--") && !out.project) out.project = arg;
  }

  return out;
}

function printUsage() {
  console.error(
    `Usage: npm run storyboard:construction -- --project <project-ref-or-path> [--image image/storyboard.png] [--out storyboard/construction.json]
Creates an optional optical alignment map. Prefer the browser reference overlay for ordinary drawing work.`,
  );
}

async function startViteServer() {
  const server = await createServer({
    root,
    configFile: resolve(root, "vite.config.js"),
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: 0,
    },
  });
  await server.listen();
  const url = server.resolvedUrls?.local?.[0] || "http://127.0.0.1:5173/";
  return {
    url,
    close: () => server.close(),
  };
}

function projectUrl(baseUrl, projectRef) {
  const url = new URL(baseUrl);
  url.searchParams.set("project", projectRef);
  url.searchParams.set("inspect", "preview");
  return url.toString();
}

function projectRelative(base, target) {
  return target.replace(resolve(base), "").replace(/^[/\\]+/, "").replace(/\\/g, "/");
}
