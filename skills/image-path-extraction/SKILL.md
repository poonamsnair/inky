# Image Path Extraction

Use this skill when a reference sketch, storyboard, or screenshot needs exact contour coordinates before drawing with Inky brushes.

## Workflow

1. Open the project preview and show the reference overlay for visual alignment:

   ```js
   window.inky.showReference("image/storyboard.png", { opacity: 0.3 });
   ```

2. Extract path coordinates from the same image:

   ```js
   const traced = await window.inky.extractPathsFromImage("image/storyboard.png", {
     mode: "outline",
     maxPaths: 80,
     simplifyTolerance: 1.5,
     sampleStep: 8,
   });
   ```

3. Inspect `traced.paths`. Use `points` for Inky brush strokes or `d` for Rough.js / `Path2D` geometry.

4. Copy only the needed coordinates into the renderer as skeleton data. Redraw with `createBrush()` and seed-based jitter/roughness. Do not paste the original bitmap into the final frame.

5. Toggle the overlay and compare. If a path is over-simplified, lower `simplifyTolerance`, increase `maxPointsPerPath`, or micro-adjust a group of extracted points.

## Defaults

- `mode: "outline"` works best for black-and-white sketches and line art.
- `ignoreLight: true` drops white/background regions.
- `maxDimension` keeps very large images manageable before tracing.
- `maxPaths`, `minArea`, and `maxPointsPerPath` keep the returned data small enough for renderer code.

## Drawing Example

```js
import { createBrush } from "../../src/inky-canvas.js";

const outline = createBrush({
  type: "pencil",
  color: "#17120d",
  size: 2.4,
  roughness: 2.2,
  textureScale: 0.9,
  seed: 42,
});

for (const path of tracedPaths) {
  outline.stroke(ctx, path.points, { seed: path.pathIndex + 100 });
}
```
