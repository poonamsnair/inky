---
name: pen-watercolor-renderer
description: Draw a cohesive handmade canvas illustration using watercolor, ink, pencil, charcoal, crayon, brush, or other traditional-media texture systems.
---

# Handmade Material Renderer

## Drawing Order

1. Paper grain and warm wash.
2. Background architecture.
3. Large subject shapes.
4. Changed/new objects.
5. Hands, tools, and other foreground action.
6. Dense local pen fields.
7. Final key ink contours.

## Material Selection

Choose a small material kit for each project and record it in the project requirements. Do not mix every available medium by default.

- `technical-pen`: crisp contour, small hatching, clean prop edges, fine facial details.
- `dip-ink`, `fountain-pen`, `brush-pen`, or `doodle-ink`: expressive line weight, character silhouettes, hair, clothing folds, handwriting, cartoon hands, lively motion ticks.
- `ballpoint-pen`: scratchy office doodles, fine crosshatching, tiny notes, subtle pen shading.
- `marker`: broad translucent cartoon color, poster strokes, and smooth but visibly hand-filled areas.
- `graphite-pencil`: light construction texture, soft shadows, delicate pose corrections, subtle fabric folds.
- `colored-pencil`: dry color texture, costume details, localized shading, gentle accents.
- `wax-crayon`, `oil-crayon`, or `pastel`: chunky playful fills, childlike texture, broad costume or background areas.
- `charcoal`: smoky shadows, dramatic stage lighting, heavy expressive silhouettes.
- `watercolor`, `ink-wash`, or `salt-watercolor`: transparent washes, paper blooms, monochrome comic wash, soft background, skin/fabric color variation.
- `gouache` or `acrylic`: flatter opaque highlights, dry-brush edges, or poster-like stage props.
- `oil-paint`: thick painterly smears or impasto-like accents only when the project asks for a painterly look.
- `airbrush`, `sponge`, or `screen-tone`: soft glow, mottled texture, foliage/wall texture, or comic halftone shading.

For canvas implementation, emulate materials with pressure strokes, layered translucent fills, dry-brush hatching, grain, blur-free smudges, and controlled opacity. The material choice should improve readability and mood, not hide construction problems.

These choices can live entirely in the drawing code. Do not add brush controls to the visible app UI unless the user asks for an interactive drawing or material-picker feature.

## Code Tooling

Use `src/material-tools.js` when implementing or revising canvas material marks. Use `src/illustration-tools.js` when implementing reference-style illustration structure before those material marks are added.

`src/illustration-tools.js` exposes:

- `ILLUSTRATION_STYLE_KITS` and `resolveIllustrationStyle()` for reusable reference-style palettes and material choices.
- `drawPaperScene()` for stable handmade paper, warm wash, and grain.
- `fillConstructedShape()` for closed, named shapes filled with a base color, clipped material texture, and a clean outline.
- `drawProgressiveContour()` and `drawProgressivePolyline()` for animated draw-on ink strokes.
- `drawExpressiveHead()`, `drawApronTorso()`, `drawJointedLimb()`, `drawConstructedHand()`, `drawInkDoodleHand()`, and `drawShortsChain()` for connected body and clothing chains. Use `drawInkDoodleHand()` for loose black-ink cartoon hands; it builds a continuous hand silhouette instead of separate capsule fingers.
- `drawWoodBoard()`, `drawSimpleFruit()`, `drawReadableLabel()`, and `drawMotionTicks()` for common story props and accents.
- `hashString()`, `seededRandom()`, `lerpObject()`, `lerpPoint()`, `smoothstep()`, `easeOutCubic()`, and `rotateAround()` for deterministic frame timing and anchor movement.

`src/material-tools.js` exposes:

- `MATERIAL_TOOLKITS`: named material presets and when to use them.
- `drawMaterialStroke(ctx, points, toolName, options)`: pressure strokes for pens, brush, pencil, crayon, charcoal, paint-like marks.
- `drawMaterialBrushStroke(ctx, points, toolName, options)`: stamp/bristle strokes for crayon, oil crayon, pencil, charcoal, pastel, gouache, and paint-like marks.
- `drawBristleStroke(ctx, points, toolName, options)`: multi-bristle marks for brush pen, paint, marker, sponge, airbrush, and dry-brush effects.
- `drawMaterialScumble(ctx, bounds, toolName, count, options)`: many short procedural strokes for clipped shape fills and visible material direction.
- `drawMaterialHatch(ctx, bounds, toolName, count, options)`: controlled hatching and dry-media texture.
- `drawDryMediaFill(ctx, bounds, toolName, options)`: layered dry-media pattern, scumble, hatch, and paper-tooth gaps.
- `drawMaterialWash(ctx, bounds, toolName, options)`: transparent wash, blooms, granulation, wet-edge pooling, and salt/tooth effects.
- `fillClippedMaterial(ctx, bounds, drawPath, toolName, options)`: fill a shape with a material recipe while clipped to a source path.
- `fillMaterialGradient(ctx, bounds, stops, options)`: material-aware gradient glaze for light, wash, and soft color transitions.
- `scatterMaterialTexture(ctx, bounds, toolName, count, options)`: grain, crayon/pastel/charcoal/oil-like texture.
- `applyPaperTooth(ctx, bounds, options)`: remove tiny stable paper gaps from wet or waxy media.
- `drawCoherentPaperGrain(ctx, bounds, options)`: stable simplex-noise paper tooth that should not flicker between frames.
- `ensureReadableColor(foreground, background, options)`: contrast guard for captions, speech bubbles, labels, and other text.

Prefer these helpers over one-off stroke code when a project asks for a material change or richer texture. Add a new preset only when an existing tool cannot express the requested medium.

## Tool Choice Heuristics

- Use `technical-pen` for tiny readable details: eyes, fingers, prop edges, seams, buttons.
- Use `dip-ink` or `fountain-pen` for general hand-drawn outlines when the style should stay lively but controlled.
- Use `brush-pen` for bold silhouettes, hair, folds, and expressive close-up line weight.
- Use `doodle-ink` for bold black doodle outlines, cartoon hands, loose portrait contours, dry filled ink accents, and styles that should feel marker-inked rather than painterly.
- Use `ballpoint-pen` for scratchy pen shading, office-comic notes, or hatching that should feel thin and dry.
- Use `marker` for broad translucent cartoon color where wax texture would feel too childish.
- Use `graphite-pencil` before or under detail when construction, soft shading, or delicate corrections matter.
- Use `colored-pencil` for dry costume texture or localized color shading.
- Use `wax-crayon`, `oil-crayon`, or `pastel` for playful chunky texture, especially children's-book scenes.
- Use `charcoal` for smoky shadows, dramatic lighting, or heavy expressive scenes.
- Use `watercolor`, `ink-wash`, or `salt-watercolor` for transparent washes, blooms, skin, fabric variation, quiet background color, or monochrome comic shadows.
- Use `gouache` or `acrylic` for opaque poster-like shapes, dry-brush edges, and bright stage props.
- Use `oil-paint` only for intentionally painterly scenes, thick smears, or impasto-like highlights.
- Use `airbrush`, `sponge`, and `screen-tone` only as deliberate effects, not as generic shortcuts.

## Visual Rules

- Every visible object must belong to the same drawing system.
- Use rough imperfect contours, not clean vector icons.
- Use hundreds or thousands of short pen strokes for texture.
- Let watercolor washes vary with blobs, translucent overlaps, and grain.
- Let gradients act like light, glaze, wet pigment, or soft material transitions; do not use them as generic decorative backgrounds.
- Use stronger contours only after the full scene reads.
- Avoid smooth sticker-like fills.
- Do not rely on speckle-only fills for a brush-material request; use procedural stroke passes so the material has visible direction, pressure, gaps, and overlap.
- Do not use texture to camouflage unclear anatomy, clothing, props, or speech bubbles. Redraw the broken source geometry first.
- Do not copy storyboard guide marks into the finished art. Long throw arcs, arrows, panel borders, and construction lines should usually become animation paths, not visible marks.
- Use final accent marks sparingly: short local motion ticks, dust, impact bursts, sparkle, stress marks, or hatching that clarifies form.
- Before adding texture, confirm complex clothing and body parts still read as their intended objects at thumbnail size.
- For clothing, draw the garment parts before texture. Shorts are not a rounded blue blob: draw a waistband, left/right leg panels, a center seam/crotch split, bottom openings, and legs exiting below.
- Do not use material texture as a repair layer. If a path, contact point, bubble, prop, or body part is wrong, erase/rebuild that source shape before adding pen, crayon, watercolor, charcoal, or hatching.

## Layer Safety

- Paint torso/clothing before head and hair.
- Paint hands/tools after board and fruit.
- Paint final ink last.
- If something looks pasted on, redraw it earlier in the scene rather than covering it at the end.
- If a late correction needs a visible patch to work, the layer order or source geometry is wrong; fix that instead.

## Useful Libraries

- `perfect-freehand` for pressure contours.
- `simplex-noise` for organic wobble.
- `chroma-js` for tonal variation.
- `roughjs` only through `src/rough-accent-tools.js` for safe non-semantic background accents. Do not use it for speech bubbles, labels, body silhouettes, hands, faces, borders, or contact-critical props.
- Canvas gradients, clipping, composite modes, offscreen patterns, seeded noise, and repeated low-opacity strokes for pencil, crayon, charcoal, brush pen, watercolor, gouache, acrylic, marker, and oil-like textures.
- Avoid `CanvasRenderingContext2D.filter` for core material quality; use blur-free smudges, layered dabs, and translucent gradients instead.

## Preview Check

When changing material recipes or choosing a new material kit, render the material contact sheet:

```bash
npm run storyboard:materials
```

Approve a brush update only when the preview shows visibly different ink, dry media, wax, wash, paint, and effect behavior.
