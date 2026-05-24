---
name: reference-lighthouse
description: Use a reference image as guidance and optional extracted coordinate scaffolding for a new drawing without sampling, pasting, hiding, or exporting source pixels in the final canvas.
---

# Reference Lighthouse

## Purpose

Extract what matters from the reference image so the final result can become a new artwork in the same spirit.

The reference is a lighthouse for meaning and style. When exact contours matter, use `window.inky.extractPathsFromImage()` as a measuring bridge, then redraw those coordinates with Inky brushes so the final result is still new canvas artwork.

Style references in `insp/` are a separate kind of lighthouse. Use them for medium, mood, palette, line quality, composition habits, and texture. Do not borrow their subject matter unless the user asks for that subject.
When no `insp/` reference is provided, treat the target image as both the subject reference and the style reference.

For reference-based drawing, also use `reference-replication-recipe`. It is the mandatory ordered workflow that connects overlay alignment, path extraction, style analysis, brush creation, multi-pass redraws, and final reference hiding.

## Read From The Reference

- Main subject and pose.
- Camera angle and framing.
- Big shape relationships.
- Body/part connection chains and overlap points.
- Contact points between body parts, props, and surfaces.
- Lighting direction and warmth.
- Palette families.
- Pen direction, hatching density, contour emphasis, and loose mark rhythm.
- Material cues such as paper, metal, skin, fabric, food, glass, wood.
- Story action.
- Storyboard-only marks: panel numbers, borders, arrows, path lines, ghosted limbs, speed ticks, labels, or construction marks.

## Style Palette Use

When a prompt names an `insp/<file>` image:

- Call `window.inky.analyzeStyle("insp/<file>")` in the preview.
- Describe the style in plain language: medium, composition, mood, line quality, approximate hex colors, and texture.
- Map that evidence to explicit `createBrush()` parameters such as `type`, `color`, `roughness`, `textureScale`, opacity, pressure, and hatching direction.
- Use the returned texture tile only as an abstract brush-tuning clue.
- Keep the final artwork drawn from canvas primitives; do not paste, hide, trace, or export the style image.

If no `insp/<file>` is named, do the same style read from the target image before drawing.

## Motion-Mark Triage

Storyboard motion marks are instructions, not objects. Before drawing, sort every mark into one of three buckets:

- `Remove`: panel numbers, panel borders, guide lines connecting repeated positions, labels, crop edges, and construction marks.
- `Translate into animation`: long throw arcs, repeated ghost positions, or arrows. Use them to move the prop/body over time, not as visible strings in the finished art.
- `Redraw as final accents`: short stress ticks, impact bursts, dust puffs, sparkles, or brief local motion strokes that improve readability.

Never draw long guide lines that connect balls, hands, heads, or repeated prop positions unless the story says an actual string, rope, wire, or trail exists.

## Construction Use

Before detailed rendering:

- If a reference image is provided, follow `reference-replication-recipe`: show the overlay, extract paths, analyze style, wire style hints into `createBrush()`, redraw extracted coordinates with multi-pass strokes, verify alignment, then hide the overlay before export.
- Mark the source's simple anchors: head, body mass, limbs, props, surface, and any overlap/contact points.
- If precise layout is important, extract coordinates with `window.inky.extractPathsFromImage("image/storyboard.png", { mode: "outline" })` and keep only the useful path groups as construction scaffolds.
- Transfer those anchors into the new drawing in the desired style.
- Use the source's pen-stroke direction as a guide for texture flow, not as a traced pattern.
- Use the source's motion marks as timing and direction guidance first; only redraw them if they pass the motion-mark triage above.
- If the new drawing changes the source, keep the same physical logic: connected bodies, grounded props, clear silhouettes, and readable action.
- For in-between frames, respect the same core anchors from the two neighboring lighthouse frames.

## Correction Use

When the rendered result has an obvious bug, use the lighthouse to rebuild the broken form from the correct anchors. Redraw or recreate the defective shape/layer; do not cover it with a patch, eraser stroke, opaque overlay, or extra texture. If the bug is caused by wrong geometry, fix the geometry. If it is caused by wrong layer order, fix the layer order.

## Do Not Do

- Do not draw the original bitmap into the visible canvas.
- Do not create a hidden source layer that the final render copies from.
- Do not patch changed objects on top of a source-derived bitmap/vector layer. Extracted paths must be redrawn and restyled as canvas artwork.
- Do not patch visible bugs on top of a finished frame when the underlying path, anchor, layer order, or object schema is wrong.
- Do not preserve the reference so tightly that new requested changes look forced.
- Do not ignore the reference so loosely that heads, limbs, props, or action beats lose their physical connection.
- Do not turn storyboard guide marks into visible final props.

## Output

Before rendering, produce a small composition plan:

- Background layout.
- Main subject layout.
- Changed objects.
- Layer order.
- Motion-mark triage: remove, animate, or redraw as final accents.
- Areas that need dense pen treatment.
- Areas that should stay soft watercolor.
