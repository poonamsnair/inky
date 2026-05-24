#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [outputArg = "outputs/brush-preview/inky-canvas-brushes.png"] = process.argv.slice(2);
const outputPath = resolve(root, outputArg);
const outputDir = dirname(outputPath);
const htmlPath = join(outputDir, "inky-canvas-brushes.html");
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
    <title>Inky Canvas Brush Preview</title>
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
    <canvas id="preview" width="1280" height="900"></canvas>
    <script type="module">
      import { createBrush, easings, hatch, keyframe, listBrushes, timeline } from "/src/inky-canvas.js";

      const canvas = document.querySelector("#preview");
      const ctx = canvas.getContext("2d", { alpha: false });
      const brushTweaks = {
        pencil: { color: "#302923", size: 2.1, textureScale: 0.85, roughness: 0.44, seed: 11 },
        charcoal: { color: "#1f1b18", size: 6.8, textureScale: 1.1, roughness: 0.72, seed: 22 },
        crayon: { color: "#b45f47", size: 7.4, textureScale: 1.05, roughness: 0.58, seed: 33 },
        watercolor: { color: "#4d8fa9", size: 9.6, textureScale: 1.25, roughness: 0.2, seed: 44 },
      };
      const rows = listBrushes().map((name) => ({
        name,
        label: name + ": preset texture with tuned textureScale, color, and roughness",
        brush: createBrush({ type: name, ...brushTweaks[name] }),
      }));

      ctx.fillStyle = "#fbf6ea";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1f1a16";
      ctx.font = "800 34px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Inky Canvas API brush contact sheet", 42, 58);
      ctx.font = "500 17px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Agent-facing presets from listBrushes(): " + listBrushes().join(", ") + ". Same path, different media texture.", 42, 88);

      rows.forEach((row, index) => {
        const y = 150 + index * 170;
        const motion = { lift: 0 };
        timeline(index * 12, 48, [keyframe(motion, { lift: [0, 34] }, { from: 0, to: 1, easing: easings.easeInOut })]);
        ctx.fillStyle = "#201914";
        ctx.font = "800 19px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText(row.label, 54, y - 28);
        ctx.strokeStyle = "rgba(31,26,22,0.2)";
        ctx.lineWidth = 1;
        ctx.strokeRect(50, y - 18, 1180, 118);

        row.brush.stroke(ctx, [
          [90, y + 62],
          [230, y + 16 - motion.lift * 0.25],
          [370, y + 70],
          [510, y + 22 + motion.lift * 0.18],
          [650, y + 65],
        ]);

        row.brush.clone({ size: Math.max(1, row.brush.config.size * 0.55), opacity: 0.5, seed: 100 + index }).stroke(ctx, [
          [710, y + 26],
          [850, y + 68],
          [990, y + 26],
          [1160, y + 62],
        ]);

        hatch(ctx, { x: 720, y: y + 20, w: 250, h: 64 }, {
          brush: row.brush.clone({ size: 1.15, opacity: 0.32, seed: 200 + index }),
          angle: -0.45,
          gap: 12,
          jitter: 2,
          seed: 300 + index,
        });
      });

      window.__INKY_BRUSH_PREVIEW_READY = true;
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
      "--wait-for-timeout=900",
      "--viewport-size=1280,900",
      url,
      outputPath,
    ],
    { stdio: "inherit", cwd: root },
  );
} finally {
  server.kill("SIGTERM");
}

console.log(`Rendered Inky canvas brush preview to ${outputPath}`);
