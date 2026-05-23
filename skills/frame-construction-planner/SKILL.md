---
name: frame-construction-planner
description: Plan readable storyboard frames before drawing detail. Use before rendering each hand-drawn frame, especially when hands, mouths, facial details, props, body poses, or action poses could become ambiguous.
---

# Frame Construction Planner

## Purpose

Prevent unclear drawings at the first stage instead of repairing them later.

Use this before drawing each frame. The goal is to make the frame read as a simple pose first, then add ink, watercolor, hatching, and texture after the pose works.

The source frame is a lighthouse: use it to understand pose, body contact, limb direction, and composition. Do not fly blind, but also do not paste or preserve the source as the final artwork.

Before drawing, read the current project `requirements.md` or equivalent brief. The skill stays generic; character, prop, palette, and frame-specific details belong in the project brief.

## Tool

Create a construction checklist from extracted storyboard frames:

```bash
npm run storyboard:blueprint -- storyboard-frames/<name> output/blueprints/<name> --requirements "match the storyboard unless the user requests changes"
```

The output becomes the frame-by-frame drawing brief and feeds later semantic review. It includes the source frame plus crops around risky zones, so corrections are made by looking back at the lighthouse image.

Use `--spec path/to/spec.json` when the project brief contains frame-specific actions, anchors, or crop regions.

## Required Drawing Order

For every frame:

1. **Intent pass**: name the frame action in one short sentence.
2. **Lighthouse pass**: inspect the source full frame and close crops for pose logic, contact points, silhouette, and pen-stroke direction.
3. **Guide-mark pass**: identify source marks that are only storyboard instructions: panel numbers, borders, arrows, long path lines, ghost poses, labels, or construction marks. Remove them from final art unless they are redrawn as short local accents.
4. **Anchor pass**: place head, neck/shoulder bridge, torso or body mass, primary prop, surface line, and framing.
5. **Attachment pass**: draw each connected chain before detail, for example head -> neck -> shoulders/body, or shoulder -> sleeve -> forearm -> wrist -> hand -> face.
6. **Silhouette pass**: make hands, mouth, facial details, head/hair, clothing, and props readable as flat simple shapes.
7. **Thumbnail pass**: view the frame small. If a shape cannot be named instantly, return to the lighthouse and redraw before detail.
8. **Ink pass**: add contours and important facial/body lines.
9. **Watercolor pass**: add color washes.
10. **Texture pass**: add hatching and handmade marks last.

Do not add dense pen texture until the attachment and silhouette passes are clear.
Do not use one blob or ellipse for a complex body part when the lighthouse shows separate attachments, folds, seams, openings, or contact points. Baggy clothing still needs enough structure to read: waistband, cuffs/openings, seams, and visible limb connections. Shorts specifically need a waistband, left and right leg panels/openings, a center seam or crotch split, and legs visibly exiting below; otherwise they read as a pouch, skirt, ball, or diaper.
Do not draw clothing as independent decorations. Garments inherit their position from the body chain: shirt hem -> waistband -> left/right leg openings -> legs. If the pose shifts sideways, bends, or rotates, the garment anchor must shift with it.
If a constructed shape fails after rendering, return to this stage and redraw the shape from anchors. Do not cover a construction failure with white patches, eraser strokes, masks, texture, or extra outlines.
Do not use organic brush-stroke helpers for rigid closed decorative borders, labels, frames, nameplates, certificates, desks, or paper edges. Stroke those with closed canvas paths or straight segments so they cannot balloon into stray curves.

When building renderer code, prefer `src/illustration-tools.js` for repeated construction work before writing custom drawing code. Use helpers such as `fillConstructedShape`, `drawExpressiveHead`, `drawJointedLimb`, `drawConstructedHand`, `drawInkDoodleHand`, `drawApronTorso`, `drawShortsChain`, and prop helpers to encode the attachment chain directly in the renderer.

## Attachment Rules

- A head must visibly connect to a neck, shoulder bridge, torso, or body mass. Do not let separate head and body ellipses sit near each other with a blank gap.
- For animals, draw the spine chain first: head -> neck -> ribcage/body -> hips -> tail. Then draw shoulder -> foreleg -> paw and hip -> hindleg -> paw.
- A hand touching a face must show at least one of: wrist, cuff, forearm, or overlap shadow.
- A mouth must sit inside the face/head shape and have lip, cheek, or expression context.
- Eyewear and eyes must be attached to the head, not animated or drawn as loose pieces.
- Hair must read as hair, not a dark blob: attach it to the head and include at least one structural clue such as part line, fringe, side locks, strand contour, hairline, or silhouette separation.
- A resting or contact pose must visibly rest on an arm, sleeve, surface, prop, or other support.
- Clothing openings are attachment ports. Arms must exit sleeves, legs must exit shorts/pants/skirt openings, and tails must exit the body; do not let limbs start beside the garment or behind it with no visible exit.
- Removed or changed source objects must not survive as vague shapes. If the user replaces a prop, the new prop should be drawn clearly from the construction stage.

## Per-Frame Notes

Record these before drawing:

- Frame number and source image.
- Project requirements document path.
- Action.
- User changes.
- Risky shapes.
- Lighthouse evidence: what the source says about pose, contact, and scale.
- Lighthouse mark guidance: where contours are strongest, which way hatching flows, and which areas stay soft watercolor.
- Guide-mark decision: remove, animate, or redraw as short final accents.
- Attachment chains.
- Simple silhouette description.
- Object identity checklist for risky props/clothing: list the named parts that make the object identifiable, such as handle/spout/rim for a watering can or waistband/two leg openings/center seam for shorts.
- Parent-child anchor checklist: list which parent shape owns each child shape, for example torso owns waistband, waistband owns leg openings, leg openings own legs, shoulder owns sleeve, sleeve owns wrist/hand.
- Detail zones that can be added only after the pose reads clearly.

## Gate

A frame is allowed to move into watercolor detail only when:

- The pose reads without the source frame.
- No hand, mouth, eye, eyewear, facial detail, or prop looks like a floating blob.
- Every body part has a believable connection path.
- No action pose creates a blank gap between body masses that should be physically attached.
- Every garment stays attached to its parent body part, and every visible limb exits from a plausible opening or joint.
- No visible bug is being hidden by a retrofit patch; the faulty shape has been rebuilt from the correct anchors.
- Any user-requested prop changes are unambiguous.
- Risky clothing and props show the minimum named parts needed to identify them without explanation.
- Construction marks and long guide arcs are absent from the final silhouette unless they are actual objects in the story.
