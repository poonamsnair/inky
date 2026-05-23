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
      import { createBrush, easings, hatch, keyframe, timeline } from "/src/inky-canvas.js";

      const canvas = document.querySelector("#preview");
      const ctx = canvas.getContext("2d", { alpha: false });
      const rows = [
        {
          label: "thin pen: low jitter, light pressure",
          brush: createBrush({ type: "pen", color: "#17120d", size: 2, thinning: 0.32, jitter: 0.12, seed: 11 }),
        },
        {
          label: "expressive ink: pressure swell + dry fade",
          brush: createBrush({
            type: "ink",
            color: "#17120d",
            size: 5.4,
            thinning: 0.72,
            smoothing: 0.32,
            streamline: 0.14,
            jitter: 0.42,
            seed: 22,
            pressure: { base: 0.46, amplitude: 0.18, midSwell: 0.3, noise: 0.07 },
            inkFlow: { enabled: true, startOpacity: 1, endOpacity: 0.58, dryness: 0.16, dryStart: 0.52, segments: 9 },
          }),
        },
        {
          label: "pencil-like scratch: high jitter, low opacity",
          brush: createBrush({
            type: "pencil",
            color: "#302923",
            size: 1.35,
            thinning: 0.18,
            smoothing: 0.2,
            streamline: 0.1,
            jitter: 1.3,
            opacity: 0.46,
            seed: 33,
            pressure: { base: 0.42, amplitude: 0.1, noise: 0.18, midSwell: 0.04 },
          }),
        },
        {
          label: "marker fill: broad, mostly flat pressure",
          brush: createBrush({
            type: "marker",
            color: "#b45f47",
            size: 11,
            thinning: 0.04,
            smoothing: 0.58,
            streamline: 0.34,
            jitter: 0.32,
            opacity: 0.34,
            seed: 44,
            pressure: { enabled: false },
          }),
        },
      ];

      ctx.fillStyle = "#fbf6ea";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1f1a16";
      ctx.font = "800 34px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Inky Canvas API brush contact sheet", 42, 58);
      ctx.font = "500 17px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Primitive createBrush() configs: pressure, jitter, ink-flow opacity, hatching, and keyframed motion.", 42, 88);

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
