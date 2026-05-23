# Inky Design Notes

Inky is a browser-based Canvas API for agents that draw animated illustrations in code. The app should make the see-code-refresh loop fast: look at a reference, write canvas code, preview the result, inspect a frame, adjust brush or timing values, and repeat.

The final artwork must be drawn in code. A reference image may guide decisions, but it must not be pasted, hidden, traced, sampled, or exported as part of the final frame.

## App Behavior

- Inky starts with no active animation.
- A project becomes active only when the user creates or selects one.
- No project query param means Create Project mode.
- `?project=<project-slug>` means Preview Project mode and must load that project's manifest and renderer.
- `?export=1` renders only the canvas output with no browser controls, overlays, debugger, or reference image.
- The preview includes Play, Pause, timeline scrub, playback speed, PNG export, MP4 export, a frame debugger, and agent helper APIs on `window.inky`.
- Project renderers live at `projects/<project-name>/renderer.js` and export `project`, `drawFrame(ctx, frame, helpers)`, and optionally `getFrameDebug(frame, context)`.

## Canvas API

`src/inky-canvas.js` is the default drawing surface for new renderer work. It exports:

- `createBrush(config)` for explicit line control: `type`, `size`, `jitter`, `thinning`, `smoothing`, `streamline`, `pressure`, `inkFlow`, `opacity`, `seed`, and `perfect-freehand` passthrough options.
- Brush methods: `stroke`, `polyline`, `fill`, `hatch`, `dot`, and `clone`.
- Animation primitives: `keyframe`, `timeline`, `sequence`, `lerp`, and `easings`.
- RoughJS access through `createRoughCanvas` / `createRough` with full option passthrough.

The library provides primitives, not final styles. Agents choose values by visually inspecting the reference and rendered frame. Named material presets may exist as examples or legacy helpers, but default project scaffolds must not depend on them.

## Companion Libraries

`src/companion-tools.js` exposes optional adapters and related primitives:

- Rough.js: `drawRoughShape()` for sketchy Canvas primitives with full roughness/bowing/hachure controls.
- Atrament: `createAtramentRecorder()` for live drawing capture and `replayAtramentStroke()` for deterministic replay through Inky brushes.
- Irregular geometry: `irregularRect()`, `irregularEllipse()`, `irregularPolygon()`, and `drawIrregularShape()` for chunked, distorted shapes without requiring a separate package.
- svg2roughjs: `createSvg2RoughSketch()` for browser-only conversion of clean SVGs into RoughJS sketches.
- Vivus.js: `createVivusDrawOn()` for DOM/SVG draw-on animation.
- p5.brush: `createP5BrushCanvas()` for standalone natural-media brush canvases that can be composited into Inky output.

Companion adapters should stay lazy and explicit. Import them only in renderers or preview tooling that need them, so the everyday Inky canvas path stays small and deterministic.

## Reference Overlay

The preview exposes:

```js
window.inky.showReference("image/storyboard.png", {
  opacity: 0.3,
  align: "center",
  fit: "contain",
  offset: { x: 0, y: 0 },
  scale: 1,
});
window.inky.hideReference();
window.inky.setReferenceOpacity(0.18);
window.inky.captureFrameDataUrl();
window.inky.goToFrame(12);
window.inky.inspectFrame();
```

The overlay is a temporary development aid. It is DOM-only, hidden in export mode, and excluded from PNG/MP4 rendering.

## Project Manifest

Each project has one source of truth at `projects/<project-name>/project.json`:

```json
{
  "slug": "research-notes",
  "title": "Research Notes",
  "status": "draft",
  "width": 960,
  "height": 620,
  "fps": 12,
  "totalFrames": 96,
  "grid": {
    "columns": 3,
    "rows": 4
  },
  "storyboard": {
    "sourceImage": "image/storyboard.png",
    "framesDir": "storyboard"
  },
  "prompt": {
    "requirements": "storyboard/requirements.md",
    "agentPrompt": "prompt/agent-prompt.md"
  },
  "tracks": {
    "speechBubbles": null,
    "captions": null
  },
  "renderer": "renderer.js",
  "outputs": {
    "frames": "outputs/frames",
    "video": null
  }
}
```

`src/main.js` must stay generic. It should not import project-specific manifests, project-specific renderers, or hard-code export paths.

## Debugging And Errors

Renderer syntax, import, and draw errors should be visible in the preview instead of silently falling back to an empty canvas. Error output should include project, renderer path, frame number when available, message, stack snippet, and a plain suggestion.

The frame debugger should expose current frame, normalized time, FPS, dimensions, renderer exports, reference overlay state, and optional `getFrameDebug()` output.

## Optional Workflows

The storyboard extraction, material preview, doodle, semantic audit, polish, visual diff, caption, speech-bubble, and annotation tools remain available for projects that need them. They should not be required for the default Canvas API workflow.

Use:

```bash
npm run canvas:brushes
npm run canvas:companions
```

when changing `createBrush()` behavior. Use older storyboard scripts only when the project benefits from that specific review loop.

## Final Quality

Before handoff:

- The visible frame should be newly drawn canvas artwork.
- The agent's brush and animation choices should be explicit in renderer code.
- Reference overlays must be hidden and absent from exports.
- Important objects should be readable without the source image.
- Preview controls must work: Play, Pause, timeline scrub, speed, PNG export, and MP4 export.
- Obvious bugs should be fixed at the geometry, layer, or timing source rather than covered with patches.
