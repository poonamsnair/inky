---
name: semantic-clarity-auditor
description: Prevent ambiguous storyboard drawing shapes before animation. Use when a frame has hands, mouths, facial details, props, or pose changes that could read as floating blobs, detached features, or unclear body parts.
---

# Semantic Clarity Auditor

## Purpose

Catch unclear shapes before they become animation problems.

Use this after a still frame is drawn and before moving to the next frame or animating. This is separate from consistency: consistency asks whether frame A matches frame B; semantic clarity asks whether each frame can be understood by itself.

Use the current project requirements document to know what each shape is supposed to be. Keep storyboard-specific checks in the project brief or `--spec` file, not in this skill.

## Core Rule

Every important shape must pass three tests:

1. **Identity**: a viewer can name it without the reference image.
2. **Attachment**: body parts visibly connect to the body, sleeve, face, cup, or desk.
3. **Intent**: the pose reads as the action in the storyboard, including any user-requested changes.

If a shape fails any one of these, redraw it before animation.
Do not approve a semantic fix that hides the failed shape with a patch, overlay, eraser stroke, or texture. A failed shape needs a source-level redraw: correct anchors, correct path geometry, correct layer order, or correct object-part schema.

## Common Failure Modes

- A mouth becomes a dark floating oval instead of part of the face.
- A head is drawn as a separate mass with no visible neck, shoulder, or body connection.
- An animal pose loses the spine chain, leaving head, torso, limbs, or tail as separate floating shapes.
- A palm becomes a peach blob instead of a hand.
- Glasses or eyes appear to slide away from the face.
- A hand touches the face but has no wrist or sleeve connection.
- Props resemble removed or changed storyboard objects after the user asked to replace them.
- A pose only makes sense when the source image is visible.
- Long storyboard guide lines, arrows, panel borders, labels, or construction marks look like physical strings, wires, limbs, or props.
- Baggy clothing reads as a ball, blob, skirt, or prop because it lacks seams, cuffs, openings, or limb attachment clues.
- Shorts read as a pouch, ball, skirt, or diaper because they lack a waistband, two leg openings, center seam/crotch split, and visible legs exiting underneath.
- A shirt, waistband, shorts, pants, or skirt floats as a separate costume piece instead of connecting to the torso/body mass.
- Legs or arms appear beside clothing instead of exiting from leg openings, sleeves, cuffs, or shoulder joints.
- Decorative/object outlines become accidental curves because a brush-stroke helper was used for a rigid closed border.
- Hair reads as a helmet/blob because it lacks a part, strand contour, side lock, hairline, or separation from the face/head.
- A speech bubble or tail has background color leaking through its fill; dialogue balloons should read as one solid white filled shape with a clean black outline unless the project brief requests a different fill.
- A speech bubble has an extra circle, oval, socket ring, or thought-dot mark even though it is not a thought bubble.
- A visible bug has been covered by a white shape, colored plug, eraser seam, extra outline, opacity trick, or texture instead of being redrawn.

## Tool

Generate semantic review boards from rendered frame PNGs:

```bash
npm run storyboard:semantic -- outputs/<drawn-frame-dir> output/review/<name>-semantic
```

With a custom region spec:

```bash
npm run storyboard:semantic -- outputs/<drawn-frame-dir> output/review/<name>-semantic -- --spec path/to/semantic-regions.json
```

The review boards show the full frame plus close crops around risky zones such as face, mouth, hands, arms, clothing, foreground action, and props.

## Review Order

1. Open the semantic contact sheet first.
2. Check each crop without looking at the source frame.
3. Name what each ambiguous-looking shape is meant to be.
4. If the name requires explanation, the drawing fails the clarity check.
5. Fix the drawing by changing silhouettes, attachments, contours, or ink emphasis.
6. Re-run the semantic review board before continuing.

## Fix Rules

- Prefer clearer silhouettes over raw vector fidelity. Extracted paths are useful scaffolds, but the final object must read as a deliberate Inky redraw.
- Add attachment evidence: wrist, sleeve cuff, jawline, lip line, handle connection, arm overlap, contact shadow.
- Add structural bridges before texture: neck, shoulder overlap, spine curve, body contour, or contact shadow.
- Add contour ink only where it clarifies the object.
- Avoid isolated filled ellipses for mouths, cheeks, hands, or props.
- Remove literal storyboard guide marks. If motion needs emphasis, redraw only short local accents near the moving form.
- Add clothing structure before texture: waistband, seams, cuffs, folds, openings, and visible limb exits.
- Anchor clothing to its parent body part before judging the silhouette: torso owns shirt hem, shirt hem overlaps waistband, waistband owns leg openings, and legs begin inside those openings.
- Use object-part schemas for ambiguous items before adding color. Examples: shorts need waistband + two leg panels/openings + center seam + leg exits; watering cans need handle + body + spout + water leaving the spout; books need cover + spine/pages; pots need rim + body + base/saucer.
- For hair, add structural hair cues before texture: part line, fringe shape, side strands, hairline, and a silhouette that follows the head rather than covering it as one mass.
- For rigid borders and labels, replace brush-outline strokes with closed path strokes or straight canvas segments.
- For speech bubbles, construct the body and tail as one continuous closed path, then fill and stroke that path. Any colored wedge, socket patch, eraser seam, or oval at a tail join is a fix-before-animation bug.
- Do not repair speech-bubble joins with visible patches. Fix the source path geometry; only thought bubbles may use visible dot trails.
- Do not hide ambiguity with texture. Texture comes after the form reads clearly.
- When a correction still leaves a seam, plug, ring, or mismatched material, discard the patched correction and redraw/recreate the affected shape from its intended geometry.

## Output

Return a short clarity audit:

- `Pass`: shapes that read clearly.
- `Fix before animation`: unclear shape, frame number, and proposed redraw.
- `Next prevention`: any shared drawing function or anchor that should be reused in later frames.
