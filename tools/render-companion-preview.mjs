#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [outputArg = "outputs/brush-preview/inky-companion-tools.png"] = process.argv.slice(2);
const outputPath = resolve(root, outputArg);
const outputDir = dirname(outputPath);
const htmlPath = join(outputDir, "inky-companion-tools.html");
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
    <title>Inky Companion Tools Preview</title>
    <style>
      html,
      body {
        margin: 0;
        background: #fbf6ea;
      }
      body {
        position: relative;
        width: 1280px;
        height: 940px;
        overflow: hidden;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      }
      canvas {
        display: block;
      }
      .svg-demo,
      .rough-svg-output {
        position: absolute;
        width: 300px;
        height: 135px;
        border: 1px solid rgba(31, 26, 22, 0.16);
        background: rgba(255, 255, 255, 0.28);
      }
      .svg-demo {
        left: 78px;
        top: 680px;
      }
      .rough-svg-output {
        left: 470px;
        top: 680px;
      }
      .rough-svg-output svg,
      .rough-svg-output canvas {
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <canvas id="preview" width="1280" height="940"></canvas>
    <svg id="vivusDemo" class="svg-demo" viewBox="0 0 300 135">
      <path d="M34 95 C 82 24, 136 112, 184 45 S 254 42, 270 92" fill="none" stroke="#17120d" stroke-width="7" stroke-linecap="round" />
      <path d="M70 86 L 110 92 L 150 82 L 196 90" fill="none" stroke="#b45f47" stroke-width="4" stroke-linecap="round" />
    </svg>
    <svg id="sourceSvg" viewBox="0 0 300 135" hidden>
      <rect x="30" y="28" width="104" height="66" fill="#f8efd9" stroke="#17120d" stroke-width="4" />
      <circle cx="202" cy="62" r="34" fill="#f1cfc4" stroke="#17120d" stroke-width="4" />
      <path d="M52 78 C 86 46, 104 92, 128 56" fill="none" stroke="#17120d" stroke-width="4" />
    </svg>
    <div id="roughSvgOutput" class="rough-svg-output"></div>
    <script type="module">
      import {
        createP5BrushCanvas,
        createSvg2RoughSketch,
        createVivusDrawOn,
        drawIrregularShape,
        drawRoughShape,
        irregularEllipse,
        irregularRect,
        replayAtramentStroke,
      } from "/src/companion-tools.js";
      import { createBrush } from "/src/inky-canvas.js";

      const canvas = document.querySelector("#preview");
      const ctx = canvas.getContext("2d", { alpha: false });
      const labels = [];

      function label(text, x, y) {
        labels.push([text, x, y]);
      }

      function wrapText(text, x, y, maxWidth, lineHeight, maxLines = 2) {
        const words = text.split(/\\s+/);
        let line = "";
        let lines = 0;
        for (const word of words) {
          const testLine = line ? line + " " + word : word;
          if (ctx.measureText(testLine).width > maxWidth && line) {
            ctx.fillText(line, x, y + lines * lineHeight);
            line = word;
            lines += 1;
            if (lines >= maxLines) return;
          } else {
            line = testLine;
          }
        }
        if (line && lines < maxLines) {
          ctx.fillText(line, x, y + lines * lineHeight);
        }
      }

      function card(title, body, x, y, w, h) {
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.42)";
        ctx.strokeStyle = "rgba(31,26,22,0.18)";
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "#201914";
        ctx.font = "800 20px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(title, x + 18, y + 30);
        ctx.font = "500 14px ui-sans-serif, system-ui, sans-serif";
        ctx.fillStyle = "#594b3d";
        wrapText(body, x + 18, y + 54, w - 36, 18, 2);
        ctx.restore();
      }

      ctx.fillStyle = "#fbf6ea";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1f1a16";
      ctx.font = "800 34px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("Inky companion tools contact sheet", 42, 58);
      ctx.font = "500 17px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("Optional libraries and chunked irregular geometry stay under agent control.", 42, 88);

      card("Irregular chunks", "Wobbly path points for handmade geometry.", 50, 130, 360, 180);
      drawIrregularShape(ctx, irregularRect({ x: 84, y: 198, w: 132, h: 70 }, { seed: 10, jitter: 5, chunkLength: 18 }), {
        seed: 11,
        fill: "rgba(241,207,196,0.38)",
        stroke: "#17120d",
        size: 3,
        closed: true,
      });
      drawIrregularShape(ctx, irregularEllipse({ x: 252, y: 192, w: 96, h: 76 }, { seed: 12, jitter: 4, chunkLength: 10 }), {
        seed: 13,
        fill: "rgba(246,224,164,0.34)",
        stroke: "#17120d",
        size: 2.4,
        closed: true,
      });

      card("Rough.js", "Sketchy primitives with roughness and bowing.", 460, 130, 360, 180);
      drawRoughShape(ctx, { kind: "rect", x: 498, y: 194, w: 126, h: 72 }, { seed: 21, roughness: 1.8, bowing: 1.2, fill: "#f8efd9" });
      drawRoughShape(ctx, { kind: "ellipse", cx: 716, cy: 232, w: 106, h: 76 }, { seed: 22, roughness: 1.45, bowing: 1, fill: "#f1cfc4" });

      card("Atrament replay", "Handwriting strokes replay as Inky brush points.", 870, 130, 360, 180);
      replayAtramentStroke(
        ctx,
        {
          weight: 5,
          smoothing: 0.75,
          color: "#17120d",
          segments: [
            { point: { x: 912, y: 248 }, pressure: 0.25, time: 0 },
            { point: { x: 948, y: 205 }, pressure: 0.62, time: 80 },
            { point: { x: 1006, y: 240 }, pressure: 0.9, time: 160 },
            { point: { x: 1054, y: 204 }, pressure: 0.55, time: 240 },
            { point: { x: 1118, y: 242 }, pressure: 0.34, time: 320 },
          ],
        },
        { seed: 31, thinning: 0.72, inkFlow: { enabled: true, endOpacity: 0.72 } },
      );

      card("p5.brush standalone", "Separate natural-media canvas.", 50, 370, 360, 180);
      try {
        const brushCanvas = document.createElement("canvas");
        brushCanvas.width = 300;
        brushCanvas.height = 105;
        const brush = await createP5BrushCanvas(brushCanvas, { seed: 42, scaleBrushes: 1.4 });
        brush.clear("#fbf6ea");
        brush.set("HB", "#17120d", 1.1);
        brush.line(28, 72, 262, 36);
        brush.set("rotring", "#b45f47", 0.85);
        brush.hatch(6, 35);
        brush.rect(82, 42, 128, 48, "center");
        brush.render();
        ctx.drawImage(brushCanvas, 80, 426);
      } catch (error) {
        label("p5.brush not available in this browser: " + error.message, 68, 470);
      }

      card("Vivus.js", "SVG paths can draw on with oneByOne timing.", 50, 610, 360, 230);
      try {
        const vivus = await createVivusDrawOn("vivusDemo", { type: "oneByOne", duration: 80 });
        vivus.setFrameProgress(0.64);
        label("Vivus progress: 64%", 86, 832);
      } catch (error) {
        label("Vivus not available: " + error.message, 86, 832);
      }

      card("svg2roughjs", "Crisp SVG can become a RoughJS sketch base.", 460, 610, 360, 230);
      try {
        await createSvg2RoughSketch({
          target: "#roughSvgOutput",
          sourceSvg: "#sourceSvg",
          outputType: "svg",
          roughConfig: { roughness: 1.3, bowing: 0.8, seed: 64 },
          options: { properties: { seed: 64, randomize: false, backgroundColor: "transparent" } },
        });
        label("svg2roughjs loaded", 496, 832);
      } catch (error) {
        label("svg2roughjs skipped: " + error.message.slice(0, 82), 496, 832);
      }

      card("Preset brush choice", "Companions support listBrushes() presets.", 870, 370, 360, 180);
      const agentPen = createBrush({ type: "pencil", color: "#17120d", size: 3, roughness: 0.4, textureScale: 0.9, seed: 88 });
      agentPen.stroke(ctx, [
        [914, 474],
        [970, 424],
        [1022, 486],
        [1086, 426],
        [1150, 474],
      ]);

      for (const [text, x, y] of labels) {
        ctx.fillStyle = "#594b3d";
        ctx.font = "700 13px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(text, x, y);
      }

      window.__INKY_COMPANION_PREVIEW_READY = true;
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
      "--wait-for-timeout=1600",
      "--viewport-size=1280,940",
      url,
      outputPath,
    ],
    { stdio: "inherit", cwd: root },
  );
} finally {
  server.kill("SIGTERM");
}

console.log(`Rendered Inky companion tools preview to ${outputPath}`);
