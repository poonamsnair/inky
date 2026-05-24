---
name: doodle-style-designer
description: Choose and apply doodle-specific drawing tools, helpers, and optional libraries for black-ink, portrait, fashion, studio-wall, and reference-matched doodle animation styles.
---

# Doodle Style Designer

Use this when the user asks for doodle-like, sketchy, black-ink, handdrawn, marker, comic doodle, portrait doodle, or loose illustrated styles.

## Required Order

1. Read the active project requirements and source/reference images.
2. Choose the primary Canvas brush from `listBrushes()` first, usually `pencil`, `charcoal`, or `crayon` for doodle work.
3. If the source has complex line art, call `window.inky.extractPathsFromImage()` and use the returned points as contour scaffolds.
4. Use `src/doodle-style-tools.js` only when a doodle-specific profile, checklist, or legacy renderer dependency removes real work.
5. Write the chosen brush, tuned parameters, and any optional doodle profile into the project requirements.
6. Build semantic objects from continuous silhouettes first: head, hair, hands, sleeves, clothing, shoes, props, wall sheets.
7. Add imperfect ink-like contours with the chosen brush; use `doodle-ink` only for legacy material-tool renderers.
8. Add clothing patterns with clipped strokes so stripes/checks belong to the garment.
9. Use `drawInkDoodleHand()` for loose cartoon hands instead of separate capsule fingers.
10. Run a browser visual check against the references before exporting video.

## Editable Doodle Objects

When a doodle element should be manually adjustable later, draw it through the scene graph instead of raw canvas only. This keeps character parts, props, and important contours selectable in Edit mode.

```js
helpers.sceneGraph.drawObject(ctx, frame, {
  id: "cat_body",
  type: "path",
  points: traced.paths[0].points,
  brush: {
    type: "charcoal",
    color: style.palette?.dark || "#2b2b2b",
    roughness: style.suggestedRoughness ?? 0.45,
    size: 4,
  },
});
```

Use stable IDs for high-level pieces such as heads, hair, arms, hands, clothing, speech bubbles, and props. Do not also draw a separate raw canvas copy unless deleted and moved graph-backed objects are respected.

## Tool Choice

- `pencil`: default loose contour brush for sketchy line art.
- `charcoal`: smoky black fills, shadow masses, rough hair, and expressive dark clothing.
- `crayon`: chunky color accents such as overalls, tools, posters, or props.
- `watercolor`: light washes behind doodle contours when the reference has soft color.
- `RoughJS`: safe only for non-semantic wall notes, background posters, dust, paper scraps, and harmless texture.
- `window.inky.extractPathsFromImage()`: default contour bridge for structural line art, connected shapes, bounding boxes, and repeated line groups.
- `doodle-ink`, `technical-pen`, and `ballpoint-pen`: optional legacy material tools for existing material-tool renderers.
- `Paper.js`: useful for planning and smoothing paths, then converting to deterministic canvas paths.
- `ZIMjs`: future/live pen capture option for custom nibs, brush dampening, ink spread, and automated pen-drag replay. Do not depend on it for final MP4 export until a deterministic bridge exists.

## Doodle Verification

Before handoff, check:

- Hands read as organic drawn hands, not assembled capsule fingers.
- Ink contours are bold, imperfect, and black enough.
- Faces stay simple: dots, small noses, simple mouths, light freckles or brows.
- Hair uses repeated doodle strokes or cloud/strand silhouettes, not a smooth helmet.
- Clothing patterns are clipped to the clothing and move with it.
- Background doodles stay lighter than the character and do not turn into story-critical props.
- The final frame still looks like the references at thumbnail size.
- The browser check shows the drawing is not too smooth, too colorful, too dense, or too unlike the black-ink doodle references.
