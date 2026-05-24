# Inky Design Notes

Inky is a browser-based Canvas API for agents that draw animated illustrations in code. The app should make the see-code-refresh loop fast: look at a reference, write canvas code, preview the result, inspect a frame, adjust brush or timing values, and repeat.

The final artwork must be drawn in code. A reference image may guide decisions, but it must not be pasted, hidden, sampled into visible layers, or exported as part of the final frame. Pixel-extracted path coordinates may be used as construction data when they are redrawn with canvas code. `insp/` style images may be analyzed into palette, mood, and texture metadata, but their pixels must not become visible final artwork.

For reference-based drawing, the "Reference Replication Recipe" in `AGENT_PROMPT.md` is the canonical workflow: show the reference, extract coordinates, analyze style, redraw with explicit brushes, verify alignment, and hide the reference before export.

## Source Composition

Reference layout is not automatically final layout. When a portrait source image is used for a wide scene, agents should use it for element identity, contours, pose, and lettering, then redraw the full elements and compose them across the wide canvas. A renderer may use separate transforms for the character, word, props, or other complete elements instead of one contain transform for the whole source frame.

This rule should stay narrow. Whole-image contain fitting and exact coordinate alignment are still valid when the user asks to reproduce a full panel, storyboard grid, or exact composition. For portrait-to-wide scenes, avoid cropping, squashing, or over-zooming source elements just to preserve the portrait frame.

## App Behavior

- Inky starts with no active animation.
- A project becomes active only when the user creates or selects one.
- No project query param means Create Project mode.
- `?project=<project-slug>` means Preview Project mode and must load that project's manifest and renderer.
- `?project=<project-slug>/scenes/<scene-slug>` means Preview Project mode for a scene stored inside its root project.
- `?export=1` renders only the canvas output with no browser controls, overlays, debugger, or reference image.
- The preview includes Play, Pause, timeline scrub, playback speed, PNG export, MP4 export, a frame debugger, and agent helper APIs on `window.inky`.
- Project renderers live at `projects/<project-name>/renderer.js` and export `project`, `drawFrame(ctx, frame, helpers)`, and optionally `getFrameDebug(frame, context)`.
- Scene 01 lives at `projects/<project-name>/`; additional scenes live at `projects/<project-name>/scenes/<scene-slug>/` and are indexed by `projects/<project-name>/scenes.json`.
- Creating a new scene copies the current scene into the next scene slot and opens that duplicate as the starting point. The copied scene keeps the renderer, references, editable objects, and timing until an agent later changes them with new prompt details or images.
- New scene manifests record which scene they were copied from. The agent keeps the copied frame count while the action remains a duplicate, and updates `totalFrames` plus `notes.frameCount` only when the revised scene needs different pacing.
- The preview exposes `window.inky.extractPathsFromImage(source, options)` so agents can convert a reference image into structured path coordinates before drawing.
- The preview exposes `window.inky.analyzeStyle(source, options)` so agents can turn `insp/` style images into palette, texture, and brush-setting hints before drawing.
- The preview exposes `window.inky.showReference()`, `window.inky.captureFrameDataUrl()`, and `window.inky.loadStyleTokens()` so agents can compare visually, capture still frames, and inherit editable style guidance when present.
- The preview can load retained editable objects from `storyboard/scene-objects.json`, apply manual edit diffs from `storyboard/edit-layer.json`, and render the effective graph alongside existing immediate-mode renderer output.

## Canvas API

`src/inky-canvas.js` is the default drawing surface for new renderer work. It exports:

- `createBrush(config)` for explicit line control: `type`, `size`, `jitter`, `thinning`, `smoothing`, `streamline`, `pressure`, `inkFlow`, `opacity`, `seed`, and `perfect-freehand` passthrough options.
- `listBrushes()` for the agent-facing media preset names: `pencil`, `charcoal`, `crayon`, and `watercolor`.
- Brush methods: `stroke`, `polyline`, `fill`, `hatch`, `dot`, and `clone`.
- Animation primitives: `keyframe`, `timeline`, `sequence`, `lerp`, and `easings`.
- RoughJS access through `createRoughCanvas` / `createRough` with full option passthrough.

The library provides primitives plus a small named brush shelf. Agents should visually inspect the reference, decide whether the scene wants pencil, charcoal, crayon, or watercolor, render plausible candidates, and compare before settling. Presets own the texture generation; renderer code should mostly tune `textureScale`, `color`, `roughness`, pressure, opacity, and timing. Legacy material helpers may still exist for specialized work, but default project scaffolds should use this Canvas API first.

Medium texture assets live in `public/textures/brushes/` as visible references for the preset shelf. The runtime also generates deterministic hidden-canvas texture patterns for the actual strokes, so renderers can stay simple and synchronous.

## Retained Scene Graph

Inky's default drawing loop remains immediate-mode, but projects can opt into editable retained objects. Agent-authored base objects live in `storyboard/scene-objects.json`; user edits live in `storyboard/edit-layer.json` as diffs containing deleted IDs, transform offsets, and added objects. The runtime applies base transform, animation at the current frame, then manual offsets.

Renderer helpers:

- `helpers.sceneGraph.draw(ctx, frame)` renders the loaded base graph plus saved edits.
- `helpers.sceneGraph.drawObject(ctx, frame, object)` registers and renders a code-owned editable object.
- `helpers.sceneGraph.isDeleted(id)` and `helpers.sceneGraph.getOverride(id)` let legacy renderer code avoid drawing deleted or moved graph-backed objects.

Only graph-backed objects are selectable in Edit mode. Raw canvas pixels remain non-editable.

## Style Palette

Project style references live in `projects/<project-name>/insp/`. These are optional inspiration images for artistic treatment, separate from the storyboard or `image/` source references. Agents should use them to read medium, mood, palette, composition, line quality, pressure, hatching, color accents, and texture. If no style reference is provided, the target image is also the style source. Style references should not copy their subject matter unless the user explicitly asks for that subject.

The preview exposes:

```js
const style = await window.inky.analyzeStyle("insp/crayon-sketch.png", {
  colorCount: 6,
  tileSize: 96,
});
```

The returned object includes dominant colors, approximate coverage, contrast/grain metrics, mood and line-quality labels, a suggested `listBrushes()` medium, roughness and textureScale hints, and an abstract seamless grain tile. The tile is a brush-tuning aid, not finished artwork. Final frames must still be redrawn with canvas code and explicit brush parameters.

`style-tokens.json` captures the project's chosen palette constants, brush contracts, texture density, and line quality from an existing renderer. Later scenes should load it before choosing new brush settings, especially when they inherit scene 01's ink-and-watercolor style.

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
window.inky.extractPaths("image/storyboard.png", { mode: "outline" }); // alias
window.inky.loadStyleTokens();
```

The overlay is a temporary development aid. It is DOM-only, hidden in export mode, and excluded from PNG/MP4 rendering.

## Reference Keyframes

A single reference image for an animated scene is a key pose unless the prompt explicitly says it is the start frame or an exact storyboard frame. The renderer should choose and document the animation frame where the reference should align, such as a final smile hold or the exact moment a character points.

Path extraction still matters, but the extracted coordinates anchor the selected keyframe. Other frames can interpolate, enter, exit, anticipate, overshoot, or settle around that key pose while preserving the same character identity, proportions, palette, line quality, and brush contracts.

## Image-To-Path Extraction

`src/image-path-extractor.js` is the deterministic bridge from pixels to coordinates. It uses `imagetracerjs` in the browser to vectorize an image URL, data URL, Blob, canvas, or `ImageData`, then returns:

- `paths[*].d`: SVG-style path strings.
- `paths[*].points`: simplified point arrays ready for `brush.stroke()`.
- `paths[*].bounds`, `area`, `length`, `color`, and hole metadata.
- `svg`: optional ImageTracer SVG output for inspection.

Agents should call `window.inky.extractPathsFromImage("image/storyboard.png", { mode: "outline" })`, redraw the returned skeleton with Inky brushes, and use `window.inky.showReference()` to compare alignment. Extracted coordinates are allowed as construction data; source bitmaps must still not be pasted, hidden, sampled, or exported as finished artwork.

## Reference-Based Motion Ownership

When an animation moves a part that exists in the reference, the renderer should transform the extracted part or retained scene object that represents it. It should not add a new limb, hand, prop, or caption over the final reference pose.

Reference-based motion needs an ownership pass before drawing: identify which extracted paths belong to the moving part, remove those paths from the static draw group while the part is animated, and draw the moving part once through a shared transform. If extraction merges the moving part into a larger contour, the correct next step is to refine extraction, trace a retained scene object, or split the path data, not to layer a second copy.

The preview quality check should explicitly look for duplicate anatomy and ghost props during motion frames, especially when a final reference pose is also being redrawn.

## Style Memory And Review Aids

`style-tokens.json` is optional project memory for palette, texture, and brush guidance. It helps later scenes inherit a look without turning style into a hidden generator. Agents should still adjust explicit `createBrush()` parameters after visual comparison.

```js
const styleTokens = await window.inky.loadStyleTokens();
```

Older construction, semantic, polish, visual diff, caption, speech-bubble, and annotation tools remain available when a project truly needs them. They are review aids, not the default drawing architecture.

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
  "style": {
    "inspDir": "insp",
    "references": []
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

The storyboard extraction, semantic audit, polish, visual diff, caption, speech-bubble, and annotation tools remain available for projects that need them. They should not be required for the default Canvas API workflow.

Use:

```bash
npm run canvas:brushes
npm run canvas:paths
npm run canvas:companions
```

when changing `createBrush()` behavior, image extraction, or companion behavior. Use older storyboard scripts only when the project benefits from that specific review loop.

## Final Quality

Before handoff:

- The visible frame should be newly drawn canvas artwork.
- The agent's brush and animation choices should be explicit in renderer code.
- Reference overlays must be hidden and absent from exports.
- Important objects should be readable without the source image.
- Moving reference parts should be single-owned, with no duplicate limbs, hands, props, or ghost copies from static layers.
- Preview controls must work: Play, Pause, timeline scrub, speed, PNG export, and MP4 export.
- Obvious bugs should be fixed at the geometry, layer, or timing source rather than covered with patches.
