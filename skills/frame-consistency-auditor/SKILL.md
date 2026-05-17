---
name: frame-consistency-auditor
description: Audit adjacent hand-drawn storyboard frames before animation. Use when comparing finished drawn frames, checking character identity, keeping recurring props consistent, preventing drifting facial details, hands, hair/head shapes, clothing, or deciding whether frames are ready to animate.
---

# Frame Consistency Auditor

## Purpose

Catch visual drift between adjacent finished frames before animation makes the drift obvious.

Use this after a new frame is drawn and before animating from the previous frame.

Read the project requirements document first. Recurring character and prop details should come from that document, not from hardcoded assumptions in this skill.

## Review Inputs

Use:
- Previous finished drawn frame.
- New finished drawn frame.
- Previous source lighthouse frame, if helpful.
- New source lighthouse frame.
- Current user changes.

Generate side-by-side sheets with:

```bash
npm run storyboard:review -- outputs/<drawn-frame-dir> output/review/<name>
npm run storyboard:visual-diff -- outputs/<drawn-frame-dir> output/review/<name>-visual-diff
```

## Consistency Checklist

Check these in order:

1. Character identity: head size, face angle, feature placement, hair/head volume, and any distinctive traits in the requirements.
2. Face details: eyes, eyewear, mouth, facial hair, or other recurring features stay attached to the head.
3. Head/hair: same palette, shape language, silhouette, strand density, and any user-requested color.
4. Clothing/body: same shoulder width, collar/neckline, sleeve/fold language, body scale, and recurring details.
5. Hands and arms: same hand style, finger simplification level, wrist thickness, and attachment to sleeves/body.
6. Props: same scale, contact points, perspective, and no accidental leftover shapes from removed props.
7. Background: environment layout, panel/border treatment, and paper texture remain stable unless the story changes.
8. Animation symbols: dream marks, motion marks, steam, sparkles, or effects remain visually separate from body parts.
9. Pen/watercolor technique: contours, hatching, washes, opacity, and texture density feel like one artist.
10. Pixel-diff review: locked backgrounds, labels, speech bubbles, captions, and recurring props do not shimmer or jump unless the story action explains the movement.

For animals or non-human characters, include the full body chain in the audit: head -> neck -> body/ribcage -> hips -> tail, plus shoulder/hip -> leg -> paw/foot.

## Required-Object Gate

Before approving any key frame, in-between frame, or exported video:

1. Make a per-frame required-object list from the project requirements and the source lighthouse frame.
2. Check that every required object is visible, readable, and in plausible contact with the scene. Examples: a laptop sits on the desk, a cup sits on the table, a hand connects through wrist and sleeve.
3. Check that every required body connection is visible. Examples: a head connects through a neck/shoulder bridge, a tail connects to the body, a paw connects through a leg.
4. Check that clothing follows the body chain across adjacent frames. Examples: shirt hem overlaps waistband, waistband travels with the torso, shorts/pants openings travel with the legs, and limbs do not appear beside their clothing openings.
5. For camera changes, do not switch the target scene label or framing before target-scene required props are present.
6. If an object is intentionally hidden by a body part, draw enough contour, shadow, or edge detail to make the occlusion clear.
7. Treat vague construction lines as a failure if the viewer cannot identify the object without explanation.

## Fix Rules

- If a later frame has the better design for a recurring object, update earlier frames to match it before animation.
- If a source frame contradicts an approved design anchor, keep the approved anchor and adapt the pose around it.
- Do not fix drift by fading one frame into another. Redraw the mismatched object.
- Do not fix drift or defects by covering one frame with a patch, mask, or texture. Rebuild the mismatched object, body chain, bubble path, or layer order from the shared anchors.
- Do not animate separate facial features unless the story specifically requires that feature to move.
- For recurring face details, draw one reusable system and position it with the head; never let eyes, lenses, mouth, or other features travel separately.
- Do not let an anchored prop disappear during in-between frames unless the story explicitly removes it. If the next shot needs the prop, it must be readable when that shot becomes the active image.

## Output

Return a short audit:
- `Pass`: items that match.
- `Fix before animation`: concrete frame/object corrections.
- `Animation notes`: anchor points to use for the transition.
