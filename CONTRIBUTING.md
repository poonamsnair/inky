# Contributing To Inky

Thanks for helping improve Inky. This project is meant to be friendly to both humans and coding agents: clear instructions, small changes, and visual verification matter.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev -- --port 5176
```

Open:

```text
http://127.0.0.1:5176/
```

Before making changes, read:

- `README.md`
- `AGENTS.md`
- `DESIGN.md`

## What To Work On

Good first contributions include:

- improving README examples or documentation
- adding focused brush/material improvements
- improving storyboard extraction or review tooling
- fixing browser preview/export bugs
- adding small quality checks that help catch visual regressions

For animation quality changes, prefer small, reviewable updates. A good pull request usually improves one behavior, one tool, or one project example.

## Development Checks

Run these before opening a pull request:

```bash
npm run check
npm run build
```

If you change brush, texture, path extraction, or companion behavior, also render the focused canvas previews:

```bash
npm run canvas:brushes
npm run canvas:paths
npm run canvas:companions
```

If you change animation output, inspect it in the browser and include screenshots or notes in the pull request.

## Generated Files

Large generated files should not be committed by default:

- `node_modules/`
- `dist/`
- `outputs/`
- local animation projects under `projects/`
- source reference images, prompts, extracted storyboards, review notes, rendered frames, and MP4 exports
- browser scratch files

Curated documentation images belong in `docs/assets/`. If you add a README image, keep it small enough for GitHub to load comfortably.

## Drawing And Animation Standards

Use the storyboard as a lighthouse for pose, silhouette, timing, and texture direction. Do not paste the source image into the final artwork.

Fix visual bugs at the source. If a body, hand, prop, speech bubble, or costume part is wrong, redraw the geometry or layer order instead of covering it with patches, eraser seams, hidden overlays, or extra texture.

## Pull Requests

Please include:

- what changed
- why it changed
- how you checked it
- screenshots or preview links for visual changes

Keep pull requests focused. Documentation, renderer changes, and project-output changes are easier to review when they are separate.
