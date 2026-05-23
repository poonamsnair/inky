# Inky Agent Guide

Inky is a Canvas API and preview loop for agents that draw animated illustrations in code.

Always start here:

1. Read this file.
2. Read `DESIGN.md`.
3. If a project is active, read `projects/<project-name>/project.json` and `projects/<project-name>/prompt/agent-prompt.md`.
4. Read only the local skills that fit the job. Storyboard, doodle, polish, caption, speech-bubble, and annotation skills are optional workflows, not the default drawing architecture.
5. Run the app from this `inky/` folder.

Use plain-language progress updates. Explain what you are trying to do in nontechnical terms each step of the way.

## Canvas API First

Default renderer work should import primitives from `src/inky-canvas.js`:

```js
import { createBrush, easings, keyframe, timeline } from "../../src/inky-canvas.js";
```

Agents decide the look by changing explicit parameters:

```js
const pen = createBrush({
  type: "pen",
  size: 3,
  jitter: 0.35,
  thinning: 0.5,
  opacity: 0.9,
  seed: 42,
  inkFlow: { enabled: true, endOpacity: 0.72 },
});
```

Use `brush.stroke(ctx, points, overrides)` for pressure-aware lines, `brush.clone(overrides)` for nearby variants, `hatch()` for controlled texture, and `keyframe()` / `timeline()` for motion. Keep `perfect-freehand` and RoughJS available through the primitive API when the drawing needs direct parameter control.

## Companion Tools

Use `src/companion-tools.js` when a drawing needs a specialized helper:

- `drawRoughShape()` for Rough.js primitives with direct roughness, bowing, hachure, and seed control.
- `createAtramentRecorder()` and `replayAtramentStroke()` for live handwriting capture, adaptive smoothing, recorded strokes, and deterministic replay.
- `irregularRect()`, `irregularEllipse()`, `irregularPolygon()`, and `drawIrregularShape()` for wobbly handmade geometry built from chunked point distortion.
- `createSvg2RoughSketch()` for browser-only SVG-to-RoughJS conversion when a clean SVG should become a sketchy reference layer.
- `createVivusDrawOn()` for DOM/SVG paths that should visibly draw themselves in real time.
- `createP5BrushCanvas()` for p5.brush standalone natural-media marks on a separate canvas that can be composited into an Inky frame.

These are companions, not defaults. Pull one in because a panel needs it, then keep its parameters explicit in the renderer.

## Reference Overlay

The browser preview exposes agent-only helpers:

```js
window.inky.showReference("image/storyboard.png", { opacity: 0.3, align: "center" });
window.inky.hideReference();
window.inky.goToFrame(24);
window.inky.inspectFrame();
window.inky.captureFrameDataUrl();
```

The reference overlay is for coding and alignment only. It must be hidden when judging final artwork and it is never included in PNG or MP4 export.

Do not paste, trace, sample, or hide source bitmaps in finished frames. Use references to understand composition, silhouettes, contact points, and stroke rhythm, then redraw the scene with canvas code.

## Optional Legacy Helpers

`src/material-tools.js`, `src/illustration-tools.js`, `src/doodle-style-tools.js`, `src/reference-vector-tools.js`, and `src/rough-accent-tools.js` are optional or legacy helpers. Use them only when they remove real work for a specific project. Do not make new default renderer scaffolds depend on named style presets such as `dip-ink` or `doodle-ink`.

When changing primitive brush behavior, run:

```bash
npm run canvas:brushes
npm run canvas:companions
```

The older storyboard review scripts can still be used when a project truly needs frame extraction, semantic review, polish, visual diffing, captions, speech bubbles, or annotation repair.

## Project Structure

Each render project should live under:

```text
projects/<project-name>/
├── image/       # original user-provided reference image
├── prompt/      # user directions and generated agent prompt
├── storyboard/  # optional extracted frames, notes, annotations, or review assets
└── outputs/     # rendered PNG frames, MP4 files, contact sheets, exports
```

`project.json` is the source of truth for dimensions, FPS, frame count, renderer path, tracks, and outputs.

## Quality Gates

Before handoff:

- Confirm the renderer uses explicit canvas primitives and locally chosen brush/timing parameters.
- Confirm every story-critical body, prop, caption, or speech bubble is drawn from readable parts and is not a patched bitmap.
- Confirm reference overlays are hidden and absent from exported PNG/MP4 output.
- Check start, middle, and end frames in the browser.
- Verify Play, Pause, playback speed, timeline scrub, PNG export, and MP4 export.
- Use optional storyboard, polish, visual-diff, caption, speech-bubble, or doodle audits only when the project needs those workflows.

When a rendered frame has an obvious bug, fix the underlying shape, anchor, layer, or timing and redraw it. Do not cover drawing mistakes with eraser patches, white plugs, opacity tricks, or decorative texture.
