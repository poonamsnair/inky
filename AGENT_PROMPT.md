# Inky Agent Prompt Template

Use this when asking an agent to build or revise an Inky project.

```text
You are drawing an animated illustration in Inky.

Treat Inky as a Canvas API and preview loop, not a style generator. Look at the reference first, decide the composition and medium yourself, then write canvas code with explicit brush and motion parameters.

Start by reading:
- AGENTS.md
- DESIGN.md
- project.json
- prompt/agent-prompt.md or storyboard/requirements.md
- any files named by /image or /style

Visual analysis:
1. Describe the target in plain language: composition, main shapes, pose, expression, props, lettering, motion beat, and what must line up exactly.
2. Describe the style: medium, line quality, pressure, palette, texture density, and approximate hex colors.
3. Decide whether this is one scene or a storyboard. If it is a storyboard, infer the panel grid visually.
4. Decide which animation frame the reference image represents. A single reference image is a lighthouse key pose, not automatically frame 1, unless the prompt explicitly says it is the start frame or exact full-timeline storyboard.
5. Decide what needs exact coordinate help. Use extraction for the contours that must align at the chosen keyframe.
6. If a portrait reference is being adapted to a wide stage, decide which full source elements must stay whole and where they should sit on the wide canvas. Do not default to fitting the whole portrait frame unless the prompt asks for exact frame matching.

Reference Replication Recipe:
Use this workflow whenever the scene is based on a reference image, storyboard, or style image. Layout accuracy requires extraction; guessing important coordinates by eye is not permitted.

1. Choose and document the reference target frame first. Show the reference with window.inky.showReference("image/storyboard.png", { opacity: 0.3 }) so the target is visible while you align the drawing at that keyframe.
2. Extract paths before placing important figures, props, lettering, panels, or contours.
   const traced = await window.inky.extractPathsFromImage("image/storyboard.png", {
     mode: "outline",
     maxPaths: 80,
     simplifyTolerance: 1.2,
   });
2a. For any referenced element that will move, make a path/object ownership map before drawing:
   - list the extracted paths or retained scene objects that belong to the moving part;
   - exclude those paths from the static reference layer while the part is animated;
   - transform and redraw that same part once;
   - if the moving part is merged into a larger contour, refine extraction or create a retained scene object before animating it.
   Do not add a second arm, hand, prop, word, caption, or ghost copy over the reference pose.
3. Analyze style with window.inky.analyzeStyle("insp/<file>") when an insp reference exists, otherwise analyze the target image itself for palette, texture, and brush hints.
4. Create brushes from the style result, then lock the chosen values into renderer constants.
   const style = await window.inky.analyzeStyle("insp/crayon-sketch.png");
   const contourBrush = createBrush({
     type: style.suggestedBrush || style.suggested?.brush || "pencil",
     color: style.palette?.dark || style.suggested?.color || "#2b2b2b",
     size: 4,
     roughness: style.suggestedRoughness ?? style.suggested?.roughness ?? 0.42,
     textureScale: style.suggestedTextureScale ?? style.suggested?.textureScale ?? 1,
     opacity: style.suggested?.opacity ?? 0.88,
     thinning: 0.45,
     seed: 42,
   });
5. Redraw all extracted paths with Inky brushes. For charcoal, crayon, and pencil, use at least 2-3 passes with nearby seeds and slight size/opacity changes so the marks feel handmade.
   for (const [index, path] of traced.paths.entries()) {
     const points = path.points;
     contourBrush.stroke(ctx, points, { seed: 42 + index * 3, opacity: 0.78 });
     contourBrush.stroke(ctx, points, { seed: 43 + index * 3, size: 3.4, opacity: 0.36 });
     contourBrush.stroke(ctx, points, { seed: 44 + index * 3, roughness: 0.55, opacity: 0.22 });
   }
6. Verify alignment at start, middle, and end frames with the reference still visible. Adjust transforms, point scaling, and timing until the main shapes sit correctly.
7. Hide the reference with window.inky.hideReference() before judging, exporting, or handing off.

Minimal scene-objects.json template for editable elements:
{
  "version": 1,
  "objects": [
    {
      "id": "main_character_body",
      "type": "path",
      "points": [[120, 200], [180, 220], [230, 214]],
      "frameRange": [0, 95],
      "transform": { "x": 0, "y": 0, "rotation": 0, "scaleX": 1, "scaleY": 1 },
      "brush": { "type": "charcoal", "color": "#2b2b2b", "size": 4, "roughness": 0.45 }
    }
  ]
}

Core APIs:
- Import from src/inky-canvas.js:
  import { createBrush, easings, keyframe, listBrushes, timeline } from "../../src/inky-canvas.js";
- Choose a starting medium with listBrushes().
- Create brushes with explicit parameters:
  createBrush({ type: "pencil", size: 3, jitter: 0.3, thinning: 0.5, textureScale: 0.9, roughness: 0.35, seed: 42 })
- Animate with keyframe(), timeline(), and easings.
- Expose useful getFrameDebug(frame) values for placement, timing, brush choice, and stage.

Populating the edit layer:
- Raw canvas strokes are visible, but they are not selectable in Edit mode. For any character part, prop, caption, speech bubble, or important stroke that should be movable or deletable later, draw it through helpers.sceneGraph.drawObject(ctx, frame, object) inside drawFrame().
- Give every editable object a stable id, readable points, and explicit brush settings:
  helpers.sceneGraph.drawObject(ctx, frame, {
    id: "cat_body",
    type: "path",
    points: [[120, 200], [180, 220], [230, 214]],
    brush: { type: "charcoal", color: "#2b2b2b", size: 4, roughness: 0.45 },
  });
- If an element is graph-backed, do not also draw a separate raw canvas copy of it unless you first check helpers.sceneGraph.isDeleted(id) and apply helpers.sceneGraph.getOverride(id). Deleted or moved edit-layer objects must stay deleted or moved in preview and export.

Browser feedback loop:
- Use window.inky.showReference("image/storyboard.png", { opacity: 0.3 }) while aligning.
- Use window.inky.hideReference() before judging or exporting.
- Use window.inky.captureFrameDataUrl(frame) when a still canvas snapshot helps compare output to the target.
- Use window.inky.extractPathsFromImage("image/storyboard.png", { mode: "outline" }) only as coordinate scaffolding. Redraw extracted paths with Inky brushes.
- Use window.inky.analyzeStyle("insp/<file>") for palette, mood, texture, and brush hints. Adjust the result with artistic judgment.

Style analysis vs style tokens:
- Use window.inky.analyzeStyle("insp/<file>") or window.inky.analyzeStyle("image/storyboard.png") when reading a style reference image. This produces palette, texture, and suggested brush hints for the current drawing.
- Use npm run style:tokens only when inheriting brush contracts and color constants from an existing renderer. make-style-tokens.mjs reads renderer source code; it does not analyze style reference images.
- If both exist, start with style-tokens.json for continuity, then adjust explicit createBrush() parameters using analyzeStyle() evidence from the current reference.

Hand-drawn feel:
- Tune size, thinning, smoothing, streamline, jitter, roughness, textureScale, opacity, seed, and inkFlow before adding custom texture code.
- Use multiple passes with nearby seeds for pencil, charcoal, crayon, or watercolor texture.
- Texture files in public/textures/brushes/ are optional visible references for the preset shelf. The procedural brush texture generation works without external texture files, so keep using createBrush() and tune textureScale, color, and roughness even if an asset URL is missing.
- Use pressure-aware points and partial stroke reveal for lines that should feel drawn by hand.
- Keep shapes readable first. Do not hide weak geometry with patches, masks, white fills, or extra texture.

Companion tools:
- Use drawRoughShape() for sketchy geometric accents that need Rough.js controls.
- Use Atrament replay for captured handwriting or natural freehand strokes.
- Use irregularRect(), irregularEllipse(), and irregularPolygon() for wobbly handmade geometry.
- Use createSvg2RoughSketch() only when a clean SVG should become a sketchy construction layer.
- Use createVivusDrawOn() for DOM/SVG paths that should draw themselves in real time.
- Use createP5BrushCanvas() for special natural-media marks on a separate canvas.

Rules:
- Final frames must be drawn in code. Do not paste, hide, sample, or export source/reference/style images.
- For portrait-to-wide scenes, redraw complete source elements and place them with separate explicit transforms rather than forcing one whole-image fit.
- For a single animation reference, use the reference as a key pose/lighthouse. The character may enter from off-screen, walk, draw, and settle before matching the reference pose near the selected target frame.
- For reference-based motion, animate the existing extracted part or scene object. Never create a duplicate limb/hand/prop/caption to fake motion over a static final pose.
- Prefer visual overlay, canvas capture, and fast adjustment over rigid blueprint JSON.
- Create storyboard/scene-objects.json only when elements need manual edit handles.
- Preview start, middle, and end frames. Verify Play, Pause, scrub, speed, PNG export, and MP4 export.
```
