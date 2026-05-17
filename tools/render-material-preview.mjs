#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [outputArg = "outputs/material-preview/material-tools-contact-sheet.png"] = process.argv.slice(2);
const outputPath = resolve(root, outputArg);
const outputDir = dirname(outputPath);
const htmlPath = join(outputDir, "material-tools-contact-sheet.html");
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
    <title>Inky Material Tools Preview</title>
    <style>
      html,
      body {
        margin: 0;
        background: #f7f0df;
      }
      canvas {
        display: block;
      }
    </style>
  </head>
  <body>
    <canvas id="preview" width="1280" height="1240"></canvas>
    <script type="module">
      import {
        MATERIAL_TOOLKITS,
        drawBristleStroke,
        drawCoherentPaperGrain,
        drawMaterialBrushStroke,
        drawMaterialStroke,
        ensureReadableColor,
        fillClippedMaterial,
        materialToolNames,
      } from "/src/material-tools.js";

      const canvas = document.querySelector("#preview");
      const ctx = canvas.getContext("2d", { alpha: false });
      const TAU = Math.PI * 2;

      function hashString(value) {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index += 1) {
          hash ^= value.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
      }

      function seededRandom(seed) {
        let value = seed >>> 0;
        return function random() {
          value += 0x6d2b79f5;
          let result = value;
          result = Math.imul(result ^ (result >>> 15), result | 1);
          result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
          return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
        };
      }

      function roundedRectPath(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }

      function wrapText(text, x, y, maxWidth, lineHeight) {
        const words = text.split(" ");
        let line = "";
        for (const word of words) {
          const test = line ? line + " " + word : word;
          if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, y);
            line = word;
            y += lineHeight;
          } else {
            line = test;
          }
        }
        if (line) ctx.fillText(line, x, y);
      }

      const palette = [
        "#1f1a16",
        "#315d8a",
        "#cf553f",
        "#d7a934",
        "#5d8c61",
        "#7c5ba6",
        "#7e5a36",
      ];
      const tools = materialToolNames();
      const cardW = 382;
      const cardH = 142;
      const gapX = 24;
      const gapY = 18;
      const startX = 42;
      const startY = 116;

      ctx.fillStyle = "#fbf4e4";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawCoherentPaperGrain(ctx, { x: 0, y: 0, w: canvas.width, h: canvas.height }, { seed: 3091, alpha: 0.045, step: 3 });

      ctx.fillStyle = "#201914";
      ctx.font = "700 34px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Inky material tools contact sheet", 44, 56);
      ctx.font = "500 17px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Renderer-only brush recipes: ink, dry media, wax, paint, wash, and effects.", 44, 86);

      tools.forEach((toolName, index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        const x = startX + column * (cardW + gapX);
        const y = startY + row * (cardH + gapY);
        const random = seededRandom(hashString("preview:" + toolName));
        const base = palette[index % palette.length];
        const contrast = ensureReadableColor(base, "#fbf4e4");

        ctx.save();
        ctx.globalAlpha = 0.76;
        ctx.fillStyle = "#fffdf6";
        roundedRectPath(x, y, cardW, cardH, 16);
        ctx.fill();
        ctx.globalAlpha = 0.44;
        ctx.strokeStyle = "#7f7467";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = contrast.color;
        ctx.font = "800 20px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText(toolName, x + 18, y + 30);
        ctx.font = "500 12px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#594b3d";
        wrapText(MATERIAL_TOOLKITS[toolName].useWhen, x + 18, y + 49, 332, 15);

        ctx.save();
        roundedRectPath(x + 18, y + 78, 128, 46, 12);
        ctx.fillStyle = "#fffaf0";
        ctx.fill();
        ctx.clip();
        fillClippedMaterial(
          ctx,
          { x: x + 18, y: y + 78, w: 128, h: 46 },
          (path) => {
            path.rect(x + 18, y + 78, 128, 46);
          },
          toolName,
          {
            color: base,
            baseFill: toolName.includes("watercolor") || toolName === "ink-wash" ? "rgba(255,255,255,0.35)" : "transparent",
            seed: hashString("fill:" + toolName),
            scumble: 12,
            gradient: toolName === "watercolor" || toolName === "ink-wash" || toolName === "salt-watercolor"
              ? { color: base, alpha: 0.35, angle: -0.7 }
              : null,
          },
        );
        ctx.restore();
        ctx.save();
        roundedRectPath(x + 18, y + 78, 128, 46, 12);
        ctx.strokeStyle = "#241d18";
        ctx.globalAlpha = 0.56;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();

        const curve = [
          [x + 168, y + 114],
          [x + 212, y + 76],
          [x + 256, y + 108],
          [x + 306, y + 80],
          [x + 356, y + 112],
        ];
        drawMaterialBrushStroke(ctx, curve, toolName, {
          color: base,
          alpha: Math.max(0.2, MATERIAL_TOOLKITS[toolName].alpha),
          random,
          seed: hashString("stroke:" + toolName),
        });
        drawMaterialStroke(ctx, curve, toolName, {
          color: "#211a15",
          alpha: 0.28,
          tool: { size: 1.2 },
          random,
        });

        const bristle = [
          [x + 170, y + 92],
          [x + 218, y + 66],
          [x + 268, y + 92],
          [x + 316, y + 72],
          [x + 356, y + 94],
        ];
        drawBristleStroke(ctx, bristle, toolName, {
          color: base,
          alpha: 0.28,
          bristleCount: 5,
          random,
          seed: hashString("bristle:" + toolName),
        });
      });

      window.__INKY_MATERIAL_PREVIEW_READY = true;
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
      "--viewport-size=1280,1240",
      url,
      outputPath,
    ],
    { stdio: "inherit", cwd: root },
  );
} finally {
  server.kill("SIGTERM");
}

console.log(`Rendered material preview to ${outputPath}`);
