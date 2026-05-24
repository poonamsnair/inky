# Inky Agent Guide

Inky is a Canvas API and preview loop for agents that draw animated illustrations in code.

Always start here:

1. Read this file.
2. Read `DESIGN.md`.
3. When creating or revising renderer code, read `AGENT_PROMPT.md` for the default visual workflow.
   For reference-based drawing, follow the "Reference Replication Recipe" in `AGENT_PROMPT.md` as the mandatory alignment workflow.
4. When a reference image is involved, read `skills/reference-replication-recipe/SKILL.md`.
5. If a project is active, read `projects/<project-name>/project.json` and `projects/<project-name>/prompt/agent-prompt.md`.
6. If the prompt names files in `projects/<project-name>/insp/`, treat them as artistic style references before drawing.
7. Read only the local skills that fit the job. Storyboard, doodle, polish, caption, speech-bubble, and annotation skills are optional workflows, not the default drawing architecture.
8. Run the app from this `inky/` folder.

Use plain-language progress updates. Explain what you are trying to do in nontechnical terms each step of the way.

## Canvas API First

Default renderer work should import primitives from `src/inky-canvas.js`:

```js
import { createBrush, easings, keyframe, listBrushes, timeline } from "../../src/inky-canvas.js";
```

Agents decide the look by changing explicit parameters:

```js
const options = listBrushes(); // ['pencil', 'charcoal', 'crayon', 'watercolor']
const pen = createBrush({
  type: "pencil",
  size: 3,
  roughness: 0.35,
  textureScale: 0.9,
  thinning: 0.5,
  opacity: 0.9,
  seed: 42,
  inkFlow: { enabled: true, endOpacity: 0.72 },
});
```

Analyze the storyboard or reference first and name the intended medium, such as charcoal scene, crayon character, pencil sketch, or watercolor wash. Choose from `listBrushes()`, render at least two plausible candidates when the style is not obvious, compare against the reference, then keep the selected brush explicit in the renderer. Tweak `textureScale`, `color`, and `roughness` before reaching for lower-level texture code.

Use `brush.stroke(ctx, points, overrides)` for pressure-aware textured lines, `brush.clone(overrides)` for nearby variants, `hatch()` for controlled texture, and `keyframe()` / `timeline()` for motion. Keep `perfect-freehand` and RoughJS available through the primitive API when the drawing needs direct parameter control.

## Retained Scene Objects

When a project should be manually editable, also create `storyboard/scene-objects.json`. Use it for high-level selectable elements such as characters, limbs, props, captions, and important strokes. The preview loads this base graph, applies manual edits from `storyboard/edit-layer.json`, and renders the effective objects through the same Inky brush system.

Renderer code can use:

```js
helpers.sceneGraph.draw(ctx, frame);
helpers.sceneGraph.drawObject(ctx, frame, {
  id: "cat_body",
  type: "path",
  points: [[120, 200], [180, 220]],
  frameRange: [0, project.totalFrames - 1],
  transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
  brush: { type: "charcoal", color: "#201b15", size: 4, roughness: 0.45 },
});
helpers.sceneGraph.isDeleted("cat_body");
helpers.sceneGraph.getOverride("cat_body");
```

If an element is graph-backed, do not also draw a separate raw canvas copy unless you first check `helpers.sceneGraph.isDeleted(id)` and apply `helpers.sceneGraph.getOverride(id)`. Deleted graph objects must stay gone in preview and export.

## Style Palette

Each project may include an `insp/` folder for artistic style references:

```text
projects/<project-name>/insp/
├── charcoal-portrait.jpg
├── crayon-sketch.png
└── ink-wash-landscape.jpg
```

Use `insp/` images to borrow mood, palette, line quality, texture, composition logic, and medium. They are not story sources unless the user explicitly says so. When a prompt says something like "draw the cat storyboard in the style of `insp/crayon-sketch.png`", first describe the style in plain language: medium, composition, mood, character pose/expression cues, line quality, approximate hex colors, and texture. When `insp/` is empty or the prompt does not name a style reference, derive those style choices from the target image itself.

The preview exposes style helpers:

```js
const style = await window.inky.analyzeStyle("insp/crayon-sketch.png");
const traced = await window.inky.extractPaths("image/storyboard.png", { mode: "outline" });
```

`analyzeStyle()` returns sampled dominant colors, a suggested brush, roughness, textureScale, mood labels, line-quality hints, and an abstract seamless grain tile for brush tuning. Use those numbers as evidence, then adjust with artistic judgment. Do not paste, hide, or export the style image as a finished frame layer.

## Image-To-Path Extraction

When a reference sketch or storyboard has important contours, use the preview helper before drawing from imagination:

```js
const traced = await window.inky.extractPathsFromImage("image/storyboard.png", {
  mode: "outline",
  maxPaths: 80,
  simplifyTolerance: 1.5,
});
```

Use `traced.paths[*].points` or `traced.paths[*].d` as the construction skeleton for the renderer, then redraw those paths with Inky brushes. Keep the coordinate layout from extraction when the source layout itself is the target, and add only seed-based jitter, brush roughness, simplification, or deliberate group offsets. Do not paste the source bitmap into finished frames.

## Source Composition On Wide Stages

When a portrait source image is being adapted to a wide stage, do not automatically fit the whole portrait frame into the canvas. Treat the image as source material for complete story elements, such as the full character, full word, lettering, or prop, then redraw and place those full elements across the wide canvas with separate explicit transforms.

Preserve the readable identity and proportions of each element. Do not crop, squash, or zoom an element just to keep the portrait framing. This is only for portrait-to-wide recomposition; if the prompt asks for an exact panel, storyboard grid, or full-frame composition match, keep the source layout intact.

## Companion Tools

Use `src/companion-tools.js` when a drawing needs a specialized helper:

- `drawRoughShape()` for Rough.js primitives with direct roughness, bowing, hachure, and seed control.
- `createAtramentRecorder()` and `replayAtramentStroke()` for live handwriting capture, adaptive smoothing, recorded strokes, and deterministic replay.
- `irregularRect()`, `irregularEllipse()`, `irregularPolygon()`, and `drawIrregularShape()` for wobbly handmade geometry built from chunked point distortion.
- `createSvg2RoughSketch()` for browser-only SVG-to-RoughJS conversion when a clean SVG should become a sketchy reference layer.
- `createVivusDrawOn()` for DOM/SVG paths that should visibly draw themselves in real time.
- `createP5BrushCanvas()` for p5.brush standalone natural-media marks on a separate canvas that can be composited into an Inky frame.
- `extractPathsFromImage()` / `drawExtractedPaths()` for turning reference pixels into drawable path coordinates before restyling them with Inky brushes.

These are companions, not defaults. Pull one in because a panel needs it, then keep its parameters explicit in the renderer.

## Reference Overlay

The browser preview exposes agent-only helpers:

```js
window.inky.showReference("image/storyboard.png", { opacity: 0.3, align: "center" });
window.inky.hideReference();
window.inky.goToFrame(24);
window.inky.inspectFrame();
window.inky.captureFrameDataUrl(24);
window.inky.extractPathsFromImage("image/storyboard.png", { mode: "outline" });
window.inky.analyzeStyle("insp/crayon-sketch.png");
```

The reference overlay is for coding and alignment only. It must be hidden when judging final artwork and it is never included in PNG or MP4 export.

Do not paste, hide, or export source bitmaps in finished frames. Do not sample story/reference pixels into visible final layers. Pixel-extracted paths are allowed as construction coordinates only, and `insp/` style images may be analyzed into palette/texture metadata; redraw the finished art with canvas code and Inky brushes.

## Reference As Lighthouse, Not Always Frame 1

When the user gives a single reference image for an animation, treat it as a visual lighthouse and key pose unless they explicitly say it is the first frame or an exact full-timeline storyboard. Decide where that reference pose belongs in the action: it might be the final hold, the moment a hand points, the middle of a walk, or a frame near the end.

Use extraction and overlay alignment at that chosen keyframe, not blindly at frame 0. Earlier and later frames may use creative animation judgment, but they must still preserve the reference identity, proportions, palette, line quality, and object ownership. Explain the chosen target frame in the renderer debug output or project notes.

## Animating Existing Reference Parts

When a referenced character, limb, prop, caption, or word already exists in extracted paths or scene objects, animate that same element. Do not draw a second copy on top of the reference pose to create motion.

Before animating a body part or prop, make a plain ownership map: which extracted paths or scene objects belong to the moving element, which paths stay static, and which final-frame paths must be excluded from the static layer while the animated element is moving. If the moving element cannot be separated cleanly, stop and refine the extraction or create a retained scene object for that element first.

Duplicate limbs, duplicate hands, ghost props, and overlay copies are bugs. Fix them by changing object ownership, transforms, path grouping, or extraction data, not by covering the extra part with background color or adding another patch.

## Optional Style Memory

If a project includes `style-tokens.json`, load it before choosing brushes and colors so later scenes can inherit the same palette, line quality, texture density, and brush contracts:

```js
const styleTokens = await window.inky.loadStyleTokens();
```

Treat style tokens as editable guidance, not a hard style generator. If the scene reference clearly calls for a different stroke, pressure, or wash, adjust explicit `createBrush()` parameters and explain the choice in the renderer debug output or project notes.

## Optional Legacy Helpers

`src/material-tools.js`, `src/illustration-tools.js`, and `src/doodle-style-tools.js` are optional specialist helpers for older or highly specific projects. Use them only when they remove real work. New default renderer scaffolds should stay on `src/inky-canvas.js`, `listBrushes()`, `extractPathsFromImage()`, and `src/companion-tools.js`.

When changing primitive brush behavior, run:

```bash
npm run canvas:brushes
npm run canvas:paths
npm run canvas:companions
```

The older storyboard review scripts can still be used when a project truly needs frame extraction, semantic review, polish, visual diffing, captions, speech bubbles, or annotation repair.

## Project Structure

Each render project should live under:

```text
projects/<project-name>/
├── image/       # original user-provided reference image
├── insp/        # optional artistic style references
├── prompt/      # user directions and generated agent prompt
├── scenes/      # scene 02+ projects, each as its own subfolder
├── storyboard/  # optional extracted frames, notes, annotations, or review assets
└── outputs/     # rendered PNG frames, MP4 files, contact sheets, exports
```

Scene 01 lives at the project root. Additional scenes must live inside `projects/<project-name>/scenes/<scene-slug>/`, not beside the original project as top-level folders. Use `scenes.json` in the root project as the scene library index.

New scenes start by copying the current scene into the next scene slot. Keep the copied renderer, frame count, references, editable scene objects, and timing as the starting point, then revise them when the user or agent supplies new scene details or images. Each scene still gets its own optional `image/`, `insp/`, `prompt/`, `storyboard/`, and `outputs/` folders. Use scene-local references first; if no new style or image has been provided, continue from the copied scene's references for continuity. When the revised scene needs different pacing, update `totalFrames` and explain the reason in `project.json` notes.

`project.json` is the source of truth for dimensions, FPS, frame count, renderer path, tracks, and outputs.

## Quality Gates

Before handoff:

- Confirm the renderer uses explicit canvas primitives and locally chosen brush/timing parameters.
- Confirm every story-critical body, prop, caption, or speech bubble is drawn from readable parts and is not a patched bitmap.
- Confirm moving body parts and props are single-owned: no duplicate arms, hands, props, captions, or ghost copies remain from static reference layers.
- Confirm reference overlays are hidden and absent from exported PNG/MP4 output.
- Check start, middle, and end frames in the browser.
- Verify Play, Pause, playback speed, timeline scrub, PNG export, and MP4 export.
- Use optional storyboard, polish, visual-diff, caption, speech-bubble, or doodle audits only when the project needs those workflows.

When a rendered frame has an obvious bug, fix the underlying shape, anchor, layer, or timing and redraw it. Do not cover drawing mistakes with eraser patches, white plugs, opacity tricks, or decorative texture.
