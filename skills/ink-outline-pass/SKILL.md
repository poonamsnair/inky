---
name: ink-outline-pass
description: Strengthen handmade ink linework on canvas/storyboard animation frames. Use when a pen-and-watercolor drawing needs clearer contours, more readable silhouettes, stronger hands/faces/props, denser hatching, or a finished ink illustration feel.
---

# Ink Outline Pass

## Purpose

Make watercolor storyboard frames read as finished ink-and-watercolor illustrations.

Use this after construction and watercolor are working, but before final video rendering. The pass should improve readability without turning the drawing into clean vector art.

## Order

Apply ink in this order:

1. Big silhouette contours: panel border, desk edge, body, head, major props.
2. Attachment contours: wrists, sleeves, hands, neck, head contact, prop contact points.
3. Facial/detail contours: eyes/eyewear, mouth, facial hair, hairline, expression.
4. Material hatching: fabric folds, hair curls, beard texture, wood grain, paper edges, prop shadows.
5. Accent marks: motion marks, dream marks, steam, sparkle, stress marks.

## Rules

- Use broken, imperfect pressure strokes instead of smooth single outlines.
- Draw multiple light passes rather than one heavy vector-like stroke.
- Strengthen silhouettes only where they improve readability.
- Make hands and facial features especially clear.
- Keep ink attached to the underlying form; avoid floating decorative strokes.
- Add dense hatching locally, not uniformly everywhere.
- Preserve watercolor softness in large quiet areas.
- Treat long storyboard arrows, throw arcs, and construction lines as timing notes. Do not ink them as final connector lines.
- Final motion accents should be short, local, and clearly separate from real objects such as strings, ropes, wires, limbs, or props.
- Ink should clarify the underlying form, not cover a broken one. If a bug needs a heavy outline, opaque mark, or decorative stroke to hide it, redraw the construction/path first.

## Frame Animation Rules

For in-between frames:

- Redraw ink marks per frame with tiny jitter.
- Keep contours following interpolated body/prop anchors.
- Do not crossfade separate outlines from one key frame to another.
- Keep line weight consistent across key frames and bridge frames.

## Completion Gate

The frame passes when:

- Main silhouettes read at thumbnail size.
- Hands, mouth, face details, props, and contact points can be named without explanation.
- The image feels handmade, not sticker-like.
- Hatching supports form and motion instead of hiding unclear construction.
- No visible patch, eraser seam, or corrective cover-up is standing in for a proper redraw.
- Any visible accent mark adds clarity to the action and cannot be mistaken for a physical object.
