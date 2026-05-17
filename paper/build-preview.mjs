import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const paperDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = resolve(paperDir, "main.tex");
const htmlPath = resolve(paperDir, "preview.html");
const pdfPath = resolve(paperDir, "inky_paper.pdf");
const texSource = readFileSync(sourcePath, "utf8");

run("pandoc", [
  sourcePath,
  "--from=latex",
  "--to=html5",
  "--standalone",
  "--metadata",
  "title=Stroke Amnesia: Why Language Models Still Need a Canvas",
  "--output",
  htmlPath,
]);

let html = readFileSync(htmlPath, "utf8");
html = html
  .replace("</head>", `${previewStyles()}\n</head>`)
  .replace(
    /(<\/header>)/m,
    `$1\n${abstractBlock(texSource)}\n<main class="paper-body">`,
  )
  .replace(/(<section id="footnotes")/m, `</main>\n$1`)
  .replace(
    /(<figure id="fig:pipeline"[^>]*>\s*)/m,
    `$1\n${pipelineDiagram()}\n`,
  )
  .replace(
    /(<figure id="fig:bar-placeholder"[^>]*>\s*)/m,
    `$1\n${barDiagram()}\n`,
  );

writeFileSync(htmlPath, html);

const chromePath = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
].find((path) => existsSync(path));

if (!chromePath) {
  throw new Error("No Chrome-compatible browser found for PDF export.");
}

run(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--no-pdf-header-footer",
  "--allow-file-access-from-files",
  `--print-to-pdf=${pdfPath}`,
  `file://${htmlPath}`,
]);

console.log(`Wrote ${htmlPath}`);
console.log(`Wrote ${pdfPath}`);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: paperDir,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`${command} failed with exit code ${result.status}`);
  }
}

function previewStyles() {
  return `<style>
    :root {
      color-scheme: light;
      --screen-bg: #d8d8d8;
      --page: #ffffff;
      --ink: #111111;
      --muted: #333333;
      --rule: #111111;
      --hairline: #777777;
      --code: #f4f4f4;
    }

    html {
      background: var(--screen-bg);
      color: var(--ink);
    }

    body {
      width: min(8.27in, calc(100vw - 32px));
      min-height: 11.69in;
      margin: 24px auto;
      padding: 0.72in;
      background: var(--page);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
      color: var(--ink);
      font: 10pt/1.25 "Times New Roman", Times, serif;
      hyphens: auto;
      text-rendering: optimizeLegibility;
    }

    header {
      margin: 0 0 0.8rem;
      padding: 0;
      border: 0;
      text-align: center;
    }

    h1.title {
      max-width: none;
      margin: 0 auto 0.55rem;
      font-size: 18pt;
      line-height: 1.12;
      letter-spacing: 0;
      font-weight: 700;
    }

    header .author,
    header .date {
      margin: 0.1rem 0;
      color: var(--muted);
      font: 10pt/1.2 "Times New Roman", Times, serif;
    }

    .abstract {
      max-width: none;
      margin: 0.85rem 0 0.9rem;
      padding: 0;
      border: 0;
      background: transparent;
      font-size: 9pt;
      line-height: 1.2;
      text-align: justify;
    }

    .abstract-heading {
      display: block;
      margin-bottom: 0.25rem;
      text-align: center;
      font-weight: 700;
    }

    .paper-body {
      column-count: 2;
      column-gap: 0.32in;
      column-fill: balance;
      text-align: justify;
    }

    .paper-body > *:first-child {
      margin-top: 0;
    }

    h1:not(.title) {
      margin: 0.8rem 0 0.28rem;
      font-size: 11pt;
      line-height: 1.15;
      font-weight: 700;
      break-after: avoid;
    }

    h2 {
      margin: 0.65rem 0 0.2rem;
      font-size: 10pt;
      line-height: 1.15;
      font-weight: 700;
      font-style: italic;
      break-after: avoid;
    }

    h3,
    h4 {
      margin: 0.55rem 0 0.2rem;
      font-size: 10pt;
      line-height: 1.15;
      font-weight: 700;
      break-after: avoid;
    }

    p {
      margin: 0 0 0.48rem;
    }

    a {
      color: var(--ink);
      text-decoration-thickness: 1px;
      text-underline-offset: 3px;
    }

    figure {
      margin: 0.75rem 0;
      padding: 0;
      border: 0;
      background: transparent;
      column-span: all;
      break-inside: avoid;
      text-align: center;
    }

    figcaption {
      margin-top: 0.35rem;
      color: var(--muted);
      font-size: 8.5pt;
      line-height: 1.2;
      text-align: left;
    }

    table {
      display: table;
      width: 100%;
      margin: 0.7rem 0;
      border-collapse: collapse;
      font-size: 8.5pt;
      line-height: 1.15;
      column-span: all;
      break-inside: avoid;
    }

    th,
    td {
      padding: 0.22rem 0.3rem;
      border-bottom: 0.5pt solid var(--hairline);
      vertical-align: top;
    }

    th {
      border-top: 1pt solid var(--rule);
      border-bottom: 0.75pt solid var(--rule);
      font-weight: 700;
    }

    ol,
    ul {
      margin: 0.35rem 0 0.55rem;
      padding-left: 1.2rem;
      text-align: left;
    }

    li {
      margin: 0 0 0.25rem;
      text-align: left;
    }

    li p {
      text-align: left;
    }

    pre {
      margin: 0.55rem 0;
      padding: 0.45rem;
      border: 0.5pt solid var(--hairline);
      background: var(--code);
      white-space: pre-wrap;
      font-size: 7.7pt;
      line-height: 1.15;
      column-span: all;
      break-inside: avoid;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.86em;
    }

    .paper-diagram {
      display: block;
      width: 100%;
      height: auto;
      max-height: 2.4in;
    }

    .thebibliography {
      font-size: 8.5pt;
      line-height: 1.18;
    }

    .thebibliography p {
      margin-bottom: 0.25rem;
      padding-left: 1rem;
      text-indent: -1rem;
    }

    @page {
      size: A4;
      margin: 18mm 15mm;
    }

    @media print {
      html {
        background: white;
      }

      body {
        max-width: none;
        width: auto;
        min-height: 0;
        margin: 0;
        padding: 0;
        border: 0;
        box-shadow: none;
        background: white;
        font-size: 10pt;
      }

      h1:not(.title),
      h2,
      h3 {
        break-after: avoid;
      }
    }

    @media (max-width: 720px) {
      body {
        margin: 0;
        width: 100%;
        min-height: 0;
        padding: 24px 18px;
        box-shadow: none;
      }

      .paper-body {
        column-count: 1;
        text-align: left;
      }

      h1.title {
        font-size: 20pt;
      }

      .abstract,
      .paper-body p {
        text-align: left;
      }
    }
  </style>`;
}

function abstractBlock(source) {
  const match = source.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/m);
  if (!match) return "";

  const content = latexInlineToHtml(match[1]);
  return `<section class="abstract" aria-label="Abstract"><span class="abstract-heading">Abstract</span>${content}</section>`;
}

function latexInlineToHtml(value) {
  return value
    .replace(/\\noindent/g, "")
    .replace(/\\medskip/g, "<br><br>")
    .replace(/\\inky\{\}/g, "Inky")
    .replace(/\\term\{([^{}]+)\}/g, "<em>$1</em>")
    .replace(/\\emph\{([^{}]+)\}/g, "<em>$1</em>")
    .replace(/\\textbf\{([^{}]+)\}/g, "<strong>$1</strong>")
    .replace(/---/g, "&mdash;")
    .replace(/``/g, "&ldquo;")
    .replace(/''/g, "&rdquo;")
    .replace(/\\%/g, "%")
    .replace(/\\&/g, "&amp;")
    .replace(/[ \t]*\n[ \t]*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function pipelineDiagram() {
  const top = ["User storyboard", "Project scaffold", "Source lighthouse", "Construction blueprint", "Body chains + anchors", "Frame render"];
  const bottom = ["Root-cause redraw", "Polish pass", "Browser preview", "Semantic review board", "Visual diff"];
  const topBoxes = top.map((label, index) => box(18 + index * 145, 35, label, index === top.length - 1)).join("");
  const bottomBoxes = bottom.map((label, index) => box(18 + index * 145, 155, label, true)).join("");
  const topArrows = Array.from({ length: top.length - 1 }, (_, index) => arrow(128 + index * 145, 70, 155 + index * 145, 70)).join("");
  const bottomArrows = Array.from({ length: bottom.length - 1 }, (_, index) => arrow(128 + index * 145, 190, 155 + index * 145, 190)).join("");

  return `<svg class="paper-diagram" viewBox="0 0 890 250" role="img" aria-label="Inky pipeline diagram">
    <defs>
      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 Z" fill="#161412"></path>
      </marker>
    </defs>
    ${topBoxes}
    ${bottomBoxes}
    ${topArrows}
    ${bottomArrows}
    ${arrow(778, 86, 635, 166)}
    ${arrow(26, 174, 350, 86)}
  </svg>`;
}

function barDiagram() {
  const labels = ["Attach", "Relation", "Text", "Closure", "Patch", "Drift"];
  const values = [
    [0.45, 0.35, 0.5],
    [0.55, 0.4, 0.6],
    [0.3, 0.25, 0.35],
    [0.4, 0.3, 0.45],
    [0.5, 0.45, 0.55],
    [0.35, 0.3, 0.4],
  ];
  const bars = values.map((set, group) => {
    const x = 88 + group * 104;
    const label = labels[group];
    return set.map((value, index) => {
      const height = value * 220;
      const fill = ["#161412", "#76716a", "#d9d3c8"][index];
      const stroke = index === 2 ? ' stroke="#76716a"' : "";
      return `<rect x="${x + index * 24}" y="${260 - height}" width="20" height="${height}" fill="${fill}"${stroke}></rect>`;
    }).join("") + `<text x="${x + 30}" y="285" text-anchor="middle">${label}</text>`;
  }).join("");

  return `<svg class="paper-diagram" viewBox="0 0 760 330" role="img" aria-label="Placeholder bar chart of failure rates by category">
    <line x1="58" y1="260" x2="720" y2="260" stroke="#161412" stroke-width="2"></line>
    <line x1="58" y1="40" x2="58" y2="260" stroke="#161412" stroke-width="2"></line>
    <text x="24" y="170" transform="rotate(-90 24 170)" text-anchor="middle">failure rate</text>
    ${bars}
    <rect x="88" y="24" width="18" height="14" fill="#161412"></rect><text x="112" y="36">Model A</text>
    <rect x="198" y="24" width="18" height="14" fill="#76716a"></rect><text x="222" y="36">Model B</text>
    <rect x="308" y="24" width="18" height="14" fill="#d9d3c8" stroke="#76716a"></rect><text x="332" y="36">Model C</text>
  </svg>`;
}

function box(x, y, label, soft = false) {
  const lines = label.split(" ");
  return `<g>
    <rect x="${x}" y="${y}" width="112" height="70" rx="6" fill="${soft ? "#f3eee4" : "#fffefa"}" stroke="#161412" stroke-width="2"></rect>
    <text x="${x + 56}" y="${y + 30}" text-anchor="middle">${lines.slice(0, 2).join(" ")}</text>
    <text x="${x + 56}" y="${y + 50}" text-anchor="middle">${lines.slice(2).join(" ")}</text>
  </g>`;
}

function arrow(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#161412" stroke-width="2" marker-end="url(#arrow)"></line>`;
}
