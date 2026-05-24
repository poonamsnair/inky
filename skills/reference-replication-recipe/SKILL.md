---
name: reference-replication-recipe
description: Mandatory ordered workflow for accurately redrawing a reference image in Inky by combining overlay alignment, path extraction, style analysis, brush creation, multi-pass redraws, edit-layer population, and final overlay checks.
---

# Reference Replication Recipe

Use this skill whenever a reference image, storyboard frame, screenshot, or style reference must be replicated accurately. This recipe stitches together `reference-lighthouse`, `image-path-extraction`, and `pen-watercolor-renderer` into one required path.

## Mandatory Workflow

When a reference image is provided, you must:

1. Show the reference overlay with `window.inky.showReference()` while aligning the drawing.
2. Extract coordinates with `window.inky.extractPathsFromImage()` before placing important figures, props, lettering, panels, or contact-critical contours. Guessing important coordinates by eye is not permitted.
3. Analyze the style with `window.inky.analyzeStyle()` using the named `insp/` image when present, otherwise the target image.
4. Wire the style result directly into `createBrush()` and lock the chosen brush values into renderer constants.
5. Redraw extracted paths with Inky brushes, using multi-pass strokes and nearby seeds for pencil, charcoal, and crayon.
6. Toggle the overlay and verify alignment at start, middle, and end frames.
7. Hide the reference with `window.inky.hideReference()` before judging final artwork or exporting.

## Code Pattern

```js
import { createBrush } from "../../src/inky-canvas.js";

const referencePath = "image/storyboard.png";
window.inky.showReference(referencePath, { opacity: 0.3 });

const traced = await window.inky.extractPathsFromImage(referencePath, {
  mode: "outline",
  maxPaths: 80,
  simplifyTolerance: 1.2,
  sampleStep: 8,
});

const style = await window.inky.analyzeStyle("insp/style-reference.png");

const contourBrush = createBrush({
  type: style.suggestedBrush || style.suggested?.brush || "pencil",
  color: style.palette?.dark || style.suggested?.color || "#2b2b2b",
  size: 4,
  roughness: style.suggestedRoughness ?? style.suggested?.roughness ?? 0.45,
  textureScale: style.suggestedTextureScale ?? style.suggested?.textureScale ?? 1,
  opacity: style.suggested?.opacity ?? 0.86,
  thinning: 0.45,
  seed: 42,
});

for (const [index, path] of traced.paths.entries()) {
  contourBrush.stroke(ctx, path.points, { seed: 42 + index * 3, opacity: 0.78 });
  contourBrush.stroke(ctx, path.points, { seed: 43 + index * 3, size: 3.4, opacity: 0.36 });
  contourBrush.stroke(ctx, path.points, { seed: 44 + index * 3, roughness: 0.55, opacity: 0.22 });
}

window.inky.hideReference();
```

## Edit-Layer Hook

If an extracted path should remain movable, selectable, or deletable in Edit mode, draw it through the scene graph instead of raw canvas only.

```js
helpers.sceneGraph.drawObject(ctx, frame, {
  id: "cat_body",
  type: "path",
  points: traced.paths[0].points,
  brush: {
    type: style.suggestedBrush || style.suggested?.brush || "charcoal",
    color: style.palette?.dark || "#2b2b2b",
    roughness: style.suggestedRoughness ?? style.suggested?.roughness ?? 0.45,
    size: 4,
  },
});
```

Do not also draw a separate raw canvas copy of the same object unless you first check `helpers.sceneGraph.isDeleted(id)` and apply `helpers.sceneGraph.getOverride(id)`.

## Style Token Boundary

Use `window.inky.analyzeStyle()` for image-based style references. It reads an `insp/` or target image and returns palette, texture, and suggested brush hints.

Use `npm run style:tokens` only when inheriting an existing renderer's already-chosen palette constants and brush contracts. It extracts from renderer source code, not from a style reference image.
