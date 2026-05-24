#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [outputArg = "outputs/brush-preview/inky-path-extraction.png"] = process.argv.slice(2);
const outputPath = resolve(root, outputArg);
const outputDir = dirname(outputPath);
const htmlPath = join(outputDir, "inky-path-extraction.html");
const relativeHtmlPath = htmlPath.slice(root.length).replaceAll("\\", "/");

mkdirSync(outputDir, { recursive: true });

function getOpenPort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = address && typeof address === "object" ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still warming up.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 180));
  }
  throw new Error(`Timed out waiting for preview server at ${url}`);
}

writeFileSync(
  htmlPath,
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Inky Path Extraction Preview</title>
    <style>
      html,
      body {
        margin: 0;
        background: #fbf6ea;
      }
      canvas {
        display: block;
      }
    </style>
  </head>
  <body>
    <canvas id="preview" width="1280" height="760"></canvas>
    <script type="module">
      import { createBrush } from "/src/inky-canvas.js";
      import { drawExtractedPaths, extractPathsFromImage } from "/src/image-path-extractor.js";

      const canvas = document.querySelector("#preview");
      const ctx = canvas.getContext("2d", { alpha: false });

      function drawReference(targetCtx) {
        targetCtx.fillStyle = "#fffaf0";
        targetCtx.fillRect(0, 0, 420, 420);
        targetCtx.strokeStyle = "#17120d";
        targetCtx.lineWidth = 13;
        targetCtx.lineCap = "round";
        targetCtx.lineJoin = "round";
        targetCtx.beginPath();
        targetCtx.moveTo(70, 276);
        targetCtx.bezierCurveTo(104, 138, 210, 86, 319, 154);
        targetCtx.bezierCurveTo(382, 194, 338, 319, 230, 318);
        targetCtx.bezierCurveTo(157, 318, 127, 270, 160, 222);
        targetCtx.stroke();
        targetCtx.beginPath();
        targetCtx.moveTo(130, 140);
        targetCtx.lineTo(100, 76);
        targetCtx.lineTo(178, 107);
        targetCtx.stroke();
        targetCtx.beginPath();
        targetCtx.moveTo(286, 133);
        targetCtx.lineTo(332, 76);
        targetCtx.lineTo(342, 157);
        targetCtx.stroke();
        targetCtx.fillStyle = "#17120d";
        targetCtx.beginPath();
        targetCtx.arc(190, 188, 11, 0, Math.PI * 2);
        targetCtx.arc(270, 188, 11, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.lineWidth = 8;
        targetCtx.beginPath();
        targetCtx.moveTo(226, 218);
        targetCtx.quadraticCurveTo(230, 240, 210, 252);
        targetCtx.moveTo(226, 218);
        targetCtx.quadraticCurveTo(236, 240, 258, 250);
        targetCtx.stroke();
      }

      const referenceCanvas = document.createElement("canvas");
      referenceCanvas.width = 420;
      referenceCanvas.height = 420;
      drawReference(referenceCanvas.getContext("2d", { alpha: false }));
      const dataUrl = referenceCanvas.toDataURL("image/png");
      const traced = await extractPathsFromImage(dataUrl, {
        mode: "outline",
        maxPaths: 40,
        simplifyTolerance: 1.4,
        maxPointsPerPath: 180,
        sampleStep: 6,
      });

      ctx.fillStyle = "#fbf6ea";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1f1a16";
      ctx.font = "800 34px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Inky image-to-path extraction", 42, 58);
      ctx.font = "500 17px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Left: source pixels. Right: extracted points redrawn with a textured Inky brush.", 42, 88);

      ctx.fillStyle = "#201914";
      ctx.font = "800 18px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Reference image", 70, 135);
      ctx.fillText("Brush redraw from extracted coordinates", 655, 135);

      ctx.drawImage(referenceCanvas, 70, 160);

      ctx.save();
      ctx.translate(650, 160);
      ctx.fillStyle = "#fffaf0";
      ctx.fillRect(0, 0, 420, 420);
      const brush = createBrush({
        type: "pencil",
        color: "#17120d",
        size: 4.4,
        roughness: 2.2,
        textureScale: 0.95,
        opacity: 0.9,
        seed: 91,
      });
      drawExtractedPaths(ctx, traced, brush, { seed: 200, roughness: 2.2, opacity: 0.92 });
      ctx.restore();

      ctx.font = "600 15px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#574c42";
      ctx.fillText("paths: " + traced.pathCount + "   points: " + traced.pointCount, 655, 612);
      ctx.fillText("bounds: " + JSON.stringify(traced.bounds), 655, 638);

      window.__INKY_PATH_EXTRACTION_READY = true;
      window.__INKY_PATH_EXTRACTION_RESULT = traced;
    </script>
  </body>
</html>
`,
);

const port = await getOpenPort();
const url = `http://127.0.0.1:${port}${relativeHtmlPath}`;
const server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: root,
  stdio: "ignore",
});

try {
  await waitForServer(url);
  execFileSync(
    "npx",
    [
      "playwright",
      "screenshot",
      "--browser=chromium",
      "--wait-for-timeout=1300",
      "--viewport-size=1280,760",
      url,
      outputPath,
    ],
    { stdio: "inherit", cwd: root },
  );
} finally {
  server.kill("SIGTERM");
}

console.log(`Rendered Inky path extraction preview to ${outputPath}`);
